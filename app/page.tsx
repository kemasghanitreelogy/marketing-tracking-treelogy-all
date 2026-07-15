import { sb, sbRpc } from "@/lib/supabase";
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { Card, SectionTitle } from "@/components/ui";
import { AreaTrend, BarList, StackedMonths } from "@/components/charts";
import { DeltaKpi, InsightCards } from "@/components/cmo";
import { CohortHeatmap, Pareto } from "@/components/cmo-charts";
import SegmentPanel from "@/components/segments";
import ThemeToggle from "@/components/ThemeToggle";
import TopCustomersTable from "@/components/customer-modal";
import { GeoTileMap, TimeHeatmap, SeasonHeatmap } from "@/components/heatmaps";
import ChannelFilter from "@/components/channel-filter";

type Kpi = { gmv_cur: number; gmv_prev: number; ord_cur: number; ord_prev: number; act_cur: number; act_prev: number; new_cur: number; new_prev: number; aov_cur: number; aov_prev: number; last_date: string };
type Payload = {
  kpi: Kpi;
  runrate: { mtd_gmv: string; days_elapsed: number; days_in_month: number; projected_gmv: string; prev_month_gmv: string };
  monthly: { ym: string; orders: number; units: number; gmv: string; aov: string; new_customers: number; returning_customers: number }[];
  channels: { channel: string; orders: number; units: number; gmv: string; aov: string; customers: number; gmv_share: number }[];
  cohort: { cohort: string; months_since: number; retention_pct: number; retained: number; cohort_size: number }[];
  segments: { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number }[];
  pareto: { product_name: string; gmv: string; units: number; cum_gmv_pct: number }[];
  top_customers: { unified_customer_id: number; name: string; channels: string[]; orders: number; units: number; revenue: string }[];
  ltv: { first_channel: string; customers: number; avg_ltv: string; median_ltv: string; avg_orders: number }[];
  affinity: { p1: string; p2: string; together: number; lift: number }[];
  geo: { province: string; orders: number; units: number; gmv: string; customers: number; gmv_share: number }[];
  time_heatmap: { dow: number; hr: number; orders: number; gmv: string }[];
  season: { product_name: string; ym: string; units: number; orders: number }[];
  insights: { severity: string; title: string; detail: string | null }[];
};
type DqRow = { check_key: string; score: string };

export default async function Page({ searchParams }: { searchParams: Promise<{ ch?: string }> }) {
  const sp = await searchParams;
  // canonical (sorted) order → same combo always hits the same cache entry
  const channelsSel = (sp.ch ?? "").split(",").map((s) => s.trim()).filter(Boolean).sort();
  const rpcArgs = channelsSel.length ? { p_channels: channelsSel } : {};

  let [p, dq, chanList] = await Promise.all([
    sbRpc<Payload>("dash_payload", rpcArgs),
    sb<DqRow[]>("dq_scoreboard?select=check_key,score", 120),
    sb<{ channel: string }[]>("cmo_channel?select=channel", 600),
  ]);
  // cached entry predates a payload-shape change → bypass cache once for a complete payload
  if (!p?.insights) p = await sbRpc<Payload>("dash_payload", rpcArgs, 0);

  const k = p.kpi;
  const rr = p.runrate;
  const dqScore = dq.length ? Math.min(...dq.map((d) => Number(d.score))) : null;
  const totalGmv = p.channels.reduce((s, c) => s + Number(c.gmv), 0);
  const repeatCur = k.act_cur ? Math.round((1 - k.new_cur / k.act_cur) * 100) : 0;
  const repeatPrev = k.act_prev ? Math.round((1 - k.new_prev / k.act_prev) * 100) : 0;
  const geoKnown = p.geo.filter((g) => g.province !== "Unknown");
  const geoUnknownShare = Number(p.geo.find((g) => g.province === "Unknown")?.gmv_share ?? 0);
  const allChannels = chanList.map((c) => c.channel);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-ink)" }}>
            <span style={{ color: "var(--brand)" }}>❦</span> Treelogy · Executive Marketing Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-[1.7rem]">CMO Decision Summary</h1>
        </div>
        <div className="flex items-center gap-3">
          <a href="/review" className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--line-soft)]" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            Identity review
          </a>
          {dqScore !== null && (
            <span className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold" style={{ borderColor: "var(--line)", color: dqScore >= 99 ? "var(--good)" : "var(--accent)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>
              Data Quality {dqScore}
            </span>
          )}
          <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--brand)" }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} /></span>
            Live · {k.last_date}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Global channel filter — drives every chart below */}
      <div className="mb-6 rounded-xl border px-4 py-3" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
        <ChannelFilter channels={allChannels} />
      </div>

      {/* Automated insights — the "so what" first, recomputed per channel filter */}
      <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
        Automated Insights{channelsSel.length ? ` · ${channelsSel.join(" + ")}` : ""}
      </div>
      <section className="mb-6">
        <InsightCards rows={p.insights ?? []} />
      </section>

      {/* Executive KPIs — rolling 30 days vs prior 30 days */}
      <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Last 30 Days Performance</div>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <DeltaKpi label="GMV" value={idr(k.gmv_cur)} cur={k.gmv_cur} prev={k.gmv_prev} />
        <DeltaKpi label="Orders" value={num(k.ord_cur)} cur={k.ord_cur} prev={k.ord_prev} />
        <DeltaKpi label="AOV" value={idr(k.aov_cur)} cur={k.aov_cur} prev={k.aov_prev} />
        <DeltaKpi label="New Customers" value={num(k.new_cur)} cur={k.new_cur} prev={k.new_prev} />
        <DeltaKpi label="Active Customers" value={num(k.act_cur)} cur={k.act_cur} prev={k.act_prev} />
        <DeltaKpi label="Repeat Rate" value={`${repeatCur}%`} cur={repeatCur} prev={repeatPrev} />
      </section>

      {/* Growth: GMV + channel mix */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="GMV Growth" hint="IDR millions · monthly (actual + historical estimates)" />
          <AreaTrend data={p.monthly.map((m) => ({ label: monthLabel(m.ym), value: Math.round(Number(m.gmv) / 1e6), display: idrFull(m.gmv) }))} />
          {rr && (
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg px-3 py-2 text-xs" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>
              <span className="font-semibold">Projected this month: {idr(rr.projected_gmv)}</span>
              <span style={{ color: "var(--ink-soft)" }}>MTD {idr(rr.mtd_gmv)} · day {rr.days_elapsed}/{rr.days_in_month} · last month {idr(rr.prev_month_gmv)}</span>
            </div>
          )}
        </Card>
        <Card>
          <SectionTitle title="Channel Mix" hint="GMV (IDR)" />
          <BarList rows={p.channels.slice(0, 8).map((c) => ({ name: c.channel, value: Number(c.gmv) }))} mode="idr" />
        </Card>
      </section>

      {/* Acquisition & Retention */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Acquisition vs Retention" hint="active customers per month" />
          <div className="mb-3 flex gap-4 text-xs" style={{ color: "var(--ink-soft)" }}>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--accent)" }} /> New</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> Returning</span>
          </div>
          <StackedMonths data={p.monthly.map((m) => ({ label: monthLabel(m.ym), a: Number(m.new_customers), b: Number(m.returning_customers) }))} />
        </Card>
        <Card>
          <SectionTitle title="AOV by Month" hint="IDR" />
          <AreaTrend h={400} data={p.monthly.map((m) => ({ label: monthLabel(m.ym), value: Math.round(Number(m.aov) / 1e3), display: idrFull(m.aov) }))} />
          <div className="mt-1 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>IDR thousands per order</div>
        </Card>
      </section>

      {/* Cohort retention */}
      <section className="mt-4">
        <Card>
          <SectionTitle title="Cohort Retention" hint="% of customers ordering again, by months since acquisition (M0–M6)" />
          <CohortHeatmap rows={p.cohort} />
        </Card>
      </section>

      {/* Advanced tracking: geo + purchase time + seasonality */}
      <div className="mb-2 mt-6 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Advanced Tracking</div>
      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle title="GMV by Region" hint="tile map of Indonesia · hover for detail" />
          <GeoTileMap rows={geoKnown} unknownShare={geoUnknownShare} />
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Top Regions" hint="GMV share" />
          <div className="flex flex-col gap-3.5">
            {geoKnown.slice(0, 8).map((g) => (
              <div key={g.province}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                  <span className="truncate font-medium">{g.province}</span>
                  <span className="shrink-0 whitespace-nowrap font-mono text-xs tnum">
                    {idr(g.gmv)} <span style={{ color: "var(--ink-soft)" }}>· {g.gmv_share}%</span>
                  </span>
                </div>
                <div className="relative h-2.5 overflow-hidden rounded-full" style={{ background: "var(--line-soft)" }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, (Number(g.gmv_share) / Number(geoKnown[0]?.gmv_share || 1)) * 100)}%`, background: "var(--brand)", opacity: 0.85 }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Purchase Time Heatmap" hint="orders by day × hour (WIB) · Apr 2026 onward" />
          <TimeHeatmap cells={p.time_heatmap} />
        </Card>
        <Card>
          <SectionTitle title="Product Seasonality" hint="units by month · intensity relative to each product's peak" />
          <SeasonHeatmap cells={p.season} />
        </Card>
      </section>

      {/* RFM segments */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle title="Customer Segments (RFM)" hint="by Recency · Frequency · Monetary · click a segment to explore & export" />
          <SegmentPanel rows={p.segments} ch={channelsSel.join(",")} />
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Actions per Segment" hint="recommendations" />
          <ul className="flex flex-col gap-2.5 text-sm" style={{ color: "var(--ink)" }}>
            <li className="flex gap-2"><span style={{ color: "var(--good)" }}>▲</span> <span><b>Champions</b> — reward & referral; retain with early access.</span></li>
            <li className="flex gap-2"><span style={{ color: "var(--brand)" }}>◆</span> <span><b>Loyal</b> — upsell bundles & subscriptions.</span></li>
            <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>●</span> <span><b>Needs Attention / At Risk</b> — win-back: reminders + targeted discounts.</span></li>
            <li className="flex gap-2"><span style={{ color: "#4FA3A3" }}>✦</span> <span><b>New / Promising</b> — onboarding & second-order nudge.</span></li>
            <li className="flex gap-2"><span style={{ color: "#8A7BA8" }}>◇</span> <span><b>Hibernating</b> — low-cost reactivation or let go.</span></li>
          </ul>
        </Card>
      </section>

      {/* Channel performance matrix + Pareto */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Channel Performance" hint="GMV · AOV · customers" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">Orders</th>
                  <th className="pb-2 text-right font-semibold">GMV</th>
                  <th className="pb-2 text-right font-semibold">AOV</th>
                  <th className="pb-2 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {p.channels.map((c) => (
                  <tr key={c.channel} className="border-b last:border-0 transition-colors hover:bg-[var(--line-soft)]" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="py-2 font-medium">{c.channel}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.orders)}</td>
                    <td className="py-2 text-right font-mono tnum">{idr(c.gmv)}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{idr(c.aov)}</td>
                    <td className="py-2 text-right font-mono font-semibold tnum">{c.gmv_share}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Product Concentration (Pareto)" hint="bars = GMV · line = cumulative %" />
          <Pareto rows={p.pareto} />
        </Card>
      </section>

      {/* LTV per acquisition channel + basket affinity */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="LTV by Acquisition Channel" hint="customer lifetime value by first channel" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">Customers</th>
                  <th className="pb-2 text-right font-semibold">Avg LTV</th>
                  <th className="pb-2 text-right font-semibold">Median</th>
                  <th className="pb-2 text-right font-semibold">Orders</th>
                </tr>
              </thead>
              <tbody>
                {p.ltv.map((r) => (
                  <tr key={r.first_channel} className="border-b last:border-0 transition-colors hover:bg-[var(--line-soft)]" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="py-2 font-medium">{r.first_channel}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(r.customers)}</td>
                    <td className="py-2 text-right font-mono font-semibold tnum">{idr(r.avg_ltv)}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{idr(r.median_ltv)}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{r.avg_orders}×</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Frequently Bought Together" hint="bundling & cross-sell opportunities" />
          <div className="flex flex-col gap-2.5">
            {p.affinity.map((a, i) => (
              <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-[var(--line-soft)]" style={{ borderColor: "var(--line-soft)" }}>
                <div className="min-w-0 text-sm">
                  <span className="font-semibold">{a.p1}</span>
                  <span style={{ color: "var(--ink-soft)" }}> + </span>
                  <span className="font-semibold">{a.p2}</span>
                </div>
                <div className="shrink-0 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>
                  {num(a.together)}× <span className="font-semibold" style={{ color: "var(--brand)" }}>lift {a.lift}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-[0.68rem]" style={{ color: "var(--ink-soft)" }}>lift &gt; 1 = pairing occurs more often than chance — bundle candidates</div>
        </Card>
      </section>

      {/* Top customers — click a row for the Customer 360 modal */}
      <section className="mt-4">
        <Card>
          <SectionTitle title="Top Customers by Value" hint="by GMV · click a row for full detail" />
          <TopCustomersTable rows={p.top_customers} />
        </Card>
      </section>

      <footer className="mt-8 border-t pt-5 text-center text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
        {channelsSel.length ? `Filtered: ${channelsSel.join(" + ")} · ` : ""}Total GMV {idrFull(totalGmv)} (actual + per-SKU price estimates for historical periods) · unified data: historical CSV + Jubelio (realtime webhook) + Shopify
      </footer>
    </main>
  );
}

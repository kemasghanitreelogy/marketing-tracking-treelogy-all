import { sb } from "@/lib/supabase";
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { Card, SectionTitle } from "@/components/ui";
import { AreaTrend, BarList, StackedMonths } from "@/components/charts";
import { DeltaKpi, CohortHeatmap, SegmentBars, Pareto } from "@/components/cmo";
import ThemeToggle from "@/components/ThemeToggle";

export const revalidate = 300;

type Kpi = { gmv_cur: number; gmv_prev: number; ord_cur: number; ord_prev: number; act_cur: number; act_prev: number; new_cur: number; new_prev: number; aov_cur: number; aov_prev: number; last_date: string };
type Monthly = { ym: string; orders: number; units: number; gmv: string; aov: string; active_customers: number; new_customers: number; returning_customers: number };
type Channel = { channel: string; orders: number; units: number; gmv: string; aov: string; customers: number; gmv_share: number };
type Cohort = { cohort: string; months_since: number; retention_pct: number; cohort_size: number };
type Segment = { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number };
type ParetoRow = { product_name: string; gmv: string; units: number; cum_gmv_pct: number };
type TopCust = { unified_customer_id: number; name: string; channels: string[]; orders: number; units: number; revenue: string };

export default async function Page() {
  const [kpiA, monthly, channels, cohort, segments, pareto, topCust] = await Promise.all([
    sb<Kpi[]>("cmo_kpi"),
    sb<Monthly[]>("cmo_monthly?order=ym.asc"),
    sb<Channel[]>("cmo_channel"),
    sb<Cohort[]>("cmo_cohort?order=cohort.asc"),
    sb<Segment[]>("cmo_segments"),
    sb<ParetoRow[]>("cmo_product_pareto?order=gmv.desc&limit=12"),
    sb<TopCust[]>("dash_top_customers?order=revenue.desc&limit=10"),
  ]);
  const k = kpiA[0];
  const totalGmv = channels.reduce((s, c) => s + Number(c.gmv), 0);
  const repeatCur = k.act_cur ? Math.round((1 - k.new_cur / k.act_cur) * 100) : 0;
  const repeatPrev = k.act_prev ? Math.round((1 - k.new_prev / k.act_prev) * 100) : 0;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-ink)" }}>
            <span style={{ color: "var(--brand)" }}>❦</span> Treelogy · Executive Marketing Dashboard
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-[1.7rem]">Ringkasan Keputusan CMO</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--brand)" }} /><span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} /></span>
            Live · {k.last_date}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Executive KPIs — rolling 30 days vs prior 30 days */}
      <div className="mb-2 text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Kinerja 30 hari terakhir</div>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <DeltaKpi label="GMV" value={idr(k.gmv_cur)} cur={k.gmv_cur} prev={k.gmv_prev} />
        <DeltaKpi label="Order" value={num(k.ord_cur)} cur={k.ord_cur} prev={k.ord_prev} />
        <DeltaKpi label="AOV" value={idr(k.aov_cur)} cur={k.aov_cur} prev={k.aov_prev} />
        <DeltaKpi label="Pelanggan Baru" value={num(k.new_cur)} cur={k.new_cur} prev={k.new_prev} />
        <DeltaKpi label="Pelanggan Aktif" value={num(k.act_cur)} cur={k.act_cur} prev={k.act_prev} />
        <DeltaKpi label="Repeat Rate" value={`${repeatCur}%`} cur={repeatCur} prev={repeatPrev} />
      </section>

      {/* Growth: GMV + channel mix */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Pertumbuhan GMV" hint="juta Rp · per bulan (aktual + estimasi historis)" />
          <AreaTrend data={monthly.map((m) => ({ label: monthLabel(m.ym), value: Math.round(Number(m.gmv) / 1e6) }))} />
        </Card>
        <Card>
          <SectionTitle title="Mix Channel" hint="GMV (Rp)" />
          <BarList rows={channels.slice(0, 8).map((c) => ({ name: c.channel, value: Number(c.gmv) }))} mode="idr" />
        </Card>
      </section>

      {/* Acquisition & Retention */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Akuisisi vs Retensi" hint="pelanggan aktif per bulan" />
          <div className="mb-3 flex gap-4 text-xs" style={{ color: "var(--ink-soft)" }}>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--accent)" }} /> Baru</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> Kembali</span>
          </div>
          <StackedMonths data={monthly.map((m) => ({ label: monthLabel(m.ym), a: Number(m.new_customers), b: Number(m.returning_customers) }))} />
        </Card>
        <Card>
          <SectionTitle title="AOV per Bulan" hint="Rp" />
          <AreaTrend data={monthly.map((m) => ({ label: monthLabel(m.ym), value: Math.round(Number(m.aov) / 1e3) }))} />
          <div className="mt-1 text-[0.7rem]" style={{ color: "var(--ink-soft)" }}>ribu Rp per order</div>
        </Card>
      </section>

      {/* Cohort retention */}
      <section className="mt-4">
        <Card>
          <SectionTitle title="Cohort Retention" hint="% pelanggan yang order lagi, per bulan sejak akuisisi (M0–M6)" />
          <CohortHeatmap rows={cohort} monthLabel={monthLabel} />
        </Card>
      </section>

      {/* RFM segments */}
      <section className="mt-4 grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <SectionTitle title="Segmentasi Pelanggan (RFM)" hint="berdasar Recency · Frequency · Monetary" />
          <SegmentBars rows={segments} />
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle title="Aksi per Segmen" hint="rekomendasi" />
          <ul className="flex flex-col gap-2.5 text-sm" style={{ color: "var(--ink)" }}>
            <li className="flex gap-2"><span style={{ color: "var(--good)" }}>▲</span> <span><b>Champions</b> — reward & referral; jaga dengan early-access.</span></li>
            <li className="flex gap-2"><span style={{ color: "var(--brand)" }}>◆</span> <span><b>Loyal</b> — upsell bundle & subscription.</span></li>
            <li className="flex gap-2"><span style={{ color: "var(--accent)" }}>●</span> <span><b>Needs Attention / At Risk</b> — win-back: reminder + diskon terarah.</span></li>
            <li className="flex gap-2"><span style={{ color: "#4FA3A3" }}>✦</span> <span><b>New / Promising</b> — onboarding & second-order nudge.</span></li>
            <li className="flex gap-2"><span style={{ color: "#8A7BA8" }}>◇</span> <span><b>Hibernating</b> — reaktivasi hemat biaya atau lepas.</span></li>
          </ul>
        </Card>
      </section>

      {/* Channel performance matrix + Pareto */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Kinerja Channel" hint="GMV · AOV · pelanggan" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">Order</th>
                  <th className="pb-2 text-right font-semibold">GMV</th>
                  <th className="pb-2 text-right font-semibold">AOV</th>
                  <th className="pb-2 text-right font-semibold">Share</th>
                </tr>
              </thead>
              <tbody>
                {channels.map((c) => (
                  <tr key={c.channel} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
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
          <SectionTitle title="Konsentrasi Produk (Pareto)" hint="bar = GMV · garis = kumulatif %" />
          <Pareto rows={pareto} />
        </Card>
      </section>

      {/* Top customers */}
      <section className="mt-4">
        <Card>
          <SectionTitle title="Pelanggan Bernilai Tertinggi" hint="berdasar GMV" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  <th className="pb-2 font-semibold">Nama</th>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">Order</th>
                  <th className="pb-2 text-right font-semibold">Unit</th>
                  <th className="pb-2 text-right font-semibold">GMV</th>
                </tr>
              </thead>
              <tbody>
                {topCust.map((c) => (
                  <tr key={c.unified_customer_id} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="py-2 pr-2 font-medium">{c.name || "—"}</td>
                    <td className="py-2 pr-2"><span className="flex flex-wrap gap-1">{(c.channels ?? []).map((ch) => (<span key={ch} className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{ch}</span>))}</span></td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.orders)}</td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.units)}</td>
                    <td className="py-2 text-right font-mono font-semibold tnum">{idr(c.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <footer className="mt-8 border-t pt-5 text-center text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
        GMV total {idrFull(totalGmv)} (aktual + estimasi harga per-SKU untuk periode historis) · data tersatukan CSV + Jubelio (realtime) + Shopify
      </footer>
    </main>
  );
}

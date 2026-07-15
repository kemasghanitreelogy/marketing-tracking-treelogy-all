"use client";
// Enterprise-style RFM segment explorer: clickable segment bars → drill-down modal
// with the segment's definition, KPIs, full member list (click a member for
// Customer 360) and one-click CSV export for campaign targeting.
import { useEffect, useRef, useState } from "react";
import { num, idr, idrFull } from "@/lib/format";
import { useTip, TipBox, TipTitle, TipRow } from "@/components/tooltip";
import { Customer360Modal } from "@/components/customer-modal";

const SEG_COLOR: Record<string, string> = {
  "Champions": "var(--good)", "Loyal": "var(--brand)", "Potential Loyalist": "#2F6DB0",
  "New / Promising": "#4FA3A3", "Needs Attention": "var(--accent)", "At Risk (high value)": "var(--bad)",
  "Hibernating": "#8A7BA8", "Others": "var(--ink-soft)",
};
const SEG_DEF: Record<string, { rule: string; action: string }> = {
  "Champions": { rule: "Bought recently AND buy often (top recency + top frequency).", action: "Reward & referral programs, early access to launches — protect this revenue." },
  "Loyal": { rule: "Buy often, reasonably recent.", action: "Upsell bundles & subscriptions; cross-sell adjacent products." },
  "Potential Loyalist": { rule: "Recent buyers with 2–3 orders building a habit.", action: "Nurture with loyalty perks to convert into Loyal/Champions." },
  "New / Promising": { rule: "First purchase very recently.", action: "Onboarding flow + second-order nudge before the habit window closes." },
  "Needs Attention": { rule: "2–3 past orders but going quiet.", action: "Win-back reminders + targeted discounts before they lapse fully." },
  "At Risk (high value)": { rule: "Used to buy often, now inactive — your most valuable lapsed buyers.", action: "Priority reactivation campaign (personal outreach, strong offer)." },
  "Hibernating": { rule: "One order, long ago.", action: "Low-cost broadcast reactivation, or let go." },
  "Others": { rule: "Doesn't fit the main patterns.", action: "Monitor; no targeted action needed." },
};

type Seg = { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number };
type Member = { unified_customer_id: number; name: string | null; phone: string | null; email: string | null; channels: string[]; orders: number; units: number; gmv: string; last_order: string; recency_days: number };
type Drill = { summary: { customers: number; gmv: string; aov: string; avg_orders: number; avg_recency_days: number }; customers: Member[] };

const cache = new Map<string, Drill>();

function toCsv(rows: Member[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const head = ["name", "phone", "email", "channels", "orders", "units", "gmv", "last_order", "recency_days"];
  return [head.join(","), ...rows.map((r) =>
    [r.name, r.phone, r.email, (r.channels ?? []).join(" | "), r.orders, r.units, r.gmv, r.last_order, r.recency_days].map(esc).join(","),
  )].join("\n");
}

function SegmentModal({ seg, ch, from, to, onClose }: { seg: Seg; ch: string; from: string; to: string; onClose: () => void }) {
  const key = `${seg.segment}|${ch}|${from}|${to}`;
  const [data, setData] = useState<Drill | null>(cache.get(key) ?? null);
  const [error, setError] = useState(false);
  const [cust, setCust] = useState<{ uid: number; name: string } | null>(null);
  const custOpen = useRef(false);
  custOpen.current = cust !== null;
  const col = SEG_COLOR[seg.segment] ?? "var(--brand)";
  const def = SEG_DEF[seg.segment];

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !custOpen.current) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    if (cache.has(key)) return;
    let alive = true;
    fetch(`/api/segment?seg=${encodeURIComponent(seg.segment)}${ch ? `&ch=${encodeURIComponent(ch)}` : ""}${from ? `&from=${from}` : ""}${to ? `&to=${to}` : ""}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: Drill) => { cache.set(key, d); if (alive) setData(d); })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [key, seg.segment, ch, from, to]);

  function exportCsv() {
    if (!data) return;
    const blob = new Blob(["﻿" + toCsv(data.customers)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `treelogy-${seg.segment.toLowerCase().replace(/[^a-z0-9]+/g, "-")}${ch ? `-${ch.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` : ""}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Segment detail: ${seg.segment}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: "rgba(8, 10, 8, 0.6)", backdropFilter: "blur(2px)" }}>
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}>

        {/* header */}
        <div className="border-b p-5 pb-4" style={{ borderColor: "var(--line)", borderLeft: `4px solid ${col}` }}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg font-bold">{seg.segment}</span>
                <span className="rounded px-2 py-0.5 font-mono text-[0.65rem] font-bold tnum"
                  style={{ background: `color-mix(in srgb, ${col} 15%, transparent)`, color: col }}>{num(seg.customers)} customers</span>
                {ch && <span className="rounded px-2 py-0.5 text-[0.62rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{ch.split(",").join(" + ")}</span>}
                {(from || to) && <span className="rounded px-2 py-0.5 font-mono text-[0.62rem] font-semibold tnum" style={{ background: "var(--line-soft)", color: "var(--ink-soft)" }}>{from || "start"} → {to || "today"}</span>}
              </div>
              {def && <div className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}><b style={{ color: "var(--ink)" }}>Who:</b> {def.rule} <b style={{ color: "var(--ink)" }}>Play:</b> {def.action}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button onClick={exportCsv} disabled={!data}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--line-soft)] disabled:cursor-default disabled:opacity-40"
                style={{ borderColor: "var(--line)", color: "var(--ink)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M7 10l5 5 5-5" /><path d="M12 15V3" /></svg>
                Export CSV
              </button>
              <button onClick={onClose} aria-label="Close"
                className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg border transition-colors hover:bg-[var(--line-soft)]"
                style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
          </div>

          {/* KPI strip */}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {[
              ["Customers", data ? num(data.summary.customers) : "…"],
              ["Segment GMV", data ? idr(data.summary.gmv) : "…"],
              ["AOV", data ? idr(data.summary.aov) : "…"],
              ["Avg orders", data ? `${data.summary.avg_orders}×` : "…"],
              ["Avg recency", data ? `${num(data.summary.avg_recency_days)}d` : "…"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-lg p-2.5" style={{ background: "var(--line-soft)" }}>
                <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{l}</div>
                <div className="mt-0.5 whitespace-nowrap font-mono text-sm font-bold tnum">{v}</div>
              </div>
            ))}
          </div>
        </div>

        {/* member list */}
        <div className="overflow-y-auto p-5 pt-3">
          {error && <div className="py-10 text-center text-sm" style={{ color: "var(--bad)" }}>Failed to load segment members. Try again.</div>}
          {!data && !error && (
            <div className="flex flex-col gap-2" aria-busy="true">
              {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg" style={{ background: "var(--line-soft)" }} />)}
            </div>
          )}
          {data && (
            <>
              <div className="mb-2 flex items-baseline justify-between text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                <span>Members by value{data.summary.customers > data.customers.length ? ` (top ${num(data.customers.length)})` : ` (${num(data.customers.length)})`}</span>
                <span className="normal-case font-medium tracking-normal">click a row for Customer 360</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[0.64rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                    <th className="pb-2 font-semibold">Customer</th>
                    <th className="hidden pb-2 font-semibold sm:table-cell">Contact</th>
                    <th className="pb-2 text-right font-semibold">Orders</th>
                    <th className="pb-2 text-right font-semibold">GMV</th>
                    <th className="pb-2 text-right font-semibold">Last order</th>
                  </tr>
                </thead>
                <tbody>
                  {data.customers.map((m) => (
                    <tr key={m.unified_customer_id} tabIndex={0} role="button" aria-label={`Open detail for ${m.name ?? "customer"}`}
                      onClick={() => setCust({ uid: m.unified_customer_id, name: m.name ?? "—" })}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setCust({ uid: m.unified_customer_id, name: m.name ?? "—" }); } }}
                      className="cursor-pointer border-b outline-none transition-colors last:border-0 hover:bg-[var(--line-soft)] focus-visible:bg-[var(--line-soft)]"
                      style={{ borderColor: "var(--line-soft)" }}>
                      <td className="py-2 pr-2">
                        <div className="font-medium">{m.name ?? "—"}</div>
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {(m.channels ?? []).map((c) => <span key={c} className="rounded px-1.5 py-0.5 text-[0.58rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{c}</span>)}
                        </div>
                      </td>
                      <td className="hidden py-2 pr-2 font-mono text-xs tnum sm:table-cell" style={{ color: "var(--ink-soft)" }}>
                        <div>{m.phone ?? "—"}</div>
                        {m.email && <div className="max-w-[180px] truncate">{m.email}</div>}
                      </td>
                      <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(m.orders)}</td>
                      <td className="py-2 text-right font-mono font-semibold tnum">{idr(m.gmv)}</td>
                      <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{m.last_order}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
      {cust && <Customer360Modal uid={cust.uid} name={cust.name} onClose={() => setCust(null)} />}
    </div>
  );
}

export default function SegmentPanel({ rows, ch, from = "", to = "" }: { rows: Seg[]; ch: string; from?: string; to?: string }) {
  const { ref, tip, show, hide } = useTip();
  const [open, setOpen] = useState<Seg | null>(null);
  const max = Math.max(1, ...rows.map((r) => Number(r.gmv_share)));
  return (
    <div ref={ref} className="relative flex flex-col gap-3">
      {rows.map((s) => {
        const col = SEG_COLOR[s.segment] ?? "var(--brand)";
        return (
          <div key={s.segment} tabIndex={0} role="button" aria-label={`Explore segment ${s.segment}`}
            onClick={() => { hide(); setOpen(s); }}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); hide(); setOpen(s); } }}
            className="group cursor-pointer rounded-md px-1 outline-none transition-colors hover:bg-[var(--line-soft)] focus-visible:bg-[var(--line-soft)]"
            onPointerMove={(e) => show(e, (
              <div>
                <TipTitle>{s.segment}</TipTitle>
                <TipRow swatch={col} label="GMV" value={idrFull(s.gmv)} />
                <TipRow label="Customers" value={num(s.customers)} />
                <TipRow label="Avg orders" value={`${s.avg_orders}×`} />
                <TipRow label="Avg recency" value={`${num(s.avg_recency_days)} days`} />
                <div className="mt-1 text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>Click to explore members ↗</div>
              </div>
            ))}
            onPointerLeave={hide}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: col }} />{s.segment}
                <svg className="opacity-0 transition-opacity group-hover:opacity-100" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7" /><path d="M8 7h9v9" /></svg>
              </span>
              <span className="tnum" style={{ color: "var(--ink-soft)" }}>{num(s.customers)} cust · {num(s.avg_recency_days)}d · {s.avg_orders}× orders</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-5 flex-1 overflow-hidden rounded-md" style={{ background: "var(--line-soft)" }}>
                <div className="h-full rounded-md" style={{ width: `${(Number(s.gmv_share) / max) * 100}%`, background: col, opacity: 0.9 }} />
              </div>
              <span className="w-28 shrink-0 whitespace-nowrap text-right font-mono text-sm tnum">{idr(s.gmv)} · {s.gmv_share}%</span>
            </div>
          </div>
        );
      })}
      <TipBox tip={tip} />
      {open && <SegmentModal seg={open} ch={ch} from={from} to={to} onClose={() => setOpen(null)} />}
    </div>
  );
}

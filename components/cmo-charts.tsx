"use client";
// Interactive CMO charts: cohort heatmap, product Pareto, RFM segment bars.
import { PointerEvent } from "react";
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { useTip, TipBox, TipTitle, TipRow } from "@/components/tooltip";

// ===== Cohort retention heatmap =====
type CohortRow = { cohort: string; months_since: number; retention_pct: number; retained: number; cohort_size: number };
export function CohortHeatmap({ rows }: { rows: CohortRow[] }) {
  const { ref, tip, show, hide } = useTip();
  const cohorts = [...new Set(rows.map((r) => r.cohort))].sort();
  const maxCol = 6;
  const map = new Map<string, { pct: number; retained: number }>();
  const size = new Map<string, number>();
  for (const r of rows) { map.set(`${r.cohort}:${r.months_since}`, { pct: r.retention_pct, retained: r.retained }); size.set(r.cohort, r.cohort_size); }
  const cellStyle = (pct: number | undefined) => {
    if (pct === undefined) return { background: "transparent", color: "var(--ink-soft)" };
    const a = Math.max(0.06, Math.min(1, pct / 60));
    return { background: `color-mix(in srgb, var(--brand) ${Math.round(a * 100)}%, transparent)`, color: a > 0.5 ? "#fff" : "var(--ink)" };
  };
  return (
    <div ref={ref} className="relative overflow-x-auto">
      <table className="w-full border-separate text-xs" style={{ borderSpacing: "3px", minWidth: 560 }}>
        <thead>
          <tr>
            <th className="text-left font-semibold" style={{ color: "var(--ink-soft)" }}>Cohort</th>
            <th className="font-semibold" style={{ color: "var(--ink-soft)" }}>Size</th>
            {Array.from({ length: maxCol + 1 }, (_, i) => (
              <th key={i} className="font-semibold tnum" style={{ color: "var(--ink-soft)" }}>M{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((co) => (
            <tr key={co}>
              <td className="whitespace-nowrap pr-2 font-medium">{monthLabel(co)}</td>
              <td className="text-center font-mono tnum" style={{ color: "var(--ink-soft)" }}>{num(size.get(co) ?? 0)}</td>
              {Array.from({ length: maxCol + 1 }, (_, i) => {
                const c = map.get(`${co}:${i}`);
                const s = cellStyle(c?.pct);
                return (
                  <td key={i} className="cursor-default rounded text-center font-mono tnum"
                    style={{ ...s, padding: "6px 4px", minWidth: 44 }}
                    onPointerMove={c ? (e) => show(e, (
                      <div>
                        <TipTitle>{monthLabel(co)} cohort · month {i}</TipTitle>
                        <TipRow swatch="var(--brand)" label="Retained" value={`${num(c.retained)} of ${num(size.get(co) ?? 0)}`} />
                        <TipRow label="Retention" value={`${c.pct}%`} />
                      </div>
                    )) : undefined}
                    onPointerLeave={hide}
                  >{c ? `${c.pct}%` : ""}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <TipBox tip={tip} />
    </div>
  );
}

// ===== RFM segment bars =====
const SEG_COLOR: Record<string, string> = {
  "Champions": "var(--good)", "Loyal": "var(--brand)", "Potential Loyalist": "#2F6DB0",
  "New / Promising": "#4FA3A3", "Needs Attention": "var(--accent)", "At Risk (high value)": "var(--bad)",
  "Hibernating": "#8A7BA8", "Others": "var(--ink-soft)",
};
type Seg = { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number };
export function SegmentBars({ rows }: { rows: Seg[] }) {
  const { ref, tip, show, hide } = useTip();
  const max = Math.max(1, ...rows.map((r) => Number(r.gmv_share)));
  return (
    <div ref={ref} className="relative flex flex-col gap-3">
      {rows.map((s) => {
        const col = SEG_COLOR[s.segment] ?? "var(--brand)";
        return (
          <div key={s.segment} className="cursor-default rounded-md px-1 transition-colors hover:bg-[var(--line-soft)]"
            onPointerMove={(e) => show(e, (
              <div>
                <TipTitle>{s.segment}</TipTitle>
                <TipRow swatch={col} label="GMV" value={idrFull(s.gmv)} />
                <TipRow label="Customers" value={num(s.customers)} />
                <TipRow label="Avg orders" value={`${s.avg_orders}×`} />
                <TipRow label="Avg recency" value={`${num(s.avg_recency_days)} days`} />
              </div>
            ))}
            onPointerLeave={hide}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: col }} />{s.segment}
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
    </div>
  );
}

// ===== Product Pareto (bars + cumulative line) =====
type P = { product_name: string; gmv: string; units: number; cum_gmv_pct: number };
export function Pareto({ rows }: { rows: P[] }) {
  const { ref, tip, show, hide } = useTip();
  const W = 720, H = 240, pad = { t: 16, r: 40, b: 54, l: 48 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...rows.map((r) => Number(r.gmv)));
  const bw = (iw / rows.length) * 0.6;
  const x = (i: number) => pad.l + (i + 0.5) * (iw / rows.length);
  const yb = (v: number) => pad.t + ih - (v / max) * ih;
  const yc = (p: number) => pad.t + ih - (p / 100) * ih;
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yc(Number(r.cum_gmv_pct)).toFixed(1)}`).join(" ");

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!rows.length) return;
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.min(rows.length - 1, Math.max(0, Math.floor((px - pad.l) / (iw / rows.length))));
    const row = rows[i];
    show(e, (
      <div>
        <TipTitle>{row.product_name}</TipTitle>
        <TipRow swatch="var(--brand)" label="GMV" value={idrFull(row.gmv)} />
        <TipRow label="Units" value={num(row.units)} />
        <TipRow swatch="var(--accent)" label="Cumulative" value={`${row.cum_gmv_pct}%`} />
      </div>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" role="img" aria-label="Product GMV Pareto"
        onPointerMove={onMove} onPointerLeave={hide}>
        {[0, 50, 80, 100].map((p) => (
          <g key={p}>
            <line x1={pad.l} x2={W - pad.r} y1={yc(p)} y2={yc(p)} stroke="var(--grid)" />
            <text x={W - pad.r + 6} y={yc(p) + 3} fontSize="9" fill="var(--ink-soft)" className="tnum">{p}%</text>
          </g>
        ))}
        {rows.map((r, i) => (
          <rect key={i} x={x(i) - bw / 2} y={yb(Number(r.gmv))} width={bw} height={pad.t + ih - yb(Number(r.gmv))} rx="2" fill="var(--brand)" opacity="0.85" />
        ))}
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" />
        {rows.map((r, i) => <circle key={i} cx={x(i)} cy={yc(Number(r.cum_gmv_pct))} r="2.5" fill="var(--accent)" />)}
        {rows.map((r, i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor="end" fontSize="8.5" fill="var(--ink-soft)" transform={`rotate(-35 ${x(i)} ${H - 8})`}>{r.product_name.length > 16 ? r.product_name.slice(0, 15) + "…" : r.product_name}</text>
        ))}
      </svg>
      <TipBox tip={tip} />
    </div>
  );
}

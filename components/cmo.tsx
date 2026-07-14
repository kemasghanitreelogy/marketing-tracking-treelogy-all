// CMO / executive components — server-rendered.
import { num, idr } from "@/lib/format";
import { Card } from "@/components/ui";

function Arrow({ up }: { up: boolean }) {
  return up ? (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H9M17 7v8" /></svg>
  ) : (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M7 7l10 10M17 17H9M17 17V9" /></svg>
  );
}

export function DeltaKpi({ label, value, cur, prev, invert = false, mono = true }:
  { label: string; value: string; cur: number; prev: number; invert?: boolean; mono?: boolean }) {
  const d = prev ? ((cur - prev) / prev) * 100 : 0;
  const up = d >= 0;
  const good = invert ? !up : up;
  const color = good ? "var(--good)" : "var(--bad)";
  return (
    <Card className="!p-4 min-h-[120px]">
      <div className="text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{label}</div>
      <div className={`mt-2 whitespace-nowrap text-[1.45rem] font-bold leading-none tnum ${mono ? "font-mono" : ""}`}>{value}</div>
      <div className="mt-2.5 flex items-center gap-1 whitespace-nowrap text-xs font-semibold tnum" style={{ color }}>
        <Arrow up={up} /><span>{up ? "+" : ""}{d.toFixed(1)}%</span>
      </div>
      <div className="mt-0.5 text-[0.62rem]" style={{ color: "var(--ink-soft)" }}>vs 30 hari sebelumnya</div>
    </Card>
  );
}

// Cohort retention heatmap: rows = acquisition month, cols = months since (0..6)
type CohortRow = { cohort: string; months_since: number; retention_pct: number; cohort_size: number };
export function CohortHeatmap({ rows, monthLabel }: { rows: CohortRow[]; monthLabel: (ym: string) => string }) {
  const cohorts = [...new Set(rows.map((r) => r.cohort))].sort();
  const maxCol = 6;
  const map = new Map<string, number>();
  const size = new Map<string, number>();
  for (const r of rows) { map.set(`${r.cohort}:${r.months_since}`, r.retention_pct); size.set(r.cohort, r.cohort_size); }
  const cell = (pct: number | undefined) => {
    if (pct === undefined) return { background: "transparent", color: "var(--ink-soft)", text: "" };
    const a = Math.max(0.06, Math.min(1, pct / 60));
    return { background: `color-mix(in srgb, var(--brand) ${Math.round(a * 100)}%, transparent)`, color: a > 0.5 ? "#fff" : "var(--ink)", text: `${pct}%` };
  };
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate text-xs" style={{ borderSpacing: "3px", minWidth: 560 }}>
        <thead>
          <tr>
            <th className="text-left font-semibold" style={{ color: "var(--ink-soft)" }}>Cohort</th>
            <th className="font-semibold" style={{ color: "var(--ink-soft)" }}>Ukuran</th>
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
                const c = cell(map.get(`${co}:${i}`));
                return (
                  <td key={i} className="rounded text-center font-mono tnum" style={{ background: c.background, color: c.color, padding: "6px 4px", minWidth: 44 }}>{c.text}</td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// RFM segments as ranked bars, color-coded by health
const SEG_COLOR: Record<string, string> = {
  "Champions": "var(--good)", "Loyal": "var(--brand)", "Potential Loyalist": "#2F6DB0",
  "New / Promising": "#4FA3A3", "Needs Attention": "var(--accent)", "At Risk (high value)": "var(--bad)",
  "Hibernating": "#8A7BA8", "Others": "var(--ink-soft)",
};
type Seg = { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number };
export function SegmentBars({ rows }: { rows: Seg[] }) {
  const max = Math.max(1, ...rows.map((r) => Number(r.gmv_share)));
  return (
    <div className="flex flex-col gap-3">
      {rows.map((s) => {
        const col = SEG_COLOR[s.segment] ?? "var(--brand)";
        return (
          <div key={s.segment}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 font-semibold">
                <i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: col }} />{s.segment}
              </span>
              <span className="tnum" style={{ color: "var(--ink-soft)" }}>{num(s.customers)} plgn · {num(s.avg_recency_days)}h · {s.avg_orders}× order</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative h-5 flex-1 overflow-hidden rounded-md" style={{ background: "var(--line-soft)" }}>
                <div className="h-full rounded-md" style={{ width: `${(Number(s.gmv_share) / max) * 100}%`, background: col, opacity: 0.9 }} />
              </div>
              <span className="w-28 shrink-0 text-right font-mono text-sm tnum">{idr(s.gmv)} · {s.gmv_share}%</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Pareto: GMV bars + cumulative % line
type P = { product_name: string; gmv: string; units: number; cum_gmv_pct: number };
export function Pareto({ rows }: { rows: P[] }) {
  const W = 720, H = 240, pad = { t: 16, r: 40, b: 54, l: 48 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...rows.map((r) => Number(r.gmv)));
  const bw = (iw / rows.length) * 0.6;
  const x = (i: number) => pad.l + (i + 0.5) * (iw / rows.length);
  const yb = (v: number) => pad.t + ih - (v / max) * ih;
  const yc = (p: number) => pad.t + ih - (p / 100) * ih;
  const line = rows.map((r, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${yc(Number(r.cum_gmv_pct)).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pareto GMV per produk">
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
  );
}

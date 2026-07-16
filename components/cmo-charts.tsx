"use client";
// Interactive CMO charts: cohort heatmap, product Pareto, RFM segment bars.
import { PointerEvent } from "react";
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { useTip, TipBox, TipTitle, TipRow } from "@/components/tooltip";

// ===== Cohort retention heatmap =====
// Written for non-analysts: a plain-language takeaway on top, a "typical month"
// benchmark row, no M0 column (it's 100% by definition), "+N mo" headers, and a
// visible difference between "not enough time yet" (·) and "nobody came back" (0%).
type CohortRow = { cohort: string; months_since: number; retention_pct: number; retained: number; cohort_size: number };
const SMALL_COHORT = 50; // fewer people than this → percentages are noise, not signal

export function CohortHeatmap({ rows }: { rows: CohortRow[] }) {
  const { ref, tip, show, hide } = useTip();
  const cohorts = [...new Set(rows.map((r) => r.cohort))].sort();
  const last = cohorts[cohorts.length - 1] ?? "";
  const maxCol = 6;
  const map = new Map<string, { pct: number; retained: number }>();
  const size = new Map<string, number>();
  for (const r of rows) { map.set(`${r.cohort}:${r.months_since}`, { pct: r.retention_pct, retained: r.retained }); size.set(r.cohort, r.cohort_size); }

  const addM = (ym: string, n: number) => {
    const [y, m] = ym.split("-").map(Number);
    const t = y * 12 + (m - 1) + n;
    return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
  };
  const isFuture = (co: string, i: number) => addM(co, i) > last;

  // benchmark: weighted average per month-offset across readable cohorts
  const typical: (number | null)[] = Array.from({ length: maxCol }, (_, k) => {
    const i = k + 1;
    let ret = 0, den = 0;
    for (const co of cohorts) {
      const sz = size.get(co) ?? 0;
      if (sz < SMALL_COHORT || isFuture(co, i)) continue;
      ret += map.get(`${co}:${i}`)?.retained ?? 0;
      den += sz;
    }
    return den ? Math.round((1000 * ret) / den) / 10 : null;
  });
  const m1 = typical[0], m3 = typical[2];

  // normalize the heat to the real data range so small differences stay visible
  const heatMax = Math.max(8, ...rows.filter((r) => r.months_since >= 1 && (size.get(r.cohort) ?? 0) >= SMALL_COHORT).map((r) => Number(r.retention_pct)));
  const cellStyle = (pct: number | undefined) => {
    if (pct === undefined) return { background: "var(--line-soft)", color: "var(--ink-soft)" };
    const a = Math.max(0.07, Math.min(1, pct / heatMax));
    return { background: `color-mix(in srgb, var(--brand) ${Math.round(a * 88)}%, transparent)`, color: a > 0.55 ? "#fff" : "var(--ink)" };
  };

  return (
    <div ref={ref} className="relative">
      {/* the takeaway, in words first */}
      {m1 != null && (
        <p className="mb-3 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          For every <b style={{ color: "var(--ink)" }}>100 customers</b> who join, about{" "}
          <b className="font-mono tnum" style={{ color: "var(--brand-ink)" }}>{Math.round(m1)}</b> buy again the very next month
          {m3 != null && <> and about <b className="font-mono tnum" style={{ color: "var(--brand-ink)" }}>{Math.round(m3)}</b> are still coming back 3 months in</>}.
          Each row below follows one joining month — greener means more of them came back.
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full border-separate text-xs" style={{ borderSpacing: "3px", minWidth: 560 }}>
          <thead>
            <tr>
              <th className="text-left font-semibold" style={{ color: "var(--ink-soft)" }}>Joined in</th>
              <th className="text-right font-semibold" style={{ color: "var(--ink-soft)" }}>People</th>
              {Array.from({ length: maxCol }, (_, k) => (
                <th key={k} className="font-semibold tnum" style={{ color: "var(--ink-soft)" }}>+{k + 1} mo</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* benchmark row — the number to compare everything else against */}
            <tr>
              <td className="whitespace-nowrap pr-2 font-bold">Typical month</td>
              <td className="text-right font-mono tnum" style={{ color: "var(--ink-soft)" }}>avg</td>
              {typical.map((t, k) => (
                <td key={k} className="cursor-default rounded text-center font-mono font-bold tnum"
                  style={{ ...(t == null ? { color: "var(--ink-soft)" } : cellStyle(t)), padding: "6px 4px", minWidth: 44, boxShadow: "inset 0 0 0 1px var(--line)" }}
                  onPointerMove={t == null ? undefined : (e) => show(e, (
                    <div>
                      <TipTitle>Typical month · {k + 1} month{k ? "s" : ""} after joining</TipTitle>
                      <TipRow swatch="var(--brand)" label="Come back" value={`${t}% — about ${Math.round(t)} in 100`} />
                    </div>
                  ))}
                  onPointerLeave={hide}
                >{t == null ? "" : `${t}%`}</td>
              ))}
            </tr>
            {cohorts.map((co) => {
              const sz = size.get(co) ?? 0;
              const small = sz < SMALL_COHORT;
              return (
                <tr key={co} style={small ? { opacity: 0.4 } : undefined}>
                  <td className="whitespace-nowrap pr-2 font-medium">{monthLabel(co)}</td>
                  <td className="text-right font-mono tnum" style={{ color: "var(--ink-soft)" }}>{num(sz)}</td>
                  {Array.from({ length: maxCol }, (_, k) => {
                    const i = k + 1;
                    const future = isFuture(co, i);
                    const c = map.get(`${co}:${i}`);
                    const pct = future ? undefined : (c?.pct ?? 0);
                    const s = future ? { background: "transparent", color: "var(--ink-soft)" } : cellStyle(pct);
                    return (
                      <td key={i} className="cursor-default rounded text-center font-mono tnum"
                        style={{ ...s, padding: "6px 4px", minWidth: 44 }}
                        onPointerMove={future ? undefined : (e) => show(e, (
                          <div>
                            <TipTitle>Joined {monthLabel(co)} · {i} month{i > 1 ? "s" : ""} later</TipTitle>
                            <TipRow swatch="var(--brand)" label="Came back" value={`${num(c?.retained ?? 0)} of ${num(sz)} people`} />
                            <TipRow label="That's" value={`${pct}%`} />
                            {small && <div className="mt-1 max-w-[200px] whitespace-normal text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>Only {num(sz)} people joined this month — too few to read much into.</div>}
                          </div>
                        ))}
                        onPointerLeave={hide}
                      >{future ? "·" : `${pct}%`}</td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.66rem]" style={{ color: "var(--ink-soft)" }}>
        <span>· = not enough time has passed yet</span>
        <span>0% = nobody came back that month</span>
        <span>faded rows = too few people to be meaningful</span>
      </div>
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
                <TipRow swatch={col} label="Revenue" value={idrFull(s.gmv)} />
                <TipRow label="Customers" value={num(s.customers)} />
                <TipRow label="Avg orders" value={`${s.avg_orders}×`} />
                <TipRow label="Last order" value={`~${num(s.avg_recency_days)} days ago`} />
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
  // 600-wide viewBox in a half-width card ≈ 1:1 scale → axis & product labels stay legible
  const W = 600, H = 260, pad = { t: 16, r: 40, b: 56, l: 12 };
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
        <TipRow swatch="var(--brand)" label="Revenue" value={idrFull(row.gmv)} />
        <TipRow label="Units" value={num(row.units)} />
        <TipRow swatch="var(--accent)" label="Cumulative" value={`${row.cum_gmv_pct}%`} />
      </div>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" role="img" aria-label="Revenue per product with running total"
        onPointerMove={onMove} onPointerLeave={hide}>
        {[0, 25, 50, 75, 100].map((p) => (
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
        {/* horizontal short labels, staggered on two rows so 12 bars never collide */}
        {rows.map((r, i) => {
          const short = r.product_name.replace(/^The /, "").split(" ").slice(0, 2).join(" ");
          return (
            <text key={i} x={x(i)} y={i % 2 === 0 ? H - 22 : H - 8} textAnchor="middle" fontSize="9.5" fill="var(--ink-soft)">
              {short.length > 10 ? short.slice(0, 9) + "…" : short}
            </text>
          );
        })}
      </svg>
      <TipBox tip={tip} />
    </div>
  );
}

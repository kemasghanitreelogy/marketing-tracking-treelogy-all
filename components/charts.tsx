"use client";
// Interactive SVG charts — no chart library. Hover uses the d3-style "bisect"
// pattern: inverse-scale the pointer x to the nearest data index, then render a
// crosshair + active dot + exact-value tooltip. Pointer events cover touch too.
import { PointerEvent, useState } from "react";
import { num, idr, idrFull } from "@/lib/format";
import { useTip, TipBox, TipTitle, TipRow } from "@/components/tooltip";

export type Pt = { label: string; value: number; display?: string };

function svgX(e: PointerEvent<SVGSVGElement>, viewW: number) {
  const r = e.currentTarget.getBoundingClientRect();
  return ((e.clientX - r.left) / r.width) * viewW;
}

export function AreaTrend({ data, unit = "", h = 220 }: { data: Pt[]; unit?: string; h?: number }) {
  const { ref, tip, show, hide } = useTip();
  const W = 720, H = h, pad = { t: 14, r: 12, b: 26, l: 44 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const step = Math.ceil(data.length / 6);
  const last = data[data.length - 1];
  const [hoverIdx, setHoverIdx] = useState(-1);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!data.length) return;
    const px = svgX(e, W);
    const i = Math.min(data.length - 1, Math.max(0, Math.round(((px - pad.l) / iw) * (data.length - 1))));
    setHoverIdx(i);
    const d = data[i];
    show(e, (
      <div>
        <TipTitle>{d.label}</TipTitle>
        <TipRow swatch="var(--brand)" label="Value" value={d.display ?? num(d.value) + unit} />
      </div>
    ));
  }
  function onLeave() { setHoverIdx(-1); hide(); }

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" role="img" aria-label="Monthly trend"
        onPointerMove={onMove} onPointerLeave={onLeave}>
        <defs>
          <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 3} textAnchor="end" fontSize="10" fill="var(--ink-soft)" className="tnum">{num(t)}</text>
          </g>
        ))}
        <path d={area} fill="url(#ag)" />
        <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {hoverIdx >= 0 && hoverIdx < data.length && (
          <g>
            <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={pad.t} y2={pad.t + ih} stroke="var(--ink-soft)" strokeDasharray="3 3" strokeWidth="1" opacity="0.6" />
            <circle cx={x(hoverIdx)} cy={y(data[hoverIdx].value)} r="4.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
        <circle cx={x(data.length - 1)} cy={y(last.value)} r="3.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="1.5" />
        {data.map((d, i) => (i % step === 0 || i === data.length - 1) ? (
          <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{d.label}</text>
        ) : null)}
      </svg>
      <TipBox tip={tip} />
    </div>
  );
}

export function BarList({ rows, mode = "num" }: { rows: { name: string; value: number; meta?: string }[]; mode?: "num" | "idr" }) {
  const { ref, tip, show, hide } = useTip();
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div ref={ref} className="relative flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="flex cursor-default items-center gap-3 rounded-md px-1 transition-colors hover:bg-[var(--line-soft)]"
          onPointerMove={(e) => show(e, (
            <div>
              <TipTitle>{r.name}</TipTitle>
              <TipRow swatch="var(--brand)" label={mode === "idr" ? "GMV" : "Units"} value={mode === "idr" ? idrFull(r.value) : num(r.value)} />
            </div>
          ))}
          onPointerLeave={hide}>
          <div className="w-24 shrink-0 truncate text-sm" style={{ color: "var(--ink)" }} title={r.name}>{r.name}</div>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md" style={{ background: "var(--line-soft)" }}>
            <div className="h-full rounded-md" style={{ width: `${(r.value / max) * 100}%`, background: "var(--brand)", opacity: 0.85 }} />
          </div>
          <div className="w-24 shrink-0 whitespace-nowrap text-right font-mono text-sm tnum" style={{ color: "var(--ink)" }}>
            {mode === "idr" ? idr(r.value) : num(r.value)}
          </div>
        </div>
      ))}
      <TipBox tip={tip} />
    </div>
  );
}

export function StackedMonths({ data, labels = ["New", "Returning"] }:
  { data: { label: string; a: number; b: number }[]; labels?: [string, string] | string[] }) {
  const { ref, tip, show, hide } = useTip();
  const W = 720, H = 200, pad = { t: 12, r: 8, b: 24, l: 8 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.a + d.b));
  const bw = (iw / data.length) * 0.62;
  const step = Math.ceil(data.length / 8);
  const cx = (i: number) => pad.l + (i + 0.5) * (iw / data.length);

  function onMove(e: PointerEvent<SVGSVGElement>) {
    if (!data.length) return;
    const px = svgX(e, W);
    const i = Math.min(data.length - 1, Math.max(0, Math.floor((px - pad.l) / (iw / data.length))));
    const d = data[i];
    show(e, (
      <div>
        <TipTitle>{d.label}</TipTitle>
        <TipRow swatch="var(--accent)" label={labels[0]} value={num(d.a)} />
        <TipRow swatch="var(--brand)" label={labels[1]} value={num(d.b)} />
        <TipRow label="Total" value={num(d.a + d.b)} />
      </div>
    ));
  }

  return (
    <div ref={ref} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full cursor-crosshair" role="img" aria-label="New vs returning customers per month"
        onPointerMove={onMove} onPointerLeave={hide}>
        {data.map((d, i) => {
          const hA = (d.a / max) * ih, hB = (d.b / max) * ih;
          return (
            <g key={i}>
              <rect x={cx(i) - bw / 2} y={pad.t + ih - hB} width={bw} height={hB} rx="2" fill="var(--brand)" opacity="0.9" />
              <rect x={cx(i) - bw / 2} y={pad.t + ih - hB - hA} width={bw} height={hA} rx="2" fill="var(--accent)" opacity="0.9" />
              {i % step === 0 && <text x={cx(i)} y={H - 7} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <TipBox tip={tip} />
    </div>
  );
}

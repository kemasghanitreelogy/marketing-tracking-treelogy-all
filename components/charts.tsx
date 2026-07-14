// Pure server-rendered SVG charts — zero client JS, crisp on any DPR.
import { num, idr } from "@/lib/format";

type Pt = { label: string; value: number };

export function AreaTrend({ data, unit = "" }: { data: Pt[]; unit?: string }) {
  const W = 720, H = 220, pad = { t: 14, r: 12, b: 26, l: 44 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.value));
  const x = (i: number) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${pad.t + ih} L${x(0).toFixed(1)},${pad.t + ih} Z`;
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  const step = Math.ceil(data.length / 6);
  const last = data[data.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tren penjualan bulanan">
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
      <circle cx={x(data.length - 1)} cy={y(last.value)} r="3.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="1.5" />
      {data.map((d, i) => (i % step === 0 || i === data.length - 1) ? (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{d.label}</text>
      ) : null)}
    </svg>
  );
}

export function BarList({ rows, mode = "num" }: { rows: { name: string; value: number; meta?: string }[]; mode?: "num" | "idr" }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="flex flex-col gap-2.5">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-24 shrink-0 truncate text-sm" style={{ color: "var(--ink)" }} title={r.name}>{r.name}</div>
          <div className="relative h-6 flex-1 overflow-hidden rounded-md" style={{ background: "var(--line-soft)" }}>
            <div className="h-full rounded-md" style={{ width: `${(r.value / max) * 100}%`, background: "var(--brand)", opacity: 0.85 }} />
          </div>
          <div className="w-24 shrink-0 whitespace-nowrap text-right font-mono text-sm tnum" style={{ color: "var(--ink)" }}>
            {mode === "idr" ? idr(r.value) : num(r.value)}
          </div>
        </div>
      ))}
    </div>
  );
}

export function StackedMonths({ data }: { data: { label: string; a: number; b: number }[] }) {
  const W = 720, H = 200, pad = { t: 12, r: 8, b: 24, l: 8 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const max = Math.max(1, ...data.map((d) => d.a + d.b));
  const bw = (iw / data.length) * 0.62;
  const step = Math.ceil(data.length / 8);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Pelanggan baru vs kembali per bulan">
      {data.map((d, i) => {
        const cx = pad.l + (i + 0.5) * (iw / data.length);
        const hA = (d.a / max) * ih, hB = (d.b / max) * ih;
        return (
          <g key={i}>
            <rect x={cx - bw / 2} y={pad.t + ih - hB} width={bw} height={hB} rx="2" fill="var(--brand)" opacity="0.9" />
            <rect x={cx - bw / 2} y={pad.t + ih - hB - hA} width={bw} height={hA} rx="2" fill="var(--accent)" opacity="0.9" />
            {i % step === 0 && <text x={cx} y={H - 7} textAnchor="middle" fontSize="10" fill="var(--ink-soft)">{d.label}</text>}
          </g>
        );
      })}
    </svg>
  );
}

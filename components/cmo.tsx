// CMO / executive components — server-rendered (static, no client JS).
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
      <div className="mt-0.5 text-[0.62rem]" style={{ color: "var(--ink-soft)" }}>vs previous 30 days</div>
    </Card>
  );
}

// Automated insights — ranked findings with severity stripe
const SEV: Record<string, { color: string; label: string }> = {
  bad: { color: "var(--bad)", label: "Action needed" },
  warn: { color: "var(--accent)", label: "Attention" },
  good: { color: "var(--good)", label: "Healthy" },
  info: { color: "#2F6DB0", label: "Info" },
};
export function InsightCards({ rows }: { rows: { severity: string; title: string; detail: string | null }[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {rows.map((r, i) => {
        const s = SEV[r.severity] ?? SEV.info;
        return (
          <div key={i} className="rounded-xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)", borderLeft: `4px solid ${s.color}` }}>
            <div className="mb-1 flex items-center gap-2">
              <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wide" style={{ background: `color-mix(in srgb, ${s.color} 15%, transparent)`, color: s.color }}>{s.label}</span>
            </div>
            <div className="text-[0.92rem] font-bold leading-snug">{r.title}</div>
            {r.detail && <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{r.detail}</div>}
          </div>
        );
      })}
    </div>
  );
}

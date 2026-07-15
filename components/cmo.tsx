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

// Automated insights — editorial briefing: one hero statement (the #1 ranked
// finding) + a divided feed. No uniform cards, no chips: severity lives in a
// pulsing dot and in the tinted numbers inside each headline.
const SEV: Record<string, { color: string; label: string }> = {
  bad: { color: "var(--bad)", label: "action needed" },
  warn: { color: "var(--accent)", label: "attention" },
  good: { color: "var(--good)", label: "healthy" },
  info: { color: "#2F6DB0", label: "info" },
};

// Tint the data inside a headline (Rp amounts, percentages, counts, "day N")
// so the number carries the severity instead of a chip.
function TintNums({ text, color }: { text: string; color: string }) {
  const parts = text.split(/(Rp ?[\d.,]+[MBK]?|[\d.,]+%|\bday \d+|\b[\d.,]+\b)/g);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? <b key={i} className="font-mono tnum" style={{ color }}>{p}</b> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export function InsightCards({ rows }: { rows: { severity: string; title: string; detail: string | null }[] }) {
  if (!rows.length) return null;
  const [hero, ...rest] = rows;
  const hs = SEV[hero.severity] ?? SEV.info;
  return (
    <div className="rounded-2xl border p-5 md:p-6" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
      {/* hero — the single finding that matters most right now */}
      <div className="flex items-baseline gap-2 text-[0.66rem] font-semibold uppercase tracking-widest" style={{ color: hs.color }}>
        <span className="relative flex h-2 w-2 self-center" aria-hidden>
          {hero.severity === "bad" && <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: hs.color }} />}
          <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: hs.color }} />
        </span>
        {hs.label} · top signal
      </div>
      <h2 className="mt-2 max-w-3xl text-[1.35rem] font-bold leading-snug tracking-tight md:text-[1.65rem]" style={{ textWrap: "balance" }}>
        <TintNums text={hero.title} color={hs.color} />
      </h2>
      {hero.detail && (
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          <TintNums text={hero.detail} color="var(--ink)" />
        </p>
      )}

      {/* the rest — a quiet divided feed, scanned not read */}
      {rest.length > 0 && (
        <div className="mt-5 grid gap-x-10 border-t md:grid-cols-2" style={{ borderColor: "var(--line)" }}>
          {rest.map((r, i) => {
            const s = SEV[r.severity] ?? SEV.info;
            return (
              <div key={i} className="flex gap-3 border-b py-3 last:border-b-0 md:[&:nth-last-child(2):nth-child(odd)]:border-b-0"
                style={{ borderColor: "var(--line-soft)" }}>
                <span className="mt-1 font-mono text-[0.62rem] tnum" style={{ color: "var(--ink-soft)" }} aria-hidden>
                  {String(i + 2).padStart(2, "0")}
                </span>
                <span className="mt-[0.42rem] inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.color }} aria-label={s.label} />
                <div className="min-w-0 text-sm leading-relaxed">
                  <span className="font-semibold"><TintNums text={r.title} color={s.color} /></span>
                  {r.detail && <span style={{ color: "var(--ink-soft)" }}> — {r.detail}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--line)", boxShadow: "0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(0,0,0,.04)" }}
    >
      {children}
    </div>
  );
}

export function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <Card>
      <div className="text-[0.7rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
        {label}
      </div>
      <div className="mt-2 font-mono text-3xl font-bold tnum leading-none" style={{ color: accent ? "var(--brand)" : "var(--ink)" }}>
        {value}
      </div>
      {sub && (
        <div className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          {sub}
        </div>
      )}
    </Card>
  );
}

export function SectionTitle({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <h2 className="text-[0.95rem] font-bold tracking-tight" style={{ color: "var(--ink)" }}>
        {title}
      </h2>
      {hint && <span className="text-xs" style={{ color: "var(--ink-soft)" }}>{hint}</span>}
    </div>
  );
}

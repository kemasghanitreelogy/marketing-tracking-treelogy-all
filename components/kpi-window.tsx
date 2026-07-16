"use client";
// KPI comparison-window switcher: a joined segmented control with a sliding thumb.
// Scopes ONLY the KPI cards (that's why it sits on the section header row, not in
// the global filter bar). State lives in the URL (?win=) like every other filter;
// useTransition keeps the old cards on screen while the server recomputes.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { KPI_WINDOWS } from "@/lib/kpi";

export default function KpiWindow() {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const raw = Number(params.get("win"));
  const cur = (KPI_WINDOWS as readonly number[]).includes(raw) ? raw : 30;
  const idx = KPI_WINDOWS.indexOf(cur as (typeof KPI_WINDOWS)[number]);

  function set(w: number) {
    if (w === cur) return;
    const q = new URLSearchParams(params.toString());
    if (w === 30) q.delete("win"); else q.set("win", String(w));
    const qs = q.toString();
    startTransition(() => router.replace(`/${qs ? `?${qs}` : ""}`, { scroll: false }));
  }

  return (
    <div className="flex items-center gap-2">
      {isPending && (
        <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="3" role="status" aria-label="updating">
          <circle cx="12" cy="12" r="9" opacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" />
        </svg>
      )}
      <span className="hidden text-[0.62rem] sm:inline" style={{ color: "var(--ink-soft)" }}>compare window</span>
      <div role="group" aria-label="KPI comparison window"
        className="relative grid grid-cols-5 rounded-full border p-0.5"
        style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
        {/* sliding thumb — glides under the active segment */}
        <span aria-hidden
          className="absolute bottom-0.5 top-0.5 rounded-full transition-transform duration-300 ease-out"
          style={{
            width: "calc((100% - 4px) / 5)", left: 2,
            transform: `translateX(${idx * 100}%)`,
            background: "var(--brand-wash)", boxShadow: "inset 0 0 0 1px var(--brand)",
          }} />
        {KPI_WINDOWS.map((w) => (
          <button key={w} type="button" onClick={() => set(w)} aria-pressed={w === cur}
            className="relative z-10 cursor-pointer rounded-full px-2.5 py-1 text-center font-mono text-[0.7rem] font-semibold tnum transition-colors duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--brand)]"
            style={{ color: w === cur ? "var(--brand-ink)" : "var(--ink-soft)" }}>
            {w}D
          </button>
        ))}
      </div>
    </div>
  );
}

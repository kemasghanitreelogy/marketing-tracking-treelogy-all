"use client";
// "Get insights" disclosure for every chart card. Points are computed server-side
// from the exact filtered dataset the chart renders, so they're always consistent.
import { useState } from "react";
import type { InsightPt } from "@/lib/insights";

const TONE: Record<InsightPt["tone"], string> = {
  good: "var(--good)", warn: "var(--accent)", info: "var(--brand)",
};

export default function GetInsight({ points }: { points: InsightPt[] }) {
  const [open, setOpen] = useState(false);
  if (!points.length) return null;
  return (
    <div className="mb-3">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-[0.7rem] font-semibold transition-colors duration-200 hover:bg-[var(--brand-wash)]"
        style={{ borderColor: open ? "var(--brand)" : "var(--line)", color: open ? "var(--brand-ink)" : "var(--ink-soft)", background: open ? "var(--brand-wash)" : "transparent" }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3l1.9 5.7L19.6 10l-5.7 1.9L12 17.6l-1.9-5.7L4.4 10l5.7-1.9L12 3z" />
          <path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
        </svg>
        {open ? "Hide insights" : "Get insights"}
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className="transition-transform duration-200" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul className="mt-2 flex flex-col gap-1.5 rounded-lg border p-3 text-[0.8rem] leading-relaxed"
          style={{ borderColor: "var(--line-soft)", background: "var(--line-soft)" }}>
          {points.map((p, i) => (
            <li key={i} className="flex gap-2">
              <i className="mt-[0.45em] inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: TONE[p.tone] }} aria-hidden />
              <span>{p.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

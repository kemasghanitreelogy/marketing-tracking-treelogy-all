"use client";
// Global filter bar: multi-select channel chips + date-range (presets & custom).
// State lives in the URL (?ch=&from=&to=) so views are shareable; useTransition
// keeps the old charts on screen while the server recomputes — no flash.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

const DATA_START = "2025-02-01";
const iso = (d: Date) => d.toISOString().slice(0, 10);

function presetRange(key: string): { from?: string; to?: string } {
  const now = new Date();
  const d = (days: number) => iso(new Date(now.getTime() - days * 86400000));
  switch (key) {
    case "30d": return { from: d(29) };
    case "90d": return { from: d(89) };
    case "6m": return { from: iso(new Date(now.getFullYear(), now.getMonth() - 6, now.getDate())) };
    case "ytd": return { from: `${now.getFullYear()}-01-01` };
    case "month": return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)) };
    default: return {};
  }
}
const PRESETS: [string, string][] = [["all", "All time"], ["30d", "30D"], ["90d", "90D"], ["6m", "6M"], ["ytd", "YTD"], ["month", "This month"]];

export default function ChannelFilter({ channels }: { channels: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selected = new Set((params.get("ch") ?? "").split(",").filter(Boolean));
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const activeAll = selected.size === 0;
  const activePreset = PRESETS.find(([k]) => {
    const r = presetRange(k);
    return (r.from ?? "") === from && (r.to ?? "") === to;
  })?.[0];

  function nav(next: { ch?: Set<string>; from?: string; to?: string }) {
    const chSet = next.ch ?? selected;
    // canonical order → one URL (and one server cache entry) per combo
    const list = channels.filter((c) => chSet.has(c));
    const q = new URLSearchParams();
    if (list.length > 0 && list.length < channels.length) q.set("ch", list.join(","));
    const f = next.from ?? from, t = next.to ?? to;
    if (f) q.set("from", f);
    if (t) q.set("to", t);
    const qs = q.toString();
    startTransition(() => router.replace(`/${qs ? `?${qs}` : ""}`, { scroll: false }));
  }
  function toggle(ch: string) {
    const next = new Set(selected);
    if (next.has(ch)) next.delete(ch); else next.add(ch);
    nav({ ch: next });
  }
  function preset(key: string) {
    const r = presetRange(key);
    nav({ from: r.from ?? "", to: r.to ?? "" });
  }

  const chipOn = { background: "var(--brand-wash)", borderColor: "var(--brand)", color: "var(--brand-ink)" } as const;
  const chipOff = { borderColor: "var(--line)", color: "var(--ink-soft)" } as const;

  return (
    <div className="flex flex-col gap-2.5">
      {/* channels */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter charts by sales channel">
        <span className="w-16 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Channels</span>
        <button onClick={() => nav({ ch: new Set() })} aria-pressed={activeAll}
          className="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200"
          style={activeAll ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" } : chipOff}>
          All
        </button>
        {channels.map((ch) => {
          const on = selected.has(ch);
          return (
            <button key={ch} onClick={() => toggle(ch)} aria-pressed={on}
              className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200"
              style={on ? chipOn : chipOff}>
              <span className="grid h-3.5 w-3.5 place-items-center rounded border" aria-hidden
                style={{ borderColor: on ? "var(--brand)" : "var(--line)", background: on ? "var(--brand)" : "transparent" }}>
                {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
              </span>
              {ch}
            </button>
          );
        })}
        {isPending && (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }} role="status">
            <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="9" opacity="0.25" /><path d="M21 12a9 9 0 0 0-9-9" strokeLinecap="round" /></svg>
            updating…
          </span>
        )}
      </div>

      {/* period */}
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter charts by date range">
        <span className="w-16 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Period</span>
        {PRESETS.map(([k, label]) => {
          const on = activePreset === k;
          return (
            <button key={k} onClick={() => preset(k)} aria-pressed={on}
              className="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors duration-200"
              style={on ? (k === "all" ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" } : chipOn) : chipOff}>
              {label}
            </button>
          );
        })}
        <span className="mx-1 h-4 w-px" style={{ background: "var(--line)" }} aria-hidden />
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
          <span className="sr-only sm:not-sr-only">From</span>
          <input type="date" value={from} min={DATA_START} max={to || iso(new Date())}
            onChange={(e) => nav({ from: e.target.value })}
            aria-label="From date"
            className="cursor-pointer rounded-full border px-3 py-1 font-mono text-xs tnum outline-none transition-colors duration-200 focus-visible:border-[var(--brand)]"
            style={{ borderColor: from ? "var(--brand)" : "var(--line)", background: "transparent", color: "var(--ink)", colorScheme: "light dark" }} />
        </label>
        <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>
          <span className="sr-only sm:not-sr-only">to</span>
          <input type="date" value={to} min={from || DATA_START} max={iso(new Date())}
            onChange={(e) => nav({ to: e.target.value })}
            aria-label="To date"
            className="cursor-pointer rounded-full border px-3 py-1 font-mono text-xs tnum outline-none transition-colors duration-200 focus-visible:border-[var(--brand)]"
            style={{ borderColor: to ? "var(--brand)" : "var(--line)", background: "transparent", color: "var(--ink)", colorScheme: "light dark" }} />
        </label>
        {(from || to) && (
          <button onClick={() => nav({ from: "", to: "" })}
            className="flex cursor-pointer items-center gap-1 rounded-full px-2 py-1 text-[0.68rem] font-semibold transition-colors duration-200 hover:bg-[var(--line-soft)]"
            style={{ color: "var(--ink-soft)" }} aria-label="Clear date range">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

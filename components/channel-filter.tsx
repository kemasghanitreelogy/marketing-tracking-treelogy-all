"use client";
// Global multi-select channel filter. State lives in the URL (?ch=a,b) so views
// are shareable & bookmarkable; useTransition keeps old charts on screen while
// the server recomputes — no flash, fully seamless.
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

export default function ChannelFilter({ channels }: { channels: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selected = new Set((params.get("ch") ?? "").split(",").filter(Boolean));
  const activeAll = selected.size === 0;

  function apply(next: Set<string>) {
    // canonical order → one URL (and one server cache entry) per combo
    const list = channels.filter((c) => next.has(c));
    const qs = list.length === 0 || list.length === channels.length ? "" : `?ch=${list.join(",")}`;
    startTransition(() => router.replace(`/${qs}`, { scroll: false }));
  }
  function toggle(ch: string) {
    const next = new Set(selected);
    if (next.has(ch)) next.delete(ch); else next.add(ch);
    apply(next);
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter charts by sales channel">
      <span className="text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Channels</span>
      <button onClick={() => apply(new Set())} aria-pressed={activeAll}
        className="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
        style={activeAll
          ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }
          : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
        All
      </button>
      {channels.map((ch) => {
        const on = selected.has(ch);
        return (
          <button key={ch} onClick={() => toggle(ch)} aria-pressed={on}
            className="flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
            style={on
              ? { background: "var(--brand-wash)", borderColor: "var(--brand)", color: "var(--brand-ink)" }
              : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
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
      {!activeAll && (
        <span className="text-[0.66rem]" style={{ color: "var(--ink-soft)" }}>· data-quality score stays all-channel</span>
      )}
    </div>
  );
}

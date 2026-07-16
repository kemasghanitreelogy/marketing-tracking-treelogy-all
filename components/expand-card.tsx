"use client";

import { ReactNode, useCallback, useEffect, useRef, useState } from "react";

function MaximizeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3H5a2 2 0 0 0-2 2v3" />
      <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h3" />
      <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}

function MinimizeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 3v3a2 2 0 0 1-2 2H3" />
      <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
      <path d="M3 16h3a2 2 0 0 1 2 2v3" />
      <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
    </svg>
  );
}

export default function ExpandCard({ children, label, className = "" }: { children: ReactNode; label: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);
  const full = native || fallback;

  // Sync with native fullscreen (also covers Esc, which the browser handles).
  useEffect(() => {
    const onChange = () => setNative(document.fullscreenElement === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Fallback mode: Esc to exit + body scroll-lock.
  useEffect(() => {
    if (!fallback) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFallback(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [fallback]);

  const enter = useCallback(async () => {
    const el = ref.current;
    if (!el) return;
    try {
      await el.requestFullscreen();
    } catch {
      setFallback(true);
    }
  }, []);

  const exit = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setFallback(false);
  }, []);

  return (
    <div
      ref={ref}
      className={
        full
          ? `relative overflow-y-auto ${fallback ? "fixed inset-0 z-50" : "h-full w-full"}`
          : `relative rounded-2xl border p-5 ${className}`
      }
      style={
        full
          ? { background: "var(--bg)" }
          : { background: "var(--surface)", borderColor: "var(--line)", boxShadow: "0 1px 2px rgba(0,0,0,.03), 0 8px 24px rgba(0,0,0,.04)" }
      }
    >
      <button
        type="button"
        onClick={full ? exit : enter}
        aria-label={full ? "Exit fullscreen" : `View ${label} fullscreen`}
        title={full ? "Exit fullscreen" : "Fullscreen"}
        className={
          full
            ? "fixed right-4 top-4 z-[60] flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border transition-colors duration-200 hover:bg-[var(--line-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            : "absolute right-3 top-3 z-10 flex h-7 w-7 cursor-pointer items-center justify-center rounded-md opacity-60 transition-all duration-200 hover:bg-[var(--line-soft)] hover:opacity-100 focus-visible:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
        }
        style={
          full
            ? { color: "var(--ink-soft)", background: "var(--surface)", borderColor: "var(--line)", boxShadow: "0 2px 8px rgba(0,0,0,.1)" }
            : { color: "var(--ink-soft)" }
        }
      >
        {full ? <MinimizeIcon /> : <MaximizeIcon />}
      </button>
      {full ? (
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-6 md:p-10">
          <div className="my-auto w-full [&>*:first-child]:pr-8">{children}</div>
        </div>
      ) : (
        <div className="[&>*:first-child]:pr-8">{children}</div>
      )}
    </div>
  );
}

"use client";
// Shared chart-tooltip primitive: edge-aware floating box driven by pointer events
// (works for mouse AND touch), pointer-events:none so it never flickers or blocks.
import { ReactNode, useRef, useState } from "react";

export type Tip = { x: number; y: number; node: ReactNode; below?: boolean } | null;

export function useTip() {
  const ref = useRef<HTMLDivElement>(null);
  const [tip, setTip] = useState<Tip>(null);

  function show(e: { clientX: number; clientY: number }, node: ReactNode) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    // clamp horizontally so the box never clips at container edges
    const x = Math.min(Math.max(e.clientX - r.left, 76), Math.max(r.width - 76, 76));
    const y = e.clientY - r.top;
    // not enough headroom above the pointer → flip the box below it
    setTip({ x, y, node, below: y < 120 });
  }
  const hide = () => setTip(null);
  return { ref, tip, show, hide };
}

export function TipBox({ tip }: { tip: Tip }) {
  if (!tip) return null;
  return (
    <div
      role="status"
      className="pointer-events-none absolute z-20 rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{
        left: tip.x,
        top: tip.y,
        transform: tip.below ? "translate(-50%, 14px)" : "translate(-50%, calc(-100% - 14px))",
        background: "var(--surface)",
        borderColor: "var(--line)",
        color: "var(--ink)",
        boxShadow: "0 4px 20px rgba(0,0,0,.18)",
        whiteSpace: "nowrap",
      }}
    >
      {tip.node}
    </div>
  );
}

export function TipTitle({ children }: { children: ReactNode }) {
  return <div className="mb-0.5 font-bold">{children}</div>;
}
export function TipRow({ swatch, label, value }: { swatch?: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 tnum">
      {swatch && <i className="inline-block h-2 w-2 rounded-sm" style={{ background: swatch }} />}
      <span style={{ color: "var(--ink-soft)" }}>{label}</span>
      <span className="ml-auto pl-3 font-mono font-semibold">{value}</span>
    </div>
  );
}

"use client";
// Top-customers table with click-to-open Customer 360 modal:
// profile, lifetime KPIs, RFM segment, contact info, top products, full order history.
import { useEffect, useRef, useState } from "react";
import { num, idr, idrFull } from "@/lib/format";

type Row = { unified_customer_id: number; name: string; channels: string[]; orders: number; units: number; revenue: string };
type C360 = {
  profile: { name: string | null; aliases: string[] | null; phone: string | null; email: string | null; address: string | null };
  stats: { total_orders: number; total_units: number; total_gmv: number; aov: number; first_order: string; last_order: string; recency_days: number; channels: string[] | null };
  segment: string;
  orders: { date: string; channel: string; no: string; items: string | null; qty: number; gmv: number; status: string }[];
  top_products: { product: string; units: number; orders: number }[];
};

const SEG_COLOR: Record<string, string> = {
  "Champions": "var(--good)", "Loyal": "var(--brand)", "Potential Loyalist": "#2F6DB0",
  "New / Promising": "#4FA3A3", "Needs Attention": "var(--accent)", "At Risk (high value)": "var(--bad)",
  "Hibernating": "#8A7BA8",
};
const STATUS_COLOR: Record<string, string> = { completed: "var(--good)", canceled: "var(--bad)", processing: "var(--accent)" };

const cache = new Map<number, C360>();

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg p-2.5" style={{ background: "var(--line-soft)" }}>
      <div className="text-[0.6rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{label}</div>
      <div className="mt-0.5 whitespace-nowrap font-mono text-sm font-bold tnum">{value}</div>
    </div>
  );
}

export function Customer360Modal({ uid, name, onClose }: { uid: number; name: string; onClose: () => void }) {
  const [data, setData] = useState<C360 | null>(cache.get(uid) ?? null);
  const [error, setError] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = ""; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => {
    if (cache.has(uid)) return;
    let alive = true;
    fetch(`/api/customer/${uid}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: C360) => { cache.set(uid, d); if (alive) setData(d); })
      .catch(() => alive && setError(true));
    return () => { alive = false; };
  }, [uid]);

  const segColor = data ? (SEG_COLOR[data.segment] ?? "var(--ink-soft)") : "var(--ink-soft)";
  const maxUnits = data ? Math.max(1, ...data.top_products.map((p) => p.units)) : 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label={`Customer detail: ${name}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ background: "rgba(8, 10, 8, 0.6)", backdropFilter: "blur(2px)" }}>
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border shadow-2xl"
        style={{ background: "var(--surface)", borderColor: "var(--line)" }}>

        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b p-5 pb-4" style={{ borderColor: "var(--line)" }}>
          <div className="min-w-0">
            <div className="truncate text-lg font-bold">{data?.profile.name ?? name}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {data && (
                <span className="rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
                  style={{ background: `color-mix(in srgb, ${segColor} 15%, transparent)`, color: segColor }}>{data.segment}</span>
              )}
              {(data?.stats.channels ?? []).map((ch) => (
                <span key={ch} className="rounded px-1.5 py-0.5 text-[0.62rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{ch}</span>
              ))}
            </div>
          </div>
          <button ref={closeRef} onClick={onClose} aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-lg border transition-colors hover:bg-[var(--line-soft)]"
            style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* body */}
        <div className="overflow-y-auto p-5">
          {error && <div className="py-10 text-center text-sm" style={{ color: "var(--bad)" }}>Failed to load customer detail. Try again.</div>}
          {!data && !error && (
            <div className="flex flex-col gap-3" aria-busy="true">
              {[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-lg" style={{ background: "var(--line-soft)" }} />)}
            </div>
          )}
          {data && (
            <div className="flex flex-col gap-5">
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                <Stat label="GMV" value={idr(data.stats.total_gmv)} />
                <Stat label="Orders" value={num(data.stats.total_orders)} />
                <Stat label="Units" value={num(data.stats.total_units)} />
                <Stat label="AOV" value={idr(data.stats.aov)} />
                <Stat label="First" value={data.stats.first_order ?? "—"} />
                <Stat label="Last" value={data.stats.last_order ?? "—"} />
                <Stat label="Recency" value={`${num(data.stats.recency_days)}d`} />
              </div>

              {/* contact */}
              <div className="rounded-xl border p-3.5 text-sm" style={{ borderColor: "var(--line-soft)" }}>
                <div className="mb-1.5 text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Contact & identity</div>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  <div><span style={{ color: "var(--ink-soft)" }}>Phone: </span><span className="font-mono tnum">{data.profile.phone ?? "—"}</span></div>
                  <div className="truncate"><span style={{ color: "var(--ink-soft)" }}>Email: </span>{data.profile.email ?? "—"}</div>
                </div>
                <div className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{data.profile.address ?? "—"}</div>
                {(data.profile.aliases ?? []).length > 1 && (
                  <div className="mt-1.5 text-xs" style={{ color: "var(--ink-soft)" }}>Also known as: {(data.profile.aliases ?? []).filter((a) => a !== data.profile.name).join(", ")}</div>
                )}
              </div>

              {/* top products */}
              <div>
                <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>Top products</div>
                <div className="flex flex-col gap-1.5">
                  {data.top_products.map((p) => (
                    <div key={p.product} className="flex items-center gap-2 text-sm">
                      <div className="w-36 shrink-0 truncate" title={p.product}>{p.product}</div>
                      <div className="relative h-4 flex-1 overflow-hidden rounded" style={{ background: "var(--line-soft)" }}>
                        <div className="h-full rounded" style={{ width: `${(p.units / maxUnits) * 100}%`, background: "var(--brand)", opacity: 0.85 }} />
                      </div>
                      <div className="w-14 shrink-0 text-right font-mono text-xs tnum">{num(p.units)}×</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* order history */}
              <div>
                <div className="mb-2 text-[0.62rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  Order history {data.orders.length >= 100 ? "(latest 100)" : `(${data.orders.length})`}
                </div>
                <div className="flex flex-col gap-1.5">
                  {data.orders.map((o, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line-soft)" }}>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                          <span className="font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{o.date}</span>
                          <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{o.channel}</span>
                          <span className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold capitalize"
                            style={{ background: `color-mix(in srgb, ${STATUS_COLOR[o.status] ?? "var(--ink-soft)"} 14%, transparent)`, color: STATUS_COLOR[o.status] ?? "var(--ink-soft)" }}>{o.status}</span>
                        </div>
                        <div className="mt-0.5 truncate text-xs" style={{ color: "var(--ink-soft)" }} title={o.items ?? ""}>{o.items ?? "—"}</div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm font-semibold tnum">{idr(o.gmv)}</div>
                        <div className="font-mono text-[0.65rem] tnum" style={{ color: "var(--ink-soft)" }}>{num(o.qty)} unit{o.qty > 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                Lifetime GMV {idrFull(data.stats.total_gmv)} · unified across all sales channels
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TopCustomersTable({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState<{ uid: number; name: string } | null>(null);
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[0.66rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
              <th className="pb-2 font-semibold">Name</th>
              <th className="pb-2 font-semibold">Channel</th>
              <th className="pb-2 text-right font-semibold">Orders</th>
              <th className="pb-2 text-right font-semibold">Units</th>
              <th className="pb-2 text-right font-semibold">GMV</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.unified_customer_id} tabIndex={0} role="button"
                aria-label={`Open detail for ${c.name}`}
                onClick={() => setOpen({ uid: c.unified_customer_id, name: c.name })}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpen({ uid: c.unified_customer_id, name: c.name }); } }}
                className="cursor-pointer border-b outline-none transition-colors last:border-0 hover:bg-[var(--line-soft)] focus-visible:bg-[var(--line-soft)]"
                style={{ borderColor: "var(--line-soft)" }}>
                <td className="py-2 pr-2 font-medium">{c.name || "—"}</td>
                <td className="py-2 pr-2"><span className="flex flex-wrap gap-1">{(c.channels ?? []).map((ch) => (<span key={ch} className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{ch}</span>))}</span></td>
                <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.orders)}</td>
                <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.units)}</td>
                <td className="py-2 text-right font-mono font-semibold tnum">{idr(c.revenue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && <Customer360Modal uid={open.uid} name={open.name} onClose={() => setOpen(null)} />}
    </>
  );
}

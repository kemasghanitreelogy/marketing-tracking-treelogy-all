"use client";
// Identity-merge review queue: approve (merge) or reject each candidate link.
import { useEffect, useMemo, useState } from "react";

type Link = {
  id: number; channel: string | null; evidence: string | null; name_sim: number | null; addr_sim: number | null;
  a_cid: number; a_name: string; a_addr: string | null; a_phone: string | null; a_orders: number; a_channels: string[] | null;
  b_cid: number; b_name: string; b_addr: string | null; b_phone: string | null; b_orders: number; b_channels: string[] | null;
};

function Side({ tag, name, addr, phone, orders, channels }:
  { tag: string; name: string; addr: string | null; phone: string | null; orders: number; channels: string[] | null }) {
  return (
    <div className="min-w-0 flex-1 rounded-lg p-3" style={{ background: "var(--line-soft)" }}>
      <div className="mb-1 flex flex-wrap items-center gap-1.5">
        <span className="text-[0.58rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{tag}</span>
        {(channels ?? []).map((c) => (
          <span key={c} className="rounded px-1.5 py-0.5 text-[0.58rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{c}</span>
        ))}
        <span className="ml-auto font-mono text-[0.65rem] tnum" style={{ color: "var(--ink-soft)" }}>{orders} orders</span>
      </div>
      <div className="truncate text-sm font-bold">{name || "—"}</div>
      <div className="mt-0.5 line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{addr ?? "—"}</div>
      <div className="mt-0.5 font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{phone ?? "no phone"}</div>
    </div>
  );
}

export default function ReviewPage() {
  const [key, setKey] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Link[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [done, setDone] = useState({ merged: 0, rejected: 0 });
  const [channel, setChannel] = useState("all");

  useEffect(() => {
    const k = localStorage.getItem("review_key");
    if (k) { setKey(k); load(k); }
  }, []);

  async function load(k: string) {
    setErr("");
    const r = await fetch("/api/review", { headers: { "x-review-key": k } });
    if (r.status === 401) { setErr("Wrong key."); setAuthed(false); return; }
    if (!r.ok) { setErr("Failed to load queue."); return; }
    localStorage.setItem("review_key", k);
    setAuthed(true);
    setRows(await r.json());
  }

  async function decide(id: number, approve: boolean) {
    setBusy(id);
    const r = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-review-key": key },
      body: JSON.stringify({ id, approve }),
    });
    setBusy(null);
    if (!r.ok) { setErr("Action failed — try again."); return; }
    setRows((rs) => (rs ?? []).filter((x) => x.id !== id));
    setDone((d) => (approve ? { ...d, merged: d.merged + 1 } : { ...d, rejected: d.rejected + 1 }));
  }

  const channels = useMemo(() => ["all", ...new Set((rows ?? []).map((r) => r.channel ?? "?"))], [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => channel === "all" || (r.channel ?? "?") === channel), [rows, channel]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-ink)" }}>
            <span style={{ color: "var(--brand)" }}>❦</span> Treelogy · Identity Review
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Merge Review Queue</h1>
          <p className="mt-1 max-w-xl text-sm" style={{ color: "var(--ink-soft)" }}>
            Each card is a candidate: two customer records that may be the same person.
            <b> Merge</b> unifies them (order history combines); <b>Reject</b> keeps them separate.
          </p>
        </div>
        <a href="/" className="rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-[var(--line-soft)]" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>← Dashboard</a>
      </header>

      {!authed && (
        <div className="mx-auto max-w-sm rounded-2xl border p-6" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
          <div className="mb-2 text-sm font-bold">Enter review key</div>
          <input type="password" value={key} onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(key)}
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
            style={{ background: "var(--bg)", borderColor: "var(--line)", color: "var(--ink)" }}
            placeholder="rvw_…" aria-label="Review key" />
          <button onClick={() => load(key)} className="mt-3 w-full cursor-pointer rounded-lg px-3 py-2 text-sm font-bold text-white transition-opacity hover:opacity-90" style={{ background: "var(--brand)" }}>Unlock</button>
          {err && <div className="mt-2 text-xs" style={{ color: "var(--bad)" }}>{err}</div>}
        </div>
      )}

      {authed && rows && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {channels.map((c) => (
              <button key={c} onClick={() => setChannel(c)}
                className="cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors"
                style={channel === c
                  ? { background: "var(--brand)", borderColor: "var(--brand)", color: "#fff" }
                  : { borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                {c === "all" ? `All (${rows.length})` : `${c} (${rows.filter((r) => (r.channel ?? "?") === c).length})`}
              </button>
            ))}
            <span className="ml-auto text-xs tnum" style={{ color: "var(--ink-soft)" }}>
              session: <b style={{ color: "var(--good)" }}>{done.merged} merged</b> · <b style={{ color: "var(--bad)" }}>{done.rejected} rejected</b> · {rows.length} left
            </span>
          </div>
          {err && <div className="mb-3 text-xs" style={{ color: "var(--bad)" }}>{err}</div>}

          <div className="flex flex-col gap-3">
            {shown.length === 0 && (
              <div className="rounded-2xl border p-10 text-center text-sm" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
                Queue empty — everything reviewed. 🎉
              </div>
            )}
            {shown.map((r) => (
              <div key={r.id} className="rounded-2xl border p-4" style={{ background: "var(--surface)", borderColor: "var(--line)", opacity: busy === r.id ? 0.5 : 1 }}>
                <div className="mb-2 flex flex-wrap items-center gap-2 text-[0.65rem]" style={{ color: "var(--ink-soft)" }}>
                  <span className="rounded px-1.5 py-0.5 font-bold uppercase tracking-wide" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{r.channel ?? "?"}</span>
                  <span>{r.evidence}</span>
                  <span className="ml-auto font-mono tnum">name {r.name_sim ?? "—"} · addr {r.addr_sim ?? "—"}</span>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Side tag="Record A" name={r.a_name} addr={r.a_addr} phone={r.a_phone} orders={r.a_orders} channels={r.a_channels} />
                  <div className="hidden items-center sm:flex" style={{ color: "var(--ink-soft)" }}>⇄</div>
                  <Side tag="Record B" name={r.b_name} addr={r.b_addr} phone={r.b_phone} orders={r.b_orders} channels={r.b_channels} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button disabled={busy === r.id} onClick={() => decide(r.id, true)}
                    className="cursor-pointer rounded-lg px-4 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-wait"
                    style={{ background: "var(--good)" }}>Same person · Merge</button>
                  <button disabled={busy === r.id} onClick={() => decide(r.id, false)}
                    className="cursor-pointer rounded-lg border px-4 py-1.5 text-xs font-bold transition-colors hover:bg-[var(--line-soft)] disabled:cursor-wait"
                    style={{ borderColor: "var(--bad)", color: "var(--bad)" }}>Different · Reject</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </main>
  );
}

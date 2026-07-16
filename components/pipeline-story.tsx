"use client";
// /how-it-works — animated story of the data pipeline, from four marketplaces to
// the live dashboard. Zero animation libraries: SMIL <animateMotion> packets on the
// curved hero flow (gated by matchMedia — the global reduced-motion CSS kill doesn't
// stop SMIL), CSS keyframe packets on the straight spine, IntersectionObserver
// reveals, rAF count-ups. Live stats poll every 30s to prove the pipeline runs NOW.
import { ReactNode, useEffect, useId, useRef, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { num } from "@/lib/format";

export type PipeStats = {
  orders_total: number; items_total: number; customers_raw: number; customers_unified: number;
  multi_channel: number; last_event: string | null; orders_today: number; orders_7d: number;
  sources: { channel: string; orders: number }[];
  dq_score: number | null; dq_checks: number; deadletter_pending: number; geo_pct: number | null;
};

/* ---------- tiny hooks ---------- */

function useReducedMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    const m = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduce(m.matches);
    const fn = (e: MediaQueryListEvent) => setReduce(e.matches);
    m.addEventListener("change", fn);
    return () => m.removeEventListener("change", fn);
  }, []);
  return reduce;
}

function useCountUp(target: number, ms = 1100) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(0);
  useEffect(() => {
    if (reduce) { setV(target); return; }
    let raf = 0;
    const t0 = performance.now();
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, ms, reduce]);
  return v;
}

function Reveal({ children, className = "", style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.classList.add("pipe-hidden");
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { el.classList.remove("pipe-hidden"); el.classList.add("pipe-in"); io.disconnect(); }
    }, { threshold: 0.18 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={className} style={style}>{children}</div>;
}

function ago(iso: string | null, now: number): string {
  if (!iso) return "—";
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
}

/* ---------- hero flow: sources converge into the hub, then flow to the dashboard ---------- */

const CH_VIZ: Record<string, string> = {
  Tokopedia: "var(--viz-blue)", Shopee: "var(--viz-orange)",
  Shopify: "var(--viz-violet)", "TikTok Shop": "var(--viz-magenta)",
};

function HeroFlow({ animate }: { animate: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const sources = ["Tokopedia", "Shopify", "Shopee", "TikTok Shop"];
  const ys = [36, 92, 148, 204];
  const trunk = `tr${uid}`;
  return (
    <svg viewBox="0 0 760 240" className="w-full" role="img"
      aria-label="Orders flow from Tokopedia, Shopify, Shopee and TikTok Shop into Jubelio, pass the security gates into Supabase, and land on the dashboard">
      <defs>
        <path id={trunk} d="M320,120 L720,120" />
        {sources.map((s, i) => <path key={s} id={`s${i}${uid}`} d={`M96,${ys[i]} C200,${ys[i]} 230,120 316,120`} />)}
      </defs>
      {/* source branches */}
      {sources.map((s, i) => (
        <g key={s}>
          <use href={`#s${i}${uid}`} fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 4" />
          <circle cx="88" cy={ys[i]} r="5" fill={CH_VIZ[s] ?? "var(--brand)"} />
          <text x="78" y={ys[i] + 3.5} textAnchor="end" fontSize="11" fontWeight="600" fill="var(--ink)">{s}</text>
          {/* negative begin = animation already in flight → no pre-start ghost dot at (0,0) */}
          {animate && [0, 1].map((k) => (
            <circle key={k} r="3" fill={CH_VIZ[s] ?? "var(--brand)"}>
              <animateMotion dur="2.8s" begin={`${(-(i * 0.7 + k * 1.4)).toFixed(1)}s`} repeatCount="indefinite">
                <mpath href={`#s${i}${uid}`} />
              </animateMotion>
            </circle>
          ))}
        </g>
      ))}
      {/* trunk */}
      <use href={`#${trunk}`} fill="none" stroke="var(--line)" strokeWidth="1.5" strokeDasharray="3 4" />
      {animate && [0, 1, 2].map((k) => (
        <circle key={k} r="3" fill="var(--brand)">
          <animateMotion dur="3s" begin={`${-k}s`} repeatCount="indefinite"><mpath href={`#${trunk}`} /></animateMotion>
        </circle>
      ))}
      {/* stations on the trunk */}
      {[
        { x: 350, label: "JUBELIO", sub: "order hub" },
        { x: 470, label: "GATES", sub: "verify" },
        { x: 590, label: "SUPABASE", sub: "resolve + score" },
        { x: 706, label: "DASHBOARD", sub: "live" },
      ].map((st) => (
        <g key={st.label}>
          <rect x={st.x - 34} y={100} width="68" height="40" rx="9" fill="var(--surface)" stroke="var(--brand)" strokeOpacity="0.55" strokeWidth="1.2" />
          <text x={st.x} y={117} textAnchor="middle" fontSize="9.5" fontWeight="700" fill="var(--ink)" style={{ letterSpacing: "0.06em" }}>{st.label}</text>
          <text x={st.x} y={130} textAnchor="middle" fontSize="8" fill="var(--ink-soft)">{st.sub}</text>
        </g>
      ))}
    </svg>
  );
}

/* ---------- building blocks ---------- */

function Chip({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[0.66rem] font-semibold tnum"
      style={{ borderColor: "var(--line)", color: "var(--ink)" }}>
      {color && <i className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {children}
    </span>
  );
}

function Gate({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="flex gap-3 rounded-xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border" style={{ borderColor: "var(--brand)", color: "var(--brand)" }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-bold leading-tight">{title} <span className="font-mono text-[0.62rem] font-semibold" style={{ color: "var(--ink-soft)" }}>gate {n}</span></div>
        <div className="mt-1 text-xs leading-relaxed" style={{ color: "var(--ink-soft)" }}>{desc}</div>
      </div>
    </div>
  );
}

// One stage row: spine (node badge + line + flowing packet) on the left, card on the right.
function Stage({ n, title, kicker, children, last = false }:
  { n: string; title: string; kicker: string; children: ReactNode; last?: boolean }) {
  return (
    <div className="grid grid-cols-[52px_1fr] gap-4 sm:grid-cols-[72px_1fr] sm:gap-6">
      <div className="relative flex flex-col items-center">
        <div className="relative z-10 grid h-11 w-11 place-items-center rounded-full border font-mono text-xs font-bold tnum"
          style={{ borderColor: "var(--brand)", background: "var(--surface)", color: "var(--brand-ink)" }}>
          {n}
        </div>
        {!last && (
          <div className="relative w-0.5 flex-1 overflow-hidden" style={{ background: "var(--line)" }} aria-hidden>
            <span className="pipe-packet" />
            <span className="pipe-packet" style={{ animationDelay: "1.7s" }} />
          </div>
        )}
      </div>
      <Reveal className="pb-12">
        <div className="text-[0.66rem] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>{kicker}</div>
        <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">{title}</h2>
        <div className="mt-3">{children}</div>
      </Reveal>
    </div>
  );
}

function Beat({ label, every, dur, instant = false }: { label: string; every: string; dur: string; instant?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border p-3.5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <span className="pipe-ring relative grid h-9 w-9 shrink-0 place-items-center rounded-full" style={{ ["--ring-dur" as string]: dur }}>
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: instant ? "var(--good)" : "var(--brand)" }} />
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-bold leading-tight">{label}</div>
        <div className="font-mono text-[0.66rem] tnum" style={{ color: "var(--ink-soft)" }}>{every}</div>
      </div>
    </div>
  );
}

/* ---------- the page ---------- */

export default function PipelineStory({ initial }: { initial: PipeStats }) {
  const [stats, setStats] = useState<PipeStats>(initial);
  const [now, setNow] = useState<number>(() => Date.now());
  const reduce = useReducedMotion();

  // heartbeat: tick the clock every second, refresh stats every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    const p = setInterval(() => {
      fetch("/api/pipeline").then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d)).catch(() => {});
    }, 30000);
    return () => { clearInterval(t); clearInterval(p); };
  }, []);

  const cOrders = useCountUp(stats.orders_total);
  const cCust = useCountUp(stats.customers_unified);
  const cMulti = useCountUp(stats.multi_channel);
  const cToday = useCountUp(stats.orders_today, 700);

  const checks = [
    "Every order carries revenue", "No cross-source duplicates", "Aggregates match raw data",
    "Quantities derived from products", "Identity graph intact", "Clean customer names",
    "Valid phone shapes", "Dates in range", "Product counts in sync",
    "No stuck webhook events", "Unified totals reconcile",
  ];

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--ink)" }}>
      {/* top bar */}
      <div className="sticky top-0 z-30 border-b backdrop-blur-md" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--bg) 82%, transparent)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <a href="/" className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold transition-colors hover:bg-[var(--line-soft)]" style={{ color: "var(--ink-soft)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
            Dashboard
          </a>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[0.68rem] tnum" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--good)" }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--good)" }} />
              </span>
              LIVE · last order event {ago(stats.last_event, now)}
            </span>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-12 md:px-6 md:py-16">
        {/* hero */}
        <Reveal>
          <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand)" }}>
            ❦ Treelogy · Live data engine
          </div>
          <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight md:text-5xl" style={{ textWrap: "balance" }}>
            From four marketplaces to one truth — in real time.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed md:text-base" style={{ color: "var(--ink-soft)" }}>
            Every number on the dashboard is produced by an always-on pipeline: orders stream in the moment
            they happen, pass security gates, get matched to one real person, are quality-checked hourly,
            and land in your charts. This page shows exactly how — and proves it&apos;s running right now.
          </p>
        </Reveal>

        {/* live counters */}
        <Reveal className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            ["Orders unified", num(cOrders)],
            ["Real people resolved", num(cCust)],
            ["Cross-channel identities", num(cMulti)],
            ["Quality score", `${stats.dq_score ?? "—"}/100`],
          ].map(([l, v]) => (
            <div key={l} className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <div className="font-mono text-2xl font-bold tnum md:text-3xl">{v}</div>
              <div className="mt-1 text-[0.68rem] font-semibold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{l}</div>
            </div>
          ))}
        </Reveal>

        {/* hero flow */}
        <Reveal className="mt-10 rounded-2xl border p-4 md:p-6" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <HeroFlow animate={!reduce} />
        </Reveal>

        {/* stages */}
        <div className="mt-16">
          <Stage n="01" kicker="Where orders are born" title="Four marketplaces, one stream">
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Customers buy on four channels. History back to Feb 2025 was backfilled once
              (CSV exports + a Shopify GraphQL bulk export); everything since arrives on its own.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {stats.sources.map((s) => (
                <Chip key={s.channel} color={CH_VIZ[s.channel] ?? "var(--brand)"}>{s.channel} · {num(s.orders)} orders</Chip>
              ))}
            </div>
          </Stage>

          <Stage n="02" kicker="The hub" title="Jubelio fires a webhook on every order event">
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              All marketplaces sync into Jubelio (the order-management hub). The moment any sales order
              changes — created, paid, shipped, completed — Jubelio pushes the full order to our Supabase
              edge function. Not polling, not nightly batches: <b style={{ color: "var(--ink)" }}>push, within seconds</b>.
              The same event is also forwarded downstream to the legacy integration, so nothing broke when we moved in.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>event · update-salesorder</Chip>
              <Chip>latency · seconds</Chip>
              <Chip>ack ~0.3s, forward async</Chip>
            </div>
          </Stage>

          <Stage n="03" kicker="Trust, but verify" title="Four gates between the internet and the database">
            <div className="grid gap-2.5 md:grid-cols-2">
              <Gate n={1} title="Secret URL key" desc="Requests without the ?k= shared secret are rejected with 401 before anything runs." />
              <Gate n={2} title="HMAC signature" desc="SHA-256 of the raw body against the webhook secret — verified and logged for every delivery." />
              <Gate n={3} title="Idempotent, ordered writes" desc="The ingest RPC takes per-order advisory locks and applies a latest-wins guard, so duplicate or out-of-order events can never overwrite newer data." />
              <Gate n={4} title="Dead-letter + auto-replay" desc="If a burst overwhelms a downstream call, the event is stored and a cron replays it every 5 minutes with the exact original payload. Zero events lost." />
            </div>
            <div className="mt-3 font-mono text-[0.68rem] tnum" style={{ color: "var(--ink-soft)" }}>
              stuck in dead-letter right now: <b style={{ color: stats.deadletter_pending ? "var(--accent)" : "var(--good)" }}>{stats.deadletter_pending}</b>
            </div>
          </Stage>

          <Stage n="04" kicker="The algorithm" title="Turning masked buyers into real people">
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              Marketplaces mask names and phones (<span className="font-mono text-xs">i** L***a</span>), so the same person looks
              like three customers. An identity-resolution engine merges them:
            </p>
            <ul className="mt-3 flex max-w-2xl flex-col gap-2 text-sm" style={{ color: "var(--ink-soft)" }}>
              <li className="flex gap-2"><span style={{ color: "var(--brand)" }}>▸</span><span><b style={{ color: "var(--ink)" }}>Instant:</b> exact e-mail match merges at insert time, inside the webhook transaction.</span></li>
              <li className="flex gap-2"><span style={{ color: "var(--brand)" }}>▸</span><span><b style={{ color: "var(--ink)" }}>Every 5 min:</b> a resolver scores candidates — phone + name similarity, fuzzy address matching (trigram similarity ≥ 0.5 with house-number anchors), and mask-pattern regex that proves <span className="font-mono text-xs">i** L***a</span> fits <i>Intan Lestari</i>.</span></li>
              <li className="flex gap-2"><span style={{ color: "var(--brand)" }}>▸</span><span><b style={{ color: "var(--ink)" }}>Hourly:</b> the Shopify customer master syncs in and backfills missing phone numbers by e-mail.</span></li>
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>{num(stats.customers_raw)} raw profiles</Chip>
              <Chip>→ {num(stats.customers_unified)} real people</Chip>
              <Chip color="var(--brand)">{num(stats.multi_channel)} shop on 2+ channels</Chip>
            </div>
          </Stage>

          <Stage n="05" kicker="Self-healing" title="Eleven quality checks, every hour">
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              A data-quality engine scores the whole warehouse hourly and <b style={{ color: "var(--ink)" }}>repairs what it can by itself</b> —
              backfilling missing revenue from per-product median prices, resyncing aggregates, normalizing names.
              A Telegram watchdog reports anomalies every 15 minutes.
            </p>
            <div className="mt-3 grid max-w-2xl grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {checks.map((c, i) => (
                <div key={c} className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-soft)", animation: `pipe-pop .4s ease-out both`, animationDelay: `${i * 70}ms` }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--good)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
                  {c}
                </div>
              ))}
            </div>
            <div className="mt-3 font-mono text-[0.68rem] tnum" style={{ color: "var(--ink-soft)" }}>
              current score: <b style={{ color: "var(--good)" }}>{stats.dq_score ?? "—"}/100</b> across {stats.dq_checks} checks
            </div>
          </Stage>

          <Stage n="06" kicker="From rows to answers" title="One query builds the whole dashboard" last>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              A single Postgres function computes everything you see — KPIs, monthly trends per channel,
              cohort retention, deterministic RFM customer groups, product Pareto, basket affinity, geography —
              from one filtered base, so every chart always agrees with every other. Next.js caches each
              filter combination for 5 minutes; the charts themselves are hand-rolled SVG, no chart library.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Chip>dash_payload() · one round-trip</Chip>
              <Chip>RFM ntile · tie-broken = deterministic</Chip>
              <Chip>cache · 5 min per filter combo</Chip>
            </div>
            <a href="/" className="mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition-opacity hover:opacity-85"
              style={{ background: "var(--brand)", color: "#fff" }}>
              Open the live dashboard
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="M12 5l7 7-7 7" /></svg>
            </a>
          </Stage>
        </div>

        {/* heartbeat */}
        <Reveal className="mt-6">
          <div className="text-[0.66rem] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>The heartbeat</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">Six clocks keep it alive</h2>
          <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            <Beat label="Order webhook" every="instant · event-driven" dur="1.6s" instant />
            <Beat label="Dead-letter replay" every="every 5 min" dur="2.4s" />
            <Beat label="Identity resolver" every="every 5 min" dur="2.4s" />
            <Beat label="Telegram watchdog" every="every 15 min" dur="3.2s" />
            <Beat label="Data-quality engine" every="hourly" dur="4.2s" />
            <Beat label="Shopify contact sync" every="hourly" dur="4.2s" />
          </div>
        </Reveal>

        {/* tech stack */}
        <Reveal className="mt-14">
          <div className="text-[0.66rem] font-bold uppercase tracking-widest" style={{ color: "var(--brand)" }}>Under the hood</div>
          <h2 className="mt-1 text-xl font-bold tracking-tight md:text-2xl">The stack</h2>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              ["Frontend", ["Next.js 16 · App Router", "React 19 Server Components", "Tailwind CSS", "Hand-rolled SVG charts", "Vercel"]],
              ["Data platform", ["Supabase Postgres", "PostgREST RPC", "Edge Functions (Deno)", "pg_trgm fuzzy matching", "SECURITY DEFINER + service-role-only ACL"]],
              ["Automation", ["Jubelio webhook (push)", "pg_cron schedules", "Shopify Admin GraphQL sync", "Telegram Bot alerts", "Idempotent ingest + advisory locks"]],
            ].map(([group, items]) => (
              <div key={group as string} className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
                <div className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>{group}</div>
                <ul className="mt-2.5 flex flex-col gap-1.5">
                  {(items as string[]).map((it) => (
                    <li key={it} className="flex items-center gap-2 font-mono text-xs" style={{ color: "var(--ink)" }}>
                      <i className="h-1 w-3 rounded-full" style={{ background: "var(--brand)", opacity: 0.7 }} />{it}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Reveal>

        {/* live footer */}
        <Reveal className="mt-14 rounded-2xl border p-6 text-center md:p-10" style={{ borderColor: "var(--brand)", background: "var(--brand-wash)" }}>
          <div className="flex items-center justify-center gap-2 text-[0.66rem] font-bold uppercase tracking-widest" style={{ color: "var(--brand-ink)" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--brand)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />
            </span>
            Still running — right now
          </div>
          <div className="mt-3 text-2xl font-bold tracking-tight md:text-3xl" style={{ color: "var(--brand-ink)" }}>
            <span className="font-mono tnum">{num(cToday)}</span> orders ingested today ·
            last event <span className="font-mono tnum">{ago(stats.last_event, now)}</span>
          </div>
          <p className="mx-auto mt-2 max-w-xl text-sm" style={{ color: "var(--ink-soft)" }}>
            This page re-checks the pipeline every 30 seconds. Leave it open and watch the numbers move.
          </p>
        </Reveal>
      </div>
    </main>
  );
}

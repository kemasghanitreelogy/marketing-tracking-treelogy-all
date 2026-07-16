# Workflow — "How this data works" Pipeline Story Page

**Goal:** header button beside the Data Quality chip → `/how-it-works`: an animated,
interactive story of the data pipeline from zero → real-time, showing sync methods,
security gates, algorithms, tech stack — and live proof the pipeline is running now.

## Research decisions

- **Visualization tech (deep-researched):** hand-crafted SVG + SMIL `<animateMotion>`
  packets + CSS keyframes + IntersectionObserver reveals. React Flow/xyflow rejected:
  it's a node-*editor* canvas (pan/zoom chrome, ~45kB) and its animated dashed edges
  are a known perf bottleneck (Liam ERD replaced them with custom SVG). GSAP/Motion
  rejected: choreography here is simple enough for native tech at 0kB added. SMIL runs
  off the React render loop entirely.
- **Design (ui-ux-pro-max):** keep brand editorial system (moringa green, Fira),
  borrow "technical HUD" flavor for dark mode (soft glow, mono labels, hairline grid) —
  NOT full cyberpunk (fails light-mode + a11y). Animate few key elements per view;
  every animation dies under `prefers-reduced-motion` (SMIL packets gated via
  matchMedia since the global CSS kill doesn't stop SMIL).
- **Live proof:** RPC `pipeline_stats()` (orders total/today, last webhook event age,
  unified customers, DQ score, per-source split) → server-rendered, then client polls
  `/api/pipeline` every 30s; "last event Xs ago" ticks every second.

## Page structure

1. Top bar: ← back, LIVE chip w/ ticking event age.
2. Hero: headline + animated count-up stats + mini flowing pipeline.
3. Main animated flow (centerpiece, vertical spine w/ traveling packets):
   01 Sources (Shopee/Tokopedia/TikTok/Shopify + CSV backfill) → 02 Jubelio hub
   (webhook on EVERY status change) → 03 Security gates (URL key, HMAC, idempotent
   RPC, advisory locks latest-wins, dead-letter auto-replay) → 04 Identity resolution
   (email inline merge; resolver cron: phone/fuzzy-address pg_trgm/mask-pattern;
   Shopify master enrichment) → 05 Data-quality engine (11 checks hourly + autofix)
   → 06 Analytics (dash_payload: filtered base CTE, deterministic RFM, cohorts,
   pareto, basket lift) → Dashboard CTA.
4. Heartbeat: webhook (instant) + 5 cron cadences, pulsing at relative speeds.
5. Tech stack strip (text chips, no fake logos).
6. Footer: "running right now" CTA back to dashboard.

## Phases

1. SQL: `pipeline_stats()` RPC (service_role-only, cheap aggregates).
2. API: `app/api/pipeline/route.ts` (no-store).
3. UI: `components/pipeline-story.tsx` (client) + `app/how-it-works/page.tsx` (server).
4. Header button in `app/page.tsx` beside DQ chip.
5. Build → local visual verify (light+dark, reduced-motion) → deploy → prod check.

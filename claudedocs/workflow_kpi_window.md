# Workflow — Configurable KPI Comparison Window

**Goal:** the KPI cards ("Last 30 Days Performance", "vs previous 30 days") get a
selectable window: **7D / 14D / 30D / 60D / 90D**. Current window vs the previous
window of equal length, anchored on the last order date in the filtered view.

## Layout & positioning decision (ui-ux-pro-max + proximity principle)

- The control scopes ONLY the KPI cards → it lives **on the KPI section header row**,
  right-aligned, NOT in the global filter bar (which scopes every chart). Placing it
  globally would wrongly imply it filters the whole dashboard.
- Form: **joined segmented control** (one bordered pill container, divided buttons) —
  visually distinct from the global filter's standalone chips: reads as "view switch",
  not "data filter". Active segment = brand wash; `aria-pressed`; keyboard focusable;
  ≥44px-wide touch targets via padding; `useTransition` so cards don't flash.
- Card sublabel becomes "vs previous N days"; section heading becomes
  "Last N Days Performance".

## Phases

1. **SQL** — migration `dash_payload_kpi_window`: add `p_kpi_days integer DEFAULT 30`
   to `dash_payload`. Signature change → DROP old 3-arg function first (two overloads
   would make PostgREST ambiguous), transform body via exact-substring replaces with
   anchor guards (only the `kpi` + `newc` CTE windows change: `-30` → `-p_kpi_days`,
   `-60` → `-2*p_kpi_days`; the other `-30`s — channel driver, stalled, anomaly —
   stay fixed at 30d because Automated Insights remain a 30-day briefing). Re-apply
   the function ACL (drop loses it; default would grant EXECUTE to public).
2. **Selector component** — `components/kpi-window.tsx` (client): segmented control
   writing `?win=` via `router.replace` inside `useTransition`, preserving `ch/from/to`.
3. **Wiring** — `app/page.tsx`: whitelist-parse `win`, pass `p_kpi_days` (only when
   ≠ 30 → canonical cache keys), dynamic heading, `days` prop through `DeltaKpi`
   (`components/cmo.tsx`).
4. **Validate** — RPC smoke test (7-day windows ≠ 30-day, aov math consistent),
   build, local render `?win=7`, deploy, prod check.

## Checkpoints

- [ ] Old 3-arg signature gone; 4-arg callable with & without `p_kpi_days`
- [ ] ACL identical to before (service_role-only)
- [ ] `?win=7` changes KPI numbers + labels; charts below unchanged
- [ ] Default view (no `win`) byte-identical behavior to today

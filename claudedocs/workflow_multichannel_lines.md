# Workflow — Multi-Channel Line Charts

**Goal:** when the channel filter has >1 channel selected, every monthly line chart
(Revenue Growth, Average Spend per Order) shows one line per selected channel in a
distinct color **plus** an "All channels" combined line. Single-channel / no filter
keeps the existing single-line `AreaTrend`.

## Findings (research phase)

- Charts are hand-rolled SVG (`components/charts.tsx`), no chart library.
- `dash_payload` RPC (Postgres, Supabase) returns ONE pre-aggregated `monthly[]`
  series — per-channel monthly data does not exist in the payload today.
- Filter state lives in the URL (`?ch=A,B`), server component re-renders,
  colors come from CSS vars in `app/globals.css` (light + dark themes).
- Channels are fixed (marketplace-only scope): Tokopedia, Shopee, Shopify, TikTok Shop.

## Design decisions

- **Color follows the entity** (dataviz rule): each channel keeps the same color in
  every filter combination. Palette validated with `validate_palette.js`
  (all checks PASS, light surface `#ffffff`, dark surface `#14180f`):

  | Series | Light | Dark |
  |---|---|---|
  | All channels (total) | `#2e8b4f` | `#47a161` |
  | Tokopedia | `#2a78d6` | `#3987e5` |
  | Shopee | `#eb6834` | `#d95926` |
  | Shopify | `#4a3aa7` | `#9085e9` |
  | TikTok Shop | `#d55181` | `#d55181` |

- "All" line: thicker + soft area fill (visual continuity with the single-line view);
  channel lines thinner, no fill (avoids mud).
- Interactive legend chips (2026 feel): hover → spotlight a series, click → toggle it,
  keyboard accessible, `aria-pressed`. Direct labels at line ends (ink text + colored
  end dot, collision-pushed). Tooltip lists every visible series at the hovered month,
  sorted by value. Line-draw entry animation, disabled under `prefers-reduced-motion`.
- Revenue gap month = 0 (truthful); AOV gap month = null → broken line segment.

## Phases

1. **SQL** — migration `dash_payload_monthly_by_channel`: add `monthly_ch` CTE
   (ym × platform → orders/gmv/aov over the filtered `base`) + `monthly_by_channel`
   key in the returned jsonb. Additive → safe for the currently deployed frontend.
2. **Theme** — add `--viz-*` CSS vars (light + dark) in `app/globals.css`.
3. **Component** — `MultiTrend` in `components/charts.tsx`: multi-series SVG line
   chart (shared y-scale, crosshair, multi-row tooltip, legend, end labels, animation).
4. **Wiring** — `app/page.tsx`: extend `Payload` type, build series when
   `channelsSel.length > 1`, render `MultiTrend` for the two monthly charts, update
   the stale-cache guard (`!p?.monthly_by_channel`).
5. **Cache** — bump `PAYLOAD_V` in `lib/supabase.ts` ("3" → "4").
6. **Validate** — RPC smoke test (payload contains the new key, per-channel sums equal
   the combined series), `npm run build`, visual sanity.

## Checkpoints

- [ ] RPC returns `monthly_by_channel`; sum(channel gmv) per month == monthly gmv
- [ ] Palette validator PASS both modes (done, above)
- [ ] Build passes; single-channel view unchanged

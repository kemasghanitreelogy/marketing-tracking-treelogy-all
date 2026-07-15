// Per-section insight engine. Pure, deterministic analytics computed on the SAME
// filtered payload each chart renders — so every statement is exactly consistent
// with what the user sees. Techniques: least-squares trend, momentum windows,
// coefficient of variation, HHI concentration, cohort decay, daypart splits.
import { num, idr, monthLabel } from "./format";

export type InsightPt = { tone: "good" | "warn" | "info"; text: string };

type Monthly = { ym: string; orders: number; units: number; gmv: string; aov: string; new_customers: number; returning_customers: number };
type Chan = { channel: string; orders: number; units: number; gmv: string; aov: string; customers: number; gmv_share: number };
type CohortRow = { cohort: string; months_since: number; retention_pct: number; retained: number; cohort_size: number };
type Geo = { province: string; orders: number; gmv: string; customers: number; gmv_share: number };
type TimeCell = { dow: number; hr: number; orders: number; gmv: string };
type SeasonCell = { product_name: string; ym: string; units: number };
type Seg = { segment: string; customers: number; gmv: string; gmv_share: number; avg_orders: number; avg_recency_days: number };
type ParetoRow = { product_name: string; gmv: string; units: number; cum_gmv_pct: number };
type Ltv = { first_channel: string; customers: number; avg_ltv: string; median_ltv: string; avg_orders: number };
type Aff = { p1: string; p2: string; together: number; lift: number };
type TopCust = { name: string; channels: string[]; orders: number; revenue: string };

const pct = (v: number) => `${v >= 0 ? "+" : ""}${Math.round(v)}%`;

function slopePct(vals: number[]): number | null {
  const n = vals.length;
  if (n < 3) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / n;
  if (!mean) return null;
  const mx = (n - 1) / 2;
  let cov = 0, varx = 0;
  vals.forEach((v, i) => { cov += (i - mx) * (v - mean); varx += (i - mx) ** 2; });
  return ((cov / varx) / mean) * 100; // % of mean per month
}
function cv(vals: number[]): number | null {
  const n = vals.length;
  if (n < 3) return null;
  const mean = vals.reduce((s, v) => s + v, 0) / n;
  if (!mean) return null;
  const sd = Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
  return (sd / mean) * 100;
}

// GMV Growth — the last month is month-to-date, so trend math uses full months only.
export function trendInsights(monthly: Monthly[], rr: { projected_gmv: string; prev_month_gmv: string } | null): InsightPt[] {
  const out: InsightPt[] = [];
  const full = monthly.slice(0, -1);
  const g = full.map((m) => Number(m.gmv));
  const sl = slopePct(g);
  if (sl !== null) out.push({
    tone: sl < -3 ? "warn" : sl > 3 ? "good" : "info",
    text: `Underlying trend: GMV ${sl >= 0 ? "growing" : "declining"} ~${Math.abs(Math.round(sl))}%/month across ${full.length} full months (least-squares fit).`,
  });
  if (g.length >= 6) {
    const a3 = g.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const p3 = g.slice(-6, -3).reduce((s, v) => s + v, 0) / 3;
    if (p3 > 0) {
      const mom = ((a3 - p3) / p3) * 100;
      out.push({ tone: mom < -10 ? "warn" : mom > 10 ? "good" : "info", text: `Momentum: last 3 full months average ${idr(a3)}/mo, ${pct(mom)} vs the prior 3 months.` });
    }
  }
  if (full.length) {
    const best = full.reduce((a, b) => (Number(a.gmv) >= Number(b.gmv) ? a : b));
    out.push({ tone: "info", text: `Best month: ${monthLabel(best.ym)} at ${idr(best.gmv)} (${num(best.orders)} orders) — study what drove it (promo/campaign) and repeat it.` });
  }
  const vol = cv(g);
  if (vol !== null) out.push({
    tone: vol > 35 ? "warn" : "good",
    text: vol > 35 ? `Revenue is volatile (±${Math.round(vol)}% month-to-month) — likely promo-driven spikes; consider always-on acquisition to smooth the base.`
      : `Revenue base is stable (±${Math.round(vol)}% month-to-month variation).`,
  });
  if (rr && Number(rr.prev_month_gmv) > 0) {
    const d = ((Number(rr.projected_gmv) - Number(rr.prev_month_gmv)) / Number(rr.prev_month_gmv)) * 100;
    out.push({ tone: d < -10 ? "warn" : d > 0 ? "good" : "info", text: `Run-rate: this month projects to ${idr(rr.projected_gmv)}, ${pct(d)} vs last month — ${d < 0 ? "act now (mid-month push) to close the gap" : "on pace to beat last month"}.` });
  }
  return out;
}

export function channelInsights(rows: Chan[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const hhi = rows.reduce((s, r) => s + Number(r.gmv_share) ** 2, 0);
  const lead = rows[0];
  out.push({
    tone: hhi > 5000 ? "warn" : "info",
    text: hhi > 5000
      ? `Revenue concentration is high (HHI ${num(Math.round(hhi))}): ${lead.channel} alone is ${lead.gmv_share}% of GMV — a policy/algorithm change there hits most of your revenue.`
      : `Revenue is reasonably diversified (HHI ${num(Math.round(hhi))}); leader ${lead.channel} holds ${lead.gmv_share}%.`,
  });
  if (rows.length > 1) {
    const byAov = [...rows].sort((a, b) => Number(b.aov) - Number(a.aov));
    const hi = byAov[0], lo = byAov[byAov.length - 1];
    const gap = ((Number(hi.aov) - Number(lo.aov)) / Number(lo.aov)) * 100;
    if (gap >= 15) out.push({ tone: "good", text: `${hi.channel} carries the richest basket: AOV ${idr(hi.aov)} (${pct(gap)} vs ${lo.channel}) — prioritize it for bundles & premium SKUs.` });
    const byInt = [...rows].filter((r) => r.customers >= 20).sort((a, b) => b.orders / b.customers - a.orders / a.customers);
    if (byInt.length) {
      const t = byInt[0];
      out.push({ tone: "info", text: `Highest repeat intensity: ${t.channel} at ${(t.orders / t.customers).toFixed(2)} orders/customer — its buyers come back most often.` });
    }
  }
  return out;
}

export function acqInsights(monthly: Monthly[]): InsightPt[] {
  const out: InsightPt[] = [];
  const full = monthly.slice(0, -1);
  if (full.length < 4) return out;
  const share = (m: Monthly) => m.new_customers / Math.max(1, m.new_customers + m.returning_customers);
  const latest = full[full.length - 1];
  const avg6 = full.slice(-7, -1).reduce((s, m) => s + share(m), 0) / Math.min(6, full.length - 1);
  const d = (share(latest) - avg6) * 100;
  out.push({
    tone: "info",
    text: `Mix is shifting toward ${d >= 0 ? "acquisition" : "retention"}: ${Math.round(share(latest) * 100)}% of ${monthLabel(latest.ym)} actives were new vs ${Math.round(avg6 * 100)}% 6-month average.`,
  });
  const ret = full.map((m) => m.returning_customers);
  const rs = slopePct(ret.slice(-6));
  if (rs !== null) out.push({
    tone: rs > 2 ? "good" : rs < -2 ? "warn" : "info",
    text: `Returning-customer base is ${rs > 2 ? "compounding" : rs < -2 ? "shrinking" : "flat"} (~${pct(rs)}/month over the last 6 full months) — ${rs < -2 ? "retention leak; fix win-back before buying more traffic" : "repeat revenue engine"}.`,
  });
  const peak = full.reduce((a, b) => (a.new_customers >= b.new_customers ? a : b));
  out.push({ tone: "info", text: `Acquisition peak: ${monthLabel(peak.ym)} brought ${num(peak.new_customers)} new customers — align next launch/promo with what ran then.` });
  return out;
}

export function aovInsights(monthly: Monthly[]): InsightPt[] {
  const out: InsightPt[] = [];
  const full = monthly.slice(0, -1);
  if (full.length < 3) return out;
  const a = full.map((m) => Number(m.aov));
  const latest = a[a.length - 1];
  const avg = a.reduce((s, v) => s + v, 0) / a.length;
  const d = ((latest - avg) / avg) * 100;
  out.push({ tone: d < -8 ? "warn" : d > 8 ? "good" : "info", text: `Latest full month AOV ${idr(latest)} is ${pct(d)} vs the period average ${idr(avg)}.` });
  const sl = slopePct(a);
  if (sl !== null) out.push({
    tone: sl < -1.5 ? "warn" : sl > 1.5 ? "good" : "info",
    text: sl < -1.5 ? `Basket size is eroding ~${Math.abs(sl).toFixed(1)}%/month — discounts may be training smaller purchases; test bundles/free-shipping thresholds.`
      : sl > 1.5 ? `Basket size is compounding ~${sl.toFixed(1)}%/month — upsell motion is working.`
      : `Basket size is steady (${sl >= 0 ? "+" : ""}${sl.toFixed(1)}%/month) — GMV growth must come from orders, not order value.`,
  });
  const hiIdx = a.indexOf(Math.max(...a));
  out.push({ tone: "info", text: `Peak AOV: ${monthLabel(full[hiIdx].ym)} at ${idr(a[hiIdx])} — check which product mix/promo lifted baskets then.` });
  return out;
}

export function cohortInsights(rows: CohortRow[]): InsightPt[] {
  const out: InsightPt[] = [];
  const m1 = rows.filter((r) => r.months_since === 1 && r.cohort_size >= 50);
  if (!m1.length) return out;
  const avgM1 = m1.reduce((s, r) => s + Number(r.retention_pct), 0) / m1.length;
  out.push({ tone: avgM1 >= 10 ? "good" : "warn", text: `Average month-1 retention: ${avgM1.toFixed(1)}% of a cohort orders again within a month (cohorts ≥50 customers).` });
  const best = m1.reduce((a, b) => (Number(a.retention_pct) >= Number(b.retention_pct) ? a : b));
  out.push({ tone: "info", text: `Best cohort: ${monthLabel(best.cohort)} kept ${best.retention_pct}% at M1 (${num(best.retained)} of ${num(best.cohort_size)}) — what acquisition source/offer built it?` });
  const latest = m1[m1.length - 1];
  const dl = Number(latest.retention_pct) - avgM1;
  out.push({
    tone: dl >= 1 ? "good" : dl <= -2 ? "warn" : "info",
    text: `Newest measurable cohort (${monthLabel(latest.cohort)}) retains ${latest.retention_pct}% at M1 — ${dl >= 1 ? "above" : dl <= -2 ? "below" : "in line with"} the ${avgM1.toFixed(1)}% average${dl <= -2 ? "; recent buyers are churning faster" : ""}.`,
  });
  const m3 = rows.filter((r) => r.months_since === 3 && r.cohort_size >= 50);
  if (m3.length) {
    const avgM3 = m3.reduce((s, r) => s + Number(r.retention_pct), 0) / m3.length;
    out.push({ tone: "info", text: `Decay: M1 ${avgM1.toFixed(1)}% → M3 ${avgM3.toFixed(1)}% — ${(100 * (1 - avgM3 / Math.max(0.1, avgM1))).toFixed(0)}% of early repeaters are lost by month 3; a day-60–75 touchpoint targets exactly this cliff.` });
  }
  return out;
}

export function geoInsights(rows: Geo[], unknownShare: number): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const top3 = rows.slice(0, 3).reduce((s, r) => s + Number(r.gmv_share), 0);
  out.push({ tone: top3 > 60 ? "warn" : "info", text: `${rows.slice(0, 3).map((r) => r.province).join(" + ")} = ${top3.toFixed(1)}% of GMV — ${top3 > 60 ? "growth outside this core is untapped; consider geo-targeted ads + shipping subsidies elsewhere" : "healthy geographic spread"}.` });
  const cand = rows.slice(0, 8).filter((r) => r.customers >= 30);
  if (cand.length > 1) {
    const dens = cand.map((r) => ({ p: r.province, v: Number(r.gmv) / r.customers }));
    const hi = dens.reduce((a, b) => (a.v >= b.v ? a : b));
    const all = rows.reduce((s, r) => s + Number(r.gmv), 0) / Math.max(1, rows.reduce((s, r) => s + r.customers, 0));
    out.push({ tone: "good", text: `Highest customer value: ${hi.p} at ${idr(hi.v)}/customer (${pct(((hi.v - all) / all) * 100)} vs overall) — premium audience worth dedicated targeting.` });
  }
  if (unknownShare > 2) out.push({ tone: "warn", text: `${unknownShare}% of GMV has no mappable province — geo numbers are floors, not exact.` });
  return out;
}

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function timeInsights(cells: TimeCell[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!cells.length) return out;
  const total = cells.reduce((s, c) => s + c.orders, 0);
  const peak = cells.reduce((a, b) => (a.orders >= b.orders ? a : b));
  const top3 = [...cells].sort((a, b) => b.orders - a.orders).slice(0, 3);
  out.push({ tone: "good", text: `Peak slot: ${DAYS[peak.dow]} ${String(peak.hr).padStart(2, "0")}:00 WIB (${num(peak.orders)} orders). Top-3 slots (${top3.map((c) => `${DAYS[c.dow]} ${String(c.hr).padStart(2, "0")}:00`).join(", ")}) hold ${((top3.reduce((s, c) => s + c.orders, 0) / total) * 100).toFixed(1)}% of orders — schedule flash sales & ad boosts there.` });
  const wd = cells.filter((c) => c.dow <= 5).reduce((s, c) => s + c.orders, 0) / 5;
  const we = cells.filter((c) => c.dow >= 6).reduce((s, c) => s + c.orders, 0) / 2;
  const d = ((we - wd) / wd) * 100;
  out.push({ tone: "info", text: `Weekend days average ${pct(d)} orders vs weekdays — ${d > 10 ? "weekend-weighted ad budgets pay off" : d < -10 ? "your buyers shop on workdays; keep budgets weekday-weighted" : "demand is even across the week"}.` });
  const parts: [string, number, number][] = [["morning (06–12)", 6, 12], ["afternoon (12–18)", 12, 18], ["evening (18–24)", 18, 24], ["night (00–06)", 0, 6]];
  const ps = parts.map(([name, a, b]) => ({ name, v: cells.filter((c) => c.hr >= a && c.hr < b).reduce((s, c) => s + c.orders, 0) }));
  const lead = ps.reduce((a, b) => (a.v >= b.v ? a : b));
  out.push({ tone: "info", text: `${lead.name} is your prime window with ${((lead.v / total) * 100).toFixed(0)}% of orders — time launches, broadcasts and livestreams inside it.` });
  return out;
}

export function seasonInsights(cells: SeasonCell[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!cells.length) return out;
  const yms = [...new Set(cells.map((c) => c.ym))].sort();
  if (yms.length < 3) return out;
  const latestFull = yms[yms.length - 2]; // last month is MTD
  const byProd = new Map<string, SeasonCell[]>();
  cells.forEach((c) => { const l = byProd.get(c.product_name) ?? []; l.push(c); byProd.set(c.product_name, l); });
  const fading: string[] = [], peaking: string[] = [];
  byProd.forEach((rows, name) => {
    const peak = Math.max(...rows.map((r) => r.units));
    if (peak < 20) return;
    const lf = rows.find((r) => r.ym === latestFull)?.units ?? 0;
    if (lf < peak * 0.4) fading.push(name);
    else if (lf >= peak * 0.9) peaking.push(name);
  });
  if (peaking.length) out.push({ tone: "good", text: `At/near their all-time pace in ${monthLabel(latestFull)}: ${peaking.slice(0, 3).join(", ")} — secure stock; don't stock out on a peak.` });
  if (fading.length) out.push({ tone: "warn", text: `Running well below their peak: ${fading.slice(0, 3).join(", ")} (<40% of best month) — check stock, listing visibility, or refresh creatives.` });
  const totals = new Map<string, number>();
  cells.forEach((c) => totals.set(c.ym, (totals.get(c.ym) ?? 0) + c.units));
  const best = [...totals.entries()].filter(([ym]) => ym !== yms[yms.length - 1]).reduce((a, b) => (a[1] >= b[1] ? a : b));
  out.push({ tone: "info", text: `Seasonal high across the catalog: ${monthLabel(best[0])} (${num(best[1])} units) — plan inventory & campaign calendar around this month.` });
  return out;
}

export function segmentInsights(rows: Seg[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const g = (n: string) => rows.find((r) => r.segment === n);
  const totalG = rows.reduce((s, r) => s + Number(r.gmv), 0);
  const core = (Number(g("Champions")?.gmv ?? 0) + Number(g("Loyal")?.gmv ?? 0)) / Math.max(1, totalG) * 100;
  out.push({ tone: core > 45 ? "good" : "info", text: `Champions + Loyal generate ${core.toFixed(1)}% of GMV — this is the revenue to protect first (service, stock priority, loyalty perks).` });
  const ar = g("At Risk (high value)");
  if (ar) out.push({ tone: "warn", text: `${idr(ar.gmv)} of proven spend sits in At Risk (${num(ar.customers)} lapsed frequent buyers, quiet for ~${num(ar.avg_recency_days)} days) — highest-ROI reactivation target; export the list and run outreach.` });
  const np = g("New / Promising");
  if (np) out.push({ tone: "info", text: `${num(np.customers)} New/Promising customers are in the habit window — a second-order nudge here compounds into future Loyal revenue.` });
  const dormant = (g("Hibernating")?.customers ?? 0) + (g("Needs Attention")?.customers ?? 0);
  const totalC = rows.reduce((s, r) => s + r.customers, 0);
  if (dormant) out.push({ tone: "info", text: `${num(dormant)} customers (${((dormant / totalC) * 100).toFixed(0)}% of the base) are drifting dormant — cheap broadcast reactivation before they're fully cold.` });
  return out;
}

export function paretoInsights(rows: ParetoRow[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const n80 = rows.findIndex((r) => Number(r.cum_gmv_pct) >= 80) + 1 || rows.length;
  out.push({ tone: n80 <= 3 ? "warn" : "info", text: `${n80} product${n80 > 1 ? "s" : ""} deliver 80% of GMV — ${n80 <= 3 ? "a stockout in any of them is a revenue incident; buffer inventory & diversify" : "healthy product spread"}.` });
  out.push({ tone: "info", text: `Hero SKU: ${rows[0].product_name} at ${rows[0].cum_gmv_pct}% of GMV (${num(rows[0].units)} units) — every 1% conversion lift here moves total revenue most.` });
  const tail = rows.filter((r) => Number(r.cum_gmv_pct) > 95).length;
  if (tail >= 3) out.push({ tone: "info", text: `${tail} tail products add <5% of GMV combined — candidates for bundling with heroes instead of standalone ad spend.` });
  return out;
}

export function ltvInsights(rows: Ltv[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (rows.length < 1) return out;
  const best = rows[0], worst = rows[rows.length - 1];
  if (rows.length > 1) {
    const ratio = Number(best.avg_ltv) / Math.max(1, Number(worst.avg_ltv));
    out.push({ tone: "good", text: `A customer acquired on ${best.first_channel} is worth ${ratio.toFixed(1)}× one from ${worst.first_channel} (${idr(best.avg_ltv)} vs ${idr(worst.avg_ltv)} lifetime) — CAC targets should differ by the same ratio.` });
  }
  const skew = Number(best.median_ltv) / Math.max(1, Number(best.avg_ltv));
  if (skew < 0.6) out.push({ tone: "info", text: `${best.first_channel} LTV is whale-skewed (median ${idr(best.median_ltv)} vs avg ${idr(best.avg_ltv)}) — a few big buyers carry it; protect them personally.` });
  const freq = [...rows].sort((a, b) => b.avg_orders - a.avg_orders)[0];
  out.push({ tone: "info", text: `${freq.first_channel} buyers repeat most (${freq.avg_orders}× orders on average) — its audience matches your product's habit loop.` });
  return out;
}

export function affinityInsights(rows: Aff[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const byLift = [...rows].sort((a, b) => b.lift - a.lift)[0];
  if (byLift.lift >= 1.5) out.push({ tone: "good", text: `${byLift.p1} + ${byLift.p2} co-occur ${byLift.lift}× more than chance — strongest bundle candidate; price it slightly under buying separately.` });
  const byVol = rows[0];
  if (byVol !== byLift) out.push({ tone: "info", text: `Highest-volume pairing: ${byVol.p1} + ${byVol.p2} (${num(byVol.together)} orders together) — natural cross-sell at checkout.` });
  out.push({ tone: "info", text: `Wire these pairs into "frequently bought together" on product pages & post-purchase upsells — the demand already exists.` });
  return out;
}

export function topCustInsights(rows: TopCust[], totalGmv: number): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const sum = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const share = (sum / Math.max(1, totalGmv)) * 100;
  out.push({ tone: share > 15 ? "warn" : "info", text: `Top ${rows.length} customers = ${idr(sum)} (${share.toFixed(1)}% of GMV) — ${share > 15 ? "meaningful key-account risk; assign personal care" : "no single-buyer dependence"}.` });
  const multi = rows.filter((r) => (r.channels ?? []).length > 1).length;
  out.push({ tone: "info", text: `${multi} of ${rows.length} shop on multiple channels — your best buyers follow the brand, not the platform; CRM them directly (WA/email).` });
  const avgOrd = rows.reduce((s, r) => s + r.orders, 0) / rows.length;
  out.push({ tone: "info", text: `Average ${avgOrd.toFixed(1)} orders per top customer — a private "VIP restock" line (early access, bundle pricing) monetizes this loyalty further.` });
  return out;
}

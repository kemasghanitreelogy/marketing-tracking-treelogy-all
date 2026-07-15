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
    text: `Overall direction: sales are ${sl >= 0 ? "growing" : "shrinking"} about ${Math.abs(Math.round(sl))}% per month on average across ${full.length} full months.`,
  });
  if (g.length >= 6) {
    const a3 = g.slice(-3).reduce((s, v) => s + v, 0) / 3;
    const p3 = g.slice(-6, -3).reduce((s, v) => s + v, 0) / 3;
    if (p3 > 0) {
      const mom = ((a3 - p3) / p3) * 100;
      out.push({ tone: mom < -10 ? "warn" : mom > 10 ? "good" : "info", text: `Recent pace: the last 3 full months averaged ${idr(a3)}/month, ${pct(mom)} compared with the 3 months before.` });
    }
  }
  if (full.length) {
    const best = full.reduce((a, b) => (Number(a.gmv) >= Number(b.gmv) ? a : b));
    out.push({ tone: "info", text: `Best month so far: ${monthLabel(best.ym)} with ${idr(best.gmv)} (${num(best.orders)} orders) — look at what worked then (promo/campaign) and repeat it.` });
  }
  const vol = cv(g);
  if (vol !== null) out.push({
    tone: vol > 35 ? "warn" : "good",
    text: vol > 35 ? `Sales swing a lot from month to month (±${Math.round(vol)}%) — usually a sign of promo-driven spikes; steady always-on marketing would smooth this out.`
      : `Sales are steady from month to month (only ±${Math.round(vol)}% variation).`,
  });
  if (rr && Number(rr.prev_month_gmv) > 0) {
    const d = ((Number(rr.projected_gmv) - Number(rr.prev_month_gmv)) / Number(rr.prev_month_gmv)) * 100;
    out.push({ tone: d < -10 ? "warn" : d > 0 ? "good" : "info", text: `At the current pace, this month will end around ${idr(rr.projected_gmv)}, ${pct(d)} vs last month — ${d < 0 ? "a mid-month push now can still close the gap" : "on track to beat last month"}.` });
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
      ? `Most of your sales depend on one channel: ${lead.channel} alone brings ${lead.gmv_share}% — if that platform changes its rules or algorithm, most of your revenue is exposed.`
      : `Sales are healthily spread across channels; the leader ${lead.channel} holds ${lead.gmv_share}%.`,
  });
  if (rows.length > 1) {
    const byAov = [...rows].sort((a, b) => Number(b.aov) - Number(a.aov));
    const hi = byAov[0], lo = byAov[byAov.length - 1];
    const gap = ((Number(hi.aov) - Number(lo.aov)) / Number(lo.aov)) * 100;
    if (gap >= 15) out.push({ tone: "good", text: `Shoppers on ${hi.channel} spend the most per order: ${idr(hi.aov)} (${pct(gap)} vs ${lo.channel}) — the best place to offer bundles and premium products.` });
    const byInt = [...rows].filter((r) => r.customers >= 20).sort((a, b) => b.orders / b.customers - a.orders / a.customers);
    if (byInt.length) {
      const t = byInt[0];
      out.push({ tone: "info", text: `${t.channel} buyers come back most often — on average ${(t.orders / t.customers).toFixed(2)} orders per customer.` });
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
    text: `In ${monthLabel(latest.ym)}, ${Math.round(share(latest) * 100)}% of buyers were first-timers (6-month average: ${Math.round(avg6 * 100)}%) — growth is leaning more on ${d >= 0 ? "new buyers" : "returning buyers"}.`,
  });
  const ret = full.map((m) => m.returning_customers);
  const rs = slopePct(ret.slice(-6));
  if (rs !== null) out.push({
    tone: rs > 2 ? "good" : rs < -2 ? "warn" : "info",
    text: `Your repeat-buyer base is ${rs > 2 ? "growing" : rs < -2 ? "shrinking" : "flat"} (about ${pct(rs)} per month over the last 6 months) — ${rs < -2 ? "customers are slipping away; fix that before spending more on ads" : "repeat buyers are your steadiest revenue"}.`,
  });
  const peak = full.reduce((a, b) => (a.new_customers >= b.new_customers ? a : b));
  out.push({ tone: "info", text: `Most new customers arrived in ${monthLabel(peak.ym)} (${num(peak.new_customers)} people) — time your next launch or promo the way that one was run.` });
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
  out.push({ tone: d < -8 ? "warn" : d > 8 ? "good" : "info", text: `Last full month, buyers spent ${idr(latest)} per order on average — ${pct(d)} vs the period average of ${idr(avg)}.` });
  const sl = slopePct(a);
  if (sl !== null) out.push({
    tone: sl < -1.5 ? "warn" : sl > 1.5 ? "good" : "info",
    text: sl < -1.5 ? `Spend per order is shrinking about ${Math.abs(sl).toFixed(1)}% per month — heavy discounts may be teaching buyers to spend less; try bundles or a free-shipping minimum.`
      : sl > 1.5 ? `Spend per order keeps rising about ${sl.toFixed(1)}% per month — your upselling is working.`
      : `Spend per order is steady (${sl >= 0 ? "+" : ""}${sl.toFixed(1)}% per month) — so growth has to come from more orders, not bigger ones.`,
  });
  const hiIdx = a.indexOf(Math.max(...a));
  out.push({ tone: "info", text: `Buyers spent the most per order in ${monthLabel(full[hiIdx].ym)} (${idr(a[hiIdx])}) — check which products or promos lifted baskets then.` });
  return out;
}

export function cohortInsights(rows: CohortRow[]): InsightPt[] {
  const out: InsightPt[] = [];
  const m1 = rows.filter((r) => r.months_since === 1 && r.cohort_size >= 50);
  if (!m1.length) return out;
  const avgM1 = m1.reduce((s, r) => s + Number(r.retention_pct), 0) / m1.length;
  out.push({ tone: avgM1 >= 10 ? "good" : "warn", text: `Of every 100 new customers, about ${Math.round(avgM1)} come back and buy again within a month.` });
  const best = m1.reduce((a, b) => (Number(a.retention_pct) >= Number(b.retention_pct) ? a : b));
  out.push({ tone: "info", text: `Customers who joined in ${monthLabel(best.cohort)} stuck best: ${best.retention_pct}% bought again the next month (${num(best.retained)} of ${num(best.cohort_size)}) — worth checking which campaign brought them in.` });
  const latest = m1[m1.length - 1];
  const dl = Number(latest.retention_pct) - avgM1;
  out.push({
    tone: dl >= 1 ? "good" : dl <= -2 ? "warn" : "info",
    text: `The newest group (${monthLabel(latest.cohort)}) is at ${latest.retention_pct}% — ${dl >= 1 ? "better than" : dl <= -2 ? "worse than" : "in line with"} the ${avgM1.toFixed(1)}% norm${dl <= -2 ? "; recent buyers are dropping off faster than usual" : ""}.`,
  });
  const m3 = rows.filter((r) => r.months_since === 3 && r.cohort_size >= 50);
  if (m3.length) {
    const avgM3 = m3.reduce((s, r) => s + Number(r.retention_pct), 0) / m3.length;
    out.push({ tone: "info", text: `Repeat buying fades fast: ${avgM1.toFixed(1)}% return in month 1 but only ${avgM3.toFixed(1)}% by month 3 — a reminder around day 60–75 targets exactly where most drop off.` });
  }
  return out;
}

export function geoInsights(rows: Geo[], unknownShare: number): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const top3 = rows.slice(0, 3).reduce((s, r) => s + Number(r.gmv_share), 0);
  out.push({ tone: top3 > 60 ? "warn" : "info", text: `${rows.slice(0, 3).map((r) => r.province).join(" + ")} make up ${top3.toFixed(1)}% of sales — ${top3 > 60 ? "the rest of the country is barely tapped; targeted ads or shipping deals elsewhere could open new growth" : "a healthy spread across regions"}.` });
  const cand = rows.slice(0, 8).filter((r) => r.customers >= 30);
  if (cand.length > 1) {
    const dens = cand.map((r) => ({ p: r.province, v: Number(r.gmv) / r.customers }));
    const hi = dens.reduce((a, b) => (a.v >= b.v ? a : b));
    const all = rows.reduce((s, r) => s + Number(r.gmv), 0) / Math.max(1, rows.reduce((s, r) => s + r.customers, 0));
    out.push({ tone: "good", text: `Customers in ${hi.p} spend the most: ${idr(hi.v)} each (${pct(((hi.v - all) / all) * 100)} vs the overall average) — a premium audience worth its own campaigns.` });
  }
  if (unknownShare > 2) out.push({ tone: "warn", text: `${unknownShare}% of sales could not be mapped to a province — treat these regional numbers as minimums.` });
  return out;
}

const DAYS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function timeInsights(cells: TimeCell[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!cells.length) return out;
  const total = cells.reduce((s, c) => s + c.orders, 0);
  const peak = cells.reduce((a, b) => (a.orders >= b.orders ? a : b));
  const top3 = [...cells].sort((a, b) => b.orders - a.orders).slice(0, 3);
  out.push({ tone: "good", text: `Busiest moment: ${DAYS[peak.dow]} ${String(peak.hr).padStart(2, "0")}:00 WIB (${num(peak.orders)} orders). The 3 busiest slots (${top3.map((c) => `${DAYS[c.dow]} ${String(c.hr).padStart(2, "0")}:00`).join(", ")}) carry ${((top3.reduce((s, c) => s + c.orders, 0) / total) * 100).toFixed(1)}% of all orders — the best times for flash sales and ad boosts.` });
  const wd = cells.filter((c) => c.dow <= 5).reduce((s, c) => s + c.orders, 0) / 5;
  const we = cells.filter((c) => c.dow >= 6).reduce((s, c) => s + c.orders, 0) / 2;
  const d = ((we - wd) / wd) * 100;
  out.push({ tone: "info", text: `A weekend day gets ${pct(d)} orders compared with a weekday — ${d > 10 ? "putting more ad budget on weekends pays off" : d < -10 ? "your buyers shop on workdays, so keep budgets focused there" : "orders are spread evenly across the week"}.` });
  const parts: [string, number, number][] = [["morning (06–12)", 6, 12], ["afternoon (12–18)", 12, 18], ["evening (18–24)", 18, 24], ["night (00–06)", 0, 6]];
  const ps = parts.map(([name, a, b]) => ({ name, v: cells.filter((c) => c.hr >= a && c.hr < b).reduce((s, c) => s + c.orders, 0) }));
  const lead = ps.reduce((a, b) => (a.v >= b.v ? a : b));
  out.push({ tone: "info", text: `The ${lead.name} is your prime time with ${((lead.v / total) * 100).toFixed(0)}% of orders — schedule launches, broadcasts and livestreams inside it.` });
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
  if (peaking.length) out.push({ tone: "good", text: `Selling at their best-ever pace in ${monthLabel(latestFull)}: ${peaking.slice(0, 3).join(", ")} — make sure they don't run out of stock.` });
  if (fading.length) out.push({ tone: "warn", text: `Selling far below their best: ${fading.slice(0, 3).join(", ")} (under 40% of their best month) — check stock, listing visibility, or refresh the product photos/ads.` });
  const totals = new Map<string, number>();
  cells.forEach((c) => totals.set(c.ym, (totals.get(c.ym) ?? 0) + c.units));
  const best = [...totals.entries()].filter(([ym]) => ym !== yms[yms.length - 1]).reduce((a, b) => (a[1] >= b[1] ? a : b));
  out.push({ tone: "info", text: `Across all products, ${monthLabel(best[0])} was the biggest month (${num(best[1])} units sold) — plan stock and campaigns around it.` });
  return out;
}

export function segmentInsights(rows: Seg[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const g = (n: string) => rows.find((r) => r.segment === n);
  const totalG = rows.reduce((s, r) => s + Number(r.gmv), 0);
  const core = (Number(g("Champions")?.gmv ?? 0) + Number(g("Loyal")?.gmv ?? 0)) / Math.max(1, totalG) * 100;
  out.push({ tone: core > 45 ? "good" : "info", text: `Your most loyal customers (Champions + Loyal) bring in ${core.toFixed(1)}% of sales — protect this group first: great service, stock priority, loyalty perks.` });
  const ar = g("At Risk (high value)");
  if (ar) out.push({ tone: "warn", text: `${idr(ar.gmv)} of past sales came from ${num(ar.customers)} good customers who have gone quiet (~${num(ar.avg_recency_days)} days without buying) — the most profitable group to win back; export the list and contact them.` });
  const np = g("New / Promising");
  if (np) out.push({ tone: "info", text: `${num(np.customers)} customers just bought for the first time — a well-timed reminder for a second purchase turns them into regulars.` });
  const dormant = (g("Hibernating")?.customers ?? 0) + (g("Needs Attention")?.customers ?? 0);
  const totalC = rows.reduce((s, r) => s + r.customers, 0);
  if (dormant) out.push({ tone: "info", text: `${num(dormant)} customers (${((dormant / totalC) * 100).toFixed(0)}% of everyone) are slowly going quiet — a low-cost broadcast now beats losing them completely.` });
  return out;
}

export function paretoInsights(rows: ParetoRow[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const n80 = rows.findIndex((r) => Number(r.cum_gmv_pct) >= 80) + 1 || rows.length;
  out.push({ tone: n80 <= 3 ? "warn" : "info", text: `Just ${n80} product${n80 > 1 ? "s" : ""} bring in 80% of sales — ${n80 <= 3 ? "if any of them runs out of stock, revenue takes a real hit; keep extra inventory and grow the others" : "a healthy spread across products"}.` });
  out.push({ tone: "info", text: `Star product: ${rows[0].product_name} at ${rows[0].cum_gmv_pct}% of sales (${num(rows[0].units)} units) — small improvements to its page/price move total revenue the most.` });
  const tail = rows.filter((r) => Number(r.cum_gmv_pct) > 95).length;
  if (tail >= 3) out.push({ tone: "info", text: `${tail} slow movers add less than 5% of sales combined — better sold as bundles with the star products than advertised on their own.` });
  return out;
}

export function ltvInsights(rows: Ltv[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (rows.length < 1) return out;
  const best = rows[0], worst = rows[rows.length - 1];
  if (rows.length > 1) {
    const ratio = Number(best.avg_ltv) / Math.max(1, Number(worst.avg_ltv));
    out.push({ tone: "good", text: `A customer who starts on ${best.first_channel} ends up spending ${ratio.toFixed(1)}× more than one from ${worst.first_channel} (${idr(best.avg_ltv)} vs ${idr(worst.avg_ltv)} over their lifetime) — you can afford to spend more to win customers there.` });
  }
  const skew = Number(best.median_ltv) / Math.max(1, Number(best.avg_ltv));
  if (skew < 0.6) out.push({ tone: "info", text: `On ${best.first_channel}, a few very big buyers lift the average (typical customer ${idr(best.median_ltv)} vs average ${idr(best.avg_ltv)}) — look after those big buyers personally.` });
  const freq = [...rows].sort((a, b) => b.avg_orders - a.avg_orders)[0];
  out.push({ tone: "info", text: `${freq.first_channel} buyers come back the most (${freq.avg_orders} orders each on average) — that audience fits your product best.` });
  return out;
}

export function affinityInsights(rows: Aff[]): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const byLift = [...rows].sort((a, b) => b.lift - a.lift)[0];
  if (byLift.lift >= 1.5) out.push({ tone: "good", text: `${byLift.p1} + ${byLift.p2} are bought together ${byLift.lift}× more often than expected — the strongest bundle idea; price it a bit below buying both separately.` });
  const byVol = rows[0];
  if (byVol !== byLift) out.push({ tone: "info", text: `Most common combo: ${byVol.p1} + ${byVol.p2} (${num(byVol.together)} orders together) — a natural "add this too?" offer at checkout.` });
  out.push({ tone: "info", text: `Show these pairs as "frequently bought together" on product pages and after checkout — buyers already combine them on their own.` });
  return out;
}

export function topCustInsights(rows: TopCust[], totalGmv: number): InsightPt[] {
  const out: InsightPt[] = [];
  if (!rows.length) return out;
  const sum = rows.reduce((s, r) => s + Number(r.revenue), 0);
  const share = (sum / Math.max(1, totalGmv)) * 100;
  out.push({ tone: share > 15 ? "warn" : "info", text: `Your top ${rows.length} customers spent ${idr(sum)} (${share.toFixed(1)}% of all sales) — ${share > 15 ? "losing even one would noticeably dent revenue; give them personal attention" : "no worrying dependence on a few buyers"}.` });
  const multi = rows.filter((r) => (r.channels ?? []).length > 1).length;
  out.push({ tone: "info", text: `${multi} of ${rows.length} shop on more than one channel — your best buyers follow the brand, not the platform; stay in touch with them directly (WA/email).` });
  const avgOrd = rows.reduce((s, r) => s + r.orders, 0) / rows.length;
  out.push({ tone: "info", text: `They average ${avgOrd.toFixed(1)} orders each — a private "VIP" offer (early access, special bundle price) rewards and grows this loyalty.` });
  return out;
}

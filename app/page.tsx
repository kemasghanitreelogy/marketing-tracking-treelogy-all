import { sb } from "@/lib/supabase";
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { Card, Kpi, SectionTitle } from "@/components/ui";
import { AreaTrend, BarList, StackedMonths } from "@/components/charts";
import ThemeToggle from "@/components/ThemeToggle";

export const revalidate = 300;

type Kpis = { total_orders: number; canceled_orders: number; total_units: number; total_revenue: string; unique_customers: number; returning_customers: number; last_order_date: string };
type Channel = { platform: string; orders: number; units: number; revenue: string; customers: number };
type Daily = { order_date: string; orders: number; units: number; revenue: string };
type Product = { sku: string; product_name: string; units: number; orders: number };
type TopCust = { unified_customer_id: number; name: string; channels: string[]; orders: number; units: number; revenue: string };
type NR = { ym: string; new_customers: number; returning_customers: number; orders: number };

export default async function Page() {
  const [kpiArr, channels, daily, products, topCust, nr] = await Promise.all([
    sb<Kpis[]>("dash_kpis"),
    sb<Channel[]>("dash_channel"),
    sb<Daily[]>("dash_sales_daily?order=order_date.asc"),
    sb<Product[]>("dash_product?order=units.desc&limit=12"),
    sb<TopCust[]>("dash_top_customers?order=units.desc&limit=12"),
    sb<NR[]>("dash_new_returning?order=ym.asc"),
  ]);
  const k = kpiArr[0];

  // daily -> monthly units
  const byMonth = new Map<string, number>();
  for (const d of daily) {
    const ym = d.order_date.slice(0, 7);
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + Number(d.units));
  }
  const monthly = [...byMonth.entries()].sort().map(([ym, v]) => ({ label: monthLabel(ym), value: v }));

  const repeatRate = k.unique_customers ? Math.round((k.returning_customers / k.unique_customers) * 100) : 0;
  const totalOrders = Number(k.total_orders);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--brand-ink)" }}>
            <span style={{ color: "var(--brand)" }}>❦</span> Treelogy · Sales Tracking
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">Ringkasan Penjualan Omnichannel</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--brand)" }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />
            </span>
            Live · update {k.last_order_date}
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        <Kpi label="Total Order" value={num(totalOrders)} sub={`${num(k.canceled_orders)} dibatalkan`} />
        <Kpi label="Unit Terjual" value={num(k.total_units)} accent />
        <Kpi label="Omzet Tercatat" value={idr(k.total_revenue)} sub="Jubelio + Shopify + offline" />
        <Kpi label="Customer Unik" value={num(k.unique_customers)} sub="setelah dedup 3 sumber" />
        <Kpi label="Repeat Rate" value={`${repeatRate}%`} sub={`${num(k.returning_customers)} pelanggan kembali`} />
      </section>

      {/* Trend + channel */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Tren Unit Terjual" hint="per bulan · Feb 2025 – sekarang" />
          <AreaTrend data={monthly} />
        </Card>
        <Card>
          <SectionTitle title="Per Channel" hint="unit" />
          <BarList rows={channels.map((c) => ({ name: c.platform, value: Number(c.units) }))} />
        </Card>
      </section>

      {/* New vs returning + revenue by channel */}
      <section className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <SectionTitle title="Pelanggan Baru vs Kembali" hint="per bulan" />
          <div className="mb-3 flex gap-4 text-xs" style={{ color: "var(--ink-soft)" }}>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--accent)" }} /> Baru</span>
            <span className="flex items-center gap-1.5"><i className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "var(--brand)" }} /> Kembali</span>
          </div>
          <StackedMonths data={nr.map((r) => ({ label: monthLabel(r.ym), a: Number(r.new_customers), b: Number(r.returning_customers) }))} />
        </Card>
        <Card>
          <SectionTitle title="Omzet per Channel" hint="Rp" />
          <BarList rows={channels.filter((c) => Number(c.revenue) > 0).map((c) => ({ name: c.platform, value: Number(c.revenue) }))} mode="idr" />
        </Card>
      </section>

      {/* products + top customers */}
      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle title="Produk Terlaris" hint="unit terjual" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {products.map((p, i) => (
                  <tr key={p.sku} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="py-2 pr-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)", width: 24 }}>{i + 1}</td>
                    <td className="py-2 font-medium">{p.product_name}</td>
                    <td className="py-2 pl-2 font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{p.sku}</td>
                    <td className="py-2 pl-3 text-right font-mono font-semibold tnum">{num(p.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <Card>
          <SectionTitle title="Pelanggan Teratas" hint="berdasar unit" />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[0.68rem] uppercase tracking-wider" style={{ color: "var(--ink-soft)" }}>
                  <th className="pb-2 font-semibold">Nama</th>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 text-right font-semibold">Order</th>
                  <th className="pb-2 text-right font-semibold">Unit</th>
                </tr>
              </thead>
              <tbody>
                {topCust.map((c) => (
                  <tr key={c.unified_customer_id} className="border-b last:border-0" style={{ borderColor: "var(--line-soft)" }}>
                    <td className="py-2 pr-2 font-medium">{c.name || "—"}</td>
                    <td className="py-2 pr-2">
                      <span className="flex flex-wrap gap-1">
                        {(c.channels ?? []).map((ch) => (
                          <span key={ch} className="rounded px-1.5 py-0.5 text-[0.6rem] font-semibold" style={{ background: "var(--brand-wash)", color: "var(--brand-ink)" }}>{ch}</span>
                        ))}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-xs tnum" style={{ color: "var(--ink-soft)" }}>{num(c.orders)}</td>
                    <td className="py-2 text-right font-mono font-semibold tnum">{num(c.units)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <footer className="mt-8 border-t pt-5 text-center text-xs" style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}>
        Data tersatukan dari CSV historis + Jubelio (realtime webhook) + Shopify · omzet total {idrFull(k.total_revenue)} · {num(totalOrders)} order
      </footer>
    </main>
  );
}

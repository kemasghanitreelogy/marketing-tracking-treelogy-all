"use client";
// Advanced tracking heatmaps: Indonesia tile cartogram (geo), purchase-time 7×24,
// and product seasonality. Single-hue sequential scale (colorblind-safe) + exact
// values in tooltips per accessibility guidance.
import { num, idr, idrFull, monthLabel } from "@/lib/format";
import { useTip, TipBox, TipTitle, TipRow } from "@/components/tooltip";

// intensity 0..1 → brand-mix background, readable ink
function heat(a: number) {
  const pct = Math.round(Math.max(0.05, Math.min(1, a)) * 100);
  return {
    background: `color-mix(in srgb, var(--brand) ${pct}%, var(--line-soft))`,
    color: a > 0.55 ? "#fff" : "var(--ink)",
  };
}

// ===== GEO: tile cartogram of Indonesian provinces (statebins pattern) =====
// grid col,row arranged to echo the archipelago west→east
const TILES: Record<string, { c: number; r: number; s: string }> = {
  "Aceh": { c: 0, r: 0, s: "ACE" }, "Sumatera Utara": { c: 1, r: 0, s: "SUT" },
  "Riau": { c: 2, r: 1, s: "RIA" }, "Kepulauan Riau": { c: 3, r: 1, s: "KRI" },
  "Sumatera Barat": { c: 1, r: 1, s: "SBR" }, "Jambi": { c: 2, r: 2, s: "JMB" },
  "Bengkulu": { c: 1, r: 2, s: "BKL" }, "Sumatera Selatan": { c: 2, r: 3, s: "SSL" },
  "Bangka Belitung": { c: 3, r: 2, s: "BBL" }, "Lampung": { c: 3, r: 3, s: "LPG" },
  "Banten": { c: 3, r: 4, s: "BTN" }, "DKI Jakarta": { c: 4, r: 4, s: "JKT" },
  "Jawa Barat": { c: 5, r: 4, s: "JBR" }, "Jawa Tengah": { c: 6, r: 4, s: "JTG" },
  "DI Yogyakarta": { c: 6, r: 5, s: "YOG" }, "Jawa Timur": { c: 7, r: 4, s: "JTM" },
  "Bali": { c: 8, r: 4, s: "BAL" }, "Nusa Tenggara Barat": { c: 9, r: 4, s: "NTB" },
  "Nusa Tenggara Timur": { c: 10, r: 4, s: "NTT" },
  "Kalimantan Barat": { c: 5, r: 1, s: "KBR" }, "Kalimantan Tengah": { c: 6, r: 2, s: "KTG" },
  "Kalimantan Selatan": { c: 7, r: 2, s: "KSL" }, "Kalimantan Timur": { c: 7, r: 1, s: "KTM" },
  "Kalimantan Utara": { c: 6, r: 0, s: "KUT" },
  "Sulawesi Utara": { c: 10, r: 0, s: "SLU" }, "Gorontalo": { c: 9, r: 0, s: "GOR" },
  "Sulawesi Tengah": { c: 9, r: 1, s: "SLT" }, "Sulawesi Barat": { c: 8, r: 2, s: "SLB" },
  "Sulawesi Selatan": { c: 9, r: 2, s: "SLS" }, "Sulawesi Tenggara": { c: 10, r: 2, s: "STG" },
  "Maluku Utara": { c: 11, r: 1, s: "MLU" }, "Maluku": { c: 11, r: 2, s: "MLK" },
  "Papua": { c: 12, r: 1, s: "PAP" },
};
export type GeoRow = { province: string; orders: number; units: number; gmv: string; customers: number; gmv_share: number };

export function GeoTileMap({ rows }: { rows: GeoRow[] }) {
  const { ref, tip, show, hide } = useTip();
  const byProv = new Map(rows.map((r) => [r.province, r]));
  const known = rows.filter((r) => TILES[r.province]);
  const maxG = Math.max(1, ...known.map((r) => Number(r.gmv)));
  const COLS = 13, ROWS = 6, CELL = 46, GAP = 5;
  const W = COLS * (CELL + GAP), H = ROWS * (CELL + GAP);
  return (
    <div ref={ref} className="relative overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 560 }} role="img" aria-label="GMV by province, tile map of Indonesia">
        {Object.entries(TILES).map(([prov, t]) => {
          const d = byProv.get(prov);
          const a = d ? Math.pow(Number(d.gmv) / maxG, 0.45) : 0; // gamma for perceptual spread
          const st = d ? heat(a) : { background: "var(--line-soft)", color: "var(--ink-soft)" };
          return (
            <g key={prov} transform={`translate(${t.c * (CELL + GAP)},${t.r * (CELL + GAP)})`}
              onPointerMove={(e) => show(e, (
                <div>
                  <TipTitle>{prov}</TipTitle>
                  {d ? (<>
                    <TipRow swatch="var(--brand)" label="GMV" value={idrFull(d.gmv)} />
                    <TipRow label="Share" value={`${d.gmv_share}%`} />
                    <TipRow label="Orders" value={num(d.orders)} />
                    <TipRow label="Customers" value={num(d.customers)} />
                  </>) : <TipRow label="Orders" value="0" />}
                </div>
              ))}
              onPointerLeave={hide} style={{ cursor: "default" }}>
              <rect width={CELL} height={CELL} rx="8" fill={st.background as string} stroke="var(--line)" strokeWidth="1" />
              <text x={CELL / 2} y={CELL / 2 - 4} textAnchor="middle" fontSize="10.5" fontWeight="700" fill={st.color as string}>{t.s}</text>
              <text x={CELL / 2} y={CELL / 2 + 10} textAnchor="middle" fontSize="8.5" fill={st.color as string} className="tnum">
                {d ? `${d.gmv_share}%` : ""}
              </text>
            </g>
          );
        })}
      </svg>
      <TipBox tip={tip} />
    </div>
  );
}

// ===== TIME: 7×24 purchase-time heatmap (WIB) =====
export type TimeCell = { dow: number; hr: number; orders: number; gmv: string };
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
export function TimeHeatmap({ cells }: { cells: TimeCell[] }) {
  const { ref, tip, show, hide } = useTip();
  const map = new Map(cells.map((c) => [`${c.dow}:${c.hr}`, c]));
  const max = Math.max(1, ...cells.map((c) => c.orders));
  const peak = cells.reduce((p, c) => (c.orders > (p?.orders ?? 0) ? c : p), cells[0]);
  return (
    <div ref={ref} className="relative overflow-x-auto">
      <table className="border-separate text-[0.6rem]" style={{ borderSpacing: 2, minWidth: 620 }}>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => (
              <th key={h} className="pb-1 font-semibold tnum" style={{ color: "var(--ink-soft)" }}>{h % 3 === 0 ? h : ""}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((d, di) => (
            <tr key={d}>
              <td className="pr-2 text-right text-[0.66rem] font-semibold" style={{ color: "var(--ink-soft)" }}>{d}</td>
              {Array.from({ length: 24 }, (_, h) => {
                const c = map.get(`${di + 1}:${h}`);
                const a = c ? c.orders / max : 0;
                const st = heat(a);
                return (
                  <td key={h} className="cursor-default rounded"
                    style={{ ...st, width: 22, height: 20 }}
                    onPointerMove={(e) => show(e, (
                      <div>
                        <TipTitle>{d} · {String(h).padStart(2, "0")}:00–{String(h).padStart(2, "0")}:59 WIB</TipTitle>
                        <TipRow swatch="var(--brand)" label="Orders" value={num(c?.orders ?? 0)} />
                        <TipRow label="GMV" value={idr(c?.gmv ?? 0)} />
                      </div>
                    ))}
                    onPointerLeave={hide} />
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {peak && (
        <div className="mt-2 text-xs" style={{ color: "var(--ink-soft)" }}>
          Peak: <b style={{ color: "var(--brand)" }}>{DAYS[peak.dow - 1]} {String(peak.hr).padStart(2, "0")}:00 WIB</b> ({num(peak.orders)} orders) — best slot for flash sales & ad pushes.
        </div>
      )}
      <TipBox tip={tip} />
    </div>
  );
}

// ===== SEASONALITY: product × month, per-row normalized =====
export type SeasonCell = { product_name: string; ym: string; units: number; orders: number };
export function SeasonHeatmap({ cells }: { cells: SeasonCell[] }) {
  const { ref, tip, show, hide } = useTip();
  const products = [...new Set(cells.map((c) => c.product_name))];
  const months = [...new Set(cells.map((c) => c.ym))].sort();
  const map = new Map(cells.map((c) => [`${c.product_name}:${c.ym}`, c]));
  const rowMax = new Map(products.map((p) => [p, Math.max(1, ...cells.filter((c) => c.product_name === p).map((c) => c.units))]));
  // order products by total units desc
  const totals = new Map(products.map((p) => [p, cells.filter((c) => c.product_name === p).reduce((s, c) => s + Number(c.units), 0)]));
  products.sort((a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0));
  return (
    <div ref={ref} className="relative overflow-x-auto">
      <table className="w-full border-separate text-[0.66rem]" style={{ borderSpacing: 2, minWidth: 640 }}>
        <thead>
          <tr>
            <th />
            {months.map((m) => <th key={m} className="pb-1 font-semibold" style={{ color: "var(--ink-soft)" }}>{monthLabel(m)}</th>)}
          </tr>
        </thead>
        <tbody>
          {products.map((p) => (
            <tr key={p}>
              <td className="max-w-[130px] truncate pr-2 text-right font-semibold" title={p}>{p}</td>
              {months.map((m) => {
                const c = map.get(`${p}:${m}`);
                const a = c ? Number(c.units) / (rowMax.get(p) ?? 1) : 0;
                const st = c ? heat(a) : { background: "transparent", color: "var(--ink-soft)" };
                return (
                  <td key={m} className="cursor-default rounded text-center font-mono tnum"
                    style={{ ...st, padding: "5px 3px", minWidth: 40 }}
                    onPointerMove={(e) => show(e, (
                      <div>
                        <TipTitle>{p} · {monthLabel(m)}</TipTitle>
                        <TipRow swatch="var(--brand)" label="Units" value={num(c?.units ?? 0)} />
                        <TipRow label="Orders" value={num(c?.orders ?? 0)} />
                        <TipRow label="vs own peak" value={`${Math.round(a * 100)}%`} />
                      </div>
                    ))}
                    onPointerLeave={hide}>
                    {c ? num(c.units) : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 text-[0.68rem]" style={{ color: "var(--ink-soft)" }}>
        Color intensity is relative to each product&apos;s own peak month — read rows to spot seasonality.
      </div>
      <TipBox tip={tip} />
    </div>
  );
}

export const nf = new Intl.NumberFormat("id-ID");

export function num(n: number | string | null | undefined): string {
  return nf.format(Math.round(Number(n ?? 0)));
}

// Compact Rupiah, e.g. 4.7 M, 1.2 jt
export function idr(n: number | string | null | undefined): string {
  const v = Number(n ?? 0);
  if (v >= 1e9) return "Rp " + (v / 1e9).toFixed(2).replace(/\.?0+$/, "") + " M";
  if (v >= 1e6) return "Rp " + (v / 1e6).toFixed(1).replace(/\.0$/, "") + " jt";
  if (v >= 1e3) return "Rp " + (v / 1e3).toFixed(0) + "rb";
  return "Rp " + num(v);
}

export function idrFull(n: number | string | null | undefined): string {
  return "Rp " + num(n);
}

export function monthLabel(ym: string): string {
  const m = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const [y, mm] = ym.split("-");
  return `${m[Number(mm) - 1]} ${y.slice(2)}`;
}

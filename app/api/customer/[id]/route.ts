import { NextResponse } from "next/server";

// Customer-360 detail: calls the Supabase RPC server-side (service key never
// reaches the browser). Cached briefly to keep repeat opens instant.
export const revalidate = 120;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const uid = Number(id);
  if (!Number.isFinite(uid) || uid <= 0) {
    return NextResponse.json({ error: "invalid id" }, { status: 400 });
  }
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/customer_360`, {
    method: "POST",
    headers: {
      apikey: process.env.SUPABASE_SERVICE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_uid: uid }),
    next: { revalidate: 120 },
  });
  if (!res.ok) {
    console.error("customer_360 rpc failed", res.status, (await res.text()).slice(0, 300));
    return NextResponse.json({ error: "lookup failed" }, { status: 502 });
  }
  const data = await res.json();
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=60, s-maxage=120" } });
}

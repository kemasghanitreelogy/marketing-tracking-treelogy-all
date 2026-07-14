import { NextResponse } from "next/server";

// Identity-merge review queue. Both endpoints are gated by REVIEW_KEY because
// POST mutates customer identity groups.
export const dynamic = "force-dynamic";

const SB = () => ({
  apikey: process.env.SUPABASE_SERVICE_KEY!,
  Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
});

function authorized(req: Request): boolean {
  const key = req.headers.get("x-review-key") ?? new URL(req.url).searchParams.get("key") ?? "";
  return !!process.env.REVIEW_KEY && key === process.env.REVIEW_KEY;
}

export async function GET(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const res = await fetch(
    `${process.env.SUPABASE_URL}/rest/v1/v_review_links?order=addr_sim.desc.nullslast,id.asc&limit=600`,
    { headers: SB(), cache: "no-store" },
  );
  if (!res.ok) {
    console.error("review list failed", res.status, (await res.text()).slice(0, 200));
    return NextResponse.json({ error: "list failed" }, { status: 502 });
  }
  return NextResponse.json(await res.json());
}

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { id?: number; approve?: boolean };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "bad json" }, { status: 400 }); }
  if (!Number.isFinite(body.id) || typeof body.approve !== "boolean") {
    return NextResponse.json({ error: "expected { id: number, approve: boolean }" }, { status: 400 });
  }
  const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/apply_customer_link`, {
    method: "POST",
    headers: { ...SB(), "Content-Type": "application/json" },
    body: JSON.stringify({ p_link_id: body.id, p_approve: body.approve }),
  });
  const out = await res.text();
  if (!res.ok) {
    console.error("apply_customer_link failed", res.status, out.slice(0, 200));
    return NextResponse.json({ error: "apply failed" }, { status: 502 });
  }
  return NextResponse.json(JSON.parse(out || "null"));
}

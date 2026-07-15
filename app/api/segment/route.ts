import { NextRequest, NextResponse } from "next/server";
import { sbRpc } from "@/lib/supabase";

// GET /api/segment?seg=Champions&ch=Shopee,TikTok%20Shop — segment drill-down
// (members + summary) under the current channel filter.
export async function GET(req: NextRequest) {
  const seg = req.nextUrl.searchParams.get("seg");
  if (!seg) return NextResponse.json({ error: "seg required" }, { status: 400 });
  const ch = (req.nextUrl.searchParams.get("ch") ?? "").split(",").map((s) => s.trim()).filter(Boolean).sort();
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  try {
    const data = await sbRpc("segment_customers", {
      p_segment: seg,
      p_channels: ch.length ? ch : null,
      p_limit: 500,
      p_from: from && DATE_RE.test(from) ? from : null,
      p_to: to && DATE_RE.test(to) ? to : null,
    }, 120);
    return NextResponse.json(data, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (err) {
    console.error("[api/segment]", seg, ch, err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

import { sbRpc } from "@/lib/supabase";

// Live pipeline stats for /how-it-works — always fresh so the page can prove
// the pipeline is running right now.
export async function GET() {
  try {
    const stats = await sbRpc("pipeline_stats", {}, 0);
    return Response.json(stats, { headers: { "Cache-Control": "private, max-age=15" } });
  } catch (e) {
    console.error("pipeline_stats failed", e);
    return new Response("upstream error", { status: 502 });
  }
}

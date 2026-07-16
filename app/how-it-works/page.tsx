import { sbRpc } from "@/lib/supabase";
import PipelineStory, { type PipeStats } from "@/components/pipeline-story";

export const metadata = {
  title: "How this data works · Treelogy",
  description: "The always-on pipeline behind the Treelogy dashboard — from marketplace webhooks to identity resolution to live charts.",
};

export default async function Page() {
  const stats = await sbRpc<PipeStats>("pipeline_stats", {}, 0);
  return <PipelineStory initial={stats} />;
}

const URL = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

// POST an RPC (PostgREST). Cached per (fn, args) combo via the Next data cache,
// so repeat channel-filter toggles are served instantly; fresh data every 5 min.
export async function sbRpc<T = unknown>(fn: string, args: Record<string, unknown> = {}, revalidate = 300): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    next: { revalidate },
  });
  if (!res.ok) throw new Error(`Supabase rpc ${fn} -> ${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

// Server-only fetch against Supabase REST (PostgREST) views. Service key stays on the server.
export async function sb<T = unknown>(path: string, revalidate = 300): Promise<T> {
  const res = await fetch(`${URL}/rest/v1/${path}`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
    next: { revalidate },
  });
  if (!res.ok) {
    throw new Error(`Supabase ${path} -> ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

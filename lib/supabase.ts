const URL = process.env.SUPABASE_URL ?? "";
const KEY = process.env.SUPABASE_SERVICE_KEY ?? "";

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

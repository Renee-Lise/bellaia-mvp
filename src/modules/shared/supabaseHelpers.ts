// ═══════════════════════════════════════════════════════════
// BELLAÏA — HELPERS SUPABASE RÉUTILISABLES
// Utilisés par tous les modules pôles
// ═══════════════════════════════════════════════════════════

const getUrl   = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const getToken = () => {
  if (typeof window === "undefined") return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  return localStorage.getItem("bellaia_token") || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
};

const headers = () => ({
  apikey:         getToken(),
  Authorization:  `Bearer ${getToken()}`,
  "Content-Type": "application/json",
  Prefer:         "return=representation",
});

export async function sbSelect<T = any>(
  table: string,
  opts: { select?: string; filters?: Record<string, string>; order?: string; limit?: number } = {}
): Promise<T[]> {
  const { select = "*", filters = {}, order, limit } = opts;
  let url = `${getUrl()}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  Object.entries(filters).forEach(([k, v]) => { url += `&${k}=${encodeURIComponent(v)}`; });
  if (order)  url += `&order=${order}`;
  if (limit)  url += `&limit=${limit}`;
  const r = await fetch(url, { headers: headers() });
  if (!r.ok) throw new Error(`sbSelect ${table}: ${r.status}`);
  return r.json();
}

export async function sbInsert<T = any>(table: string, data: Partial<T>): Promise<T> {
  const r = await fetch(`${getUrl()}/rest/v1/${table}`, {
    method: "POST", headers: headers(),
    body: JSON.stringify(data),
  });
  if (!r.ok) throw new Error(`sbInsert ${table}: ${r.status}`);
  const rows = await r.json();
  return Array.isArray(rows) ? rows[0] : rows;
}

export async function sbUpdate<T = any>(table: string, id: string, data: Partial<T>): Promise<void> {
  const r = await fetch(`${getUrl()}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH", headers: { ...headers(), Prefer: "return=minimal" },
    body: JSON.stringify({ ...data, updated_at: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`sbUpdate ${table}: ${r.status}`);
}

export async function sbDelete(table: string, id: string): Promise<void> {
  const r = await fetch(`${getUrl()}/rest/v1/${table}?id=eq.${id}`, {
    method: "DELETE", headers: { ...headers(), Prefer: "return=minimal" },
  });
  if (!r.ok) throw new Error(`sbDelete ${table}: ${r.status}`);
}

export async function sbRpc(fn: string, params: Record<string, any> = {}): Promise<any> {
  const r = await fetch(`${getUrl()}/rest/v1/rpc/${fn}`, {
    method: "POST", headers: headers(),
    body: JSON.stringify(params),
  });
  if (!r.ok) throw new Error(`sbRpc ${fn}: ${r.status}`);
  return r.json();
}

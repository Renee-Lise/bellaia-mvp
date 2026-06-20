"use client";
import { useState, useEffect, useCallback } from "react";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getToken() {
  if (typeof window === "undefined") return SB_KEY;
  return localStorage.getItem("bellaia_token") || SB_KEY;
}

// Fetch générique vers Supabase REST API
export async function sbFetch(
  table: string,
  opts: {
    method?: string;
    select?: string;
    filters?: Record<string, string | number>;
    data?: Record<string, unknown>;
    order?: string;
    limit?: number;
  } = {}
) {
  const { method = "GET", select = "*", filters = {}, data, order, limit } = opts;
  const token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    apikey: SB_KEY,
    Authorization: `Bearer ${token}`,
    Prefer: method === "POST" ? "return=representation" : "return=minimal",
  };

  let url = `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
  Object.entries(filters).forEach(([k, v]) => {
    url += `&${k}=eq.${encodeURIComponent(String(v))}`;
  });
  if (order) url += `&order=${order}`;
  if (limit) url += `&limit=${limit}`;

  const r = await fetch(url, {
    method,
    headers,
    ...(data ? { body: JSON.stringify(data) } : {}),
  });

  const text = await r.text();
  return { ok: r.ok, status: r.status, data: text ? JSON.parse(text) : [] };
}

// Hook générique avec état loading/error
export function useSbTable<T = Record<string, unknown>>(
  table: string,
  opts: Parameters<typeof sbFetch>[1] = {},
  deps: unknown[] = []
) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await sbFetch(table, opts);
      if (r.ok) setData(Array.isArray(r.data) ? r.data : [r.data]);
      else setError("Erreur de chargement");
    } catch (e) {
      setError(String(e));
    }
    setLoading(false);
  }, [table, JSON.stringify(opts), ...deps]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load, setData };
}

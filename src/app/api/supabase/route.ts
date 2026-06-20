import { NextRequest, NextResponse } from "next/server";

// Route générique pour les requêtes Supabase authentifiées
// Usage : POST /api/supabase { table, method, filters, data, select }

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { table, method = "GET", filters = {}, data, select = "*", order, limit: lim } = await req.json();
    const token = req.headers.get("authorization")?.replace("Bearer ", "") || SB_KEY;

    if (!table) return NextResponse.json({ error: "Table manquante" }, { status: 400 });

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": `Bearer ${token}`,
      "Prefer": method === "POST" ? "return=representation" : "return=minimal",
    };

    // Construire l'URL
    let url = `${SB_URL}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    Object.entries(filters).forEach(([k, v]) => {
      url += `&${k}=eq.${encodeURIComponent(String(v))}`;
    });
    if (order) url += `&order=${order}`;
    if (lim)   url += `&limit=${lim}`;

    const fetchOpts: RequestInit = { method, headers };
    if (data && (method === "POST" || method === "PATCH")) {
      fetchOpts.body = JSON.stringify(data);
    }

    const r = await fetch(url, fetchOpts);
    const text = await r.text();
    const json = text ? JSON.parse(text) : [];

    if (!r.ok) return NextResponse.json({ error: json }, { status: r.status });
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

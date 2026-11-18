import { NextRequest, NextResponse } from "next/server";
import { envoyerPushFondatrice } from "@/lib/pushSend";

// Alerte push vers la fondatrice (nouvelle commande / demande).
// Garde-fous :
//  • le lien envoyé par le navigateur est ignoré (toujours l'application) ;
//  • titre et message raccourcis, liens retirés ;
//  • sans compte connecté, l'alerte doit correspondre à une commande ou
//    une demande réelle créée il y a moins de 15 minutes (anti-spam).
const SOURCES = new Set(["bellaia_commandes", "events_demandes"]);
const nettoyer = (t: unknown, max: number) =>
  String(t ?? "").replace(/https?:\/\/\S+|www\.\S+/gi, "[lien retiré]").replace(/\s+/g, " ").trim().slice(0, max);

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }
  const titre = nettoyer(body?.titre, 80);
  const message = nettoyer(body?.message, 240);
  const tag = nettoyer(body?.tag, 30) || "notification";
  if (!titre || !message) return NextResponse.json({ ok: false }, { status: 400 });

  const URL_SB = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const { createClient } = await import("@supabase/supabase-js");

  let autorise = false;
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (jeton && jeton !== ANON) {
    const sb = createClient(URL_SB, ANON, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
    const { data: { user } } = await sb.auth.getUser();
    autorise = !!user;
  }
  if (!autorise) {
    const table = String(body?.source_table || "");
    const id = String(body?.source_id || "");
    if (SOURCES.has(table) && id && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const admin = createClient(URL_SB, process.env.SUPABASE_SERVICE_ROLE_KEY);
      const depuis = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      const colonne = /^[0-9a-f-]{36}$/i.test(id) ? "id" : "reference";
      const { data } = await admin.from(table).select("id").eq(colonne, id).gte("created_at", depuis).limit(1);
      autorise = !!data?.length;
    }
  }
  if (!autorise) return NextResponse.json({ ok: false }, { status: 401 });

  envoyerPushFondatrice({ titre, message, url: "/", tag }).catch(() => {});
  return NextResponse.json({ ok: true });
}

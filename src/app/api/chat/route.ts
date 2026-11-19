import { NextRequest, NextResponse } from "next/server";
import { permisUtilisateur } from "@/lib/permissions";
import { verifierQuota, journaliserIA, coutEstime } from "@/lib/iaUsage";

// Relais vers l'IA (clé Anthropic côté serveur).
// Réservé à l'équipe : fondatrice, ou personne ayant reçu la permission
// « ia.utiliser ». Sans cette vérification, n'importe quel visiteur
// pouvait utiliser la clé (coût) avec ses propres instructions.
const MAX_MESSAGES = 40;
const MAX_CARACTERES = 60000;

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { content: [{ type: "text", text: "⚠️ ANTHROPIC_API_KEY manquante dans Vercel." }] },
      { status: 500 }
    );
  }

  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton || jeton === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Connexion requise." }] }, { status: 401 });
  }
  const { createClient } = await import("@supabase/supabase-js");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${jeton}` } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ content: [{ type: "text", text: "⚠️ Session expirée." }] }, { status: 401 });
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (!(await permisUtilisateur(sb, "ia.utiliser", "*", profil?.role))) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Accès à l'IA non autorisé pour ce compte." }] }, { status: 403 });
  }

  let body: { system?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ content: [{ type: "text", text: "⚠️ Body invalide." }] }, { status: 400 }); }

  const { messages, system } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Aucun message." }] }, { status: 400 });
  }
  const taille = JSON.stringify(messages).length + String(system || "").length;
  if (messages.length > MAX_MESSAGES || taille > MAX_CARACTERES) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Conversation trop longue : commencez-en une nouvelle." }] }, { status: 413 });
  }

  // Quotas et budget IA (table ia_limites, espace GENERAL) + journal des coûts.
  const admin = process.env.SUPABASE_SERVICE_ROLE_KEY ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY) : null;
  const quota = admin ? await verifierQuota(admin, user.id, "GENERAL") : null;
  if (quota && !quota.ok) return NextResponse.json({ content: [{ type: "text", text: "⚠️ " + quota.raison }] }, { status: 429 });

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1024, system: system || "Tu es Bellaïa, assistante de Bella'Studio. Réponds en français.", messages }),
    });
  } catch {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Réseau inaccessible." }] }, { status: 502 });
  }

  const raw = await response.text();
  if (!response.ok) {
    console.log(`[api/chat] ${response.status}`);
    let detail = "";
    try { detail = JSON.parse(raw)?.error?.message || ""; } catch {}
    const fallback: Record<number, string> = {
      401: "Clé API invalide ou expirée.",
      403: "Accès refusé par Anthropic.",
      429: "Limite de débit atteinte. Réessaie dans quelques secondes.",
      500: "Erreur interne Anthropic.",
    };
    const texte = detail || fallback[response.status] || `Erreur HTTP ${response.status}.`;
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ " + texte }] }, { status: response.status });
  }
  try {
    const d = JSON.parse(raw);
    if (admin && quota) { const e = d?.usage?.input_tokens || 0, so = d?.usage?.output_tokens || 0; await journaliserIA(admin, { userId: user.id, route: "chat", modele: "claude-sonnet-5-5", entree: e, sortie: so, cout: coutEstime(quota.limites, e, so) }); }
    return NextResponse.json(d);
  }
  catch { return NextResponse.json({ content: [{ type: "text", text: "⚠️ Réponse illisible." }] }, { status: 500 }); }
}

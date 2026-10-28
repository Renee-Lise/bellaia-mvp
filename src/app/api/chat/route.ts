import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { content: [{ type: "text", text: "⚠️ ANTHROPIC_API_KEY manquante dans Vercel." }] },
      { status: 500 }
    );
  }

  let body: { system?: string; messages?: { role: string; content: string }[] };
  try { body = await req.json(); }
  catch { return NextResponse.json({ content: [{ type: "text", text: "⚠️ Body invalide." }] }, { status: 400 }); }

  const { messages, system } = body;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Aucun message." }] }, { status: 400 });
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: "claude-sonnet-5-5", max_tokens: 1024, system: system || "Tu es Bellaïa, assistante de Bella'Studio. Réponds en français.", messages }),
    });
  } catch (e) {
    return NextResponse.json({ content: [{ type: "text", text: "⚠️ Réseau inaccessible." }] }, { status: 502 });
  }

  const raw = await response.text();
  console.log(`[api/chat] ${response.status} — ${raw.slice(0, 200)}`);

  if (!response.ok) {
    // Le vrai message Anthropic (ex. solde de crédit insuffisant) est bien plus
    // utile qu'un texte générique par code HTTP — un message générique masquait
    // la vraie cause (ex. 400 "low credit balance" affiché comme "modèle ou
    // payload incorrect", alors que le vrai problème était la facturation
    // Anthropic, pas le code).
    let detail = "";
    try { detail = JSON.parse(raw)?.error?.message || ""; } catch {}
    const fallback: Record<number, string> = {
      401: "Clé API invalide ou expirée.",
      403: "Accès refusé par Anthropic.",
      429: "Limite de débit atteinte. Réessaie dans quelques secondes.",
      500: "Erreur interne Anthropic.",
    };
    const texte = detail || fallback[response.status] || `Erreur HTTP ${response.status}.`;
    return NextResponse.json(
      { content: [{ type: "text", text: "⚠️ " + texte }] },
      { status: response.status }
    );
  }

  try { return NextResponse.json(JSON.parse(raw)); }
  catch { return NextResponse.json({ content: [{ type: "text", text: "⚠️ Réponse illisible." }] }, { status: 500 }); }
}

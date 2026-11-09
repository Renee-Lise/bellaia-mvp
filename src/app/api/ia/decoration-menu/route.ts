// src/app/api/ia/decoration-menu/route.ts
//
// Demande de Renée-Lise : à partir d'une photo (article de décoration
// ou fiche menu), proposer des idées de décoration visuelle ou des
// idées de menu avec une estimation de prix. Même pattern
// d'authentification et d'appel Anthropic que /api/ia/chat (clé
// ANTHROPIC_API_KEY, déjà utilisée ailleurs dans l'app).
//
// IMPORTANT : les prix renvoyés sont des ESTIMATIONS générées par
// l'IA à partir de la photo, jamais des prix réels du catalogue —
// affichées comme telles côté client, jamais confondues avec un prix
// validé par Renée-Lise.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  // 1. Authentification — fondatrice/assistante uniquement (jamais
  // un outil interne exposé aux clientes).
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["fondatrice", "assistante"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // 2. Payload
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide" }, { status: 400 }); }

  const { imageBase64, mediaType, type, occasion } = body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "Photo manquante." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return NextResponse.json({ error: "Format de photo non pris en charge (jpeg/png/webp)." }, { status: 400 });
  }
  if (!["decoration", "menu"].includes(type)) {
    return NextResponse.json({ error: "Type invalide (decoration ou menu)." }, { status: 400 });
  }
  // Limite grossière (base64 ~33% plus gros que le fichier d'origine) —
  // évite une image démesurée envoyée par erreur.
  if (imageBase64.length > 8_000_000) {
    return NextResponse.json({ error: "Photo trop volumineuse (8 Mo max)." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée dans Vercel → Settings → Environment Variables" }, { status: 500 });
  }

  const consigne = type === "decoration"
    ? `Tu regardes la photo d'un article ou d'une ambiance de décoration pour Bella'Studio (entreprise de prestations événementielles et artisanales en Guyane). Occasion visée : ${occasion || "non précisée"}.
Propose 3 à 5 idées de décoration inspirées de cette photo, réutilisables pour cette occasion. Réponds UNIQUEMENT en JSON valide, sans texte autour, sous cette forme exacte :
{"idees":[{"nom":"...","description":"...","estimation_prix":12.5}]}
"estimation_prix" est un nombre en euros, une estimation indicative (jamais un prix réel de catalogue) — mets null si tu ne peux pas estimer raisonnablement.`
    : `Tu regardes la photo d'une fiche menu ou d'un plat pour Bella'Food (traiteur en Guyane). Occasion visée : ${occasion || "non précisée"}.
Propose 3 à 5 idées de plats/menu inspirées de cette photo, avec le service auquel chacune correspondrait (Cocktail / Mocktail, Hors d'œuvre, Entrée, Plat, Dessert, Boissons). Réponds UNIQUEMENT en JSON valide, sans texte autour, sous cette forme exacte :
{"idees":[{"service":"...","plat":"...","description":"...","estimation_prix":15}]}
"estimation_prix" est un nombre en euros, une estimation indicative (jamais un prix réel de catalogue) — mets null si tu ne peux pas estimer raisonnablement.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 1536,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
            { type: "text", text: consigne },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Erreur Anthropic ${response.status}`;
      console.error("[ia/decoration-menu] Anthropic error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const data = await response.json();
    const texte = data.content?.[0]?.text || "";

    let idees: any[] = [];
    try {
      const match = texte.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(match ? match[0] : texte);
      idees = Array.isArray(parsed.idees) ? parsed.idees : [];
    } catch {
      // Réponse non structurée — on renvoie quand même le texte brut
      // plutôt que de faire échouer l'appel (rien d'inventé côté
      // serveur : c'est la réponse réelle du modèle, telle quelle).
      return NextResponse.json({ ok: true, idees: [], texteBrut: texte });
    }

    try {
      await sb.from("ia_journal").insert({
        user_id: user.id, type: "appel_api",
        message: `Décoration/menu depuis photo (${type}) — ${idees.length} idée(s)`,
        metadata: { model: data.model, usage: data.usage, occasion, type },
      });
    } catch {}

    return NextResponse.json({ ok: true, idees });
  } catch (e: any) {
    console.error("[ia/decoration-menu] erreur:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

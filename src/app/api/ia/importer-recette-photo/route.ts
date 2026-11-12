// src/app/api/ia/importer-recette-photo/route.ts
//
// Import de recette Bella'Food depuis une photo/capture d'écran —
// jusqu'ici volontairement désactivé dans FoodImport.tsx ("OCR —
// disponible avec IA", architecture préparée mais jamais branchée).
// Demande explicite de Renée-Lise ("je ne peux pas rajouter de
// recettes depuis une image"). Même pattern que /api/ia/decoration-
// menu : raw fetch Anthropic, claude-sonnet-5-5, Bearer+profiles.role.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });

  const sb = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Votre session a expiré. Déconnectez-vous puis reconnectez-vous, et réessayez." }, { status: 401 });
  }

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || !["fondatrice", "assistante"].includes(profile.role)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide." }, { status: 400 }); }

  const { imageBase64, mediaType } = body;
  if (!imageBase64 || typeof imageBase64 !== "string") {
    return NextResponse.json({ error: "Photo manquante." }, { status: 400 });
  }
  if (!["image/jpeg", "image/png", "image/webp"].includes(mediaType)) {
    return NextResponse.json({ error: "Format de photo non pris en charge (jpeg/png/webp)." }, { status: 400 });
  }
  if (imageBase64.length > 8_000_000) {
    return NextResponse.json({ error: "Photo trop volumineuse (8 Mo max)." }, { status: 400 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée dans Vercel → Settings → Environment Variables" }, { status: 500 });
  }

  const consigne = `Tu regardes la photo d'une fiche recette ou d'une capture d'écran de recette (réseau social, site web, document). Extrais toutes les informations disponibles pour Bella'Food (traiteur en Guyane). Réponds UNIQUEMENT en JSON valide, sans texte autour, sous cette forme exacte :
{
  "nom": "...",
  "categorie": "entree|soupe|salade|viande|poisson|fruits_de_mer|poulet|boeuf|agneau|accompagnement|riz|pates|burger|sandwich|street_food|sauce|dessert|glace|patisserie|cake|cupcake|entremet|macaron|viennoiserie|pain|brunch|boisson|cocktail|mocktail|jus|smoothie|the_glace|buffet|traiteur|repas_creole|repas_guyanais|mariage|baby_shower|anniversaire|autre",
  "feteAssociee": "Noël|Nouvel an|Pâques|Toussaint|null (si aucune occasion précise n'est indiquée ou évidente)",
  "nbParts": nombre entier ou null,
  "difficulte": 1 à 5 (estimation si non précisée) ,
  "tempsPrepa": minutes (entier),
  "tempsCuisson": minutes (entier, 0 si aucune cuisson),
  "tempsRepos": minutes ou null,
  "ingredients": [{"nom":"...","quantite": nombre, "unite":"g|kg|mg|ml|L|cl|piece|unite|tranche|bouquet|boite|sachet|pot|bouteille|cuillere_cafe|cuillere_soupe|tasse|pincee|goutte|portion"}],
  "etapes": ["...","..."],
  "allergenes": ["..."] ou [],
  "astuces": ["..."] ou []
}
Si une information n'est pas lisible sur la photo, mets null (jamais une valeur inventée). Les quantités d'ingrédients doivent rester des nombres (ex. 0.5 pour une demi-unité), jamais du texte.`;

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
        max_tokens: 2048,
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
      console.error("[ia/importer-recette-photo] Anthropic error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const data = await response.json();
    const texte = data.content?.[0]?.text || "";

    let recette: any = null;
    try {
      const match = texte.match(/\{[\s\S]*\}/);
      recette = JSON.parse(match ? match[0] : texte);
    } catch {
      return NextResponse.json({ error: "Réponse IA non structurée — réessayez avec une photo plus nette." }, { status: 502 });
    }

    try {
      await sb.from("ia_journal").insert({
        user_id: user.id, type: "appel_api",
        message: `Import recette depuis photo — ${recette?.nom || "sans nom"}`,
        metadata: { model: data.model, usage: data.usage },
      });
    } catch {}

    return NextResponse.json({ ok: true, recette });
  } catch (e: any) {
    console.error("[ia/importer-recette-photo] erreur:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

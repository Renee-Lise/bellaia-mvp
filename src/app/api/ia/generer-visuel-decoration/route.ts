// src/app/api/ia/generer-visuel-decoration/route.ts
//
// Génération d'un visuel de décoration par IA — demande explicite de
// Renée-Lise ("Les deux : vos photos + génération IA"), fournisseur
// choisi par elle : OpenAI (gpt-image-1). Distinct de /api/ia/chat et
// /api/ia/decoration-menu qui, eux, appellent Anthropic — nécessite
// donc sa propre clé, OPENAI_API_KEY, jamais ANTHROPIC_API_KEY.
//
// L'image générée est uploadée dans le bucket stocks-images existant
// (même mécanisme que StocksF) puis enregistrée dans
// events_visuels_decoration avec notes="Généré par IA (gpt-image-1)"
// — jamais confondue avec une photo réelle fournie par Renée-Lise,
// la distinction reste visible dans la bibliothèque de visuels.
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

  const { titre, occasion, theme, description } = body;
  if (!titre || typeof titre !== "string" || !titre.trim()) {
    return NextResponse.json({ error: "Titre requis." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "OPENAI_API_KEY non configurée dans Vercel → Settings → Environment Variables" }, { status: 500 });
  }

  const prompt = [
    "Photographie professionnelle d'une décoration d'événement élégante,",
    occasion ? `occasion : ${occasion},` : "",
    theme ? `thème : ${theme},` : "",
    description ? `détails : ${description},` : "",
    "lumière naturelle, mise en scène soignée, style Bella'Studio (Guyane française), sans texte ni logo sur l'image.",
  ].filter(Boolean).join(" ");

  try {
    const genRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model: "gpt-image-1", prompt, size: "1024x1024", n: 1 }),
    });
    if (!genRes.ok) {
      const errData = await genRes.json().catch(() => ({}));
      const errMsg = errData.error?.message || `Erreur OpenAI ${genRes.status}`;
      console.error("[ia/generer-visuel-decoration] OpenAI error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: genRes.status });
    }
    const genData = await genRes.json();
    let b64 = genData.data?.[0]?.b64_json as string | undefined;
    if (!b64 && genData.data?.[0]?.url) {
      const r = await fetch(genData.data[0].url);
      const buf = Buffer.from(await r.arrayBuffer());
      b64 = buf.toString("base64");
    }
    if (!b64) return NextResponse.json({ error: "Réponse OpenAI inattendue — aucune image reçue." }, { status: 502 });

    const binaire = Buffer.from(b64, "base64");
    const chemin = `decoration/ia-${Date.now()}.png`;
    const upload = await fetch(`${SB_URL}/storage/v1/object/stocks-images/${chemin}`, {
      method: "POST",
      headers: { apikey: SB_KEY, Authorization: `Bearer ${token}`, "Content-Type": "image/png" },
      body: binaire,
    });
    if (!upload.ok) return NextResponse.json({ error: "Échec de l'envoi de l'image générée au stockage." }, { status: 500 });
    const imageUrl = `${SB_URL}/storage/v1/object/public/stocks-images/${chemin}`;

    const { data: row, error: errInsert } = await sb.from("events_visuels_decoration").insert({
      titre: titre.trim(), occasion: occasion || null, theme: theme || null, image_url: imageUrl,
      notes: "Généré par IA (OpenAI gpt-image-1) — estimation visuelle, pas une photo réelle.",
      created_by: user.id,
    }).select("*").single();
    if (errInsert) return NextResponse.json({ error: errInsert.message }, { status: 500 });

    return NextResponse.json({ ok: true, visuel: row });
  } catch (e: any) {
    console.error("[ia/generer-visuel-decoration] erreur:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

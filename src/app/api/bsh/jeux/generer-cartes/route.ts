// ═══════════════════════════════════════════════════════════
// Génération de cartes BSH Secret Games par IA — Phase 4 du
// chantier, demandée explicitement : "Crée 30 cartes Audace pour
// un salon de 8 personnes", etc.
//
// Règles de sécurité tenues (cahier des charges fourni par
// Renée-Lise, section "L'IA doit rester un outil au service de la
// fondatrice") :
//   - Clé ANTHROPIC_API_KEY lue côté serveur uniquement, jamais
//     exposée au navigateur.
//   - Réservé à la fondatrice (vérification du rôle via le token
//     de la personne qui appelle, même mécanisme que
//     /api/ia/chat) — ni une cliente ni une hôtesse ne peut
//     générer de contenu.
//   - Les cartes générées sont TOUJOURS insérées statut='inactive'
//     (brouillon) : jamais publiées automatiquement. La fondatrice
//     les relit, les corrige si besoin et les active elle-même
//     depuis le Studio (✏ sur chaque carte, comme pour une carte
//     écrite à la main) — aucune carte IA n'atteint une cliente
//     sans validation explicite.
//   - `nombre` plafonné à 30 par appel pour éviter une dépense
//     incontrôlée.
// ═══════════════════════════════════════════════════════════
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
  if (authErr || !user) return NextResponse.json({ error: "Session invalide" }, { status: 401 });

  const { data: profile } = await sb.from("profiles").select("role").eq("id", user.id).single();
  if (!profile || profile.role !== "fondatrice") {
    return NextResponse.json({ error: "Réservé à la fondatrice" }, { status: 403 });
  }

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide" }, { status: 400 }); }

  const { jeuId, nombre, intensite, consigne } = body;
  if (!jeuId || typeof jeuId !== "string") {
    return NextResponse.json({ error: "jeuId requis" }, { status: 400 });
  }
  const n = Math.min(Math.max(parseInt(nombre) || 10, 1), 30);
  const niveauxValides = ["douceur", "mystere", "audace", "piment", "surprise"];
  const niveau = niveauxValides.includes(intensite) ? intensite : "audace";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY non configurée dans Vercel → Settings → Environment Variables" }, { status: 500 });
  }

  // Vérifie que le jeu existe (et appartient bien à la fondatrice via RLS —
  // si elle n'a pas les droits, cette lecture échoue avant tout appel IA).
  const { data: jeu, error: jeuErr } = await sb.from("bsh_jeux").select("id,nom,type_jeu,mode").eq("id", jeuId).single();
  if (jeuErr || !jeu) return NextResponse.json({ error: "Jeu introuvable" }, { status: 404 });

  const niveauxTexte: Record<string, string> = {
    douceur: "douces, romantiques, tendres — rien de provocant",
    mystere: "intrigantes, propices à la confidence, à la découverte de l'autre",
    audace: "osées mais élégantes, suggestives sans être explicites",
    piment: "joueuses, un peu plus hardies, toujours respectueuses du consentement",
    surprise: "variées en ton, imprévisibles",
  };

  const systemPrompt = `Tu rédiges des cartes pour "${jeu.nom}", un jeu Bella'Secret Home (BSH) — univers chic, élégant, mystérieux, jamais vulgaire ni explicite. Les cartes sont destinées à des adultes consentants.
Niveau d'intensité demandé : "${niveau}" (${niveauxTexte[niveau] || ""}).
Réponds UNIQUEMENT avec un tableau JSON valide, sans texte autour, sans balises markdown. Chaque élément : {"emoji": "...", "nom": "...", "question": "..."}.
"emoji" : un seul emoji pertinent. "nom" : un mot ou une courte étiquette (ex. "Confidence", "Action", "Vérité"). "question" : le texte complet de la carte, une phrase à l'impératif ou interrogative, en français, jamais vulgaire.
Génère exactement ${n} cartes, toutes différentes les unes des autres.`;

  const userPrompt = consigne && typeof consigne === "string" && consigne.trim()
    ? consigne.trim()
    : `Génère ${n} cartes pour ce jeu.`;

  let anthropicRes: Response;
  try {
    anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-5-5",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Réseau inaccessible : " + (e?.message || String(e)) }, { status: 502 });
  }

  const raw = await anthropicRes.text();
  if (!anthropicRes.ok) {
    let detail = "";
    try { detail = JSON.parse(raw)?.error?.message || ""; } catch {}
    return NextResponse.json({ error: detail || `Erreur Anthropic ${anthropicRes.status}` }, { status: anthropicRes.status });
  }

  let texte = "";
  try { texte = JSON.parse(raw)?.content?.[0]?.text || ""; }
  catch { return NextResponse.json({ error: "Réponse Anthropic illisible" }, { status: 500 }); }

  // Anthropic respecte en général la consigne "JSON seul", mais on nettoie
  // par prudence un éventuel bloc ```json ... ``` avant de parser.
  const nettoye = texte.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "");
  let cartesGenerees: any[];
  try {
    cartesGenerees = JSON.parse(nettoye);
    if (!Array.isArray(cartesGenerees)) throw new Error("pas un tableau");
  } catch {
    return NextResponse.json({ error: "L'IA n'a pas renvoyé un JSON exploitable — réessaie, ou reformule la consigne." }, { status: 502 });
  }

  // Ordre de départ = après les cartes déjà présentes dans ce jeu.
  const { data: dernieresCartes } = await sb
    .from("bsh_jeux_cartes")
    .select("ordre")
    .eq("jeu_id", jeuId)
    .order("ordre", { ascending: false })
    .limit(1);
  let ordreDepart = (dernieresCartes?.[0]?.ordre || 0) + 1;

  const lignes = cartesGenerees
    .filter((c) => c && typeof c.question === "string" && c.question.trim())
    .slice(0, n)
    .map((c) => ({
      emoji: typeof c.emoji === "string" && c.emoji.trim() ? c.emoji.trim() : "🎴",
      nom: typeof c.nom === "string" && c.nom.trim() ? c.nom.trim() : "Carte",
      question: c.question.trim(),
      ordre: ordreDepart++,
      statut: "inactive", // brouillon — jamais publié automatiquement
      jeu_id: jeuId,
      intensite: niveau,
    }));

  if (lignes.length === 0) {
    return NextResponse.json({ error: "Aucune carte exploitable dans la réponse de l'IA." }, { status: 502 });
  }

  const { data: inserees, error: insertErr } = await sb.from("bsh_jeux_cartes").insert(lignes).select();
  if (insertErr) {
    return NextResponse.json({ error: "Échec de l'enregistrement : " + insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ cartes: inserees, demandees: n, generees: lignes.length });
}

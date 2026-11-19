// ═══════════════════════════════════════════════════════════
// Moteur d'import centralisé Bella'Food / Vil'Dor — traitement d'UN
// élément de la file persistante (bibliotheque_fiches).
//  • Droits : Bella'Food = fondatrice ou permission bibliotheque.gerer ;
//    Vil'Dor = membres de SON organisation uniquement (séparation stricte).
//  • Verrou de traitement : un élément n'est jamais traité deux fois en
//    même temps ; un verrou de plus de 5 min est repris (interruption).
//  • Ordre des méthodes : SANS IA d'abord (recette structurée publiée
//    par le site, schema.org/Recipe), puis IA (texte, image, PDF) sous
//    quota et budget, journalisée avec son coût estimé.
//  • Rien n'est inventé : champ absent = null + listé comme manquant.
//  • Recette existante → « doublon », AUCUNE création ; sinon recette
//    « à valider ». Jamais de publication automatique.
// ═══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { permisUtilisateur } from "@/lib/permissions";
import { limitesIA, reserverIA, solderIA, coutEstime } from "@/lib/iaUsage";
import { recupererPage, recetteJsonLd, texteDeHtml, meta } from "@/lib/urlSure";

export const maxDuration = 60;
const MODELE = "claude-sonnet-5-5";
const BUCKET = "equipe-prive";
export const RUBRIQUES = ["recette", "sous_recette", "plat", "dessert", "patisserie", "boisson", "en_cas", "sauce", "ingredient", "fournisseur", "achat", "stock", "cout_marge", "menu", "hygiene", "allergenes", "tracabilite", "communication", "a_classer"] as const;
const RECETTE_LIKE = new Set(["recette", "sous_recette", "plat", "dessert", "patisserie", "boisson", "en_cas", "sauce"]);
const RESEAUX = /(^|\.)(instagram\.com|tiktok\.com|pinterest\.[a-z.]+|pin\.it|youtube\.com|youtu\.be|facebook\.com)$/i;
const ALTERNATIVES = "Extraction directe impossible depuis cette plateforme (accès restreint). Alternatives : importer une capture d'écran de la recette, importer la vidéo si vous en avez les droits, coller la description ou la transcription, ou compléter à la main.";

const CONSIGNE = `Tu analyses un document importé dans l'atelier professionnel d'une entreprise de restauration (Guyane française).
1. Classe-le dans UNE rubrique : ${RUBRIQUES.join(", ")} ("a_classer" si tu ne sais pas).
2. Si c'est une recette ou une fiche technique, extrais UNIQUEMENT ce qui est écrit ou visible. RÈGLE ABSOLUE : n'invente rien. Une information absente vaut null et doit figurer dans "manquant". N'estime jamais une difficulté, un temps, une quantité ou un allergène.
3. Allergènes : recopie seulement ce que le document indique explicitement (sinon null). Une absence de mention n'est pas une absence d'allergène.
4. Signale toute contradiction interne (ex. temps différent entre deux endroits, ingrédient listé mais jamais utilisé) avec les extraits exacts.
5. Si c'est une photo de plat ou un visuel, indique le nom du plat représenté s'il est lisible ou évident (sinon null).
Réponds UNIQUEMENT par un objet JSON valide :
{"rubrique":"...","confiance":0.0-1.0,"resume":"une phrase","plat_represente":null,
 "recette":null | {"nom":"...","categorie":"patisserie|dessert|plat|boisson|sauce|street_food|accompagnement|autre","rendement":null,"nb_parts":null,"temps_prepa":null,"temps_cuisson":null,"temps_repos":null,"temperature":null,
   "ingredients":[{"nom":"...","quantite":null,"unite":null,"notes":null}],"etapes":["..."],"astuces":["..."],"materiel":["..."],"conservation":null,"allergenes_fiche":null},
 "manquant":["..."],"contradictions":[{"sujet":"...","extraits":["« ... »","« ... »"]}]}`;

function jsonDe(texte: string): any {
  const m = texte.match(/\{[\s\S]*\}/); if (!m) throw new Error("Réponse IA illisible.");
  return JSON.parse(m[0]);
}
const minutes = (iso?: string | null) => { if (!iso) return null; const m = String(iso).match(/P(?:T(?:(\d+)H)?(?:(\d+)M)?)/i); return m ? (Number(m[1] || 0) * 60 + Number(m[2] || 0)) || null : null; };

function depuisJsonLd(r: any, url: string) {
  const ing = (Array.isArray(r.recipeIngredient) ? r.recipeIngredient : []).map((t: string) => ({ nom: String(t).trim(), quantite: null, unite: null, notes: "texte d'origine — quantité à structurer" }));
  const etapes = (Array.isArray(r.recipeInstructions) ? r.recipeInstructions : [r.recipeInstructions]).flatMap((e: any) => !e ? [] : typeof e === "string" ? [e] : e.itemListElement ? e.itemListElement.map((x: any) => x.text || x.name) : [e.text || e.name]).filter(Boolean).map((x: string) => texteDeHtml(String(x), 2000));
  const manquant = [!ing.length && "ingrédients", !etapes.length && "étapes", !r.recipeYield && "rendement / portions", "allergènes (non indiqués par la source)"].filter(Boolean) as string[];
  return { rubrique: "recette", confiance: 0.95, resume: `Recette publiée par ${new URL(url).hostname}`, plat_represente: null,
    recette: { nom: String(r.name || "").trim() || null, categorie: "autre", rendement: Array.isArray(r.recipeYield) ? r.recipeYield.join(" / ") : r.recipeYield || null, nb_parts: null,
      temps_prepa: minutes(r.prepTime), temps_cuisson: minutes(r.cookTime), temps_repos: null, temperature: null, ingredients: ing, etapes, astuces: [], materiel: [], conservation: null, allergenes_fiche: null },
    manquant, contradictions: [], image: Array.isArray(r.image) ? (typeof r.image[0] === "string" ? r.image[0] : r.image[0]?.url) : typeof r.image === "string" ? r.image : r.image?.url || null };
}

async function appelIA(contenu: any[], apiKey: string) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model: MODELE, max_tokens: 4000, system: CONSIGNE, messages: [{ role: "user", content: contenu }] }),
  });
  const brut = await r.text();
  if (!r.ok) throw new Error(`IA indisponible (HTTP ${r.status}).`);
  const d = JSON.parse(brut);
  const texte = (d.content || []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
  return { resultat: jsonDe(texte), entree: d.usage?.input_tokens || 0, sortie: d.usage?.output_tokens || 0 };
}

export async function POST(req: NextRequest) {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, SRV = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SRV) return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 503 });
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton || jeton === ANON) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  const admin = createClient(SB_URL, SRV);

  let body: any; try { body = await req.json(); } catch { return NextResponse.json({ error: "Requête invalide." }, { status: 400 }); }
  const id = String(body?.fiche_id || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Élément invalide." }, { status: 400 });
  const { data: fiche } = await admin.from("bibliotheque_fiches").select("*").eq("id", id).maybeSingle();
  if (!fiche) return NextResponse.json({ error: "Élément introuvable." }, { status: 404 });

  // ── Droits : séparation stricte des espaces
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  let autorise = false;
  if (fiche.espace === "VILDOR") {
    if (fiche.organisation_id) { const { data } = await sb.rpc("membre_organisation", { org: fiche.organisation_id }); autorise = data === true; }
    autorise = autorise || profil?.role === "fondatrice";
  } else autorise = await permisUtilisateur(sb, "bibliotheque.gerer", "FOOD", profil?.role);
  if (!autorise) return NextResponse.json({ error: "Accès non autorisé à cet espace." }, { status: 403 });

  // ── Verrou (reprise si interruption > 5 min)
  const limite = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data: verrou } = await admin.from("bibliotheque_fiches").update({ etat: "analyse", verrou_le: new Date().toISOString() })
    .eq("id", id).in("etat", ["recu", "en_attente", "erreur", "a_classer", "a_completer", "analyse"]).or(`verrou_le.is.null,verrou_le.lt."${limite}"`).select("id");
  if (!verrou?.length) return NextResponse.json({ error: "Élément déjà en cours de traitement ou déjà traité." }, { status: 409 });

  const fin = async (patch: any) => { await admin.from("bibliotheque_fiches").update({ ...patch, verrou_le: null, tentatives: (fiche.tentatives || 0) + 1, traite_le: new Date().toISOString(), updated_at: new Date().toISOString(), historique: [...(fiche.historique || []), { le: new Date().toISOString(), action: patch.etat, methode: patch.methode || null }] }).eq("id", id); };
  const espaceIA = fiche.espace === "VILDOR" ? "VILDOR" : "BELLAFOOD";

  try {
    let resultat: any = null; let methode = ""; let cout = 0; let texte = fiche.texte_extrait || "";
    const contenu: any[] = [];

    if (fiche.source_url) {
      const hote = (() => { try { return new URL(fiche.source_url).hostname; } catch { return ""; } })();
      let page: { url: string; html: string } | null = null;
      try { page = await recupererPage(fiche.source_url); } catch (e: any) {
        if (RESEAUX.test(hote)) { await fin({ etat: "a_completer", methode: "lien", derniere_erreur: ALTERNATIVES }); return NextResponse.json({ ok: true, etat: "a_completer", message: ALTERNATIVES }); }
        throw e;
      }
      const ld = recetteJsonLd(page.html);
      if (ld) { resultat = depuisJsonLd(ld, page.url); methode = "jsonld_sans_ia"; }
      else {
        texte = [meta(page.html, "og:title"), meta(page.html, "og:description"), texteDeHtml(page.html, 30000)].filter(Boolean).join("\n");
        if (RESEAUX.test(hote) && texte.length < 400) { await fin({ etat: "a_completer", methode: "lien", texte_extrait: texte.slice(0, 20000), derniere_erreur: ALTERNATIVES }); return NextResponse.json({ ok: true, etat: "a_completer", message: ALTERNATIVES }); }
      }
    } else if (fiche.storage_path) {
      const { data: blob, error } = await admin.storage.from(BUCKET).download(fiche.storage_path);
      if (error || !blob) throw new Error("Fichier original introuvable dans le stockage privé.");
      const type = String(fiche.type_mime || blob.type || "");
      const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      if (/^image\/(jpeg|png|webp|gif)$/.test(type)) { if (b64.length > 7_000_000) throw new Error("Image trop lourde (5 Mo max) : réduisez-la."); contenu.push({ type: "image", source: { type: "base64", media_type: type, data: b64 } }); methode = "ia_vision"; }
      else if (type === "application/pdf") { if (b64.length > 20_000_000) throw new Error("PDF trop lourd (15 Mo max)."); contenu.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: b64 } }); methode = "ia_pdf"; }
      else if (/^text\//.test(type)) { texte = Buffer.from(b64, "base64").toString("utf-8").slice(0, 60000); }
      else if (/^(audio|video)\//.test(type)) {
        const msg = "Fichier audio / vidéo conservé. La transcription automatique n'est pas encore branchée : utilisez la dictée vocale de l'iPhone, collez la transcription ou les sous-titres, ou importez une capture.";
        await fin({ etat: "a_completer", methode: "media", derniere_erreur: msg }); return NextResponse.json({ ok: true, etat: "a_completer", message: msg });
      } else if (!texte) throw new Error(`Format non pris en charge (${type || "inconnu"}).`);
    }

    if (!resultat) {
      if (!contenu.length) { if (!texte.trim()) throw new Error("Aucun contenu lisible."); contenu.push({ type: "text", text: `Document « ${fiche.titre || fiche.nom_fichier || ""} » :\n\n${texte.slice(0, 60000)}` }); methode = methode || "ia_texte"; }
      else contenu.push({ type: "text", text: `Nom du fichier : ${fiche.nom_fichier || fiche.titre || "inconnu"}` });
      const lim = await limitesIA(admin, espaceIA);
      const coutMax = coutEstime(lim, 60000, 4000);   // plafond réservé (document maximal + réponse maximale)
      const resa = await reserverIA(admin, espaceIA, user.id, "food/import/traiter", coutMax);
      if (!resa.ok) { await admin.from("bibliotheque_fiches").update({ etat: "en_attente", verrou_le: null, derniere_erreur: resa.raison }).eq("id", id); return NextResponse.json({ ok: false, suspendu: true, message: resa.raison }, { status: 429 }); }
      const apiKey = process.env.ANTHROPIC_API_KEY; if (!apiKey) { await solderIA(admin, resa.id, { entree: 0, sortie: 0, cout: 0, modele: MODELE, cible: id, ok: false }); throw new Error("Clé IA non configurée."); }
      let ia;
      try { ia = await appelIA(contenu, apiKey); }
      catch (e) { await solderIA(admin, resa.id, { entree: 0, sortie: 0, cout: 0, modele: MODELE, cible: id, ok: false }); throw e; }
      cout = coutEstime(lim, ia.entree, ia.sortie);
      await solderIA(admin, resa.id, { entree: ia.entree, sortie: ia.sortie, cout, modele: MODELE, cible: id, ok: true });
      resultat = ia.resultat;
    }

    const rubrique = RUBRIQUES.includes(resultat?.rubrique) ? resultat.rubrique : "a_classer";
    const rec = resultat?.recette && resultat.recette.nom ? resultat.recette : null;
    const patch: any = { methode, cout_estime_eur: cout, rubrique_proposee: rubrique, confiance: Number(resultat?.confiance) || null, texte_extrait: texte ? texte.slice(0, 20000) : fiche.texte_extrait,
      informations_manquantes: Array.isArray(resultat?.manquant) ? resultat.manquant.slice(0, 30).map(String) : [], contradictions: Array.isArray(resultat?.contradictions) ? resultat.contradictions.slice(0, 20) : [],
      allergenes_fiche: rec?.allergenes_fiche || "non indiqués", derniere_erreur: null };

    // Image d'un plat : association PROPOSÉE à une recette existante (à confirmer).
    if (resultat?.plat_represente && !rec) {
      const { data: m } = await admin.from("food_recettes").select("id").ilike("nom", String(resultat.plat_represente).slice(0, 80)).limit(1);
      if (m?.[0]) patch.recette_proposee_id = m[0].id;
    }
    let etat = rubrique === "a_classer" ? "a_classer" : "a_valider";
    if (rec && RECETTE_LIKE.has(rubrique)) {
      const j = { ...rec, code: fiche.code || null, cat_biblio: fiche.categorie || null, manquant: patch.informations_manquantes, contradictions: patch.contradictions, allergenes_fiche: patch.allergenes_fiche, lot: null };
      if (fiche.espace === "VILDOR") {
        // Recettes Vil'Dor : JAMAIS dans les recettes Bella'Food. Extraction conservée sur la fiche de SON espace.
        patch.extraction = j; patch.titre = rec.nom;
      } else {
        const { data: r } = await admin.rpc("biblio_importer_fiche", { p_drive: id, j });
        if (String(r || "").startsWith("doublon")) etat = "doublon";
      }
    } else if (rec) { patch.extraction = rec; }
    if (!rec && RECETTE_LIKE.has(rubrique)) etat = "a_completer";
    patch.etat = etat;
    if (resultat?.image && !fiche.notes) patch.notes = `Image proposée par la source : ${resultat.image}`;
    await fin(patch);
    return NextResponse.json({ ok: true, etat, rubrique, methode, cout });
  } catch (e: any) {
    await fin({ etat: "erreur", derniere_erreur: String(e?.message || e).slice(0, 500) });
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 422 });
  }
}

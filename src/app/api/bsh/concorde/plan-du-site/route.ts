// ═══════════════════════════════════════════════════════════
// Concorde Pro — propositions de photos depuis les sources PUBLIQUES (LECTURE SEULE)
// • Réservé à la fondatrice (vérifié côté serveur).
// • Sources : plan du site officiel (déclaré dans robots.txt) et fichier article_negoce.csv
//   mis à disposition des clients. Aucun jeton, aucune recherche automatisée sur le site
//   (interdite par robots.txt), aucune image téléchargée ni enregistrée.
// • Correspondance : référence Bellaïa → code-barres (article_negoce) → fiche du plan du site
//   dont l'adresse se termine par ce code-barres. Code-barres ambigu = aucune correspondance.
// • Les tarifs du fichier fournisseur ne sont jamais renvoyés.
// ═══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { lignesDepuisPlanDuSite, propositionsBSH } from "@/lib/concordeExport";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const PLAN = process.env.CONCORDE_PLAN_DU_SITE_URL || "https://www.concordepro.com/1_fr_0_sitemap.xml";
const NEGOCE = process.env.CONCORDE_NEGOCE_URL || "https://www.concordepro.com/clients/article_negoce.csv";

async function lire(url: string, latin1 = false) {
  const r = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(40000), headers: { "User-Agent": "Bellaia-catalogue (lecture du plan du site)" } });
  if (!r.ok) throw new Error(`${new URL(url).pathname} : HTTP ${r.status}`);
  const b = await r.arrayBuffer();
  return new TextDecoder(latin1 ? "windows-1252" : "utf-8").decode(b);
}

export async function GET(req: NextRequest) {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!SB_URL || !ANON) return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 503 });
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton || jeton === ANON) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "fondatrice") return NextResponse.json({ error: "Réservé à la fondatrice." }, { status: 403 });

  const { data: stocks, error } = await sb.from("stocks").select("id,nom,nom_produit,notes,prix_vente,prix_achat,quantite,statut,categorie,image_url,usage_conseils").or("univers.ilike.%bsh%,branche.ilike.%bsh%").limit(5000);
  if (error) return NextResponse.json({ ok: false, etape: "base", message: "Lecture des produits BSH impossible." }, { status: 500 });
  let plan = "", negoce = "";
  try { [plan, negoce] = await Promise.all([lire(PLAN), lire(NEGOCE, true)]); }
  catch (e: any) { return NextResponse.json({ ok: false, etape: "sources", message: "Sources publiques Concorde Pro injoignables : " + String(e?.message || e) }); }
  if (!/<urlset/i.test(plan.slice(0, 2000))) return NextResponse.json({ ok: false, etape: "sources", message: "Le plan du site n'a pas le format attendu." });
  const { lignes, eanAmbigus } = lignesDepuisPlanDuSite(plan, negoce);
  const props = propositionsBSH(lignes, (stocks || []).map((s: any) => ({ ...s, nom: s.nom_produit || s.nom })), undefined, { descriptionRequise: false });
  const compte = (c: string) => props.filter(p => p.classe === c).length;
  return NextResponse.json({ ok: true, source: "plan_du_site", genere_le: new Date().toISOString(),
    resume: { produits: props.length, pret: compte("pret"), incomplet: compte("incomplet"), attente: compte("attente"), introuvable: compte("introuvable"), avec_photo: props.filter(p => p.fournisseur?.images.length).length, codes_barres_ambigus: eanAmbigus },
    note: "Propositions seulement : rien n'est écrit. Droits d'utilisation commerciale des photos à confirmer par écrit par Concorde Pro.",
    propositions: props });
}

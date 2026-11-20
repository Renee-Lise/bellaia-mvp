// ═══════════════════════════════════════════════════════════
// Concorde Pro — diagnostic du flux catalogue (LECTURE SEULE)
// • Réservé à la fondatrice (vérifié côté serveur).
// • L'adresse d'export (avec son jeton) est lue dans la variable serveur
//   CONCORDE_PRO_CATALOG_URL ; elle n'est JAMAIS renvoyée, journalisée
//   ni incluse dans un message d'erreur.
// • N'écrit rien en base, ne télécharge ni n'enregistre aucune image :
//   compte les colonnes, références, images principales / secondaires,
//   stocks, prix, codes-barres ; rapproche des produits BSH de Bellaïa ;
//   teste l'accès à quelques images (en-têtes seulement).
// ═══════════════════════════════════════════════════════════
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analyserExport, lignesExport, propositionsBSH } from "@/lib/concordeExport";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const masquer = (s: string, secret: string) => (secret ? s.split(secret).join("[adresse masquée]") : s).replace(/token=[^&\s"']+/gi, "token=***");

export async function GET(req: NextRequest) {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const SOURCE = process.env.CONCORDE_PRO_CATALOG_URL || "";
  if (!SB_URL || !ANON) return NextResponse.json({ error: "Configuration serveur incomplète." }, { status: 503 });
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  if (!jeton || jeton === ANON) return NextResponse.json({ error: "Connexion requise." }, { status: 401 });
  const sb = createClient(SB_URL, ANON, { global: { headers: { Authorization: `Bearer ${jeton}` } } });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return NextResponse.json({ error: "Session expirée." }, { status: 401 });
  const { data: profil } = await sb.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (profil?.role !== "fondatrice") return NextResponse.json({ error: "Réservé à la fondatrice." }, { status: 403 });
  if (!SOURCE) return NextResponse.json({ ok: false, etape: "configuration", message: "La variable serveur CONCORDE_PRO_CATALOG_URL n'est pas définie dans cet environnement (elle n'existe qu'en production)." });

  // Références BSH (lecture sous les droits de la fondatrice)
  const { data: stocks } = await sb.from("stocks").select("id,nom,nom_produit,notes,prix_vente,prix_achat,quantite,statut,categorie,image_url,usage_conseils").or("univers.ilike.%bsh%,branche.ilike.%bsh%").limit(5000);
  const refs = (stocks || []).map((s: any) => (String(s.notes || "").match(/R[ée]f\.?\s?([0-9A-Za-z\-]+)/) || [])[1]).filter(Boolean) as string[];

  let texte = "", statut = 0, type = "";
  try {
    const r = await fetch(SOURCE, { cache: "no-store", signal: AbortSignal.timeout(40000), headers: { "User-Agent": "Bellaia-diagnostic" } });
    statut = r.status; type = r.headers.get("content-type") || "";
    if (!r.ok) return NextResponse.json({ ok: false, etape: "flux", http: statut, message: statut === 401 || statut === 403 ? "Accès refusé par Concorde Pro : jeton probablement expiré ou révoqué (voir la procédure de renouvellement)." : `Le flux a répondu HTTP ${statut}.` });
    texte = await r.text();
  } catch (e: any) {
    return NextResponse.json({ ok: false, etape: "flux", message: masquer("Flux injoignable : " + String(e?.name === "TimeoutError" ? "délai dépassé (40 s)" : e?.message || e), SOURCE) });
  }
  if (/<html/i.test(texte.slice(0, 500))) return NextResponse.json({ ok: false, etape: "flux", http: statut, type, message: "Le flux a renvoyé une page HTML au lieu d'un fichier CSV (jeton invalide ou export désactivé ?)." });

  // Mode « propositions » : rattachements proposés produit par produit (lecture seule ; la fondatrice valide dans l'interface)
  if (req.nextUrl.searchParams.get("propositions") === "1") {
    const props = propositionsBSH(lignesExport(texte), (stocks || []).map((s: any) => ({ ...s, nom: s.nom_produit || s.nom })));
    const compte = (c: string) => props.filter(p => p.classe === c).length;
    return NextResponse.json({ ok: true, genere_le: new Date().toISOString(), resume: { pret: compte("pret"), incomplet: compte("incomplet"), attente: compte("attente"), introuvable: compte("introuvable") }, propositions: props });
  }
  const a = analyserExport(texte, refs);
  // Accès aux images : en-têtes seulement, sans rien enregistrer ; avec et sans « Referer » (blocage du hotlinking)
  const origine = process.env.NEXT_PUBLIC_APP_URL || "https://bellaia.app";
  const tests = await Promise.all(a.echantillon_images.map(async (u) => {
    const essai = async (referer?: string) => {
      try {
        const r = await fetch(u, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000), headers: referer ? { Referer: referer } : {} });
        return { http: r.status, type: r.headers.get("content-type") || "", octets: Number(r.headers.get("content-length") || 0) };
      } catch (e: any) { return { http: 0, type: "", octets: 0, erreur: String(e?.name || "erreur") }; }
    };
    return { image: u, direct: await essai(), depuis_bellaia: await essai(origine) };
  }));
  const { echantillon_images, ...resume } = a;
  return NextResponse.json({ ok: true, http: statut, type, octets: texte.length, ...resume, test_images: tests,
    note: "Lecture seule : aucune image n'a été enregistrée ni rattachée. Droits d'utilisation à confirmer par Concorde Pro avant tout import." });
}

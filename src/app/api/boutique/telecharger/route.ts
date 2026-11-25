// GET /api/boutique/telecharger?produit=<id> — lien de téléchargement valable 5 minutes, seulement si
// la personne connectée possède un droit actif sur ce produit (contrôle fait par la base, journalisé).
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { boutiqueOuverte, sbServeur } from "@/lib/boutiqueServeur";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  if (!boutiqueOuverte()) return NextResponse.json({ error: "Boutique fermée." }, { status: 503 });
  const produit = req.nextUrl.searchParams.get("produit") || "";
  if (!UUID.test(produit)) return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, sb = sbServeur();
  if (!jeton || !url || !anon || !sb) return NextResponse.json({ error: "Connectez-vous pour télécharger." }, { status: 401 });
  // L'appel est fait AU NOM de la personne : la base vérifie son droit et journalise le téléchargement.
  const perso = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } });
  const { data: chemin, error } = await perso.rpc("boutique_noter_telechargement", { p_produit: produit });
  if (error || typeof chemin !== "string") return NextResponse.json({ error: "Vous ne possédez pas ce produit." }, { status: 403 });
  const nom = chemin.split("/").pop() || "document";
  const { data: lien, error: e2 } = await sb.storage.from("boutique-fichiers").createSignedUrl(chemin, 300, { download: nom });
  if (e2 || !lien) return NextResponse.json({ error: "Fichier momentanément indisponible." }, { status: 502 });
  return NextResponse.json({ url: lien.signedUrl, expire_dans_s: 300, fichier: nom });
}

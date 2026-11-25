// POST /api/boutique/obtenir — ajoute un produit GRATUIT à la bibliothèque de la personne connectée.
// L'appel est fait en son nom : la base vérifie que le produit est publié, numérique et à 0 €.
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { boutiqueOuverte } from "@/lib/boutiqueServeur";

export async function POST(req: NextRequest) {
  if (!boutiqueOuverte()) return NextResponse.json({ error: "La boutique n'est pas encore ouverte." }, { status: 503 });
  const jeton = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "").trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!jeton || !url || !anon) return NextResponse.json({ error: "Connectez-vous pour recevoir ce document." }, { status: 401 });
  let corps: any; try { corps = await req.json(); } catch { return NextResponse.json({ error: "Demande invalide." }, { status: 400 }); }
  const produit = typeof corps?.produit === "string" ? corps.produit : "";
  if (!/^[0-9a-f-]{36}$/i.test(produit)) return NextResponse.json({ error: "Produit invalide." }, { status: 400 });
  const sb = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${jeton}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc("boutique_obtenir_gratuit", { p_produit: produit });
  if (error) return NextResponse.json({ error: "Ce document n'est pas disponible gratuitement." }, { status: 403 });
  return NextResponse.json({ droit: data });
}

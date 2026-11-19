"use client";
// Aperçu de la bibliothèque cliente BSH Secret Stories — PRÉVISUALISATION uniquement (désactivé en production).
// Le contenu dépend des contrôles serveur (adulte vérifiée, achats, abonnement).
import BibliothequeSecretStories from "../../../modules/secretStories/BibliothequeSecretStories";
export default function Apercu() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  return <BibliothequeSecretStories />;
}

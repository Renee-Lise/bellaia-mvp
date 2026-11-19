"use client";
// Aperçu du studio BSH Secret Stories — PRÉVISUALISATION uniquement (désactivé en production).
// Sans migration 0129 : mode simulation, rien n'est enregistré.
import StudioSecretStories from "../../../modules/secretStories/StudioSecretStories";
export default function Apercu() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  return <StudioSecretStories />;
}

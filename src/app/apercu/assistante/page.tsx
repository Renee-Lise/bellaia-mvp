"use client";
// Aperçu du portail assistante — PRÉVISUALISATION uniquement (désactivé en production).
// Les données affichées sont celles de la session connectée, selon les règles d'accès en base.
import PortailAssistante from "../../../modules/portails/PortailAssistante";
export default function Apercu() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  return <PortailAssistante />;
}

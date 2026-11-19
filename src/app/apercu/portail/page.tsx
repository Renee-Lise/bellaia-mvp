"use client";
// Aperçu du portail fondatrice premium — PRÉVISUALISATION uniquement (désactivé en production).
// Les données affichées respectent les règles d'accès : hors session fondatrice, les indicateurs restent vides.
import PortailFondatrice from "../../../modules/portails/PortailFondatrice";
export default function ApercuPortail() {
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  return <PortailFondatrice />;
}

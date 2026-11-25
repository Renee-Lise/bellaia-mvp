// Icônes vectorielles harmonisées (trait 1,6 px, 24×24) — remplacent les émojis dans les nouvelles interfaces.
import React from "react";

const TRACES: Record<string, string> = {
  panier: "M6 7h12l-1.2 11.2a2 2 0 0 1-2 1.8H9.2a2 2 0 0 1-2-1.8L6 7Zm3 0V6a3 3 0 0 1 6 0v1",
  telecharger: "M12 4v11m0 0 4-4m-4 4-4-4M5 19h14",
  livre: "M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15H7.5A2.5 2.5 0 0 0 5 20.5v-15Zm0 15A2.5 2.5 0 0 1 7.5 18H19",
  retour: "M15 6l-6 6 6 6",
  fermer: "M6 6l12 12M18 6 6 18",
  verrou: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6z",
  coche: "M5 12.5l4.5 4.5L19 7",
  oeil: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Zm9.5 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
  aide: "M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6V14m0 3.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z",
  plus: "M12 5v14M5 12h14",
  moins: "M5 12h14",
};

export function Icone({ nom, taille = 20, couleur = "currentColor", titre }: { nom: keyof typeof TRACES | string; taille?: number; couleur?: string; titre?: string }) {
  return (
    <svg width={taille} height={taille} viewBox="0 0 24 24" fill="none" stroke={couleur} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" aria-hidden={titre ? undefined : true} role={titre ? "img" : undefined}>
      {titre ? <title>{titre}</title> : null}
      <path d={TRACES[nom] || TRACES.aide} />
    </svg>
  );
}

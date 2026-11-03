"use client";
// ═══════════════════════════════════════════════════════════
// Logo Bellaïa — src/components/BellaiaLogo.tsx
//
// Composant partagé pour les 3 emplacements de BellaiaApp.tsx (écran
// de connexion, en-tête client, en-tête fondatrice) + la page
// d'accueil cliente. Affiche le logo officiel fourni par Renée-Lise
// (public/branding/bellaia-logo-400.webp) par défaut, et bascule
// automatiquement sur la version choisie depuis l'espace fondatrice
// (module Identité visuelle, migration 0076) dès qu'une version y
// est active — sans aucune modification de code, comme demandé.
//
// <img> classique plutôt que next/image : la source peut être un
// fichier local du dépôt OU une URL Supabase Storage distante
// (après remplacement par la fondatrice), et next/image exigerait de
// déclarer ce domaine distant à l'avance dans next.config — <img>
// avec object-fit:contain reste fiable dans les deux cas, cohérent
// avec le reste de BellaiaApp.tsx qui utilise déjà <img> partout.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { getLogoActif } from "../modules/identite/identiteApi";

const LOGO_PAR_DEFAUT = "/branding/bellaia-logo-400.webp";

// Cache module-level partagé entre toutes les instances affichées
// simultanément (évite un appel réseau par emplacement de logo).
let urlPromise: Promise<string> | null = null;
function urlLogoActif(): Promise<string> {
  if (!urlPromise) {
    urlPromise = getLogoActif()
      .then((v) => v?.url || LOGO_PAR_DEFAUT)
      .catch(() => LOGO_PAR_DEFAUT);
  }
  return urlPromise;
}

export default function BellaiaLogo({
  size = 72,
  alt = "Bellaïa",
  rounded = true,
  style,
}: {
  size?: number;
  alt?: string;
  rounded?: boolean;
  style?: React.CSSProperties;
}) {
  const [src, setSrc] = useState(LOGO_PAR_DEFAUT);

  useEffect(() => {
    let actif = true;
    urlLogoActif().then((u) => { if (actif) setSrc(u); });
    return () => { actif = false; };
  }, []);

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        borderRadius: rounded ? "50%" : 0,
        flexShrink: 0,
        ...style,
      }}
    />
  );
}

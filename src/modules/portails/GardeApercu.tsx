"use client";
// Pages /apercu/* : réservées à la FONDATRICE connectée (vérifié en base via mes_acces).
// Une assistante, une cliente, une hôte ou un visiteur qui saisit l'adresse ne voit rien.
import React, { useEffect, useState } from "react";
import { mesAcces } from "../equipe/equipeLib";

export default function GardeApercu({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  useEffect(() => {
    // Hors de l'application, la session n'est pas chargée : on reprend le jeton de connexion de l'appareil.
    const w = window as any;
    if (!w.getTokenAsync) w.getTokenAsync = async () => { try { return localStorage.getItem("bellaia_token") || ""; } catch { return ""; } };
    mesAcces().then(a => setOk(!!a.fondatrice)).catch(() => setOk(false));
  }, []);
  if (process.env.NEXT_PUBLIC_VERCEL_ENV === "production") return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu indisponible.</div>;
  if (ok === null) return <div style={{ padding: 30, fontFamily: "system-ui", color: "#888" }}>Vérification de l'accès…</div>;
  if (!ok) return <div style={{ padding: 30, fontFamily: "system-ui" }}>Aperçu réservé à la fondatrice. Connectez-vous d'abord dans l'application, puis rouvrez ce lien.</div>;
  return <>{children}</>;
}

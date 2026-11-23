"use client";
// Acceptation d'une invitation à usage unique (créée par la fondatrice après acceptation d'un dossier).
// La personne doit être connectée avec l'adresse invitée et accepter les conditions ; les rôles sont
// attribués en base par accepter_invitation (0137). Rien n'est accordé côté application.
import React, { useState } from "react";
import { sbRpc } from "../events/eventsAtelierLib";

export const CONDITIONS_VERSION = "conditions-collaboration-v1-2026-11";
const T = { fond: "#faf6ef", texte: "#1c2246", doux: "rgba(28,34,70,0.62)", ligne: "rgba(28,34,70,0.14)", vert: "#3f7d5b", rouge: "#b4523f" };

export default function InvitationAccepter({ jeton, onTermine }: { jeton: string; onTermine: (accepte: boolean) => void }) {
  const [coche, setCoche] = useState(false);
  const [etat, setEtat] = useState<"" | "envoi" | "ok" | string>("");
  const valider = async () => {
    setEtat("envoi");
    try { await sbRpc("accepter_invitation", { p_jeton: jeton, p_conditions_version: CONDITIONS_VERSION }); setEtat("ok"); }
    catch (e: any) { const m = String(e?.message || e); setEtat(/does not exist|PGRST202|Could not find the function/i.test(m) ? "Les invitations ne sont pas encore ouvertes. Réessayez plus tard." : m); }
  };
  return (
    <div style={{ minHeight: "100dvh", background: T.fond, color: T.texte, fontFamily: "-apple-system, system-ui, sans-serif", padding: "calc(env(safe-area-inset-top,0px) + 24px) 18px 40px" }}>
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 style={{ fontFamily: "Georgia, serif", fontSize: 24 }}>Invitation Bellaïa</h1>
        {etat === "ok" ? <>
          <p style={{ color: T.vert }}>Invitation acceptée. Votre espace professionnel est disponible dans « Mes espaces ».</p>
          <button style={{ minHeight: 44, padding: "10px 18px", borderRadius: 22, border: "none", background: T.texte, color: "#fff", fontSize: 15 }} onClick={() => onTermine(true)}>Continuer</button>
        </> : <>
          <p style={{ color: T.doux, lineHeight: 1.5 }}>Vous avez été invitée ou invité à rejoindre l'équipe Bellaïa. L'invitation n'est valable qu'une fois, pour l'adresse à laquelle elle a été remise.</p>
          <label style={{ display: "flex", gap: 10, alignItems: "flex-start", margin: "16px 0", fontSize: 15 }}>
            <input type="checkbox" checked={coche} onChange={e => setCoche(e.target.checked)} style={{ width: 22, height: 22 }} />
            <span>J'accepte les conditions de collaboration Bellaïa et le traitement de mes données nécessaire à la gestion de mes missions.</span>
          </label>
          {etat && etat !== "envoi" && <p role="alert" style={{ color: T.rouge }}>{etat}</p>}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button disabled={!coche || etat === "envoi"} onClick={valider} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 22, border: "none", background: coche ? T.texte : "#999", color: "#fff", fontSize: 15 }}>{etat === "envoi" ? "Validation…" : "Accepter l'invitation"}</button>
            <button onClick={() => onTermine(false)} style={{ minHeight: 44, padding: "10px 18px", borderRadius: 22, border: `1px solid ${T.ligne}`, background: "transparent", color: T.texte, fontSize: 15 }}>Plus tard</button>
          </div>
        </>}
      </div>
    </div>
  );
}

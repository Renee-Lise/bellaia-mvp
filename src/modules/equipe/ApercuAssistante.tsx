"use client";
// ═══════════════════════════════════════════════════════════
// Aperçu « profil assistante » — pour la fondatrice.
// Montre l'espace tel qu'une assistante le voit : même menu (Mes
// missions, Messages, Notifications), mêmes écrans, sans droit de
// gestion, filtré sur la personne choisie (« Voir comme »).
// Lecture seule : le mode aperçu bloque toute écriture.
// Rappelle aussi, pour vérification, ce qu'une assistante NE voit PAS
// (contrôlé en base le 18/11 : 0 ligne visible).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { sbRpc } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte } from "./equipeLib";
import EspaceEquipe from "./EspaceEquipe";

const NON_VISIBLE = [
  "Finances, encaissements, paiements, factures et devis",
  "Clientes, CRM et historique d'achats",
  "Prix d'achat, coûts de revient, marges et fournisseurs",
  "Administratif, comptabilité, documents privés de l'entreprise",
  "Missions des autres membres de l'équipe",
  "Réglages, accès et permissions",
];

export default function ApercuAssistante({ user }: { user: any }) {
  const [onglet, setOnglet] = useState<"missions" | "messages" | "notifications" | "food">("missions");
  const [membres, setMembres] = useState<any[]>([]);
  const [voirComme, setVoirComme] = useState<string>("");

  useEffect(() => {
    sbRpc<any[]>("fondatrice_equipe", {}).then(eq => {
      const l = (eq || []).map((m: any) => ({ id: m.id, nom: m.nom || m.email || "Sans nom", roles: (m.roles || []).filter((r: any) => r.statut === "actif").map((r: any) => r.role) }));
      setMembres(l);
      const assistante = l.find(m => m.roles.includes("assistante"));
      if (assistante) setVoirComme(assistante.id);
    }).catch(() => setMembres([]));
  }, []);

  const nomVu = membres.find(m => m.id === voirComme)?.nom;
  const ONGLETS: [typeof onglet, string][] = [["missions", "🤝 Mes missions"], ["messages", "💬 Messages"], ["notifications", "🔔 Notifications"], ["food", "🍽 Bella'Food"]];

  return (
    <div style={{ fontFamily: SA, color: C.texte, maxWidth: 860, margin: "0 auto", display: "flex", flexDirection: "column", gap: 12, padding: "12px 12px 40px" }}>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 900 }}>👁 Profil assistante — aperçu</div>
        <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>
          Voici exactement ce que voit une assistante en se connectant : son menu, ses missions, ses messages. Aucune modification n'est possible pendant l'aperçu.
        </div>
        <div>
          <div style={lbl}>Voir comme</div>
          <select style={champ} value={voirComme} onChange={e => setVoirComme(e.target.value)}>
            <option value="">— Aucune personne (missions non attribuées) —</option>
            {membres.map(m => <option key={m.id} value={m.id}>{m.nom}{m.roles.length ? ` (${m.roles.join(", ")})` : ""}</option>)}
          </select>
          {!membres.length && <div style={{ fontSize: 12, color: C.orange, marginTop: 6 }}>Aucun compte d'équipe enregistré pour l'instant : l'aperçu montre les missions non attribuées. Reliez un compte dans Organisation → Accès.</div>}
        </div>
      </div>

      {/* Menu de l'assistante (identique à son application) */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {ONGLETS.map(([k, l]) => <button key={k} onClick={() => setOnglet(k)} style={btn(onglet === k)}>{l}</button>)}
      </div>

      {onglet === "missions" && <EspaceEquipe user={user} role="assistante" apercu voirComme={voirComme || null} />}
      {onglet === "messages" && (
        <div style={{ ...carte, fontSize: 13, color: C.doux, lineHeight: 1.6 }}>
          L'assistante voit ici <b style={{ color: C.texte }}>uniquement ses propres conversations</b> (avec vous et l'équipe), ainsi que les fils de commentaires de ses missions.
          {nomVu ? <> Les conversations de {nomVu} ne sont pas affichées dans l'aperçu : elles restent privées.</> : null}
        </div>
      )}
      {onglet === "food" && (
        <div style={{ ...carte, fontSize: 13, color: C.doux, lineHeight: 1.6 }}>
          Selon les permissions que vous lui accordez (Accès & permissions) : <b style={{ color: C.texte }}>découvrir</b> les plats et recettes validés (sans coûts ni marges), <b style={{ color: C.texte }}>prendre une commande</b> pour une cliente (prix et allergènes contrôlés par le serveur), <b style={{ color: C.texte }}>proposer une fiche recette</b> (statut « proposée », à valider par vous). Sans permission, elle voit un message l'invitant à vous demander l'accès.
        </div>
      )}
      {onglet === "notifications" && (
        <div style={{ ...carte, fontSize: 13, color: C.doux, lineHeight: 1.6 }}>
          Notifications reçues : nouvelle mission attribuée, correction demandée, mission validée, échéance proche. Jamais d'alerte de commande, de paiement ou de finances.
        </div>
      )}

      <div style={{ ...carte, borderColor: `${C.ok}55` }}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>🔒 Ce que l'assistante ne voit pas</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.doux, lineHeight: 1.7 }}>
          {NON_VISIBLE.map(t => <li key={t}>{t}</li>)}
        </ul>
        <div style={{ fontSize: 11, color: C.doux, marginTop: 6 }}>Vérifié en base le 18/11 (contrôle des accès par rôle). Une permission accordée dans Accès & permissions ouvre uniquement le domaine concerné.</div>
      </div>
    </div>
  );
}

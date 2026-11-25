"use client";
// ═══════════════════════════════════════════════════════════
// Sélecteur de contacts unique (Accès & permissions, missions, nominations, devis, factures, commandes,
// rendez-vous, événements, Secret Agenda, Secret Games, Secret World, fournisseurs…).
// • Autocomplétion dès le premier caractère : nom, prénom, e-mail partiel, pseudonyme, téléphone, entreprise.
// • Liste consultable sans saisie (« Parcourir »), avec pagination.
// • La sélection transmet l'IDENTIFIANT du contact, jamais un e-mail tapé à la main.
// • Homonymes distingués (entreprise, e-mail masqué ou référence courte).
// • Aucun résultat : ajouter un contact, inviter une personne, chercher parmi les comptes.
// Les contacts proposés sont déjà filtrés selon les droits (serveur) et le besoin du module (props).
// ═══════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { CATEGORIES_INITIALES, POLES, homonymes, libelleContact, rechercher, type Contact } from "./repertoire";

const THEMES = {
  clair: { texte: "#1c2246", doux: "rgba(28,34,70,0.6)", ligne: "rgba(28,34,70,0.15)", or: "#b8995a", fond: "#fff", accent: "#f4ecdc" },
  sombre: { texte: "#f1ece0", doux: "rgba(241,236,224,0.65)", ligne: "rgba(255,255,255,0.16)", or: "#c9a96e", fond: "#20233a", accent: "rgba(201,169,110,0.18)" },
};
const PAR_PAGE = 20;
const nomCat = (c: string) => CATEGORIES_INITIALES.find(x => x[0] === c)?.[1] || c;
const nomPole = (p: string) => POLES.find(x => x.id === p)?.nom || p;

export default function SelecteurContact({ contacts, onChoisir, filtre, libelle = "Rechercher un contact", afficherEmail = true, onAjouter, onInviter, testid = "selecteur-contact", theme = "clair" }: {
  contacts: Contact[];
  onChoisir: (c: Contact) => void;
  filtre?: { categorie?: string; pole?: string; comptesSeulement?: boolean };
  libelle?: string;
  afficherEmail?: boolean;
  onAjouter?: (saisie: string) => void;
  onInviter?: (saisie: string) => void;
  testid?: string;
  theme?: "clair" | "sombre";
}) {
  const T = THEMES[theme];
  const [q, setQ] = useState("");
  const [ouvert, setOuvert] = useState(false);
  const [page, setPage] = useState(0);
  const [comptes, setComptes] = useState(!!filtre?.comptesSeulement);
  const resultats = useMemo(() => rechercher(contacts, q, { ...filtre, comptesSeulement: comptes || filtre?.comptesSeulement }), [contacts, q, filtre, comptes]);
  const homo = useMemo(() => homonymes(contacts), [contacts]);
  const visibles = resultats.slice(page * PAR_PAGE, (page + 1) * PAR_PAGE);
  const montrer = ouvert || q.trim().length > 0;
  const champ: React.CSSProperties = { flex: 1, minWidth: 0, minHeight: 48, fontSize: 16, padding: "10px 12px", border: `1px solid ${T.ligne}`, borderRadius: 12, color: T.texte, background: T.fond };
  const bouton = (p = false): React.CSSProperties => ({ minHeight: 44, padding: "8px 12px", borderRadius: 12, border: `1px solid ${p ? T.or : T.ligne}`, background: p ? T.accent : T.fond, color: T.texte, fontSize: 14, fontWeight: 600 });

  return (
    <div data-testid={testid} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label style={{ fontSize: 13, color: T.doux }} htmlFor={`${testid}-q`}>{libelle}</label>
      <div style={{ display: "flex", gap: 8 }}>
        <input id={`${testid}-q`} data-testid={`${testid}-saisie`} type="search" inputMode="search" autoComplete="off" autoCorrect="off" spellCheck={false}
          placeholder="Nom, prénom, e-mail, téléphone…" value={q} onChange={e => { setQ(e.target.value); setPage(0); }} style={champ} role="combobox" aria-expanded={montrer} aria-controls={`${testid}-liste`} />
        <button type="button" data-testid={`${testid}-parcourir`} style={bouton(ouvert)} onClick={() => { setOuvert(o => !o); setPage(0); }} aria-expanded={ouvert}>Parcourir ▾</button>
      </div>
      {montrer && (
        <div id={`${testid}-liste`} role="listbox" style={{ border: `1px solid ${T.ligne}`, borderRadius: 12, background: T.fond, maxHeight: 360, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
          {visibles.map(c => (
            <button key={c.id} type="button" role="option" aria-selected={false} data-testid={`${testid}-option`} data-id={c.id}
              onClick={() => { onChoisir(c); setQ(""); setOuvert(false); }}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 12px", border: "none", borderBottom: `1px solid ${T.ligne}`, background: "transparent", color: T.texte, minHeight: 56 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{libelleContact(c, homo.has(c.id))}{!c.compte && <span style={{ fontWeight: 400, fontSize: 12, color: T.doux }}> · contact externe (sans compte)</span>}</div>
              {afficherEmail && c.email && <div style={{ fontSize: 13, color: T.doux, wordBreak: "break-all" }}>{c.email}</div>}
              <div style={{ fontSize: 12, color: T.doux, marginTop: 2 }}>
                {[...c.categories.map(nomCat), ...c.poles.map(nomPole)].join(" · ") || "Aucune catégorie"}{c.statut ? ` — ${c.statut}` : ""}
              </div>
            </button>
          ))}
          {!resultats.length && (
            <div data-testid={`${testid}-aucun`} style={{ padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontSize: 14, color: T.doux }}>Aucun contact ne correspond{q ? ` à « ${q} »` : ""}.</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {onAjouter && <button type="button" style={bouton(true)} onClick={() => onAjouter(q)}>Ajouter un contact</button>}
                {onInviter && <button type="button" style={bouton()} onClick={() => onInviter(q)}>Inviter une personne</button>}
                {!comptes && <button type="button" style={bouton()} onClick={() => setComptes(true)}>Rechercher un compte existant</button>}
              </div>
            </div>
          )}
          {resultats.length > PAR_PAGE && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 8 }}>
              <button type="button" style={bouton()} disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹ Précédents</button>
              <span style={{ fontSize: 12, color: T.doux }}>{page * PAR_PAGE + 1}–{Math.min(resultats.length, (page + 1) * PAR_PAGE)} sur {resultats.length}</span>
              <button type="button" style={bouton()} disabled={(page + 1) * PAR_PAGE >= resultats.length} onClick={() => setPage(p => p + 1)}>Suivants ›</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

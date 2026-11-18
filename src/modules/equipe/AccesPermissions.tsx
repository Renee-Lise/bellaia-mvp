"use client";
// ═══════════════════════════════════════════════════════════
// Accès & permissions — fondatrice uniquement
// • Relier un compte EXISTANT (par e-mail) à un ou plusieurs rôles
//   (un seul compte par personne), éventuellement à une organisation
//   partenaire (Vil'Dor Pâtisse).
// • Accorder / retirer des permissions précises ; suspendre ou
//   révoquer un rôle. Par défaut : AUCUN droit de la fondatrice.
// • Journal des changements de droits (non modifiable).
// Appliqué en base : bellaia_roles, bellaia_permissions (RLS).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbRpc, SB_URL, SB_KEY, jeton } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, heure } from "./equipeLib";

const ROLES: [string, string][] = [["prestataire", "Prestataire"], ["assistante", "Assistante"], ["hote", "Hôte / hôtesse"], ["fournisseur", "Fournisseur"], ["collaborateur", "Collaborateur"], ["qualite", "Responsable qualité"], ["autre", "Autre"]];
const PERMS: [string, string, string][] = [
  ["missions.gerer", "Créer et attribuer des missions", "*"],
  ["notifications.commandes", "Recevoir les alertes de nouvelles commandes", "*"],
  ["ia.utiliser", "Utiliser l'IA Bellaïa (consomme vos crédits)", "*"],
  ["bsh.membres_emails", "Voir les e-mails des membres BSH", "BSH"],
  ["food.revente.gerer", "Gérer la collection de revente (sans les marges)", "FOOD"],
  ["food.revente.marges", "🔒 Voir prix d'achat et marges de revente", "FOOD"],
  ["paiements.creer_lien", "🔒 Créer des liens de paiement", "*"],
  ["acces_complet", "⚠️ Accès complet (équivalent fondatrice)", "*"],
];

async function supprimerPermission(id: string) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/rest/v1/bellaia_permissions?id=eq.${id}`, { method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}` } });
  if (!r.ok) throw new Error(await r.text());
}

export default function AccesPermissions() {
  const [equipe, setEquipe] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [journal, setJournal] = useState<any[]>([]);
  const [email, setEmail] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [org, setOrg] = useState("");
  const [msg, setMsg] = useState("");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    setCharge(true);
    try {
      setEquipe(await sbRpc<any[]>("fondatrice_equipe", {}) || []);
      setOrgs(await sbSelect("bellaia_organisations", "select=id,nom_commercial&order=nom_commercial.asc"));
      setJournal(await sbSelect("bellaia_journal", "order=created_at.desc&limit=30").catch(() => []));
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const lier = async () => {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) { setMsg("❌ E-mail invalide"); return; }
    if (!roles.length) { setMsg("❌ Choisissez au moins un rôle"); return; }
    try { await sbRpc("fondatrice_lier_compte", { p_email: email.trim(), p_roles: roles, p_organisation: org || null }); setMsg(`✅ Compte relié à ${heure()} — aucun droit sensible accordé par défaut`); setEmail(""); setRoles([]); charger(); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const basculer = async (m: any, code: string, univers: string) => {
    const p = (m.permissions || []).find((x: any) => x.permission === code);
    if (!p && code === "acces_complet" && !confirm("Accorder l'accès complet donne les mêmes droits que vous (finances, factures, données clientes). Confirmer ?")) return;
    try { if (p) await supprimerPermission(p.id); else await sbInsert("bellaia_permissions", { user_id: m.id, permission: code, univers }); setMsg(`✅ Permission ${p ? "retirée" : "accordée"} à ${heure()}`); charger(); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const statutRole = async (r: any, statut: string) => {
    try { await sbUpdate("bellaia_roles", r.id, { statut, updated_at: new Date().toISOString() }); charger(); } catch (e: any) { setMsg("❌ " + e.message); }
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🔐 Accès & permissions</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>Un seul compte par personne, plusieurs rôles possibles. Personne n'a vos droits par défaut : chaque permission est accordée ici et vérifiée par la base.</div>
      </div>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>➕ Relier un compte</div>
        <div style={{ fontSize: 12, color: C.doux }}>La personne crée d'abord son compte Bellaïa ; vous saisissez ensuite son e-mail ici.</div>
        <div><div style={lbl}>E-mail du compte</div><input type="email" style={champ} value={email} onChange={e => setEmail(e.target.value)} autoComplete="off" /></div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {ROLES.map(([k, l]) => <button key={k} style={btn(roles.includes(k))} onClick={() => setRoles(r => r.includes(k) ? r.filter(x => x !== k) : [...r, k])}>{roles.includes(k) ? "✓ " : ""}{l}</button>)}
        </div>
        <div><div style={lbl}>Organisation partenaire (facultatif)</div>
          <select style={champ} value={org} onChange={e => setOrg(e.target.value)}><option value="">Aucune (équipe Bella'Studio)</option>{orgs.map(o => <option key={o.id} value={o.id}>{o.nom_commercial}</option>)}</select>
        </div>
        <button style={btn(true)} onClick={lier}>Relier le compte</button>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {!charge && !equipe.length && <div style={{ ...carte, color: C.doux, fontSize: 13 }}>Aucun compte d'équipe ou partenaire relié pour l'instant.</div>}
      {equipe.map(m => (
        <div key={m.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <div><b>{m.nom || "Sans nom"}</b> <span style={{ fontSize: 12, color: C.doux }}>{m.email}</span></div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {(m.roles || []).map((r: any) => (
              <span key={r.id} style={{ ...btn(r.statut === "actif", r.statut === "actif" ? C.ok : C.rouge), cursor: "default", fontSize: 12 }}>
                {ROLES.find(x => x[0] === r.role)?.[1] || r.role}{r.organisation_id ? ` · ${orgs.find(o => o.id === r.organisation_id)?.nom_commercial || "partenaire"}` : ""} · {r.statut}
                {r.statut === "actif"
                  ? <a onClick={() => statutRole(r, "suspendu")} style={{ marginLeft: 6, cursor: "pointer", textDecoration: "underline" }}>suspendre</a>
                  : r.statut === "suspendu" ? <><a onClick={() => statutRole(r, "actif")} style={{ marginLeft: 6, cursor: "pointer", textDecoration: "underline" }}>réactiver</a><a onClick={() => statutRole(r, "revoque")} style={{ marginLeft: 6, cursor: "pointer", textDecoration: "underline" }}>révoquer</a></> : null}
              </span>))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {PERMS.map(([code, l, u]) => { const on = (m.permissions || []).some((x: any) => x.permission === code); return (
              <label key={code} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, minHeight: 36 }}>
                <input type="checkbox" checked={on} onChange={() => basculer(m, code, u)} style={{ width: 20, height: 20 }} /> {l}
              </label>); })}
          </div>
        </div>))}
      {journal.length > 0 && (
        <div style={carte}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>🕓 Journal des accès et des droits</div>
          {journal.map(j => <div key={j.id} style={{ fontSize: 12, color: C.doux, borderTop: `1px solid ${C.ligne}`, padding: "4px 0" }}>{new Date(j.created_at).toLocaleString("fr-FR")} · {j.action}{j.details?.apres?.permission ? ` · ${j.details.apres.permission}` : j.details?.avant?.permission ? ` · ${j.details.avant.permission}` : ""}{j.details?.apres?.role ? ` · ${j.details.apres.role}` : ""}</div>)}
        </div>)}
    </div>
  );
}

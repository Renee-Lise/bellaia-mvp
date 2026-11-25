"use client";
// ═══════════════════════════════════════════════════════════
// Accès & permissions — fondatrice uniquement (refonte du 24/11/2026).
// Anomalies corrigées :
//  • plus de saisie obligatoire de l'e-mail : sélecteur de contacts (autocomplétion + liste consultable) ;
//    la sélection utilise l'identifiant unique du compte ;
//  • les fonctions se modifient une par une, par pôle (ajouter, suspendre, réactiver, retirer, rétablir) ;
//  • les permissions sont rangées par pôle et par domaine, dans des sections repliables, avec leur sensibilité ;
//  • les modifications forment un BROUILLON : « Enregistrer », « Annuler », « Restaurer » ; rien n'est écrit
//    avant « Enregistrer » ; après écriture, l'état est RELU EN BASE et affiché ; en cas d'erreur, le brouillon
//    est conservé et la cause affichée (aucune erreur silencieuse) ;
//  • une fonction ne peut pas être créée en double ; « retirer » conserve l'historique (statut révoqué).
// Sécurité : écritures soumises à la RLS (fondatrice seule) et journalisées en base (bellaia_journal).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, heure } from "./equipeLib";
import SelecteurContact from "../repertoire/SelecteurContact";
import { FONCTIONS, MODELES, PERMISSIONS, POLES, appliquerModele, cle, clesDe, decomposer, groupeDePermission, libellePortee, planAffectations, planPermissions, type Affectation, type Contact } from "../repertoire/repertoire";
import { chargerRepertoire, enregistrerAffectations, enregistrerPermissions, relireMembre, type Membre, type Organisation, type SourceRepertoire } from "../repertoire/repertoireApi";

const nomFonction = (r: string) => FONCTIONS.find(f => f[0] === r)?.[1] || r;
const COUL_SENS: Record<string, string> = { standard: "#3f7d5a", sensible: "#b07a2a", critique: "#b4523f" };
const LIB_SENS: Record<string, string> = { standard: "standard", sensible: "sensible", critique: "🔒 critique" };

type Fiche = { id: string; nom: string; email: string | null; role_profil: string | null; base: Membre | null };

export default function AccesPermissions() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [membres, setMembres] = useState<Membre[]>([]);
  const [orgs, setOrgs] = useState<Organisation[]>([]);
  const [source, setSource] = useState<SourceRepertoire>("repli");
  const [journal, setJournal] = useState<any[]>([]);
  const [fiche, setFiche] = useState<Fiche | null>(null);
  const [msg, setMsg] = useState("");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    setCharge(true);
    try {
      const r = await chargerRepertoire();
      setContacts(r.contacts); setMembres(r.membres); setOrgs(r.organisations); setSource(r.source);
      setJournal(await sbSelect("bellaia_journal", "action=like.bellaia_*&order=created_at.desc&limit=30").catch(() => []));
    } catch (e: any) { setMsg("❌ Chargement impossible : " + String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const ouvrir = (c: Contact) => {
    const m = membres.find(x => x.id === c.id) || null;
    setFiche({ id: c.id, nom: [c.prenom, c.nom].filter(Boolean).join(" ") || m?.nom || "Sans nom", email: m?.email || c.email || null, role_profil: c.role_profil || m?.role_profil || null, base: m });
    setMsg(""); if (typeof window !== "undefined") window.scrollTo(0, 0);
  };

  if (fiche) return <FicheAcces fiche={fiche} orgs={orgs} onFermer={async (recharger) => { setFiche(null); if (recharger) await charger(); }} />;

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto", paddingBottom: 90 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🔐 Accès & permissions</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>Un seul compte par personne, plusieurs pôles et plusieurs fonctions par pôle. Personne n'a vos droits par défaut : chaque permission est accordée ici et vérifiée par la base.</div>
      </div>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Rattacher ou modifier un compte</div>
        <SelecteurContact theme="sombre" contacts={contacts} onChoisir={ouvrir} filtre={{ comptesSeulement: true }} libelle="Chercher par prénom, nom, e-mail ou téléphone — ou parcourir la liste" testid="selecteur-acces" />
        {source === "repli" && <div data-testid="source-repli" style={{ fontSize: 12, color: C.doux }}>Recherche par nom et prénom sur tous les comptes. Recherche par e-mail : comptes de l'équipe uniquement, jusqu'à la mise à jour de la base du répertoire (0145).</div>}
      </div>
      {msg && <div role="alert" style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {!charge && <div style={{ fontWeight: 800, marginTop: 4 }}>Comptes rattachés ({membres.filter(m => m.roles.length).length})</div>}
      {membres.filter(m => m.roles.length || m.permissions.length).map(m => {
        const parOrg = new Map<string, string[]>();
        for (const r of m.roles) if (r.statut !== "revoque") { const k = r.organisation_id ? (orgs.find(o => o.id === r.organisation_id)?.nom_commercial || "Partenaire") : "Équipe Bella’Studio"; parOrg.set(k, [...(parOrg.get(k) || []), `${nomFonction(r.role)}${r.statut !== "actif" ? ` (${r.statut})` : ""}`]); }
        return (
          <button key={m.id} data-testid="carte-membre" data-id={m.id} onClick={() => ouvrir(contacts.find(c => c.id === m.id) || { id: m.id, compte: true, nom: m.nom, email: m.email, categories: [], poles: [], role_profil: m.role_profil })}
            style={{ ...carte, textAlign: "left", display: "flex", flexDirection: "column", gap: 4, cursor: "pointer", border: `1px solid ${C.ligne}` }}>
            <div><b>{m.nom || "Sans nom"}</b> <span style={{ fontSize: 12, color: C.doux, wordBreak: "break-all" }}>{m.email}</span></div>
            {[...parOrg.entries()].map(([o, f]) => <div key={o} style={{ fontSize: 13 }}><b>{o}</b> : {f.join(" · ")}</div>)}
            <div style={{ fontSize: 12, color: C.doux }}>{m.permissions.length} permission{m.permissions.length > 1 ? "s" : ""} · Modifier ›</div>
          </button>);
      })}
      {journal.length > 0 && (
        <details style={carte}>
          <summary style={{ fontWeight: 800, cursor: "pointer", minHeight: 32 }}>🕓 Journal des accès et des droits</summary>
          {journal.map(j => <div key={j.id} style={{ fontSize: 12, color: C.doux, borderTop: `1px solid ${C.ligne}`, padding: "4px 0" }}>{new Date(j.created_at).toLocaleString("fr-FR")} · {j.action}{j.details?.apres?.permission ? ` · ${j.details.apres.permission}` : j.details?.avant?.permission ? ` · ${j.details.avant.permission}` : ""}{j.details?.apres?.role ? ` · ${j.details.apres.role} (${j.details.apres.statut})` : ""}</div>)}
        </details>)}
    </div>
  );
}

function FicheAcces({ fiche, orgs, onFermer }: { fiche: Fiche; orgs: Organisation[]; onFermer: (recharger: boolean) => void }) {
  const [base, setBase] = useState<Membre | null>(fiche.base);
  const affBase = (b: Membre | null): Affectation[] => (b?.roles || []).map(r => ({ id: r.id, role: r.role, organisation_id: r.organisation_id, statut: r.statut as Affectation["statut"] }));
  const [aff, setAff] = useState<Affectation[]>(() => affBase(fiche.base).filter(a => a.statut !== "revoque"));
  const [perms, setPerms] = useState<string[]>(() => clesDe(fiche.base?.permissions || []));
  const [porteeModele, setPorteeModele] = useState("*");
  const [msg, setMsg] = useState<{ ok: boolean; texte: string } | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [nouvelleOrg, setNouvelleOrg] = useState("");
  const [modele, setModele] = useState("");
  const estFondatrice = fiche.role_profil === "fondatrice";

  const planA = useMemo(() => planAffectations(affBase(base), aff), [base, aff]);
  const planP = useMemo(() => planPermissions(base?.permissions || [], perms), [base, perms]);
  const nbChangements = planA.ajouter.length + planA.modifier.length + planA.retirer.length + planP.accorder.length + planP.retirer.length;
  const revoquees = affBase(base).filter(a => a.statut === "revoque" && !aff.some(x => x.role === a.role && x.organisation_id === a.organisation_id));

  const groupes = useMemo(() => {
    const ids = new Set<string>([...aff.map(a => a.organisation_id || ""), ...revoquees.map(a => a.organisation_id || "")]);
    if (nouvelleOrg !== "") ids.add(nouvelleOrg === "studio" ? "" : nouvelleOrg);
    return [...ids].map(id => ({ id: id || null, nom: id ? (orgs.find(o => o.id === id)?.nom_commercial || "Organisation partenaire") : "Équipe Bella’Studio (interne)" }));
  }, [aff, revoquees, nouvelleOrg, orgs]);

  const setStatut = (a: Affectation, statut: Affectation["statut"]) => setAff(l => l.map(x => x.role === a.role && x.organisation_id === a.organisation_id ? { ...x, statut } : x));
  const retirer = (a: Affectation) => setAff(l => l.filter(x => !(x.role === a.role && x.organisation_id === a.organisation_id)));
  const ajouter = (role: string, org: string | null) => { if (!role) return; if (aff.some(x => x.role === role && x.organisation_id === org)) { setMsg({ ok: false, texte: "Cette fonction existe déjà pour ce pôle." }); return; } setAff(l => [...l, { role, organisation_id: org, statut: "actif" }]); setMsg(null); };
  const basculerPerm = (code: string, univers?: string) => {
    const d = PERMISSIONS.find(p => p.code === code);
    const k = cle(code, univers ?? d?.univers ?? "*");
    if (!perms.includes(k) && d?.sensibilite === "critique" && !confirm(`« ${d.libelle} » est une autorisation critique (${d.portee}). L'ajouter au brouillon ?`)) return;
    setPerms(l => l.includes(k) ? l.filter(x => x !== k) : [...l, k]);
  };
  // Portées proposées pour une permission limitable : tout Bellaïa, chaque pôle, chaque organisation partenaire.
  const portees = useMemo(() => ["*", ...POLES.filter(p => p.univers).map(p => p.univers as string)], []);
  const restaurer = () => { setAff(affBase(base).filter(a => a.statut !== "revoque")); setPerms(clesDe(base?.permissions || [])); setMsg({ ok: true, texte: "Dernières valeurs enregistrées restaurées." }); };

  const enregistrer = async () => {
    if (estFondatrice) { setMsg({ ok: false, texte: "Les droits de la fondatrice ne se modifient pas ici." }); return; }
    setEnvoi(true); setMsg(null);
    const nb = nbChangements;
    try {
      await enregistrerAffectations(fiche.id, planA, fiche.role_profil);
      await enregistrerPermissions(fiche.id, planP);
      const relu = await relireMembre(fiche.id);
      setBase(relu);
      setAff(affBase(relu).filter(a => a.statut !== "revoque")); setPerms(clesDe(relu?.permissions || []));
      const actives = (relu?.roles || []).filter(r => r.statut === "actif").length;
      setMsg({ ok: true, texte: `✅ ${nb} modification${nb > 1 ? "s" : ""} enregistrée${nb > 1 ? "s" : ""} à ${heure()}. Relu en base : ${actives} fonction${actives > 1 ? "s" : ""} active${actives > 1 ? "s" : ""}, ${relu?.permissions.length || 0} permission${(relu?.permissions.length || 0) > 1 ? "s" : ""}.` });
    } catch (e: any) {
      // Le brouillon est conservé : rien n'est perdu, la cause est affichée.
      try { const relu = await relireMembre(fiche.id); setBase(relu); } catch {}
      setMsg({ ok: false, texte: `❌ Enregistrement interrompu : ${String(e?.message || e)}. Vos choix sont conservés ; les écritures déjà faites apparaissent ci-dessus comme enregistrées.` });
    }
    setEnvoi(false);
  };

  const perm = (code: string) => PERMISSIONS.find(p => p.code === code)!;
  const groupesPerms = [...new Set(PERMISSIONS.map(groupeDePermission))];

  return (
    <div data-testid="fiche-acces" style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto", paddingBottom: 140 }}>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => { if (nbChangements && !confirm("Abandonner les modifications non enregistrées ?")) return; onFermer(true); }}>‹ Retour à la liste</button>
      <div>
        <div data-testid="fiche-nom" style={{ fontSize: 20, fontWeight: 900 }}>{fiche.nom}</div>
        <div style={{ fontSize: 13, color: C.doux, wordBreak: "break-all" }}>{fiche.email || "E-mail visible après rattachement ou mise à jour du répertoire"} · compte {fiche.role_profil || "—"}</div>
      </div>
      {estFondatrice && <div style={{ ...carte, color: C.rouge }}>Compte de la fondatrice : ses droits ne sont pas modifiables depuis cet écran.</div>}

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ fontWeight: 800 }}>Pôles et fonctions</div>
        {groupes.map(g => {
          const fonctions = aff.filter(a => (a.organisation_id || null) === g.id);
          const parties = revoquees.filter(a => (a.organisation_id || null) === g.id);
          return (
            <div key={g.id || "studio"} data-testid="groupe-pole" data-pole={g.nom} style={{ border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontWeight: 800 }}>{g.nom}</div>
              {fonctions.map(a => (
                <div key={a.role} data-testid="fonction" data-role={a.role} data-statut={a.statut} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
                  <span style={{ flex: "1 1 160px", fontSize: 15 }}>{nomFonction(a.role)} <span style={{ fontSize: 12, color: a.statut === "actif" ? C.ok : C.rouge }}>· {a.statut}</span>{!a.id && <span style={{ fontSize: 12, color: C.doux }}> · à enregistrer</span>}</span>
                  {a.statut === "actif" ? <button style={btn()} onClick={() => setStatut(a, "suspendu")}>Suspendre</button> : <button style={btn()} onClick={() => setStatut(a, "actif")}>Réactiver</button>}
                  <button style={btn()} data-testid="retirer-fonction" onClick={() => retirer(a)}>Retirer</button>
                </div>))}
              {parties.map(a => <div key={a.role} style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: C.doux }}><span style={{ flex: 1, textDecoration: "line-through" }}>{nomFonction(a.role)} (retirée — historique conservé)</span><button style={btn()} onClick={() => setAff(l => [...l, { ...a, statut: "actif" }])}>Rétablir</button></div>)}
              <select data-testid="ajouter-fonction" aria-label={`Ajouter une fonction — ${g.nom}`} style={champ} value="" onChange={e => ajouter(e.target.value, g.id)}>
                <option value="">+ Ajouter une fonction…</option>
                {FONCTIONS.filter(f => !fonctions.some(a => a.role === f[0])).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>);
        })}
        <div><div style={lbl}>Ajouter un pôle ou une organisation</div>
          <select data-testid="ajouter-pole" style={champ} value="" onChange={e => setNouvelleOrg(e.target.value)}>
            <option value="">Choisir…</option>
            <option value="studio">Équipe Bella’Studio (interne)</option>
            {orgs.filter(o => !groupes.some(g => g.id === o.id)).map(o => <option key={o.id} value={o.id}>{o.nom_commercial}</option>)}
          </select>
        </div>
        <div style={{ fontSize: 12, color: C.doux }}>Un rattachement à une organisation (ex. Vil’Dor Pâtisse) ouvre son espace, et seulement celui-là : aucune permission Bella’Food ou BSH n’est accordée automatiquement.</div>
      </div>

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Permissions</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select aria-label="Modèle de permissions" data-testid="modele" style={{ ...champ, flex: 1 }} value={modele} onChange={e => setModele(e.target.value)}><option value="">Appliquer un modèle…</option>{MODELES.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}</select>
          <select aria-label="Portée du modèle" data-testid="portee-modele" style={{ ...champ, flex: 1 }} value={porteeModele} onChange={e => setPorteeModele(e.target.value)}>{portees.map(u => <option key={u} value={u}>Pour : {libellePortee(u, orgs)}</option>)}</select>
          <button style={btn()} disabled={!modele} onClick={() => { const r = appliquerModele(perms, modele, porteeModele); setPerms(r.permissions); setMsg({ ok: true, texte: `Modèle appliqué au brouillon : ${r.ajoutees.length} ajout(s), aucune autorisation retirée${r.ignorees.length ? ` ; ${r.ignorees.length} autorisation(s) critique(s) non ajoutée(s)` : ""}. Vérifiez puis enregistrez.` }); }}>Appliquer</button>
        </div>
        {groupesPerms.map(gp => {
          const liste = PERMISSIONS.filter(p => groupeDePermission(p) === gp);
          const nb = liste.filter(p => perms.some(k => decomposer(k).code === p.code)).length;
          return (
            <details key={gp} data-testid="groupe-permissions" data-groupe={gp} style={{ border: `1px solid ${C.ligne}`, borderRadius: 12, padding: "6px 10px" }}>
              <summary style={{ fontWeight: 700, cursor: "pointer", minHeight: 40, display: "flex", alignItems: "center" }}>{gp} — {nb}/{liste.length} accordée{nb > 1 ? "s" : ""}</summary>
              {[...new Set(liste.map(p => p.domaine))].map(dom => (
                <div key={dom} style={{ marginTop: 6 }}>
                  <div style={{ fontSize: 12, color: C.doux, textTransform: "uppercase", letterSpacing: 1 }}>{dom}</div>
                  {liste.filter(p => p.domaine === dom).map(p => p.limitable ? (
                    <div key={p.code} data-testid={`perm-limitable-${p.code}`} style={{ padding: "6px 0" }}>
                      <div style={{ fontSize: 14 }}>{p.libelle}<br /><span style={{ fontSize: 12, color: COUL_SENS[p.sensibilite] }}>{LIB_SENS[p.sensibilite]}</span><span style={{ fontSize: 12, color: C.doux }}> · {p.portee}</span></div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                        {portees.map(u => { const on = perms.includes(cle(p.code, u)); return (
                          <button key={u} type="button" data-testid={`portee-${p.code}-${u}`} aria-pressed={on} style={btn(on)} onClick={() => basculerPerm(p.code, u)}>{on ? "✓ " : ""}{libellePortee(u, orgs)}</button>); })}
                      </div>
                      {perms.some(k => decomposer(k).code === p.code && decomposer(k).univers !== "*") && <div data-testid="avertissement-portee" style={{ fontSize: 12, color: C.orange, marginTop: 6 }}>Portée limitée : effective après la mise à jour de la base 0146. D'ici là, une permission limitée n'ouvre aucune mission (elle ne donne jamais plus de droits que prévu).</div>}
                      {perms.includes(cle(p.code, "*")) && <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>« Tout Bellaïa » : toutes les missions de tous les pôles.</div>}
                    </div>
                  ) : (
                    <label key={p.code} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 14, minHeight: 44, padding: "6px 0" }}>
                      <input type="checkbox" data-testid={`perm-${p.code}`} checked={perms.includes(cle(p.code, p.univers))} onChange={() => basculerPerm(p.code)} style={{ width: 22, height: 22, flexShrink: 0, marginTop: 1 }} />
                      <span>{p.libelle}<br /><span style={{ fontSize: 12, color: COUL_SENS[p.sensibilite] }}>{LIB_SENS[p.sensibilite]}</span><span style={{ fontSize: 12, color: C.doux }}> · {p.portee}</span></span>
                    </label>))}
                </div>))}
            </details>);
        })}
      </div>

      {msg && <div role="status" data-testid="message-acces" style={{ ...carte, fontSize: 14, color: msg.ok ? C.ok : C.rouge }}>{msg.texte}</div>}

      <div style={{ position: "sticky", bottom: "calc(var(--bellaia-bas, 72px) + env(safe-area-inset-bottom, 0px))", zIndex: 5, background: "#1b1e30", border: `1px solid ${C.or}55`, borderRadius: 14, padding: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", boxShadow: "0 6px 24px rgba(0,0,0,0.12)" }}>
        <span data-testid="nb-changements" style={{ fontSize: 13, color: C.doux, flex: "1 1 100%" }}>{nbChangements ? `${nbChangements} modification${nbChangements > 1 ? "s" : ""} non enregistrée${nbChangements > 1 ? "s" : ""}` : "Aucune modification en attente"}</span>
        <button data-testid="enregistrer" style={{ ...btn(true), flex: 1 }} disabled={!nbChangements || envoi || estFondatrice} onClick={enregistrer}>{envoi ? "Enregistrement…" : "Enregistrer les modifications"}</button>
        <button data-testid="restaurer" style={btn()} disabled={!nbChangements || envoi} onClick={restaurer}>Restaurer</button>
        <button data-testid="annuler" style={btn()} disabled={envoi} onClick={() => { if (nbChangements && !confirm("Abandonner les modifications non enregistrées ?")) return; onFermer(true); }}>Annuler</button>
      </div>
    </div>
  );
}

"use client";
// ═══════════════════════════════════════════════════════════
// Espace professionnel Vil'Dor Pâtisse (partenaire indépendante)
// Un seul compte, trois fonctions (pâtisserie · assistante et aide en
// cuisine · hôtesse BSH), chacune avec SA propre autorisation.
// • Mode préparation tant que la situation n'est pas régularisée :
//   profil, documents, tarifs, simulations — PAS de vente réelle,
//   de mission effective ni de versement.
// • « Mon entreprise et mes autorisations » : cumul d'activités
//   (agente publique), documents, SIRET, assurance, contrat…
// • Produits : uniquement SON tarif et SA part — jamais le prix de
//   revente, la marge ou le chiffre d'affaires de Bella'Studio.
// La fondatrice ouvre le même espace avec ses contrôles (statut,
// validation des autorisations et des documents).
// Sécurité appliquée en base (RLS + fonctions, migration 0112).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbRpc } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, euros, versCentimes, heure, sha256, nomFichierSur, deposerPrive, ouvrirPrive, ALLERGENES, STATUTS_ALLERGENE } from "./equipeLib";
import EspaceEquipe from "./EspaceEquipe";
import AtelierImport from "../food/AtelierImport";

const STATUTS_ORG: [string, string, string][] = [
  ["en_creation", "Entreprise en création", C.orange], ["immatriculation_en_cours", "Immatriculation en cours", C.orange],
  ["immatriculee", "Entreprise immatriculée", C.bleu], ["documents_a_verifier", "Documents à vérifier", C.bleu],
  ["partenaire_valide", "Partenaire validé", C.ok], ["suspendu", "Partenaire suspendu", C.rouge],
];
const FONCTIONS: [string, string, string][] = [
  ["patisserie", "🧁 Fabrication et vente de pâtisseries", "Prestataire pâtissière"],
  ["assistante_cuisine", "🗂 Missions assistante et aide en cuisine", "Assistante Bella'Studio"],
  ["hotesse", "🥂 Missions hôtesse BSH", "Hôtesse Bella'Secret Home"],
];
const STATUTS_AUT: [string, string][] = [["a_demander", "À demander"], ["demandee", "Demandée"], ["accordee", "Accordée (déclarée)"], ["refusee", "Refusée"], ["expiree", "Expirée"], ["non_requise", "Non requise (à justifier)"]];
const DOCS: [string, string][] = [
  ["cumul_demande", "Demande de cumul d'activités"], ["formulaire_academique", "Formulaire académique"], ["lettre_demande", "Lettre de demande"],
  ["diplome", "Diplôme professionnel"], ["descriptif_activite", "Descriptif de l'activité"], ["horaires", "Horaires prévisionnels"],
  ["autorisation_rectorat", "Autorisation du rectorat"], ["restrictions", "Restrictions éventuelles"], ["immatriculation", "Immatriculation"],
  ["siret", "Avis de situation SIRET"], ["assurance", "Assurance"], ["declaration_sanitaire", "Déclarations sanitaires"],
  ["contrat_fourniture", "Contrat de fourniture Bella'Studio"], ["autre", "Autre document"],
];
const STATUTS_DOC: Record<string, [string, string]> = { a_verifier: ["À vérifier", C.orange], valide: ["Validé", C.ok], refuse: ["Refusé", C.rouge], expire: ["Expiré", C.rouge] };

type Onglet = "accueil" | "entreprise" | "documents" | "produits" | "commandes" | "missions" | "atelier";

export default function EspaceVildor({ user, mode = "partenaire", orgId }: { user?: any; mode?: "partenaire" | "fondatrice"; orgId?: string }) {
  const fond = mode === "fondatrice";
  const [org, setOrg] = useState<any>(null);
  const [aut, setAut] = useState<any[]>([]);
  const [docs, setDocs] = useState<any[]>([]);
  const [onglet, setOnglet] = useState<Onglet>("accueil");
  const [msg, setMsg] = useState("");
  const [erreur, setErreur] = useState("");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    setCharge(true); setErreur("");
    try {
      const o = orgId ? await sbSelect("bellaia_organisations", `id=eq.${orgId}`) : await sbSelect("bellaia_organisations", "type=eq.partenaire&order=created_at.asc&limit=1");
      const x = o[0] || null; setOrg(x);
      if (x) {
        setAut(await sbSelect("bellaia_autorisations", `organisation_id=eq.${x.id}`));
        setDocs(await sbSelect("bellaia_documents_partenaire", `organisation_id=eq.${x.id}&order=created_at.desc`));
      }
    } catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, [orgId]);

  if (charge) return <div style={{ color: C.doux, padding: 30, textAlign: "center", fontFamily: SA }}>Chargement de l'espace…</div>;
  if (!org) return <div style={{ ...carte, color: C.texte, fontFamily: SA }}>{erreur || "Aucun espace partenaire relié à ce compte pour l'instant. La fondatrice doit relier votre compte à Vil'Dor Pâtisse."}</div>;

  const st = STATUTS_ORG.find(s => s[0] === org.statut_admin) || STATUTS_ORG[0];
  const autDe = (f: string) => aut.find(a => a.fonction === f);
  const active = (f: string) => { const a = autDe(f); return !!a && ["accordee", "non_requise"].includes(a.statut) && a.validee_par_fondatrice; };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 820, margin: "0 auto" }}>
      <div style={{ ...carte, background: "linear-gradient(135deg, rgba(201,169,110,0.22), rgba(107,26,43,0.25))", borderColor: `${C.or}55` }}>
        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 0.3 }}>✨ {org.nom_commercial}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 2 }}>Entreprise partenaire indépendante de Bella'Studio{fond ? " · vue fondatrice" : ""}</div>
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          <span style={{ ...btn(true, st[2]), cursor: "default" }}>{st[1]}</span>
          {FONCTIONS.map(([f, l]) => <span key={f} style={{ ...btn(active(f), active(f) ? C.ok : C.doux), cursor: "default", fontSize: 12 }}>{active(f) ? "✅" : "○"} {l.replace(/^\S+ /, "")}</span>)}
        </div>
      </div>
      {!org.ventes_actives && (
        <div style={{ ...carte, borderColor: `${C.orange}66`, fontSize: 13, lineHeight: 1.5 }}>
          🛠 <b>Mode préparation.</b> Vous pouvez préparer votre profil, vos documents, vos tarifs et faire des simulations.
          Les ventes réelles, les missions effectives et les versements restent désactivés jusqu'à la vérification de chaque autorisation par la fondatrice.
        </div>)}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["accueil", "Accueil"], ["entreprise", "Mon entreprise et mes autorisations"], ["documents", `Documents (${docs.length})`], ["produits", "Mes produits & tarifs"], ["commandes", "Commandes reçues"], ["missions", "Mes missions"], ["atelier", "Atelier : importer mes fichiers"]] as [Onglet, string][]).map(([k, l]) =>
          <button key={k} style={btn(onglet === k)} onClick={() => setOnglet(k)}>{l}</button>)}
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}

      {onglet === "accueil" && <Accueil org={org} aut={aut} docs={docs} active={active} />}
      {onglet === "entreprise" && <Entreprise org={org} aut={aut} docs={docs} fond={fond} setMsg={setMsg} onMaj={charger} />}
      {onglet === "documents" && <Documents org={org} docs={docs} fond={fond} setMsg={setMsg} onMaj={charger} />}
      {onglet === "produits" && <Produits fond={fond} setMsg={setMsg} />}
      {onglet === "commandes" && <Commandes fond={fond} setMsg={setMsg} />}
      {onglet === "missions" && <EspaceEquipe user={user} role={fond ? "fondatrice" : "partenaire"} />}
      {/* Même moteur d'import que Bella'Food, espace VILDOR : données strictement séparées (stockage et lignes de SON organisation). */}
      {onglet === "atelier" && org?.id && <AtelierImport espace="VILDOR" organisationId={org.id} />}
    </div>
  );
}

function Accueil({ org, aut, docs, active }: any) {
  const etapes = [
    ["Compte relié à Vil'Dor Pâtisse", true],
    ["Autorisation de cumul — pâtisserie", active("patisserie")],
    ["Immatriculation et SIRET", !!org.siret],
    ["Assurance déposée et validée", docs.some((d: any) => d.categorie === "assurance" && d.statut === "valide")],
    ["Déclarations sanitaires validées", docs.some((d: any) => d.categorie === "declaration_sanitaire" && d.statut === "valide")],
    ["Contrat de fourniture signé", docs.some((d: any) => d.categorie === "contrat_fourniture" && d.statut === "valide")],
    ["Partenaire validé par la fondatrice", org.statut_admin === "partenaire_valide"],
  ] as [string, boolean][];
  const faits = etapes.filter(e => e[1]).length;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={carte}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>🧭 Activation progressive — {faits}/{etapes.length}</div>
        <div style={{ height: 8, borderRadius: 99, background: C.ligne, overflow: "hidden", marginBottom: 10 }}><div style={{ width: `${(faits / etapes.length) * 100}%`, height: "100%", background: C.or }} /></div>
        {etapes.map(([t, ok]) => <div key={t} style={{ fontSize: 14, padding: "4px 0" }}>{ok ? "✅" : "☐"} {t}</div>)}
        <div style={{ fontSize: 12, color: C.doux, marginTop: 8 }}>Chaque fonction s'active séparément : une autorisation obtenue n'active jamais automatiquement les autres.</div>
      </div>
      <div style={{ ...carte, fontSize: 13, color: C.doux, lineHeight: 1.5 }}>
        🧑‍🍳 <b style={{ color: C.texte }}>Atelier de production</b> (recettes et préparations réutilisables, ingrédients et prix, listes de courses, stocks, planning, hygiène) : en cours de préparation dans un espace séparé de celui de Bella'Food — vos recettes resteront privées par défaut.
      </div>
    </div>
  );
}

function Entreprise({ org, aut, docs, fond, setMsg, onMaj }: any) {
  const [f, setF] = useState({ forme_juridique: org.forme_juridique || "", siret: org.siret || "", adresse: org.adresse || "", telephone: org.telephone || "", email_pro: org.email_pro || "", domaine_souhaite: org.domaine_souhaite || "", notes_partenaire: org.notes_partenaire || "" });
  const [envoi, setEnvoi] = useState(false);
  const sit = org.situation_dirigeante || {};
  const enregistrer = async () => {
    setEnvoi(true);
    try {
      if (fond) await sbUpdate("bellaia_organisations", org.id, { ...f, siret: f.siret.replace(/\s/g, "") || null, domaine_souhaite: f.domaine_souhaite || null, updated_at: new Date().toISOString() });
      else await sbRpc("partenaire_maj_profil", { p_org: org.id, p: f });
      setMsg(`✅ Profil enregistré à ${heure()}`); onMaj();
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setEnvoi(false);
  };
  const majAut = async (a: any, patch: any) => {
    try {
      if (a?.id) await sbUpdate("bellaia_autorisations", a.id, { ...patch, updated_at: new Date().toISOString() });
      setMsg(`✅ Autorisation mise à jour à ${heure()}`); onMaj();
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  const docsDe = (k: string) => docs.filter((d: any) => d.categorie === k);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={carte}>
        <div style={{ fontWeight: 800, marginBottom: 6 }}>👩‍🏫 Situation de la dirigeante (déclarée)</div>
        {[["Fonction publique", sit.fonction_publique], ["Administration", sit.administration], ["Statut", sit.statut], ["Quotité", sit.quotite], ["Qualification", sit.qualification]].map(([t, v]) =>
          <div key={t} style={{ fontSize: 14, padding: "2px 0" }}><span style={{ color: C.doux }}>{t} : </span>{v || "—"}</div>)}
        <div style={{ fontSize: 13, marginTop: 8, lineHeight: 1.5 }}><span style={{ color: C.doux }}>Dispositif envisagé : </span>{org.dispositif_envisage || "—"}</div>
        <div style={{ fontSize: 12, color: C.doux, marginTop: 6 }}>Informations à justifier par les documents ci-dessous. Aucun numéro administratif n'est inventé.</div>
      </div>

      <div style={{ fontWeight: 900, fontSize: 15 }}>Autorisations — une par fonction</div>
      {FONCTIONS.map(([fn, titre]) => { const a = aut.find((x: any) => x.fonction === fn); const verrou = !fond && a?.validee_par_fondatrice; return (
        <div key={fn} style={{ ...carte, display: "flex", flexDirection: "column", gap: 8, borderColor: a?.validee_par_fondatrice ? `${C.ok}66` : C.ligne }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
            <b>{titre}</b>
            <span style={{ fontSize: 12, fontWeight: 800, color: a?.validee_par_fondatrice ? C.ok : C.orange }}>{a?.validee_par_fondatrice ? "Vérifiée par la fondatrice" : "Non vérifiée"}</span>
          </div>
          <div style={{ fontSize: 12, color: C.doux }}>{a?.type_autorisation || ""}</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div><div style={lbl}>Statut</div><select style={champ} disabled={verrou} value={a?.statut || "a_demander"} onChange={e => majAut(a, { statut: e.target.value })}>{STATUTS_AUT.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div><div style={lbl}>Demandée le</div><input type="date" style={champ} disabled={verrou} defaultValue={a?.date_demande || ""} onBlur={e => e.target.value !== (a?.date_demande || "") && majAut(a, { date_demande: e.target.value || null })} /></div>
            <div><div style={lbl}>Délivrée le</div><input type="date" style={champ} disabled={verrou} defaultValue={a?.date_delivrance || ""} onBlur={e => e.target.value !== (a?.date_delivrance || "") && majAut(a, { date_delivrance: e.target.value || null })} /></div>
            <div><div style={lbl}>Fin éventuelle</div><input type="date" style={champ} disabled={verrou} defaultValue={a?.date_fin || ""} onBlur={e => e.target.value !== (a?.date_fin || "") && majAut(a, { date_fin: e.target.value || null })} /></div>
          </div>
          <div><div style={lbl}>Activités expressément autorisées</div><input style={champ} disabled={verrou} defaultValue={a?.activites_autorisees || ""} onBlur={e => e.target.value !== (a?.activites_autorisees || "") && majAut(a, { activites_autorisees: e.target.value || null })} /></div>
          <div><div style={lbl}>Restrictions</div><input style={champ} disabled={verrou} defaultValue={a?.restrictions || ""} onBlur={e => e.target.value !== (a?.restrictions || "") && majAut(a, { restrictions: e.target.value || null })} /></div>
          {fond && a && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {!a.validee_par_fondatrice
                ? <button style={btn(true, C.ok)} disabled={!["accordee", "non_requise"].includes(a.statut)} onClick={() => majAut(a, { validee_par_fondatrice: true })}>✓ J'ai vérifié l'autorisation (active CETTE fonction)</button>
                : <button style={btn(true, C.rouge)} onClick={() => majAut(a, { validee_par_fondatrice: false })}>Retirer la validation</button>}
              {!["accordee", "non_requise"].includes(a.statut) && <span style={{ fontSize: 12, color: C.doux, alignSelf: "center" }}>Validation possible une fois l'autorisation accordée.</span>}
            </div>)}
        </div>); })}

      <div style={carte}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>📋 Checklist administrative, juridique et sanitaire</div>
        {DOCS.filter(d => d[0] !== "autre").map(([k, l]) => { const ds = docsDe(k); const ok = ds.some((d: any) => d.statut === "valide"); const att = ds.some((d: any) => d.statut === "a_verifier"); return (
          <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 14, padding: "5px 0", borderTop: `1px solid ${C.ligne}` }}>
            <span>{ok ? "✅" : att ? "⏳" : "☐"} {l}</span><span style={{ fontSize: 12, color: C.doux }}>{ds.length ? `${ds.length} fichier${ds.length > 1 ? "s" : ""}` : "à déposer"}</span>
          </div>); })}
      </div>

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>🏢 Entreprise</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><div style={lbl}>Forme juridique</div><input style={champ} value={f.forme_juridique} onChange={e => setF({ ...f, forme_juridique: e.target.value })} placeholder="Après immatriculation" /></div>
          <div><div style={lbl}>SIRET (14 chiffres, vérifié)</div><input inputMode="numeric" style={champ} value={f.siret} onChange={e => setF({ ...f, siret: e.target.value })} placeholder="Après immatriculation" /></div>
          <div><div style={lbl}>Téléphone pro</div><input style={champ} value={f.telephone} onChange={e => setF({ ...f, telephone: e.target.value })} /></div>
          <div><div style={lbl}>E-mail pro</div><input type="email" style={champ} value={f.email_pro} onChange={e => setF({ ...f, email_pro: e.target.value })} /></div>
        </div>
        <div><div style={lbl}>Adresse du lieu de production</div><input style={champ} value={f.adresse} onChange={e => setF({ ...f, adresse: e.target.value })} /></div>
        <div><div style={lbl}>Futur nom de domaine (facultatif)</div><input style={champ} value={f.domaine_souhaite} onChange={e => setF({ ...f, domaine_souhaite: e.target.value.trim().toLowerCase() })} placeholder="ex. vildorpatisse.fr — aucun achat requis" /></div>
        <div><div style={lbl}>Notes</div><textarea style={{ ...champ, minHeight: 70 }} value={f.notes_partenaire} onChange={e => setF({ ...f, notes_partenaire: e.target.value })} /></div>
        <div style={{ fontSize: 12, color: C.doux }}>Le SIRET de Bella'Studio n'est jamais utilisé à la place du vôtre. Coordonnées bancaires : gérées plus tard par le prestataire de paiement, jamais saisies ici.</div>
        <button style={btn(true)} disabled={envoi} onClick={enregistrer}>{envoi ? "…" : "💾 Enregistrer"}</button>
      </div>

      {fond && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8, borderColor: `${C.or}66` }}>
          <div style={{ fontWeight: 800 }}>🔐 Statut administratif (fondatrice)</div>
          <select style={champ} value={org.statut_admin} onChange={async e => { try { await sbUpdate("bellaia_organisations", org.id, { statut_admin: e.target.value, updated_at: new Date().toISOString() }); setMsg(`✅ Statut mis à jour à ${heure()}`); onMaj(); } catch (er: any) { setMsg("❌ " + er.message); } }}>
            {STATUTS_ORG.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <div style={{ fontSize: 12, color: C.doux }}>Les ventes et versements ne peuvent être activés qu'au statut « Partenaire validé » avec un SIRET vérifié (contrôle en base). Aucune activation n'est faite ici automatiquement.</div>
        </div>)}
    </div>
  );
}

function Documents({ org, docs, fond, setMsg, onMaj }: any) {
  const [cat, setCat] = useState("cumul_demande");
  const [envoi, setEnvoi] = useState(false);
  const [expire, setExpire] = useState("");
  const deposer = async (fichiers: FileList | null) => {
    if (!fichiers?.length) return;
    setEnvoi(true);
    for (const fi of Array.from(fichiers)) {
      try {
        if (fi.size > 20 * 1024 * 1024) throw new Error("Fichier trop lourd (20 Mo max)");
        const h = await sha256(fi);
        if (docs.some((d: any) => d.sha256 === h)) { setMsg(`ℹ️ « ${fi.name} » est déjà déposé (doublon ignoré).`); continue; }
        const chemin = `organisations/${org.id}/${cat}/${Date.now()}-${nomFichierSur(fi.name)}`;
        await deposerPrive(chemin, fi, fi.type);
        await sbInsert("bellaia_documents_partenaire", { organisation_id: org.id, categorie: cat, titre: fi.name.slice(0, 200), chemin, sha256: h, taille: fi.size, type_mime: fi.type || null, expire_le: expire || null });
        setMsg(`✅ « ${fi.name} » déposé (empreinte vérifiée)`);
      } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    }
    setEnvoi(false); onMaj();
  };
  const verifier = async (d: any, statut: string) => {
    try { await sbUpdate("bellaia_documents_partenaire", d.id, { statut, verifie_le: new Date().toISOString() }); onMaj(); } catch (e: any) { setMsg("❌ " + e.message); }
  };
  const exporter = () => {
    const l = [["Catégorie", "Document", "Statut", "Expire le", "Déposé le", "Empreinte SHA-256"].join(";"),
      ...docs.map((d: any) => [DOCS.find(x => x[0] === d.categorie)?.[1] || d.categorie, d.titre, STATUTS_DOC[d.statut]?.[0], d.expire_le || "", new Date(d.created_at).toLocaleDateString("fr-FR"), d.sha256 || ""].join(";"))];
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob(["﻿" + l.join("\n")], { type: "text/csv;charset=utf-8" })); a.download = "vildor-documents.csv"; a.click();
  };
  const bientot = (d: any) => d.expire_le && new Date(d.expire_le) < new Date(Date.now() + 30 * 86400e3);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>📤 Déposer un document</div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 8 }}>
          <select style={champ} value={cat} onChange={e => setCat(e.target.value)}>{DOCS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
          <input type="date" style={champ} value={expire} onChange={e => setExpire(e.target.value)} title="Date d'expiration éventuelle" />
        </div>
        <label style={{ ...btn(true), alignSelf: "flex-start" }}>{envoi ? "Dépôt…" : "📷 Scanner, photographier ou choisir un fichier"}
          <input type="file" multiple accept="application/pdf,image/*,.heic,.doc,.docx" style={{ display: "none" }} disabled={envoi} onChange={e => { deposer(e.target.files); e.currentTarget.value = ""; }} />
        </label>
        <div style={{ fontSize: 12, color: C.doux }}>PDF, JPEG, PNG, HEIC… Sur iPhone : « Scanner des documents » ou « Choisir un fichier ». Fichiers privés, liens temporaires uniquement. Doublons détectés par empreinte.</div>
      </div>
      {docs.length > 0 && <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={exporter}>⬇️ Exporter la liste (CSV)</button>}
      {docs.map((d: any) => { const [sl, sc] = STATUTS_DOC[d.statut] || ["?", C.doux]; return (
        <div key={d.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
            <b style={{ wordBreak: "break-word" }}>{d.titre}</b><span style={{ fontSize: 12, fontWeight: 800, color: sc }}>{sl}</span>
          </div>
          <div style={{ fontSize: 12, color: C.doux }}>{DOCS.find(x => x[0] === d.categorie)?.[1] || d.categorie} · déposé le {new Date(d.created_at).toLocaleDateString("fr-FR")}{d.expire_le ? ` · expire le ${new Date(d.expire_le + "T12:00").toLocaleDateString("fr-FR")}` : ""}</div>
          {bientot(d) && <div style={{ fontSize: 12, color: C.rouge }}>⚠️ Expiration proche ou dépassée</div>}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            <button style={btn()} onClick={() => ouvrirPrive(d.chemin)}>👁 Ouvrir</button>
            {fond && d.statut !== "valide" && <button style={btn(true, C.ok)} onClick={() => verifier(d, "valide")}>✓ Valider</button>}
            {fond && d.statut !== "refuse" && <button style={btn()} onClick={() => verifier(d, "refuse")}>Refuser</button>}
          </div>
        </div>); })}
    </div>
  );
}

function Produits({ fond, setMsg }: any) {
  const [liste, setListe] = useState<any[] | null>(null);
  const [prop, setProp] = useState<Record<string, string>>({});
  const charger = async () => { try { setListe(await sbRpc("partenaire_mes_produits", {})); } catch (e: any) { setMsg("❌ " + e.message); setListe([]); } };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);
  const familles = useMemo(() => Array.from(new Set((liste || []).map(p => p.famille))), [liste]);
  if (liste === null) return <div style={{ color: C.doux }}>Chargement…</div>;
  if (fond && !liste.length) return <div style={{ ...carte, fontSize: 13, color: C.doux }}>Vue réservée au compte partenaire : elle affiche uniquement son tarif fournisseur. Vos prix de revente et marges sont dans Bella'Food → Collection saisonnière.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ ...carte, fontSize: 13, color: C.doux }}>Vos tarifs fournisseur. Vous pouvez proposer une modification : elle s'applique aux futures commandes après validation de la fondatrice ; les commandes passées gardent leurs conditions.</div>
      {familles.map(f => (
        <div key={f} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontWeight: 900, color: C.or }}>{f}</div>
          {liste.filter(p => p.famille === f).map(p => { const inc = ALLERGENES.filter(([k]) => (p.allergenes?.[k]?.statut || "inconnu") === "inconnu").length; return (
            <div key={p.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}><b>{p.nom}</b><b>{euros(p.prix_fournisseur_centimes)}</b></div>
              <div style={{ fontSize: 12, color: C.doux }}>{p.nb_parts} parts · Parfums : {p.parfums?.length ? p.parfums.join(", ") : "à renseigner"} · Allergènes à renseigner : {inc}/14</div>
              {p.proposition_en_cours != null && <div style={{ fontSize: 12, color: C.bleu }}>Proposition en attente : {euros(p.proposition_en_cours)}</div>}
              <div style={{ display: "flex", gap: 6 }}>
                <input inputMode="decimal" style={{ ...champ, maxWidth: 140 }} placeholder="Nouveau tarif €" value={prop[p.id] || ""} onChange={e => setProp({ ...prop, [p.id]: e.target.value })} />
                <button style={btn()} onClick={async () => { const c = versCentimes(prop[p.id] || ""); if (c == null || Number.isNaN(c)) { setMsg("❌ Tarif invalide"); return; } try { await sbRpc("partenaire_proposer_tarif", { p_produit: p.id, p_prix_centimes: c, p_commentaire: null }); setMsg("✅ Proposition envoyée à la fondatrice"); setProp({ ...prop, [p.id]: "" }); charger(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Proposer</button>
              </div>
            </div>); })}
        </div>))}
      {!liste.length && <div style={{ color: C.doux }}>Aucun produit pour le moment.</div>}
      <div style={{ ...carte, fontSize: 12, color: C.doux }}>Légende allergènes : {STATUTS_ALLERGENE.map(s => s[1]).join(" · ")}. Une donnée manquante n'est jamais une absence.</div>
    </div>
  );
}

function Commandes({ fond, setMsg }: any) {
  const [liste, setListe] = useState<any[] | null>(null);
  const charger = async () => { try { setListe(await sbRpc("partenaire_mes_commandes", {})); } catch (e: any) { setMsg("❌ " + e.message); setListe([]); } };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);
  if (liste === null) return <div style={{ color: C.doux }}>Chargement…</div>;
  if (fond && !liste.length) return <div style={{ ...carte, fontSize: 13, color: C.doux }}>Les récapitulatifs se préparent dans Bella'Food → Collection saisonnière → Récap fournisseur. Ils apparaissent ici, côté partenaire, une fois transmis.</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {!liste.length && <div style={{ color: C.doux }}>Aucune commande reçue pour le moment.</div>}
      {liste.map(c => (
        <div key={c.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}><b>{c.reference}</b><span style={{ fontSize: 12, fontWeight: 800, color: c.simulation ? C.orange : C.ok }}>{c.simulation ? "SIMULATION" : "Commande réelle"} · {c.statut}</span></div>
          {(c.lignes || []).map((x: any, i: number) => <div key={i} style={{ fontSize: 14 }}>{x.quantite} × {x.nom} — {x.parfum || "parfum à préciser"} · {euros(x.prix_fournisseur_centimes)}</div>)}
          <div style={{ fontSize: 14 }}>Votre rémunération : <b>{euros(c.part_fournisseur_centimes)}</b>{c.date_retrait ? ` · retrait le ${new Date(c.date_retrait + "T12:00").toLocaleDateString("fr-FR")}` : ""}</div>
          {c.statut === "envoyee" && !fond && (
            <div style={{ display: "flex", gap: 6 }}>
              <button style={btn(true, C.ok)} onClick={async () => { try { await sbRpc("partenaire_repondre_commande", { p_id: c.id, p_decision: "confirmee", p_message: null }); setMsg("✅ Disponibilité confirmée"); charger(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Je confirme</button>
              <button style={btn()} onClick={async () => { const m = prompt("Motif (facultatif)") || null; try { await sbRpc("partenaire_repondre_commande", { p_id: c.id, p_decision: "refusee", p_message: m }); setMsg("Commande refusée"); charger(); } catch (e: any) { setMsg("❌ " + e.message); } }}>Je refuse</button>
            </div>)}
        </div>))}
    </div>
  );
}

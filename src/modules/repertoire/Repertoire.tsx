"use client";
// ═══════════════════════════════════════════════════════════
// Répertoire central Bellaïa — espace fondatrice (Organisation › Répertoire).
// Un seul répertoire pour toute l'application : comptes Bellaïa et contacts externes (fournisseurs,
// prestataires… sans création de compte). Catégories multiples, recherche, fiche, doublons, import
// CSV ou VCF (aperçu puis enregistrement), export CSV, VCF et PDF (impression).
// Avant la migration 0145 : consultation des comptes, export et aperçu d'import seulement ; l'ajout de
// contacts externes et l'enregistrement d'un import nécessitent 0145 (indiqué à l'écran).
// Le carnet d'adresses de l'iPhone n'est pas accessible depuis Safari : on exporte une fiche .vcf
// depuis Contacts (Partager la fiche) puis on l'importe ici.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbInsert } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, heure } from "../equipe/equipeLib";
import SelecteurContact from "./SelecteurContact";
import { CATEGORIES_INITIALES, POLES, depuisCSV, depuisVCF, detecterDoublons, rechercher, versCSV, versVCF, type Contact } from "./repertoire";
import { chargerRepertoire, type SourceRepertoire } from "./repertoireApi";

const nomCat = (c: string) => CATEGORIES_INITIALES.find(x => x[0] === c)?.[1] || c;
const nomPole = (p: string) => POLES.find(x => x.id === p)?.nom || p;
function telecharger(nom: string, contenu: string, type: string) {
  const url = URL.createObjectURL(new Blob([contenu], { type }));
  const a = document.createElement("a"); a.href = url; a.download = nom; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 3000);
}

export default function Repertoire() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [source, setSource] = useState<SourceRepertoire>("repli");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [fiche, setFiche] = useState<Contact | null>(null);
  const [apercu, setApercu] = useState<{ contacts: Contact[]; erreurs: string[] } | null>(null);
  const [msg, setMsg] = useState("");
  const charger = async () => { try { const r = await chargerRepertoire(); setContacts(r.contacts); setSource(r.source); } catch (e: any) { setMsg("❌ " + String(e?.message || e)); } };
  useEffect(() => { charger(); }, []);
  const liste = useMemo(() => rechercher(contacts, q, { categorie: cat || undefined }), [contacts, q, cat]);
  const doublons = useMemo(() => detecterDoublons(contacts), [contacts]);
  const doublonsImport = useMemo(() => apercu ? detecterDoublons([...contacts, ...apercu.contacts]).filter(d => apercu.contacts.some(c => c.id === d.b)) : [], [apercu, contacts]);
  const compter = (c: string) => contacts.filter(x => x.categories.includes(c)).length;

  const importer = async (f: File) => {
    const t = await f.text();
    const r = /\.vcf$/i.test(f.name) || /BEGIN:VCARD/i.test(t) ? { contacts: depuisVCF(t), erreurs: [] } : depuisCSV(t);
    setApercu(r); setMsg(r.contacts.length ? "" : "❌ Aucun contact lisible dans ce fichier.");
  };
  const enregistrerImport = async () => {
    if (!apercu) return;
    if (source !== "serveur") { setMsg("❌ L'enregistrement des contacts importés nécessite la mise à jour de la base du répertoire (0145), en attente de votre autorisation. L'aperçu et l'export restent possibles."); return; }
    const aGarder = apercu.contacts.filter(c => !doublonsImport.some(d => d.b === c.id));
    try {
      await sbInsert("bellaia_repertoire", aGarder.map(c => ({ prenom: c.prenom, nom: c.nom, pseudo: c.pseudo, email: c.email, telephone: c.telephone, entreprise: c.entreprise, categories: c.categories.filter(x => CATEGORIES_INITIALES.some(k => k[0] === x)), poles: c.poles })), "return=minimal");
      setMsg(`✅ ${aGarder.length} contact(s) enregistré(s) à ${heure()} ; ${apercu.contacts.length - aGarder.length} doublon(s) écarté(s) pour fusion manuelle.`); setApercu(null); charger();
    } catch (e: any) { setMsg("❌ Import interrompu : " + String(e?.message || e) + " — aperçu conservé."); }
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto", paddingBottom: 90 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>📇 Répertoire</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>Un seul répertoire pour toute Bellaïa. Un contact peut appartenir à plusieurs catégories. Les contacts externes n'ont pas de compte et n'en reçoivent pas automatiquement.</div>
        {source === "repli" && <div data-testid="repertoire-repli" style={{ fontSize: 12, color: C.orange, marginTop: 6 }}>Mode consultation : comptes Bellaïa uniquement. Ajout de contacts externes, catégories personnalisées et enregistrement des imports après la mise à jour de la base (0145).</div>}
      </div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}>
        <button style={btn(!cat)} onClick={() => setCat("")}>Tous ({contacts.length})</button>
        {CATEGORIES_INITIALES.map(([k, l]) => compter(k) ? <button key={k} data-testid={`cat-${k}`} style={btn(cat === k)} onClick={() => setCat(cat === k ? "" : k)}>{l} ({compter(k)})</button> : null)}
      </div>
      <input type="search" data-testid="repertoire-recherche" aria-label="Rechercher dans le répertoire" placeholder="Nom, prénom, e-mail, téléphone, entreprise…" value={q} onChange={e => setQ(e.target.value)} style={champ} />
      {doublons.length > 0 && <div data-testid="doublons" style={{ ...carte, fontSize: 13, color: C.orange }}>{doublons.length} doublon(s) probable(s) détecté(s) (même e-mail, même téléphone ou même nom et entreprise). Fusion contrôlée depuis la fiche, après vérification.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {liste.slice(0, 200).map(c => (
          <button key={c.id} data-testid="ligne-contact" onClick={() => setFiche(c)} style={{ ...carte, textAlign: "left", cursor: "pointer", padding: 10, border: `1px solid ${C.ligne}`, color: C.texte }}>
            <div style={{ fontWeight: 700 }}>{[c.prenom, c.nom].filter(Boolean).join(" ") || c.entreprise || "Sans nom"} <span style={{ fontSize: 12, fontWeight: 400, color: C.doux }}>{c.compte ? "· compte Bellaïa" : "· contact externe"}</span></div>
            <div style={{ fontSize: 12, color: C.doux }}>{[...c.categories.map(nomCat), ...c.poles.map(nomPole)].join(" · ")}</div>
          </button>))}
        {!liste.length && <div style={{ color: C.doux, fontSize: 13 }}>Aucun contact.</div>}
      </div>
      {fiche && (
        <div data-testid="fiche-contact" style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 900, fontSize: 17 }}>{[fiche.prenom, fiche.nom].filter(Boolean).join(" ") || fiche.entreprise}</div>
          {fiche.pseudo && <div>Pseudonyme : {fiche.pseudo}</div>}
          <div style={{ wordBreak: "break-all" }}>E-mail : {fiche.email || "—"}</div>
          <div>Téléphone : {fiche.telephone || "—"}</div>
          {fiche.entreprise && <div>Entreprise : {fiche.entreprise}</div>}
          <div>Catégories : {fiche.categories.map(nomCat).join(", ") || "—"}</div>
          <div>Pôles : {fiche.poles.map(nomPole).join(", ") || "—"}</div>
          <div>Statut : {fiche.statut || "—"} · {fiche.compte ? "compte Bellaïa (affectations et permissions dans « Accès & permissions »)" : "contact externe, sans compte"}</div>
          <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => setFiche(null)}>Fermer</button>
        </div>)}
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>Importer et exporter</div>
        <label style={{ ...btn(), position: "relative", overflow: "hidden", alignSelf: "flex-start" }}>Importer un fichier CSV ou VCF
          <input data-testid="import-repertoire" type="file" accept=".csv,.vcf,text/csv,text/vcard,text/x-vcard" style={{ position: "absolute", inset: 0, opacity: 0, fontSize: 100 }} onChange={e => { const f = e.target.files?.[0]; if (f) importer(f); e.target.value = ""; }} />
        </label>
        <div style={{ fontSize: 12, color: C.doux }}>iPhone : Safari n'a pas accès à vos Contacts. Dans l'app Contacts, ouvrez une fiche › Partager la fiche, enregistrez le fichier .vcf, puis importez-le ici.</div>
        {apercu && (
          <div data-testid="apercu-import" style={{ fontSize: 13 }}>
            Aperçu : {apercu.contacts.length} contact(s) lu(s){doublonsImport.length ? `, dont ${doublonsImport.length} doublon(s) probable(s) avec le répertoire (écarté(s) de l'enregistrement)` : ""}.
            {apercu.erreurs.map(e => <div key={e} style={{ color: C.orange }}>{e}</div>)}
            <ul style={{ margin: "6px 0", paddingLeft: 18 }}>{apercu.contacts.slice(0, 10).map(c => <li key={c.id}>{[c.prenom, c.nom].filter(Boolean).join(" ")}{c.entreprise ? ` — ${c.entreprise}` : ""}{doublonsImport.some(d => d.b === c.id) ? " (doublon probable)" : ""}</li>)}</ul>
            <div style={{ display: "flex", gap: 8 }}><button style={btn(true)} onClick={enregistrerImport}>Enregistrer l'import</button><button style={btn()} onClick={() => setApercu(null)}>Abandonner</button></div>
          </div>)}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button data-testid="export-csv" style={btn()} onClick={() => telecharger(`repertoire_${cat || "tous"}.csv`, "﻿" + versCSV(liste), "text/csv;charset=utf-8")}>Exporter CSV</button>
          <button data-testid="export-vcf" style={btn()} onClick={() => telecharger(`repertoire_${cat || "tous"}.vcf`, versVCF(liste), "text/vcard;charset=utf-8")}>Exporter VCF</button>
          <button style={btn()} onClick={() => window.print()}>PDF (impression)</button>
        </div>
      </div>
      {msg && <div role="status" data-testid="message-repertoire" style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontWeight: 800 }}>Sélecteur commun (aperçu)</div>
        <div style={{ fontSize: 12, color: C.doux }}>Le même sélecteur sert dans tous les modules (missions, nominations, devis, factures, commandes, rendez-vous, événements, Secret Agenda, Secret Games, Secret World, fournisseurs), filtré selon le module et vos droits.</div>
        <SelecteurContact theme="sombre" contacts={contacts} onChoisir={c => setFiche(c)} testid="selecteur-repertoire" />
      </div>
    </div>
  );
}

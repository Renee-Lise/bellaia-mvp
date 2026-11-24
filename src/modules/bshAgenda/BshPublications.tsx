"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Publications (table bsh_communications)
// Préparer, modifier, prévisualiser, valider. Aucune publication
// automatique : on copie le texte / télécharge le visuel / ouvre
// WhatsApp. Quatre étapes distinctes (continuite.ts) : génération,
// validation, programmation, puis publication CONFIRMÉE avec preuve
// (fonction bsh_confirmer_publication, migration 0141). Une
// programmation interne n'est jamais présentée comme publiée.
// Duplication et récurrences (série de copies liées par serie_id).
// ═══════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import {
  K, SA, FS, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, ChoixHote, nomHote,
  sbInsert, sbUpdate, sbDelete, uploadStorage, compresserImage, slug, telecharger, fichierRappel,
  versIso, cleJour, heureCayenne, aujourdhui, plusJours, jourSemaine, libelleInstant, ESPACES, STATUTS_PUB, statutPub, JOURS_COURTS, BUCKET_BSH,
} from "./bshAgendaLib";
import type { Donnees } from "./BshAgendaHub";
import { sbRpc } from "./bshAgendaLib";
import { controleTransition, etapePublication, dupliquer as dupliquerContenu, preuveSuffisante, ETAPES_PUBLICATION } from "./continuite";

export type Publication = {
  id?: string; titre: string; contenu: string; type: string; cible: string; statut: string; espace: string | null;
  date_programmee: string | null; visuel_url: string | null; lien_externe: string | null; jeu_id?: string | null;
  thematique: string | null; fuseau?: string; hote_id: string | null; notes_internes: string | null; date_publication_effective: string | null;
  creneau: string | null; campagne_id: string | null; serie_id?: string | null; recurrence?: any; rappel_le?: string | null; publiee_le?: string | null;
  valide_le?: string | null; valide_par?: string | null; historique?: boolean;
};
/** Validation constatée : date de validation (0141), ou statut déjà validé dans une base antérieure à 0141. */
export const dateValidation = (p: Publication, v141: boolean) => v141 ? (p.valide_le || null) : (["valide", "programme", "pret", "publie"].includes(p.statut) ? "statut" : null);
export function etapeDe(p: Publication, d: Donnees) {
  const preuve = d.preuves.find(x => x.communication_id === p.id);
  return etapePublication({ ...p, valide_le: dateValidation(p, d.v141), preuve_publication: preuve?.preuve || null, confirme_le: preuve?.publie_le || null });
}

export function nouvellePublication(date?: string, heure?: string, thematique?: string | null): Publication {
  return { titre: "", contenu: "", type: "publication", cible: "tous", statut: "brouillon", espace: "chaine", date_programmee: date ? versIso(date, heure || "08:00") : null, visuel_url: null, lien_externe: null, thematique: thematique || null, hote_id: null, notes_internes: null, date_publication_effective: null, creneau: heure || null, campagne_id: null };
}

// ── Actions de partage (manuelles, aucune simulation) ─────────
export async function copierTexte(p: Publication) {
  try { await navigator.clipboard.writeText(p.contenu || ""); return true; } catch { return false; }
}
export function ouvrirWhatsApp(p: Publication) { window.open(`https://wa.me/?text=${encodeURIComponent(p.contenu || "")}`, "_blank", "noopener"); }
export async function telechargerVisuel(p: Publication) {
  if (!p.visuel_url) return;
  try { const r = await fetch(p.visuel_url); const b = await r.blob(); const ext = (b.type.split("/")[1] || "jpg").replace("jpeg", "jpg"); telecharger(b, `${slug(p.titre || "visuel")}.${ext}`); }
  catch { window.open(p.visuel_url, "_blank", "noopener"); }
}

// ── Récurrence → liste des dates (heure de Cayenne) ──────────
type Recurrence = { type: "aucune" | "quotidienne" | "hebdomadaire" | "tous_les_n_jours" | "jours_semaine" | "mensuelle"; n?: number; jours?: number[]; jusqua?: string };
function datesRecurrence(debut: string, r: Recurrence): string[] {
  if (!r || r.type === "aucune" || !r.jusqua) return [];
  const out: string[] = []; let c = debut;
  for (let i = 0; i < 400 && out.length < 120; i++) {
    if (r.type === "quotidienne") c = plusJours(c, 1);
    else if (r.type === "hebdomadaire") c = plusJours(c, 7);
    else if (r.type === "tous_les_n_jours") c = plusJours(c, Math.max(1, r.n || 2));
    else if (r.type === "mensuelle") { const [a, m, j] = debut.split("-").map(Number); const d = new Date(Date.UTC(a, m - 1 + out.length + 1, j, 12)); c = d.toISOString().slice(0, 10); }
    else if (r.type === "jours_semaine") { c = plusJours(c, 1); if (!(r.jours || []).includes(jourSemaine(c))) continue; }
    if (c > r.jusqua) break;
    out.push(c);
  }
  return out;
}

const CHAMPS_ENREG = ["titre", "contenu", "type", "cible", "statut", "espace", "date_programmee", "visuel_url", "lien_externe", "thematique", "hote_id", "notes_internes", "date_publication_effective", "creneau", "campagne_id", "serie_id", "recurrence", "rappel_le", "jeu_id"];
const propre = (p: any, v141 = false) => { const o: any = {}; [...CHAMPS_ENREG, ...(v141 ? ["valide_le", "valide_par", "historique"] : [])].forEach(k => { if (p[k] !== undefined) o[k] = p[k] === "" ? null : p[k]; }); o.fuseau = "America/Cayenne"; o.updated_at = new Date().toISOString(); return o; };

// ── Éditeur ──────────────────────────────────────────────────
export function EditeurPublication({ initiale, d, onFermer, onEnregistre }: { initiale: Publication; d: Donnees; onFermer: () => void; onEnregistre: () => void }) {
  const [p, setP] = useState<Publication>(initiale);
  const [date, setDate] = useState(initiale.date_programmee ? cleJour(initiale.date_programmee) : "");
  const [heure, setHeure] = useState(initiale.date_programmee ? heureCayenne(initiale.date_programmee) : "08:00");
  const [rec, setRec] = useState<Recurrence>(initiale.recurrence || { type: "aucune" });
  const [apercu, setApercu] = useState(false);
  const [erreur, setErreur] = useState("");
  const [occupe, setOccupe] = useState("");
  const maj = (patch: Partial<Publication>) => setP(x => ({ ...x, ...patch }));
  const themes = useMemo(() => Array.from(new Set(d.jours.map(j => j.thematique).concat(["Pensée du jour", "Annonce", "Sondage", "Animation"]))), [d.jours]);

  const choisirDate = (v: string) => {
    setDate(v);
    if (v && !p.thematique) { const j = d.jours.find(x => x.jour_semaine === jourSemaine(v)); if (j && !j.en_pause) maj({ thematique: j.thematique }); }
  };
  const envoyerVisuel = async (f?: File) => {
    if (!f) return; setOccupe("Envoi du visuel…");
    try { const c = await compresserImage(f); const url = await uploadStorage(`publications/${Date.now().toString(36)}-${slug(f.name.replace(/\.[^.]+$/, ""))}.${c.ext}`, c.blob, c.type, BUCKET_BSH); maj({ visuel_url: url }); }
    catch (e: any) { setErreur("Visuel : " + (e.message || e)); }
    setOccupe("");
  };

  const enregistrer = async () => {
    if (!p.titre.trim()) return setErreur("Le titre est obligatoire.");
    const datep = date ? versIso(date, heure) : null;
    // Étapes : valider fixe la date de validation ; programmer exige une validation ; « publié » passe par la confirmation avec preuve
    const validation = p.statut === "valide" && !dateValidation(initiale, d.v141) ? new Date().toISOString() : (initiale.valide_le || null);
    const refus = p.statut === initiale.statut ? null : p.statut === "publie" ? "Pour déclarer une publication, utilise « Confirmer la publication » : une preuve est demandée." : controleTransition({ ...initiale, ...p, date_programmee: datep, valide_le: validation || dateValidation(initiale, d.v141) }, p.statut);
    if (refus) return setErreur(refus);
    setErreur(""); setOccupe("Enregistrement…");
    const base = propre({ ...p, date_programmee: datep, creneau: date ? heure : p.creneau, recurrence: rec.type === "aucune" ? null : rec, ...(d.v141 ? { valide_le: validation } : {}) }, d.v141);
    try {
      if (p.id) await sbUpdate("bsh_communications", p.id, base);
      else {
        const dates = date ? datesRecurrence(date, rec) : [];
        const serie = dates.length ? crypto.randomUUID() : null;
        await sbInsert("bsh_communications", { ...base, serie_id: serie }, "return=minimal");
        if (dates.length) await sbInsert("bsh_communications", dates.map(dt => ({ ...base, serie_id: serie, date_programmee: versIso(dt, heure), statut: "brouillon", date_publication_effective: null })), "return=minimal");
      }
      onEnregistre(); onFermer();
    } catch (e: any) { setErreur(e.message || String(e)); }
    setOccupe("");
  };
  const supprimer = async () => {
    if (!p.id || !confirm("Supprimer définitivement cette publication ? (Pour la garder sans la publier, choisis plutôt « Annulé » ou « Archivé ».)")) return;
    try { await sbDelete("bsh_communications", p.id); onEnregistre(); onFermer(); } catch (e: any) { setErreur(e.message); }
  };

  return (
    <Feuille titre={p.id ? "Modifier la publication" : "Nouvelle publication"} onFermer={onFermer} large>
      <div style={grille(220)}>
        <Champ label="Titre *"><input style={champ} value={p.titre} onChange={e => maj({ titre: e.target.value })} placeholder="Ex. Mystère du lundi" /></Champ>
        <Champ label="Statut"><select style={champ} value={p.statut} onChange={e => maj({ statut: e.target.value })}>{STATUTS_PUB.filter(([v]) => v !== "publie" || initiale.statut === "publie").map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
        <Champ label="Date (heure de Cayenne)"><input style={champ} type="date" value={date} onChange={e => choisirDate(e.target.value)} /></Champ>
        <Champ label="Heure" aide="Fuseau America/Cayenne (UTC−3)"><div style={{ display: "flex", gap: 6 }}><input style={champ} type="time" value={heure} onChange={e => setHeure(e.target.value)} />{["08:00", "21:00"].map(h => <button key={h} style={bouton(heure === h ? "or" : "ghost", true)} onClick={() => setHeure(h)}>{h.replace(":00", " h")}</button>)}</div></Champ>
        <Champ label="Thématique"><input style={champ} list="bsh-themes" value={p.thematique || ""} onChange={e => maj({ thematique: e.target.value })} /><datalist id="bsh-themes">{themes.map(t => <option key={t} value={t} />)}</datalist></Champ>
        <Champ label="Espace de destination"><select style={champ} value={p.espace || ""} onChange={e => maj({ espace: e.target.value || null })}><option value="chaine">Chaîne BSH</option><option value="cercle">Cercle BSH</option><option value="lounge">BSH Lounge</option></select></Champ>
        <Champ label="Hôte responsable"><ChoixHote hotes={d.hotes} valeur={p.hote_id} onChange={v => maj({ hote_id: v })} /></Champ>
        <Champ label="Campagne"><select style={champ} value={p.campagne_id || ""} onChange={e => maj({ campagne_id: e.target.value || null })}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
        <Champ label="Type"><select style={champ} value={p.type} onChange={e => maj({ type: e.target.value })}><option value="publication">Publication</option><option value="annonce">Annonce</option><option value="notification">Notification</option></select></Champ>
        <Champ label="Date de publication effective" aide="Remplie par « Marquer comme publié »"><input style={champ} type="datetime-local" value={p.date_publication_effective ? `${cleJour(p.date_publication_effective)}T${heureCayenne(p.date_publication_effective)}` : ""} onChange={e => maj({ date_publication_effective: e.target.value ? versIso(e.target.value.slice(0, 10), e.target.value.slice(11, 16)) : null })} /></Champ>
      </div>

      <Champ label="Texte complet">
        <div style={{ display: "flex", gap: 6, marginBottom: 4 }}><button style={bouton(!apercu ? "or" : "ghost", true)} onClick={() => setApercu(false)}>✏️ Rédiger</button><button style={bouton(apercu ? "or" : "ghost", true)} onClick={() => setApercu(true)}>👁 Aperçu</button><span style={{ fontSize: 10, color: K.cremeD, alignSelf: "center" }}>{(p.contenu || "").length} caractères</span></div>
        {!apercu ? <textarea style={{ ...champ, minHeight: 170, lineHeight: 1.6 }} value={p.contenu} onChange={e => maj({ contenu: e.target.value })} placeholder="Le texte tel qu'il sera publié. *gras* et _italique_ fonctionnent dans WhatsApp." />
          : <div style={{ background: "#0b141a", borderRadius: 12, padding: 14 }}>
            <div style={{ maxWidth: 420, background: "#202c33", color: "#e9edef", borderRadius: "0 10px 10px 10px", padding: 8, fontSize: 13.5, lineHeight: 1.45, whiteSpace: "pre-wrap", fontFamily: SA }}>
              {p.visuel_url && <img src={p.visuel_url} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 6, display: "block" }} />}
              {(p.contenu || "Aucun texte").split(/(\*[^*\n]+\*|_[^_\n]+_)/).map((s, i) => s.startsWith("*") && s.endsWith("*") && s.length > 2 ? <b key={i}>{s.slice(1, -1)}</b> : s.startsWith("_") && s.endsWith("_") && s.length > 2 ? <i key={i}>{s.slice(1, -1)}</i> : <React.Fragment key={i}>{s}</React.Fragment>)}
              <div style={{ textAlign: "right", fontSize: 10, color: "#8696a0", marginTop: 3 }}>{heure}</div>
            </div>
          </div>}
      </Champ>

      <div style={grille(240)}>
        <Champ label="Visuel associé">
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {p.visuel_url && <img src={p.visuel_url} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />}
            <label style={bouton("ghost", true)}>📷 {p.visuel_url ? "Changer" : "Ajouter"}<input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { envoyerVisuel(e.target.files?.[0]); e.target.value = ""; }} /></label>
            {p.visuel_url && <button style={bouton("danger", true)} onClick={() => maj({ visuel_url: null })}>Retirer</button>}
          </div>
        </Champ>
        <Champ label="Lien (facultatif)"><input style={champ} value={p.lien_externe || ""} onChange={e => maj({ lien_externe: e.target.value })} placeholder="https://…" /></Champ>
      </div>
      <Champ label="Notes internes (jamais publiées)"><textarea style={{ ...champ, minHeight: 56 }} value={p.notes_internes || ""} onChange={e => maj({ notes_internes: e.target.value })} /></Champ>

      {!p.id && (
        <Carte style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>🔁 Récurrence</div>
          <div style={grille(170)}>
            <select style={champ} value={rec.type} onChange={e => setRec({ ...rec, type: e.target.value as any })}>
              <option value="aucune">Aucune (une seule fois)</option><option value="quotidienne">Tous les jours</option><option value="tous_les_n_jours">Tous les N jours</option>
              <option value="jours_semaine">Certains jours de la semaine</option><option value="hebdomadaire">Chaque semaine</option><option value="mensuelle">Chaque mois</option>
            </select>
            {rec.type === "tous_les_n_jours" && <input style={champ} type="number" min={1} value={rec.n || 2} onChange={e => setRec({ ...rec, n: Number(e.target.value) })} />}
            {rec.type !== "aucune" && <input style={champ} type="date" value={rec.jusqua || ""} onChange={e => setRec({ ...rec, jusqua: e.target.value })} title="Jusqu'au" />}
          </div>
          {rec.type === "jours_semaine" && <div style={{ display: "flex", gap: 5, marginTop: 8, flexWrap: "wrap" }}>{[1, 2, 3, 4, 5, 6, 0].map(j => <button key={j} style={bouton((rec.jours || []).includes(j) ? "or" : "ghost", true)} onClick={() => setRec({ ...rec, jours: (rec.jours || []).includes(j) ? (rec.jours || []).filter(x => x !== j) : [...(rec.jours || []), j] })}>{JOURS_COURTS[j]}</button>)}</div>}
          {rec.type !== "aucune" && <div style={{ fontSize: 11, color: K.cremeD, marginTop: 8 }}>{!date ? "Choisis d'abord une date." : !rec.jusqua ? "Indique la date de fin." : `${datesRecurrence(date, rec).length + 1} publications seront créées en brouillon (120 maximum).`}</div>}
        </Carte>
      )}

      <Erreur msg={erreur} />
      {occupe && <div style={{ fontSize: 12, color: K.or }}>⏳ {occupe}</div>}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
        {p.id && <button style={bouton("danger")} onClick={supprimer}>Supprimer</button>}
        <div style={{ flex: 1 }} />
        <button style={bouton("ghost")} onClick={onFermer}>Annuler</button>
        <button style={bouton("plein")} onClick={enregistrer} disabled={!!occupe}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}

// ── Carte publication + actions ──────────────────────────────
export function CartePublication({ p, d, onModifier, recharger, compacte }: { p: Publication; d: Donnees; onModifier: (p: Publication) => void; recharger: () => void; compacte?: boolean }) {
  const [msg, setMsg] = useState("");
  const [, lib, coul] = statutPub(p.statut);
  const hote = d.hotes.find(h => h.id === p.hote_id);
  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 2200); };
  const action = async (patch: any, m: string) => { try { await sbUpdate("bsh_communications", p.id!, { ...patch, updated_at: new Date().toISOString() }); flash(m); recharger(); } catch (e: any) { flash("⚠️ " + e.message); } };
  const dupliquer = async () => {
    const { recurrence, ...reste } = dupliquerContenu(p as any, p.date_programmee) as any; // brouillon, sans validation ni preuve
    try { await sbInsert("bsh_communications", propre(reste, d.v141), "return=minimal"); flash("✅ Dupliquée en brouillon (à valider)"); recharger(); } catch (e: any) { flash("⚠️ " + e.message); }
  };
  const etape = etapeDe(p, d); const nEtape = ETAPES_PUBLICATION.findIndex(e => e[0] === etape) + 1;
  const valide = !!dateValidation(p, d.v141);
  const [confirmer, setConfirmer] = useState(false);
  const valider = () => { const r = controleTransition({ ...p, valide_le: null }, "valide"); if (r) return flash("⚠️ " + r); action(d.v141 ? { statut: "valide", valide_le: new Date().toISOString() } : { statut: "valide" }, "✅ Validée (étape 2/4)"); };
  const programmer = () => { const r = controleTransition({ ...p, valide_le: valide ? "ok" : null }, "programme"); if (r) return flash("⚠️ " + r); action({ statut: "programme" }, "🗓 Programmée (étape 3/4) : rien n'est envoyé automatiquement"); };
  const rappel = async () => {
    const quand = p.date_programmee || new Date(Date.now() + 3600000).toISOString();
    telecharger(fichierRappel(p.titre, quand, `${ESPACES[p.espace || ""] || ""}\n\n${p.contenu || ""}`), `rappel-${slug(p.titre)}.ics`);
    await action({ rappel_le: new Date(new Date(quand).getTime() - 30 * 60000).toISOString() }, "⏰ Rappel créé : ouvre le fichier pour l'ajouter à ton agenda (alerte 30 min avant)");
  };
  return (
    <div style={{ background: K.verre, border: `1px solid ${K.ligne}`, borderLeft: `3px solid ${coul}`, borderRadius: 12, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {p.visuel_url && !compacte && <img src={p.visuel_url} alt="" style={{ width: 54, height: 54, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} />}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: K.creme, cursor: "pointer" }} onClick={() => onModifier(p)}>{p.titre}</div>
          <div style={{ fontSize: 11, color: K.cremeD, marginTop: 2 }}>
            {libelleInstant(p.date_programmee)} · {ESPACES[p.espace || ""] || "—"}{p.thematique ? ` · ${p.thematique}` : ""}{hote ? ` · 👤 ${nomHote(hote)}` : ""}
          </div>
          {p.date_publication_effective && <div style={{ fontSize: 10, color: K.ok, marginTop: 2 }}>Publié le {libelleInstant(p.date_publication_effective)}</div>}
        </div>
        <Etiquette couleur={coul}>{lib}</Etiquette>
      </div>
      {!compacte && p.contenu && <div style={{ fontSize: 12, color: K.cremeF, whiteSpace: "pre-wrap", maxHeight: 64, overflow: "hidden", maskImage: "linear-gradient(#000 60%,transparent)" }}>{p.contenu}</div>}
      <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
        <button style={bouton("ghost", true)} onClick={async () => flash((await copierTexte(p)) ? "📋 Texte copié" : "⚠️ Copie impossible")}>📋 Copier le texte</button>
        {p.visuel_url && <button style={bouton("ghost", true)} onClick={() => telechargerVisuel(p)}>⬇️ Visuel</button>}
        <button style={bouton("ghost", true)} onClick={() => ouvrirWhatsApp(p)}>💬 WhatsApp</button>
        <button style={bouton("ghost", true)} onClick={dupliquer}>⧉ Dupliquer</button>
        <button style={bouton("ghost", true)} onClick={rappel}>⏰ Rappel</button>
        <button style={bouton("ghost", true)} onClick={() => onModifier(p)}>✏️</button>
        {!valide && !["annule", "archive", "publie"].includes(p.statut) && <button style={bouton("or", true)} onClick={valider}>✓ Valider</button>}
        {valide && !["programme", "pret", "publie", "annule", "archive"].includes(p.statut) && <button style={bouton("or", true)} onClick={programmer}>🗓 Programmer</button>}
        {["programme", "pret"].includes(p.statut) && <button style={bouton("or", true)} onClick={() => setConfirmer(true)}>✅ Confirmer la publication…</button>}
      </div>
      <div aria-label="Étape de publication" style={{ fontSize: 10, color: etape === "publication" ? K.ok : K.cremeD }}>
        Étape {nEtape}/4 · {ETAPES_PUBLICATION[nEtape - 1][1].replace(/^\d\. /, "")}{etape === "programmation" ? " — rien n'est publié tant que la publication n'est pas confirmée" : ""}{p.historique ? " · programmation historique (publication non prouvée)" : ""}
      </div>
      {p.statut === "publie" && etape !== "publication" && <div style={{ fontSize: 10, color: K.alerte }}>⚠️ Statut « publié » sans preuve enregistrée : à confirmer ou à corriger.</div>}
      {confirmer && <ConfirmerPublication p={p} d={d} onFermer={() => setConfirmer(false)} onFait={() => { setConfirmer(false); recharger(); }} />}
      {msg && <div style={{ fontSize: 11, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
    </div>
  );
}

// ── Liste ────────────────────────────────────────────────────
export default function BshPublications({ d, recharger, ouvrir }: { d: Donnees; recharger: () => void; ouvrir: (p: Publication) => void }) {
  const [statut, setStatut] = useState("actifs");
  const [espace, setEspace] = useState("tous");
  const [periode, setPeriode] = useState<"avenir" | "passe" | "tout">("avenir");
  const [q, setQ] = useState("");
  const auj = aujourdhui();
  const liste = useMemo(() => d.pubs.filter(p => {
    if (statut === "actifs" ? ["annule", "archive"].includes(p.statut) : statut !== "tous" && p.statut !== statut) return false;
    if (espace !== "tous" && p.espace !== espace) return false;
    const j = p.date_programmee ? cleJour(p.date_programmee) : null;
    if (periode === "avenir" && j && j < auj) return false;
    if (periode === "passe" && (!j || j >= auj)) return false;
    if (q && !(p.titre + " " + (p.contenu || "") + " " + (p.thematique || "")).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  }).sort((a, b) => (a.date_programmee || "9").localeCompare(b.date_programmee || "9") * (periode === "passe" ? -1 : 1)), [d.pubs, statut, espace, periode, q, auj]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre action={<button style={bouton("plein")} onClick={() => ouvrir(nouvellePublication())}>+ Publication</button>}>Publications</Titre>
      <div style={{ fontSize: 11, color: K.cremeD, lineHeight: 1.6 }}>Aucune publication n'est envoyée automatiquement : prépare ici, puis copie le texte, télécharge le visuel ou ouvre WhatsApp, et marque comme publié. Une intégration directe ne sera branchée que via une API officielle autorisée.</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <select style={{ ...champ, width: "auto" }} value={periode} onChange={e => setPeriode(e.target.value as any)}><option value="avenir">À venir</option><option value="passe">Passées</option><option value="tout">Toutes les dates</option></select>
        <select style={{ ...champ, width: "auto" }} value={statut} onChange={e => setStatut(e.target.value)}><option value="actifs">Tous sauf annulés / archivés</option><option value="tous">Tous les statuts</option>{STATUTS_PUB.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
        <select style={{ ...champ, width: "auto" }} value={espace} onChange={e => setEspace(e.target.value)}><option value="tous">Tous les espaces</option><option value="chaine">Chaîne</option><option value="cercle">Cercle</option><option value="lounge">Lounge</option></select>
        <input style={{ ...champ, flex: "1 1 160px", width: "auto" }} placeholder="Rechercher…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      {liste.length === 0 ? <Vide>Aucune publication pour ce filtre.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(360px,100%),1fr))", gap: 10 }}>{liste.map(p => <CartePublication key={p.id} p={p} d={d} onModifier={ouvrir} recharger={recharger} />)}</div>}
    </div>
  );
}

// ── Confirmation d'une publication (étape 4) : preuve obligatoire ──
export function ConfirmerPublication({ p, d, onFermer, onFait }: { p: Publication; d: Donnees; onFermer: () => void; onFait: () => void }) {
  const [preuve, setPreuve] = useState(""); const [url, setUrl] = useState(""); const [err, setErr] = useState(""); const [occupe, setOccupe] = useState(false);
  const envoyer = async () => {
    if (!preuveSuffisante(preuve)) return setErr("Décris la preuve (8 caractères au moins) : lien du message, capture conservée, confirmation de l'hôte.");
    if (url && !/^https:\/\//i.test(url)) return setErr("Le lien doit commencer par https://");
    if (!d.v141) return setErr("La confirmation avec preuve sera disponible après la migration 0141 (en attente de ton accord). Rien n'a été modifié.");
    setOccupe(true); setErr("");
    try { await sbRpc("bsh_confirmer_publication", { p_communication: p.id, p_preuve: preuve.trim(), p_url: url.trim() || null }); onFait(); }
    catch (e: any) { setErr(String(e?.message || e)); }
    setOccupe(false);
  };
  return <Feuille titre="Confirmer la publication" onFermer={onFermer}>
    <div style={{ fontSize: 12, color: K.cremeF }}>« {p.titre} » · {libelleInstant(p.date_programmee)} · {ESPACES[p.espace || ""] || "—"}</div>
    <div style={{ fontSize: 12, color: K.cremeD }}>À remplir uniquement après l'envoi réel dans l'espace BSH. Bellaïa ne publie rien elle-même et ne simule aucun envoi.</div>
    <Champ label="Preuve de publication *" aide="Ex. « Message posté dans la Chaîne BSH à 08:02, capture conservée »"><textarea style={{ ...champ, minHeight: 70 }} value={preuve} onChange={e => setPreuve(e.target.value)} /></Champ>
    <Champ label="Lien (facultatif)"><input style={champ} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://…" inputMode="url" /></Champ>
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} disabled={occupe} onClick={envoyer}>✅ Confirmer avec cette preuve</button></div>
  </Feuille>;
}

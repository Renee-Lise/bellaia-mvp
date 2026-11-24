"use client";
// ═══════════════════════════════════════════════════════════
// BSH — Médiathèque éditoriale commune (Secret Agenda, Secret Games, Rewards).
// Chaque ressource : univers, campagne, espace, date, type, auteur, validation, droits d'utilisation.
// Pas de doublon : empreinte SHA-256 du fichier (contrôlée ici et par la base), et un média de la
// médiathèque Events est RÉUTILISÉ par référence (aucune copie du fichier). Table bsh_ressources (0141).
// ═══════════════════════════════════════════════════════════
import React, { useMemo, useState } from "react";
import { K, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, sbInsert, sbUpdate, uploadStorage, compresserImage, slug, libelleInstant, ESPACES, BUCKET_BSH } from "./bshAgendaLib";
import type { Donnees, Ressource } from "./BshAgendaHub";
import { UNIVERS_RESSOURCE, TYPES_RESSOURCE, DROITS, cleDoublon, utilisable } from "./continuite";

const lib = (l: [string, string][], v?: string | null) => l.find(x => x[0] === v)?.[1] || v || "—";
export async function empreinteFichier(f: Blob): Promise<string> {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return [...new Uint8Array(h)].map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function BshMediatheque({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [f, setF] = useState({ univers: "", type: "", validation: "", droits: "", campagne: "", q: "" });
  const [ajout, setAjout] = useState(false); const [fiche, setFiche] = useState<Ressource | null>(null); const [msg, setMsg] = useState("");
  const liste = useMemo(() => d.ressources.filter(r => (!f.univers || r.univers === f.univers) && (!f.type || r.type === f.type) && (!f.validation || r.statut_validation === f.validation) && (!f.droits || r.droits === f.droits) && (!f.campagne || r.campagne_id === f.campagne) && (!f.q || r.titre.toLowerCase().includes(f.q.toLowerCase()))), [d.ressources, f]);
  const personnage = d.ressources.find(r => r.type === "personnage_reference" && utilisable(r));
  if (!d.v141) return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Titre>Médiathèque éditoriale</Titre>
    <Vide>La médiathèque commune Secret Agenda / Secret Games / Rewards s'activera avec la migration 0141 (préparée et testée, en attente de ton accord). Les médias Events existants ({d.medias.length} chargés) pourront y être référencés sans copie.</Vide></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
    <Titre action={<button style={bouton("plein", true)} onClick={() => setAjout(true)}>＋ Ajouter une ressource</button>}>Médiathèque éditoriale</Titre>
    <div style={{ fontSize: 11, color: personnage ? K.ok : K.alerte }}>{personnage ? `Personnage principal de référence : « ${personnage.titre} » (validé).` : "Aucun personnage principal de référence validé : à déposer (type « Personnage principal ») puis valider, pour que le studio puisse s'y référer."}</div>
    <div style={grille(150)}>
      <select aria-label="Univers" style={champ} value={f.univers} onChange={e => setF({ ...f, univers: e.target.value })}><option value="">Tous les univers</option>{UNIVERS_RESSOURCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Type" style={champ} value={f.type} onChange={e => setF({ ...f, type: e.target.value })}><option value="">Tous les types</option>{TYPES_RESSOURCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Validation" style={champ} value={f.validation} onChange={e => setF({ ...f, validation: e.target.value })}><option value="">Toute validation</option>{[["brouillon", "Brouillon"], ["a_valider", "À valider"], ["valide", "Validée"], ["refuse", "Refusée"], ["archive", "Archivée"]].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Droits" style={champ} value={f.droits} onChange={e => setF({ ...f, droits: e.target.value })}><option value="">Tous les droits</option>{DROITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
      <select aria-label="Campagne" style={champ} value={f.campagne} onChange={e => setF({ ...f, campagne: e.target.value })}><option value="">Toutes campagnes</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select>
      <input aria-label="Rechercher" style={champ} placeholder="Rechercher…" value={f.q} onChange={e => setF({ ...f, q: e.target.value })} />
    </div>
    {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
    {liste.length === 0 ? <Vide>Aucune ressource.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(260px,100%),1fr))", gap: 8 }}>
      {liste.map(r => <Carte key={r.id} style={{ display: "flex", gap: 10, cursor: "pointer" }}>
        <div onClick={() => setFiche(r)} style={{ display: "flex", gap: 10, flex: 1, minWidth: 0 }}>
          {r.url ? <img src={r.url} alt={r.titre} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 8, flexShrink: 0 }} /> : <div style={{ width: 56, height: 56, borderRadius: 8, background: K.verre2, display: "grid", placeItems: "center", fontSize: 22, flexShrink: 0 }}>{r.contenu_texte ? "📝" : "🖼"}</div>}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: K.creme, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.titre}</div>
            <div style={{ fontSize: 11, color: K.cremeD }}>{lib(UNIVERS_RESSOURCE, r.univers)} · {lib(TYPES_RESSOURCE, r.type)}{r.espace ? ` · ${ESPACES[r.espace]}` : ""}</div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
              <Etiquette couleur={r.statut_validation === "valide" ? K.ok : r.statut_validation === "refuse" ? K.erreur : K.alerte}>{lib([["brouillon", "Brouillon"], ["a_valider", "À valider"], ["valide", "Validée"], ["refuse", "Refusée"], ["archive", "Archivée"]], r.statut_validation)}</Etiquette>
              <Etiquette couleur={["a_verifier", "interdit"].includes(r.droits) ? K.erreur : K.ok}>Droits : {lib(DROITS, r.droits)}</Etiquette>
            </div>
          </div>
        </div>
      </Carte>)}
    </div>}
    {ajout && <AjoutRessource d={d} onFermer={() => setAjout(false)} onFait={t => { setAjout(false); setMsg(t); recharger(); }} />}
    {fiche && <FicheRessource d={d} r={fiche} onFermer={() => setFiche(null)} onFait={t => { setFiche(null); setMsg(t); recharger(); }} />}
  </div>;
}

function AjoutRessource({ d, onFermer, onFait }: { d: Donnees; onFermer: () => void; onFait: (t: string) => void }) {
  const [mode, setMode] = useState<"fichier" | "media" | "texte">("fichier");
  const [r, setR] = useState<any>({ titre: "", univers: "secret_agenda", type: "affiche", campagne_id: null, espace: null, date_ressource: null, droits: "a_verifier", droits_note: "", contenu_texte: "", source_media_id: null, jeu_id: null, rewards_id: null });
  const [fichier, setFichier] = useState<File | null>(null); const [err, setErr] = useState(""); const [occupe, setOccupe] = useState("");
  const maj = (x: any) => setR((v: any) => ({ ...v, ...x }));
  const existe = (cle: string) => d.ressources.find(x => cleDoublon(x) === cle);
  const enregistrer = async () => {
    if (!r.titre.trim()) return setErr("Titre obligatoire.");
    setErr(""); const ligne: any = { ...r, titre: r.titre.trim(), statut_validation: "a_valider", droits_note: r.droits_note || null, contenu_texte: mode === "texte" ? r.contenu_texte : null };
    try {
      if (mode === "fichier") {
        if (!fichier) return setErr("Choisis un fichier.");
        setOccupe("Calcul de l'empreinte…"); const e = await empreinteFichier(fichier); const dbl = existe("h:" + e);
        if (dbl) { setOccupe(""); return setErr(`Doublon : ce fichier est déjà dans la médiathèque (« ${dbl.titre} »).`); }
        setOccupe("Envoi…"); const c = fichier.type.startsWith("image/") && fichier.type !== "image/svg+xml" ? await compresserImage(fichier) : { blob: fichier, type: fichier.type, ext: (fichier.name.split(".").pop() || "bin") };
        const chemin = `mediatheque/${Date.now().toString(36)}-${slug(r.titre)}.${c.ext}`; ligne.url = await uploadStorage(chemin, c.blob, c.type, BUCKET_BSH); ligne.chemin_storage = chemin; ligne.empreinte = e;
      } else if (mode === "media") {
        if (!r.source_media_id) return setErr("Choisis un média existant.");
        const dbl = existe("m:" + r.source_media_id); if (dbl) return setErr(`Doublon : ce média est déjà référencé (« ${dbl.titre} »).`);
        ligne.url = d.medias.find(m => m.id === r.source_media_id)?.url || null;
      } else {
        if (!r.contenu_texte.trim()) return setErr("Texte vide.");
        const dbl = existe(cleDoublon({ titre: r.titre, type: r.type, univers: r.univers })); if (dbl) return setErr(`Doublon : une ressource de même titre, type et univers existe (« ${dbl.titre} »).`);
      }
      setOccupe("Enregistrement…"); await sbInsert("bsh_ressources", ligne, "return=minimal"); onFait("✅ Ressource ajoutée (à valider)");
    } catch (e: any) { setErr(String(e?.message || e)); }
    setOccupe("");
  };
  return <Feuille titre="Ajouter une ressource" onFermer={onFermer} large>
    <div style={{ display: "flex", gap: 6 }}>{([["fichier", "Fichier"], ["media", "Média déjà importé"], ["texte", "Texte / scénario"]] as const).map(([k, l]) => <button key={k} style={bouton(mode === k ? "or" : "ghost", true)} onClick={() => setMode(k)}>{l}</button>)}</div>
    <div style={grille(200)}>
      <Champ label="Titre *"><input style={champ} value={r.titre} onChange={e => maj({ titre: e.target.value })} /></Champ>
      <Champ label="Univers"><select style={champ} value={r.univers} onChange={e => maj({ univers: e.target.value })}>{UNIVERS_RESSOURCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
      <Champ label="Type"><select style={champ} value={r.type} onChange={e => maj({ type: e.target.value })}>{TYPES_RESSOURCE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
      <Champ label="Campagne"><select style={champ} value={r.campagne_id || ""} onChange={e => maj({ campagne_id: e.target.value || null })}><option value="">—</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      <Champ label="Espace"><select style={champ} value={r.espace || ""} onChange={e => maj({ espace: e.target.value || null })}><option value="">—</option>{["chaine", "cercle", "lounge", "evenement"].map(k => <option key={k} value={k}>{ESPACES[k]}</option>)}</select></Champ>
      <Champ label="Date"><input style={champ} type="date" value={r.date_ressource || ""} onChange={e => maj({ date_ressource: e.target.value || null })} /></Champ>
      {r.univers === "secret_games" && <Champ label="Jeu lié"><select style={champ} value={r.jeu_id || ""} onChange={e => maj({ jeu_id: e.target.value || null })}><option value="">—</option>{d.jeux.map(j => <option key={j.id} value={j.id}>{j.icone} {j.nom}</option>)}</select></Champ>}
      {r.univers === "rewards" && <Champ label="Campagne Rewards liée"><select style={champ} value={r.rewards_id || ""} onChange={e => maj({ rewards_id: e.target.value || null })}><option value="">—</option>{d.rewards.map(x => <option key={x.id} value={x.id}>{x.titre}</option>)}</select></Champ>}
      <Champ label="Droits d'utilisation"><select style={champ} value={r.droits} onChange={e => maj({ droits: e.target.value })}>{DROITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
      <Champ label="Précisions sur les droits"><input style={champ} value={r.droits_note} onChange={e => maj({ droits_note: e.target.value })} placeholder="Auteur, licence, autorisation…" /></Champ>
    </div>
    {mode === "fichier" && <Champ label="Fichier"><input type="file" accept="image/*,application/pdf,video/mp4" onChange={e => setFichier(e.target.files?.[0] || null)} /></Champ>}
    {mode === "media" && <Champ label="Média de la médiathèque Events (réutilisé sans copie)"><select style={champ} value={r.source_media_id || ""} onChange={e => maj({ source_media_id: e.target.value || null })}><option value="">—</option>{d.medias.map(m => <option key={m.id} value={m.id}>{m.dossier ? m.dossier + " / " : ""}{m.nom_fichier}</option>)}</select></Champ>}
    {mode === "texte" && <Champ label="Texte"><textarea style={{ ...champ, minHeight: 100 }} value={r.contenu_texte} onChange={e => maj({ contenu_texte: e.target.value })} /></Champ>}
    {occupe && <div style={{ fontSize: 12, color: K.or }}>⏳ {occupe}</div>}
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} disabled={!!occupe} onClick={enregistrer}>💾 Ajouter</button></div>
  </Feuille>;
}

function FicheRessource({ d, r, onFermer, onFait }: { d: Donnees; r: Ressource; onFermer: () => void; onFait: (t: string) => void }) {
  const [droits, setDroits] = useState(r.droits); const [note, setNote] = useState(r.droits_note || ""); const [err, setErr] = useState("");
  const maj = async (patch: any, t: string) => { try { await sbUpdate("bsh_ressources", r.id, { ...patch, updated_at: new Date().toISOString() }); onFait(t); } catch (e: any) { setErr(String(e?.message || e)); } };
  const missions = d.missions.filter(m => (m.ressources || []).includes(r.id));
  return <Feuille titre={r.titre} onFermer={onFermer}>
    {r.url && <img src={r.url} alt={r.titre} style={{ maxWidth: "100%", maxHeight: 320, objectFit: "contain", borderRadius: 10 }} />}
    {r.contenu_texte && <div style={{ fontSize: 13, color: K.creme, whiteSpace: "pre-wrap" }}>{r.contenu_texte}</div>}
    <div style={{ fontSize: 12, color: K.cremeD }}>{lib(UNIVERS_RESSOURCE, r.univers)} · {lib(TYPES_RESSOURCE, r.type)} · ajoutée {libelleInstant(r.created_at)}{r.valide_le ? ` · validée ${libelleInstant(r.valide_le)}` : ""}{r.source_media_id ? " · média Events réutilisé" : ""}{r.empreinte ? ` · empreinte ${r.empreinte.slice(0, 10)}…` : ""}</div>
    {missions.length > 0 && <div style={{ fontSize: 12, color: K.cremeF }}>Autorisée dans : {missions.map(m => m.titre).join(" · ")}</div>}
    <div style={grille(200)}>
      <Champ label="Droits d'utilisation"><select style={champ} value={droits} onChange={e => setDroits(e.target.value)}>{DROITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
      <Champ label="Précisions"><input style={champ} value={note} onChange={e => setNote(e.target.value)} /></Champ>
    </div>
    <Erreur msg={err} />
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
      <button style={bouton("ghost", true)} onClick={() => maj({ droits, droits_note: note || null }, "✅ Droits mis à jour")}>Enregistrer les droits</button>
      {r.statut_validation !== "valide" && <button style={bouton("or", true)} onClick={() => maj({ statut_validation: "valide", valide_le: new Date().toISOString(), droits, droits_note: note || null }, "✅ Ressource validée")}>✓ Valider</button>}
      {r.statut_validation !== "refuse" && <button style={bouton("danger", true)} onClick={() => maj({ statut_validation: "refuse" }, "Ressource refusée")}>Refuser</button>}
      {r.statut_validation !== "archive" && <button style={bouton("ghost", true)} onClick={() => maj({ statut_validation: "archive" }, "Ressource archivée")}>Archiver</button>}
    </div>
    {droits === "a_verifier" && <div style={{ fontSize: 11, color: K.alerte }}>Tant que les droits sont « à vérifier », la ressource ne peut être confiée à aucun hôte.</div>}
  </Feuille>;
}

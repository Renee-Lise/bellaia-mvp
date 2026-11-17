"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Jeux & animations + bibliothèque Diamond B
// • bsh_animations : contenu privé (règles, questions/réponses,
//   points) — jamais lisible publiquement ; peut être relié à un jeu
//   existant de BSH Secret Games (bsh_jeux).
// • bsh_musique : titres Diamond B, avec autorisation de diffusion.
//   Aucune musique n'est diffusée automatiquement.
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { K, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, ChoixHote, nomHote, sbInsert, sbUpdate, sbDelete, versIso, cleJour, heureCayenne, libelleInstant, ESPACES } from "./bshAgendaLib";
import type { Donnees, Animation, Musique } from "./BshAgendaHub";

export const CATEGORIES: Record<string, string> = { quiz: "❓ Quiz", enigme: "🧩 Énigme", jeu_musical: "🎵 Jeu musical", defi_collectif: "🤝 Défi collectif", complicite: "💞 Jeu de complicité", enquete: "🔎 Enquête", saisonniere: "🎄 Animation saisonnière" };
const STATUTS: [string, string, string][] = [["brouillon", "Brouillon", K.cremeD], ["a_valider", "À valider", K.alerte], ["valide", "Validée", K.or], ["programme", "Programmée", "#9085e9"], ["realise", "Réalisée", K.ok], ["archive", "Archivée", K.cremeD]];
const AUTORISATIONS: Record<string, [string, string]> = { a_verifier: ["Droits à vérifier", K.alerte], autorisee: ["Diffusion autorisée", K.ok], refusee: ["Diffusion refusée", K.erreur] };

function Liens({ d, cibleType, cibleId, recharger }: { d: Donnees; cibleType: "campagne" | "animation" | "evenement"; cibleId?: string; recharger: () => void }) {
  if (!cibleId) return <div style={{ fontSize: 11, color: K.cremeD }}>Enregistre d'abord pour associer des titres Diamond B.</div>;
  const lies = d.musiqueLiens.filter(l => l.cible_type === cibleType && l.cible_id === cibleId);
  const libres = d.musique.filter(m => !lies.some(l => l.musique_id === m.id));
  return <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
    {lies.map(l => { const m = d.musique.find(x => x.id === l.musique_id); if (!m) return null; const [lib, c] = AUTORISATIONS[m.autorisation_diffusion]; return (
      <div key={l.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: K.creme }}>🎵 {m.titre} <Etiquette couleur={c}>{lib}</Etiquette><div style={{ flex: 1 }} /><button style={bouton("ghost", true)} onClick={async () => { await sbDelete("bsh_musique_liens", l.id); recharger(); }}>Retirer</button></div>); })}
    {libres.length > 0 && <select style={champ} value="" onChange={async e => { if (e.target.value) { await sbInsert("bsh_musique_liens", { musique_id: e.target.value, cible_type: cibleType, cible_id: cibleId }, "return=minimal"); recharger(); } }}>
      <option value="">+ Associer un titre Diamond B…</option>{libres.map(m => <option key={m.id} value={m.id}>{m.titre}{m.autorisation_diffusion !== "autorisee" ? " (droits à vérifier)" : ""}</option>)}
    </select>}
    {!d.musique.length && <div style={{ fontSize: 11, color: K.cremeD }}>La bibliothèque Diamond B est vide (onglet « Diamond B »).</div>}
  </div>;
}
export { Liens as LiensDiamondB };

function EditeurAnimation({ a: init, d, onFermer, recharger }: { a: Animation; d: Donnees; onFermer: () => void; recharger: () => void }) {
  const [a, setA] = useState<any>({ ...init, questions: init.questions || [] });
  const [dt, setDt] = useState({ j: init.date_prevue ? cleJour(init.date_prevue) : "", h: init.date_prevue ? heureCayenne(init.date_prevue) : "21:00" });
  const [erreur, setErreur] = useState("");
  const maj = (p: any) => setA((x: any) => ({ ...x, ...p }));
  const num = (v: any) => v === "" || v == null ? null : Number(v);
  const enregistrer = async () => {
    if (!a.nom?.trim()) return setErreur("Nom obligatoire.");
    const corps = { nom: a.nom.trim(), categorie: a.categorie, regles: a.regles || null, difficulte: a.difficulte, duree_minutes: num(a.duree_minutes), participants_min: num(a.participants_min), participants_max: num(a.participants_max), questions: a.questions.filter((q: any) => q.question?.trim()), points_actifs: !!a.points_actifs, jeu_id: a.jeu_id || null, hote_id: a.hote_id || null, campagne_id: a.campagne_id || null, date_prevue: dt.j ? versIso(dt.j, dt.h) : null, espace: a.espace || null, statut: a.statut, notes_internes: a.notes_internes || null, updated_at: new Date().toISOString() };
    try { if (init.id) await sbUpdate("bsh_animations", init.id, corps); else await sbInsert("bsh_animations", corps, "return=minimal"); recharger(); onFermer(); } catch (e: any) { setErreur(e.message); }
  };
  const dupliquer = async () => { const { id, created_at, updated_at, ...r } = a; await sbInsert("bsh_animations", { ...r, nom: a.nom + " (copie)", statut: "brouillon", date_prevue: null }, "return=minimal"); recharger(); onFermer(); };
  return (
    <Feuille titre={init.id ? "Modifier l'animation" : "Nouvelle animation"} onFermer={onFermer} large>
      <div style={grille(200)}>
        <Champ label="Nom *"><input style={champ} value={a.nom || ""} onChange={e => maj({ nom: e.target.value })} /></Champ>
        <Champ label="Catégorie"><select style={champ} value={a.categorie} onChange={e => maj({ categorie: e.target.value })}>{Object.entries(CATEGORIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
        <Champ label="Difficulté"><select style={champ} value={a.difficulte} onChange={e => maj({ difficulte: e.target.value })}>{["facile", "moyen", "difficile", "expert"].map(x => <option key={x}>{x}</option>)}</select></Champ>
        <Champ label="Statut de validation"><select style={champ} value={a.statut} onChange={e => maj({ statut: e.target.value })}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
        <Champ label="Durée (minutes)"><input style={champ} type="number" min={0} value={a.duree_minutes ?? ""} onChange={e => maj({ duree_minutes: e.target.value })} /></Champ>
        <Champ label="Participants (min – max)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="number" min={0} value={a.participants_min ?? ""} onChange={e => maj({ participants_min: e.target.value })} /><input style={champ} type="number" min={0} value={a.participants_max ?? ""} onChange={e => maj({ participants_max: e.target.value })} /></div></Champ>
        <Champ label="Hôte responsable"><ChoixHote hotes={d.hotes} valeur={a.hote_id} onChange={v => maj({ hote_id: v })} /></Champ>
        <Champ label="Jeu BSH Secret Games relié"><select style={champ} value={a.jeu_id || ""} onChange={e => maj({ jeu_id: e.target.value || null })}><option value="">— Aucun —</option>{d.jeux.map(j => <option key={j.id} value={j.id}>{j.icone} {j.nom}</option>)}</select></Champ>
        <Champ label="Date prévue (Cayenne)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="date" value={dt.j} onChange={e => setDt({ ...dt, j: e.target.value })} /><input style={{ ...champ, width: 96 }} type="time" value={dt.h} onChange={e => setDt({ ...dt, h: e.target.value })} /></div></Champ>
        <Champ label="Espace"><select style={champ} value={a.espace || ""} onChange={e => maj({ espace: e.target.value || null })}><option value="">—</option>{["chaine", "cercle", "lounge", "evenement"].map(x => <option key={x} value={x}>{ESPACES[x]}</option>)}</select></Champ>
        <Champ label="Campagne"><select style={champ} value={a.campagne_id || ""} onChange={e => maj({ campagne_id: e.target.value || null })}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      </div>
      <Champ label="Règles"><textarea style={{ ...champ, minHeight: 80 }} value={a.regles || ""} onChange={e => maj({ regles: e.target.value })} /></Champ>
      <Carte style={{ padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: K.or, flex: 1 }}>Questions & réponses ({a.questions.length})</div>
          <label style={{ fontSize: 12, color: K.creme, display: "flex", gap: 5 }}><input type="checkbox" checked={!!a.points_actifs} onChange={e => maj({ points_actifs: e.target.checked })} /> Système de points</label>
        </div>
        {a.questions.map((q: any, i: number) => <div key={i} style={{ display: "grid", gridTemplateColumns: a.points_actifs ? "1fr 1fr 64px auto" : "1fr 1fr auto", gap: 5, marginBottom: 5 }}>
          <input style={champ} placeholder={`Question ${i + 1}`} value={q.question} onChange={e => maj({ questions: a.questions.map((x: any, k: number) => k === i ? { ...x, question: e.target.value } : x) })} />
          <input style={champ} placeholder="Réponse" value={q.reponse} onChange={e => maj({ questions: a.questions.map((x: any, k: number) => k === i ? { ...x, reponse: e.target.value } : x) })} />
          {a.points_actifs && <input style={champ} type="number" title="Points" value={q.points ?? 1} onChange={e => maj({ questions: a.questions.map((x: any, k: number) => k === i ? { ...x, points: Number(e.target.value) } : x) })} />}
          <button style={bouton("ghost", true)} onClick={() => maj({ questions: a.questions.filter((_: any, k: number) => k !== i) })}>✕</button>
        </div>)}
        <button style={bouton("ghost", true)} onClick={() => maj({ questions: [...a.questions, { question: "", reponse: "", points: 1 }] })}>+ Question</button>
      </Carte>
      <Carte style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>🎵 Musique Diamond B</div><Liens d={d} cibleType="animation" cibleId={init.id} recharger={recharger} /></Carte>
      <Champ label="Notes internes"><textarea style={{ ...champ, minHeight: 50 }} value={a.notes_internes || ""} onChange={e => maj({ notes_internes: e.target.value })} /></Champ>
      <div style={{ fontSize: 11, color: K.cremeD }}>Rappel : pas de contenu explicite, et aucun nom ou numéro de participant dans les questions ou notes.</div>
      <Erreur msg={erreur} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {init.id && <button style={bouton("danger")} onClick={async () => { if (confirm("Supprimer cette animation ?")) { await sbDelete("bsh_animations", init.id); recharger(); onFermer(); } }}>Supprimer</button>}
        {init.id && <button style={bouton("ghost")} onClick={dupliquer}>⧉ Dupliquer</button>}
        <div style={{ flex: 1 }} /><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}

function EditeurMusique({ m: init, onFermer, recharger }: { m: Musique; onFermer: () => void; recharger: () => void }) {
  const [m, setM] = useState<any>({ ...init, duree: init.duree_secondes ? `${Math.floor(init.duree_secondes / 60)}:${String(init.duree_secondes % 60).padStart(2, "0")}` : "" });
  const [erreur, setErreur] = useState("");
  const maj = (p: any) => setM((x: any) => ({ ...x, ...p }));
  const enregistrer = async () => {
    if (!m.titre?.trim()) return setErreur("Titre obligatoire.");
    const [mn, sc] = String(m.duree || "").split(":").map(Number);
    const corps = { titre: m.titre.trim(), artiste: m.artiste || "Diamond B", lien_ecoute: m.lien_ecoute || null, ambiance: m.ambiance || null, duree_secondes: m.duree ? (mn || 0) * 60 + (sc || 0) : null, autorisation_diffusion: m.autorisation_diffusion, autorisation_note: m.autorisation_note || null, notes: m.notes || null, updated_at: new Date().toISOString() };
    try { if (init.id) await sbUpdate("bsh_musique", init.id, corps); else await sbInsert("bsh_musique", corps, "return=minimal"); recharger(); onFermer(); } catch (e: any) { setErreur(e.message); }
  };
  return (
    <Feuille titre={init.id ? "Modifier le titre" : "Nouveau titre Diamond B"} onFermer={onFermer}>
      <div style={grille(200)}>
        <Champ label="Titre *"><input style={champ} value={m.titre || ""} onChange={e => maj({ titre: e.target.value })} /></Champ>
        <Champ label="Artiste"><input style={champ} value={m.artiste || "Diamond B"} onChange={e => maj({ artiste: e.target.value })} /></Champ>
        <Champ label="Lien d'écoute"><input style={champ} value={m.lien_ecoute || ""} onChange={e => maj({ lien_ecoute: e.target.value })} placeholder="https://…" /></Champ>
        <Champ label="Ambiance"><input style={champ} value={m.ambiance || ""} onChange={e => maj({ ambiance: e.target.value })} placeholder="Ex. velours, mystère, festif" /></Champ>
        <Champ label="Durée (min:s)"><input style={champ} value={m.duree} onChange={e => maj({ duree: e.target.value })} placeholder="3:45" /></Champ>
        <Champ label="Autorisation de diffusion"><select style={champ} value={m.autorisation_diffusion} onChange={e => maj({ autorisation_diffusion: e.target.value })}>{Object.entries(AUTORISATIONS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Champ>
      </div>
      <Champ label="Justificatif / note sur les droits"><textarea style={{ ...champ, minHeight: 50 }} value={m.autorisation_note || ""} onChange={e => maj({ autorisation_note: e.target.value })} placeholder="Ex. accord écrit de l'artiste du …, SACEM…" /></Champ>
      <Champ label="Notes"><textarea style={{ ...champ, minHeight: 50 }} value={m.notes || ""} onChange={e => maj({ notes: e.target.value })} /></Champ>
      <Erreur msg={erreur} />
      <div style={{ display: "flex", gap: 8 }}>
        {init.id && <button style={bouton("danger")} onClick={async () => { if (confirm("Supprimer ce titre et ses associations ?")) { await sbDelete("bsh_musique", init.id); recharger(); onFermer(); } }}>Supprimer</button>}
        <div style={{ flex: 1 }} /><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}

export default function BshAnimations({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [onglet, setOnglet] = useState<"animations" | "musique">("animations");
  const [cat, setCat] = useState("toutes");
  const [anim, setAnim] = useState<Animation | null>(null);
  const [mus, setMus] = useState<Musique | null>(null);
  const liste = d.animations.filter(a => (cat === "toutes" || a.categorie === cat) && a.statut !== "archive");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre action={onglet === "animations"
        ? <button style={bouton("plein")} onClick={() => setAnim({ nom: "", categorie: cat === "toutes" ? "quiz" : cat, difficulte: "moyen", statut: "brouillon", questions: [], points_actifs: false } as any)}>+ Animation</button>
        : <button style={bouton("plein")} onClick={() => setMus({ titre: "", artiste: "Diamond B", autorisation_diffusion: "a_verifier" } as any)}>+ Titre</button>}>Jeux & animations</Titre>
      <div style={{ display: "flex", gap: 6 }}><button style={bouton(onglet === "animations" ? "or" : "ghost")} onClick={() => setOnglet("animations")}>🎲 Bibliothèque de jeux</button><button style={bouton(onglet === "musique" ? "or" : "ghost")} onClick={() => setOnglet("musique")}>🎵 Diamond B</button></div>

      {onglet === "animations" && <>
        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>{[["toutes", "Toutes"], ...Object.entries(CATEGORIES)].map(([k, l]) => <button key={k} style={bouton(cat === k ? "or" : "ghost", true)} onClick={() => setCat(k)}>{l}</button>)}</div>
        {d.jeux.length > 0 && <div style={{ fontSize: 11, color: K.cremeD }}>Reliable aux {d.jeux.length} jeux existants de BSH Secret Games (cartes, salons, parties) — ces jeux restent gérés dans l'onglet 🎲 Jeux.</div>}
        {liste.length === 0 ? <Vide>Aucune animation dans cette catégorie.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(300px,100%),1fr))", gap: 10 }}>
          {liste.map(a => { const st = STATUTS.find(x => x[0] === a.statut) || STATUTS[0]; const jeu = d.jeux.find(j => j.id === a.jeu_id); return (
            <Carte key={a.id} style={{ cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
              <div onClick={() => setAnim(a)} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 700, color: K.creme }}>{a.nom}</div><div style={{ fontSize: 11, color: K.cremeD }}>{CATEGORIES[a.categorie]} · {a.difficulte}{a.duree_minutes ? ` · ${a.duree_minutes} min` : ""}{a.participants_max ? ` · ${a.participants_min || 1}–${a.participants_max} pers.` : ""}</div></div>
                <Etiquette couleur={st[2]}>{st[1]}</Etiquette>
              </div>
              <div style={{ fontSize: 11, color: K.cremeF }}>{(a.questions || []).length} question(s){a.points_actifs ? " · avec points" : ""}{jeu ? ` · 🎴 ${jeu.nom}` : ""}{a.hote_id ? ` · 👤 ${nomHote(d.hotes.find(h => h.id === a.hote_id))}` : ""}{a.date_prevue ? ` · ${libelleInstant(a.date_prevue)}` : ""}</div>
            </Carte>); })}
        </div>}
      </>}

      {onglet === "musique" && <>
        <div style={{ fontSize: 11, color: K.cremeD, lineHeight: 1.6 }}>Bibliothèque des titres Diamond B, à associer aux campagnes, animations et Boudoir Sessions. Bellaïa ne diffuse aucune musique automatiquement : vérifie l'autorisation de diffusion avant chaque utilisation publique.</div>
        {d.musique.length === 0 ? <Vide>Aucun titre pour l'instant.</Vide> : <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {d.musique.map(m => { const [lib, c] = AUTORISATIONS[m.autorisation_diffusion]; const n = d.musiqueLiens.filter(l => l.musique_id === m.id).length; return (
            <Carte key={m.id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: 12 }}>
              <div style={{ flex: 1, minWidth: 180, cursor: "pointer" }} onClick={() => setMus(m)}><div style={{ fontSize: 14, fontWeight: 700, color: K.creme }}>🎵 {m.titre}</div><div style={{ fontSize: 11, color: K.cremeD }}>{m.artiste}{m.ambiance ? ` · ${m.ambiance}` : ""}{m.duree_secondes ? ` · ${Math.floor(m.duree_secondes / 60)}:${String(m.duree_secondes % 60).padStart(2, "0")}` : ""} · {n} association(s)</div></div>
              <Etiquette couleur={c}>{lib}</Etiquette>
              {m.lien_ecoute && <a href={m.lien_ecoute} target="_blank" rel="noopener noreferrer" style={{ ...bouton("ghost", true), textDecoration: "none" }}>▶ Écouter</a>}
            </Carte>); })}
        </div>}
      </>}
      {anim && <EditeurAnimation a={anim} d={d} recharger={recharger} onFermer={() => setAnim(null)} />}
      {mus && <EditeurMusique m={mus} recharger={recharger} onFermer={() => setMus(null)} />}
    </div>
  );
}

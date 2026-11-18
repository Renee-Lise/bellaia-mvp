"use client";
// ═══════════════════════════════════════════════════════════
// Espace équipe — missions de l'assistante, de la partenaire
// (Vil'Dor Pâtisse) et des hôtes BSH.
// • Création / attribution : fondatrice (ou permission missions.gerer).
// • La personne assignée : voit SES missions, renseigne l'avancement,
//   dépose ses livrables (fichiers PRIVÉS, liens temporaires),
//   commente ; elle ne valide jamais elle-même (« À valider »).
// • Fondatrice : valide ou demande une correction ; historique (fil).
// • Mission confiée à une partenaire sans autorisation vérifiée pour
//   la fonction concernée → SIMULATION (contrôle en base).
// Tables : bellaia_missions, bellaia_missions_fil (migrations 0111-0112).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbRpc } from "../events/eventsAtelierLib";
import { C, SA, btn, champ, lbl, carte, heure, nomFichierSur, deposerPrive, ouvrirPrive, mesAcces, aPerm, type Acces } from "./equipeLib";

// Pôles autorisés par la contrainte actuelle de la base (élargissement
// proposé séparément à la fondatrice : il exige de remplacer la règle).
const POLES_BASE: [string, string][] = [["FOOD", "🍃 Bella'Food · Vil'Dor"], ["EVENTS", "✨ Bella'Even's"], ["BSH", "✦ Bella'Secret Home"], ["STUDIO", "🎨 Bella'Studio (autres univers)"]];
// Référentiel évolutif (business_units) dès que la migration 0116 est
// appliquée (présence du pôle STUDIO) ; sinon les 4 pôles autorisés.
let POLES: [string, string][] = POLES_BASE;
let UNIVERS_ACTIF = false; // colonne « univers » disponible (migration 0116)
async function chargerPoles() {
  try {
    const l = await sbSelect<any>("business_units", "select=code,nom,icone,statut&order=ordre.asc");
    if (l.some((x: any) => x.code === "STUDIO")) UNIVERS_ACTIF = true;
    if (UNIVERS_ACTIF) POLES = l.filter((x: any) => x.statut !== "archive").map((x: any) => [x.code, `${x.icone || "•"} ${x.nom}`] as [string, string]);
  } catch {}
}
const TYPES: [string, string, string][] = [["patisserie", "🧁 Pâtisserie", C.orange], ["creation", "🎨 Création / Canva", C.violet], ["hotesse", "🥂 Hôtesse BSH", C.bleu], ["autre", "📋 Assistante / autre", C.doux]];
const STATUTS: [string, string, string][] = [["a_faire", "À faire", C.doux], ["en_cours", "En cours", C.bleu], ["a_valider", "À valider", C.orange], ["fait", "Validée", C.ok], ["annule", "Annulée", C.rouge]];
const PRIOS: [number, string][] = [[1, "Urgente"], [2, "Normale"], [3, "Quand possible"]];
const aujourdhui = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dateFr = (d?: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "Sans date";

export default function EspaceEquipe({ user, role }: { user?: any; role?: string }) {
  const [acces, setAcces] = useState<Acces | null>(null);
  const gere = role === "fondatrice" || aPerm(acces, "missions.gerer");
  const fondatrice = role === "fondatrice" || !!acces?.fondatrice;
  const [missions, setMissions] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");
  const [vue, setVue] = useState<"ouvertes" | "a_valider" | "planning" | "faites">("ouvertes");
  const [type, setType] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");

  const charger = async () => {
    setCharge(true); setErreur("");
    try {
      const a = await mesAcces(); setAcces(a);
      await chargerPoles();
      setMissions(await sbSelect("bellaia_missions", "select=*&order=date_prevue.asc.nullslast,created_at.desc"));
      if (role === "fondatrice" || a.fondatrice) {
        const eq = await sbRpc<any[]>("fondatrice_equipe", {}).catch(() => []);
        setMembres((eq || []).map((m: any) => ({ id: m.id, nom: m.nom || m.email || "Sans nom", roles: (m.roles || []).filter((r: any) => r.statut === "actif").map((r: any) => r.role).join(", ") || m.role_profil })));
      }
    } catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); /* eslint-disable-next-line */ }, []);

  const nomMembre = (id?: string) => !id ? "Non attribuée" : id === user?.id ? "Moi" : membres.find(m => m.id === id)?.nom || "Équipe";
  const filtrees = useMemo(() => missions.filter(m => (!type || m.type === type) &&
    (vue === "faites" ? ["fait", "annule"].includes(m.statut) : vue === "a_valider" ? m.statut === "a_valider" : !["fait", "annule"].includes(m.statut))), [missions, vue, type]);
  const nbValider = missions.filter(m => m.statut === "a_valider").length;
  const duJour = missions.filter(m => (m.date_prevue || m.echeance) === aujourdhui() && !["fait", "annule"].includes(m.statut)).length;

  const changerStatut = async (m: any, statut: string, note?: string) => {
    try {
      if (gere) {
        const [n] = await sbUpdate("bellaia_missions", m.id, { statut, updated_at: new Date().toISOString() }); setMissions(l => l.map(x => x.id === n.id ? n : x));
        await sbInsert("bellaia_missions_fil", { mission_id: m.id, type: statut === "fait" ? "validation" : note ? "correction" : "statut", texte: note || `${m.statut} → ${statut}`, auteur: user?.id }).catch(() => {});
      } else { await sbRpc("mission_maj_assignee", { p_id: m.id, p_statut: statut, p_commentaire: null }); setMissions(l => l.map(x => x.id === m.id ? { ...x, statut } : x)); }
      setMsg(`✅ « ${m.titre} » : ${STATUTS.find(s => s[0] === statut)?.[1]}`);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  if (edit) return <Editeur m={edit} gere={gere} fondatrice={fondatrice} user={user} membres={membres} onRetour={() => setEdit(null)} onSauve={async (t: string) => { setEdit(null); setMsg(t); await charger(); }} />;

  const T = (k: string) => TYPES.find(t => t[0] === k) || TYPES[3];
  const S = (k: string) => STATUTS.find(s => s[0] === k) || STATUTS[0];
  const carteMission = (m: any) => { const [, tl, tc] = T(m.type); const [, sl, sc] = S(m.statut); return (
    <div key={m.id} style={{ ...carte, borderLeft: `4px solid ${tc}`, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={() => setEdit({ ...m })} style={{ all: "unset", cursor: "pointer", display: "block" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 11, fontWeight: 800 }}>
          <span style={{ color: tc }}>{tl}</span><span style={{ color: C.doux }}>· {POLES.find(p => p[0] === (m.univers || m.pole))?.[1] || m.univers || m.pole}</span>
          {m.priorite === 1 && <span style={{ color: C.rouge }}>· URGENT</span>}
          {m.simulation && <span style={{ color: C.orange, border: `1px solid ${C.orange}66`, borderRadius: 99, padding: "0 6px" }}>SIMULATION</span>}
          <span style={{ marginLeft: "auto", color: sc, border: `1px solid ${sc}66`, borderRadius: 99, padding: "1px 8px" }}>{sl}</span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{m.titre}{m.quantite ? ` · ${Number(m.quantite)}` : ""}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 2 }}>{dateFr(m.date_prevue)}{m.heure ? ` · ${m.heure}` : ""}{m.echeance ? ` · échéance ${dateFr(m.echeance)}` : ""} · {nomMembre(m.assigne_a)}</div>
        {m.commentaire_fondatrice && <div style={{ fontSize: 13, marginTop: 4, color: C.or }}>💬 {m.commentaire_fondatrice}</div>}
        {(m.livrables || []).length > 0 && <div style={{ fontSize: 12, marginTop: 4, color: C.doux }}>📎 {(m.livrables || []).length} livrable(s)</div>}
      </button>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {m.statut === "a_faire" && <button style={btn()} onClick={() => changerStatut(m, "en_cours")}>▶ Commencer</button>}
        {m.statut === "en_cours" && <button style={btn(true, C.orange)} onClick={() => changerStatut(m, "a_valider")}>⏳ À valider</button>}
        {m.statut === "a_valider" && gere && <button style={btn(true, C.ok)} onClick={() => changerStatut(m, "fait")}>✓ Valider</button>}
        {m.statut === "a_valider" && gere && <button style={btn()} onClick={() => { const n = prompt("Correction demandée :"); if (n) changerStatut(m, "en_cours", n); }}>↺ Demander une correction</button>}
        {m.lien_canva && <a style={btn()} href={m.lien_canva} target="_blank" rel="noopener noreferrer">🎨 Design</a>}
      </div>
    </div>); };

  const parJour = useMemo(() => {
    const g: Record<string, any[]> = {};
    filtrees.forEach(m => { const d = m.date_prevue || m.echeance || ""; (g[d] = g[d] || []).push(m); });
    return Object.entries(g).sort(([a], [b]) => (a || "9999").localeCompare(b || "9999"));
  }, [filtrees]);

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🤝 {gere ? "Missions de l'équipe" : `Mes missions${user?.prenom ? " — " + user.prenom : ""}`}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          {gere ? "Pâtisserie, créations Canva, accueil BSH et missions de tous les univers. Vous validez ou demandez une correction." : "Renseignez l'avancement, déposez vos livrables, puis passez la mission « À valider »."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...btn(true, C.bleu), cursor: "default" }}>📅 {duJour} aujourd'hui</div>
        <div style={{ ...btn(true, C.orange), cursor: "default" }}>⏳ {nbValider} à valider</div>
        {gere && <button style={btn(true)} onClick={() => setEdit({ pole: "FOOD", type: "patisserie", statut: "a_faire", priorite: 2, date_prevue: aujourdhui(), assigne_a: null })}>＋ Mission</button>}
        <a style={btn()} href="https://www.canva.com/" target="_blank" rel="noopener noreferrer">🎨 Canva</a>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["ouvertes", "En cours"], ["a_valider", "À valider"], ["planning", "Planning"], ["faites", "Terminées"]] as const).map(([k, l]) => <button key={k} style={btn(vue === k)} onClick={() => setVue(k)}>{l}</button>)}
        <select style={{ ...champ, width: "auto", minWidth: 150 }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Tous les types</option>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {erreur && <div style={{ color: C.rouge }}>{erreur}</div>}
      {!charge && !erreur && !filtrees.length && <div style={{ color: C.doux, padding: 24, textAlign: "center" }}>Aucune mission ici pour le moment.</div>}
      {vue === "planning"
        ? parJour.map(([d, ms]) => <div key={d} style={{ display: "flex", flexDirection: "column", gap: 8 }}><div style={{ fontWeight: 900, color: C.or }}>{d ? dateFr(d) : "Sans date"}</div>{ms.map(carteMission)}</div>)
        : filtrees.map(carteMission)}
    </div>
  );
}

function Editeur({ m, gere, fondatrice, user, membres, onRetour, onSauve }: any) {
  const [e, setE] = useState<any>({ ...m, pole: m.univers || m.pole });
  const [fil, setFil] = useState<any[]>([]);
  const [commandes, setCommandes] = useState<any[]>([]);
  const [texte, setTexte] = useState("");
  const [msg, setMsg] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const assignee = !gere;
  useEffect(() => {
    if (!m.id) return;
    sbSelect("bellaia_missions_fil", `mission_id=eq.${m.id}&order=created_at.asc`).then(setFil).catch(() => {});
    if (assignee) sbRpc<any[]>("mes_commandes_missions", {}).then(l => setCommandes((l || []).filter((c: any) => c.reference === m.commande_ref))).catch(() => {});
  }, [m.id]);

  const enregistrer = async (sur: any = {}) => {
    const x = { ...e, ...sur };
    if (!x.titre?.trim()) { setMsg("❌ Donnez un titre à la mission."); return; }
    setEnvoi(true);
    try {
      if (assignee) {
        await sbRpc("mission_maj_assignee", { p_id: x.id, p_statut: x.statut, p_commentaire: x.commentaire_equipe || null });
      } else {
        const champs = ["pole", "type", "titre", "details", "date_prevue", "heure", "quantite", "statut", "priorite", "echeance", "commande_ref", "lien_canva", "commentaire_fondatrice", "assigne_a", "temps_passe_min"];
        const ligne: any = {}; champs.forEach(k => { ligne[k] = x[k] === "" ? null : x[k] ?? null; });
        ligne.quantite = ligne.quantite != null ? Number(ligne.quantite) || null : null;
        ligne.temps_passe_min = ligne.temps_passe_min != null ? parseInt(ligne.temps_passe_min, 10) || null : null;
        if (UNIVERS_ACTIF) { ligne.univers = x.pole; ligne.debut = x.debut || null; ligne.fin = x.fin || null; }
        if (x.id) await sbUpdate("bellaia_missions", x.id, { ...ligne, updated_at: new Date().toISOString() });
        else await sbInsert("bellaia_missions", { ...ligne, cree_par: user?.id });
      }
      onSauve(`✅ Mission enregistrée à ${heure()}`);
    } catch (er: any) { setMsg("❌ " + String(er?.message || er)); }
    setEnvoi(false);
  };

  const deposer = async (f?: File) => {
    if (!f || !e.id) { if (!e.id) setMsg("❌ Enregistrez d'abord la mission."); return; }
    if (f.size > 25 * 1024 * 1024) { setMsg("❌ Fichier trop lourd (25 Mo max)"); return; }
    setEnvoi(true);
    try {
      const chemin = `missions/${e.id}/${Date.now()}-${nomFichierSur(f.name)}`;
      await deposerPrive(chemin, f, f.type);
      await sbRpc("mission_ajouter_livrable", { p_id: e.id, p_chemin: chemin, p_nom: f.name, p_lien_canva: e.lien_canva || null });
      onSauve("✅ Livrable déposé — mission passée « À valider »");
    } catch (er: any) { setMsg("❌ " + String(er?.message || er)); }
    setEnvoi(false);
  };

  const commenter = async (type = "commentaire") => {
    if (!texte.trim() || !e.id) return;
    try { const [n] = await sbInsert("bellaia_missions_fil", { mission_id: e.id, type, texte: texte.trim().slice(0, 2000), auteur: user?.id }); setFil(l => [...l, n]); setTexte(""); }
    catch (er: any) { setMsg("❌ " + String(er?.message || er)); }
  };

  const ro = assignee;
  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 640, margin: "0 auto", paddingBottom: 90 }}>
      <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={onRetour}>← Retour</button>
      <div style={{ fontSize: 18, fontWeight: 900 }}>{e.id ? "Mission" : "Nouvelle mission"}</div>
      {e.simulation && <div style={{ ...carte, borderColor: `${C.orange}66`, fontSize: 13 }}>🧪 <b>Simulation</b> : l'autorisation de cette fonction n'est pas encore vérifiée par la fondatrice. Mission préparatoire, non commerciale et non rémunérée.</div>}
      <div><div style={lbl}>Titre</div><input style={champ} disabled={ro} value={e.titre || ""} onChange={x => setE({ ...e, titre: x.target.value })} placeholder="Ex. 24 Paris-Brest pour samedi" /></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><div style={lbl}>Univers</div><select style={champ} disabled={ro} value={e.pole} onChange={x => setE({ ...e, pole: x.target.value })}>{POLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><div style={lbl}>Type</div><select style={champ} disabled={ro} value={e.type} onChange={x => setE({ ...e, type: x.target.value })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><div style={lbl}>Date</div><input type="date" style={champ} disabled={ro} value={e.date_prevue || ""} onChange={x => setE({ ...e, date_prevue: x.target.value })} /></div>
        <div><div style={lbl}>Heure</div><input style={champ} disabled={ro} value={e.heure || ""} onChange={x => setE({ ...e, heure: x.target.value })} placeholder="14h30" /></div>
        {UNIVERS_ACTIF && <div><div style={lbl}>Début</div><input type="date" style={champ} disabled={ro} value={e.debut || ""} onChange={x => setE({ ...e, debut: x.target.value })} /></div>}
        {UNIVERS_ACTIF && <div><div style={lbl}>Fin de mission</div><input type="date" style={champ} disabled={ro} value={e.fin || ""} onChange={x => setE({ ...e, fin: x.target.value })} /></div>}
        <div><div style={lbl}>Échéance</div><input type="date" style={champ} disabled={ro} value={e.echeance || ""} onChange={x => setE({ ...e, echeance: x.target.value })} /></div>
        <div><div style={lbl}>Priorité</div><select style={champ} disabled={ro} value={e.priorite || 2} onChange={x => setE({ ...e, priorite: Number(x.target.value) })}>{PRIOS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        {e.type === "patisserie" && <div><div style={lbl}>Quantité</div><input inputMode="decimal" style={champ} disabled={ro} value={e.quantite ?? ""} onChange={x => setE({ ...e, quantite: x.target.value })} /></div>}
        <div><div style={lbl}>Statut</div><select style={champ} value={e.statut} onChange={x => setE({ ...e, statut: x.target.value })}>{STATUTS.filter(s => gere || ["a_faire", "en_cours", "a_valider"].includes(s[0])).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      </div>
      {gere && (
        <div><div style={lbl}>Attribuée à</div>
          <select style={champ} value={e.assigne_a || ""} onChange={x => setE({ ...e, assigne_a: x.target.value || null })}>
            <option value="">Non attribuée</option>{user?.id && <option value={user.id}>Moi</option>}
            {membres.map((x: any) => <option key={x.id} value={x.id}>{x.nom} · {x.roles}</option>)}
          </select>
          {!membres.length && <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>Aucun compte d'équipe relié (voir « Accès & permissions »).</div>}
        </div>)}
      {gere && <div><div style={lbl}>Commande liée (référence)</div><input style={champ} value={e.commande_ref || ""} onChange={x => setE({ ...e, commande_ref: x.target.value.trim().toUpperCase() })} placeholder="CMD-2026-…" /></div>}
      <div><div style={lbl}>Instructions détaillées</div><textarea style={{ ...champ, minHeight: 90 }} disabled={ro} value={e.details || ""} onChange={x => setE({ ...e, details: x.target.value })} placeholder="Recette, décor, format, tenue, lieu…" /></div>
      {commandes.map((c: any) => (
        <div key={c.reference} style={{ ...carte, fontSize: 13 }}>📦 Commande {c.reference}{c.date_livraison ? ` · ${dateFr(c.date_livraison)}` : ""}
          {(c.articles || []).map((a: any, i: number) => <div key={i}>• {a.qte} × {a.libelle}</div>)}
        </div>))}

      <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>📎 Livrables et créations</div>
        <div><div style={lbl}>Lien du design Canva</div><input style={champ} value={e.lien_canva || ""} onChange={x => setE({ ...e, lien_canva: x.target.value.trim() })} placeholder="https://www.canva.com/design/…" /></div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a style={btn()} href={e.lien_canva && /^https:\/\/(www\.)?canva\.(com|link)\//.test(e.lien_canva) ? e.lien_canva : "https://www.canva.com/"} target="_blank" rel="noopener noreferrer">↗ Ouvrir Canva</a>
          <label style={btn(true)}>{envoi ? "…" : "📤 Déposer un livrable (PNG, JPG, PDF…)"}<input type="file" accept="image/*,application/pdf,.heic,.zip" style={{ display: "none" }} disabled={envoi} onChange={x => deposer(x.target.files?.[0])} /></label>
        </div>
        {(e.livrables || []).map((l: any, i: number) => <button key={i} style={{ ...btn(), justifyContent: "flex-start" }} onClick={() => ouvrirPrive(l.chemin)}>📄 {l.nom} · {new Date(l.le).toLocaleDateString("fr-FR")}</button>)}
        <div style={{ fontSize: 12, color: C.doux }}>Fichiers privés (liens temporaires). Connexion directe à Canva : en attente de l'application Canva (voir « Actions requises »).</div>
      </div>

      {gere && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div><div style={lbl}>Temps passé (min)</div><input inputMode="numeric" style={champ} value={e.temps_passe_min ?? ""} onChange={x => setE({ ...e, temps_passe_min: x.target.value })} /></div>
      </div>}
      <div><div style={lbl}>Commentaire de l'équipe</div><textarea style={{ ...champ, minHeight: 60 }} value={e.commentaire_equipe || ""} onChange={x => setE({ ...e, commentaire_equipe: x.target.value })} /></div>
      {(gere || e.commentaire_fondatrice) && <div><div style={lbl}>Retour de la fondatrice</div><textarea style={{ ...champ, minHeight: 60 }} disabled={!gere} value={e.commentaire_fondatrice || ""} onChange={x => setE({ ...e, commentaire_fondatrice: x.target.value })} /></div>}

      {e.id && (
        <div style={{ ...carte, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontWeight: 800 }}>🕓 Historique et échanges</div>
          {!fil.length && <div style={{ fontSize: 13, color: C.doux }}>Aucun échange pour le moment.</div>}
          {fil.map(f => <div key={f.id} style={{ fontSize: 13, borderTop: `1px solid ${C.ligne}`, paddingTop: 4 }}>
            <span style={{ color: f.type === "correction" ? C.orange : f.type === "validation" ? C.ok : C.doux, fontWeight: 700 }}>{({ commentaire: "💬", correction: "↺ Correction", validation: "✓ Validation", statut: "•", fichier: "📎" } as any)[f.type]} </span>
            {f.texte} <span style={{ color: C.doux, fontSize: 11 }}>· {new Date(f.created_at).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}{f.auteur === user?.id ? " · moi" : ""}</span>
          </div>)}
          <div style={{ display: "flex", gap: 6 }}>
            <input style={champ} value={texte} onChange={x => setTexte(x.target.value)} placeholder="Écrire un message…" />
            <button style={btn(true)} onClick={() => commenter()}>Envoyer</button>
          </div>
        </div>)}
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      <div style={{ position: "sticky", bottom: 70, display: "flex", gap: 8, background: "rgba(20,12,16,0.92)", padding: 8, borderRadius: 12, border: `1px solid ${C.ligne}` }}>
        <button style={{ ...btn(true), flex: 1 }} disabled={envoi} onClick={() => enregistrer()}>{envoi ? "…" : "💾 Enregistrer"}</button>
        {gere && e.id && e.statut === "a_valider" && <button style={btn(true, C.ok)} disabled={envoi} onClick={() => enregistrer({ statut: "fait" })}>✓ Valider</button>}
      </div>
    </div>
  );
}

"use client";
// ═══════════════════════════════════════════════════════════
// Espace équipe — assistante Bella'Food / Bella'Even's, hôtesse BSH
// • Missions : pâtisserie (quantités, date, heure), créations (Canva :
//   lien du design + dépôt de l'export PNG/PDF), accueil BSH.
// • Statuts : à faire → en cours → à valider (fondatrice) → fait.
// • La fondatrice voit tout, crée, attribue, commente et valide ;
//   l'assistante voit les missions de l'équipe ; un·e hôte BSH ne voit
//   que les siennes (RLS + fonction mission_maj_assignee).
// Table : bellaia_missions (migration 0111).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbRpc, uploadStorage, compresserImage, slug } from "../events/eventsAtelierLib";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c", bleu: "#60a5fa", violet: "#c084fc" };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
const btn = (fort = false, c = C.or): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, boxSizing: "border-box", minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer", whiteSpace: "nowrap" });
const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 800, color: C.doux, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 3 };

const POLES: [string, string][] = [["FOOD", "🍃 Bella'Food"], ["EVENTS", "✨ Bella'Even's"], ["BSH", "✦ Bella'Secret Home"], ["STUDIO", "🎨 Bella'Studio"]];
const TYPES: [string, string, string][] = [["patisserie", "🧁 Pâtisserie", C.orange], ["creation", "🎨 Création / Canva", C.violet], ["hotesse", "🥂 Hôtesse BSH", C.bleu], ["autre", "📋 Autre", C.doux]];
const STATUTS: [string, string, string][] = [["a_faire", "À faire", C.doux], ["en_cours", "En cours", C.bleu], ["a_valider", "À valider", C.orange], ["fait", "Fait", C.ok], ["annule", "Annulé", C.rouge]];
const aujourdhui = () => new Date(Date.now() - 3 * 3600e3).toISOString().slice(0, 10);
const dateFr = (d?: string) => d ? new Date(d + "T12:00:00").toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "Sans date";

export default function EspaceEquipe({ user, role }: { user?: any; role?: string }) {
  const fondatrice = role === "fondatrice";
  const equipe = fondatrice || role === "assistante";
  const [missions, setMissions] = useState<any[]>([]);
  const [membres, setMembres] = useState<any[]>([]);
  const [charge, setCharge] = useState(true);
  const [erreur, setErreur] = useState("");
  const [vue, setVue] = useState<"ouvertes" | "a_valider" | "faites">("ouvertes");
  const [type, setType] = useState("");
  const [edit, setEdit] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const charger = async () => {
    setCharge(true); setErreur("");
    try {
      setMissions(await sbSelect("bellaia_missions", "select=*&order=date_prevue.asc.nullslast,created_at.desc"));
      if (fondatrice) {
        const p = await sbSelect("profiles", "select=id,prenom,nom,role&role=in.(assistante,hote)").catch(() => []);
        const h = await sbSelect("bsh_hotes", "select=id,prenom,nom,profile_id&profile_id=not.is.null").catch(() => []);
        const m = new Map<string, any>();
        p.forEach((x: any) => m.set(x.id, { id: x.id, nom: [x.prenom, x.nom].filter(Boolean).join(" ") || "Sans nom", role: x.role === "assistante" ? "Assistante" : "Hôte" }));
        h.forEach((x: any) => m.set(x.profile_id, { id: x.profile_id, nom: [x.prenom, x.nom].filter(Boolean).join(" ") || "Hôte BSH", role: "Hôte BSH" }));
        setMembres(Array.from(m.values()));
      }
    } catch (e: any) { setErreur(String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const nomMembre = (id?: string) => !id ? "Non attribuée" : id === user?.id ? "Moi" : membres.find(m => m.id === id)?.nom || "Équipe";
  const visibles = useMemo(() => missions.filter(m =>
    (!type || m.type === type) &&
    (vue === "faites" ? ["fait", "annule"].includes(m.statut) : vue === "a_valider" ? m.statut === "a_valider" : !["fait", "annule"].includes(m.statut))), [missions, vue, type]);
  const nbValider = missions.filter(m => m.statut === "a_valider").length;
  const duJour = missions.filter(m => m.date_prevue === aujourdhui() && !["fait", "annule"].includes(m.statut)).length;

  const heure = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  const enregistrer = async (sur: any = {}) => {
    const edit_ = { ...edit, ...sur };
    if (!edit_?.titre?.trim()) { setMsg("❌ Donnez un titre à la mission."); return; }
    setEnvoi(true);
    const champs = ["pole", "type", "titre", "details", "date_prevue", "heure", "quantite", "statut", "lien_canva", "fichier_url", "commentaire_equipe", "commentaire_fondatrice", "assigne_a"];
    const ligne: any = {}; champs.forEach(k => { ligne[k] = edit_[k] === "" ? null : edit_[k] ?? null; });
    if (ligne.quantite !== null) ligne.quantite = Number(ligne.quantite) || null;
    try {
      if (!equipe && edit_.id) {
        await sbRpc("mission_maj_assignee", { p_id: edit_.id, p_statut: edit_.statut, p_commentaire: edit_.commentaire_equipe || null });
        setMissions(l => l.map(x => x.id === edit_.id ? { ...x, statut: edit_.statut, commentaire_equipe: edit_.commentaire_equipe } : x));
      } else if (edit_.id) {
        const [n] = await sbUpdate("bellaia_missions", edit_.id, { ...ligne, updated_at: new Date().toISOString() });
        setMissions(l => l.map(x => x.id === n.id ? n : x));
      } else {
        const [n] = await sbInsert("bellaia_missions", ligne);
        setMissions(l => [n, ...l]);
      }
      setMsg(`✅ Mission enregistrée à ${heure()}`); setEdit(null);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setEnvoi(false);
  };

  const deposer = async (f?: File) => {
    if (!f || !edit) return;
    setEnvoi(true);
    try {
      let blob: Blob = f, ct = f.type || "application/octet-stream", ext = (f.name.split(".").pop() || "bin").toLowerCase();
      if (f.type.startsWith("image/")) { const c = await compresserImage(f); blob = c.blob; ct = c.type; ext = c.ext; }
      const url = await uploadStorage(`equipe/${Date.now()}-${slug(edit.titre || "creation")}.${ext}`, blob, ct);
      setEdit((e: any) => ({ ...e, fichier_url: url, statut: e.statut === "a_faire" || e.statut === "en_cours" ? "a_valider" : e.statut }));
      setMsg("✅ Fichier déposé — pensez à enregistrer la mission.");
    } catch (e: any) { setMsg("❌ Dépôt impossible : " + String(e?.message || e)); }
    setEnvoi(false);
  };

  const rapide = async (m: any, statut: string) => {
    try {
      if (equipe) { const [n] = await sbUpdate("bellaia_missions", m.id, { statut, updated_at: new Date().toISOString() }); setMissions(l => l.map(x => x.id === n.id ? n : x)); }
      else { await sbRpc("mission_maj_assignee", { p_id: m.id, p_statut: statut, p_commentaire: null }); setMissions(l => l.map(x => x.id === m.id ? { ...x, statut } : x)); }
      setMsg(`✅ « ${m.titre} » : ${STATUTS.find(s => s[0] === statut)?.[1]}`);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  const T = (k: string) => TYPES.find(t => t[0] === k) || TYPES[3];
  const S = (k: string) => STATUTS.find(s => s[0] === k) || STATUTS[0];

  if (edit) {
    const lecture = !equipe; // hôte non membre de l'équipe : statut + commentaire uniquement
    return (
      <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 640, margin: "0 auto", paddingBottom: 90 }}>
        <button style={{ ...btn(), alignSelf: "flex-start" }} onClick={() => setEdit(null)}>← Retour</button>
        <div style={{ fontSize: 18, fontWeight: 900 }}>{edit.id ? "Mission" : "Nouvelle mission"}</div>
        <div><div style={lbl}>Titre</div><input style={champ} disabled={lecture} value={edit.titre || ""} onChange={e => setEdit({ ...edit, titre: e.target.value })} placeholder="Ex. 24 Paris-Brest pour samedi" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div><div style={lbl}>Univers</div><select style={champ} disabled={lecture} value={edit.pole} onChange={e => setEdit({ ...edit, pole: e.target.value })}>{POLES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><div style={lbl}>Type</div><select style={champ} disabled={lecture} value={edit.type} onChange={e => setEdit({ ...edit, type: e.target.value })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div><div style={lbl}>Date</div><input type="date" style={champ} disabled={lecture} value={edit.date_prevue || ""} onChange={e => setEdit({ ...edit, date_prevue: e.target.value })} /></div>
          <div><div style={lbl}>Heure</div><input style={champ} disabled={lecture} value={edit.heure || ""} onChange={e => setEdit({ ...edit, heure: e.target.value })} placeholder="14h30" /></div>
          {edit.type === "patisserie" && <div><div style={lbl}>Quantité</div><input inputMode="decimal" style={champ} disabled={lecture} value={edit.quantite ?? ""} onChange={e => setEdit({ ...edit, quantite: e.target.value })} /></div>}
          <div><div style={lbl}>Statut</div><select style={champ} value={edit.statut} onChange={e => setEdit({ ...edit, statut: e.target.value })}>{STATUTS.filter(s => fondatrice || s[0] !== "annule").map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        </div>
        {fondatrice && (
          <div><div style={lbl}>Attribuée à</div>
            <select style={champ} value={edit.assigne_a || ""} onChange={e => setEdit({ ...edit, assigne_a: e.target.value || null })}>
              <option value="">Non attribuée (toute l'équipe)</option>
              {user?.id && <option value={user.id}>Moi</option>}
              {membres.map(m => <option key={m.id} value={m.id}>{m.nom} · {m.role}</option>)}
            </select>
            {!membres.length && <div style={{ fontSize: 12, color: C.doux, marginTop: 4 }}>Aucun compte assistante / hôte relié pour l'instant (voir « Actions requises »).</div>}
          </div>)}
        <div><div style={lbl}>Détails / consignes</div><textarea style={{ ...champ, minHeight: 90 }} disabled={lecture} value={edit.details || ""} onChange={e => setEdit({ ...edit, details: e.target.value })} placeholder="Recette, décor, format, tenue, lieu…" /></div>
        {(edit.type === "creation" || edit.lien_canva || edit.fichier_url) && (
          <div style={{ background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontWeight: 800 }}>🎨 Création</div>
            <div><div style={lbl}>Lien du design Canva</div><input style={champ} disabled={lecture} value={edit.lien_canva || ""} onChange={e => setEdit({ ...edit, lien_canva: e.target.value.trim() })} placeholder="https://www.canva.com/design/…" /></div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <a style={{ ...btn(), textDecoration: "none" }} href={edit.lien_canva && /^https:\/\/(www\.)?canva\.(com|link)\//.test(edit.lien_canva) ? edit.lien_canva : "https://www.canva.com/"} target="_blank" rel="noopener noreferrer">↗ Ouvrir Canva</a>
              {!lecture && <label style={btn(true)}>📤 Déposer l'export (PNG, JPG, PDF)<input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={e => deposer(e.target.files?.[0])} /></label>}
            </div>
            {edit.fichier_url && (/\.(png|jpe?g|webp)$/i.test(edit.fichier_url)
              ? <img src={edit.fichier_url} alt={`Création : ${edit.titre || ""}`} style={{ maxWidth: "100%", borderRadius: 10, border: `1px solid ${C.ligne}` }} />
              : <a href={edit.fichier_url} target="_blank" rel="noopener noreferrer" style={{ color: C.or }}>📄 Voir le fichier déposé</a>)}
            <div style={{ fontSize: 12, color: C.doux }}>Le fichier est enregistré dans la médiathèque Bellaïa (images publiques : réservez-y les visuels destinés à la communication).</div>
          </div>)}
        <div><div style={lbl}>Commentaire de l'équipe</div><textarea style={{ ...champ, minHeight: 70 }} value={edit.commentaire_equipe || ""} onChange={e => setEdit({ ...edit, commentaire_equipe: e.target.value })} /></div>
        {(fondatrice || edit.commentaire_fondatrice) && <div><div style={lbl}>Retour de la fondatrice</div><textarea style={{ ...champ, minHeight: 70 }} disabled={!fondatrice} value={edit.commentaire_fondatrice || ""} onChange={e => setEdit({ ...edit, commentaire_fondatrice: e.target.value })} /></div>}
        {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
        <div style={{ position: "sticky", bottom: 70, display: "flex", gap: 8, background: "rgba(20,12,16,0.92)", padding: 8, borderRadius: 12, border: `1px solid ${C.ligne}` }}>
          <button style={{ ...btn(true), flex: 1 }} disabled={envoi} onClick={() => enregistrer()}>{envoi ? "…" : "💾 Enregistrer"}</button>
          {fondatrice && edit.id && edit.statut === "a_valider" && <button style={btn(true, C.ok)} disabled={envoi} onClick={() => enregistrer({ statut: "fait" })}>✓ Valider</button>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 760, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>🤝 {fondatrice ? "Espace équipe" : `Bonjour ${user?.prenom || ""}`.trim()}</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          {fondatrice ? "Missions de votre assistante (pâtisserie, créations Canva) et de vos hôtes BSH. Vous voyez exactement ce qu'elle voit." : "Vos missions pâtisserie, créations et accueil BSH. Quand c'est prêt, passez la mission « À valider »."}
        </div>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <div style={{ ...btn(true, C.bleu), cursor: "default" }}>📅 {duJour} aujourd'hui</div>
        <div style={{ ...btn(true, C.orange), cursor: "default" }}>⏳ {nbValider} à valider</div>
        {equipe && <button style={btn(true)} onClick={() => setEdit({ pole: "FOOD", type: "patisserie", statut: "a_faire", date_prevue: aujourdhui(), assigne_a: fondatrice ? null : user?.id || null })}>＋ Mission</button>}
        <a style={{ ...btn(), textDecoration: "none" }} href="https://www.canva.com/" target="_blank" rel="noopener noreferrer">🎨 Canva</a>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["ouvertes", "En cours"], ["a_valider", "À valider"], ["faites", "Terminées"]] as const).map(([k, l]) => <button key={k} style={btn(vue === k)} onClick={() => setVue(k)}>{l}</button>)}
        <select style={{ ...champ, width: "auto", minWidth: 150 }} value={type} onChange={e => setType(e.target.value)}>
          <option value="">Tous les types</option>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {msg && <div style={{ fontSize: 13, color: msg.startsWith("❌") ? C.rouge : C.ok }}>{msg}</div>}
      {charge && <div style={{ color: C.doux }}>Chargement…</div>}
      {erreur && <div style={{ color: C.rouge }}>{erreur}</div>}
      {!charge && !erreur && !visibles.length && <div style={{ color: C.doux, padding: 24, textAlign: "center" }}>Aucune mission ici pour le moment.</div>}
      {visibles.map(m => {
        const [, tl, tc] = T(m.type); const [, sl, sc] = S(m.statut);
        return (
          <div key={m.id} style={{ background: C.card, border: `1px solid ${C.ligne}`, borderLeft: `4px solid ${tc}`, borderRadius: 14, padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setEdit({ ...m })} style={{ all: "unset", cursor: "pointer", display: "block" }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", fontSize: 11, fontWeight: 800 }}>
                <span style={{ color: tc }}>{tl}</span><span style={{ color: C.doux }}>· {POLES.find(p => p[0] === m.pole)?.[1]}</span>
                <span style={{ marginLeft: "auto", color: sc, border: `1px solid ${sc}66`, borderRadius: 99, padding: "1px 8px" }}>{sl}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, marginTop: 4 }}>{m.titre}{m.quantite ? ` · ${Number(m.quantite)}` : ""}</div>
              <div style={{ fontSize: 13, color: C.doux, marginTop: 2 }}>{dateFr(m.date_prevue)}{m.heure ? ` · ${m.heure}` : ""} · {nomMembre(m.assigne_a)}</div>
              {m.commentaire_fondatrice && <div style={{ fontSize: 13, marginTop: 4, color: C.or }}>💬 {m.commentaire_fondatrice}</div>}
            </button>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {m.statut === "a_faire" && <button style={btn()} onClick={() => rapide(m, "en_cours")}>▶ Commencer</button>}
              {m.statut === "en_cours" && <button style={btn(true, C.orange)} onClick={() => rapide(m, "a_valider")}>⏳ À valider</button>}
              {m.statut === "a_valider" && fondatrice && <button style={btn(true, C.ok)} onClick={() => rapide(m, "fait")}>✓ Valider</button>}
              {m.statut === "a_valider" && fondatrice && <button style={btn()} onClick={() => rapide(m, "en_cours")}>↺ À reprendre</button>}
              {m.lien_canva && <a style={{ ...btn(), textDecoration: "none" }} href={m.lien_canva} target="_blank" rel="noopener noreferrer">🎨 Design</a>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

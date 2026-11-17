"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Hôtes et hôtesses : planning individuel
// (publications, animations, sondages et missions attribués) et
// checklist de missions (table existante bsh_checklist_items,
// cible_type = 'hote'). Les fiches hôtes restent gérées dans
// l'onglet 👤 Hôtes ; ici, on choisit l'hôte par son nom.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { K, FS, champ, bouton, Etiquette, Carte, Vide, Titre, Erreur, nomHote, sbSelect, sbInsert, sbUpdate, sbDelete, aujourdhui, cleJour, libelleInstant, libelleDate, statutPub, ESPACES } from "./bshAgendaLib";
import type { Donnees } from "./BshAgendaHub";

type Item = { id: string; titre: string; fait: boolean; echeance: string | null; priorite: string; commentaire: string | null };

export default function BshHotes({ d, ouvrirPublication }: { d: Donnees; ouvrirPublication: (p: any) => void }) {
  const actives = d.hotes.filter(h => h.statut === "active");
  const [hoteId, setHoteId] = useState(actives[0]?.id || d.hotes[0]?.id || "");
  const [items, setItems] = useState<Item[]>([]);
  const [nouveau, setNouveau] = useState({ titre: "", echeance: "", priorite: "normale" });
  const [erreur, setErreur] = useState("");
  const [passe, setPasse] = useState(false);
  const auj = aujourdhui();

  const chargerItems = () => hoteId && sbSelect<Item>("bsh_checklist_items", `select=id,titre,fait,echeance,priorite,commentaire&cible_type=eq.hote&cible_id=eq.${hoteId}&order=fait.asc,echeance.asc.nullslast`).then(setItems).catch(e => setErreur(e.message));
  useEffect(() => { chargerItems(); }, [hoteId]);

  const planning = useMemo(() => {
    const l: { iso: string | null; type: string; titre: string; detail: string; ref?: any }[] = [];
    d.pubs.filter(p => p.hote_id === hoteId && !["annule", "archive"].includes(p.statut)).forEach(p => l.push({ iso: p.date_programmee, type: "📢 Publication", titre: p.titre, detail: `${ESPACES[p.espace || ""] || ""} · ${statutPub(p.statut)[1]}`, ref: p }));
    d.animations.filter(a => a.hote_id === hoteId && a.statut !== "archive").forEach(a => l.push({ iso: a.date_prevue, type: "🎲 Animation", titre: a.nom, detail: a.statut }));
    d.sondages.filter(s => s.hote_id === hoteId && s.statut !== "archive").forEach(s => l.push({ iso: s.date_debut, type: "📊 Sondage", titre: s.question, detail: s.statut }));
    d.missions.filter(m => m.hote_id === hoteId && m.statut !== "annulee").forEach(m => l.push({ iso: m.date_mission, type: "👤 Mission", titre: m.titre, detail: `${m.lieu || ""} · ${m.statut}` }));
    return l.filter(x => passe || !x.iso || cleJour(x.iso) >= auj).sort((a, b) => (a.iso || "9").localeCompare(b.iso || "9"));
  }, [d, hoteId, passe, auj]);

  const ajouter = async () => {
    if (!nouveau.titre.trim()) return;
    try { await sbInsert("bsh_checklist_items", { cible_type: "hote", cible_id: hoteId, titre: nouveau.titre.trim(), echeance: nouveau.echeance || null, priorite: nouveau.priorite, fait: false }, "return=minimal"); setNouveau({ titre: "", echeance: "", priorite: "normale" }); chargerItems(); }
    catch (e: any) { setErreur(e.message); }
  };

  if (!d.hotes.length) return <div style={{ display: "flex", flexDirection: "column", gap: 12 }}><Titre>Hôtes et hôtesses</Titre><Vide>Aucune fiche hôte. Les candidatures et fiches se gèrent dans l'onglet 👤 Hôtes.</Vide></div>;
  const hote = d.hotes.find(h => h.id === hoteId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre>Hôtes et hôtesses</Titre>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {d.hotes.map(h => {
          const nb = d.pubs.filter(p => p.hote_id === h.id && p.date_programmee && cleJour(p.date_programmee) >= auj).length + d.animations.filter(a => a.hote_id === h.id && a.date_prevue && cleJour(a.date_prevue) >= auj).length + d.missions.filter(m => m.hote_id === h.id && m.date_mission && cleJour(m.date_mission) >= auj).length;
          return <button key={h.id} style={bouton(hoteId === h.id ? "or" : "ghost")} onClick={() => setHoteId(h.id)}>👤 {nomHote(h)} <span style={{ opacity: .7 }}>({nb})</span>{h.statut !== "active" ? " · inactive" : ""}</button>;
        })}
      </div>
      <div style={{ fontSize: 11, color: K.cremeD }}>Pour attribuer une publication, une animation ou un sondage, choisis l'hôte dans son formulaire (menu « Hôte responsable »). Chaque hôte ne voit que ce qui lui est attribué.</div>

      <div className="bsh-deux-colonnes" style={{ display: "grid", gap: 12 }}>
        <Carte>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ fontFamily: FS, fontSize: 18, color: K.or, flex: 1 }}>Planning de {nomHote(hote)}</div>
            <label style={{ fontSize: 11, color: K.cremeD, display: "flex", gap: 4 }}><input type="checkbox" checked={passe} onChange={e => setPasse(e.target.checked)} /> passé inclus</label>
          </div>
          {planning.length === 0 ? <Vide>Rien de prévu pour cet hôte.</Vide> : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {planning.map((x, i) => {
              const nouvJour = i === 0 || (x.iso ? cleJour(x.iso) : "") !== (planning[i - 1].iso ? cleJour(planning[i - 1].iso!) : "");
              return <React.Fragment key={i}>
                {nouvJour && <div style={{ fontSize: 11, color: K.rose, fontWeight: 700, marginTop: i ? 6 : 0 }}>{x.iso ? libelleDate(cleJour(x.iso)) : "Sans date"}</div>}
                <div onClick={() => x.ref && ouvrirPublication(x.ref)} style={{ display: "flex", gap: 8, fontSize: 12, color: K.creme, padding: "6px 8px", borderRadius: 8, background: K.verre, cursor: x.ref ? "pointer" : "default" }}>
                  <span style={{ color: K.cremeD, width: 40, flexShrink: 0 }}>{x.iso ? libelleInstant(x.iso).split(" · ")[1] : ""}</span>
                  <span style={{ flex: 1 }}>{x.type} — {x.titre}<span style={{ color: K.cremeD }}> · {x.detail}</span></span>
                </div>
              </React.Fragment>;
            })}
          </div>}
        </Carte>

        <Carte>
          <div style={{ fontFamily: FS, fontSize: 18, color: K.or, marginBottom: 10 }}>Checklist de missions ({items.filter(i => i.fait).length}/{items.length})</div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 10 }}>
            <input style={{ ...champ, flex: "1 1 160px", width: "auto" }} placeholder="Nouvelle tâche…" value={nouveau.titre} onChange={e => setNouveau({ ...nouveau, titre: e.target.value })} onKeyDown={e => e.key === "Enter" && ajouter()} />
            <input style={{ ...champ, width: 140 }} type="date" value={nouveau.echeance} onChange={e => setNouveau({ ...nouveau, echeance: e.target.value })} />
            <select style={{ ...champ, width: 110 }} value={nouveau.priorite} onChange={e => setNouveau({ ...nouveau, priorite: e.target.value })}><option value="basse">Basse</option><option value="normale">Normale</option><option value="haute">Haute</option></select>
            <button style={bouton("or", true)} onClick={ajouter}>Ajouter</button>
          </div>
          {items.length === 0 ? <Vide>Checklist vide.</Vide> : items.map(it => (
            <div key={it.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 0", borderTop: `1px solid ${K.ligne}` }}>
              <input type="checkbox" checked={it.fait} onChange={async e => { await sbUpdate("bsh_checklist_items", it.id, { fait: e.target.checked, updated_at: new Date().toISOString() }); chargerItems(); }} style={{ width: 17, height: 17 }} />
              <div style={{ flex: 1, fontSize: 12, color: it.fait ? K.cremeD : K.creme, textDecoration: it.fait ? "line-through" : "none" }}>{it.titre}{it.echeance && <span style={{ color: !it.fait && it.echeance < auj ? K.erreur : K.cremeD }}> · {libelleDate(it.echeance, false)}</span>}</div>
              {it.priorite === "haute" && <Etiquette couleur={K.erreur}>Haute</Etiquette>}
              <button style={bouton("ghost", true)} onClick={async () => { await sbDelete("bsh_checklist_items", it.id); chargerItems(); }}>✕</button>
            </div>
          ))}
          <Erreur msg={erreur} />
        </Carte>
      </div>
    </div>
  );
}

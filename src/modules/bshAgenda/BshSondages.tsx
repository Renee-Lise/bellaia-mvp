"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — Sondages
// • WhatsApp : on prépare le texte, on publie à la main, puis on
//   saisit les résultats relevés (réponses + participants).
// • Natif Bellaïa : les membres connectés votent dans l'application
//   (un vote par personne, pendant la période) ; les résultats sont
//   agrégés par la fonction bsh_sondage_resultats (qui a voté quoi
//   n'est jamais exposé).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { K, FS, champ, bouton, Etiquette, Champ, Carte, Vide, Titre, Feuille, Erreur, grille, ChoixHote, sbInsert, sbUpdate, sbDelete, sbRpc, versIso, cleJour, heureCayenne, libelleInstant, ESPACES } from "./bshAgendaLib";
import type { Donnees, Sondage } from "./BshAgendaHub";
import { sondagesAManquer } from "./continuite";

const STATUTS: [string, string, string][] = [["brouillon", "Brouillon", K.cremeD], ["programme", "Programmé", "#9085e9"], ["actif", "Actif", K.ok], ["clos", "Clos", K.or], ["archive", "Archivé", K.cremeD]];
const lettre = (i: number) => String.fromCharCode(97 + i);

/** Résultats : saisie manuelle (WhatsApp) ou votes natifs agrégés. */
export function useResultats(s: Sondage | null) {
  const [natifs, setNatifs] = useState<{ choix: string; nb: number; participants: number }[] | null>(null);
  useEffect(() => {
    setNatifs(null);
    if (s?.id && s.source === "natif") sbRpc("bsh_sondage_resultats", { p_sondage: s.id }).then(r => setNatifs(r || [])).catch(() => setNatifs([]));
  }, [s?.id, s?.source]);
  return useMemo(() => {
    if (!s) return { lignes: [], participants: 0, total: 0 };
    const compte = (id: string) => s.source === "natif" ? Number(natifs?.find(x => x.choix === id)?.nb || 0) : Number(s.resultats_manuels?.[id] || 0);
    const lignes = (s.choix || []).map((c: any) => ({ id: c.id, libelle: c.libelle, nb: compte(c.id) }));
    const total = lignes.reduce((a: number, l: any) => a + l.nb, 0);
    const participants = s.source === "natif" ? Number(natifs?.[0]?.participants || 0) : Number(s.participants_manuels || 0);
    return { lignes, participants, total };
  }, [s, natifs]);
}

/** Barres horizontales de répartition (une seule série : pas de légende). */
export function GraphiqueRepartition({ lignes, total, participants }: { lignes: { id: string; libelle: string; nb: number }[]; total: number; participants: number }) {
  const [survol, setSurvol] = useState<string | null>(null);
  if (!total) return <Vide>Aucun résultat saisi pour l'instant.</Vide>;
  const max = Math.max(...lignes.map(l => l.nb), 1);
  return (
    <div role="table" aria-label="Répartition des réponses" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {lignes.map(l => {
        const pct = Math.round((l.nb / total) * 1000) / 10;
        return <div key={l.id} role="row" onMouseEnter={() => setSurvol(l.id)} onMouseLeave={() => setSurvol(null)} title={`${l.libelle} : ${l.nb} réponse(s), ${pct} %`} style={{ display: "flex", flexDirection: "column", gap: 3, padding: "2px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: K.creme }}><span role="cell">{l.libelle}</span><span role="cell" style={{ color: K.cremeF, fontVariantNumeric: "tabular-nums" }}>{l.nb} · {pct} %</span></div>
          <div style={{ height: 12, background: "rgba(255,255,255,0.05)", borderRadius: 4 }}>
            <div style={{ width: `${(l.nb / max) * 100}%`, height: "100%", borderRadius: 4, background: "#c98500", opacity: survol && survol !== l.id ? 0.45 : 1, transition: "opacity .15s" }} />
          </div>
        </div>;
      })}
      <div style={{ fontSize: 11, color: K.cremeD }}>{participants} participant(s) · {total} réponse(s){participants && total !== participants ? " (choix multiples)" : ""}</div>
    </div>
  );
}

function EditeurSondage({ s: init, d, onFermer, recharger }: { s: Sondage; d: Donnees; onFermer: () => void; recharger: () => void }) {
  const [s, setS] = useState<any>({ ...init, choix: init.choix?.length ? init.choix : [{ id: "a", libelle: "" }, { id: "b", libelle: "" }] });
  const [deb, setDeb] = useState({ j: init.date_debut ? cleJour(init.date_debut) : "", h: init.date_debut ? heureCayenne(init.date_debut) : "12:30" });
  const [fin, setFin] = useState({ j: init.date_fin ? cleJour(init.date_fin) : "", h: init.date_fin ? heureCayenne(init.date_fin) : "21:00" });
  const [erreur, setErreur] = useState("");
  const maj = (p: any) => setS((x: any) => ({ ...x, ...p }));
  const res = useResultats(init.id ? { ...init, ...s } : null);
  const enregistrer = async () => {
    const choix = s.choix.filter((c: any) => c.libelle.trim());
    if (!s.question?.trim() || choix.length < 2) return setErreur("Une question et au moins 2 choix sont nécessaires.");
    const corps = { question: s.question.trim(), choix, choix_multiple: !!s.choix_multiple, date_debut: deb.j ? versIso(deb.j, deb.h) : null, date_fin: fin.j ? versIso(fin.j, fin.h) : null, destination: s.destination, source: s.source, statut: s.statut, resultats_manuels: s.resultats_manuels || {}, participants_manuels: s.participants_manuels === "" || s.participants_manuels == null ? null : Number(s.participants_manuels), campagne_id: s.campagne_id || null, hote_id: s.hote_id || null, notes_internes: s.notes_internes || null, updated_at: new Date().toISOString() };
    try { if (init.id) await sbUpdate("bsh_sondages", init.id, corps); else await sbInsert("bsh_sondages", corps, "return=minimal"); recharger(); onFermer(); } catch (e: any) { setErreur(e.message); }
  };
  const texteWhatsApp = `📊 ${s.question || ""}\n\n${s.choix.filter((c: any) => c.libelle).map((c: any, i: number) => `${i + 1}️⃣ ${c.libelle}`).join("\n")}${s.choix_multiple ? "\n\n(plusieurs réponses possibles)" : ""}`;
  return (
    <Feuille titre={init.id ? "Modifier le sondage" : "Nouveau sondage"} onFermer={onFermer} large>
      <Champ label="Question *"><input style={champ} value={s.question || ""} onChange={e => maj({ question: e.target.value })} /></Champ>
      <Champ label="Choix de réponses">
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {s.choix.map((c: any, i: number) => <div key={c.id} style={{ display: "flex", gap: 6 }}>
            <input style={champ} value={c.libelle} placeholder={`Choix ${i + 1}`} onChange={e => maj({ choix: s.choix.map((x: any, k: number) => k === i ? { ...x, libelle: e.target.value } : x) })} />
            {s.choix.length > 2 && <button style={bouton("ghost", true)} onClick={() => maj({ choix: s.choix.filter((_: any, k: number) => k !== i) })}>✕</button>}
          </div>)}
          {s.choix.length < 12 && <button style={{ ...bouton("ghost", true), alignSelf: "flex-start" }} onClick={() => { const ids = new Set(s.choix.map((c: any) => c.id)); let k = 0; while (ids.has(lettre(k))) k++; maj({ choix: [...s.choix, { id: lettre(k), libelle: "" }] }); }}>+ Ajouter un choix</button>}
        </div>
      </Champ>
      <div style={grille(190)}>
        <Champ label="Type de réponse"><select style={champ} value={s.choix_multiple ? "m" : "u"} onChange={e => maj({ choix_multiple: e.target.value === "m" })}><option value="u">Réponse unique</option><option value="m">Réponses multiples</option></select></Champ>
        <Champ label="Où se déroule-t-il ?"><select style={champ} value={s.source} onChange={e => maj({ source: e.target.value, destination: e.target.value === "natif" ? "bellaia" : s.destination === "bellaia" ? "chaine" : s.destination })}><option value="whatsapp">Sur WhatsApp (résultats saisis à la main)</option><option value="natif">Dans Bellaïa (vote des membres)</option></select></Champ>
        <Champ label="Destination"><select style={champ} value={s.destination} onChange={e => maj({ destination: e.target.value })}>{["chaine", "cercle", "lounge", "bellaia"].map(x => <option key={x} value={x}>{ESPACES[x]}</option>)}</select></Champ>
        <Champ label="Statut"><select style={champ} value={s.statut} onChange={e => maj({ statut: e.target.value })}>{STATUTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Champ>
        <Champ label="Début (Cayenne)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="date" value={deb.j} onChange={e => setDeb({ ...deb, j: e.target.value })} /><input style={{ ...champ, width: 96 }} type="time" value={deb.h} onChange={e => setDeb({ ...deb, h: e.target.value })} /></div></Champ>
        <Champ label="Fin (Cayenne)"><div style={{ display: "flex", gap: 4 }}><input style={champ} type="date" value={fin.j} onChange={e => setFin({ ...fin, j: e.target.value })} /><input style={{ ...champ, width: 96 }} type="time" value={fin.h} onChange={e => setFin({ ...fin, h: e.target.value })} /></div></Champ>
        <Champ label="Hôte responsable"><ChoixHote hotes={d.hotes} valeur={s.hote_id} onChange={v => maj({ hote_id: v })} /></Champ>
        <Champ label="Campagne"><select style={champ} value={s.campagne_id || ""} onChange={e => maj({ campagne_id: e.target.value || null })}><option value="">— Aucune —</option>{d.campagnes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}</select></Champ>
      </div>
      {s.source === "natif" && <div style={{ fontSize: 11, color: K.cremeD }}>Les membres connectés pourront voter une fois, entre la date de début et de fin, quand le statut est « Actif ».</div>}

      {s.source === "whatsapp" && (
        <Carte style={{ padding: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>Texte à publier sur WhatsApp</div>
          <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: K.cremeF, margin: 0, fontFamily: "inherit" }}>{texteWhatsApp}</pre>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}><button style={bouton("ghost", true)} onClick={() => navigator.clipboard.writeText(texteWhatsApp)}>📋 Copier</button><button style={bouton("ghost", true)} onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(texteWhatsApp)}`, "_blank", "noopener")}>💬 WhatsApp</button></div>
          <div style={{ fontSize: 12, fontWeight: 700, color: K.or, margin: "12px 0 8px" }}>Résultats relevés sur WhatsApp</div>
          <div style={grille(150)}>
            {s.choix.filter((c: any) => c.libelle).map((c: any) => <Champ key={c.id} label={c.libelle}><input style={champ} type="number" min={0} value={s.resultats_manuels?.[c.id] ?? ""} onChange={e => maj({ resultats_manuels: { ...(s.resultats_manuels || {}), [c.id]: e.target.value === "" ? 0 : Number(e.target.value) } })} /></Champ>)}
            <Champ label="Nombre de participants"><input style={champ} type="number" min={0} value={s.participants_manuels ?? ""} onChange={e => maj({ participants_manuels: e.target.value })} /></Champ>
          </div>
        </Carte>
      )}
      {init.id && <Carte style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: K.or, marginBottom: 8 }}>Répartition</div><GraphiqueRepartition {...res} /></Carte>}
      <Champ label="Notes internes"><textarea style={{ ...champ, minHeight: 50 }} value={s.notes_internes || ""} onChange={e => maj({ notes_internes: e.target.value })} /></Champ>
      <Erreur msg={erreur} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {init.id && <button style={bouton("danger")} onClick={async () => { if (confirm("Supprimer ce sondage et ses votes ?")) { await sbDelete("bsh_sondages", init.id); recharger(); onFermer(); } }}>Supprimer</button>}
        <div style={{ flex: 1 }} /><button style={bouton("ghost")} onClick={onFermer}>Annuler</button><button style={bouton("plein")} onClick={enregistrer}>💾 Enregistrer</button>
      </div>
    </Feuille>
  );
}

function CarteSondage({ s, onOuvrir }: { s: Sondage; onOuvrir: () => void }) {
  const res = useResultats(s);
  const st = STATUTS.find(x => x[0] === s.statut) || STATUTS[0];
  return <Carte style={{ display: "flex", flexDirection: "column", gap: 8 }}>
    <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
      <div style={{ flex: 1, cursor: "pointer" }} onClick={onOuvrir}><div style={{ fontSize: 14, fontWeight: 700, color: K.creme }}>{s.question}</div><div style={{ fontSize: 11, color: K.cremeD }}>{ESPACES[s.destination]} · {s.source === "natif" ? "vote dans Bellaïa" : "WhatsApp"} · {libelleInstant(s.date_debut)}{s.date_fin ? ` → ${libelleInstant(s.date_fin)}` : ""}</div></div>
      <Etiquette couleur={st[2]}>{st[1]}</Etiquette>
    </div>
    <GraphiqueRepartition {...res} />
    <button style={{ ...bouton("ghost", true), alignSelf: "flex-start" }} onClick={onOuvrir}>✏️ Ouvrir</button>
  </Carte>;
}

export default function BshSondages({ d, recharger }: { d: Donnees; recharger: () => void }) {
  const [ouvert, setOuvert] = useState<Sondage | null>(null);
  const [filtre, setFiltre] = useState("actuels");
  const liste = d.sondages.filter(s => filtre === "tous" || (filtre === "actuels" ? s.statut !== "archive" : s.statut === filtre));
  const reserve = sondagesAManquer(d.sondages); const [msg, setMsg] = useState("");
  const ajouterReserve = async () => { try { await sbInsert("bsh_sondages", reserve, "return=minimal"); setMsg(`✅ ${reserve.length} sondage(s) de la réserve ajoutés en brouillon (rien n'est publié).`); recharger(); } catch (e: any) { setMsg("⚠️ " + (e?.message || e)); } };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Titre action={<button style={bouton("plein")} onClick={() => setOuvert({ question: "", choix: [], choix_multiple: false, destination: "chaine", source: "whatsapp", statut: "brouillon", resultats_manuels: {} } as any)}>+ Sondage</button>}>Sondages</Titre>
      {reserve.length > 0 ? <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}><span style={{ fontSize: 12, color: K.cremeF }}>Réserve officielle : {reserve.length} sondage(s) pas encore créés.</span><button style={bouton("or", true)} onClick={ajouterReserve}>Ajouter la réserve en brouillon ({reserve.length})</button></div> : <div style={{ fontSize: 11, color: K.ok }}>✓ Les 10 sondages de la réserve sont présents.</div>}
      {msg && <div style={{ fontSize: 12, color: msg.startsWith("⚠️") ? K.erreur : K.ok }}>{msg}</div>}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{[["actuels", "En cours et à venir"], ["actif", "Actifs"], ["clos", "Clos"], ["archive", "Archivés"], ["tous", "Tous"]].map(([v, l]) => <button key={v} style={bouton(filtre === v ? "or" : "ghost", true)} onClick={() => setFiltre(v)}>{l}</button>)}</div>
      {liste.length === 0 ? <Vide>Aucun sondage.</Vide> : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(min(340px,100%),1fr))", gap: 10 }}>{liste.map(s => <CarteSondage key={s.id} s={s} onOuvrir={() => setOuvert(s)} />)}</div>}
      {ouvert && <EditeurSondage s={ouvert} d={d} recharger={recharger} onFermer={() => setOuvert(null)} />}
    </div>
  );
}

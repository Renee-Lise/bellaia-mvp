"use client";
// ═══════════════════════════════════════════════════════════
// Bella'Event — Préparation & budget d'un événement (de A à Z)
// Pour chaque programme (events_programmes) :
//  • liste de courses (cochable en magasin, par catégorie)
//  • dépenses prévues / réelles et gains → marge de l'événement
//  • génération de la liste par l'IA Bellaïa (à relire avant ajout)
//  • impression / partage de la liste de courses
// Table : events_budget_lignes (migration 0102).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbInsert, sbUpdate, sbDelete, fmtEur, demanderIA, extraireJson, partagerFichier } from "./eventsAtelierLib";

const C = { card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.09)", cream: "#e8e3d5", muted: "rgba(255,255,255,0.45)", gold: "#c9a84c", vert: "#065f46", ok: "#4ade80", rouge: "#f87171", violet: "#a78bfa" };
const SA = "Inter,system-ui,sans-serif";
const CATEGORIES = ["Alimentation", "Boissons", "Décoration", "Papeterie", "Vaisselle & jetable", "Location", "Fleurs", "Transport", "Main d'œuvre", "Divers"];
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: `1px solid ${C.border}`, borderRadius: 9, padding: "7px 9px", color: C.cream, fontSize: 12, outline: "none", fontFamily: SA, width: "100%", boxSizing: "border-box" };
const bouton = (fort = false): React.CSSProperties => ({ padding: "7px 12px", borderRadius: 10, border: `1px solid ${fort ? C.gold : C.border}`, background: fort ? `${C.gold}22` : C.card, color: fort ? C.gold : C.cream, cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: SA, whiteSpace: "nowrap" });

type Ligne = { id: string; programme_id: string; type: "depense" | "recette"; categorie: string | null; libelle: string; quantite: number; unite: string | null; prix_unitaire: number; montant_reel: number | null; dans_courses: boolean; achete: boolean; fournisseur: string | null; notes: string | null; ordre: number };
const prevu = (l: Ligne) => (Number(l.quantite) || 0) * (Number(l.prix_unitaire) || 0);
const reel = (l: Ligne) => (l.montant_reel ?? null) !== null ? Number(l.montant_reel) : prevu(l);

export default function EventsPreparation() {
  const [programmes, setProgrammes] = useState<any[]>([]);
  const [progId, setProgId] = useState("");
  const [lignes, setLignes] = useState<Ligne[]>([]);
  const [erreur, setErreur] = useState("");
  const [vue, setVue] = useState<"courses" | "budget">("courses");
  const [form, setForm] = useState<any>(null);
  const [ia, setIa] = useState<{ etat: "repos" | "attente" | "apercu"; propositions: any[]; msg: string }>({ etat: "repos", propositions: [], msg: "" });

  useEffect(() => {
    sbSelect("events_programmes", "select=id,reference,client_nom,occasion,theme_nom,theme_description,decoration_notes,date_evenement,nb_personnes,lignes,total,statut&order=date_evenement.desc.nullslast&limit=200")
      .then(p => { setProgrammes(p); if (p[0]) setProgId(p[0].id); })
      .catch(e => setErreur(e.message));
  }, []);
  const charger = async (id = progId) => {
    if (!id) return;
    try { setLignes(await sbSelect<Ligne>("events_budget_lignes", `select=*&programme_id=eq.${id}&order=ordre.asc,created_at.asc`)); setErreur(""); }
    catch (e: any) { setErreur(e.message); }
  };
  useEffect(() => { charger(progId); setIa({ etat: "repos", propositions: [], msg: "" }); }, [progId]);

  const prog = programmes.find(p => p.id === progId);
  const totaux = useMemo(() => {
    const dep = lignes.filter(l => l.type === "depense"), rec = lignes.filter(l => l.type === "recette");
    const prixProgramme = Number(prog?.total) || 0;
    const gains = prixProgramme + rec.reduce((s, l) => s + reel(l), 0);
    const depPrevu = dep.reduce((s, l) => s + prevu(l), 0), depReel = dep.reduce((s, l) => s + reel(l), 0);
    const marge = gains - depReel;
    return { prixProgramme, gains, depPrevu, depReel, marge, taux: gains > 0 ? (marge / gains) * 100 : 0, restant: dep.filter(l => l.dans_courses && !l.achete).length, nbCourses: dep.filter(l => l.dans_courses).length };
  }, [lignes, prog]);

  const maj = async (l: Ligne, patch: Partial<Ligne>) => {
    setLignes(xs => xs.map(x => x.id === l.id ? { ...x, ...patch } : x));
    try { await sbUpdate("events_budget_lignes", l.id, { ...patch, updated_at: new Date().toISOString() }); } catch (e: any) { setErreur(e.message); charger(); }
  };
  const enregistrer = async () => {
    if (!form?.libelle?.trim()) return;
    const d = { programme_id: progId, type: form.type || "depense", categorie: form.categorie || null, libelle: form.libelle.trim(), quantite: Number(form.quantite) || 1, unite: form.unite || null, prix_unitaire: Number(form.prix_unitaire) || 0, montant_reel: form.montant_reel === "" || form.montant_reel == null ? null : Number(form.montant_reel), dans_courses: form.type === "recette" ? false : form.dans_courses !== false, fournisseur: form.fournisseur || null, notes: form.notes || null };
    try {
      if (form.id) await sbUpdate("events_budget_lignes", form.id, { ...d, updated_at: new Date().toISOString() });
      else await sbInsert("events_budget_lignes", { ...d, ordre: lignes.length });
      setForm(null); charger();
    } catch (e: any) { setErreur(e.message); }
  };
  const supprimer = async (l: Ligne) => { if (!confirm(`Supprimer « ${l.libelle} » ?`)) return; try { await sbDelete("events_budget_lignes", l.id); charger(); } catch (e: any) { setErreur(e.message); } };

  const genererIA = async () => {
    if (!prog) return;
    setIa({ etat: "attente", propositions: [], msg: "" });
    const contexte = {
      occasion: prog.occasion, theme: prog.theme_nom, description_theme: prog.theme_description, decoration: prog.decoration_notes,
      date: prog.date_evenement, nb_personnes: prog.nb_personnes, prix_vendu_client: prog.total,
      prestations_vendues: (Array.isArray(prog.lignes) ? prog.lignes : []).map((x: any) => `${x.quantite || 1} × ${x.libelle || x.nom || x.designation || ""}`).slice(0, 40),
      deja_dans_la_liste: lignes.map(l => l.libelle),
    };
    try {
      const txt = await demanderIA(
        "Tu es Bellaïa, l'assistante de Bella'Studio (événementiel, Guyane française, prix en euros). Tu prépares la liste de courses et le budget d'un événement. Réponds UNIQUEMENT avec un tableau JSON, sans texte autour.",
        `Voici l'événement : ${JSON.stringify(contexte)}\n\nPropose la liste complète de ce qu'il faut acheter ou prévoir (alimentation, boissons, décoration, papeterie, vaisselle jetable, location, divers), adaptée au nombre de personnes et au thème, sans répéter ce qui est déjà dans la liste. Format : [{"categorie": une de ${JSON.stringify(CATEGORIES)}, "libelle": "...", "quantite": nombre, "unite": "pièce|kg|L|paquet|lot", "prix_unitaire": estimation réaliste en euros en Guyane}]. 15 à 40 lignes maximum.`
      );
      const arr = extraireJson(txt);
      if (!Array.isArray(arr) || !arr.length) throw new Error("Réponse IA vide");
      setIa({ etat: "apercu", propositions: arr.map((x: any) => ({ ...x, garder: true })), msg: "" });
    } catch (e: any) {
      setIa({ etat: "repos", propositions: [], msg: /credit|crédit|balance/i.test(e.message) ? "L'IA est branchée mais le compte Anthropic n'a plus de crédit : ajoute du crédit sur console.anthropic.com (Plans & Billing), puis réessaie." : "IA indisponible : " + e.message });
    }
  };
  const validerIA = async () => {
    const choisies = ia.propositions.filter(p => p.garder && p.libelle);
    if (!choisies.length) return setIa({ etat: "repos", propositions: [], msg: "" });
    try {
      await sbInsert("events_budget_lignes", choisies.map((p, i) => ({ programme_id: progId, type: "depense", categorie: CATEGORIES.includes(p.categorie) ? p.categorie : "Divers", libelle: String(p.libelle).slice(0, 200), quantite: Number(p.quantite) || 1, unite: p.unite || null, prix_unitaire: Number(p.prix_unitaire) || 0, dans_courses: true, notes: "Proposé par l'IA Bellaïa", ordre: lignes.length + i })), "return=minimal");
      setIa({ etat: "repos", propositions: [], msg: `${choisies.length} ligne(s) ajoutée(s).` }); charger();
    } catch (e: any) { setErreur(e.message); }
  };

  const texteCourses = () => {
    const parCat = new Map<string, Ligne[]>();
    lignes.filter(l => l.type === "depense" && l.dans_courses).forEach(l => { const k = l.categorie || "Divers"; parCat.set(k, [...(parCat.get(k) || []), l]); });
    let t = `🛒 Liste de courses — ${prog?.reference || ""} ${prog?.client_nom || ""} (${prog?.occasion || ""}${prog?.theme_nom ? " · " + prog.theme_nom : ""})\n`;
    if (prog?.date_evenement) t += `📅 ${new Date(prog.date_evenement).toLocaleDateString("fr-FR")}\n`;
    for (const [cat, ls] of parCat) { t += `\n— ${cat} —\n`; ls.forEach(l => { t += `${l.achete ? "☑" : "☐"} ${l.quantite} ${l.unite || ""} ${l.libelle}${l.prix_unitaire ? ` (~${fmtEur(prevu(l))})` : ""}\n`; }); }
    t += `\nBudget estimé : ${fmtEur(totaux.depPrevu)}`;
    return t;
  };
  const imprimer = () => {
    const w = window.open("", "_blank"); if (!w) return;
    const esc = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]!));
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Liste de courses</title><style>body{font-family:Georgia,serif;padding:24px;color:#222}pre{font-family:inherit;font-size:14px;line-height:1.7;white-space:pre-wrap}</style></head><body><pre>${esc(texteCourses())}</pre><script>setTimeout(()=>print(),300)</script></body></html>`);
    w.document.close();
  };
  const partager = async () => {
    const t = texteCourses();
    const nav: any = navigator;
    if (nav.share) { try { await nav.share({ title: "Liste de courses", text: t }); return; } catch (e: any) { if (e?.name === "AbortError") return; } }
    await partagerFichier(new Blob([t], { type: "text/plain" }), "liste-de-courses.txt", "Liste de courses");
  };

  if (!programmes.length) return <div style={{ color: erreur ? C.rouge : C.muted, fontSize: 12, padding: 16, textAlign: "center" }}>{erreur ? "⚠️ " + erreur : "Crée d'abord un programme dans l'onglet « 🎉 Programme à thème » : la préparation et le budget s'y rattachent."}</div>;

  const parCategorie = (filtre: (l: Ligne) => boolean) => {
    const m = new Map<string, Ligne[]>();
    lignes.filter(filtre).forEach(l => { const k = l.categorie || "Divers"; m.set(k, [...(m.get(k) || []), l]); });
    return [...m.entries()];
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA }}>
      <select value={progId} onChange={e => setProgId(e.target.value)} style={{ ...champ, fontWeight: 700 }}>
        {programmes.map(p => <option key={p.id} value={p.id}>{p.reference || "—"} · {p.client_nom || "Client"} · {p.occasion || ""}{p.theme_nom ? " · " + p.theme_nom : ""}{p.date_evenement ? " · " + new Date(p.date_evenement).toLocaleDateString("fr-FR") : ""}</option>)}
      </select>

      {/* Synthèse */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(130px,1fr))", gap: 8 }}>
        {[["Gains", fmtEur(totaux.gains), C.ok, `dont programme ${fmtEur(totaux.prixProgramme)}`], ["Dépenses prévues", fmtEur(totaux.depPrevu), C.gold, ""], ["Dépenses réelles", fmtEur(totaux.depReel), C.gold, "prévu si non renseigné"], ["Marge", fmtEur(totaux.marge), totaux.marge >= 0 ? C.ok : C.rouge, `${totaux.taux.toFixed(1)} % des gains`]].map(([l, v, c, s]) => (
          <div key={l} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 12px" }}>
            <div style={{ fontSize: 10, color: C.muted, textTransform: "uppercase", fontWeight: 700 }}>{l}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: c as string, fontFamily: "Georgia,serif" }}>{v}</div>
            {s && <div style={{ fontSize: 10, color: C.muted }}>{s}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        <button style={bouton(vue === "courses")} onClick={() => setVue("courses")}>🛒 Courses ({totaux.nbCourses - totaux.restant}/{totaux.nbCourses})</button>
        <button style={bouton(vue === "budget")} onClick={() => setVue("budget")}>💶 Budget détaillé</button>
        <div style={{ flex: 1 }} />
        <button style={bouton()} onClick={() => setForm({ type: "depense", categorie: "Alimentation", quantite: 1, dans_courses: true })}>+ Dépense</button>
        <button style={bouton()} onClick={() => setForm({ type: "recette", categorie: "Divers", quantite: 1 })}>+ Gain</button>
        <button style={bouton(true)} onClick={genererIA} disabled={ia.etat === "attente"}>{ia.etat === "attente" ? "⏳ L'IA réfléchit…" : "✨ Liste par l'IA"}</button>
      </div>
      {ia.msg && <div style={{ fontSize: 12, color: ia.msg.startsWith("IA") || ia.msg.includes("crédit") ? C.rouge : C.ok }}>{ia.msg}</div>}
      {erreur && <div style={{ fontSize: 12, color: C.rouge }}>⚠️ {erreur}</div>}

      {ia.etat === "apercu" && (
        <div style={{ background: `${C.violet}12`, border: `1px solid ${C.violet}55`, borderRadius: 12, padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.violet }}>Propositions de l'IA — décoche ce que tu ne veux pas, ajuste ensuite</div>
          {ia.propositions.map((p, i) => (
            <label key={i} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, color: p.garder ? C.cream : C.muted }}>
              <input type="checkbox" checked={p.garder} onChange={e => setIa(s => ({ ...s, propositions: s.propositions.map((x, j) => j === i ? { ...x, garder: e.target.checked } : x) }))} />
              <span style={{ flex: 1 }}>{p.quantite} {p.unite} — {p.libelle} <span style={{ color: C.muted }}>({p.categorie})</span></span>
              <span>{fmtEur((Number(p.quantite) || 0) * (Number(p.prix_unitaire) || 0))}</span>
            </label>
          ))}
          <div style={{ display: "flex", gap: 8 }}><button style={bouton(true)} onClick={validerIA}>Ajouter la sélection</button><button style={bouton()} onClick={() => setIa({ etat: "repos", propositions: [], msg: "" })}>Annuler</button></div>
        </div>
      )}

      {vue === "courses" && (
        <>
          <div style={{ display: "flex", gap: 6 }}><button style={bouton()} onClick={imprimer}>🖨️ Imprimer</button><button style={bouton()} onClick={partager}>📤 Partager (WhatsApp, mail…)</button></div>
          {parCategorie(l => l.type === "depense" && l.dans_courses).map(([cat, ls]) => (
            <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, margin: "2px 0 6px" }}>{cat}</div>
              {ls.map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.border}` }}>
                  <input type="checkbox" checked={l.achete} onChange={e => maj(l, { achete: e.target.checked })} style={{ width: 18, height: 18 }} />
                  <div style={{ flex: 1, fontSize: 13, color: l.achete ? C.muted : C.cream, textDecoration: l.achete ? "line-through" : "none" }} onClick={() => setForm({ ...l })}>{l.quantite} {l.unite || ""} {l.libelle}</div>
                  <span style={{ fontSize: 11, color: C.muted }}>{l.prix_unitaire ? fmtEur(prevu(l)) : ""}</span>
                </div>
              ))}
            </div>
          ))}
          {totaux.nbCourses === 0 && <div style={{ fontSize: 12, color: C.muted, textAlign: "center", padding: 14 }}>Liste vide — ajoute des dépenses ou demande à l'IA.</div>}
        </>
      )}

      {vue === "budget" && ["depense", "recette"].map(t => (
        <div key={t} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: t === "depense" ? C.gold : C.ok }}>{t === "depense" ? "Dépenses" : "Gains supplémentaires (en plus du prix du programme)"}</div>
          {parCategorie(l => l.type === t).map(([cat, ls]) => (
            <div key={cat} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "8px 12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800, color: C.muted, marginBottom: 4 }}><span>{cat}</span><span>{fmtEur(ls.reduce((s, l) => s + reel(l), 0))}</span></div>
              {ls.map(l => (
                <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderTop: `1px solid ${C.border}`, fontSize: 12 }}>
                  <div style={{ flex: 1, color: C.cream }}>{l.libelle} <span style={{ color: C.muted }}>· {l.quantite} × {fmtEur(l.prix_unitaire)}{l.fournisseur ? " · " + l.fournisseur : ""}</span></div>
                  <span style={{ color: l.montant_reel != null ? C.cream : C.muted }} title={l.montant_reel != null ? "montant réel" : "montant prévu"}>{fmtEur(reel(l))}</span>
                  <button style={{ ...bouton(), padding: "3px 8px" }} onClick={() => setForm({ ...l })}>✏️</button>
                  <button style={{ ...bouton(), padding: "3px 8px" }} onClick={() => supprimer(l)}>🗑</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      ))}

      {form && (
        <div onClick={() => setForm(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#16131c", border: `1px solid ${C.border}`, borderRadius: "16px 16px 0 0", padding: 16, width: "100%", maxWidth: 520, display: "flex", flexDirection: "column", gap: 8, maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: C.cream }}>{form.id ? "Modifier" : "Ajouter"} {form.type === "recette" ? "un gain" : "une dépense"}</div>
            <input style={champ} placeholder="Libellé (ex. Ballons or 30 cm)" value={form.libelle || ""} onChange={e => setForm({ ...form, libelle: e.target.value })} autoFocus />
            <select style={champ} value={form.categorie || ""} onChange={e => setForm({ ...form, categorie: e.target.value })}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
              <input style={champ} type="number" placeholder="Quantité" value={form.quantite ?? ""} onChange={e => setForm({ ...form, quantite: e.target.value })} />
              <input style={champ} placeholder="Unité" value={form.unite || ""} onChange={e => setForm({ ...form, unite: e.target.value })} />
              <input style={champ} type="number" placeholder="Prix unitaire €" value={form.prix_unitaire ?? ""} onChange={e => setForm({ ...form, prix_unitaire: e.target.value })} />
            </div>
            <input style={champ} type="number" placeholder="Montant réel payé / encaissé € (facultatif)" value={form.montant_reel ?? ""} onChange={e => setForm({ ...form, montant_reel: e.target.value })} />
            <input style={champ} placeholder="Fournisseur / magasin" value={form.fournisseur || ""} onChange={e => setForm({ ...form, fournisseur: e.target.value })} />
            <textarea style={{ ...champ, minHeight: 50 }} placeholder="Notes" value={form.notes || ""} onChange={e => setForm({ ...form, notes: e.target.value })} />
            {form.type !== "recette" && <label style={{ fontSize: 12, color: C.cream, display: "flex", gap: 6 }}><input type="checkbox" checked={form.dans_courses !== false} onChange={e => setForm({ ...form, dans_courses: e.target.checked })} /> Apparaît dans la liste de courses</label>}
            <div style={{ display: "flex", gap: 8 }}><button style={bouton(true)} onClick={enregistrer}>Enregistrer</button><button style={bouton()} onClick={() => setForm(null)}>Annuler</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

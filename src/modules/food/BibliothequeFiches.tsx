"use client";
// ═══════════════════════════════════════════════════════════
// Bibliothèque professionnelle — fiches techniques (Bella'Food).
// • Inventaire classé par provenance, catégorie, espace et statut.
// • Recherche par nom, code, ingrédient ou catégorie.
// • Import : PDF, plusieurs fichiers, Fichiers iPhone / Google Drive
//   (via le sélecteur de fichiers), photo, scan (appareil photo),
//   Word, ZIP, texte collé. Originaux conservés dans le stockage
//   privé ; empreinte SHA-256 → doublons détectés.
// • Recette extraite = « à valider » : validation humaine obligatoire
//   (rien n'est inventé ; allergènes absents = inconnus).
// • Droits d'utilisation par source (périmètre + justificatif).
// Les originaux pédagogiques ne sont jamais publiés côté client.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbFoodGet, sbFoodPatch, sbFoodPost } from "./foodApi";
import { deposerPrive, ouvrirPrive, nomFichierSur } from "../equipe/equipeLib";
import AtelierImport from "./AtelierImport";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c" };
export const CATEGORIES_BIBLIO = ["Pâtisserie", "Boulangerie", "Viennoiserie", "Biscuits", "Gâteaux", "Entremets", "Tartes", "Crèmes", "Mousses", "Ganaches", "Glaçages", "Pâtes", "Desserts", "Confiseries", "Cuisine salée", "Sauces", "Boissons", "Techniques professionnelles", "Hygiène et sécurité alimentaire"];
const STATUTS: Record<string, [string, string]> = {
  a_importer: ["À importer", C.doux], extrait: ["Extraite", C.orange], a_valider: ["À valider", C.orange],
  valide: ["Validée", C.ok], rejete: ["Rejetée", C.rouge], doublon: ["Doublon", C.rouge],
};
const PERIMETRES: [string, string][] = [["utilisation_interne", "Utilisation interne"], ["adaptation", "Adaptation"], ["partage", "Partage"], ["diffusion_commerciale", "Diffusion commerciale"]];
const btn = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
const carte: React.CSSProperties = { background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12 };

async function sha256(f: Blob) {
  const h = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, "0")).join("");
}
const origineDe = (f: File) => f.type === "application/pdf" ? "pdf" : f.type.startsWith("image/") ? "photo" : /\.docx?$/i.test(f.name) ? "word" : /\.zip$/i.test(f.name) ? "zip" : "iphone";

export default function BibliothequeFiches() {
  const [fiches, setFiches] = useState<any[]>([]);
  const [recettes, setRecettes] = useState<Record<string, any>>({});
  const [sources, setSources] = useState<any[]>([]);
  const [statut, setStatut] = useState("");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [msg, setMsg] = useState("");
  const [ouverte, setOuverte] = useState<string | null>(null);
  const [colle, setColle] = useState("");
  const [onglet, setOnglet] = useState<"fiches" | "import" | "droits">("fiches");
  const [charge, setCharge] = useState(true);

  const charger = async () => {
    setCharge(true);
    try {
      const [f, s] = await Promise.all([
        sbFoodGet<any>("bibliotheque_fiches", "select=*&order=code.asc.nullslast,created_at.asc&limit=2000"),
        sbFoodGet<any>("bibliotheque_sources", "select=*&order=nom.asc"),
      ]);
      setFiches(f); setSources(s);
      const ids = Array.from(new Set(f.flatMap((x: any) => [x.recette_id, x.doublon_recette_id]).filter(Boolean)));
      if (ids.length) {
        const r = await sbFoodGet<any>("food_recettes", `id=in.(${ids.join(",")})&select=id,nom,statut,categorie,ingredients,nb_parts,rendement,temps_prepa,temps_cuisson,temps_repos,temperature,etapes,astuces,materiel,conservation,notes,allergenes`);
        setRecettes(Object.fromEntries(r.map((x: any) => [x.id, x])));
      }
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
    setCharge(false);
  };
  useEffect(() => { charger(); }, []);

  const categories = useMemo(() => Array.from(new Set([...CATEGORIES_BIBLIO, ...fiches.map(f => f.categorie).filter(Boolean), ...fiches.flatMap(f => f.categories_extra || [])])), [fiches]);
  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase();
    return fiches.filter(f => (!statut || f.statut === statut) && (!cat || f.categorie === cat || (f.categories_extra || []).includes(cat)) && (!t || [f.titre, f.code, f.categorie, ...((recettes[f.recette_id]?.ingredients || []).map((i: any) => i?.nom))].some(v => String(v || "").toLowerCase().includes(t))));
  }, [fiches, recettes, statut, cat, q]);
  const compte = (s: string) => fiches.filter(f => f.statut === s).length;
  const sourceNom = (id: string) => sources.find(s => s.id === id)?.nom || "Source inconnue";

  const reclasser = async (f: any, categorie: string) => {
    const r = await sbFoodPatch("bibliotheque_fiches", f.id, { categorie });
    if (r.ok) setFiches(l => l.map(x => x.id === f.id ? { ...x, categorie } : x)); else setMsg("❌ " + r.error);
  };
  const valider = async (f: any, ok: boolean) => {
    if (!f.recette_id) return;
    if (ok && !confirm("Valider cette recette ? Vérifiez quantités, étapes et allergènes (non indiqués sur la fiche = inconnus).")) return;
    const r1 = await sbFoodPatch("food_recettes", f.recette_id, ok ? { statut: "actif", validee_le: new Date().toISOString() } : { statut: "archivee" });
    const r2 = await sbFoodPatch("bibliotheque_fiches", f.id, { statut: ok ? "valide" : "rejete" });
    if (r1.ok && r2.ok) { setMsg(ok ? `✅ « ${f.titre} » validée : disponible dans les recettes Bella'Food.` : `Fiche « ${f.titre} » rejetée (recette archivée, rien supprimé).`); charger(); }
    else setMsg("❌ " + (r1.error || r2.error));
  };

  const importer = async (liste: FileList | null) => {
    if (!liste?.length) return;
    const src = sources[0]?.id || null;
    let ok = 0, doublons = 0;
    for (const f of Array.from(liste)) {
      try {
        const emp = await sha256(f);
        if (fiches.some(x => x.empreinte === emp)) { doublons++; continue; }
        const chemin = `bibliotheque/${emp.slice(0, 16)}-${nomFichierSur(f.name)}`;
        await deposerPrive(chemin, f);
        const r = await sbFoodPost("bibliotheque_fiches", { titre: f.name.replace(/\.[^.]+$/, ""), origine: origineDe(f), storage_path: chemin, empreinte: emp, statut: "a_importer", source_id: src, espace: "BELLAFOOD" });
        if (r.ok) ok++;
      } catch (e: any) { setMsg("❌ " + f.name + " : " + String(e?.message || e)); }
    }
    setMsg(`✅ ${ok} document(s) importé(s) dans le stockage privé${doublons ? ` · ${doublons} doublon(s) ignoré(s)` : ""}. Extraction en recette : à lancer depuis la fiche.`);
    charger();
  };
  const collerRecette = async () => {
    if (colle.trim().length < 20) return;
    const r = await sbFoodPost("bibliotheque_fiches", { titre: colle.trim().split("\n")[0].slice(0, 80), origine: "texte", notes: colle.trim().slice(0, 20000), statut: "a_importer", espace: "BELLAFOOD" });
    if (r.ok) { setColle(""); setMsg("✅ Recette collée enregistrée : extraction et validation depuis la fiche."); charger(); }
  };
  const majSource = async (s: any, champ: string, val: any) => {
    const r = await sbFoodPatch("bibliotheque_sources", s.id, { [champ]: val });
    if (r.ok) setSources(l => l.map(x => x.id === s.id ? { ...x, [champ]: val } : x)); else setMsg("❌ " + r.error);
  };
  const justificatif = async (s: any, f?: File) => {
    if (!f) return;
    const chemin = `bibliotheque/droits/${s.id}-${nomFichierSur(f.name)}`;
    try { await deposerPrive(chemin, f); await majSource(s, "justificatif_path", chemin); setMsg("✅ Justificatif enregistré (privé)."); }
    catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 900, margin: "0 auto" }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 900 }}>📚 Bibliothèque professionnelle</div>
        <div style={{ fontSize: 13, color: C.doux, marginTop: 4, lineHeight: 1.5 }}>
          {fiches.length} fiche(s) · {compte("a_valider")} à valider · {compte("valide")} validée(s) · {compte("a_importer")} à importer. Les recettes extraites restent « à valider » : rien n'est inventé, un allergène non indiqué reste inconnu.
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {([["fiches", "📄 Fiches"], ["import", "⬆️ Importer"], ["droits", "⚖️ Sources & droits"]] as const).map(([k, l]) => <button key={k} style={btn(onglet === k)} onClick={() => setOnglet(k)}>{l}</button>)}
      </div>
      {msg && <div style={{ ...carte, fontSize: 13 }}>{msg}</div>}

      {onglet === "fiches" && <>
        <input style={champ} value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher : nom, code FT, ingrédient, catégorie…" />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <select style={{ ...champ, width: "auto", flex: 1 }} value={statut} onChange={e => setStatut(e.target.value)}>
            <option value="">Tous les statuts</option>
            {Object.entries(STATUTS).map(([k, [l]]) => <option key={k} value={k}>{l} ({compte(k)})</option>)}
          </select>
          <select style={{ ...champ, width: "auto", flex: 1 }} value={cat} onChange={e => setCat(e.target.value)}>
            <option value="">Toutes les catégories</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        {charge && <div style={{ color: C.doux }}>Chargement…</div>}
        {visibles.map(f => { const r = recettes[f.recette_id]; const [sl, sc] = STATUTS[f.statut] || [f.statut, C.doux]; return (
          <div key={f.id} style={{ ...carte, borderLeft: `4px solid ${sc}`, display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "baseline" }}>
              <b style={{ fontSize: 15 }}>{f.code ? `${f.code} · ` : ""}{f.titre || "Fiche non encore lue"}</b>
              <span style={{ fontSize: 11, fontWeight: 800, color: sc }}>{sl}</span>
            </div>
            <div style={{ fontSize: 12, color: C.doux }}>{sourceNom(f.source_id)} · {f.origine === "drive" ? "Google Drive" : f.origine} · espace {f.espace === "BELLAFOOD" ? "Bella'Food (privé)" : f.espace === "VILDOR" ? "Vil'Dor (privé)" : "partagé"}{r ? ` · ${(r.ingredients || []).length} ingrédient(s), ${(r.etapes || []).length} étape(s)` : ""}</div>
            {(!!(f.contradictions || []).length || f.doublon_recette_id || !!(f.informations_manquantes || []).length) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {!!(f.contradictions || []).length && <span style={{ fontSize: 11, fontWeight: 800, color: C.rouge, border: `1px solid ${C.rouge}66`, borderRadius: 99, padding: "2px 8px" }}>⚠️ {f.contradictions.length} contradiction(s) dans la fiche</span>}
                {f.doublon_recette_id && <span style={{ fontSize: 11, fontWeight: 800, color: C.orange, border: `1px solid ${C.orange}66`, borderRadius: 99, padding: "2px 8px" }}>⧉ Doublon potentiel</span>}
                {(f.informations_manquantes || []).map((m: string) => <span key={m} style={{ fontSize: 11, color: C.doux, border: `1px solid ${C.ligne}`, borderRadius: 99, padding: "2px 8px" }}>Manque : {m}</span>)}
              </div>)}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              <select style={{ ...champ, width: "auto", minHeight: 36, fontSize: 14 }} value={f.categorie || ""} onChange={e => reclasser(f, e.target.value)}>
                <option value="">Catégorie…</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              {f.drive_url && <a href={f.drive_url} target="_blank" rel="noopener noreferrer" style={{ ...btn(), textDecoration: "none", display: "inline-flex", alignItems: "center" }}>📎 Original (Drive)</a>}
              {f.storage_path && <button style={btn()} onClick={() => ouvrirPrive(f.storage_path)}>📎 Original</button>}
              {r && <button style={btn()} onClick={() => setOuverte(ouverte === f.id ? null : f.id)}>{ouverte === f.id ? "Fermer" : "Voir la recette"}</button>}
              {r && f.statut === "a_valider" && <><button style={btn(true, C.ok)} onClick={() => valider(f, true)}>✓ Valider</button><button style={btn(false)} onClick={() => valider(f, false)}>Rejeter</button></>}
            </div>
            {ouverte === f.id && r && (
              <div style={{ fontSize: 13, lineHeight: 1.55, borderTop: `1px solid ${C.ligne}`, paddingTop: 8 }}>
                {(f.contradictions || []).map((c: any, k: number) => (
                  <div key={k} style={{ border: `1px solid ${C.rouge}55`, background: `${C.rouge}10`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <b style={{ color: C.rouge }}>⚠️ {c.sujet} — à trancher par vous (non corrigé)</b>
                    <div style={{ fontSize: 12, color: C.doux, margin: "2px 0 4px" }}>Extraits de la fiche originale :</div>
                    {(c.extraits || []).map((x: string, i: number) => <div key={i} style={{ fontSize: 13, fontStyle: "italic", marginLeft: 8 }}>{x}</div>)}
                  </div>))}
                {f.doublon_recette_id && recettes[f.doublon_recette_id] && (() => { const d = recettes[f.doublon_recette_id]; return (
                  <div style={{ border: `1px solid ${C.orange}55`, background: `${C.orange}10`, borderRadius: 10, padding: 10, marginBottom: 8 }}>
                    <b style={{ color: C.orange }}>⧉ Comparaison avec la recette existante « {d.nom} »</b>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 6, fontSize: 12 }}>
                      <div><div style={{ fontWeight: 800, marginBottom: 2 }}>Existante</div>{(d.ingredients || []).map((i: any, k: number) => <div key={k}>{i.quantite ?? ""} {i.unite || ""} {i.nom}</div>)}<div style={{ color: C.doux, marginTop: 4 }}>{(d.etapes || []).length} étape(s)</div></div>
                      <div><div style={{ fontWeight: 800, marginBottom: 2 }}>Fiche importée</div>{(r.ingredients || []).map((i: any, k: number) => <div key={k}>{i.quantite ?? ""} {i.unite || ""} {i.nom}</div>)}<div style={{ color: C.doux, marginTop: 4 }}>{(r.etapes || []).length} étape(s)</div></div>
                    </div>
                    <div style={{ fontSize: 12, color: C.doux, marginTop: 6 }}>Décision attendue : conserver séparément, fusionner (compléter l'existante) ou rejeter l'import. Rien n'est fusionné sans votre validation.</div>
                  </div>); })()}
                <div style={{ color: C.doux }}>{[r.rendement, r.temps_prepa && `préparation ${r.temps_prepa} min`, r.temps_cuisson && `cuisson ${r.temps_cuisson} min`, r.temps_repos && `repos ${r.temps_repos} min`, r.temperature && `${r.temperature} °C`].filter(Boolean).join(" · ")}</div>
                <b>Ingrédients</b>
                <ul style={{ margin: "4px 0", paddingLeft: 18 }}>{(r.ingredients || []).map((i: any, k: number) => <li key={k}>{i.quantite ?? ""} {i.unite || ""} {i.nom}{i.notes ? ` (${i.notes})` : ""}</li>)}</ul>
                <b>Étapes</b>
                <ol style={{ margin: "4px 0", paddingLeft: 18 }}>{(r.etapes || []).map((e: string, k: number) => <li key={k}>{e}</li>)}</ol>
                {!!(r.astuces || []).length && <><b>Astuces</b><ul style={{ margin: "4px 0", paddingLeft: 18 }}>{r.astuces.map((a: string, k: number) => <li key={k}>{a}</li>)}</ul></>}
                {r.conservation && <div><b>Conservation : </b>{r.conservation}</div>}
                <div style={{ color: C.orange, marginTop: 4 }}>Allergènes : {(r.allergenes || []).length ? r.allergenes.join(", ") : "non indiqués sur la fiche — à renseigner avant toute vente"}</div>
                {r.notes && <div style={{ color: C.doux, whiteSpace: "pre-wrap", marginTop: 4, fontSize: 12 }}>{r.notes}</div>}
              </div>)}
          </div>); })}
        {!charge && !visibles.length && <div style={{ color: C.doux, textAlign: "center", padding: 20 }}>Aucune fiche dans ce filtre.</div>}
      </>}

      {onglet === "import" && <AtelierImport espace="BELLAFOOD" sourceId={null} />}

      {onglet === "droits" && sources.map(s => (
        <div key={s.id} style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <b style={{ fontSize: 15 }}>{s.nom}</b>
          <div style={{ fontSize: 13, color: C.doux, lineHeight: 1.5 }}>{s.confirmation}{s.confirme_le ? ` (${new Date(s.confirme_le).toLocaleDateString("fr-FR")})` : ""}</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {PERIMETRES.map(([k, l]) => { const on = (s.perimetre || []).includes(k); return (
              <button key={k} style={btn(on, on ? C.ok : C.or)} onClick={() => majSource(s, "perimetre", on ? s.perimetre.filter((x: string) => x !== k) : [...(s.perimetre || []), k])}>{on ? "✓ " : ""}{l}</button>); })}
          </div>
          <div style={{ fontSize: 12, color: C.doux }}>Diffusion commerciale non cochée : les documents originaux ne sont jamais publiés dans le catalogue client.</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ ...btn(), display: "inline-flex", alignItems: "center" }}>📎 {s.justificatif_path ? "Remplacer le justificatif" : "Joindre le justificatif"}<input type="file" hidden onChange={e => justificatif(s, e.target.files?.[0])} /></label>
            {s.justificatif_path && <button style={btn()} onClick={() => ouvrirPrive(s.justificatif_path)}>Voir le justificatif</button>}
          </div>
        </div>))}
    </div>
  );
}

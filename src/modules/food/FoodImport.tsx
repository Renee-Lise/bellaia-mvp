// ═══════════════════════════════════════════════════════════
// FoodImport — Moteur d'import de recettes Bella'Food
// Sources : texte, lien, photo, PDF, réseaux sociaux
// Niveau 1 opérationnel : texte + copier-coller + Supabase
// Niveau 2 préparé : OCR, IA, liens externes
// src/modules/food/FoodImport.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_COLORS as FC, FOOD_CATEGORIES } from "./foodConsts";
import { analyserTexteRecette, fmtDuree } from "./foodUtils";
import type { Recette, SourceImport, ImportRecette } from "./foodTypes";

// ── Persistance Supabase (niveau 1 opérationnel) ───────────
async function sbSauvegarderRecette(r: Partial<Recette>): Promise<string | null> {
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  if (!SB_URL) return null;
  try {
    const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
    const payload = {
      nom:            r.nom || "Recette sans nom",
      categorie:      r.categorie || "patisserie",
      nb_parts:       r.nbParts,
      difficulte:     r.difficulte,
      temps_prepa:    r.tempsPrepa,
      temps_cuisson:  r.tempsCuisson,
      temps_repos:    r.tempsRepos,
      cout_matiere:   r.coutMatiere,
      prix_conseille: r.prixConseille,
      fete_associee:  r.feteAssociee || null,
      allergenes:     r.allergenes || [],
      ingredients:    r.ingredients || [],
      etapes:         r.etapes || [],
      notes:          r.notes,
      source:         r.sourceType,
      statut:         "brouillon",
    };
    const resp = await fetch(`${SB_URL}/rest/v1/food_recettes`, {
      method: "POST",
      headers: {
        apikey: SB_KEY, Authorization: "Bearer " + token,
        "Content-Type": "application/json", Prefer: "return=representation",
      },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return Array.isArray(data) ? data[0]?.id : data?.id ?? null;
  } catch { return null; }
}

// ── Helpers UI ─────────────────────────────────────────────
const SA = "system-ui, sans-serif";


const Badge = ({ txt, col }: { txt: string; col: string }) => (
  <span style={{ fontSize:9, background:col+"22", color:col, borderRadius:4,
    padding:"2px 7px", fontWeight:700, fontFamily:SA }}>{txt}</span>
);

// ── Sources disponibles ────────────────────────────────────
const SOURCES: { id: SourceImport; nom: string; ico: string; disponible: boolean; note?: string }[] = [
  {id:"texte",       nom:"Texte libre",      ico:"📝", disponible:true},
  {id:"lien",        nom:"Lien internet",    ico:"🔗", disponible:true,   note:"Extraction automatique préparée"},
  {id:"photo",       nom:"Photo",            ico:"📷", disponible:true},
  {id:"capture_ecran",nom:"Capture écran",   ico:"🖼",  disponible:true},
  {id:"pdf",         nom:"PDF",              ico:"📄", disponible:false,  note:"Extraction texte — disponible avec IA"},
  {id:"document",    nom:"Document Word",    ico:"📃", disponible:false,  note:"Disponible avec IA"},
  {id:"pinterest",   nom:"Pinterest",        ico:"📌", disponible:false,  note:"API — disponible ultérieurement"},
  {id:"instagram",   nom:"Instagram",        ico:"📸", disponible:false,  note:"API — disponible ultérieurement"},
  {id:"tiktok",      nom:"TikTok",           ico:"🎵", disponible:false,  note:"API vidéo — disponible ultérieurement"},
];

// ── Champs détectables par l'OCR ──────────────────────────
const CHAMPS_DETECTABLES = [
  "nom","tempsPrepa","tempsCuisson","tempsRepos","temperature",
  "nbParts","ingredients","etapes","allergenes","astuces",
];

interface Props {
  onImporter: (recette: Partial<Recette>) => void;
}

export default function FoodImport({ onImporter }: Props) {
  const [source,       setSource]       = useState<SourceImport>("texte");
  const [contenu,      setContenu]      = useState("");
  const [url,          setUrl]          = useState("");
  const [photoFile,    setPhotoFile]    = useState<File|null>(null);
  const [photoApercu,  setPhotoApercu]  = useState<string|null>(null);
  const [analyse,      setAnalyse]      = useState(false);
  const [erreurAnalyse,setErreurAnalyse]= useState<string|null>(null);
  const [resultat,     setResultat]     = useState<Partial<Recette> | null>(null);
  const [etape,        setEtape]        = useState<"source"|"saisie"|"resultat">("source");
  const [saving,       setSaving]       = useState(false);
  const [savedId,      setSavedId]      = useState<string|null>(null);
  const [historiqueImports] = useState<ImportRecette[]>([]);

  // Import depuis une photo/capture d'écran — demande explicite de
  // Renée-Lise ("je ne peux pas rajouter de recettes depuis une
  // image"), jusqu'ici volontairement désactivé. Appelle Claude en
  // vision (même pattern que /api/ia/decoration-menu).
  const analyserPhotoRecette = async () => {
    if (!photoFile) return;
    setErreurAnalyse(null); setAnalyse(true); setResultat(null);
    try {
      const dataUrl: string = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(photoFile);
      });
      const [meta, b64] = dataUrl.split(",");
      const mediaType = (meta.match(/data:([^;]+);/) || [])[1] || photoFile.type || "image/jpeg";
      const token = await (window as any).getTokenAsync?.() ?? SB_KEY;
      const r = await fetch("/api/ia/importer-recette-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer "+token },
        body: JSON.stringify({ imageBase64: b64, mediaType }),
      });
      const d = await r.json();
      if (!r.ok) { setErreurAnalyse(d.error || "Échec de l'analyse."); setAnalyse(false); return; }
      const rec = d.recette || {};
      const detected: Partial<Recette> = {
        nom: rec.nom || undefined,
        categorie: rec.categorie || "patisserie",
        feteAssociee: rec.feteAssociee || undefined,
        nbParts: rec.nbParts ?? undefined,
        difficulte: (rec.difficulte ?? 3) as 1|2|3|4|5,
        tempsPrepa: rec.tempsPrepa ?? 0,
        tempsCuisson: rec.tempsCuisson ?? 0,
        tempsRepos: rec.tempsRepos ?? undefined,
        ingredients: Array.isArray(rec.ingredients) ? rec.ingredients.map((ing: any, i: number) => ({
          id: "ing"+i, nom: ing.nom || "", quantite: Number(ing.quantite) || 0, unite: ing.unite || "piece",
        })) : [],
        etapes: Array.isArray(rec.etapes) ? rec.etapes : [],
        allergenes: Array.isArray(rec.allergenes) ? rec.allergenes : [],
        astuces: Array.isArray(rec.astuces) ? rec.astuces : [],
        sourceType: source,
        source: source === "photo" ? "Photo" : "Capture d'écran",
      };
      setResultat(detected);
      setEtape("resultat");
    } catch (e: any) {
      setErreurAnalyse(e?.message || "Erreur réseau.");
    }
    setAnalyse(false);
  };

  const lancer = () => {
    if (source === "photo" || source === "capture_ecran") { analyserPhotoRecette(); return; }
    setAnalyse(true);
    setResultat(null);

    // Simulation analyse — remplacé par appel API IA réel ultérieurement
    setTimeout(() => {
      const texteAAnalyser = source === "texte" ? contenu : url;
      const detected = analyserTexteRecette(texteAAnalyser);
      detected.sourceType = source;
      detected.source     = source === "lien" ? url : "Saisie manuelle";
      setResultat(detected);
      setAnalyse(false);
      setEtape("resultat");
    }, 800);
  };

  const corriger = (champ: keyof Recette, val: any) => {
    setResultat(r => r ? { ...r, [champ]: val } : null);
  };

  const inpStyle = {
    background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
    borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
    fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box" as const,
  };

  // ── Étape 1 : choix source ────────────────────────────────
  if (etape === "source") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:13, color:FC.creamD, lineHeight:1.6 }}>
        Importez une recette depuis n'importe quelle source. Bellaïa détectera automatiquement les informations disponibles.
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {SOURCES.map(s => (
          <div key={s.id} onClick={() => s.disponible && setSource(s.id)}
            style={{
              background: source===s.id ? "rgba(21,128,61,0.15)" : FC.card,
              border:`1px solid ${source===s.id ? FC.vert : FC.line}`,
              borderRadius:12, padding:"12px 10px", cursor:s.disponible?"pointer":"default",
              opacity:s.disponible?1:0.5,
              display:"flex", flexDirection:"column", alignItems:"center", gap:5,
            }}>
            <span style={{ fontSize:22 }}>{s.ico}</span>
            <span style={{ fontSize:11, fontWeight:700, color:source===s.id?FC.vertL:"rgba(255,255,255,0.7)",
              fontFamily:SA, textAlign:"center" }}>{s.nom}</span>
            {!s.disponible && s.note && (
              <span style={{ fontSize:8, color:"rgba(255,255,255,0.35)", textAlign:"center" }}>{s.note}</span>
            )}
            {s.disponible && source===s.id && (
              <Badge txt="Sélectionné" col={FC.vert}/>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => setEtape("saisie")}
        style={{ background:FC.vert, border:"none", borderRadius:10, padding:"11px",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
        Continuer →
      </button>

      {/* Architectue IA future */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.12)",
        borderRadius:10, padding:"12px 14px" }}>
        <div style={{ fontSize:11, fontWeight:700, color:"rgba(255,255,255,0.5)", marginBottom:4 }}>
          🤖 Moteur IA — Architecture préparée
        </div>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", lineHeight:1.6 }}>
          L'analyse OCR complète (photos, PDFs, captures), l'extraction depuis Instagram, Pinterest, TikTok et les liens web sont préparés dans l'architecture. Le branchement IA se fera sans refonte du module.
        </div>
      </div>
    </div>
  );

  // ── Étape 2 : saisie ──────────────────────────────────────
  if (etape === "saisie") return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={() => setEtape("source")}
          style={{ background:"none", border:"1px solid rgba(255,255,255,0.15)", borderRadius:8,
            padding:"4px 10px", color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:11 }}>
          ‹ Retour
        </button>
        <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
          {SOURCES.find(s=>s.id===source)?.ico} {SOURCES.find(s=>s.id===source)?.nom}
        </div>
      </div>

      {source === "texte" && (
        <>
          <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6 }}>
            Collez le texte de la recette. Bellaïa détectera automatiquement : nom, durées, température, allergènes…
          </div>
          <textarea value={contenu} onChange={e=>setContenu(e.target.value)}
            placeholder={"Exemple :\n\nLayer Cake Chocolat\n\nIngrédients :\n- 400g farine\n- 6 oeufs\n...\n\nPréparation :\n...\n\nCuisson : 35 min à 180°C"}
            rows={12}
            style={{ ...inpStyle, resize:"vertical", lineHeight:1.6 }} />
        </>
      )}

      {source === "lien" && (
        <>
          <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6 }}>
            Collez un lien vers la recette. L'extraction automatique du contenu sera disponible avec le moteur IA.
          </div>
          <input value={url} onChange={e=>setUrl(e.target.value)}
            placeholder="https://exemple.com/recette-colombo..."
            style={inpStyle} />
          <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", fontStyle:"italic" }}>
            Pour l'instant, copiez le texte de la page et utilisez l'import "Texte libre".
          </div>
        </>
      )}

      {(source === "photo" || source === "capture_ecran") && (
        <>
          <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6 }}>
            {source === "photo"
              ? "Photographiez une fiche recette (livre, carte manuscrite, affichette). Bellaïa détecte automatiquement : nom, ingrédients, étapes, temps, occasion…"
              : "Importez une capture d'écran de recette (réseau social, site). Bellaïa détecte automatiquement : nom, ingrédients, étapes, temps, occasion…"}
          </div>
          <label style={{ display:"block", background: photoApercu ? "transparent" : "rgba(21,128,61,0.12)",
            border:`1px dashed ${FC.line}`, borderRadius:12, padding: photoApercu ? 0 : "28px 14px",
            textAlign:"center", cursor:"pointer" }}>
            {photoApercu
              ? <img src={photoApercu} alt="" style={{ width:"100%", maxHeight:220, objectFit:"cover", borderRadius:12 }}/>
              : <span style={{ fontSize:12, color:FC.vertL, fontWeight:700 }}>{source === "photo" ? "📷 Choisir une photo" : "🖼 Choisir une capture d'écran"}</span>}
            <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
              const f = e.target.files?.[0];
              if (!f) return;
              setPhotoFile(f);
              const reader = new FileReader();
              reader.onload = () => setPhotoApercu(reader.result as string);
              reader.readAsDataURL(f);
            }}/>
          </label>
          {erreurAnalyse && <div style={{ fontSize:11, color:"#f87171" }}>{erreurAnalyse}</div>}
        </>
      )}

      <button onClick={lancer}
        disabled={(!contenu.trim() && !url.trim() && !photoFile) || analyse}
        style={{ background:FC.vert, border:"none", borderRadius:10, padding:"11px",
          color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA,
          opacity:(!contenu.trim() && !url.trim() && !photoFile) || analyse ? 0.5 : 1 }}>
        {analyse ? "Analyse en cours…" : "🔍 Analyser la recette"}
      </button>
    </div>
  );

  // ── Étape 3 : résultat + correction ───────────────────────
  if (etape === "resultat" && resultat) {
    const champs = Object.keys(resultat).filter(c => resultat[c as keyof Recette]);
    const manquants = CHAMPS_DETECTABLES.filter(c => !champs.includes(c));

    return (
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {/* Résumé de l'analyse */}
        <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"13px 14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:FC.vertL, marginBottom:6 }}>
            ✅ Analyse terminée
          </div>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {champs.map(c => <Badge key={c} txt={c} col={FC.vert}/>)}
          </div>
          {manquants.length > 0 && (
            <div style={{ marginTop:8, display:"flex", gap:5, flexWrap:"wrap" }}>
              {manquants.map(c => <Badge key={c} txt={"? "+c} col="#f87171"/>)}
            </div>
          )}
        </div>

        {/* Champs corrigeables */}
        <div style={{ background:FC.card, border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"14px", display:"flex", flexDirection:"column", gap:10 }}>
          <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:2 }}>
            Vérifiez et complétez
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Nom de la recette</label>
            <input value={resultat.nom||""} onChange={e=>corriger("nom",e.target.value)}
              placeholder="Nom de la recette" style={inpStyle}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>Nb portions</label>
              <input type="number" value={resultat.nbParts||""} onChange={e=>corriger("nbParts",parseInt(e.target.value)||undefined)}
                style={inpStyle}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>Difficulté (1-5)</label>
              <select value={resultat.difficulte||3} onChange={e=>corriger("difficulte",parseInt(e.target.value))}
                style={{ ...inpStyle, background:"#1a1a2e" }}>
                {[1,2,3,4,5].map(n=><option key={n} value={n}>{n} {"★".repeat(n)}</option>)}
              </select>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>Prépa (min)</label>
              <input type="number" value={resultat.tempsPrepa||""} onChange={e=>corriger("tempsPrepa",parseInt(e.target.value)||undefined)}
                style={inpStyle}/>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
              <label style={{ fontSize:10, color:FC.creamD }}>Cuisson (min)</label>
              <input type="number" value={resultat.tempsCuisson||""} onChange={e=>corriger("tempsCuisson",parseInt(e.target.value)||undefined)}
                style={inpStyle}/>
            </div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Catégorie</label>
            <select value={resultat.categorie||""} onChange={e=>corriger("categorie",e.target.value)}
              style={{ ...inpStyle, background:"#1a1a2e" }}>
              <option value="">— Sélectionner —</option>
              {FOOD_CATEGORIES.map(c=><option key={c.id} value={c.id}>{c.ico} {c.nom}</option>)}
            </select>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
            <label style={{ fontSize:10, color:FC.creamD }}>Occasion associée (optionnel)</label>
            <select value={resultat.feteAssociee||""} onChange={e=>corriger("feteAssociee",e.target.value||undefined)}
              style={{ ...inpStyle, background:"#1a1a2e" }}>
              <option value="">— Aucune —</option>
              {["Noël","Nouvel an","Pâques","Toussaint"].map(f=><option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          {resultat.allergenes && resultat.allergenes.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:FC.creamD, marginBottom:4 }}>Allergènes détectés</div>
              <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
                {resultat.allergenes.map(a => <Badge key={a} txt={a} col="#fb923c"/>)}
              </div>
            </div>
          )}
        </div>

        <div style={{ display:"flex", gap:8 }}>
          <button onClick={async () => {
            if (!resultat) return;
            setSaving(true);
            // 1. Tenter persistance Supabase
            const sbId = await sbSauvegarderRecette(resultat);
            if (sbId) {
              setSavedId(sbId);
              // Enrich avec l'ID Supabase si retourné
              onImporter({ ...resultat, id: sbId });
            } else {
              // Fallback local si Supabase indisponible
              onImporter(resultat);
            }
            setSaving(false);
            setEtape("source");
            setContenu("");
            setUrl("");
            setPhotoFile(null);
            setPhotoApercu(null);
            setResultat(null);
          }}
            disabled={saving}
            style={{ flex:1, background:FC.vert, border:"none", borderRadius:10, padding:"11px",
              color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA,
              opacity: saving ? 0.7 : 1 }}>
            {saving ? "Enregistrement…" : "✅ Importer la recette"}
          </button>
          <button onClick={() => setEtape("saisie")}
            style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
              padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:13,
              cursor:"pointer", fontFamily:SA }}>
            ← Modifier
          </button>
        </div>
        {savedId && (
          <div style={{ fontSize:11, color:FC.vertL, textAlign:"center", fontWeight:700 }}>
            ✅ Sauvegardée dans Bella'Food (ID: {savedId.slice(0,8)}…)
          </div>
        )}

      </div>
    );
  }

  return null;
}

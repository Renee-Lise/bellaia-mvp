"use client";
// ═══════════════════════════════════════════════════════════
// STUDIO IA BELLAÏA — Module central transversal
// Accessible depuis tous les pôles
// Génération : fiches, flyers, posts RS, scripts vidéo, devis, contrats
// Toute génération = brouillon + validation fondatrice
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { generer, LABELS_GENERATION, type TypeGeneration, type DemandeGeneration } from "./generateur";
import { sbInsert } from "../shared/supabaseHelpers";
import { POLES } from "../shared/constants";

const B = {
  deep:"#0d0b12",card:"rgba(255,255,255,0.04)",border:"rgba(255,255,255,0.08)",
  cream:"#e8e3d5",muted:"rgba(255,255,255,0.4)",gold:"#c9a84c",
  violet:"#7c3aed",violetL:"#a78bfa",success:"#4ade80",danger:"#ef4444",
};
const SA = "Inter,system-ui,sans-serif";
const FS = "'Cormorant Garamond',Georgia,serif";

const TYPES_RS: TypeGeneration[]    = ["post_facebook","post_instagram","story","statut_whatsapp"];
const TYPES_DOC: TypeGeneration[]   = ["devis","facture","contrat","fiche_fournisseur","description_commerciale"];
const TYPES_VISUEL: TypeGeneration[] = ["fiche_produit","fiche_prestation","catalogue","flyer","affiche"];
const TYPES_VIDEO: TypeGeneration[]  = ["script_video","storyboard"];

const GROUPES = [
  { label:"📦 Produits & prestations", types: TYPES_VISUEL },
  { label:"📱 Réseaux sociaux",        types: TYPES_RS },
  { label:"📋 Documents",              types: TYPES_DOC },
  { label:"🎬 Vidéo",                  types: TYPES_VIDEO },
];

const STYLES = [
  { id:"elegant",       label:"✦ Élégant" },
  { id:"festif",        label:"🎉 Festif" },
  { id:"professionnel", label:"💼 Pro" },
  { id:"ludique",       label:"🎨 Ludique" },
];

const Btn = ({ children, onClick, v="primary", sm=false, disabled=false }: any) => {
  const bgs: Record<string,string> = {
    primary:`linear-gradient(135deg,${B.violet},#9333ea)`,
    gold:`linear-gradient(135deg,${B.gold},#b8860b)`,
    ghost:"rgba(255,255,255,0.07)",
    danger:"rgba(239,68,68,0.15)",
  };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{background:bgs[v],border:`1px solid ${v==="ghost"?B.border:v==="danger"?"rgba(239,68,68,0.4)":"transparent"}`,borderRadius:10,padding:sm?"5px 11px":"9px 16px",color:v==="danger"?"#ef4444":"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:sm?11:13,fontWeight:700,fontFamily:SA,opacity:disabled?0.5:1}}>
      {children}
    </button>
  );
};

export default function StudioIAF({ user, poleDefaut = "GENERAL" }: { user?: any; poleDefaut?: string }) {
  const [pole, setPole]           = useState(poleDefaut);
  const [typeChoisi, setType]     = useState<TypeGeneration|null>(null);
  const [style, setStyle]         = useState<DemandeGeneration["style"]>("elegant");
  const [contexte, setContexte]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [resultat, setResultat]   = useState<string|null>(null);
  const [sauvegarde, setSauvegarde]= useState(false);
  const [historique, setHistorique]= useState<{type:string;contenu:string;cree_le:string}[]>([]);
  const [ong, setOng]             = useState<"generer"|"historique"|"calculateur">("generer");

  const genererContenu = async () => {
    if (!typeChoisi || !contexte.trim()) return;
    setLoading(true); setResultat(null); setSauvegarde(false);
    try {
      const res = await generer({
        type:     typeChoisi,
        pole,
        contexte: { description: contexte },
        style,
      });
      setResultat(res.contenu);
    } catch(e: any) {
      setResultat(`❌ Erreur : ${e.message}`);
    }
    setLoading(false);
  };

  const validerEtSauvegarder = async () => {
    if (!resultat || !typeChoisi) return;
    try {
      await sbInsert("documents", {
        titre:         `${LABELS_GENERATION[typeChoisi]} — ${new Date().toLocaleDateString("fr-FR")}`,
        type_document: typeChoisi,
        contenu:       resultat,
        statut:        "validé",
        pole,
        notes:         `Généré par IA Bellaïa · Style : ${style}`,
      } as any);
      setHistorique(h => [{ type: LABELS_GENERATION[typeChoisi], contenu: resultat.slice(0,100)+"…", cree_le: new Date().toLocaleString("fr-FR") }, ...h]);
      setSauvegarde(true);
    } catch(e: any) {
      alert(`Erreur sauvegarde : ${e.message}`);
    }
  };

  const copier = () => {
    if (resultat) { navigator.clipboard.writeText(resultat); }
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>✦ Studio IA Bellaïa</div>
          <div style={{fontSize:10,color:B.muted}}>Génération de contenus · Validation fondatrice obligatoire</div>
        </div>
        <div style={{fontSize:9,padding:"4px 10px",borderRadius:20,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700}}>
          Brouillon → Validation requise
        </div>
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:6}}>
        {[{id:"generer",l:"✨ Générer"},{id:"historique",l:`📚 Historique (${historique.length})`},{id:"calculateur",l:"🧮 Calculateur"}].map(o=>(
          <button key={o.id} onClick={()=>setOng(o.id as any)}
            style={{flex:1,padding:"7px",borderRadius:10,border:`1px solid ${ong===o.id?B.gold:B.border}`,background:ong===o.id?`${B.gold}15`:"transparent",color:ong===o.id?B.gold:B.muted,cursor:"pointer",fontSize:11,fontWeight:ong===o.id?700:400,fontFamily:SA}}>
            {o.l}
          </button>
        ))}
      </div>

      {/* ── TAB GÉNÉRER */}
      {ong==="generer" && (<>
        {/* Pôle */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Pôle concerné</div>
          <div style={{display:"flex",gap:5,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {POLES.map(p=>(
              <button key={p.id} onClick={()=>setPole(p.id)}
                style={{padding:"5px 12px",borderRadius:99,border:`1px solid ${pole===p.id?p.couleur:B.border}`,background:pole===p.id?`${p.couleur}20`:"transparent",color:pole===p.id?p.couleur:B.muted,cursor:"pointer",fontSize:10,fontWeight:pole===p.id?700:400,whiteSpace:"nowrap",fontFamily:SA}}>
                {p.ico} {p.nom.replace("Bella'","").replace("Vilo'","Vilo ")}
              </button>
            ))}
          </div>
        </div>

        {/* Type de contenu */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Type de contenu</div>
          {GROUPES.map(g=>(
            <div key={g.label} style={{marginBottom:10}}>
              <div style={{fontSize:10,color:B.muted,fontWeight:600,marginBottom:5}}>{g.label}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                {g.types.map(t=>(
                  <button key={t} onClick={()=>setType(t)}
                    style={{padding:"5px 10px",borderRadius:8,border:`1px solid ${typeChoisi===t?B.gold:B.border}`,background:typeChoisi===t?`${B.gold}18`:"transparent",color:typeChoisi===t?B.gold:B.muted,cursor:"pointer",fontSize:10,fontWeight:typeChoisi===t?700:400,fontFamily:SA}}>
                    {LABELS_GENERATION[t]}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Style */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>Style</div>
          <div style={{display:"flex",gap:6}}>
            {STYLES.map(s=>(
              <button key={s.id} onClick={()=>setStyle(s.id as any)}
                style={{flex:1,padding:"6px",borderRadius:10,border:`1px solid ${style===s.id?B.violetL:B.border}`,background:style===s.id?`${B.violetL}15`:"transparent",color:style===s.id?B.violetL:B.muted,cursor:"pointer",fontSize:10,fontWeight:style===s.id?700:400,textAlign:"center",fontFamily:SA}}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Contexte */}
        <div>
          <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>
            Décrivez le produit / service / sujet
          </div>
          <textarea value={contexte} onChange={e=>setContexte(e.target.value)}
            placeholder="Ex: Kit lèvres repulpant Bella'Odyssée, contient gloss, liner et soin hydratant, prix 35€, cible femmes 25-45 ans..."
            rows={4}
            style={{width:"100%",background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:12,padding:"10px 13px",color:B.cream,fontSize:13,outline:"none",fontFamily:SA,resize:"vertical",boxSizing:"border-box"}}/>
        </div>

        <Btn onClick={genererContenu} disabled={!typeChoisi||!contexte.trim()||loading}>
          {loading ? "⏳ Génération en cours…" : `✨ Générer — ${typeChoisi?LABELS_GENERATION[typeChoisi]:"choisir un type"}`}
        </Btn>

        {/* Résultat */}
        {resultat && (
          <div style={{display:"flex",flexDirection:"column",gap:8}}>
            <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${B.border}`,borderRadius:14,padding:"14px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                <div style={{fontSize:11,fontWeight:700,color:B.violetL}}>
                  ✦ Contenu généré — BROUILLON
                </div>
                <button onClick={copier}
                  style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${B.border}`,borderRadius:7,padding:"4px 10px",color:B.muted,cursor:"pointer",fontSize:10,fontFamily:SA}}>
                  📋 Copier
                </button>
              </div>
              <div style={{fontSize:12,color:B.cream,lineHeight:1.75,whiteSpace:"pre-wrap"}}>{resultat}</div>
            </div>

            {/* Avertissement validation */}
            <div style={{background:"rgba(201,168,76,0.08)",border:"1px solid rgba(201,168,76,0.25)",borderRadius:10,padding:"10px 13px"}}>
              <div style={{fontSize:10,fontWeight:700,color:B.gold,marginBottom:3}}>⚠️ Validation obligatoire</div>
              <div style={{fontSize:10,color:B.muted}}>Ce contenu est un brouillon. Relisez-le, modifiez-le si nécessaire, puis validez pour l'enregistrer. Aucun contenu n'est publié automatiquement.</div>
            </div>

            <div style={{display:"flex",gap:8}}>
              {!sauvegarde ? (
                <Btn v="gold" onClick={validerEtSauvegarder}>✅ Valider et enregistrer</Btn>
              ) : (
                <div style={{flex:1,textAlign:"center",color:B.success,fontSize:13,fontWeight:700,padding:"10px"}}>✅ Enregistré dans Documents</div>
              )}
              <Btn v="ghost" onClick={()=>{setResultat(null);setSauvegarde(false);}}>↺ Regénérer</Btn>
            </div>
          </div>
        )}
      </>)}

      {/* ── TAB HISTORIQUE */}
      {ong==="historique" && (
        <div style={{display:"flex",flexDirection:"column",gap:8}}>
          {historique.length===0
            ? <div style={{textAlign:"center",color:B.muted,padding:24,fontSize:13}}>Aucun contenu généré cette session.<br/><span style={{fontSize:10}}>Les contenus validés sont dans Documents.</span></div>
            : historique.map((h,i)=>(
              <div key={i} style={{background:B.card,border:`1px solid ${B.border}`,borderRadius:12,padding:"11px 13px"}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <div style={{fontSize:11,fontWeight:700,color:B.violetL}}>{h.type}</div>
                  <div style={{fontSize:10,color:B.muted}}>{h.cree_le}</div>
                </div>
                <div style={{fontSize:11,color:B.muted}}>{h.contenu}</div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── TAB CALCULATEUR */}
      {ong==="calculateur" && (
        <div style={{fontSize:11,color:B.muted,textAlign:"center",padding:16}}>
          Chargement du calculateur…
          <br/><span style={{fontSize:10}}>Utilisez l'onglet Finances → Calculateur pour accès direct.</span>
        </div>
      )}
    </div>
  );
}

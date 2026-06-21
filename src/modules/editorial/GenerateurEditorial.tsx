
"use client";
// GÉNÉRATEUR ÉDITORIAL BELLAÏA — voir modules/editorial/GenerateurEditorial.tsx
// Ce fichier sera remplacé par le composant complet lors du déploiement
import { useState } from "react";
import { sbInsert } from "../shared/supabaseHelpers";
import { POLES } from "../shared/constants";

const B={card:"rgba(255,255,255,0.04)",border:"rgba(255,255,255,0.08)",cream:"#e8e3d5",muted:"rgba(255,255,255,0.4)",gold:"#c9a84c",violet:"#7c3aed",violetL:"#a78bfa",success:"#4ade80",danger:"#ef4444"};
const SA="Inter,system-ui,sans-serif";const FS="\'Cormorant Garamond\',Georgia,serif";

const TYPES_DOC=[
  {id:"livre",label:"Livre",ico:"📖"},{id:"livret",label:"Livret",ico:"📄"},
  {id:"ebook",label:"E-book",ico:"💻"},{id:"cahier_activites",label:"Cahier d\'activités",ico:"✏️"},
  {id:"cahier_pedagogique",label:"Cahier pédagogique",ico:"🎓"},{id:"cahier_vacances",label:"Cahier de vacances",ico:"☀️"},
  {id:"guide_pratique",label:"Guide pratique",ico:"🗺"},{id:"workbook",label:"Workbook",ico:"📋"},
  {id:"planner",label:"Planner",ico:"📅"},{id:"catalogue",label:"Catalogue",ico:"🛍"},
  {id:"recueil",label:"Recueil",ico:"📚"},{id:"mini_formation",label:"Mini-formation PDF",ico:"🎯"},
];
const FORMATS=[
  {id:"A4",label:"A4",dim:"210×297mm · Impression standard"},
  {id:"A5",label:"A5",dim:"148×210mm · Livrets et guides"},
  {id:"carre",label:"Carré",dim:"200×200mm · Albums et catalogues"},
  {id:"numerique",label:"Numérique",dim:"16:9 · Optimisé écran"},
];
const SECTIONS=[
  {id:"couverture",label:"1ère de couverture",ob:true},{id:"page_garde",label:"Page de garde",ob:false},
  {id:"mentions_legales",label:"Mentions légales",ob:false},{id:"sommaire",label:"Sommaire",ob:false},
  {id:"introduction",label:"Introduction",ob:true},{id:"corps",label:"Corps du document",ob:true},
  {id:"exercices",label:"Exercices",ob:false},{id:"fiches_pratiques",label:"Fiches pratiques",ob:false},
  {id:"pub_interne",label:"Publicités internes",ob:false},{id:"decouvrir_aussi",label:"À découvrir aussi",ob:false},
  {id:"conclusion",label:"Conclusion",ob:true},{id:"a_propos",label:"À propos",ob:false},
  {id:"4e_couverture",label:"4ème de couverture",ob:false},
];
const IDENTITE:Record<string,{couleur:string;ton:string;univers:string}>={
  MTP:{couleur:"#16a34a",ton:"pédagogique et bienveillant",univers:"Guyane, enfants, créole"},
  STRUCTURE:{couleur:"#d97706",ton:"professionnel et créatif",univers:"entrepreneuriat, digital, business"},
  EVENTS:{couleur:"#0d9488",ton:"élégant et festif",univers:"événementiel, fêtes, déco"},
  ODYSSEE:{couleur:"#7c3aed",ton:"luxueux et personnel",univers:"beauté, bien-être, soin"},
  FOOD:{couleur:"#16a34a",ton:"gourmand et authentique",univers:"cuisine créole, Guyane, saveurs"},
  VILO:{couleur:"#0369a1",ton:"sérieux et accessible",univers:"administratif, démarches, aide"},
  BSH:{couleur:"#be185d",ton:"élégant et raffiné",univers:"intimité, lingerie, luxe discret"},
  GENERAL:{couleur:"#7c3aed",ton:"professionnel",univers:"Bella\'Studio, multiservice"},
};

const Btn=({children,onClick,v="primary",sm=false,disabled=false,full=false}:any)=>{
  const bgs:any={primary:`linear-gradient(135deg,#7c3aed,#9333ea)`,gold:`linear-gradient(135deg,#c9a84c,#b8860b)`,ghost:"rgba(255,255,255,0.07)"};
  return <button onClick={onClick} disabled={disabled} style={{background:bgs[v],border:`1px solid ${v==="ghost"?B.border:"transparent"}`,borderRadius:10,padding:sm?"5px 11px":"10px 16px",color:"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:sm?11:13,fontWeight:700,fontFamily:SA,opacity:disabled?0.5:1,width:full?"100%":undefined}}>{children}</button>;
};
const Fld=({label,children}:any)=>(
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase" as const,letterSpacing:"0.05em"}}>{label}</div>
    {children}
  </div>
);
const Inp=({value,onChange,placeholder="",type="text",rows=1}:any)=>
  rows>1?<textarea value={value||""} onChange={onChange} placeholder={placeholder} rows={rows} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,outline:"none",fontFamily:SA,resize:"vertical" as const,width:"100%",boxSizing:"border-box" as const}}/>
  :<input value={value||""} onChange={onChange} placeholder={placeholder} type={type} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,outline:"none",fontFamily:SA,width:"100%",boxSizing:"border-box" as const}}/>;

export default function GenerateurEditorial({user}:{user?:any}){
  const [etape,setEtape]=useState<"config"|"gen"|"apercu"|"valide">("config");
  const [cfg,setCfg]=useState<any>({type:"ebook",format:"A4",pole:"MTP",nb_pages:20,niveau:"Grand public",sections:["couverture","introduction","corps","conclusion"]});
  const [contenu,setContenu]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);
  const [sauve,setSauve]=useState(false);
  const f=(k:string)=>(v:any)=>setCfg((x:any)=>({...x,[k]:typeof v==="string"?v:v?.target?.value??v}));
  const togSec=(id:string)=>setCfg((x:any)=>({...x,sections:x.sections?.includes(id)?x.sections.filter((s:string)=>s!==id):[...(x.sections||[]),id]}));

  const buildPrompt=()=>{
    const id=IDENTITE[cfg.pole||"GENERAL"]||IDENTITE.GENERAL;
    return `Tu es Bellaïa, assistante IA éditoriale de Bella\'Studio.
Génère la structure complète et les contenus initiaux d\'un "${TYPES_DOC.find(t=>t.id===cfg.type)?.label||cfg.type}" en français.
Titre : ${cfg.titre} | Thème : ${cfg.theme} | Niveau : ${cfg.niveau} | Pages : ${cfg.nb_pages}
Format : ${cfg.format} | Pôle : ${cfg.pole} (univers : ${id.univers}) | Ton : ${id.ton}
Public cible : ${cfg.public_cible||"Grand public"}
Sections : ${(cfg.sections||[]).join(", ")}
Génère : 1) Structure avec titres 2) Introduction (150 mots) 3) Plan détaillé 4) Conseils mise en page 5) Idées illustrations
Format : structuré, titres clairs. BROUILLON pour validation fondatrice.`;
  };

  const generer=async()=>{
    if(!cfg.titre?.trim()||!cfg.theme?.trim()){alert("Renseignez le titre et le thème.");return;}
    setLoading(true);setContenu(null);setEtape("gen");
    try{
      const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:[{role:"user",content:buildPrompt()}],max_tokens:2000})});
      const d=await r.json();
      setContenu(d.content?.[0]?.text||"Erreur de génération.");setEtape("apercu");
    }catch(e:any){setContenu(`Erreur : ${e.message}`);setEtape("apercu");}
    setLoading(false);
  };

  const valider=async()=>{
    if(!contenu)return;
    try{await sbInsert("projets_editoriaux",{titre:cfg.titre,type_projet:cfg.type,description:cfg.theme,statut:"en_cours",public_cible:cfg.public_cible||"Grand public",notes:contenu,avancement:10,fondatrice_id:user?.id} as any);}
    catch{await sbInsert("documents",{titre:cfg.titre,type_document:`editorial_${cfg.type}`,contenu,statut:"brouillon"} as any).catch(()=>{});}
    setSauve(true);setEtape("valide");
  };

  const exportPDF=()=>{
    const id=IDENTITE[cfg.pole||"GENERAL"]||IDENTITE.GENERAL;
    const w=window.open("","_blank");
    if(w){w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${cfg.titre}</title><style>body{font-family:Georgia,serif;padding:40px;max-width:800px;margin:auto;color:#1a1a1a}h1{color:${id.couleur}}h2{color:${id.couleur};border-bottom:2px solid ${id.couleur};padding-bottom:4px}pre{white-space:pre-wrap;font-family:inherit;font-size:13px;line-height:1.7}.footer{margin-top:40px;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:8px}</style></head><body><h1>${cfg.titre||"Document"}</h1><p style="color:#666">${cfg.theme||""} · ${cfg.pole} · Format ${cfg.format}</p><pre>${contenu||""}</pre><div class="footer">© Bella\'Studio · Bellaïa IA · Brouillon soumis à validation fondatrice</div></body></html>`);w.document.close();w.print();}
  };

  const poleActif=POLES.find(p=>p.id===cfg.pole)||POLES[0];
  const typeActif=TYPES_DOC.find(t=>t.id===cfg.type);

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:B.cream,fontFamily:FS}}>📖 Générateur éditorial</div>
          <div style={{fontSize:10,color:B.muted}}>Livres · Cahiers · E-books · Guides · Catalogues · Mini-formations</div>
        </div>
        <div style={{fontSize:9,padding:"3px 9px",borderRadius:20,background:"rgba(239,68,68,0.15)",color:"#ef4444",fontWeight:700}}>Brouillon → Validation</div>
      </div>

      <div style={{display:"flex",gap:4}}>
        {[{id:"config",l:"1 Config"},{id:"gen",l:"2 Génération"},{id:"apercu",l:"3 Aperçu"},{id:"valide",l:"4 Validé"}].map(e=>(
          <div key={e.id} style={{flex:1,padding:"5px 4px",borderRadius:8,background:etape===e.id?`${B.gold}20`:"rgba(255,255,255,0.04)",border:`1px solid ${etape===e.id?B.gold:"transparent"}`,textAlign:"center" as const,fontSize:9,color:etape===e.id?B.gold:B.muted,fontWeight:etape===e.id?700:400,fontFamily:SA}}>
            {e.l}
          </div>
        ))}
      </div>

      {etape==="config"&&(
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <Fld label="Titre *"><Inp value={cfg.titre} onChange={f("titre")} placeholder="Ex: Alphabet Guyane · Mo Ti-Péyi"/></Fld>
          <Fld label="Thème / Description *"><Inp value={cfg.theme} onChange={f("theme")} placeholder="Ex: Apprendre l\'alphabet avec des mots et personnages de Guyane…" rows={3}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Public cible"><Inp value={cfg.public_cible} onChange={f("public_cible")} placeholder="Ex: Enfants 3-6 ans"/></Fld>
            <Fld label="Niveau">
              <select value={cfg.niveau||"Grand public"} onChange={e=>setCfg((x:any)=>({...x,niveau:e.target.value}))} style={{background:"#1a1625",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,fontFamily:SA,outline:"none"}}>
                {["Maternelle","CP-CE1","CE2-CM","Collège","Lycée","Adultes","Grand public","Professionnel"].map(o=><option key={o} value={o}>{o}</option>)}
              </select>
            </Fld>
          </div>

          <Fld label="Type de document">
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:2}}>
              {TYPES_DOC.map(t=>(
                <button key={t.id} onClick={()=>setCfg((x:any)=>({...x,type:t.id}))}
                  style={{padding:"6px 11px",borderRadius:10,border:`2px solid ${cfg.type===t.id?B.gold:B.border}`,background:cfg.type===t.id?`${B.gold}15`:"transparent",color:cfg.type===t.id?B.gold:B.muted,cursor:"pointer",fontSize:11,fontWeight:cfg.type===t.id?700:400,fontFamily:SA}}>
                  {t.ico} {t.label}
                </button>
              ))}
            </div>
          </Fld>

          <Fld label="Format">
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
              {FORMATS.map(fo=>(
                <button key={fo.id} onClick={()=>setCfg((x:any)=>({...x,format:fo.id}))}
                  style={{padding:"8px 10px",borderRadius:10,border:`2px solid ${cfg.format===fo.id?B.violetL:B.border}`,background:cfg.format===fo.id?`${B.violetL}15`:"transparent",color:cfg.format===fo.id?B.violetL:B.muted,cursor:"pointer",fontSize:10,textAlign:"left" as const,fontFamily:SA}}>
                  <div style={{fontWeight:700}}>{fo.label}</div>
                  <div style={{fontSize:9,marginTop:2,opacity:0.7}}>{fo.dim}</div>
                </button>
              ))}
            </div>
          </Fld>

          <Fld label="Pôle / Identité visuelle">
            <div style={{display:"flex",gap:5,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
              {POLES.map(p=>(
                <button key={p.id} onClick={()=>setCfg((x:any)=>({...x,pole:p.id}))}
                  style={{padding:"5px 12px",borderRadius:99,border:`1px solid ${cfg.pole===p.id?p.couleur:B.border}`,background:cfg.pole===p.id?`${p.couleur}20`:"transparent",color:cfg.pole===p.id?p.couleur:B.muted,cursor:"pointer",fontSize:10,fontWeight:cfg.pole===p.id?700:400,whiteSpace:"nowrap" as const,fontFamily:SA}}>
                  {p.ico} {p.nom.replace("Bella\'","").replace("Vilo\'","Vilo ")}
                </button>
              ))}
            </div>
          </Fld>

          <Fld label="Nombre de pages">
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[8,12,16,20,24,32,48,64].map(n=>(
                <button key={n} onClick={()=>setCfg((x:any)=>({...x,nb_pages:n}))}
                  style={{padding:"5px 12px",borderRadius:8,border:`1px solid ${cfg.nb_pages===n?B.gold:B.border}`,background:cfg.nb_pages===n?`${B.gold}15`:"transparent",color:cfg.nb_pages===n?B.gold:B.muted,cursor:"pointer",fontSize:11,fontFamily:SA}}>
                  {n}p
                </button>
              ))}
            </div>
          </Fld>

          <Fld label="Sections">
            <div style={{display:"flex",flexDirection:"column",gap:5,marginTop:2}}>
              {SECTIONS.map(s=>(
                <label key={s.id} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
                  <input type="checkbox" checked={cfg.sections?.includes(s.id)||false} onChange={()=>togSec(s.id)} disabled={s.ob} style={{accentColor:B.gold,width:15,height:15}}/>
                  <span style={{fontSize:11,color:s.ob?B.cream:B.muted}}>{s.label}{s.ob&&<span style={{fontSize:9,color:B.gold,marginLeft:5}}>obligatoire</span>}</span>
                </label>
              ))}
            </div>
          </Fld>

          <Btn v="gold" full onClick={generer} disabled={!cfg.titre?.trim()||!cfg.theme?.trim()}>✨ Générer la structure →</Btn>
        </div>
      )}

      {etape==="gen"&&(
        <div style={{textAlign:"center" as const,padding:"40px 20px"}}>
          <div style={{fontSize:36,marginBottom:12}}>📖</div>
          <div style={{fontSize:14,fontWeight:700,color:B.cream,fontFamily:FS,marginBottom:6}}>Génération en cours…</div>
          <div style={{fontSize:11,color:B.muted}}>Bellaïa construit la structure de votre document.</div>
        </div>
      )}

      {etape==="apercu"&&contenu&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:`${B.gold}08`,border:`1px solid ${B.gold}25`,borderRadius:12,padding:"10px 14px"}}>
            <div style={{fontSize:11,fontWeight:700,color:B.gold}}>✅ Structure générée — BROUILLON</div>
            <div style={{fontSize:10,color:B.muted,marginTop:2}}>Relisez. Validez pour enregistrer dans vos projets éditoriaux.</div>
          </div>
          <div style={{background:"rgba(255,255,255,0.04)",border:`1px solid ${B.border}`,borderRadius:14,padding:"16px 14px",maxHeight:400,overflowY:"auto"}}>
            <div style={{fontSize:11,color:B.cream,lineHeight:1.8,whiteSpace:"pre-wrap" as const}}>{contenu}</div>
          </div>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn v="gold" onClick={valider}>✅ Valider et enregistrer</Btn>
            <Btn v="ghost" onClick={exportPDF}>📄 Aperçu PDF</Btn>
            <Btn v="ghost" onClick={()=>{setEtape("config");setContenu(null);}}>↺ Reconfigurer</Btn>
            <Btn v="ghost" onClick={()=>navigator.clipboard?.writeText(contenu||"")}>📋 Copier</Btn>
          </div>
        </div>
      )}

      {etape==="valide"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{textAlign:"center" as const,padding:"30px 20px",background:`${B.success}08`,border:`1px solid ${B.success}30`,borderRadius:16}}>
            <div style={{fontSize:40,marginBottom:10}}>✅</div>
            <div style={{fontSize:16,fontWeight:700,color:B.success,fontFamily:FS,marginBottom:6}}>Projet éditorial créé !</div>
            <div style={{fontSize:11,color:B.muted}}>"{cfg.titre}" enregistré dans vos projets éditoriaux.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn v="gold" onClick={exportPDF} full>📄 Exporter PDF</Btn>
            <Btn v="ghost" onClick={()=>{setEtape("config");setCfg({type:"ebook",format:"A4",pole:"MTP",nb_pages:20,niveau:"Grand public",sections:["couverture","introduction","corps","conclusion"]});setContenu(null);setSauve(false);}}>+ Nouveau</Btn>
          </div>
        </div>
      )}
    </div>
  );
}

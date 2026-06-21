"use client";
// ═══════════════════════════════════════════════════════════
// BELLA'FOOD — Module complet fondatrice
// Stocks MP · Recettes · Calculs · Allergènes · Production · Liste achats · Dashboard
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { sbSelect, sbInsert, sbUpdate, sbDelete } from "../shared/supabaseHelpers";
import { calculerRecette, genererListeAchats, calculerEvenementFood } from "./calculs";
import type { Recette, Ingredient } from "./calculs";
import { CATEGORIES_MP, ALLERGENES, PRODUITS_FINIS, MP_INITIALES } from "./data";

// ── UI helpers
const B = {
  deep:"#0d0b12",card:"rgba(255,255,255,0.04)",border:"rgba(255,255,255,0.08)",
  cream:"#e8e3d5",muted:"rgba(255,255,255,0.4)",gold:"#c9a84c",
  violet:"#7c3aed",violetL:"#a78bfa",success:"#4ade80",danger:"#ef4444",warning:"#f59e0b",
};
const SA="Inter,system-ui,sans-serif"; const FS="'Cormorant Garamond',Georgia,serif";

const Card=({children,style={}}:any)=>(
  <div style={{background:B.card,border:`1px solid ${B.border}`,borderRadius:14,padding:"12px 14px",...style}}>{children}</div>
);
const Btn=({children,onClick,v="primary",sm=false,disabled=false,full=false}:any)=>{
  const bgs:any={primary:`linear-gradient(135deg,${B.violet},#9333ea)`,gold:`linear-gradient(135deg,${B.gold},#b8860b)`,ghost:"rgba(255,255,255,0.07)",danger:"rgba(239,68,68,0.15)",green:"rgba(74,222,128,0.15)"};
  return <button onClick={onClick} disabled={disabled} style={{background:bgs[v],border:`1px solid ${v==="ghost"?B.border:v==="danger"?"rgba(239,68,68,0.4)":v==="green"?"rgba(74,222,128,0.4)":"transparent"}`,borderRadius:10,padding:sm?"4px 10px":"9px 16px",color:v==="danger"?"#ef4444":v==="green"?"#4ade80":"#fff",cursor:disabled?"not-allowed":"pointer",fontSize:sm?11:13,fontWeight:700,fontFamily:SA,opacity:disabled?0.5:1,width:full?"100%":undefined}}>{children}</button>;
};
const Fld=({label,children}:any)=>(
  <div style={{display:"flex",flexDirection:"column",gap:4}}>
    <div style={{fontSize:10,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>{label}</div>
    {children}
  </div>
);
const Inp=({value,onChange,placeholder="",type="text",rows=1}:any)=>
  rows>1
    ?<textarea value={value||""} onChange={onChange} placeholder={placeholder} rows={rows} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,outline:"none",fontFamily:SA,resize:"vertical",width:"100%",boxSizing:"border-box"}}/>
    :<input value={value||""} onChange={onChange} placeholder={placeholder} type={type} style={{background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,outline:"none",fontFamily:SA,width:"100%",boxSizing:"border-box"}}/>;
const Sel=({value,onChange,options}:any)=>(
  <select value={value||""} onChange={onChange} style={{background:"#1a1625",border:`1px solid ${B.border}`,borderRadius:10,padding:"9px 12px",color:B.cream,fontSize:12,fontFamily:SA,width:"100%",outline:"none"}}>
    {options.map((o:any)=>typeof o==="string"?<option key={o} value={o}>{o}</option>:<option key={o.id} value={o.id}>{o.label}</option>)}
  </select>
);
const Modal=({title,onClose,children}:any)=>(
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:250,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
    <div style={{background:"#13111a",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,maxHeight:"92vh",overflowY:"auto",padding:"20px 16px 36px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
        <div style={{fontSize:15,fontWeight:800,color:B.cream,fontFamily:FS}}>{title}</div>
        <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"5px 11px",color:B.cream,cursor:"pointer",fontSize:13}}>✕</button>
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:12}}>{children}</div>
    </div>
  </div>
);
const Bdg=({label,color}:any)=>(
  <span style={{fontSize:9,padding:"2px 8px",borderRadius:20,background:`${color}20`,color,fontWeight:700}}>{label}</span>
);
const today=()=>new Date().toISOString().split("T")[0];

// ── Onglets
const ONGS=[
  {id:"dash",         l:"📊 Dashboard"},
  {id:"stocks",       l:"📦 Stocks MP"},
  {id:"recettes",     l:"🍽 Recettes"},
  {id:"production",   l:"⚙️ Production"},
  {id:"achats",       l:"🛒 Liste achats"},
  {id:"allergenes",   l:"⚠️ Allergènes"},
  {id:"evenement",    l:"✨ Événement"},
];

export default function FoodF({user}:{user:any}){
  const [ong,setOng]=useState("dash");
  const [stocks,setStocks]=useState<any[]>([]);
  const [recettes,setRecettes]=useState<Recette[]>([]);
  const [loading,setLoading]=useState(true);
  const [modal,setModal]=useState<string|null>(null);
  const [form,setForm]=useState<any>({});
  const [recetteActive,setRecetteActive]=useState<Recette|null>(null);
  const [nbPortions,setNbPortions]=useState(10);
  const [filtrecat,setFiltrecat]=useState("tous");
  const f=(k:string)=>(v:any)=>setForm((x:any)=>({...x,[k]:typeof v==="string"?v:v?.target?.value??v}));

  const reload=useCallback(async()=>{
    setLoading(true);
    try{
      const [st,rec]=await Promise.all([
        sbSelect("stocks",{filters:{univers:"eq.FOOD"},order:"categorie.asc",limit:200}),
        sbSelect("erp_projets",{filters:{univers:"eq.FOOD",source:"eq.recette"},order:"titre.asc",limit:100}).catch(()=>[]),
      ]);
      setStocks(st||[]);
      // Les recettes sont stockées dans erp_projets avec source="recette" et les données dans notes JSON
      const recs=(rec||[]).map((r:any)=>{
        try{ return {...JSON.parse(r.notes||"{}"),id:r.id,nom:r.titre,statut:r.statut==="validé"?"active":"brouillon"}; }
        catch{ return {id:r.id,nom:r.titre,ingredients:[],portions_ref:4,statut:"brouillon",categorie:"Plats",temps_prep_min:30,temps_cuisson_min:30}; }
      });
      setRecettes(recs);
    }catch(e){console.error(e);}
    setLoading(false);
  },[]);

  useEffect(()=>{reload();},[reload]);

  // Initialiser stocks MP si vide
  const initialiserStocks=async()=>{
    if(stocks.length>0){alert("Des stocks existent déjà.");return;}
    for(const mp of MP_INITIALES){
      await sbInsert("stocks",{nom:mp.nom,categorie:mp.cat,univers:"FOOD",unite:mp.unite,quantite:0,quantite_min:mp.seuil,statut:"actif",notes:JSON.stringify({rendement_portions:mp.rendement_portions})});
    }
    reload();
  };

  // Sauvegarder stock MP
  const saveStock=async()=>{
    if(!form.nom?.trim())return;
    const data={nom:form.nom,categorie:form.cat||"Autre",univers:"FOOD",unite:form.unite||"kg",
      quantite:parseFloat(form.quantite)||0,quantite_min:parseFloat(form.seuil)||1,
      prix_achat:parseFloat(form.prix)||0,statut:"actif",notes:form.notes||""};
    if(form._id) await sbUpdate("stocks",form._id,data);
    else await sbInsert("stocks",data);
    setModal(null);setForm({});reload();
  };

  // Sauvegarder recette dans erp_projets (source=recette)
  const saveRecette=async()=>{
    if(!form.nom?.trim())return;
    const recData:any={
      nom:form.nom,categorie:form.categorie||"Plats",
      portions_ref:parseInt(form.portions)||4,
      ingredients:form.ingredients||[],
      consommables:form.consommables||[],
      temps_prep_min:parseInt(form.prep)||30,
      temps_cuisson_min:parseInt(form.cuisson)||30,
      description:form.description||"",notes_internes:form.notes_internes||"",
      statut:"brouillon",
    };
    const proj={titre:form.nom,univers:"FOOD",source:"recette",statut:"en_cours",notes:JSON.stringify(recData),fondatrice_id:user?.id};
    if(form._id) await sbUpdate("erp_projets",form._id,{...proj,updated_at:new Date().toISOString()});
    else await sbInsert("erp_projets",proj);
    setModal(null);setForm({});reload();
  };

  // Déduire stock après production
  const validerProduction=async(recette:Recette,nbPort:number)=>{
    if(!confirm(`Valider la production de ${nbPort} portions de "${recette.nom}" ? Les stocks seront déduits.`))return;
    const ratio=nbPort/recette.portions_ref;
    for(const ing of recette.ingredients){
      const stock=stocks.find(s=>s.nom===ing.mp_nom);
      if(stock){
        const nouveau=Math.max(0,(parseFloat(stock.quantite)||0)-ing.quantite*ratio);
        await sbUpdate("stocks",stock.id,{quantite:parseFloat(nouveau.toFixed(3))});
      }
    }
    alert("✅ Production validée. Stocks mis à jour.");
    reload();
  };

  // Stats
  const stocksAlertes=stocks.filter(s=>parseFloat(s.quantite||0)<=parseFloat(s.quantite_min||1));
  const stocksRupture=stocks.filter(s=>parseFloat(s.quantite||0)===0);
  const valeurStock=stocks.reduce((s,st)=>s+(parseFloat(st.quantite||0)*parseFloat(st.prix_achat||0)),0);

  // Calcul recette active
  const calcul=recetteActive?calculerRecette(recetteActive,nbPortions):null;

  // Liste achats auto
  const genListeAchats=()=>{
    if(!recetteActive)return[];
    const stockMap:Record<string,any>={};
    stocks.forEach(s=>{stockMap[s.nom]={quantite:parseFloat(s.quantite||0),cout_unit:parseFloat(s.prix_achat||0),categorie:s.categorie};});
    return genererListeAchats([{recette:recetteActive,nb_portions:nbPortions}],stockMap);
  };

  const allegenesRecette=(r:Recette)=>{
    const set=new Set<string>();
    r.ingredients.forEach(i=>(i.allergenes||[]).forEach(a=>set.add(a)));
    return Array.from(set);
  };

  return(
    <div style={{display:"flex",flexDirection:"column",gap:12}}>
      {/* Header */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:B.cream,fontFamily:FS}}>🍃 Bella'Food</div>
          <div style={{fontSize:10,color:B.muted}}>Production · Recettes · Stocks · Allergènes · Rentabilité</div>
        </div>
        {stocksAlertes.length>0&&<Bdg label={`⚠ ${stocksAlertes.length} alertes`} color={B.warning}/>}
      </div>

      {/* Onglets */}
      <div style={{display:"flex",gap:5,overflowX:"auto",WebkitOverflowScrolling:"touch",paddingBottom:3}}>
        {ONGS.map(o=>(
          <button key={o.id} onClick={()=>setOng(o.id)}
            style={{padding:"5px 11px",borderRadius:99,border:`1px solid ${ong===o.id?B.gold:B.border}`,background:ong===o.id?`${B.gold}18`:"transparent",color:ong===o.id?B.gold:B.muted,cursor:"pointer",fontSize:10,fontWeight:ong===o.id?700:400,whiteSpace:"nowrap",fontFamily:SA}}>
            {o.l}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {ong==="dash"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {[
              {l:"Références MP",     v:stocks.length,             c:B.violetL},
              {l:"Alertes stock",     v:stocksAlertes.length,      c:stocksAlertes.length>0?B.warning:B.success},
              {l:"Ruptures",          v:stocksRupture.length,      c:stocksRupture.length>0?B.danger:B.success},
              {l:"Recettes",          v:recettes.length,            c:B.gold},
            ].map(k=>(
              <div key={k.l} style={{flex:1,minWidth:70,background:`${k.c}12`,border:`1px solid ${k.c}30`,borderRadius:12,padding:"12px 10px",textAlign:"center"}}>
                <div style={{fontSize:20,fontWeight:700,color:k.c,fontFamily:FS}}>{k.v}</div>
                <div style={{fontSize:9,color:B.muted,marginTop:2}}>{k.l}</div>
              </div>
            ))}
          </div>

          {stocksAlertes.length>0&&(
            <Card style={{borderColor:"rgba(245,158,11,0.3)",background:"rgba(245,158,11,0.05)"}}>
              <div style={{fontSize:11,fontWeight:700,color:B.warning,marginBottom:6}}>⚠ Stocks à réapprovisionner</div>
              {stocksAlertes.slice(0,6).map(s=>(
                <div key={s.id} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:B.cream,marginBottom:3}}>
                  <span>{s.nom}</span>
                  <span style={{color:parseFloat(s.quantite||0)===0?B.danger:B.warning}}>{s.quantite||0} {s.unite} / min {s.quantite_min}</span>
                </div>
              ))}
            </Card>
          )}

          <Card>
            <div style={{fontSize:11,fontWeight:700,color:B.muted,marginBottom:8}}>Actions rapides</div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <Btn v="gold" onClick={()=>{setForm({cat:"Féculents",unite:"kg",quantite:0,seuil:1,prix:0});setModal("stock");}}>+ MP/Stock</Btn>
              <Btn v="primary" onClick={()=>{setForm({categorie:"Plats",portions:4,prep:30,cuisson:30,ingredients:[]});setModal("recette");}}>+ Recette</Btn>
              {stocks.length===0&&<Btn v="ghost" onClick={initialiserStocks}>🚀 Initialiser MP</Btn>}
            </div>
          </Card>

          <Card>
            <div style={{fontSize:11,fontWeight:700,color:B.muted,marginBottom:6}}>Produits Bella'Food</div>
            {Object.entries(PRODUITS_FINIS).map(([cat,items])=>(
              <div key={cat} style={{marginBottom:8}}>
                <div style={{fontSize:10,color:B.violetL,fontWeight:700,marginBottom:3,textTransform:"capitalize"}}>{cat}</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                  {(items as string[]).map(p=><span key={p} style={{fontSize:10,padding:"2px 8px",borderRadius:20,background:"rgba(255,255,255,0.05)",color:B.muted}}>{p}</span>)}
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}

      {/* ══ STOCKS MP ══ */}
      {ong==="stocks"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{stocks.length} références</div>
            <div style={{display:"flex",gap:6}}>
              {stocks.length===0&&<Btn sm v="ghost" onClick={initialiserStocks}>🚀 Initialiser</Btn>}
              <Btn sm v="gold" onClick={()=>{setForm({cat:"Féculents",unite:"kg",quantite:0,seuil:1,prix:0});setModal("stock");}}>+ Ajouter</Btn>
            </div>
          </div>
          {/* Filtre catégorie */}
          <div style={{display:"flex",gap:5,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {["tous",...CATEGORIES_MP].map(c=>(
              <button key={c} onClick={()=>setFiltrecat(c)}
                style={{padding:"4px 10px",borderRadius:99,border:`1px solid ${filtrecat===c?B.gold:B.border}`,background:filtrecat===c?`${B.gold}18`:"transparent",color:filtrecat===c?B.gold:B.muted,cursor:"pointer",fontSize:9,fontWeight:filtrecat===c?700:400,whiteSpace:"nowrap",fontFamily:SA}}>
                {c}
              </button>
            ))}
          </div>
          {loading?<div style={{textAlign:"center",color:B.muted,padding:20}}>Chargement…</div>:(
            stocks.filter(s=>filtrecat==="tous"||s.categorie===filtrecat).map(s=>{
              const q=parseFloat(s.quantite||0),min=parseFloat(s.quantite_min||1);
              const alert=q<=min,rupture=q===0;
              return(
                <Card key={s.id} style={{borderLeft:`3px solid ${rupture?B.danger:alert?B.warning:B.violetL}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{s.nom}</div>
                      <div style={{fontSize:10,color:B.muted}}>{s.categorie}</div>
                      {s.prix_achat>0&&<div style={{fontSize:10,color:B.gold,marginTop:2}}>{s.prix_achat}€/{s.unite}</div>}
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      <div style={{fontSize:18,fontWeight:700,color:rupture?B.danger:alert?B.warning:B.success,fontFamily:FS}}>{q}</div>
                      <div style={{fontSize:9,color:B.muted}}>{s.unite} · min {min}</div>
                      <div style={{display:"flex",gap:4,marginTop:5,justifyContent:"flex-end"}}>
                        <Btn sm v="ghost" onClick={()=>{setForm({...s,_id:s.id,cat:s.categorie,prix:s.prix_achat,seuil:s.quantite_min});setModal("stock");}}>✏</Btn>
                        <Btn sm v="danger" onClick={()=>{if(confirm("Supprimer ?"))sbDelete("stocks",s.id).then(reload);}}>✕</Btn>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      )}

      {/* ══ RECETTES ══ */}
      {ong==="recettes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{recettes.length} recette{recettes.length>1?"s":""}</div>
            <Btn sm v="gold" onClick={()=>{setForm({categorie:"Plats",portions:4,prep:30,cuisson:30,ingredients:[]});setModal("recette");}}>+ Recette</Btn>
          </div>
          {recettes.length===0&&(
            <Card>
              <div style={{textAlign:"center",color:B.muted,padding:16,fontSize:12}}>
                Aucune recette. Créez votre première fiche technique.
              </div>
            </Card>
          )}
          {recettes.map(r=>(
            <Card key={r.id} style={{cursor:"pointer"}} onClick={()=>{setRecetteActive(r);setNbPortions(r.portions_ref);setOng("production");}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:700,color:B.cream}}>{r.nom}</div>
                  <div style={{fontSize:10,color:B.muted}}>{r.categorie} · {r.portions_ref} portions réf.</div>
                  <div style={{fontSize:10,color:B.muted,marginTop:2}}>⏱ Prep {r.temps_prep_min}min · Cuisson {r.temps_cuisson_min}min</div>
                  {r.ingredients.length>0&&<div style={{fontSize:10,color:B.violetL,marginTop:3}}>{r.ingredients.length} ingrédient{r.ingredients.length>1?"s":""}</div>}
                  {allegenesRecette(r).length>0&&(
                    <div style={{fontSize:9,color:B.warning,marginTop:3}}>⚠ Allergènes : {allegenesRecette(r).join(", ")}</div>
                  )}
                </div>
                <div style={{display:"flex",gap:4,flexShrink:0,marginLeft:8}}>
                  <Bdg label={r.statut} color={r.statut==="active"?B.success:B.muted}/>
                </div>
              </div>
              <div style={{marginTop:8,fontSize:10,color:B.muted}}>→ Cliquer pour calculer et produire</div>
            </Card>
          ))}
        </div>
      )}

      {/* ══ PRODUCTION ══ */}
      {ong==="production"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {!recetteActive?(
            <Card>
              <div style={{textAlign:"center",color:B.muted,padding:16}}>
                <div style={{fontSize:24,marginBottom:8}}>🍽</div>
                Sélectionnez une recette dans l'onglet "Recettes" pour lancer le calcul de production.
              </div>
            </Card>
          ):(
            <>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:B.cream}}>{recetteActive.nom}</div>
                  <div style={{fontSize:10,color:B.muted}}>{recetteActive.categorie}</div>
                </div>
                <button onClick={()=>setRecetteActive(null)} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,padding:"5px 11px",color:B.muted,cursor:"pointer",fontSize:11,fontFamily:SA}}>Changer →</button>
              </div>

              {/* Nombre de portions */}
              <Fld label="Nombre de portions à produire">
                <div style={{display:"flex",gap:8,alignItems:"center"}}>
                  <button onClick={()=>setNbPortions(Math.max(1,nbPortions-1))} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${B.border}`,borderRadius:8,padding:"6px 12px",color:B.cream,cursor:"pointer",fontSize:16}}>−</button>
                  <input type="number" value={nbPortions} onChange={e=>setNbPortions(Math.max(1,parseInt(e.target.value)||1))}
                    style={{flex:1,background:"rgba(255,255,255,0.05)",border:`1px solid ${B.border}`,borderRadius:10,padding:"8px 12px",color:B.cream,fontSize:18,fontWeight:700,fontFamily:FS,textAlign:"center",outline:"none"}}/>
                  <button onClick={()=>setNbPortions(nbPortions+1)} style={{background:"rgba(255,255,255,0.07)",border:`1px solid ${B.border}`,borderRadius:8,padding:"6px 12px",color:B.cream,cursor:"pointer",fontSize:16}}>+</button>
                </div>
              </Fld>

              {calcul&&(<>
                {/* Résultats calcul */}
                <Card style={{background:`${B.gold}08`,borderColor:`${B.gold}30`}}>
                  <div style={{fontSize:11,fontWeight:700,color:B.gold,marginBottom:8}}>📊 Calcul automatique</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>
                    {[
                      {l:"Coût MP",           v:`${calcul.cout_mp_total}€`,          c:B.danger},
                      {l:"Coût consommables", v:`${calcul.cout_conso_total}€`,        c:B.warning},
                      {l:"Coût total",        v:`${calcul.cout_revient_total}€`,      c:B.muted},
                      {l:"Coût/portion",      v:`${calcul.cout_par_portion}€`,        c:B.cream},
                      {l:"Prix conseillé",    v:`${calcul.prix_conseille}€`,          c:B.gold},
                      {l:"Prix premium",      v:`${calcul.prix_premium}€`,            c:B.violetL},
                      {l:"Bénéfice/portion",  v:`${calcul.benefice_par_portion}€`,   c:B.success},
                      {l:"Bénéfice total",    v:`${calcul.benefice_total}€`,          c:B.success},
                    ].map(k=>(
                      <div key={k.l} style={{background:"rgba(255,255,255,0.04)",borderRadius:8,padding:"8px 10px"}}>
                        <div style={{fontSize:9,color:B.muted}}>{k.l}</div>
                        <div style={{fontSize:14,fontWeight:700,color:k.c,fontFamily:FS}}>{k.v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:8,display:"flex",justifyContent:"space-between",fontSize:12}}>
                    <span style={{color:B.muted}}>Taux de marge</span>
                    <span style={{color:calcul.taux_marge>=30?B.success:B.warning,fontWeight:700}}>{calcul.taux_marge}%</span>
                  </div>
                </Card>

                {/* Allergènes */}
                {calcul.allergenes_presents.length>0&&(
                  <Card style={{background:"rgba(245,158,11,0.06)",borderColor:"rgba(245,158,11,0.3)"}}>
                    <div style={{fontSize:11,fontWeight:700,color:B.warning,marginBottom:6}}>⚠ Allergènes présents</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                      {calcul.allergenes_presents.map(a=>{
                        const alg=ALLERGENES.find(x=>x.id===a);
                        return <span key={a} style={{fontSize:10,padding:"3px 8px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:B.warning}}>{alg?.ico} {alg?.label||a}</span>;
                      })}
                    </div>
                  </Card>
                )}

                {/* Bouton valider production */}
                <Btn v="gold" full onClick={()=>validerProduction(recetteActive,nbPortions)}>
                  ✅ Valider production — déduire stocks
                </Btn>
              </>)}

              {recetteActive.ingredients.length===0&&(
                <Card style={{borderColor:`${B.warning}40`}}>
                  <div style={{fontSize:11,color:B.warning}}>⚠ Cette recette n'a pas encore d'ingrédients. Éditez-la pour ajouter les matières premières et obtenir les calculs.</div>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ LISTE ACHATS ══ */}
      {ong==="achats"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:B.cream}}>Liste d'achats</div>
          {!recetteActive?(
            <Card>
              <div style={{textAlign:"center",color:B.muted,padding:16,fontSize:12}}>
                Sélectionnez une recette dans "Production" pour générer la liste d'achats automatique.
              </div>
            </Card>
          ):(
            <>
              <div style={{fontSize:11,color:B.muted}}>Pour : <strong style={{color:B.cream}}>{recetteActive.nom}</strong> · {nbPortions} portions</div>
              {genListeAchats().map((l,i)=>(
                <Card key={i} style={{borderLeft:`3px solid ${l.urgent?B.danger:l.a_acheter>0?B.warning:B.success}`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600,color:B.cream}}>{l.nom}</div>
                      <div style={{fontSize:10,color:B.muted}}>Besoin : {l.besoin} {l.unite} · Stock : {l.stock_dispo} {l.unite}</div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0,marginLeft:10}}>
                      {l.a_acheter>0?(
                        <div style={{fontSize:14,fontWeight:700,color:l.urgent?B.danger:B.warning,fontFamily:FS}}>+{l.a_acheter} {l.unite}</div>
                      ):(
                        <div style={{fontSize:11,color:B.success,fontWeight:700}}>✅ OK</div>
                      )}
                      {l.cout_estime>0&&<div style={{fontSize:10,color:B.muted}}>≈ {l.cout_estime}€</div>}
                    </div>
                  </div>
                </Card>
              ))}
              <Card style={{background:`${B.gold}08`}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13}}>
                  <span style={{color:B.muted}}>Coût total estimé</span>
                  <span style={{color:B.gold,fontWeight:700}}>
                    {genListeAchats().reduce((s,l)=>s+l.cout_estime,0).toFixed(2)}€
                  </span>
                </div>
              </Card>
            </>
          )}

          {/* Réapprovisionnement général */}
          <div style={{fontSize:11,fontWeight:700,color:B.muted,marginTop:6,textTransform:"uppercase",letterSpacing:"0.05em"}}>Stocks en alerte</div>
          {stocksAlertes.length===0
            ?<div style={{fontSize:11,color:B.success,padding:"8px 0"}}>✅ Tous les stocks sont suffisants.</div>
            :stocksAlertes.map(s=>(
              <Card key={s.id} style={{borderLeft:`3px solid ${parseFloat(s.quantite||0)===0?B.danger:B.warning}`}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11}}>
                  <span style={{color:B.cream}}>{s.nom} <span style={{color:B.muted}}>({s.categorie})</span></span>
                  <span style={{color:parseFloat(s.quantite||0)===0?B.danger:B.warning,fontWeight:700}}>
                    {parseFloat(s.quantite||0)===0?"RUPTURE":`${s.quantite} ${s.unite}`}
                  </span>
                </div>
              </Card>
            ))
          }
        </div>
      )}

      {/* ══ ALLERGÈNES ══ */}
      {ong==="allergenes"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:B.cream}}>Gestion des allergènes</div>
          <Card>
            <div style={{fontSize:11,fontWeight:700,color:B.muted,marginBottom:8}}>14 allergènes majeurs (réglementation UE)</div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {ALLERGENES.map(a=>(
                <div key={a.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:`1px solid ${B.border}`}}>
                  <span style={{fontSize:16}}>{a.ico}</span>
                  <span style={{fontSize:12,color:B.cream,flex:1}}>{a.label}</span>
                </div>
              ))}
            </div>
          </Card>
          {recettes.length>0&&(
            <>
              <div style={{fontSize:11,fontWeight:700,color:B.muted,textTransform:"uppercase",letterSpacing:"0.05em"}}>Récapitulatif par recette</div>
              {recettes.map(r=>{
                const algs=allegenesRecette(r);
                return(
                  <Card key={r.id}>
                    <div style={{fontSize:12,fontWeight:700,color:B.cream,marginBottom:5}}>{r.nom}</div>
                    {algs.length===0
                      ?<div style={{fontSize:10,color:B.success}}>✅ Aucun allergène identifié</div>
                      :<div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                        {algs.map(a=>{const alg=ALLERGENES.find(x=>x.id===a);return <span key={a} style={{fontSize:10,padding:"2px 7px",borderRadius:20,background:"rgba(245,158,11,0.15)",color:B.warning}}>{alg?.ico} {alg?.label||a}</span>;})}
                      </div>
                    }
                  </Card>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ ÉVÉNEMENT FOOD ══ */}
      {ong==="evenement"&&(
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{fontSize:13,fontWeight:700,color:B.cream}}>Calcul pour un événement</div>
          <div style={{fontSize:11,color:B.muted}}>Intégration Bella'Even's — calculez automatiquement les besoins alimentaires.</div>

          <Card>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <Fld label="Nombre de convives *">
                <Inp type="number" value={form.convives} onChange={f("convives")} placeholder="Ex: 50"/>
              </Fld>
              <Fld label="Prix par tête (€)">
                <Inp type="number" value={form.prix_tete} onChange={f("prix_tete")} placeholder="Ex: 15"/>
              </Fld>
              <div>
                <div style={{fontSize:10,fontWeight:700,color:B.muted,marginBottom:6}}>Options menu</div>
                {[
                  {k:"avec_jus",     l:"Jus / Boissons"},
                  {k:"avec_dessert", l:"Desserts / Salades de fruits"},
                  {k:"sans_porc",    l:"Menus sans porc disponibles"},
                  {k:"vegetarien",   l:"Menus végétariens"},
                  {k:"menu_enfant",  l:"Menus enfants"},
                ].map(opt=>(
                  <label key={opt.k} style={{display:"flex",alignItems:"center",gap:8,marginBottom:6,cursor:"pointer"}}>
                    <input type="checkbox" checked={!!form[opt.k]} onChange={e=>setForm((x:any)=>({...x,[opt.k]:e.target.checked}))}
                      style={{accentColor:B.gold,width:16,height:16}}/>
                    <span style={{fontSize:12,color:B.cream}}>{opt.l}</span>
                  </label>
                ))}
              </div>
              <Btn v="gold" full onClick={()=>{
                if(!form.convives){alert("Entrez le nombre de convives.");return;}
                const res=calculerEvenementFood(
                  parseInt(form.convives),
                  {plats:["principal"],avec_jus:!!form.avec_jus,avec_dessert:!!form.avec_dessert},
                  parseFloat(form.prix_tete)||0
                );
                setForm((x:any)=>({...x,_calcul:res}));
              }}>Calculer les besoins →</Btn>
            </div>
          </Card>

          {form._calcul&&(
            <Card style={{background:`${B.gold}08`,borderColor:`${B.gold}30`}}>
              <div style={{fontSize:12,fontWeight:700,color:B.gold,marginBottom:10}}>📊 Résultat pour {form.convives} convives</div>
              {[
                {l:"Portions plats",       v:`${form._calcul.portions_plat} portions`},
                {l:"Bouteilles jus",       v:`${form._calcul.bouteilles_jus} bouteilles`},
                {l:"Portions desserts",    v:`${form._calcul.portions_dessert} portions`},
                {l:"Coût de revient",      v:`≈ ${form._calcul.cout_estime}€`},
                ...(form._calcul.ca_estime>0?[
                  {l:"CA estimé",          v:`${form._calcul.ca_estime}€`},
                  {l:"Marge estimée",      v:`${form._calcul.marge_estime}%`},
                ]:[]),
              ].map(k=>(
                <div key={k.l} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:`1px solid ${B.border}`,fontSize:12}}>
                  <span style={{color:B.muted}}>{k.l}</span>
                  <span style={{color:B.cream,fontWeight:600}}>{k.v}</span>
                </div>
              ))}
              <div style={{marginTop:10,fontSize:10,color:B.muted}}>
                💡 Ces estimations sont basées sur les rendements de référence. Affinez en créant des recettes détaillées.
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Modal stock MP */}
      {modal==="stock"&&(
        <Modal title={form._id?"Modifier stock":"Nouveau stock MP"} onClose={()=>{setModal(null);setForm({});}}>
          <Fld label="Nom *"><Inp value={form.nom} onChange={f("nom")} placeholder="Ex: Riz blanc"/></Fld>
          <Fld label="Catégorie"><Sel value={form.cat||"Féculents"} onChange={f("cat")} options={CATEGORIES_MP}/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
            <Fld label="Quantité"><Inp type="number" value={form.quantite} onChange={f("quantite")} placeholder="0"/></Fld>
            <Fld label="Unité"><Inp value={form.unite} onChange={f("unite")} placeholder="kg"/></Fld>
            <Fld label="Seuil min"><Inp type="number" value={form.seuil} onChange={f("seuil")} placeholder="1"/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            <Fld label="Prix achat €"><Inp type="number" value={form.prix} onChange={f("prix")} placeholder="0"/></Fld>
            <Fld label="Péremption"><Inp type="date" value={form.peremption} onChange={f("peremption")}/></Fld>
          </div>
          <Fld label="Fournisseur"><Inp value={form.fournisseur} onChange={f("fournisseur")} placeholder="Nom du fournisseur"/></Fld>
          <div style={{display:"flex",gap:8}}>
            <Btn v="gold" onClick={saveStock} full>Enregistrer</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}

      {/* Modal recette */}
      {modal==="recette"&&(
        <Modal title={form._id?"Modifier recette":"Nouvelle fiche technique"} onClose={()=>{setModal(null);setForm({});}}>
          <Fld label="Nom du plat *"><Inp value={form.nom} onChange={f("nom")} placeholder="Ex: Poulet boucané"/></Fld>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Catégorie">
              <Sel value={form.categorie||"Plats"} onChange={f("categorie")} options={["Plats","Accompagnements","Salades","Jus","Desserts","Autre"]}/>
            </Fld>
            <Fld label="Portions référence"><Inp type="number" value={form.portions} onChange={f("portions")} placeholder="4"/></Fld>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
            <Fld label="Prep (min)"><Inp type="number" value={form.prep} onChange={f("prep")} placeholder="30"/></Fld>
            <Fld label="Cuisson (min)"><Inp type="number" value={form.cuisson} onChange={f("cuisson")} placeholder="30"/></Fld>
          </div>
          <Fld label="Description"><Inp value={form.description} onChange={f("description")} placeholder="Description du plat…" rows={2}/></Fld>
          <Fld label="Notes internes"><Inp value={form.notes_internes} onChange={f("notes_internes")} placeholder="Notes de production…" rows={2}/></Fld>
          <div style={{background:"rgba(124,58,237,0.08)",border:`1px solid ${B.violetL}30`,borderRadius:10,padding:"10px 13px"}}>
            <div style={{fontSize:11,color:B.violetL,fontWeight:700,marginBottom:4}}>ℹ Ingrédients</div>
            <div style={{fontSize:11,color:B.muted}}>Après création, éditez la recette pour ajouter les ingrédients avec quantités et allergènes depuis les stocks.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn v="gold" onClick={saveRecette} full>Créer la fiche</Btn>
            <Btn v="ghost" onClick={()=>{setModal(null);setForm({});}}>Annuler</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

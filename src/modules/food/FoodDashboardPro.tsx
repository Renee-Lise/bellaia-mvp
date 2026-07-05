// ═══════════════════════════════════════════════════════════
// FoodDashboardPro — Dashboard avancé Bella'Food Partie III
// CA, coûts, marges, productions, filtres temporels
// src/modules/food/FoodDashboardPro.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import {
  FOOD_COLORS as FC, FOOD_RECETTES_INIT,
  FOOD_STOCK_INIT, FOOD_CONSOMMABLES_INIT,
} from "./foodConsts";
import { genererAlertesStock, fmtPrix, getAlerteStock } from "./foodUtils";
import type { CommandeFood } from "./foodTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";

type Periode = "today" | "week" | "month" | "year";

// Données simulées (remplacer par Supabase en production)
const DEMO_COMMANDES: CommandeFood[] = [
  {id:"c1",reference:"FC001",client:"Marie L.",tel:"",dateCommande:"2026-07-01",dateLivraison:"2026-07-05",produit:"Layer Cake 3 étages",nbParts:12,saveur:"Chocolat",theme:"Anniversaire",statut:"livre",prixCalcule:65,acompte:20,solde:45},
  {id:"c2",reference:"FC002",client:"Jean T.",tel:"",dateCommande:"2026-07-02",dateLivraison:"2026-07-06",produit:"Bento Cake x4",nbParts:4,statut:"pret",prixCalcule:100,acompte:30,solde:70},
  {id:"c3",reference:"FC003",client:"Anaïs R.",tel:"",dateCommande:"2026-07-03",dateLivraison:"2026-07-08",produit:"Buffet sucré 20 pers",statut:"confirme",prixCalcule:160,acompte:48,solde:112},
  {id:"c4",reference:"FC004",client:"David K.",tel:"",dateCommande:"2026-07-04",dateLivraison:"2026-07-10",produit:"Cupcakes x24",nbParts:24,statut:"en_production",prixCalcule:56,acompte:0,solde:56},
];

export default function FoodDashboardPro({ commandes: commandesExt }: { commandes?: CommandeFood[] }) {
  const [periode, setPeriode] = useState<Periode>("month");
  const commandes = commandesExt?.length ? commandesExt : DEMO_COMMANDES;

  const stats = useMemo(() => {
    const livrees    = commandes.filter(c => c.statut === "livre");
    const enCours    = commandes.filter(c => ["confirme","en_production","pret"].includes(c.statut));
    const ca         = livrees.reduce((s,c) => s + (c.prixCalcule||0), 0);
    const acomptes   = commandes.reduce((s,c) => s + (c.acompte||0), 0);
    // Coût estimé = 40% du CA (ratio moyen)
    const coutMat    = Math.round(ca * 0.35 * 100) / 100;
    const coutEmball = Math.round(ca * 0.08 * 100) / 100;
    const benefice   = Math.round((ca - coutMat - coutEmball) * 100) / 100;
    const margeMoy   = ca > 0 ? Math.round((benefice / ca) * 100) : 0;
    return { ca, acomptes, coutMat, coutEmball, benefice, margeMoy, nbLivrees:livrees.length, nbEnCours:enCours.length };
  }, [commandes]);

  const alertes    = genererAlertesStock(FOOD_STOCK_INIT);
  const nbAlertes  = alertes.length;

  const produitsMostSold = useMemo(() => {
    const counts: Record<string, number> = {};
    commandes.forEach(c => { counts[c.produit] = (counts[c.produit]||0) + 1; });
    return Object.entries(counts).sort((a,b) => b[1]-a[1]).slice(0,5);
  }, [commandes]);

  const KPIS = [
    {ico:"💰", label:"CA livré",         val:fmtPrix(stats.ca),       col:FC.or},
    {ico:"📈", label:"Marge moyenne",     val:stats.margeMoy+"%",       col:FC.vertL},
    {ico:"🎁", label:"Bénéfice estimé",  val:fmtPrix(stats.benefice), col:FC.vert},
    {ico:"📋", label:"Commandes livrées", val:String(stats.nbLivrees), col:"rgba(255,255,255,0.7)"},
    {ico:"⏳", label:"En production",    val:String(stats.nbEnCours), col:"#a78bfa"},
    {ico:"⚠",  label:"Alertes stock",   val:String(nbAlertes),       col:nbAlertes>0?"#f87171":FC.vertL},
  ];

  const COUTS = [
    {label:"Coût matière",    val:stats.coutMat,    col:"#f87171", pct:35},
    {label:"Coût emballage",  val:stats.coutEmball, col:"#fb923c", pct:8},
    {label:"Bénéfice net",    val:stats.benefice,   col:FC.vertL,  pct:stats.margeMoy},
  ];

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Header */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontFamily:FS, fontSize:16, color:FC.or }}>📊 Dashboard Pro</div>
        <div style={{ display:"flex", gap:4 }}>
          {(["today","week","month","year"] as Periode[]).map(p => (
            <button key={p} onClick={() => setPeriode(p)}
              style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
                fontSize:9, fontWeight:700, fontFamily:SA,
                background:periode===p?FC.vert:"rgba(255,255,255,0.06)",
                color:periode===p?"#fff":"rgba(255,255,255,0.5)" }}>
              {p==="today"?"Auj.":p==="week"?"Sem.":p==="month"?"Mois":"Année"}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
        {KPIS.map(k => (
          <div key={k.label} style={{ background:FC.card, border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 10px", textAlign:"center" }}>
            <div style={{ fontSize:18, marginBottom:3 }}>{k.ico}</div>
            <div style={{ fontSize:16, fontWeight:700, color:k.col, fontFamily:FS }}>{k.val}</div>
            <div style={{ fontSize:9, color:"rgba(255,255,255,0.45)", marginTop:2 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Répartition des coûts */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:12, letterSpacing:1 }}>
          RÉPARTITION (estimation)
        </div>
        {COUTS.map(c => (
          <div key={c.label} style={{ marginBottom:10 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <span style={{ fontSize:11, color:FC.creamD }}>{c.label}</span>
              <span style={{ fontSize:12, fontWeight:700, color:c.col }}>{fmtPrix(c.val)} ({c.pct}%)</span>
            </div>
            <div style={{ background:"rgba(255,255,255,0.07)", borderRadius:99, height:5 }}>
              <div style={{ height:5, borderRadius:99, background:c.col,
                width:`${Math.min(100,c.pct)}%`, transition:"width 0.5s" }}/>
            </div>
          </div>
        ))}
      </div>

      {/* Produits les plus vendus */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>
          PRODUITS LES PLUS DEMANDÉS
        </div>
        {produitsMostSold.map(([nom, count], i) => (
          <div key={nom} style={{ display:"flex", alignItems:"center", gap:10,
            padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ width:20, height:20, borderRadius:"50%",
              background:i===0?FC.or:i===1?"rgba(201,168,76,0.3)":"rgba(255,255,255,0.1)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:10, fontWeight:700, color:"#fff", flexShrink:0 }}>
              {i+1}
            </div>
            <div style={{ flex:1, fontSize:12, color:"#fff" }}>{nom}</div>
            <div style={{ fontSize:12, fontWeight:700, color:FC.or }}>{count} cmd</div>
          </div>
        ))}
      </div>

      {/* Recettes les plus rentables */}
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:14 }}>
        <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>
          RECETTES LES PLUS RENTABLES
        </div>
        {FOOD_RECETTES_INIT
          .filter(r => r.margeEstimee && r.prixConseille)
          .sort((a,b) => ((b.margeEstimee||0)/( b.prixConseille||1)) - ((a.margeEstimee||0)/(a.prixConseille||1)))
          .slice(0,4)
          .map((r,i) => {
            const tx = r.prixConseille ? Math.round((r.margeEstimee||0)/r.prixConseille*100) : 0;
            return (
              <div key={r.id} style={{ display:"flex", justifyContent:"space-between",
                padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize:12, color:"#fff" }}>{r.nom}</div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:12, fontWeight:700, color:FC.vertL }}>{tx}% marge</div>
                  <div style={{ fontSize:9, color:FC.creamD }}>{fmtPrix(r.margeEstimee)} / {fmtPrix(r.prixConseille)}</div>
                </div>
              </div>
            );
          })}
      </div>

      {/* Alertes rapides */}
      {nbAlertes > 0 && (
        <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.25)",
          borderRadius:12, padding:"12px 14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f87171", marginBottom:8 }}>
            ⚠ {nbAlertes} alerte{nbAlertes>1?"s":" "}stock
          </div>
          {alertes.slice(0,3).map(a => (
            <div key={a.id} style={{ fontSize:11, color:"rgba(255,200,200,0.8)",
              padding:"3px 0", borderBottom:"1px solid rgba(248,113,113,0.1)" }}>
              {a.titre}
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <div style={{ fontSize:10, color:"rgba(255,255,255,0.3)", textAlign:"center", fontStyle:"italic" }}>
        Données illustratives — connectez Supabase pour les chiffres en temps réel.
      </div>
    </div>
  );
}

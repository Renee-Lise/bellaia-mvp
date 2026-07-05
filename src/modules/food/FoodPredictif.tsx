// ═══════════════════════════════════════════════════════════
// FoodPredictif — Assistant prédictif Bella'Food Partie IV
// IA locale (sans API externe), prévisions, recommandations
// Architecture préparée pour connexion API future
// src/modules/food/FoodPredictif.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo } from "react";
import {
  FOOD_RECETTES_INIT, FOOD_CATALOGUE, FOOD_STOCK_INIT,
  FOOD_COLORS as FC, FOOD_MATERIEL_INIT, FOOD_CONSOMMABLES_INIT,
} from "./foodConsts";
import { genererAlertesStock, fmtPrix, fmtDuree } from "./foodUtils";
import type { Recommandation, PrevisionAchat } from "./foodTypes";

const SA = "system-ui, sans-serif";

// ── Moteur prédictif local ─────────────────────────────────
// Toutes les analyses se font sur les données locales.
// Architecture prête pour remplacer par appel API IA.

type ModeAnalyse =
  | "prix" | "marge" | "achats" | "recettes_rentables"
  | "production_semaine" | "peremptions" | "avec_stock"
  | "menu_suggestion" | "recommandations";

const MODES: { id: ModeAnalyse; ico: string; question: string }[] = [
  {id:"prix",               ico:"💰", question:"Quel prix proposer ?"},
  {id:"marge",              ico:"📈", question:"Ma marge est-elle correcte ?"},
  {id:"achats",             ico:"🛒", question:"Que dois-je acheter ?"},
  {id:"recettes_rentables", ico:"⭐", question:"Recettes les plus rentables"},
  {id:"production_semaine", ico:"📅", question:"Productions à préparer"},
  {id:"peremptions",        ico:"⏰", question:"Stocks à péremption"},
  {id:"avec_stock",         ico:"🔍", question:"Ce que je peux faire"},
  {id:"menu_suggestion",    ico:"🍽",  question:"Suggérer un menu"},
  {id:"recommandations",    ico:"💡", question:"Recommandations du jour"},
];

// Analyse locale — remplace une IA externe
function analyserLocal(mode: ModeAnalyse, nbPersonnes?: number): React.ReactNode {
  switch (mode) {

    case "prix": {
      const valides = FOOD_RECETTES_INIT.filter(r => r.statut === "validee" && r.prixConseille);
      if (!valides.length) return <p style={{ color:FC.creamD }}>Aucune recette validée avec prix dans la base.</p>;
      const r = valides[Math.floor(Math.random() * valides.length)];
      const cout = (r.coutMatiere || 0) + (r.coutConsommables || 0);
      return (
        <div>
          <p style={{ color:"#fff", fontWeight:700 }}>{r.nom}</p>
          <p style={{ color:FC.creamD, fontSize:12 }}>
            Coût total estimé : <strong style={{ color:"#f87171" }}>{fmtPrix(cout)}</strong><br/>
            Prix conseillé : <strong style={{ color:FC.or }}>{fmtPrix(r.prixConseille)}</strong><br/>
            Marge : <strong style={{ color:"#22c55e" }}>{r.margeEstimee ? fmtPrix(r.margeEstimee) : "—"}</strong><br/>
            Prix premium (+30%) : <strong style={{ color:"#a78bfa" }}>{fmtPrix(r.prixConseille ? Math.round(r.prixConseille * 1.3 * 100)/100 : null)}</strong>
          </p>
          <p style={{ color:"rgba(255,255,255,0.4)", fontSize:10 }}>
            Seuil à ne pas descendre : <strong>{fmtPrix(Math.ceil(cout * 1.1))}</strong> (marge min. 10%)
          </p>
        </div>
      );
    }

    case "marge": {
      const problematiques = FOOD_RECETTES_INIT.filter(r =>
        r.prixConseille && r.coutMatiere &&
        ((r.coutMatiere + (r.coutConsommables||0)) / r.prixConseille) > 0.6
      );
      if (!problematiques.length) return <p style={{ color:"#22c55e" }}>✅ Toutes les marges sont correctes (&gt; 40%).</p>;
      return (
        <div>
          <p style={{ color:"#f87171", fontWeight:700 }}>⚠ {problematiques.length} recette{problematiques.length>1?"s":""} avec marge faible (&lt; 40%) :</p>
          {problematiques.map(r => {
            const cout = (r.coutMatiere||0) + (r.coutConsommables||0);
            const marge = r.prixConseille ? Math.round((1 - cout/r.prixConseille)*100) : 0;
            return (
              <div key={r.id} style={{ marginBottom:8, padding:"6px 10px",
                background:"rgba(248,113,113,0.08)", borderRadius:8 }}>
                <strong style={{ color:"#fff", fontSize:12 }}>{r.nom}</strong>
                <span style={{ color:"#f87171", marginLeft:8, fontSize:11 }}>Marge : {marge}%</span>
                <p style={{ color:FC.creamD, fontSize:11, margin:"3px 0 0" }}>
                  → Prix conseillé minimum : {fmtPrix(Math.ceil(cout * 1.4 * 100)/100)} (marge 40%)
                </p>
              </div>
            );
          })}
        </div>
      );
    }

    case "achats": {
      const alertes = genererAlertesStock(FOOD_STOCK_INIT);
      if (!alertes.length) return <p style={{ color:"#22c55e" }}>✅ Aucun stock en alerte. Pas d'achat urgent.</p>;
      return (
        <div>
          <p style={{ color:FC.or, fontWeight:700 }}>📋 {alertes.length} produit{alertes.length>1?"s à acheter":""} :</p>
          {alertes.map(a => {
            const s = FOOD_STOCK_INIT.find(x => x.id === a.entiteId);
            return (
              <div key={a.id} style={{ display:"flex", justifyContent:"space-between",
                padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <span style={{ fontSize:12, color:"#fff" }}>{a.titre.replace("Stock faible — ","").replace("Rupture — ","")}</span>
                <span style={{ fontSize:11, color:a.niveau==="critique"?"#f87171":"#fb923c", fontWeight:700 }}>
                  {a.niveau === "critique" ? "URGENT" : "À prévoir"}
                </span>
              </div>
            );
          })}
          <p style={{ fontSize:10, color:FC.creamD, marginTop:8 }}>
            Commandez en priorité les produits en rupture, puis les stocks faibles.
          </p>
        </div>
      );
    }

    case "recettes_rentables": {
      const classees = [...FOOD_RECETTES_INIT]
        .filter(r => r.prixConseille && r.coutMatiere)
        .sort((a,b) => {
          const ma = a.prixConseille ? (1 - ((a.coutMatiere||0)+(a.coutConsommables||0))/a.prixConseille) : 0;
          const mb = b.prixConseille ? (1 - ((b.coutMatiere||0)+(b.coutConsommables||0))/b.prixConseille) : 0;
          return mb - ma;
        })
        .slice(0, 5);
      return (
        <div>
          <p style={{ color:FC.or, fontWeight:700 }}>🏆 Top 5 recettes les plus rentables :</p>
          {classees.map((r,i) => {
            const cout  = (r.coutMatiere||0) + (r.coutConsommables||0);
            const marge = r.prixConseille ? Math.round((1 - cout/r.prixConseille)*100) : 0;
            return (
              <div key={r.id} style={{ display:"flex", justifyContent:"space-between",
                padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ display:"flex", gap:8 }}>
                  <span style={{ color:i===0?FC.or:"rgba(255,255,255,0.4)", fontWeight:700 }}>{i+1}.</span>
                  <span style={{ color:"#fff", fontSize:12 }}>{r.nom}</span>
                </div>
                <span style={{ color:"#22c55e", fontWeight:700, fontSize:12 }}>{marge}%</span>
              </div>
            );
          })}
          <p style={{ fontSize:10, color:FC.creamD, marginTop:8 }}>
            Mettez ces recettes en avant dans vos offres et vos menus.
          </p>
        </div>
      );
    }

    case "peremptions": {
      const alertes = genererAlertesStock(FOOD_STOCK_INIT).filter(a => a.niveau === "critique");
      if (!alertes.length) return <p style={{ color:"#22c55e" }}>✅ Aucun stock critique détecté.</p>;
      return (
        <div>
          <p style={{ color:"#f87171", fontWeight:700 }}>⏰ À utiliser ou commander en urgence :</p>
          {alertes.map(a => (
            <div key={a.id} style={{ padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color:"#f87171", fontSize:12 }}>{a.message}</span>
            </div>
          ))}
        </div>
      );
    }

    case "avec_stock": {
      const stockMap: Record<string, number> = {};
      FOOD_STOCK_INIT.forEach(s => { stockMap[s.id] = s.qteRestante; });

      const faisables: typeof FOOD_RECETTES_INIT = [];
      const quasi:     typeof FOOD_RECETTES_INIT = [];

      for (const r of FOOD_RECETTES_INIT) {
        const manquants = r.ingredients.filter(i =>
          i.coutUnitaire && (stockMap[i.id] || 0) < i.quantite
        );
        if (!manquants.length) faisables.push(r);
        else if (manquants.length <= 2) quasi.push(r);
      }

      return (
        <div>
          {faisables.length > 0 && (
            <div>
              <p style={{ color:"#22c55e", fontWeight:700 }}>✅ Faisables maintenant ({faisables.length}) :</p>
              {faisables.slice(0,4).map(r => (
                <div key={r.id} style={{ fontSize:12, color:"#fff", padding:"3px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.05)" }}>{r.nom}</div>
              ))}
            </div>
          )}
          {quasi.length > 0 && (
            <div style={{ marginTop:10 }}>
              <p style={{ color:FC.or, fontWeight:700 }}>🔶 Faisables avec 1-2 achats ({quasi.length}) :</p>
              {quasi.slice(0,3).map(r => (
                <div key={r.id} style={{ fontSize:12, color:"rgba(255,255,255,0.7)", padding:"3px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.05)" }}>{r.nom}</div>
              ))}
            </div>
          )}
          {faisables.length + quasi.length === 0 && (
            <p style={{ color:"#f87171" }}>Pas assez de stock pour lancer une recette complète. Vérifiez les achats.</p>
          )}
        </div>
      );
    }

    case "menu_suggestion": {
      const nb  = nbPersonnes || 10;
      const plats = FOOD_CATALOGUE.filter(p => ["repas_guyanais","poulet","poisson","plat"].includes(p.categorie) && p.disponible);
      const deserts = FOOD_CATALOGUE.filter(p => ["patisserie","cake","glace"].includes(p.categorie) && p.disponible);
      const boissons = FOOD_CATALOGUE.filter(p => p.categorie === "jus" && p.disponible);
      const pick = <T,>(arr: T[]) => arr.length ? arr[Math.floor(Math.random() * arr.length)] : null;
      const plat   = pick(plats) as typeof FOOD_CATALOGUE[0] | null;
      const dessert = pick(deserts) as typeof FOOD_CATALOGUE[0] | null;
      const boisson = pick(boissons) as typeof FOOD_CATALOGUE[0] | null;
      const totalEst = [plat, dessert, boisson].reduce((s, p) =>
        s + (p?.prix ? p.prix * nb : 0), 0);
      return (
        <div>
          <p style={{ color:FC.or, fontWeight:700 }}>🍽 Menu suggéré pour {nb} personnes :</p>
          {[[plat,"🍽 Plat"],[dessert,"🎂 Dessert"],[boisson,"🧃 Boisson"]].map(([p,label])=> p && (
            <div key={(p as any).id} style={{ display:"flex", justifyContent:"space-between",
              padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color:"#fff", fontSize:12 }}>{label as string} : {(p as any).nom}</span>
              <span style={{ color:FC.or, fontSize:11 }}>
                {(p as any).prix ? fmtPrix((p as any).prix * nb) : "Sur devis"}
              </span>
            </div>
          ))}
          {totalEst > 0 && (
            <p style={{ color:FC.or, fontWeight:700, marginTop:8 }}>
              Estimation totale : {fmtPrix(totalEst)}
            </p>
          )}
        </div>
      );
    }

    case "recommandations": {
      const alertes  = genererAlertesStock(FOOD_STOCK_INIT);
      const items: string[] = [];
      if (alertes.some(a => a.niveau === "critique")) items.push("🚨 Passez une commande de matières premières en urgence.");
      const topRentable = [...FOOD_RECETTES_INIT]
        .filter(r => r.margeEstimee && r.prixConseille)
        .sort((a,b) => (b.margeEstimee||0)-(a.margeEstimee||0))[0];
      if (topRentable) items.push(`⭐ Mettez en avant "${topRentable.nom}" — meilleure marge estimée.`);
      items.push("💡 Pensez à compléter les prix manquants (affichés \"Sur devis\") dans le catalogue.");
      items.push("📋 Vérifiez les devis en attente dans l'onglet Devis.");
      items.push("📦 Faites un inventaire si le dernier date de plus de 2 semaines.");
      return (
        <div>
          <p style={{ color:FC.or, fontWeight:700 }}>💡 Recommandations du jour :</p>
          {items.map((item,i) => (
            <div key={i} style={{ padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)",
              fontSize:12, color:"rgba(255,255,255,0.8)", lineHeight:1.5 }}>
              {item}
            </div>
          ))}
        </div>
      );
    }

    default:
      return <p style={{ color:FC.creamD }}>Sélectionnez une analyse.</p>;
  }
}

export default function FoodPredictif() {
  const [mode,        setMode]        = useState<ModeAnalyse>("recommandations");
  const [nbPersonnes, setNbPersonnes] = useState(10);
  const [afficher,    setAfficher]    = useState(true);

  const resultat = useMemo(() =>
    analyserLocal(mode, nbPersonnes),
  [mode, nbPersonnes]);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      {/* Description */}
      <div style={{ background:"rgba(21,128,61,0.06)", border:`1px solid ${FC.line}`,
        borderRadius:12, padding:"12px 14px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:FC.or, marginBottom:4 }}>
          🤖 Assistant prédictif Bellaïa
        </div>
        <div style={{ fontSize:11, color:FC.creamD, lineHeight:1.6 }}>
          Analyse les données locales pour proposer des insights, prévisions et recommandations.
          Architecture préparée pour connexion IA externe (OpenAI, Anthropic) sur validation.
        </div>
      </div>

      {/* Sélecteur de mode */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:6 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setAfficher(true); }}
            style={{ background:mode===m.id?"rgba(21,128,61,0.2)":"rgba(255,255,255,0.04)",
              border:`1px solid ${mode===m.id?FC.vert:"rgba(255,255,255,0.1)"}`,
              borderRadius:10, padding:"10px 8px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
            <span style={{ fontSize:18 }}>{m.ico}</span>
            <span style={{ fontSize:9, fontWeight:700, fontFamily:SA, textAlign:"center",
              color:mode===m.id?FC.vertL:"rgba(255,255,255,0.5)", lineHeight:1.3 }}>
              {m.question}
            </span>
          </button>
        ))}
      </div>

      {/* Paramètre nb personnes pour le mode menu */}
      {mode === "menu_suggestion" && (
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <label style={{ fontSize:11, color:FC.creamD, whiteSpace:"nowrap" }}>Nb personnes :</label>
          <input type="number" min={1} value={nbPersonnes}
            onChange={e => setNbPersonnes(parseInt(e.target.value)||10)}
            style={{ background:"rgba(255,255,255,0.07)", border:`1px solid ${FC.line}`,
              borderRadius:8, padding:"6px 10px", color:"#fff", fontSize:12,
              fontFamily:SA, outline:"none", width:80 }}/>
          <button onClick={() => setAfficher(true)}
            style={{ background:FC.vert, border:"none", borderRadius:8, padding:"6px 12px",
              color:"#fff", fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:SA }}>
            Relancer
          </button>
        </div>
      )}

      {/* Résultat */}
      {afficher && (
        <div style={{ background:"rgba(21,128,61,0.07)", border:`1px solid ${FC.line}`,
          borderRadius:14, padding:"14px 16px" }}>
          {resultat}
        </div>
      )}

      {/* Note API future */}
      <div style={{ background:"rgba(255,255,255,0.03)", border:"1px dashed rgba(255,255,255,0.1)",
        borderRadius:10, padding:"10px 13px" }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", lineHeight:1.6 }}>
          🔌 <strong style={{ color:"rgba(255,255,255,0.5)" }}>Prochaine étape :</strong> connexion à un modèle IA pour des analyses conversationnelles avancées. Tapez vos questions en langage naturel et recevez des réponses contextualisées depuis votre propre base de données.
        </div>
      </div>
    </div>
  );
}

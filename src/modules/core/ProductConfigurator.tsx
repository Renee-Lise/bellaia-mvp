// ═══════════════════════════════════════════════════════════
// ProductConfigurator — Configurateur intelligent LOT V
// Étapes dynamiques, recalcul temps réel, devis automatique
// src/modules/core/ProductConfigurator.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from "react";
import { BELLAÏA_COLORS as FC } from "./coreDesign";
import { CONFIGURATEUR_STEPS } from "./coreTypes";
import type {
  CatalogueProduit, EtapeConfigurateur, ConfigurationProduit,
  CatalogueOption,
} from "./coreTypes";

const SA = "system-ui, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";

interface Props {
  produit: CatalogueProduit;
  onValider?: (config: ConfigurationProduit) => void;
  onAnnuler?: () => void;
}

export default function ProductConfigurator({ produit, onValider, onAnnuler }: Props) {
  // Étapes selon le slug du produit ou slug générique
  const etapes: EtapeConfigurateur[] = useMemo(() => {
    const slug = (produit.categorieSlug || "").toLowerCase().replace(/\s/g,"_");
    // Chercher le configurateur exact, puis fallback vers le plus proche
    if (CONFIGURATEUR_STEPS[slug])                     return CONFIGURATEUR_STEPS[slug];
    if (slug.includes("cake") || slug.includes("gateau")) return CONFIGURATEUR_STEPS.layer_cake;
    if (slug.includes("deco"))                          return CONFIGURATEUR_STEPS.decoration_evenement;
    // Configurateur générique si aucun match
    return [
      { id:"quantite",   groupe:"quantite",   label:"Quantité / Nombre",    type:"number", obligatoire:true },
      { id:"livraison",  groupe:"livraison",  label:"Livraison ou retrait",  type:"select",
        options:[
          {id:"l_ret",groupe:"livraison",libelle:"Retrait à Sinnamary",supplement:0,deltaTempMin:0,disponible:true,ordre:1},
          {id:"l_liv",groupe:"livraison",libelle:"Livraison (+10€)",   supplement:10,deltaTempMin:0,disponible:true,ordre:2},
        ]},
      { id:"commentaire",groupe:"commentaire",label:"Commentaires",          type:"text" },
    ];
  }, [produit]);

  const [etapeIdx, setEtapeIdx]     = useState(0);
  const [choix, setChoix]           = useState<Record<string, any>>({});

  const etapeActuelle = etapes[etapeIdx];

  // Calcul en temps réel
  const calcul = useMemo(() => {
    let prixTotal    = produit.prix || 0;
    let coutEstime   = produit.coutRevient || 0;
    let tempsTotal   = (produit.tempsPreparation || 0) + (produit.tempsProduction || 0);
    let supplements  = 0;

    for (const etape of etapes) {
      const val = choix[etape.id];
      if (!val || !etape.options) continue;
      const ids: string[] = Array.isArray(val) ? val : [val];
      for (const id of ids) {
        const opt = etape.options.find((o: CatalogueOption) => o.id === id);
        if (opt) {
          supplements += opt.supplement;
          tempsTotal  += opt.deltaTempMin;
          coutEstime  += opt.supplement * 0.4; // ratio coût estimé
        }
      }
    }

    prixTotal += supplements;
    return {
      prixTotal:  Math.round(prixTotal * 100) / 100,
      coutEstime: Math.round(coutEstime * 100) / 100,
      tempsTotal,
      supplements: Math.round(supplements * 100) / 100,
    };
  }, [choix, produit, etapes]);

  const avancement = Math.round((etapeIdx / etapes.length) * 100);

  const handleValeur = useCallback((groupe: string, valeur: any) => {
    setChoix(c => ({ ...c, [groupe]: valeur }));
  }, []);

  const suivant = () => {
    if (etapeActuelle.obligatoire && !choix[etapeActuelle.id]) {
      alert(`Veuillez renseigner : ${etapeActuelle.label}`);
      return;
    }
    if (etapeIdx < etapes.length - 1) setEtapeIdx(i => i + 1);
  };

  const valider = () => {
    const config: ConfigurationProduit = {
      produitId:    produit.id,
      options:      choix,
      prixTotal:    calcul.prixTotal,
      coutEstime:   calcul.coutEstime,
      tempsTotal:   calcul.tempsTotal,
      nbPersonnes:  parseInt(choix["parts"] || choix["quantite"] || "1") || undefined,
      commentaire:  choix["commentaire"] || choix["texte"] || undefined,
    };
    onValider?.(config);
  };

  const fmtDuree = (min: number) => min < 60 ? `${min} min` :
    `${Math.floor(min/60)}h${String(min%60).padStart(2,"0")}`;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:SA }}>
      {/* En-tête produit */}
      <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"14px 16px" }}>
        <div style={{ fontFamily:FS, fontSize:16, color:FC.or, marginBottom:2 }}>{produit.nom}</div>
        {produit.descriptionCourte && (
          <div style={{ fontSize:11, color:FC.creamD, marginBottom:10 }}>{produit.descriptionCourte}</div>
        )}
        {/* Récapitulatif temps réel */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[
            {l:"Prix estimé",   v:calcul.prixTotal.toFixed(2)+"€",   col:FC.or},
            {l:"Coût matière",  v:calcul.coutEstime.toFixed(2)+"€",  col:"#f87171"},
            {l:"Temps estimé",  v:fmtDuree(calcul.tempsTotal),        col:FC.creamD},
          ].map(s => (
            <div key={s.l} style={{ background:"rgba(0,0,0,0.2)", borderRadius:9, padding:"8px 10px",
              textAlign:"center" }}>
              <div style={{ fontSize:14, fontWeight:700, color:s.col }}>{s.v}</div>
              <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Barre de progression */}
      <div>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
          <span style={{ fontSize:11, color:FC.creamD }}>
            Étape {etapeIdx + 1} / {etapes.length} — <strong style={{ color:"#fff" }}>{etapeActuelle.label}</strong>
          </span>
          <span style={{ fontSize:10, color:FC.creamD }}>{avancement}%</span>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:99, height:6 }}>
          <div style={{ height:6, borderRadius:99, background:FC.vert,
            width:`${avancement}%`, transition:"width 0.4s" }}/>
        </div>
      </div>

      {/* Étape courante */}
      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        {etapeActuelle.description && (
          <div style={{ fontSize:11, color:FC.creamD, marginBottom:10, fontStyle:"italic" }}>
            {etapeActuelle.description}
          </div>
        )}

        {/* SELECT */}
        {etapeActuelle.type === "select" && etapeActuelle.options && (
          <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
            {etapeActuelle.options.filter((o: CatalogueOption) => o.disponible).map((o: CatalogueOption) => {
              const selectionne = choix[etapeActuelle.id] === o.id;
              return (
                <button key={o.id} onClick={() => handleValeur(etapeActuelle.id, o.id)}
                  style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                    padding:"12px 14px", borderRadius:10, cursor:"pointer",
                    border:`1px solid ${selectionne ? FC.vert : "rgba(255,255,255,0.1)"}`,
                    background:selectionne ? "rgba(21,128,61,0.15)" : "rgba(255,255,255,0.04)",
                    textAlign:"left" as const, fontFamily:SA }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:selectionne?700:400,
                      color:selectionne?"#fff":"rgba(255,255,255,0.7)" }}>
                      {selectionne ? "✓ " : ""}{o.libelle}
                    </div>
                    {o.deltaTempMin > 0 && (
                      <div style={{ fontSize:10, color:FC.creamD }}>+{fmtDuree(o.deltaTempMin)}</div>
                    )}
                  </div>
                  {o.supplement > 0 && (
                    <span style={{ fontSize:12, color:FC.or, fontWeight:700, flexShrink:0 }}>
                      +{o.supplement}€
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* TOGGLE */}
        {etapeActuelle.type === "toggle" && (
          <div style={{ display:"flex", gap:8 }}>
            {[["oui","✅ Oui"],[  "non","✕ Non"]].map(([v,l]) => (
              <button key={v} onClick={() => handleValeur(etapeActuelle.id, v)}
                style={{ flex:1, padding:"12px", borderRadius:10, cursor:"pointer",
                  border:`1px solid ${choix[etapeActuelle.id]===v?FC.vert:"rgba(255,255,255,0.1)"}`,
                  background:choix[etapeActuelle.id]===v?"rgba(21,128,61,0.15)":"rgba(255,255,255,0.04)",
                  color:choix[etapeActuelle.id]===v?"#fff":"rgba(255,255,255,0.6)",
                  fontWeight:choix[etapeActuelle.id]===v?700:400, fontSize:13, fontFamily:SA }}>
                {l}
              </button>
            ))}
          </div>
        )}

        {/* NUMBER */}
        {etapeActuelle.type === "number" && (
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <button onClick={() => handleValeur(etapeActuelle.id, Math.max(1, (parseInt(choix[etapeActuelle.id])||1)-1))}
              style={{ background:"rgba(248,113,113,0.15)", border:"none", borderRadius:8,
                padding:"10px 18px", color:"#f87171", fontSize:20, cursor:"pointer" }}>−</button>
            <div style={{ flex:1, textAlign:"center" }}>
              <div style={{ fontSize:32, fontWeight:700, color:FC.or }}>
                {choix[etapeActuelle.id] || 1}
              </div>
            </div>
            <button onClick={() => handleValeur(etapeActuelle.id, (parseInt(choix[etapeActuelle.id])||1)+1)}
              style={{ background:"rgba(21,128,61,0.2)", border:"none", borderRadius:8,
                padding:"10px 18px", color:FC.vertL, fontSize:20, cursor:"pointer" }}>+</button>
          </div>
        )}

        {/* TEXT */}
        {etapeActuelle.type === "text" && (
          <textarea rows={3} value={choix[etapeActuelle.id] || ""}
            onChange={e => handleValeur(etapeActuelle.id, e.target.value)}
            placeholder={`Saisissez : ${etapeActuelle.label.toLowerCase()}...`}
            style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
              borderRadius:10, padding:"10px 12px", color:"#fff", fontSize:13,
              fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
              resize:"vertical" as const }}/>
        )}
      </div>

      {/* Navigation */}
      <div style={{ display:"flex", gap:8 }}>
        {etapeIdx > 0 && (
          <button onClick={() => setEtapeIdx(i => i - 1)}
            style={{ flex:0.5, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
              padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:12,
              cursor:"pointer", fontFamily:SA }}>
            ‹ Retour
          </button>
        )}
        {etapeIdx < etapes.length - 1 ? (
          <button onClick={suivant}
            style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
              padding:"11px", color:"#fff", fontWeight:700, fontSize:13,
              cursor:"pointer", fontFamily:SA }}>
            Suivant ›
          </button>
        ) : (
          <button onClick={valider}
            style={{ flex:1, background:FC.or, border:"none", borderRadius:10,
              padding:"11px", color:"#062b1d", fontWeight:700, fontSize:14,
              cursor:"pointer", fontFamily:SA }}>
            ✅ Valider ma configuration — {calcul.prixTotal.toFixed(2)}€
          </button>
        )}
        {onAnnuler && (
          <button onClick={onAnnuler}
            style={{ flex:0.4, background:"transparent", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:10, padding:"11px", color:"rgba(255,255,255,0.35)",
              fontSize:11, cursor:"pointer", fontFamily:SA }}>
            Annuler
          </button>
        )}
      </div>

      {/* Récapitulatif des choix */}
      {Object.keys(choix).length > 0 && (
        <div style={{ background:"rgba(255,255,255,0.03)", border:`1px dashed ${FC.line}`,
          borderRadius:10, padding:"10px 13px" }}>
          <div style={{ fontSize:10, color:FC.or, fontWeight:700, marginBottom:6 }}>RÉCAPITULATIF</div>
          {etapes.map(e => {
            const val = choix[e.id];
            if (!val) return null;
            const opt = e.options?.find((o: CatalogueOption) => o.id === val);
            return (
              <div key={e.id} style={{ display:"flex", justifyContent:"space-between",
                padding:"3px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                <span style={{ fontSize:10, color:FC.creamD }}>{e.label}</span>
                <span style={{ fontSize:10, color:"#fff", fontWeight:600 }}>
                  {opt ? opt.libelle : String(val)}
                </span>
              </div>
            );
          })}
          {calcul.supplements > 0 && (
            <div style={{ fontSize:11, color:FC.or, marginTop:6, fontWeight:700 }}>
              Suppléments : +{calcul.supplements.toFixed(2)}€
            </div>
          )}
        </div>
      )}
    </div>
  );
}

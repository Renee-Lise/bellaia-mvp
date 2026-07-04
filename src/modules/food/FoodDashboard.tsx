import React from "react";
import type { CommandeFood, StockItem, Consommable } from "./foodTypes";
import { FOOD_COLORS as FC, FOOD_CATALOGUE } from "./foodConsts";
import { fmtPrix, getAlerteStock } from "./foodUtils";

interface Props {
  commandes: CommandeFood[];
  stocks: StockItem[];
  consommables: Consommable[];
  onNavigue: (section: string) => void;
}

export default function FoodDashboard({ commandes, stocks, consommables, onNavigue }: Props) {
  const enCours = commandes.filter(c =>
    ["acompte_recu","confirme","en_production"].includes(c.statut)
  );
  const aVenir = commandes.filter(c =>
    c.statut === "demande_recue" || c.statut === "devis_envoye"
  );
  const ca = commandes
    .filter(c => c.statut === "livre")
    .reduce((s, c) => s + (c.prixCalcule || 0), 0);

  const alertesStock      = getAlerteStock(stocks);
  const alertesConso      = getAlerteStock(consommables);
  const totalAlertes      = alertesStock.length + alertesConso.length;

  const COL = {
    card:  "rgba(255,255,255,0.04)",
    line:  FC.line,
  };

  const STAT_CARDS = [
    { ico:"€",  val: ca > 0 ? fmtPrix(ca) : "—",  label:"CA (livré)",      col: FC.or,    dest:"commandes" },
    { ico:"⏳",  val: String(enCours.length),       label:"En production",   col: FC.vert,  dest:"commandes" },
    { ico:"📋",  val: String(aVenir.length),        label:"Devis / à venir", col:"#3b82f6", dest:"commandes" },
    { ico:"⚠",  val: String(totalAlertes),          label:"Alertes stock",   col: totalAlertes > 0 ? "#f87171" : FC.vert, dest:"stocks" },
  ];

  const produitsVedettes = FOOD_CATALOGUE.filter(p => p.disponible).slice(0, 4);

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {STAT_CARDS.map(s => (
          <div key={s.label} onClick={() => onNavigue(s.dest)}
            style={{ background: COL.card, border:`1px solid ${COL.line}`,
              borderRadius:12, padding:"14px 12px", cursor:"pointer",
              borderTop:`3px solid ${s.col}` }}>
            <div style={{ fontSize:22, marginBottom:4 }}>{s.ico}</div>
            <div style={{ fontSize:20, fontWeight:700, color: s.col, fontFamily:"serif" }}>{s.val}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)", marginTop:2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Commandes en cours */}
      {enCours.length > 0 && (
        <div style={{ background: COL.card, border:`1px solid ${COL.line}`, borderRadius:12, padding:"14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color: FC.or, marginBottom:10, letterSpacing:1 }}>
            PRODUCTION EN COURS
          </div>
          {enCours.slice(0, 3).map(c => (
            <div key={c.id} style={{ display:"flex", justifyContent:"space-between",
              padding:"6px 0", borderBottom:`1px solid ${COL.line}` }}>
              <div>
                <div style={{ fontSize:12, color:"#fff", fontWeight:600 }}>{c.produit}</div>
                <div style={{ fontSize:10, color:"rgba(255,255,255,0.5)" }}>{c.client} · {c.dateLivraison || "Date à définir"}</div>
              </div>
              <div style={{ textAlign:"right" }}>
                <div style={{ fontSize:12, color: FC.or, fontWeight:700 }}>
                  {c.prixCalcule ? fmtPrix(c.prixCalcule) : "—"}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.4)", marginTop:2 }}>{c.statut.replace("_"," ")}</div>
              </div>
            </div>
          ))}
          {enCours.length > 3 && (
            <div onClick={() => onNavigue("commandes")}
              style={{ fontSize:11, color: FC.vert, marginTop:8, cursor:"pointer", textAlign:"center" }}>
              Voir toutes ({enCours.length}) →
            </div>
          )}
        </div>
      )}

      {/* Alertes stock */}
      {totalAlertes > 0 && (
        <div style={{ background:"rgba(248,113,113,0.08)", border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:12, padding:"14px" }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f87171", marginBottom:8, letterSpacing:1 }}>
            ⚠ ALERTES STOCK ({totalAlertes})
          </div>
          {[...alertesStock.map(s => ({ nom: s.nom, qte: s.qteRestante, unite: s.unite, type:"matière" })),
            ...alertesConso.map(c => ({ nom: c.nom, qte: c.qteDispo, unite:"unité", type:"consommable" }))
          ].slice(0, 4).map((a, i) => (
            <div key={i} style={{ fontSize:11, color:"rgba(255,200,200,0.8)", padding:"3px 0",
              borderBottom:`1px solid rgba(248,113,113,0.1)` }}>
              {a.nom} — <span style={{ color:"#f87171" }}>{a.qte} {a.unite}</span> restant·e·s
            </div>
          ))}
          <div onClick={() => onNavigue("stocks")}
            style={{ fontSize:11, color:"#f87171", marginTop:8, cursor:"pointer" }}>
            Gérer le stock →
          </div>
        </div>
      )}

      {/* Accès rapide modules */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {[
          { ico:"📖", nom:"Catalogue",  id:"catalogue"  },
          { ico:"🍳", nom:"Recettes",   id:"recettes"   },
          { ico:"📦", nom:"Stocks",     id:"stocks"     },
          { ico:"🧰", nom:"Matériel",   id:"materiel"   },
          { ico:"🛍",  nom:"Consomm.",  id:"consommables"},
          { ico:"💰", nom:"Calculateur",id:"calculateur" },
          { ico:"📋", nom:"Commandes",  id:"commandes"  },
          { ico:"🤖", nom:"Assistant",  id:"assistant"  },
        ].map(m => (
          <div key={m.id} onClick={() => onNavigue(m.id)}
            style={{ background: COL.card, border:`1px solid ${COL.line}`,
              borderRadius:10, padding:"12px", cursor:"pointer",
              display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:18 }}>{m.ico}</span>
            <span style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>{m.nom}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

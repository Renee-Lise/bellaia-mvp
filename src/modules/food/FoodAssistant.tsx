import React, { useState } from "react";
import { FOOD_CATALOGUE, FOOD_STOCK_INIT, FOOD_COLORS as FC } from "./foodConsts";
import { rechercherProduitsFood, getAlerteStock, fmtPrix, calculerPrix } from "./foodUtils";

export default function FoodAssistant() {
  const [mode,    setMode]    = useState<"prix"|"courses"|"stock"|"menu"|null>(null);
  const [query,   setQuery]   = useState("");
  const [resultat,setResultat]= useState<any>(null);

  const analyserPrix = () => {
    const produits = rechercherProduitsFood(query.split(" "));
    if (produits.length === 0) {
      setResultat({ type:"rien", msg: "Aucun produit trouvé pour « "+query+" ». Vérifiez le catalogue." });
      return;
    }
    const p = produits[0];
    if (p.prix == null) {
      setResultat({ type:"devis", produit: p.nom, msg:"Ce produit est sur devis. Utilisez le calculateur pour estimer." });
      return;
    }
    const res = calculerPrix({ coutMatiere: p.prix * 0.4, coutConsommables: p.prix * 0.1, margeSouhaitee: 40 });
    setResultat({ type:"prix", produit: p.nom, prix: p.prix, prixConseille: res.prixVenteConseille, marge: res.tauxMarge });
  };

  const checkStock = () => {
    const alertes = getAlerteStock(FOOD_STOCK_INIT);
    setResultat({ type:"stock", alertes });
  };

  const genererMenu = () => {
    const plats  = FOOD_CATALOGUE.filter(p => p.categorie === "plat" && p.disponible);
    const desserts= FOOD_CATALOGUE.filter(p => ["patisserie","dessert"].includes(p.categorie) && p.disponible);
    const boissons= FOOD_CATALOGUE.filter(p => p.categorie === "boisson" && p.disponible);
    setResultat({
      type:"menu",
      plat:   plats[Math.floor(Math.random() * plats.length)],
      dessert:desserts[Math.floor(Math.random() * desserts.length)],
      boisson:boissons[Math.floor(Math.random() * boissons.length)],
    });
  };

  const MODES = [
    { id:"prix",    ico:"💰", label:"Estimer un prix" },
    { id:"stock",   ico:"⚠",  label:"Vérifier le stock" },
    { id:"menu",    ico:"🍽",  label:"Proposer un menu" },
    { id:"courses", ico:"🛒",  label:"Liste de courses" },
  ] as const;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
      <div style={{ fontSize:13, color:"rgba(255,255,255,0.7)", lineHeight:1.6 }}>
        🤖 Je suis l'assistant Bella'Food. Que voulez-vous faire ?
      </div>

      {/* Modes */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
        {MODES.map(m => (
          <button key={m.id} onClick={() => { setMode(m.id); setResultat(null); setQuery(""); }}
            style={{ background: mode === m.id ? "rgba(21,128,61,0.2)" : "rgba(255,255,255,0.04)",
              border:`1px solid ${mode === m.id ? FC.vert : FC.line}`,
              borderRadius:10, padding:"13px 10px", cursor:"pointer",
              display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
            <span style={{ fontSize:20 }}>{m.ico}</span>
            <span style={{ fontSize:11, fontWeight:700, color: mode === m.id ? FC.vertL : "rgba(255,255,255,0.6)",
              fontFamily:"sans-serif", textAlign:"center" }}>{m.label}</span>
          </button>
        ))}
      </div>

      {/* Interaction par mode */}
      {mode === "prix" && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>
            Saisissez le nom d'un produit pour obtenir une estimation de prix.
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Ex : layer cake, bento cake, jus mangue..."
              style={{ flex:1, background:"rgba(255,255,255,0.07)", border:`1px solid ${FC.line}`,
                borderRadius:10, padding:"9px 13px", color:"#fff", fontSize:13,
                fontFamily:"sans-serif", outline:"none" }} />
            <button onClick={analyserPrix}
              style={{ background: FC.vert, border:"none", borderRadius:10, padding:"9px 16px",
                color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"sans-serif" }}>
              Analyser
            </button>
          </div>
        </div>
      )}

      {mode === "stock" && (
        <button onClick={checkStock}
          style={{ background: FC.vert, border:"none", borderRadius:10, padding:"11px",
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"sans-serif" }}>
          Vérifier les alertes stock maintenant
        </button>
      )}

      {mode === "menu" && (
        <button onClick={genererMenu}
          style={{ background: FC.vert, border:"none", borderRadius:10, padding:"11px",
            color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:"sans-serif" }}>
          🎲 Générer un menu aléatoire
        </button>
      )}

      {mode === "courses" && (
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", lineHeight:1.6,
          background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
          borderRadius:10, padding:12 }}>
          📋 La liste de courses intelligente sera générée à partir des commandes validées. Créez des commandes dans l'onglet Commandes, puis revenez ici pour générer la liste.
        </div>
      )}

      {/* Résultats */}
      {resultat && (
        <div style={{ background:"rgba(21,128,61,0.08)", border:`1px solid ${FC.line}`,
          borderRadius:12, padding:"14px" }}>
          {resultat.type === "prix" && (
            <>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)", marginBottom:8 }}>
                Analyse : {resultat.produit}
              </div>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Prix catalogue</span>
                <span style={{ fontSize:14, fontWeight:700, color: FC.or }}>{fmtPrix(resultat.prix)}</span>
              </div>
              <div style={{ display:"flex", justifyContent:"space-between" }}>
                <span style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>Marge estimée</span>
                <span style={{ fontSize:14, fontWeight:700, color: FC.vertL }}>{resultat.marge}%</span>
              </div>
            </>
          )}
          {resultat.type === "devis" && (
            <div style={{ fontSize:12, color:"rgba(255,200,100,0.8)" }}>
              📄 {resultat.produit} — {resultat.msg}
            </div>
          )}
          {resultat.type === "rien" && (
            <div style={{ fontSize:12, color:"#f87171" }}>{resultat.msg}</div>
          )}
          {resultat.type === "stock" && (
            <>
              <div style={{ fontSize:11, fontWeight:700, color: resultat.alertes.length > 0 ? "#f87171" : FC.vertL,
                marginBottom:8 }}>
                {resultat.alertes.length === 0 ? "✅ Tous les stocks sont OK" : `⚠ ${resultat.alertes.length} alerte(s)`}
              </div>
              {resultat.alertes.map((a: any) => (
                <div key={a.id} style={{ fontSize:11, color:"rgba(255,200,200,0.8)", padding:"3px 0",
                  borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                  {a.nom} — <span style={{ color:"#f87171" }}>{a.qteRestante} {a.unite}</span> restant·e·s
                </div>
              ))}
            </>
          )}
          {resultat.type === "menu" && (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              <div style={{ fontSize:11, fontWeight:700, color: FC.or, letterSpacing:1 }}>MENU SUGGÉRÉ</div>
              {[["🍽 Plat",    resultat.plat],
                ["🍰 Dessert", resultat.dessert],
                ["🧃 Boisson", resultat.boisson],
              ].map(([lbl, p]) => p && (
                <div key={lbl as string} style={{ display:"flex", justifyContent:"space-between",
                  padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
                  <span style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>{lbl}</span>
                  <span style={{ fontSize:12, color:"#fff", fontWeight:600 }}>
                    {(p as any).nom}
                    {(p as any).prix != null && <span style={{ color: FC.or, marginLeft:8 }}>{fmtPrix((p as any).prix)}</span>}
                  </span>
                </div>
              ))}
              <button onClick={genererMenu}
                style={{ marginTop:4, background:"rgba(255,255,255,0.06)", border:"none",
                  borderRadius:8, padding:"7px", color:"rgba(255,255,255,0.5)",
                  fontSize:11, cursor:"pointer", fontFamily:"sans-serif" }}>
                🎲 Autre suggestion
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

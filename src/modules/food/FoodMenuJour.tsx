// ═══════════════════════════════════════════════════════════
// FoodMenuJour — Menu du jour + lieux de vente, visibles par les
// clientes dès l'ouverture de leur session (migration 0060).
// src/modules/food/FoodMenuJour.tsx
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { getMenuJourAvecDiagnostic, creerMenuJour, majMenuJour } from "./menuJourApi";
import type { MenuJour, ItemMenuJour, LieuVente } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"7px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const aujourdhui = () => new Date().toISOString().split("T")[0];

export default function FoodMenuJour() {
  const [menusJour, setMenusJour] = useState<MenuJour[]>([]);
  const [chargement, setChargement] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  // Entrée du jour en cours d'édition — null tant qu'elle n'a pas été
  // créée (bouton "Créer le menu du jour").
  const [editId, setEditId] = useState<string | null>(null);
  const [items, setItems] = useState<ItemMenuJour[]>([]);
  const [lieux, setLieux] = useState<LieuVente[]>([]);
  const [statut, setStatut] = useState<"brouillon"|"publie">("brouillon");
  const [notes, setNotes] = useState("");
  const [nouvelItem, setNouvelItem] = useState<ItemMenuJour>({ nom:"" });
  const [nouveauLieu, setNouveauLieu] = useState<LieuVente>({ nom:"" });

  const charger = async () => {
    setChargement(true);
    const { menusJour: m, diagnostic: d } = await getMenuJourAvecDiagnostic();
    setMenusJour(m);
    setDiagnostic(d);
    const duJour = m.find(x => x.date === aujourdhui());
    if (duJour) {
      setEditId(duJour.id);
      setItems(duJour.items);
      setLieux(duJour.lieux);
      setStatut(duJour.statut);
      setNotes(duJour.notes || "");
    }
    setChargement(false);
  };
  useEffect(() => { charger(); }, []);

  const entreeDuJour = menusJour.find(m => m.date === aujourdhui());

  const creerAujourdhui = async () => {
    const res = await creerMenuJour({ date: aujourdhui(), items:[], lieux:[], statut:"brouillon" });
    if (!res.ok || !res.menuJour) { setErreur(res.error || "Échec de la création."); return; }
    setEditId(res.menuJour.id);
    setItems([]); setLieux([]); setStatut("brouillon"); setNotes("");
    await charger();
  };

  const sauvegarder = async (champs: Partial<MenuJour>) => {
    if (!editId) return;
    const res = await majMenuJour(editId, champs);
    if (!res.ok) { setErreur("Échec de l'enregistrement — réessayez."); return; }
    setErreur(null);
    await charger();
  };

  const ajouterItem = () => {
    if (!nouvelItem.nom.trim()) return;
    const liste = [...items, nouvelItem];
    setItems(liste);
    setNouvelItem({ nom:"" });
    sauvegarder({ items: liste });
  };
  const supprimerItem = (i: number) => {
    const liste = items.filter((_, idx) => idx !== i);
    setItems(liste);
    sauvegarder({ items: liste });
  };

  const ajouterLieu = () => {
    if (!nouveauLieu.nom.trim()) return;
    const liste = [...lieux, nouveauLieu];
    setLieux(liste);
    setNouveauLieu({ nom:"" });
    sauvegarder({ lieux: liste });
  };
  const supprimerLieu = (i: number) => {
    const liste = lieux.filter((_, idx) => idx !== i);
    setLieux(liste);
    sauvegarder({ lieux: liste });
  };

  const changerStatut = (s: "brouillon"|"publie") => {
    setStatut(s);
    sauvegarder({ statut: s });
  };

  if (chargement) return <div style={{ textAlign:"center", padding:28, color:FC.creamD, fontSize:13 }}>Chargement…</div>;

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
      {diagnostic && (
        <div style={{ fontSize:10, color:"#f87171", fontFamily:"monospace", background:"rgba(248,113,113,0.08)", borderRadius:8, padding:"8px 10px" }}>
          {diagnostic}
        </div>
      )}
      {erreur && (
        <div style={{ fontSize:11, color:"#f87171", background:"rgba(248,113,113,0.1)", borderRadius:8, padding:"8px 12px" }}>⚠️ {erreur}</div>
      )}

      {!entreeDuJour ? (
        <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:20, textAlign:"center" }}>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.6)", marginBottom:12 }}>
            Aucun menu du jour créé pour aujourd'hui.
          </div>
          <button onClick={creerAujourdhui}
            style={{ background:FC.vert, border:"none", borderRadius:10, padding:"10px 18px",
              color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer", fontFamily:SA }}>
            + Créer le menu du jour
          </button>
        </div>
      ) : (
        <>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>
              Aujourd'hui — {new Date(aujourdhui()).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={() => changerStatut("brouillon")}
                style={{ fontSize:10, padding:"4px 10px", borderRadius:99, cursor:"pointer",
                  border:`1px solid ${statut==="brouillon"?FC.or:"rgba(255,255,255,0.15)"}`,
                  background:statut==="brouillon"?"rgba(201,168,76,0.15)":"transparent",
                  color:statut==="brouillon"?FC.or:"rgba(255,255,255,0.4)", fontFamily:SA }}>Brouillon</button>
              <button onClick={() => changerStatut("publie")}
                style={{ fontSize:10, padding:"4px 10px", borderRadius:99, cursor:"pointer",
                  border:`1px solid ${statut==="publie"?FC.vert:"rgba(255,255,255,0.15)"}`,
                  background:statut==="publie"?"rgba(21,128,61,0.15)":"transparent",
                  color:statut==="publie"?FC.vertL:"rgba(255,255,255,0.4)", fontFamily:SA }}>✅ Publié</button>
            </div>
          </div>

          {statut === "publie" && (
            <div style={{ fontSize:11, color:FC.vertL, background:"rgba(21,128,61,0.1)", borderRadius:8, padding:"8px 12px" }}>
              Visible par vos clientes dès maintenant.
            </div>
          )}

          {/* Plats du jour */}
          <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>PLATS DU JOUR</div>
            {items.length === 0 && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontStyle:"italic", marginBottom:8 }}>Aucun plat ajouté.</div>}
            {items.map((it, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ fontSize:12, color:"#fff" }}>{it.nom}</div>
                  {it.description && <div style={{ fontSize:10, color:FC.creamD }}>{it.description}</div>}
                </div>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  {it.prix != null && <span style={{ fontSize:12, color:FC.or, fontWeight:700 }}>{it.prix}€</span>}
                  <button onClick={() => supprimerItem(i)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:12 }}>✕</button>
                </div>
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"2fr 2fr 1fr auto", gap:6, marginTop:10 }}>
              <input value={nouvelItem.nom} onChange={e=>setNouvelItem(v=>({...v,nom:e.target.value}))} placeholder="Nom du plat" style={inp}/>
              <input value={nouvelItem.description||""} onChange={e=>setNouvelItem(v=>({...v,description:e.target.value}))} placeholder="Description (optionnel)" style={inp}/>
              <input type="number" value={nouvelItem.prix??""} onChange={e=>setNouvelItem(v=>({...v,prix:e.target.value?parseFloat(e.target.value):undefined}))} placeholder="Prix €" style={inp}/>
              <button onClick={ajouterItem} style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 12px", color:"#fff", fontWeight:700, cursor:"pointer" }}>+</button>
            </div>
          </div>

          {/* Lieux de vente */}
          <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:12, padding:14 }}>
            <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:10, letterSpacing:1 }}>LIEUX DE VENTE</div>
            {lieux.length === 0 && <div style={{ fontSize:11, color:"rgba(255,255,255,0.3)", fontStyle:"italic", marginBottom:8 }}>Aucun lieu ajouté.</div>}
            {lieux.map((l, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"6px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <div style={{ fontSize:12, color:"#fff" }}>📍 {l.nom}</div>
                  {l.adresse && <div style={{ fontSize:10, color:FC.creamD }}>{l.adresse}</div>}
                  {l.horaires && <div style={{ fontSize:10, color:FC.creamD }}>🕐 {l.horaires}</div>}
                </div>
                <button onClick={() => supprimerLieu(i)} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:12 }}>✕</button>
              </div>
            ))}
            <div style={{ display:"grid", gridTemplateColumns:"1.5fr 2fr 1.5fr auto", gap:6, marginTop:10 }}>
              <input value={nouveauLieu.nom} onChange={e=>setNouveauLieu(v=>({...v,nom:e.target.value}))} placeholder="Nom du lieu" style={inp}/>
              <input value={nouveauLieu.adresse||""} onChange={e=>setNouveauLieu(v=>({...v,adresse:e.target.value}))} placeholder="Adresse (optionnel)" style={inp}/>
              <input value={nouveauLieu.horaires||""} onChange={e=>setNouveauLieu(v=>({...v,horaires:e.target.value}))} placeholder="Horaires (optionnel)" style={inp}/>
              <button onClick={ajouterLieu} style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 12px", color:"#fff", fontWeight:700, cursor:"pointer" }}>+</button>
            </div>
          </div>
        </>
      )}

      {/* Historique récent */}
      {menusJour.filter(m => m.date !== aujourdhui()).length > 0 && (
        <div>
          <div style={{ fontSize:11, fontWeight:700, color:FC.or, marginBottom:8, letterSpacing:1 }}>JOURS PRÉCÉDENTS</div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {menusJour.filter(m => m.date !== aujourdhui()).slice(0, 10).map(m => (
              <div key={m.id} style={{ background:"rgba(255,255,255,0.03)", border:`1px solid ${FC.line}`,
                borderRadius:10, padding:"8px 12px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:11, color:"rgba(255,255,255,0.6)" }}>
                  {new Date(m.date).toLocaleDateString("fr-FR",{weekday:"short",day:"numeric",month:"short"})} · {m.items.length} plat{m.items.length>1?"s":""}
                </span>
                <span style={{ fontSize:9, color: m.statut==="publie"?FC.vertL:"rgba(255,255,255,0.3)" }}>
                  {m.statut==="publie"?"Publié":"Brouillon"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

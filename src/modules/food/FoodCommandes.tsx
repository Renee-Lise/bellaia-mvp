import React, { useState } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import type { CommandeFood, StatutCommande } from "./foodTypes";

const STATUTS: { id: StatutCommande; label: string; col: string }[] = [
  {id:"demande_recue",   label:"Demande reçue",   col:"rgba(201,168,76,0.8)"},
  {id:"devis_envoye",    label:"Devis envoyé",    col:"#60a5fa"},
  {id:"acompte_recu",    label:"Acompte reçu",    col:"#34d399"},
  {id:"confirme",        label:"Confirmé",        col:"#22c55e"},
  {id:"en_production",   label:"En production",   col:"#a78bfa"},
  {id:"pret",            label:"Prêt",            col:"#10b981"},
  {id:"livre",           label:"Livré",           col:"rgba(255,255,255,0.4)"},
  {id:"annule",          label:"Annulé",          col:"#f87171"},
];
const statutInfo = (id: StatutCommande) => STATUTS.find(s => s.id === id) || STATUTS[0];

const FORM_INIT: Partial<CommandeFood> = {
  statut:"demande_recue", dateCommande: new Date().toISOString().split("T")[0],
};

export default function FoodCommandes() {
  const [commandes, setCommandes] = useState<CommandeFood[]>([]);
  const [modal,     setModal]     = useState<"form"|"detail"|null>(null);
  const [form,      setForm]      = useState<Partial<CommandeFood>>(FORM_INIT);
  const [detail,    setDetail]    = useState<CommandeFood|null>(null);
  const [filtre,    setFiltre]    = useState<StatutCommande|"tous">("tous");

  const visibles = commandes.filter(c => filtre === "tous" || c.statut === filtre);

  const enregistrer = () => {
    if (!form.client || !form.produit) { alert("Client et produit requis."); return; }
    const id = "FC" + Date.now().toString().slice(-6);
    if (form.id) {
      setCommandes(cs => cs.map(c => c.id === form.id ? { ...c, ...form } as CommandeFood : c));
    } else {
      setCommandes(cs => [{ ...form, id } as CommandeFood, ...cs]);
    }
    setModal(null); setForm(FORM_INIT);
  };

  const changerStatut = (id: string, statut: StatutCommande) => {
    setCommandes(cs => cs.map(c => c.id === id ? { ...c, statut } : c));
    if (detail?.id === id) setDetail(d => d ? { ...d, statut } : null);
  };

  const inp = (label: string, key: keyof CommandeFood, type = "text", ph = "") => (
    <div key={key as string} style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:"rgba(255,255,255,0.5)", fontFamily:"sans-serif" }}>{label}</label>
      <input type={type} placeholder={ph}
        value={(form[key] as string) || ""}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)",
          borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:13,
          fontFamily:"sans-serif", outline:"none", boxSizing:"border-box" as any, width:"100%" }} />
    </div>
  );

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <button onClick={() => setDetail(null)}
        style={{ alignSelf:"flex-start", background:"none", border:"1px solid rgba(255,255,255,0.15)",
          borderRadius:8, padding:"5px 12px", color:"rgba(255,255,255,0.6)",
          cursor:"pointer", fontSize:11, fontFamily:"sans-serif" }}>‹ Retour</button>

      <div style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
        borderRadius:14, padding:"16px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{detail.produit}</div>
            <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{detail.client} · {detail.tel}</div>
          </div>
          <span style={{ fontSize:9, background:"rgba(255,255,255,0.06)",
            color: statutInfo(detail.statut).col, borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
            {statutInfo(detail.statut).label}
          </span>
        </div>
        {[
          ["Date commande",  detail.dateCommande],
          ["Date livraison", detail.dateLivraison || "À définir"],
          ["Thème",          detail.theme || "—"],
          ["Saveur",         detail.saveur || "—"],
          ["Nb parts",       detail.nbParts ? String(detail.nbParts) : "—"],
          ["Allergies",      detail.allergies || "Aucune"],
        ].map(([l, v]) => v && (
          <div key={l} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)" }}>{l}</span>
            <span style={{ fontSize:11, color:"#fff" }}>{v}</span>
          </div>
        ))}
        {detail.prixCalcule && (
          <div style={{ marginTop:10, display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>Prix</span>
            <span style={{ fontSize:16, fontWeight:700, color: FC.or }}>{fmtPrix(detail.prixCalcule)}</span>
          </div>
        )}
        {detail.notes && (
          <div style={{ marginTop:8, fontSize:11, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>{detail.notes}</div>
        )}
      </div>

      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)", letterSpacing:1 }}>CHANGER LE STATUT</div>
        <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
          {STATUTS.map(s => (
            <button key={s.id} onClick={() => changerStatut(detail.id, s.id)}
              style={{ fontSize:9, padding:"4px 10px", borderRadius:6, cursor:"pointer",
                fontFamily:"sans-serif", border:`1px solid ${s.id === detail.statut ? s.col : "rgba(255,255,255,0.1)"}`,
                background: s.id === detail.statut ? `rgba(255,255,255,0.08)` : "transparent",
                color: s.id === detail.statut ? s.col : "rgba(255,255,255,0.4)" }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{visibles.length} commande{visibles.length>1?"s":""}</div>
        <button onClick={() => { setForm(FORM_INIT); setModal("form"); }}
          style={{ background: FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:"sans-serif" }}>
          + Nouvelle commande
        </button>
      </div>

      {/* Filtres statut */}
      <div style={{ display:"flex", gap:4, overflowX:"auto", paddingBottom:2 }}>
        <button onClick={() => setFiltre("tous")}
          style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
            fontSize:9, fontWeight:700, flexShrink:0, fontFamily:"sans-serif",
            background: filtre === "tous" ? FC.vert : "rgba(255,255,255,0.06)",
            color: filtre === "tous" ? "#fff" : "rgba(255,255,255,0.4)" }}>Toutes</button>
        {STATUTS.map(s => (
          <button key={s.id} onClick={() => setFiltre(s.id)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:"sans-serif",
              background: filtre === s.id ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
              color: filtre === s.id ? s.col : "rgba(255,255,255,0.4)" }}>
            {s.label}
          </button>
        ))}
      </div>

      {commandes.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px", color:"rgba(255,255,255,0.3)", fontSize:13 }}>
          Aucune commande. Créez la première !
        </div>
      )}

      {visibles.map(c => (
        <div key={c.id} onClick={() => setDetail(c)}
          style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${FC.line}`,
            borderRadius:12, padding:"12px 14px", cursor:"pointer" }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
            <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{c.produit}</div>
            <span style={{ fontSize:9, background:"rgba(255,255,255,0.06)",
              color: statutInfo(c.statut).col, borderRadius:4, padding:"2px 7px", fontWeight:700 }}>
              {statutInfo(c.statut).label}
            </span>
          </div>
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.5)" }}>
            {c.client} · {c.dateLivraison || "Livraison à définir"}
          </div>
          {c.prixCalcule && (
            <div style={{ fontSize:12, color: FC.or, fontWeight:700, marginTop:4 }}>
              {fmtPrix(c.prixCalcule)}
            </div>
          )}
        </div>
      ))}

      {/* Modal formulaire */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:999,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#0f1a0f", border:`1px solid ${FC.line}`, borderRadius:16,
            padding:20, maxWidth:480, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:16 }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>Nouvelle commande</div>
              <button onClick={() => setModal(null)}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {inp("Client *",          "client",        "text",  "Nom du client")}
              {inp("Téléphone",         "tel",           "tel",   "+594...")}
              {inp("Produit commandé *","produit",       "text",  "Layer cake, jus...")}
              {inp("Thème",             "theme",         "text",  "Jungle, princesse...")}
              {inp("Saveur",            "saveur",        "text",  "Chocolat, vanille...")}
              {inp("Nb parts",          "nbParts",       "number","")}
              {inp("Date livraison",    "dateLivraison", "date",  "")}
              {inp("Prix calculé (€)",  "prixCalcule",   "number","")}
              {inp("Allergies",         "allergies",     "text",  "Lactose, gluten...")}
              {inp("Notes",             "notes",         "text",  "")}
              <div style={{ display:"flex", gap:8, marginTop:6 }}>
                <button onClick={enregistrer}
                  style={{ flex:1, background: FC.vert, border:"none", borderRadius:10,
                    padding:"11px", color:"#fff", fontWeight:700, fontSize:13,
                    cursor:"pointer", fontFamily:"sans-serif" }}>
                  Créer la commande
                </button>
                <button onClick={() => setModal(null)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none", borderRadius:10,
                    padding:"11px", color:"rgba(255,255,255,0.5)", fontSize:13,
                    cursor:"pointer", fontFamily:"sans-serif" }}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

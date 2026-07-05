// ═══════════════════════════════════════════════════════════
// FoodFournisseurs — CRM Fournisseurs Bella'Food Partie III
// src/modules/food/FoodFournisseurs.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState } from "react";
import { FOOD_FOURNISSEURS_INIT, FOOD_COLORS as FC } from "./foodConsts";
import type { Fournisseur } from "./foodTypes";

const SA = "system-ui, sans-serif";
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const ETOILES = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default function FoodFournisseurs() {
  const [fournisseurs, setFournisseurs] = useState<Fournisseur[]>(FOOD_FOURNISSEURS_INIT);
  const [modal,   setModal]   = useState<"creer"|"detail"|null>(null);
  const [detail,  setDetail]  = useState<Fournisseur|null>(null);
  const [search,  setSearch]  = useState("");
  const FORM0: Partial<Fournisseur> = { actif:true };
  const [form, setForm] = useState<Partial<Fournisseur>>(FORM0);

  const visibles = fournisseurs.filter(f =>
    !search || f.nom.toLowerCase().includes(search.toLowerCase())
  );

  const sauvegarder = () => {
    if (!form.nom?.trim()) return;
    if (form.id) {
      setFournisseurs(fs => fs.map(f => f.id === form.id ? { ...f, ...form } as Fournisseur : f));
    } else {
      const nv: Fournisseur = {
        ...form as Fournisseur,
        id: "frnr_" + Date.now().toString().slice(-5),
        actif: true,
      };
      setFournisseurs(fs => [nv, ...fs]);
    }
    setModal(null); setForm(FORM0);
  };

  const Field = ({ label, k, type="text", ph="" }: { label:string; k:keyof Fournisseur; type?:string; ph?:string }) => (
    <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
      <label style={{ fontSize:10, color:FC.creamD, fontFamily:SA }}>{label}</label>
      <input type={type} value={(form[k] as string) || ""} placeholder={ph}
        onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))}
        style={inp} />
    </div>
  );

  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        <button onClick={() => setDetail(null)}
          style={{ background:"none", border:`1px solid ${FC.line}`, borderRadius:8,
            padding:"4px 12px", color:FC.creamD, cursor:"pointer", fontSize:11, fontFamily:SA }}>
          ‹ Retour
        </button>
        <button onClick={() => { setForm(detail); setModal("creer"); setDetail(null); }}
          style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${FC.vert}`,
            borderRadius:8, padding:"4px 12px", color:FC.vertL, cursor:"pointer",
            fontSize:11, fontFamily:SA }}>
          ✏ Modifier
        </button>
      </div>
      <div style={{ background:FC.card, border:`1px solid ${FC.line}`, borderRadius:14, padding:16 }}>
        <div style={{ fontSize:16, fontWeight:700, color:"#fff", marginBottom:4 }}>{detail.nom}</div>
        {detail.note && <div style={{ fontSize:13, color:FC.or, marginBottom:8 }}>{ETOILES(detail.note)}</div>}
        {[
          ["📞", detail.tel], ["✉️", detail.email], ["🌐", detail.siteInternet],
          ["📍", detail.adresse], ["👤", detail.contact],
        ].filter(([,v])=>v).map(([ico,val]) => (
          <div key={ico as string} style={{ fontSize:12, color:FC.creamD, marginBottom:4 }}>
            {ico} {val}
          </div>
        ))}
        {detail.delaiMoyen && (
          <div style={{ fontSize:12, color:FC.creamD, marginTop:6 }}>
            ⏱ Délai moyen : {detail.delaiMoyen} jour{detail.delaiMoyen > 1 ? "s" : ""}
          </div>
        )}
        {detail.minimumCommande && (
          <div style={{ fontSize:12, color:FC.creamD }}>
            🛒 Minimum de commande : {detail.minimumCommande}€
          </div>
        )}
        {detail.categoriesVendues?.length && (
          <div style={{ marginTop:10 }}>
            <div style={{ fontSize:10, color:FC.creamD, marginBottom:5 }}>Catégories</div>
            <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
              {detail.categoriesVendues.map(c => (
                <span key={c} style={{ fontSize:9, background:"rgba(21,128,61,0.15)",
                  color:FC.vertL, borderRadius:4, padding:"2px 7px" }}>{c}</span>
              ))}
            </div>
          </div>
        )}
        {detail.notes && (
          <div style={{ marginTop:10, fontSize:11, color:"rgba(255,255,255,0.4)", fontStyle:"italic" }}>
            {detail.notes}
          </div>
        )}
      </div>
      {/* Actions */}
      {detail.tel && (
        <button onClick={() => window.open("https://wa.me/"+detail.tel?.replace(/\D/g,""),"_blank")}
          style={{ background:"rgba(37,211,102,0.1)", border:"1px solid rgba(37,211,102,0.3)",
            borderRadius:10, padding:"10px", color:"#25d366", fontWeight:700,
            fontSize:12, cursor:"pointer", fontFamily:SA }}>
          💬 Contacter par WhatsApp
        </button>
      )}
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div style={{ fontSize:12, color:FC.creamD }}>{visibles.length} fournisseur{visibles.length>1?"s":""}</div>
        <button onClick={() => { setForm(FORM0); setModal("creer"); }}
          style={{ background:FC.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouveau fournisseur
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher un fournisseur..."
        style={{ ...inp, padding:"9px 13px", fontSize:13 }} />

      <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
        {visibles.map(f => (
          <div key={f.id} onClick={() => setDetail(f)}
            style={{ background:FC.card, border:`1px solid ${FC.line}`,
              borderRadius:12, padding:"13px 14px", cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{f.nom}</div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                {f.note && <span style={{ fontSize:10, color:FC.or }}>{ETOILES(f.note)}</span>}
                {!f.actif && <span style={{ fontSize:9, color:"rgba(255,255,255,0.3)" }}>Inactif</span>}
              </div>
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
              {f.categoriesVendues?.slice(0,3).map(c => (
                <span key={c} style={{ fontSize:9, background:"rgba(255,255,255,0.06)",
                  color:FC.creamD, borderRadius:4, padding:"1px 6px" }}>{c}</span>
              ))}
            </div>
            {f.delaiMoyen && (
              <div style={{ fontSize:10, color:"rgba(255,255,255,0.35)", marginTop:4 }}>
                ⏱ {f.delaiMoyen}j délai · {f.minimumCommande ? f.minimumCommande+"€ min" : "Pas de minimum"}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal création / édition */}
      {modal === "creer" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:"#111827", border:`1px solid ${FC.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>
                {form.id ? "Modifier le fournisseur" : "Nouveau fournisseur"}
              </div>
              <button onClick={() => { setModal(null); setForm(FORM0); }}
                style={{ background:"none", border:"none", color:"rgba(255,255,255,0.5)",
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              <Field label="Nom *"            k="nom"          ph="Metro, Grossiste local..." />
              <Field label="Téléphone"        k="tel"          ph="+594..." />
              <Field label="Email"            k="email"        type="email" />
              <Field label="Site internet"    k="siteInternet" ph="https://..." />
              <Field label="Adresse"          k="adresse" />
              <Field label="Contact"          k="contact"      ph="Nom du commercial" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Délai (j)</label>
                  <input type="number" min={0} value={form.delaiMoyen || ""}
                    onChange={e => setForm(f => ({ ...f, delaiMoyen: parseInt(e.target.value) || undefined }))}
                    style={inp} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Minimum (€)</label>
                  <input type="number" min={0} value={form.minimumCommande || ""}
                    onChange={e => setForm(f => ({ ...f, minimumCommande: parseFloat(e.target.value) || undefined }))}
                    style={inp} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:FC.creamD }}>Note /5</label>
                  <select value={form.note || ""} onChange={e => setForm(f => ({ ...f, note: parseInt(e.target.value) || undefined }))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    <option value="">—</option>
                    {[1,2,3,4,5].map(n => <option key={n} value={n}>{ETOILES(n)}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:FC.creamD }}>Notes</label>
                <textarea rows={2} value={form.notes || ""}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ ...inp, resize:"vertical" }} />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={sauvegarder}
                  style={{ flex:1, background:FC.vert, border:"none", borderRadius:10,
                    padding:"10px", color:"#fff", fontWeight:700, fontSize:12,
                    cursor:"pointer", fontFamily:SA }}>
                  ✅ {form.id ? "Mettre à jour" : "Créer"}
                </button>
                <button onClick={() => { setModal(null); setForm(FORM0); }}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"10px", color:"rgba(255,255,255,0.5)",
                    fontSize:12, cursor:"pointer", fontFamily:SA }}>Annuler</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
// ═══════════════════════════════════════════════════════════
// CALCULATEUR UI — Composant React réutilisable tous pôles
// Utilise le moteur calculateur.ts
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import { calculerPrix, prixPsychologique, type EntreeCalcul } from "./calculateur";

const B = {
  deep: "#0d0b12", card: "rgba(255,255,255,0.04)", border: "rgba(255,255,255,0.08)",
  cream: "#e8e3d5", muted: "rgba(255,255,255,0.4)", gold: "#c9a84c",
  violet: "#7c3aed", violetL: "#a78bfa", success: "#4ade80",
};
const SA = "Inter,system-ui,sans-serif";
const FS = "'Cormorant Garamond',Georgia,serif";

const Inp = ({ label, value, onChange, placeholder = "0", suffix = "€", type = "number" }: any) => (
  <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
    <div style={{ fontSize:10, fontWeight:700, color:B.muted, textTransform:"uppercase", letterSpacing:"0.05em" }}>{label}</div>
    <div style={{ position:"relative" }}>
      <input type={type} value={value||""} onChange={onChange} placeholder={placeholder}
        style={{ background:"rgba(255,255,255,0.05)", border:`1px solid ${B.border}`, borderRadius:10, padding:"9px 32px 9px 12px", color:B.cream, fontSize:13, outline:"none", fontFamily:SA, width:"100%", boxSizing:"border-box" }}/>
      {suffix && <span style={{ position:"absolute", right:10, top:"50%", transform:"translateY(-50%)", fontSize:11, color:B.muted }}>{suffix}</span>}
    </div>
  </div>
);

export default function CalculateurUI({ pole = "GENERAL", onPrixRetenu }: { pole?: string; onPrixRetenu?: (prix: number) => void }) {
  const [form, setForm] = useState<Partial<EntreeCalcul>>({ quantite:1, marge_souhaitee:40, tva:20, frais_bancaires:2.5 });
  const [resultat, setResultat] = useState<ReturnType<typeof calculerPrix>|null>(null);
  const f = (k: keyof EntreeCalcul) => (e: any) => setForm(x => ({ ...x, [k]: parseFloat(e.target.value)||0 }));

  const calculer = () => {
    if (!form.prix_fournisseur) return;
    setResultat(calculerPrix(form as EntreeCalcul));
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
      <div style={{ fontSize:14, fontWeight:800, color:B.cream, fontFamily:FS }}>🧮 Calculateur de prix</div>
      <div style={{ fontSize:10, color:B.muted }}>Pôle : {pole} · Calcul HT→TTC avec marge</div>

      {/* Entrées */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
        <Inp label="Prix fournisseur *" value={form.prix_fournisseur} onChange={f("prix_fournisseur")}/>
        <Inp label="Quantité" value={form.quantite} onChange={f("quantite")} placeholder="1" suffix="u"/>
        <Inp label="Livraison" value={form.frais_livraison} onChange={f("frais_livraison")}/>
        <Inp label="Emballage" value={form.frais_emballage} onChange={f("frais_emballage")}/>
        <Inp label="Douane" value={form.frais_douane} onChange={f("frais_douane")}/>
        <Inp label="Autres frais" value={form.autres_frais} onChange={f("autres_frais")}/>
        <Inp label="Frais bancaires" value={form.frais_bancaires} onChange={f("frais_bancaires")} suffix="%"/>
        <Inp label="Marge souhaitée *" value={form.marge_souhaitee} onChange={f("marge_souhaitee")} suffix="%"/>
        <Inp label="TVA" value={form.tva} onChange={f("tva")} suffix="%"/>
      </div>

      <button onClick={calculer}
        style={{ padding:"11px", borderRadius:12, border:"none", background:`linear-gradient(135deg,${B.violet},#9333ea)`, color:"#fff", cursor:"pointer", fontSize:14, fontWeight:700, fontFamily:SA }}>
        Calculer les prix →
      </button>

      {/* Résultats */}
      {resultat && (
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          <div style={{ fontSize:11, fontWeight:700, color:B.muted, textTransform:"uppercase", letterSpacing:"0.06em" }}>Résultats</div>
          {resultat.resume.map(r => (
            <div key={r.label} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:B.card, border:`1px solid ${B.border}`, borderRadius:10, padding:"10px 13px" }}>
              <span style={{ fontSize:12, color:B.muted }}>{r.label}</span>
              <span style={{ fontSize:14, fontWeight:700, color:r.couleur, fontFamily:FS }}>{r.valeur}</span>
            </div>
          ))}

          {/* Prix psychologique */}
          <div style={{ background:`${B.gold}10`, border:`1px solid ${B.gold}30`, borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, color:B.gold, fontWeight:700, marginBottom:4 }}>💡 Prix psychologique recommandé</div>
            <div style={{ fontSize:22, fontWeight:700, color:B.gold, fontFamily:FS }}>
              {prixPsychologique(resultat.prix_conseille)}€
            </div>
            <div style={{ fontSize:10, color:B.muted, marginTop:2 }}>Arrondi optimal pour l'impact commercial</div>
          </div>

          {/* Bouton retenir le prix */}
          {onPrixRetenu && (
            <button onClick={() => onPrixRetenu(prixPsychologique(resultat.prix_conseille))}
              style={{ padding:"10px", borderRadius:12, border:`1px solid ${B.gold}40`, background:`${B.gold}15`, color:B.gold, cursor:"pointer", fontSize:13, fontWeight:700, fontFamily:SA }}>
              ✅ Retenir ce prix — {prixPsychologique(resultat.prix_conseille)}€
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// FoodCommandesSite — commandes passées depuis le catalogue public
// (ClientFood), distinctes des commandes sur-mesure (FoodCommandes.tsx
// / food_commandes). Table réelle : bellaia_commandes, bu='FOOD'.
// src/modules/food/FoodCommandesSite.tsx
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import { FOOD_COLORS as FC } from "./foodConsts";
import { fmtPrix } from "./foodUtils";
import { getCommandesSiteFoodAvecDiagnostic, majStatutCommandeSite } from "./commandesSiteApi";
import type { CommandeSite } from "./commandesSiteApi";

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 8, padding: "6px 9px", color: "#fff", fontSize: 11,
  fontFamily: "sans-serif", outline: "none",
};

export default function FoodCommandesSite() {
  const [commandes, setCommandes] = useState<CommandeSite[]>([]);
  const [chargement, setChargement] = useState(true);
  const [diagnostic, setDiagnostic] = useState<string | null>(null);
  const [detail, setDetail] = useState<CommandeSite | null>(null);
  const [statutEdit, setStatutEdit] = useState("");
  const [sauvegarde, setSauvegarde] = useState(false);

  const charger = async () => {
    setChargement(true);
    const { commandes: c, diagnostic: d } = await getCommandesSiteFoodAvecDiagnostic();
    setCommandes(c);
    setDiagnostic(d);
    setChargement(false);
  };
  useEffect(() => { charger(); }, []);

  const ouvrir = (c: CommandeSite) => { setDetail(c); setStatutEdit(c.statut); };

  const enregistrerStatut = async () => {
    if (!detail || statutEdit === detail.statut) return;
    setSauvegarde(true);
    const res = await majStatutCommandeSite(detail.id, statutEdit);
    setSauvegarde(false);
    if (!res.ok) { alert("Échec de l'enregistrement du statut.\n" + (res.error || "")); return; }
    setCommandes(cs => cs.map(c => c.id === detail.id ? { ...c, statut: statutEdit } : c));
    setDetail(d => d ? { ...d, statut: statutEdit } : null);
  };

  if (chargement) return <div style={{ padding: 20, textAlign: "center", color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Chargement…</div>;

  if (detail) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff" }}>{detail.reference || detail.id.slice(0, 8)}</div>
          <button onClick={() => setDetail(null)} style={{ background: "none", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, padding: "5px 12px", color: "rgba(255,255,255,0.6)", cursor: "pointer", fontSize: 11 }}>‹ Retour</button>
        </div>
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
          <div><strong>Cliente :</strong> {detail.clientNom}{detail.clientTel ? ` · ${detail.clientTel}` : ""}</div>
          {detail.dateLivraison && <div><strong>Livraison souhaitée :</strong> {detail.dateLivraison}</div>}
          {detail.notes && <div><strong>Message :</strong> {detail.notes}</div>}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: `1px solid ${FC.line}` }}>
            {detail.lignes.map((l, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0" }}>
                <span>{l.libelle} ×{l.qte}</span>
                <span>{fmtPrix(l.total)}</span>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, paddingTop: 6, borderTop: `1px solid ${FC.line}` }}>
            <span>Total</span><span style={{ color: FC.or }}>{fmtPrix(detail.total)}</span>
          </div>
        </div>
        <div style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: 1 }}>STATUT</div>
          <div style={{ display: "flex", gap: 6 }}>
            <input value={statutEdit} onChange={e => setStatutEdit(e.target.value)} style={{ ...inp, flex: 1 }} />
            <button onClick={enregistrerStatut} disabled={sauvegarde || statutEdit === detail.statut}
              style={{ background: FC.vert, border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", opacity: sauvegarde || statutEdit === detail.statut ? 0.5 : 1 }}>
              {sauvegarde ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
        Commandes passées directement depuis le catalogue public (site/app cliente) — distinctes des commandes sur-mesure de l'onglet « Commandes ».
      </div>
      {diagnostic && <div style={{ fontSize: 11, color: "#f87171" }}>{diagnostic}</div>}
      {commandes.length === 0 && (
        <div style={{ textAlign: "center", padding: 30, color: "rgba(255,255,255,0.4)", fontSize: 12 }}>
          Aucune commande du site pour l'instant.
        </div>
      )}
      {commandes.map(c => (
        <div key={c.id} onClick={() => ouvrir(c)}
          style={{ background: FC.card, border: `1px solid ${FC.line}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>{c.clientNom || "Cliente"}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{c.reference} · {c.lignes.length} article{c.lignes.length > 1 ? "s" : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: FC.or }}>{fmtPrix(c.total)}</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)" }}>{c.statut}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

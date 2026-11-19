"use client";
// ═══════════════════════════════════════════════════════════
// Coûts IA — tableau de bord fondatrice.
// Consommation du jour / du mois, coût par traitement, fichiers traités,
// budget restant, alertes, historique par univers (espace) et par
// fonctionnalité ; limites MODIFIABLES (quota quotidien, budget mensuel,
// seuil d'alerte, suspension). Le plafond est appliqué par le serveur
// (réservation atomique) : aucun dépassement automatique.
// « Estimé » = calculé par Bellaïa d'après les jetons et les prix saisis
// ici ; le montant réellement facturé figure sur la facture Anthropic.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbFoodGet } from "./foodApi";

const SA = "system-ui, -apple-system, sans-serif";
const C = { card: "rgba(255,255,255,0.05)", ligne: "rgba(255,255,255,0.12)", texte: "#f1ece0", doux: "rgba(241,236,224,0.62)", or: "#c9a96e", ok: "#4ade80", rouge: "#f87171", orange: "#fb923c" };
const carte: React.CSSProperties = { background: C.card, border: `1px solid ${C.ligne}`, borderRadius: 14, padding: 12 };
const champ: React.CSSProperties = { background: "rgba(255,255,255,0.07)", border: `1px solid ${C.ligne}`, borderRadius: 10, padding: "9px 10px", color: "#fff", fontSize: 16, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box", minHeight: 42 };
const btn = (fort = false, c = C.or): React.CSSProperties => ({ minHeight: 40, padding: "8px 12px", borderRadius: 10, border: `1px solid ${fort ? c : C.ligne}`, background: fort ? `${c}22` : C.card, color: fort ? c : C.texte, fontSize: 13, fontWeight: 700, fontFamily: SA, cursor: "pointer" });
const eur = (n: number) => `${n.toFixed(n < 1 ? 3 : 2).replace(".", ",")} €`;
const ROUTES: Record<string, string> = { "food/import/traiter": "Import / analyse de documents", chat: "Assistant Bellaïa", test: "Test" };

export default function CoutsIA() {
  const [limites, setLimites] = useState<any[]>([]);
  const [conso, setConso] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const charger = async () => {
    try {
      const debutMois = new Date(); debutMois.setUTCDate(1); debutMois.setUTCHours(0, 0, 0, 0);
      const [l, c] = await Promise.all([
        sbFoodGet<any>("ia_limites", "select=*&order=espace.asc"),
        sbFoodGet<any>("ia_consommation", `created_at=gte.${debutMois.toISOString()}&statut=neq.annule&select=id,route,espace,statut,cout_estime_eur,cout_reserve_eur,jetons_entree,jetons_sortie,created_at,ok&order=created_at.desc&limit=5000`),
      ]);
      setLimites(l); setConso(c);
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };
  useEffect(() => { charger(); }, []);

  const stats = useMemo(() => {
    const auj = new Date().toISOString().slice(0, 10);
    const cout = (r: any) => Number(r.statut === "reservation" ? r.cout_reserve_eur : r.cout_estime_eur) || 0;
    const jour = conso.filter(r => String(r.created_at).slice(0, 10) === auj);
    const parEspace: Record<string, { n: number; eur: number }> = {}, parRoute: Record<string, { n: number; eur: number }> = {};
    for (const r of conso) {
      const e = r.espace || "GENERAL", ro = ROUTES[r.route] || r.route;
      parEspace[e] = { n: (parEspace[e]?.n || 0) + 1, eur: (parEspace[e]?.eur || 0) + cout(r) };
      parRoute[ro] = { n: (parRoute[ro]?.n || 0) + 1, eur: (parRoute[ro]?.eur || 0) + cout(r) };
    }
    const mois = conso.reduce((s, r) => s + cout(r), 0);
    const reels = conso.filter(r => r.statut === "reel");
    return { jourN: jour.length, jourEur: jour.reduce((s, r) => s + cout(r), 0), moisN: conso.length, mois, enCours: conso.filter(r => r.statut === "reservation").length,
      moyen: reels.length ? reels.reduce((s, r) => s + cout(r), 0) / reels.length : 0, parEspace, parRoute };
  }, [conso]);
  const budgetTotal = limites.reduce((m, l) => Math.max(m, Number(l.budget_mensuel_eur) || 0), 0);
  const restant = Math.max(0, budgetTotal - stats.mois);
  const pct = budgetTotal ? Math.round(stats.mois / budgetTotal * 100) : 0;
  const alerte = limites.find(l => pct >= (l.alerte_pct || 80));

  const enregistrer = async (l: any, patch: any) => {
    try {
      const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL, SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const t = localStorage.getItem("bellaia_token") || "";
      const r = await fetch(`${SB_URL}/rest/v1/ia_limites?espace=eq.${encodeURIComponent(l.espace)}`, { method: "PATCH", headers: { apikey: SB_KEY!, Authorization: `Bearer ${t}`, "Content-Type": "application/json", Prefer: "return=minimal" }, body: JSON.stringify({ ...patch, updated_at: new Date().toISOString() }) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setLimites(x => x.map(y => y.espace === l.espace ? { ...y, ...patch } : y)); setMsg("✅ Limites enregistrées : appliquées immédiatement par le serveur.");
    } catch (e: any) { setMsg("❌ " + String(e?.message || e)); }
  };

  return (
    <div style={{ fontFamily: SA, color: C.texte, display: "flex", flexDirection: "column", gap: 12, maxWidth: 860, margin: "0 auto" }}>
      <div style={{ fontSize: 20, fontWeight: 900 }}>💶 Coûts IA</div>
      <div style={{ fontSize: 12, color: C.doux, lineHeight: 1.5 }}>Montants <b>estimés</b> par Bellaïa (jetons × prix saisis ci-dessous). Le coût <b>réel</b> est celui de la facture Anthropic. Le plafond est contrôlé par le serveur : une analyse qui dépasserait le budget n'est pas lancée.</div>
      {alerte && <div style={{ ...carte, borderColor: C.orange, color: C.orange, fontWeight: 700 }}>⚠️ {pct} % du budget mensuel consommé.</div>}
      {msg && <div style={{ ...carte, fontSize: 13 }}>{msg}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {[["Aujourd'hui", `${stats.jourN} analyse(s)`, eur(stats.jourEur)], ["Ce mois", `${stats.moisN} analyse(s)`, eur(stats.mois)], ["Budget restant", `${pct} % consommé`, eur(restant)], ["Coût moyen", `par traitement${stats.enCours ? ` · ${stats.enCours} en cours` : ""}`, eur(stats.moyen)]].map(([t, s, v]) => (
          <div key={t} style={carte}><div style={{ fontSize: 12, color: C.doux }}>{t}</div><div style={{ fontSize: 20, fontWeight: 900, color: C.or }}>{v}</div><div style={{ fontSize: 11, color: C.doux }}>{s} · estimé</div></div>))}
      </div>
      <div style={carte}>
        <b>Par fonctionnalité</b>
        {Object.entries(stats.parRoute).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}><span>{k}</span><span>{v.n} · {eur(v.eur)}</span></div>)}
        {!Object.keys(stats.parRoute).length && <div style={{ fontSize: 13, color: C.doux, marginTop: 4 }}>Aucune analyse IA ce mois-ci.</div>}
        <b style={{ display: "block", marginTop: 10 }}>Par univers</b>
        {Object.entries(stats.parEspace).map(([k, v]) => <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}><span>{k === "BELLAFOOD" ? "Bella'Food" : k === "VILDOR" ? "Vil'Dor Pâtisse" : "Général"}</span><span>{v.n} · {eur(v.eur)}</span></div>)}
      </div>
      {limites.map(l => (
        <div key={l.espace} style={{ ...carte, display: "flex", flexDirection: "column", gap: 8 }}>
          <b>Limites — {l.espace === "BELLAFOOD" ? "Bella'Food" : l.espace === "VILDOR" ? "Vil'Dor Pâtisse" : "Général (assistant)"}</b>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {([["appels_jour", "Analyses / jour / personne"], ["budget_mensuel_eur", "Budget mensuel (€)"], ["alerte_pct", "Alerte à (%)"], ["prix_entree_mtok", "Prix entrée / M jetons (€)"], ["prix_sortie_mtok", "Prix sortie / M jetons (€)"]] as const).map(([k, t]) => (
              <label key={k} style={{ fontSize: 12, color: C.doux }}>{t}<input style={champ} inputMode="decimal" defaultValue={l[k]} onBlur={e => { const v = Number(String(e.target.value).replace(",", ".")); if (Number.isFinite(v) && v >= 0 && v !== Number(l[k])) enregistrer(l, { [k]: v }); }} /></label>))}
          </div>
          <button style={btn(l.suspendu, l.suspendu ? C.rouge : C.or)} onClick={() => enregistrer(l, { suspendu: !l.suspendu })}>{l.suspendu ? "▶️ Reprendre les analyses IA" : "⏸ Suspendre les analyses IA"}</button>
        </div>))}
    </div>
  );
}

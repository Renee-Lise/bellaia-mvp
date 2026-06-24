"use client";
// ═══════════════════════════════════════════════════════════
// PRÉ-COMPTABILITÉ BELLAÏA — Module fondatrice complet
// Ventes auto · Espèces à valider · Achats · Journaux · Export
// ═══════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import {
  chargerEcritures, validerEcriture, annulerEcriture,
  construireEcritureVente, construireEcritureAchat,
  enregistrerEcriture, calculerTotaux, exporterCSV
} from "./moteur";
import type { EcritureCompta, ModesPaiement, TypeOperation } from "./types";
import { MODES_EN_LIGNE, CATEGORIES_PAR_POLE, CATEGORIES_ACHAT, isEnLigne } from "./types";
import { POLES } from "../shared/constants";

// ── Design tokens
const B = {
  deep:"#0d0b12", card:"rgba(255,255,255,0.04)", border:"rgba(255,255,255,0.08)",
  cream:"#e8e3d5", muted:"rgba(255,255,255,0.4)", gold:"#c9a84c",
  violet:"#7c3aed", violetL:"#a78bfa", success:"#4ade80",
  danger:"#ef4444", warning:"#f59e0b", info:"#38bdf8",
};
const SA = "Inter,system-ui,sans-serif";
const FS = "'Cormorant Garamond',Georgia,serif";

// ── Helpers UI
const Card = ({ children, style = {} }: any) => (
  <div style={{ background: B.card, border: `1px solid ${B.border}`, borderRadius: 14, padding: "12px 14px", ...style }}>
    {children}
  </div>
);
const Btn = ({ children, onClick, v = "primary", sm = false, disabled = false, full = false }: any) => {
  const bgs: any = {
    primary: `linear-gradient(135deg,${B.violet},#9333ea)`,
    gold: `linear-gradient(135deg,${B.gold},#b8860b)`,
    ghost: "rgba(255,255,255,0.07)",
    success: "rgba(74,222,128,0.15)",
    danger: "rgba(239,68,68,0.15)",
  };
  const cols: any = { danger: B.danger, success: B.success, ghost: B.muted };
  return (
    <button onClick={onClick} disabled={disabled}
      style={{ background: bgs[v], border: `1px solid ${v === "ghost" ? B.border : v === "danger" ? "rgba(239,68,68,0.35)" : v === "success" ? "rgba(74,222,128,0.35)" : "transparent"}`, borderRadius: 10, padding: sm ? "4px 10px" : "9px 16px", color: cols[v] || "#fff", cursor: disabled ? "not-allowed" : "pointer", fontSize: sm ? 11 : 13, fontWeight: 700, fontFamily: SA, opacity: disabled ? 0.5 : 1, width: full ? "100%" : undefined }}>
      {children}
    </button>
  );
};
const Fld = ({ label, children }: any) => (
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    {children}
  </div>
);
const Inp = ({ value, onChange, placeholder = "", type = "text", rows = 0 }: any) =>
  rows > 1
    ? <textarea value={value || ""} onChange={onChange} placeholder={placeholder} rows={rows} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${B.border}`, borderRadius: 10, padding: "9px 12px", color: B.cream, fontSize: 12, outline: "none", fontFamily: SA, resize: "vertical", width: "100%", boxSizing: "border-box" as const }} />
    : <input value={value || ""} onChange={onChange} placeholder={placeholder} type={type} style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${B.border}`, borderRadius: 10, padding: "9px 12px", color: B.cream, fontSize: 12, outline: "none", fontFamily: SA, width: "100%", boxSizing: "border-box" as const }} />;
const Sel = ({ value, onChange, options }: any) => (
  <select value={value || ""} onChange={onChange} style={{ background: "#1a1625", border: `1px solid ${B.border}`, borderRadius: 10, padding: "9px 12px", color: B.cream, fontSize: 12, fontFamily: SA, width: "100%", outline: "none" }}>
    {options.map((o: any) => typeof o === "string" ? <option key={o} value={o}>{o}</option> : <option key={o.id} value={o.id}>{o.label}</option>)}
  </select>
);
const Mdl = ({ title, onClose, children }: any) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 250, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
    <div style={{ background: "#13111a", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, maxHeight: "92vh", overflowY: "auto", padding: "20px 16px 36px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: B.cream, fontFamily: FS }}>{title}</div>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 8, padding: "5px 11px", color: B.cream, cursor: "pointer", fontSize: 13 }}>✕</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{children}</div>
    </div>
  </div>
);

const Bdg = ({ label, color }: any) => (
  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 20, background: `${color}20`, color, fontWeight: 700 }}>{label}</span>
);

const STATUT_CONFIG: Record<string, { label: string; color: string }> = {
  auto_valide: { label: "✅ Auto", color: B.success },
  a_verifier:  { label: "⏳ À vérifier", color: B.warning },
  valide:      { label: "✔ Validé", color: B.info },
  annule:      { label: "✕ Annulé", color: B.muted },
};

const JOURNAL_LABELS: Record<string, string> = {
  ventes: "📈 Ventes", achats: "📉 Achats", caisse: "💵 Caisse",
  banque: "🏦 Banque", paiements: "💳 Paiements", avoirs: "🔄 Avoirs",
};

const MODES: ModesPaiement[] = ["SumUp", "Revolut", "PayPal", "Virement", "Lien_paiement", "Especes", "Stripe", "Autre"];

const today = () => new Date().toISOString().split("T")[0];

const ONGS = [
  { id: "dashboard", l: "📊 Dashboard" },
  { id: "a_verifier", l: "⏳ À valider" },
  { id: "ventes", l: "📈 Ventes" },
  { id: "achats", l: "📉 Achats" },
  { id: "caisse", l: "💵 Caisse" },
  { id: "saisie", l: "✏ Saisie" },
  { id: "export", l: "📤 Export" },
];

// ═══════════════════════════════════════════════════════════
export default function ComptaF({ user }: { user?: any }) {
  const [ong, setOng]               = useState("dashboard");
  const [ecritures, setEcritures]   = useState<EcritureCompta[]>([]);
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState<string | null>(null);
  const [form, setForm]             = useState<any>({});
  const f = (k: string) => (v: any) => setForm((x: any) => ({ ...x, [k]: typeof v === "string" ? v : v?.target?.value ?? v }));

  const reload = useCallback(async () => {
    setLoading(true);
    const data = await chargerEcritures({ limit: 500 });
    setEcritures(data);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const totaux = calculerTotaux(ecritures);

  const ecrituresJournal = (journal: string) =>
    ecritures.filter(e => e.journal === journal && e.statut !== "annule");

  const aValider = ecritures.filter(e => e.statut === "a_verifier");

  // ── Saisie manuelle vente
  const saisirVente = async () => {
    if (!form.libelle?.trim() || !form.montant || !form.pole) return;
    const e = construireEcritureVente({
      date:          form.date || today(),
      libelle:       form.libelle,
      pole:          form.pole,
      montant_ttc:   parseFloat(form.montant),
      tva_pct:       parseFloat(form.tva) || 20,
      mode_paiement: form.mode || "Especes",
      client_nom:    form.client,
      facture_id:    form.facture_id,
      fondatrice_id: user?.id,
    });
    await enregistrerEcriture(e);
    setModal(null); setForm({}); reload();
  };

  // ── Saisie manuelle achat
  const saisirAchat = async () => {
    if (!form.libelle?.trim() || !form.montant || !form.pole) return;
    const e = construireEcritureAchat({
      date:            form.date || today(),
      libelle:         form.libelle,
      pole:            form.pole,
      montant_ttc:     parseFloat(form.montant),
      tva_pct:         parseFloat(form.tva) || 20,
      mode_paiement:   form.mode || "Virement",
      fournisseur_nom: form.fournisseur,
      fondatrice_id:   user?.id,
    });
    await enregistrerEcriture(e);
    setModal(null); setForm({}); reload();
  };

  // ── Valider espèces
  const valider = async (id: string) => {
    await validerEcriture(id);
    reload();
  };

  // ── Annuler
  const annuler = async (id: string) => {
    if (!confirm("Annuler cette écriture ?")) return;
    await annulerEcriture(id);
    reload();
  };

  // ── Export CSV
  const telechargerCSV = (filtreJournal?: string) => {
    const data = filtreJournal
      ? ecritures.filter(e => e.journal === filtreJournal)
      : ecritures;
    const csv = exporterCSV(data);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `bellaia_compta_${filtreJournal || "complet"}_${today()}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // ── Carte écriture
  const CarteEcriture = ({ e, showValidate = false }: { e: EcritureCompta; showValidate?: boolean }) => {
    const sc = STATUT_CONFIG[e.statut] || STATUT_CONFIG.a_verifier;
    return (
      <div style={{ background: B.card, border: `1px solid ${e.statut === "a_verifier" ? B.warning + "50" : B.border}`, borderRadius: 12, padding: "11px 13px", borderLeft: `3px solid ${sc.color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: B.cream, marginBottom: 3 }}>{e.libelle}</div>
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 3 }}>
              <Bdg label={JOURNAL_LABELS[e.journal] || e.journal} color={B.violetL} />
              <Bdg label={e.pole} color={B.gold} />
              <Bdg label={e.mode_paiement} color={isEnLigne(e.mode_paiement) ? B.success : B.warning} />
              <Bdg label={sc.label} color={sc.color} />
            </div>
            <div style={{ fontSize: 10, color: B.muted }}>
              {e.date} · HT : {e.montant_ht.toFixed(2)}€ · TVA : {e.tva.toFixed(2)}€
            </div>
            {e.client_nom && <div style={{ fontSize: 10, color: B.muted }}>👤 {e.client_nom}</div>}
            {e.fournisseur_nom && <div style={{ fontSize: 10, color: B.muted }}>🏭 {e.fournisseur_nom}</div>}
            <div style={{ fontSize: 10, color: B.muted, marginTop: 2 }}>{e.categorie_compta}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: e.type_operation.startsWith("vente") ? B.success : B.danger, fontFamily: FS }}>
              {e.type_operation.startsWith("vente") ? "+" : "-"}{e.montant_ttc.toFixed(2)}€
            </div>
            {showValidate && e.statut === "a_verifier" && (
              <div style={{ display: "flex", gap: 4, marginTop: 6, justifyContent: "flex-end" }}>
                <Btn sm v="success" onClick={() => valider(e.id)}>✔ Valider</Btn>
                <Btn sm v="danger" onClick={() => annuler(e.id)}>✕</Btn>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: B.cream, fontFamily: FS }}>📒 Pré-comptabilité</div>
          <div style={{ fontSize: 10, color: B.muted }}>Ventes auto · Espèces à valider · Journaux · Export</div>
        </div>
        {aValider.length > 0 && (
          <Bdg label={`⏳ ${aValider.length} à valider`} color={B.warning} />
        )}
      </div>

      {/* Règle principale */}
      <div style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 12, padding: "10px 13px" }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: B.success, marginBottom: 3 }}>⚡ Principe Bellaïa</div>
        <div style={{ fontSize: 10, color: B.muted, lineHeight: 1.7 }}>
          <strong style={{ color: B.cream }}>SumUp · Revolut · PayPal · Virement :</strong> enregistrement automatique, statut <em>validé système</em>.<br />
          <strong style={{ color: B.warning }}>Espèces :</strong> pré-rempli automatiquement, <em>validation fondatrice obligatoire</em>.
        </div>
      </div>

      {/* Onglets */}
      <div style={{ display: "flex", gap: 5, overflowX: "auto", WebkitOverflowScrolling: "touch", paddingBottom: 3 }}>
        {ONGS.map(o => (
          <button key={o.id} onClick={() => setOng(o.id)}
            style={{ padding: "5px 11px", borderRadius: 99, border: `1px solid ${ong === o.id ? B.gold : B.border}`, background: ong === o.id ? `${B.gold}18` : "transparent", color: ong === o.id ? B.gold : B.muted, cursor: "pointer", fontSize: 10, fontWeight: ong === o.id ? 700 : 400, whiteSpace: "nowrap", fontFamily: SA }}>
            {o.l}
          </button>
        ))}
      </div>

      {/* ══ DASHBOARD ══ */}
      {ong === "dashboard" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* KPIs globaux */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { l: "CA validé", v: `${totaux.ca_auto.toFixed(2)}€`, c: B.success },
              { l: "CA total", v: `${totaux.ca_total.toFixed(2)}€`, c: B.gold },
              { l: "Achats", v: `${totaux.achats_total.toFixed(2)}€`, c: B.danger },
              { l: "Bénéfice estimé", v: `${totaux.benefice_estime.toFixed(2)}€`, c: totaux.benefice_estime >= 0 ? B.success : B.danger },
            ].map(k => (
              <div key={k.l} style={{ background: `${k.c}10`, border: `1px solid ${k.c}30`, borderRadius: 12, padding: "12px 11px", textAlign: "center" }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: k.c, fontFamily: FS }}>{k.v}</div>
                <div style={{ fontSize: 9, color: B.muted, marginTop: 2 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Alerte espèces à valider */}
          {aValider.length > 0 && (
            <Card style={{ borderColor: `${B.warning}40`, background: `${B.warning}06` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.warning, marginBottom: 6 }}>
                ⏳ {aValider.length} écriture{aValider.length > 1 ? "s" : ""} espèces à valider
              </div>
              <div style={{ fontSize: 10, color: B.muted, marginBottom: 8 }}>Ces opérations en espèces nécessitent votre validation manuelle.</div>
              <Btn sm v="gold" onClick={() => setOng("a_verifier")}>Valider maintenant →</Btn>
            </Card>
          )}

          {/* Par pôle */}
          {Object.keys(totaux.par_pole).length > 0 && (
            <Card>
              <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Activité par pôle</div>
              {Object.entries(totaux.par_pole).map(([pole, data]) => (
                <div key={pole} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: `1px solid ${B.border}` }}>
                  <div>
                    <div style={{ fontSize: 12, color: B.cream, fontWeight: 600 }}>{pole}</div>
                    <div style={{ fontSize: 10, color: B.muted }}>Achats : {data.achats.toFixed(2)}€</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: B.success }}>+{data.ca.toFixed(2)}€</div>
                    <div style={{ fontSize: 10, color: data.benefice >= 0 ? B.success : B.danger }}>≈ {data.benefice.toFixed(2)}€</div>
                  </div>
                </div>
              ))}
            </Card>
          )}

          {/* Accès rapide */}
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="gold" onClick={() => { setForm({ date: today(), tva: "20", mode: "Especes" }); setModal("vente"); }}>+ Vente</Btn>
            <Btn v="ghost" onClick={() => { setForm({ date: today(), tva: "20", mode: "Virement" }); setModal("achat"); }}>+ Achat</Btn>
            <Btn v="ghost" onClick={() => telechargerCSV()}>📤 Export</Btn>
          </div>

          {/* Dernières écritures */}
          <div style={{ fontSize: 11, fontWeight: 700, color: B.muted, textTransform: "uppercase", letterSpacing: "0.05em" }}>Dernières écritures</div>
          {loading ? (
            <div style={{ textAlign: "center", color: B.muted, padding: 16 }}>Chargement…</div>
          ) : ecritures.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", color: B.muted, padding: 16, fontSize: 12 }}>
                Aucune écriture. Saisissez votre première opération ou configurez le SQL pré-comptabilité.
              </div>
            </Card>
          ) : (
            ecritures.slice(0, 5).map(e => <CarteEcriture key={e.id} e={e} />)
          )}
        </div>
      )}

      {/* ══ À VALIDER (ESPÈCES) ══ */}
      {ong === "a_verifier" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.cream }}>
            ⏳ Espèces à valider ({aValider.length})
          </div>
          {aValider.length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", color: B.success, padding: 20, fontSize: 13 }}>
                ✅ Toutes les opérations espèces ont été validées.
              </div>
            </Card>
          ) : (
            <>
              <div style={{ background: `${B.warning}08`, border: `1px solid ${B.warning}30`, borderRadius: 10, padding: "10px 13px" }}>
                <div style={{ fontSize: 10, color: B.warning, fontWeight: 700, marginBottom: 2 }}>⚠ Validation manuelle requise</div>
                <div style={{ fontSize: 10, color: B.muted }}>Vérifiez chaque opération en espèces avant de la valider. La fondatrice est responsable de ces écritures.</div>
              </div>
              {aValider.map(e => <CarteEcriture key={e.id} e={e} showValidate />)}
            </>
          )}
        </div>
      )}

      {/* ══ JOURNAUX ══ */}
      {["ventes", "achats", "caisse"].includes(ong) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: B.cream }}>
              {JOURNAL_LABELS[ong]} ({ecrituresJournal(ong).length})
            </div>
            <Btn sm v="ghost" onClick={() => telechargerCSV(ong)}>📤 CSV</Btn>
          </div>
          {ecrituresJournal(ong).length === 0 ? (
            <Card>
              <div style={{ textAlign: "center", color: B.muted, padding: 16, fontSize: 12 }}>Aucune écriture dans ce journal.</div>
            </Card>
          ) : (
            ecrituresJournal(ong).map(e => <CarteEcriture key={e.id} e={e} showValidate={e.statut === "a_verifier"} />)
          )}
        </div>
      )}

      {/* ══ SAISIE ══ */}
      {ong === "saisie" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.cream }}>Saisie manuelle</div>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="gold" full onClick={() => { setForm({ date: today(), tva: "20", mode: "Especes" }); setModal("vente"); }}>+ Vente</Btn>
            <Btn v="ghost" full onClick={() => { setForm({ date: today(), tva: "20", mode: "Virement" }); setModal("achat"); }}>+ Achat</Btn>
          </div>

          <Card style={{ background: `${B.violet}08` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.violetL, marginBottom: 6 }}>ℹ Règles de saisie</div>
            <div style={{ fontSize: 11, color: B.muted, lineHeight: 1.7 }}>
              • <strong style={{ color: B.cream }}>Paiement en ligne</strong> (SumUp, Revolut…) → validé automatiquement dès saisie.<br />
              • <strong style={{ color: B.warning }}>Espèces</strong> → créé en statut <em>à vérifier</em>, validation fondatrice requise.<br />
              • Tous les champs marqués * sont obligatoires.
            </div>
          </Card>
        </div>
      )}

      {/* ══ EXPORT ══ */}
      {ong === "export" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: B.cream }}>Exports comptables</div>
          <Card style={{ background: `${B.warning}06`, borderColor: `${B.warning}30` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.warning, marginBottom: 4 }}>⚠ Avant export</div>
            <div style={{ fontSize: 10, color: B.muted }}>Vérifiez que toutes les opérations espèces ont été validées. Onglet "À valider" : {aValider.length} en attente.</div>
          </Card>

          {[
            { label: "📈 Journal des ventes", journal: "ventes" },
            { label: "📉 Journal des achats", journal: "achats" },
            { label: "💵 Journal de caisse", journal: "caisse" },
            { label: "🏦 Journal de banque", journal: "banque" },
          ].map(j => (
            <div key={j.journal} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: B.card, border: `1px solid ${B.border}`, borderRadius: 12, padding: "12px 14px" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: B.cream }}>{j.label}</div>
                <div style={{ fontSize: 10, color: B.muted }}>{ecrituresJournal(j.journal).length} écritures</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <Btn sm v="ghost" onClick={() => telechargerCSV(j.journal)}>CSV</Btn>
                <Btn sm v="gold" onClick={() => {
                  const data = ecrituresJournal(j.journal);
                  const lines = [
                    `JOURNAL ${j.label.toUpperCase()} — Bella'Studio — ${today()}`,
                    `${"─".repeat(60)}`,
                    ...data.map(e => `${e.date} | ${e.libelle.padEnd(35)} | ${e.montant_ttc >= 0 ? "+" : ""}${e.montant_ttc.toFixed(2)}€ | ${e.mode_paiement} | ${e.statut}`),
                    `${"─".repeat(60)}`,
                    `Total : ${data.reduce((s, e) => s + e.montant_ttc, 0).toFixed(2)}€`,
                  ].join("\n");
                  const blob = new Blob([lines], { type: "text/plain" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url; a.download = `journal_${j.journal}_${today()}.txt`;
                  a.click(); URL.revokeObjectURL(url);
                }}>TXT</Btn>
              </div>
            </div>
          ))}

          <Btn v="primary" full onClick={() => telechargerCSV()}>
            📤 Export complet CSV — {ecritures.length} écritures
          </Btn>

          <Card style={{ background: `${B.gold}08` }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: B.gold, marginBottom: 4 }}>💼 Pour votre expert-comptable</div>
            <div style={{ fontSize: 10, color: B.muted, lineHeight: 1.7 }}>
              L'export CSV contient : date, libellé, journal, pôle, mode paiement, montant HT, TVA, montant TTC, statut, catégorie, client/fournisseur, source.<br />
              Format compatible avec la plupart des logiciels comptables (Sage, EBP, Ciel).
            </div>
          </Card>
        </div>
      )}

      {/* ══ MODALS ══ */}

      {/* Modal vente */}
      {modal === "vente" && (
        <Mdl title="Saisir une vente" onClose={() => { setModal(null); setForm({}); }}>
          <div style={{ background: isEnLigne(form.mode) ? `${B.success}08` : `${B.warning}08`, border: `1px solid ${isEnLigne(form.mode) ? B.success : B.warning}30`, borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: isEnLigne(form.mode) ? B.success : B.warning, fontWeight: 700 }}>
              {isEnLigne(form.mode) ? "⚡ Paiement en ligne → validé automatiquement" : "⏳ Espèces → validation fondatrice requise"}
            </div>
          </div>
          <Fld label="Libellé *"><Inp value={form.libelle} onChange={f("libelle")} placeholder="Ex: Vente extension cils Bella'Odyssée" /></Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="Date *"><Inp type="date" value={form.date} onChange={f("date")} /></Fld>
            <Fld label="Montant TTC (€) *"><Inp type="number" value={form.montant} onChange={f("montant")} placeholder="0.00" /></Fld>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="TVA (%)"><Inp type="number" value={form.tva} onChange={f("tva")} placeholder="20" /></Fld>
            <Fld label="Mode paiement *">
              <Sel value={form.mode} onChange={f("mode")} options={MODES} />
            </Fld>
          </div>
          <Fld label="Pôle *">
            <Sel value={form.pole} onChange={f("pole")} options={["", ...POLES.map((p: any) => p.id)]} />
          </Fld>
          <Fld label="Client"><Inp value={form.client} onChange={f("client")} placeholder="Nom du client" /></Fld>
          <Fld label="N° Facture liée"><Inp value={form.facture_id} onChange={f("facture_id")} placeholder="ID facture (optionnel)" /></Fld>
          <Fld label="Notes"><Inp value={form.notes} onChange={f("notes")} placeholder="Notes" rows={2} /></Fld>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="gold" full onClick={saisirVente} disabled={!form.libelle?.trim() || !form.montant || !form.pole}>Enregistrer</Btn>
            <Btn v="ghost" onClick={() => { setModal(null); setForm({}); }}>Annuler</Btn>
          </div>
        </Mdl>
      )}

      {/* Modal achat */}
      {modal === "achat" && (
        <Mdl title="Saisir un achat" onClose={() => { setModal(null); setForm({}); }}>
          <div style={{ background: `${B.info}08`, border: `1px solid ${B.info}30`, borderRadius: 10, padding: "8px 12px" }}>
            <div style={{ fontSize: 10, color: B.info, fontWeight: 700 }}>📦 L'achat sera lié au pôle sélectionné et classé automatiquement.</div>
          </div>
          <Fld label="Libellé *"><Inp value={form.libelle} onChange={f("libelle")} placeholder="Ex: Achat riz Bella'Food" /></Fld>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="Date *"><Inp type="date" value={form.date} onChange={f("date")} /></Fld>
            <Fld label="Montant TTC (€) *"><Inp type="number" value={form.montant} onChange={f("montant")} placeholder="0.00" /></Fld>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <Fld label="TVA (%)"><Inp type="number" value={form.tva} onChange={f("tva")} placeholder="20" /></Fld>
            <Fld label="Mode paiement">
              <Sel value={form.mode} onChange={f("mode")} options={MODES} />
            </Fld>
          </div>
          <Fld label="Pôle *">
            <Sel value={form.pole} onChange={f("pole")} options={["", ...POLES.map((p: any) => p.id)]} />
          </Fld>
          <Fld label="Fournisseur"><Inp value={form.fournisseur} onChange={f("fournisseur")} placeholder="Nom du fournisseur" /></Fld>
          <Fld label="Notes"><Inp value={form.notes} onChange={f("notes")} placeholder="Notes" rows={2} /></Fld>
          <div style={{ display: "flex", gap: 8 }}>
            <Btn v="primary" full onClick={saisirAchat} disabled={!form.libelle?.trim() || !form.montant || !form.pole}>Enregistrer</Btn>
            <Btn v="ghost" onClick={() => { setModal(null); setForm({}); }}>Annuler</Btn>
          </div>
        </Mdl>
      )}
    </div>
  );
}

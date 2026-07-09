// ═══════════════════════════════════════════════════════════
// ComptaF — Pré-comptabilité Transversale Bellaïa
// CA · Factures · Paiements · Dépenses · Export CSV
// Lit bellaia_factures + bellaia_paiements + bellaia_commandes
// src/modules/compta/ComptaF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";

const SA = "system-ui, -apple-system, sans-serif";
const FS = "Georgia, 'Times New Roman', serif";
const CLR = {
  vert:"#15803d", vertL:"#22c55e",
  or:"#c9a96e",   creamD:"rgba(245,240,232,0.6)",
  card:"rgba(255,255,255,0.04)", line:"rgba(255,255,255,0.1)",
  danger:"#f87171", warn:"#fb923c",
};

// ── Supabase ───────────────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
async function tok(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
}
async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers: { apikey:SB_KEY(), Authorization:"Bearer " + await tok() },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

// ── Types locaux ───────────────────────────────────────────
interface LigneFacture {
  id:         string;
  reference:  string;
  clientNom:  string;
  total:      number;
  statut:     string;
  bu:         string;
  date:       string;
  acompte?:   number;
  solde?:     number;
}
interface LignePaiement {
  id:        string;
  reference: string;
  montant:   number;
  date:      string;
  statut:    string;
  bu:        string;
  notes?:    string;
}

type Periode = "mois"|"trimestre"|"annee"|"tout";

const MOIS_LABELS = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
const BU_LABELS: Record<string, string> = {
  FOOD:"🍃 Food", EVENTS:"✨ Events", BSH:"💜 BSH",
  ODYSSEE:"💅 Odyssée", GENERAL:"📦 Général",
};

function fmtPrix(n: number): string {
  return n.toFixed(2).replace(".",",") + " €";
}
function fmtDate(s: string): string {
  try { return new Date(s).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}); }
  catch { return s; }
}
function moisActuel(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

const STATUT_COL: Record<string, string> = {
  emise:"#fb923c", envoyee:"#60a5fa", payee:"#22c55e",
  partiellement_payee:"#c9a96e", annulee:"#f87171",
  FACTURE:"#fb923c", ACOMPTE_RECU:"#c9a96e", SOLDE_RECU:"#22c55e",
};

// ══════════════════════════════════════════════════════════
export default function ComptaF({ user }: { user?: any }) {
  const [factures,   setFactures]   = useState<LigneFacture[]>([]);
  const [paiements,  setPaiements]  = useState<LignePaiement[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [source,     setSource]     = useState<"local"|"supabase">("local");
  const [onglet,     setOnglet]     = useState<"dashboard"|"factures"|"paiements"|"export">("dashboard");
  const [periode,    setPeriode]    = useState<Periode>("mois");
  const [filtreBU,   setFiltreBU]   = useState<string>("tous");

  // Chargement
  useEffect(() => {
    setLoading(true);
    Promise.all([
      sbGet("bellaia_factures",
        "order=created_at.desc&limit=200&select=id,reference,client_nom,total_ttc,statut,business_unit,created_at,acompte,solde"),
      sbGet("bellaia_paiements",
        "order=date_paiement.desc&limit=200&select=id,reference,montant,date_paiement,statut,business_unit,notes"),
    ]).then(([facs, pays]) => {
      if (facs.length > 0 || pays.length > 0) {
        setFactures(facs.map(f => ({
          id:f.id, reference:f.reference, clientNom:f.client_nom,
          total:f.total_ttc||0, statut:f.statut, bu:f.business_unit||"GENERAL",
          date:f.created_at, acompte:f.acompte, solde:f.solde,
        })));
        setPaiements(pays.map(p => ({
          id:p.id, reference:p.reference, montant:p.montant||0,
          date:p.date_paiement||p.created_at, statut:p.statut,
          bu:p.business_unit||"GENERAL", notes:p.notes,
        })));
        setSource("supabase");
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Filtrage par période
  const filtrerParPeriode = <T extends {date:string}>(items: T[]): T[] => {
    const now  = new Date();
    const mois = now.getMonth();
    const an   = now.getFullYear();
    return items.filter(i => {
      const d = new Date(i.date);
      if (periode === "mois")      return d.getFullYear()===an && d.getMonth()===mois;
      if (periode === "trimestre") {
        const q = Math.floor(mois/3);
        return d.getFullYear()===an && Math.floor(d.getMonth()/3)===q;
      }
      if (periode === "annee")     return d.getFullYear()===an;
      return true;
    });
  };

  const facturesFiltrees = useMemo(() => {
    let f = filtrerParPeriode(factures);
    if (filtreBU !== "tous") f = f.filter(x => x.bu === filtreBU);
    return f;
  }, [factures, periode, filtreBU]);

  const paiementsFiltres = useMemo(() => {
    let p = filtrerParPeriode(paiements);
    if (filtreBU !== "tous") p = p.filter(x => x.bu === filtreBU);
    return p;
  }, [paiements, periode, filtreBU]);

  const kpis = useMemo(() => {
    const caTotalFac    = facturesFiltrees.reduce((s,f) => s+f.total, 0);
    const encaisse      = paiementsFiltres.filter(p=>p.statut==="confirme"||p.statut==="payee").reduce((s,p)=>s+p.montant,0);
    const enAttente     = facturesFiltrees.filter(f=>["emise","envoyee","partiellement_payee"].includes(f.statut)).reduce((s,f)=>s+f.total,0);
    const payees        = facturesFiltrees.filter(f=>f.statut==="payee").length;
    const nbFactures    = facturesFiltrees.length;
    const tauxRecouvrement = caTotalFac > 0 ? Math.round(encaisse/caTotalFac*100) : 0;

    // Répartition par BU
    const parBU: Record<string,number> = {};
    facturesFiltrees.forEach(f => {
      parBU[f.bu] = (parBU[f.bu]||0) + f.total;
    });

    // Évolution mensuelle (12 derniers mois)
    const maintenant = new Date();
    const evolMois: {mois:string; ca:number; paye:number}[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(maintenant.getFullYear(), maintenant.getMonth()-i, 1);
      const mStr = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      const facsMois = factures.filter(f => f.date?.startsWith(mStr));
      const paysMois = paiements.filter(p => p.date?.startsWith(mStr));
      evolMois.push({
        mois: MOIS_LABELS[d.getMonth()] + " " + String(d.getFullYear()).slice(-2),
        ca:   facsMois.reduce((s,f)=>s+f.total,0),
        paye: paysMois.reduce((s,p)=>s+p.montant,0),
      });
    }

    return { caTotalFac, encaisse, enAttente, payees, nbFactures, tauxRecouvrement, parBU, evolMois };
  }, [facturesFiltrees, paiementsFiltres, factures, paiements]);

  const exportCSV = () => {
    const lignes = [
      ["Référence","Client","Total","Statut","Module","Date"].join(";"),
      ...facturesFiltrees.map(f =>
        [f.reference, f.clientNom, f.total.toFixed(2), f.statut, f.bu, fmtDate(f.date)].join(";")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF"+lignes], {type:"text/csv;charset=utf-8;"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `bellaïa_compta_${moisActuel()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return (
    <div style={{ textAlign:"center", padding:40, color:CLR.creamD, fontFamily:SA }}>
      Chargement des données comptables…
    </div>
  );

  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CLR.or }}>📒 Pré-comptabilité</div>
          <div style={{ fontSize:10, color:source==="supabase"?CLR.vertL:"rgba(255,255,255,0.35)" }}>
            {source==="supabase"?"✅ Données Supabase":"📦 Aucune donnée Supabase"}
            {" · "}{factures.length} factures · {paiements.length} paiements
          </div>
        </div>
        <button onClick={exportCSV}
          style={{ background:"rgba(201,168,76,0.15)", border:`1px solid ${CLR.or}44`,
            borderRadius:8, padding:"6px 12px", color:CLR.or,
            fontWeight:700, fontSize:11, cursor:"pointer", fontFamily:SA }}>
          ⬇ CSV
        </button>
      </div>

      {/* Filtres période + BU */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {(["mois","trimestre","annee","tout"] as Periode[]).map(p => (
          <button key={p} onClick={() => setPeriode(p)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:periode===p?CLR.vert:"rgba(255,255,255,0.07)",
              color:periode===p?"#fff":"rgba(255,255,255,0.5)" }}>
            {p==="mois"?"Ce mois":p==="trimestre"?"Ce trimestre":p==="annee"?"Cette année":"Tout"}
          </button>
        ))}
        <div style={{ width:1, height:20, background:CLR.line, alignSelf:"center" }}/>
        {(["tous","FOOD","EVENTS","BSH","ODYSSEE","GENERAL"] as const).map(bu => (
          <button key={bu} onClick={() => setFiltreBU(bu)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, fontFamily:SA,
              background:filtreBU===bu?CLR.vert:"rgba(255,255,255,0.07)",
              color:filtreBU===bu?"#fff":"rgba(255,255,255,0.5)" }}>
            {bu==="tous"?"Tous pôles":BU_LABELS[bu]||bu}
          </button>
        ))}
      </div>

      {/* Onglets */}
      <div style={{ display:"flex", gap:5 }}>
        {([
          ["dashboard","📊","Dashboard"],
          ["factures","🧾","Factures"],
          ["paiements","💳","Paiements"],
        ] as const).map(([id, ico, label]) => (
          <button key={id} onClick={() => setOnglet(id)}
            style={{ flex:1, padding:"7px", borderRadius:9, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, fontFamily:SA,
              background:onglet===id?CLR.vert:"rgba(255,255,255,0.06)",
              color:onglet===id?"#fff":"rgba(255,255,255,0.5)" }}>
            {ico} {label}
          </button>
        ))}
      </div>

      {/* ── DASHBOARD ── */}
      {onglet === "dashboard" && (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {/* KPI grid */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
            {[
              {l:"CA facturé",        v:fmtPrix(kpis.caTotalFac),   col:CLR.or},
              {l:"Encaissé",          v:fmtPrix(kpis.encaisse),     col:CLR.vertL},
              {l:"En attente",        v:fmtPrix(kpis.enAttente),    col:"#fb923c"},
              {l:"Taux recouvrement", v:kpis.tauxRecouvrement+"%",  col:kpis.tauxRecouvrement>70?CLR.vertL:"#fb923c"},
            ].map(k => (
              <div key={k.l} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
                borderRadius:10, padding:"12px", textAlign:"center" }}>
                <div style={{ fontSize:18, fontWeight:700, color:k.col }}>{k.v}</div>
                <div style={{ fontSize:9, color:CLR.creamD, marginTop:2 }}>{k.l}</div>
              </div>
            ))}
          </div>

          {/* Répartition par pôle */}
          <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:CLR.or, marginBottom:8 }}>
              Répartition par pôle
            </div>
            {Object.entries(kpis.parBU).sort((a,b)=>b[1]-a[1]).map(([bu, ca]) => {
              const pct = kpis.caTotalFac > 0 ? Math.round(ca/kpis.caTotalFac*100) : 0;
              return (
                <div key={bu} style={{ marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between",
                    fontSize:11, marginBottom:4 }}>
                    <span style={{ color:"#fff" }}>{BU_LABELS[bu]||bu}</span>
                    <span style={{ color:CLR.or, fontWeight:700 }}>{fmtPrix(ca)} ({pct}%)</span>
                  </div>
                  <div style={{ height:4, background:"rgba(255,255,255,0.08)", borderRadius:2 }}>
                    <div style={{ height:4, width:`${pct}%`, background:CLR.vert,
                      borderRadius:2, transition:"width 0.4s" }}/>
                  </div>
                </div>
              );
            })}
            {Object.keys(kpis.parBU).length === 0 && (
              <div style={{ fontSize:11, color:CLR.creamD, fontStyle:"italic" }}>
                Aucune donnée disponible.
              </div>
            )}
          </div>

          {/* Évolution mensuelle */}
          <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
            borderRadius:12, padding:"12px 14px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:CLR.or, marginBottom:10 }}>
              Évolution 12 derniers mois
            </div>
            <div style={{ display:"flex", gap:4, alignItems:"flex-end", height:80 }}>
              {kpis.evolMois.map((m, i) => {
                const max = Math.max(...kpis.evolMois.map(x=>x.ca), 1);
                const pct = Math.round(m.ca/max*100);
                const isCurrentMonth = i === 11;
                return (
                  <div key={m.mois} style={{ flex:1, display:"flex",
                    flexDirection:"column", alignItems:"center", gap:2 }}>
                    <div style={{ width:"100%", height:`${Math.max(pct,2)}%`,
                      minHeight:3,
                      background:isCurrentMonth?CLR.vert:"rgba(21,128,61,0.35)",
                      borderRadius:"3px 3px 0 0", transition:"height 0.3s" }}/>
                    <div style={{ fontSize:7, color:"rgba(255,255,255,0.35)",
                      textAlign:"center", writingMode:"vertical-lr" as const,
                      transform:"rotate(180deg)", height:28 }}>
                      {m.mois}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FACTURES ── */}
      {onglet === "factures" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          {facturesFiltrees.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CLR.creamD, fontStyle:"italic" }}>
              {source==="local"
                ? "Aucune facture dans Supabase. Créez des factures via le module Events ou le Workflow ERP."
                : "Aucune facture pour cette période."}
            </div>
          )}
          {facturesFiltrees.map(f => {
            const col = STATUT_COL[f.statut] || CLR.creamD;
            return (
              <div key={f.id} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
                borderRadius:11, padding:"11px 13px",
                display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <div>
                  <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>
                    {f.clientNom}
                  </div>
                  <div style={{ fontSize:10, color:CLR.creamD }}>
                    {f.reference} · {BU_LABELS[f.bu]||f.bu}
                  </div>
                  <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:1 }}>
                    {fmtDate(f.date)}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:14, fontWeight:700, color:CLR.or }}>
                    {fmtPrix(f.total)}
                  </div>
                  <span style={{ fontSize:8, background:col+"22", color:col,
                    border:`1px solid ${col}44`, borderRadius:3, padding:"1px 6px", fontWeight:700 }}>
                    {f.statut}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── PAIEMENTS ── */}
      {onglet === "paiements" && (
        <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
          <div style={{ background:"rgba(21,128,61,0.1)", border:"1px solid rgba(21,128,61,0.3)",
            borderRadius:10, padding:"10px 13px" }}>
            <div style={{ fontSize:11, fontWeight:700, color:CLR.vertL }}>
              Total encaissé — {fmtPrix(paiementsFiltres.reduce((s,p)=>s+p.montant,0))}
            </div>
            <div style={{ fontSize:10, color:CLR.creamD, marginTop:2 }}>
              {paiementsFiltres.length} paiement{paiementsFiltres.length>1?"s":""} sur la période
            </div>
          </div>
          {paiementsFiltres.length === 0 && (
            <div style={{ textAlign:"center", padding:"24px", color:CLR.creamD, fontStyle:"italic" }}>
              Aucun paiement enregistré pour cette période.
            </div>
          )}
          {paiementsFiltres.map(p => (
            <div key={p.id} style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:11, padding:"11px 13px",
              display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff" }}>{p.reference}</div>
                <div style={{ fontSize:10, color:CLR.creamD }}>
                  {BU_LABELS[p.bu]||p.bu}
                  {p.notes ? " · " + p.notes.slice(0,40) : ""}
                </div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)" }}>
                  {fmtDate(p.date)}
                </div>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:CLR.vertL }}>
                + {fmtPrix(p.montant)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// GlobalSearch.tsx — Recherche Globale Bellaïa
// Transversal : clients, devis, factures, recettes, produits...
// src/modules/search/GlobalSearch.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";
import type {
  CriteresRecherche, ResultatRecherche, ModuleSearch,
} from "./searchTypes";
import {
  rechercherGlobal, TYPE_LABELS, TYPE_COLORS, fmtPrix,
} from "./searchUtils";

const SA = "system-ui, -apple-system, sans-serif";
const CLR = {
  vert:"#15803d", vertL:"#22c55e",
  or:"#c9a96e", creamD:"rgba(245,240,232,0.6)",
  card:"rgba(255,255,255,0.04)", line:"rgba(255,255,255,0.1)",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const MODULES_FILTRES: { id: ModuleSearch | "tous"; label: string; ico: string }[] = [
  {id:"tous",       label:"Tout",        ico:"🔍"},
  {id:"clients",    label:"Clients",     ico:"👤"},
  {id:"devis",      label:"Devis",       ico:"📄"},
  {id:"commandes",  label:"Commandes",   ico:"📦"},
  {id:"factures",   label:"Factures",    ico:"🧾"},
  {id:"recettes",   label:"Recettes",    ico:"📖"},
  {id:"produits",   label:"Produits",    ico:"🛍"},
  {id:"stocks",     label:"Stocks",      ico:"📦"},
];

interface Props {
  profil?: "fondatrice" | "client" | "hote";
  clientId?: string;
  onResultatClick?: (r: ResultatRecherche) => void;
  placeholder?: string;
  compact?: boolean;        // mode barre de recherche compacte
}

export default function GlobalSearch({
  profil = "fondatrice",
  clientId,
  onResultatClick,
  placeholder = "🔍 Rechercher clients, devis, factures, recettes…",
  compact = false,
}: Props) {
  const [query,     setQuery]     = useState("");
  const [module,    setModule]    = useState<ModuleSearch | "tous">("tous");
  const [resultats, setResultats] = useState<ResultatRecherche[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [source,    setSource]    = useState<"supabase"|"local"|"mixte"|null>(null);
  const [dureeMs,   setDureeMs]   = useState<number|null>(null);
  const [total,     setTotal]     = useState(0);
  const [actif,     setActif]     = useState(false);

  const inputRef  = useRef<HTMLInputElement>(null);
  const timerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce de 350ms
  const lancer = useCallback(async (q: string, mod: ModuleSearch | "tous") => {
    if (!q.trim() && mod === "tous") {
      setResultats([]); setTotal(0); return;
    }
    setLoading(true);
    const criteres: CriteresRecherche = {
      texte:    q,
      module:   mod,
      profil,
      clientId,
    };
    const rep = await rechercherGlobal(criteres);
    setResultats(rep.resultats);
    setTotal(rep.total);
    setSource(rep.source);
    setDureeMs(rep.dureeMs);
    setLoading(false);
  }, [profil, clientId]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => lancer(query, module), 350);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [query, module, lancer]);

  const handleClick = (r: ResultatRecherche) => {
    onResultatClick?.(r);
    if (compact) setActif(false);
  };

  // ── Mode compact : barre inline avec dropdown ──────────
  if (compact) return (
    <div style={{ position:"relative" }}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => { setQuery(e.target.value); setActif(true); }}
        onFocus={() => setActif(true)}
        placeholder={placeholder}
        style={{ ...inp, paddingLeft:12 }}
      />
      {actif && (query.trim() || resultats.length > 0) && (
        <div style={{
          position:"absolute", top:"calc(100% + 6px)", left:0, right:0,
          background:"#0d1117", border:`1px solid ${CLR.line}`, borderRadius:12,
          boxShadow:"0 8px 32px rgba(0,0,0,0.6)", zIndex:500,
          maxHeight:320, overflowY:"auto",
        }}>
          {loading && (
            <div style={{ padding:"12px 16px", fontSize:11, color:CLR.creamD }}>Recherche…</div>
          )}
          {!loading && resultats.length === 0 && query.trim() && (
            <div style={{ padding:"12px 16px", fontSize:11, color:CLR.creamD, fontStyle:"italic" }}>
              Aucun résultat pour « {query} »
            </div>
          )}
          {resultats.map(r => (
            <div key={r.id} onClick={() => handleClick(r)}
              style={{ padding:"10px 14px", cursor:"pointer", borderBottom:`1px solid ${CLR.line}`,
                display:"flex", gap:10, alignItems:"center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
              <span style={{ fontSize:16, flexShrink:0 }}>{TYPE_LABELS[r.type]?.split(" ")[0]}</span>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:600, color:"#fff",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {r.titre}
                </div>
                {r.sousTitre && (
                  <div style={{ fontSize:10, color:CLR.creamD }}>{r.sousTitre}</div>
                )}
              </div>
              {r.montant != null && (
                <div style={{ fontSize:11, fontWeight:700, color:CLR.or, flexShrink:0 }}>
                  {fmtPrix(r.montant)}
                </div>
              )}
            </div>
          ))}
          <div style={{ padding:"6px 14px", fontSize:9, color:"rgba(255,255,255,0.3)",
            borderTop:resultats.length > 0 ? `1px solid ${CLR.line}` : "none" }}>
            Appuyez sur Échap pour fermer
          </div>
        </div>
      )}
    </div>
  );

  // ── Mode plein écran ───────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:SA }}>
      {/* Barre de recherche */}
      <div style={{ position:"relative" }}>
        <input
          ref={inputRef}
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          autoFocus
          style={{ ...inp, padding:"12px 16px", fontSize:15, borderRadius:12 }}
        />
        {loading && (
          <div style={{ position:"absolute", right:14, top:"50%", transform:"translateY(-50%)",
            fontSize:11, color:CLR.creamD }}>
            …
          </div>
        )}
        {query && (
          <button onClick={() => { setQuery(""); setResultats([]); }}
            style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)",
              background:"none", border:"none", color:CLR.creamD, cursor:"pointer", fontSize:16 }}>
            ✕
          </button>
        )}
      </div>

      {/* Filtres par module */}
      <div style={{ display:"flex", gap:5, overflowX:"auto", paddingBottom:2 }}>
        {MODULES_FILTRES.map(f => (
          <button key={f.id} onClick={() => setModule(f.id)}
            style={{ padding:"5px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:10, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:module===f.id?CLR.vert:"rgba(255,255,255,0.07)",
              color:module===f.id?"#fff":"rgba(255,255,255,0.5)" }}>
            {f.ico} {f.label}
          </button>
        ))}
      </div>

      {/* Infos résultats */}
      {(total > 0 || (query.trim() && !loading)) && (
        <div style={{ fontSize:10, color:"rgba(255,255,255,0.4)" }}>
          {total} résultat{total > 1 ? "s" : ""}
          {dureeMs != null ? ` · ${dureeMs}ms` : ""}
          {source ? ` · ${source}` : ""}
        </div>
      )}

      {/* Résultats */}
      {!loading && resultats.length === 0 && query.trim() && (
        <div style={{ textAlign:"center", padding:"32px", color:CLR.creamD, fontStyle:"italic" }}>
          Aucun résultat pour « {query} »
        </div>
      )}

      {!query.trim() && resultats.length === 0 && (
        <div style={{ textAlign:"center", padding:"24px", color:"rgba(255,255,255,0.3)" }}>
          <div style={{ fontSize:32, marginBottom:10 }}>🔍</div>
          <div style={{ fontSize:13 }}>Tapez votre recherche</div>
          <div style={{ fontSize:11, marginTop:6, lineHeight:1.6 }}>
            Clients · Devis · Factures · Recettes · Produits · Stocks
          </div>
        </div>
      )}

      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {resultats.map(r => {
          const couleur = TYPE_COLORS[r.type] || CLR.creamD;
          return (
            <div key={r.id} onClick={() => handleClick(r)}
              style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
                borderRadius:12, padding:"12px 14px", cursor:"pointer",
                display:"flex", gap:12, alignItems:"center" }}
              onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.07)")}
              onMouseLeave={e => (e.currentTarget.style.background = CLR.card)}>

              {/* Badge type */}
              <div style={{ width:36, height:36, borderRadius:8, flexShrink:0,
                background:couleur + "18",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize:16 }}>
                {TYPE_LABELS[r.type]?.split(" ")[0] || "📌"}
              </div>

              {/* Contenu */}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", gap:6, alignItems:"baseline", marginBottom:2 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:"#fff",
                    overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {r.titre}
                  </div>
                  {r.reference && (
                    <span style={{ fontSize:9, color:CLR.creamD, flexShrink:0 }}>
                      {r.reference}
                    </span>
                  )}
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  {r.sousTitre && (
                    <span style={{ fontSize:10, color:CLR.creamD }}>{r.sousTitre}</span>
                  )}
                  {r.statut && (
                    <span style={{ fontSize:8, background:"rgba(255,255,255,0.08)",
                      color:"rgba(255,255,255,0.5)", borderRadius:3, padding:"1px 6px" }}>
                      {r.statut}
                    </span>
                  )}
                  <span style={{ fontSize:9, color:couleur, fontWeight:700, marginLeft:"auto" }}>
                    {TYPE_LABELS[r.type]?.split(" ").slice(1).join(" ") || r.module}
                  </span>
                </div>
              </div>

              {/* Montant */}
              {r.montant != null && (
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:CLR.or }}>
                    {fmtPrix(r.montant)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

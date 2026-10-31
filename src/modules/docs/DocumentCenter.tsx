// ═══════════════════════════════════════════════════════════
// DocumentCenter.tsx — GED Centrale Bellaïa
// Tous les documents en un seul endroit
// Upload · Prévisualisation · Liens modules · Versions
// src/modules/docs/DocumentCenter.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useMemo } from "react";
import type { Document, ModuleDocument, TypeDocument, FiltreDocuments } from "./documentsTypes";

const SA = "system-ui, -apple-system, sans-serif";
const CLR = {
  vert:"#15803d", vertL:"#22c55e",
  or:"#c9a96e",   creamD:"rgba(245,240,232,0.6)",
  card:"rgba(255,255,255,0.04)", line:"rgba(255,255,255,0.1)",
  danger:"#f87171", night:"#0d1117",
};
const inp: React.CSSProperties = {
  background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.12)",
  borderRadius:8, padding:"8px 10px", color:"#fff", fontSize:12,
  fontFamily:SA, outline:"none", width:"100%", boxSizing:"border-box",
};

const TYPE_ICO: Record<TypeDocument, string> = {
  devis:"📄", facture:"🧾", commande:"📦", bon_livraison:"🚚",
  contrat:"📝", fiche_produit:"🛍", recette:"📖", haccp:"✅",
  roman:"📕", ebook:"📚", support_ped:"🎓", post_social:"📱",
  affiche:"🖼", flyer:"📋", photo:"📸", pdf:"📑",
  document_admin:"🗂", autre:"📌",
};

const MODULE_ICO: Record<ModuleDocument, string> = {
  FOOD:"🍃", EVENTS:"✨", BSH:"💜", ODYSSEE:"💆",
  EDITIONS:"📚", MOTIPY:"🌿", VILO:"🤝", ERP:"⚙", GENERAL:"📦",
};

const STATUT_COL: Record<string, string> = {
  brouillon:"#c9a96e", valide:"#22c55e", envoye:"#60a5fa",
  archive:"rgba(255,255,255,0.35)", supprime:"#f87171",
};

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR",
      { day:"2-digit", month:"short", year:"numeric" });
  } catch { return iso; }
}

function fmtTaille(n?: number): string {
  if (!n) return "";
  if (n < 1024)       return n + " o";
  if (n < 1024*1024)  return (n/1024).toFixed(1) + " Ko";
  return (n/1024/1024).toFixed(1) + " Mo";
}

function genRef(): string {
  return "DOC-" + new Date().getFullYear() + "-" + Date.now().toString().slice(-6);
}

// ── Supabase helpers ───────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// window.getTokenAsync n'a jamais existé nulle part dans le code —
// chaque appel retombait silencieusement sur la clé anon, donc RLS
// ne renvoyait jamais rien (ni les documents de la fondatrice, ni
// ceux d'une cliente ou d'une hôtesse) : "0 document" même quand la
// base en contient réellement. Lit directement le même jeton de
// session que le reste de l'app (localStorage "bellaia_token").
async function getToken(): Promise<string> {
  if (typeof window === "undefined") return SB_KEY();
  return localStorage.getItem("bellaia_token") || SB_KEY();
}

async function sbGet(table: string, params: string): Promise<any[]> {
  if (!SB_URL()) return [];
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}?${params}`, {
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await getToken() },
    });
    if (!r.ok) return [];
    const d = await r.json();
    return Array.isArray(d) ? d : [];
  } catch { return []; }
}

async function sbPost(table: string, body: object): Promise<any> {
  if (!SB_URL()) return null;
  try {
    const r = await fetch(`${SB_URL()}/rest/v1/${table}`, {
      method:"POST",
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await getToken(),
        "Content-Type":"application/json", Prefer:"return=representation" },
      body: JSON.stringify(body),
    });
    if (!r.ok) return null;
    const d = await r.json();
    return Array.isArray(d) ? d[0] : d;
  } catch { return null; }
}

async function sbPatch(table: string, id: string, body: object): Promise<void> {
  if (!SB_URL()) return;
  try {
    await fetch(`${SB_URL()}/rest/v1/${table}?id=eq.${id}`, {
      method:"PATCH",
      headers:{ apikey:SB_KEY(), Authorization:"Bearer "+await getToken(),
        "Content-Type":"application/json", Prefer:"return=minimal" },
      body: JSON.stringify(body),
    });
  } catch {}
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════
const FORM0: Partial<Document> = {
  module:"GENERAL", type:"autre", statut:"brouillon", version:1,
};

export default function DocumentCenter({ moduleInitial }: { moduleInitial?: ModuleDocument } = {}) {
  const [docs,    setDocs]    = useState<Document[]>([]);
  const [detail,  setDetail]  = useState<Document|null>(null);
  const [modal,   setModal]   = useState<"form"|null>(null);
  const [form,    setForm]    = useState<Partial<Document>>(moduleInitial ? {...FORM0, module:moduleInitial} : FORM0);
  const [filtre,  setFiltre]  = useState<FiltreDocuments>({ module:moduleInitial || "tous", type:"tous", statut:"tous" });
  const [source,  setSource]  = useState<"local"|"supabase">("local");
  const [saving,  setSaving]  = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [hotes, setHotes] = useState<{id:string; nom:string}[]>([]);

  useEffect(() => {
    sbGet("bsh_hotes", "order=nom.asc&select=id,nom,prenom").then(rows => {
      setHotes(rows.map((r:any) => ({ id:r.id, nom:[r.prenom, r.nom].filter(Boolean).join(" ") || r.id })));
    });
  }, []);

  // Chargement depuis Supabase — noms de colonnes alignés sur le vrai
  // schéma de bellaia_documents (vérifié en base le 2026-10-26, voir
  // migration 0017) : pas de colonnes "type"/"url"/"taille"/
  // "mime_type"/"client_nom"/"devis_ref"/"commande_ref"/"facture_ref",
  // la vraie table utilise type_fichier/fichier_url/taille_bytes/
  // type_mime/hote_id. client_nom/devis_ref/commande_ref/facture_ref
  // n'ont pas d'équivalent : repliés dans "notes" à l'écriture.
  useEffect(() => {
    sbGet("bellaia_documents",
      "statut=neq.supprime&order=created_at.desc&limit=100"
    ).then(rows => {
      if (rows.length) {
        setDocs(rows.map((r:any): Document => ({
          id:r.id, reference:r.reference, titre:r.titre,
          module:r.module, type:r.type_fichier, categorie:r.categorie,
          url:r.fichier_url, storagePath:r.storage_path,
          taille:r.taille_bytes ?? r.taille_octets, mimeType:r.type_mime,
          clientId:r.client_id, hoteId:r.hote_id,
          statut:r.statut, version:r.version||1, tags:r.tags||[], notes:r.notes,
          createdAt:r.created_at, updatedAt:r.updated_at,
        })));
        setSource("supabase");
      }
    }).catch(()=>{});
  }, []);

  // Filtrer
  const visibles = useMemo(() => docs.filter(d => {
    if (filtre.module !== "tous" && d.module !== filtre.module) return false;
    if (filtre.type   !== "tous" && d.type   !== filtre.type)   return false;
    if (filtre.statut !== "tous" && d.statut !== filtre.statut) return false;
    if (filtre.texte && ![d.titre, d.reference, d.clientNom, ...(d.tags||[])].some(
      s => s?.toLowerCase().includes(filtre.texte!.toLowerCase())
    )) return false;
    return true;
  }), [docs, filtre]);

  // Créer OU modifier un document — form._edit (id réel) distingue les
  // deux cas, pour ne pas dépendre de l'IA à chaque correction de texte.
  const creer = async () => {
    if (!form.titre?.trim()) return;
    setSaving(true);
    const editId = (form as any)._edit as string | undefined;
    const nv: Document = {
      ...FORM0, ...form,
      id:        editId || ("doc_" + Date.now().toString().slice(-8)),
      reference: form.reference || genRef(),
      version:   editId ? (form.version || 1) : 1,
      statut:    form.statut || "brouillon",
      createdAt: form.createdAt || new Date().toISOString(),
    } as Document;
    if (!editId) setDocs(ds => [nv, ...ds]);
    else setDocs(ds => ds.map(d => d.id === editId ? nv : d));
    // Colonnes réelles de bellaia_documents (migration 0017) — pas de
    // client_nom/devis_ref/commande_ref/facture_ref en base : repliés
    // dans "notes" pour ne rien perdre de ce que le formulaire collecte.
    const notesCompletes = [
      nv.notes,
      nv.clientNom && `Client : ${nv.clientNom}`,
    ].filter(Boolean).join(" · ") || null;
    const payload = {
      reference:    nv.reference,
      titre:        nv.titre,
      module:       nv.module,
      type_fichier: nv.type,
      categorie:    nv.categorie,
      contenu_html: nv.contenuHtml || null,
      fichier_url:  nv.url || null,
      storage_path: nv.storagePath || null,
      client_id:    nv.clientId || null,
      hote_id:      nv.hoteId || null,
      statut:       nv.statut,
      tags:         nv.tags || [],
      notes:        notesCompletes,
    };
    if (editId) {
      await sbPatch("bellaia_documents", editId, payload).catch(() => null);
      if (detail?.id === editId) setDetail(nv);
    } else {
      const row = await sbPost("bellaia_documents", { ...payload, version: 1 }).catch(() => null);
      if (row?.id) setDocs(ds => ds.map(d => d.id === nv.id ? { ...d, id:row.id } : d));
    }
    setSaving(false);
    setModal(null); setForm(FORM0);
  };

  // Duplique un document existant — nouvelle référence, contenu identique,
  // repasse en brouillon (jamais une copie "déjà validée").
  const dupliquer = async (d: Document) => {
    const copie: Partial<Document> = {
      ...d, _edit: undefined, id: undefined,
      titre: d.titre + " (copie)",
      reference: genRef(),
      statut: "brouillon",
    } as any;
    delete (copie as any)._edit;
    setForm(copie);
    setDetail(null);
    setModal("form");
  };

  // Changer statut
  const changerStatut = async (id: string, statut: Document["statut"]) => {
    setDocs(ds => ds.map(d => d.id === id ? { ...d, statut } : d));
    if (detail?.id === id) setDetail(d => d ? { ...d, statut } : null);
    await sbPatch("bellaia_documents", id, { statut }).catch(() => {});
  };

  // Télécharger — un fichier uploadé (bucket privé bsh-documents) a
  // besoin d'une URL signée à la demande (pas d'URL permanente stockée :
  // le bucket est privé pour respecter la même RLS que bellaia_documents
  // — voir migration 0026). Un lien externe ou un contenu rédigé restent
  // gérés comme avant.
  const telecharger = async (doc: Document) => {
    if (doc.storagePath) {
      try {
        const r = await fetch(`${SB_URL()}/storage/v1/object/sign/bsh-documents/${doc.storagePath}?expiresIn=300`, {
          method: "POST",
          headers: { apikey: SB_KEY(), Authorization: "Bearer "+await getToken(), "Content-Type":"application/json" },
        });
        const d = await r.json().catch(() => null);
        if (r.ok && d?.signedURL) { window.open(`${SB_URL()}${d.signedURL}`, "_blank"); return; }
        alert("Impossible d'ouvrir ce fichier pour le moment. Réessayez.");
      } catch { alert("Erreur réseau lors de l'ouverture du fichier."); }
      return;
    }
    if (doc.url) { window.open(doc.url, "_blank"); return; }
    if (doc.contenuHtml) {
      const win = window.open("","_blank");
      if (!win) return;
      win.document.write(doc.contenuHtml);
      win.document.close();
      setTimeout(() => win.print(), 300);
    }
  };

  // Upload réel vers le bucket privé bsh-documents (migration 0026) —
  // dossier "hotesses/" pour les ressources hôtesses BSH (lisibles par
  // les hôtesses actives via la policy storage dédiée), "fondatrice/"
  // pour tout le reste (staff uniquement).
  const uploaderFichier = async (file: File) => {
    setUploading(true);
    try {
      const dossier = (form.module === "BSH" && form.categorie === "ressource_hotesse") ? "hotesses" : "fondatrice";
      const chemin = `${dossier}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g,"_")}`;
      const r = await fetch(`${SB_URL()}/storage/v1/object/bsh-documents/${chemin}`, {
        method: "POST",
        headers: { apikey: SB_KEY(), Authorization: "Bearer "+await getToken(), "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (r.ok) {
        setForm(f => ({
          ...f,
          titre:       f.titre || file.name.replace(/\.[^.]+$/, ""),
          mimeType:    file.type,
          taille:      file.size,
          storagePath: chemin,
        }));
      } else {
        alert("Échec de l'envoi du fichier. Réessayez.");
      }
    } catch { alert("Erreur réseau lors de l'envoi du fichier."); }
    setUploading(false);
  };

  // Gérer l'upload d'un fichier
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploaderFichier(file);
  };

  // ── Vue détail ─────────────────────────────────────────
  if (detail) return (
    <div style={{ display:"flex", flexDirection:"column", gap:14, fontFamily:SA }}>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={() => setDetail(null)}
          style={{ background:"none", border:`1px solid ${CLR.line}`, borderRadius:8,
            padding:"4px 12px", color:CLR.creamD, cursor:"pointer", fontSize:11 }}>
          ‹ Retour
        </button>
        {(detail.url || detail.storagePath || detail.contenuHtml) && (
          <button onClick={() => telecharger(detail)}
            style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${CLR.vert}`,
              borderRadius:8, padding:"4px 12px", color:CLR.vertL,
              cursor:"pointer", fontSize:11 }}>
            ⬇ Télécharger
          </button>
        )}
        <button onClick={() => { setForm({ ...detail, _edit: detail.id } as any); setModal("form"); }}
          style={{ background:"rgba(96,165,250,0.15)", border:"1px solid #60a5fa",
            borderRadius:8, padding:"4px 12px", color:"#93c5fd",
            cursor:"pointer", fontSize:11 }}>
          ✏ Modifier
        </button>
        <button onClick={() => dupliquer(detail)}
          style={{ background:"rgba(255,255,255,0.06)", border:`1px solid ${CLR.line}`,
            borderRadius:8, padding:"4px 12px", color:CLR.creamD,
            cursor:"pointer", fontSize:11 }}>
          ⎘ Dupliquer
        </button>
      </div>

      <div style={{ background:CLR.card, border:`1px solid ${CLR.line}`, borderRadius:14, padding:16 }}>
        <div style={{ display:"flex", gap:10, marginBottom:10 }}>
          <span style={{ fontSize:24 }}>{TYPE_ICO[detail.type]}</span>
          <div>
            <div style={{ fontSize:15, fontWeight:700, color:"#fff" }}>{detail.titre}</div>
            <div style={{ fontSize:10, color:CLR.creamD }}>
              {detail.reference} · v{detail.version} · {fmtDate(detail.createdAt)}
            </div>
          </div>
        </div>
        {[
          {l:"Module",    v:MODULE_ICO[detail.module]+" "+detail.module},
          {l:"Type",      v:detail.type.replace(/_/g," ")},
          {l:"Statut",    v:detail.statut, col:STATUT_COL[detail.statut]},
          {l:"Client",    v:detail.clientNom},
          {l:"Devis",     v:detail.devisRef},
          {l:"Commande",  v:detail.commandeRef},
          {l:"Taille",    v:fmtTaille(detail.taille)},
        ].filter(r => r.v).map(r => (
          <div key={r.l} style={{ display:"flex", justifyContent:"space-between",
            padding:"5px 0", borderBottom:`1px solid ${CLR.line}` }}>
            <span style={{ fontSize:11, color:CLR.creamD }}>{r.l}</span>
            <span style={{ fontSize:11, fontWeight:600, color:(r as any).col || "#fff" }}>{r.v}</span>
          </div>
        ))}
        {detail.notes && (
          <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:8, fontStyle:"italic" }}>
            {detail.notes}
          </div>
        )}
        {detail.tags?.length ? (
          <div style={{ display:"flex", gap:5, flexWrap:"wrap", marginTop:10 }}>
            {detail.tags.map(t => (
              <span key={t} style={{ fontSize:9, background:"rgba(21,128,61,0.12)",
                color:CLR.vertL, borderRadius:4, padding:"2px 7px" }}>{t}</span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Contenu rédigé (contenuHtml) — jusqu'ici jamais affiché : la
          vue détail ne montrait que les métadonnées, jamais le corps
          du document lui-même. */}
      {detail.contenuHtml && (
        <div
          style={{
            background: "#fff", color: "#111", borderRadius: 14,
            padding: "22px 20px", fontSize: 13, lineHeight: 1.65,
          }}
          dangerouslySetInnerHTML={{ __html: detail.contenuHtml }}
        />
      )}
      {detail.url && !detail.contenuHtml && (
        <a href={detail.url} target="_blank" rel="noopener noreferrer"
          style={{ background:CLR.card, border:`1px solid ${CLR.line}`, borderRadius:12,
            padding:"12px 14px", color:CLR.vertL, fontSize:12, textAlign:"center",
            textDecoration:"none", display:"block" }}>
          🔗 Ouvrir le lien externe
        </a>
      )}
      {detail.storagePath && !detail.url && !detail.contenuHtml && (
        <button onClick={() => telecharger(detail)}
          style={{ background:CLR.card, border:`1px solid ${CLR.line}`, borderRadius:12,
            padding:"12px 14px", color:CLR.vertL, fontSize:12, textAlign:"center",
            cursor:"pointer", width:"100%" }}>
          📎 Ouvrir le fichier{detail.taille ? ` (${fmtTaille(detail.taille)})` : ""}
        </button>
      )}

      {/* Changement de statut */}
      <div style={{ display:"flex", gap:5, flexWrap:"wrap" }}>
        {(["brouillon","valide","envoye","archive"] as const).map(s => (
          <button key={s} onClick={() => changerStatut(detail.id, s)}
            style={{ fontSize:10, padding:"4px 12px", borderRadius:99, cursor:"pointer",
              border:`1px solid ${s===detail.statut?STATUT_COL[s]:"rgba(255,255,255,0.12)"}`,
              background:s===detail.statut?"rgba(255,255,255,0.08)":"transparent",
              color:s===detail.statut?STATUT_COL[s]:"rgba(255,255,255,0.4)", fontFamily:SA }}>
            {s.replace(/_/g," ")}
          </button>
        ))}
      </div>
    </div>
  );

  // ── Liste documents ────────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>📁 Documents</div>
          <div style={{ fontSize:10, color:source==="supabase"?CLR.vertL:"rgba(255,255,255,0.3)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"}
            {" · "}{docs.filter(d => d.statut!=="supprime").length} document{docs.length>1?"s":""}
          </div>
        </div>
        <button onClick={() => { setForm(FORM0); setModal("form"); }}
          style={{ background:CLR.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Ajouter
        </button>
      </div>

      {/* Recherche */}
      <input value={filtre.texte || ""} onChange={e => setFiltre(f => ({...f, texte:e.target.value}))}
        placeholder="🔍 Titre, référence, client, tag…"
        style={{ ...inp, padding:"9px 13px" }}/>

      {/* Filtres */}
      <div style={{ display:"flex", gap:6, overflowX:"auto", paddingBottom:2 }}>
        {(["tous","FOOD","EVENTS","BSH","ODYSSEE","ERP","GENERAL"] as const).map(m => (
          <button key={m} onClick={() => setFiltre(f => ({...f, module:m}))}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:filtre.module===m?CLR.vert:"rgba(255,255,255,0.07)",
              color:filtre.module===m?"#fff":"rgba(255,255,255,0.5)" }}>
            {m==="tous"?"Tous":(MODULE_ICO[m as ModuleDocument]+" "+m)}
          </button>
        ))}
      </div>

      {visibles.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px", color:CLR.creamD, fontStyle:"italic" }}>
          Aucun document. Créez le premier avec "+ Ajouter".
        </div>
      )}

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {visibles.map(d => (
          <div key={d.id} onClick={() => setDetail(d)}
            style={{ background:CLR.card, border:`1px solid ${CLR.line}`,
              borderRadius:12, padding:"12px 14px", cursor:"pointer",
              display:"flex", gap:10, alignItems:"center" }}>
            <span style={{ fontSize:22, flexShrink:0 }}>{TYPE_ICO[d.type]}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", gap:6, marginBottom:2 }}>
                <span style={{ fontSize:9, color:CLR.creamD }}>{MODULE_ICO[d.module]}</span>
                <span style={{ fontSize:9, color:STATUT_COL[d.statut], fontWeight:700 }}>
                  {d.statut}
                </span>
              </div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff",
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {d.titre}
              </div>
              <div style={{ fontSize:10, color:CLR.creamD }}>
                {d.reference} · {fmtDate(d.createdAt)}
                {d.clientNom ? ` · ${d.clientNom}` : ""}
              </div>
            </div>
            {(d.url || d.storagePath || d.contenuHtml) && (
              <button onClick={e => { e.stopPropagation(); telecharger(d); }}
                style={{ background:"rgba(255,255,255,0.06)", border:"none", borderRadius:7,
                  padding:"4px 10px", color:CLR.creamD, cursor:"pointer", fontSize:10,
                  flexShrink:0 }}>
                ⬇
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal ajout */}
      {modal === "form" && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:CLR.night, border:`1px solid ${CLR.line}`,
            borderRadius:16, padding:20, maxWidth:500, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>{(form as any)._edit ? "Modifier le document" : "Ajouter un document"}</div>
              <button onClick={() => setModal(null)}
                style={{ background:"none", border:"none", color:CLR.creamD,
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Titre *","titre","Nom du document"],
                ["Client","clientNom","Nom du client"],
                ["Notes","notes","Informations complémentaires"]].map(([l,k,ph]) => (
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>{l}</label>
                  <input placeholder={ph} value={(form as any)[k]||""}
                    onChange={e => setForm(f => ({...f,[k]:e.target.value}))} style={inp}/>
                </div>
              ))}
              {form.module === "BSH" && (
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>Hôtesse BSH (optionnel — pour qu'elle voie ce document)</label>
                  <select value={form.hoteId||""}
                    onChange={e => setForm(f => ({...f,hoteId:e.target.value || undefined}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    <option value="">— Aucune —</option>
                    {hotes.map(h => <option key={h.id} value={h.id}>{h.nom}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>Module</label>
                  <select value={form.module||"GENERAL"}
                    onChange={e => setForm(f => ({...f,module:e.target.value as ModuleDocument}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {(["FOOD","EVENTS","BSH","ODYSSEE","EDITIONS","MOTIPY","VILO","ERP","GENERAL"] as ModuleDocument[]).map(m=>(
                      <option key={m} value={m}>{MODULE_ICO[m]} {m}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>Type</label>
                  <select value={form.type||"autre"}
                    onChange={e => setForm(f => ({...f,type:e.target.value as TypeDocument}))}
                    style={{ ...inp, background:"#1a1a2e" }}>
                    {(Object.keys(TYPE_ICO) as TypeDocument[]).map(t=>(
                      <option key={t} value={t}>{TYPE_ICO[t]} {t.replace(/_/g," ")}</option>
                    ))}
                  </select>
                </div>
              </div>
              {/* Rédiger directement dans Bellaïa */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>
                  Contenu du document (rédigé ici — imprimable/exportable en PDF ensuite)
                </label>
                <textarea placeholder="Écrivez le contenu du document directement ici…"
                  value={form.contenuHtml||""} rows={5}
                  onChange={e => setForm(f => ({...f, contenuHtml:e.target.value}))}
                  style={{ ...inp, resize:"vertical" }}/>
              </div>

              {/* Lien externe — document déjà existant ailleurs */}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>
                  Ou lien vers un document existant (Google Doc, PDF déjà en ligne…)
                </label>
                <input placeholder="https://..." value={form.url||""}
                  onChange={e => setForm(f => ({...f, url:e.target.value}))} style={inp}/>
              </div>

              {/* Upload fichier — envoyé vers le bucket privé bsh-documents (migration 0026) */}
              <div>
                <label style={{ fontSize:10, color:CLR.creamD, display:"block", marginBottom:6 }}>
                  Fichier (optionnel)
                </label>
                <input ref={fileRef} type="file" onChange={handleFileUpload}
                  disabled={uploading}
                  style={{ display:"none" }}/>
                <button onClick={() => fileRef.current?.click()} disabled={uploading}
                  style={{ background:"rgba(255,255,255,0.06)", border:`1px dashed ${CLR.line}`,
                    borderRadius:9, padding:"10px", color:CLR.creamD, cursor:uploading?"default":"pointer",
                    fontSize:12, fontFamily:SA, width:"100%" }}>
                  📎 {uploading ? "Envoi en cours…" : form.storagePath ? `Fichier envoyé${form.taille ? ` (${fmtTaille(form.taille)})` : ""} — changer` : "Choisir un fichier"}
                </button>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creer} disabled={saving || !form.titre?.trim()}
                  style={{ flex:1, background:CLR.vert, border:"none", borderRadius:10,
                    padding:"11px", color:"#fff", fontWeight:700, fontSize:13,
                    cursor:"pointer", fontFamily:SA, opacity:saving||!form.titre?0.6:1 }}>
                  {saving?"…":((form as any)._edit?"✅ Enregistrer les modifications":"✅ Enregistrer")}
                </button>
                <button onClick={() => setModal(null)}
                  style={{ flex:1, background:"rgba(255,255,255,0.06)", border:"none",
                    borderRadius:10, padding:"11px", color:CLR.creamD,
                    fontSize:13, cursor:"pointer", fontFamily:SA }}>
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

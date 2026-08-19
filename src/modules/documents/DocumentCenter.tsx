// src/modules/documents/DocumentCenter.tsx
"use client";
import React, { useState, useEffect, useCallback } from "react";
import type { DocRequest, DocSubmission, BellaiaDocument, DocCategorie, DocStatut } from "./documentTypes";
import { STATUT_LABELS, STATUT_COLORS } from "./documentTypes";
import {
  getCategories, getDemandesDoc, creerDemandeDoc, mettreAJourStatutDoc,
  getSubmissions, deposerDocument, getDocumentsGED, uploaderDocumentGED,
} from "./documentApi";

const C = {
  bg:"#09070f", surface:"#181428", card:"#1e1a30", card2:"#231f38",
  border:"rgba(124,58,237,0.22)",
  violet:"#7c3aed", violetL:"#9d6ef5", violetD:"#5b21b6",
  gold:"#c9a84c", cream:"#f0ebff", muted:"#8b7fa8", mutedL:"#b8aed0",
  success:"#6ee7a0", danger:"#f87171", warning:"#fbbf24", info:"#60a5fa",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Georgia',serif";
const R  = { sm:6, md:10, lg:14, xl:18, full:9999 };

const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('fr-FR',{day:'2-digit',month:'short',year:'numeric'}) : '—';
const fmtSize = (b?: number) => {
  if (!b) return '';
  if (b < 1024) return `${b} o`;
  if (b < 1024*1024) return `${(b/1024).toFixed(1)} Ko`;
  return `${(b/(1024*1024)).toFixed(1)} Mo`;
};
const typeIcon = (mime?: string) => {
  if (!mime) return '📎';
  if (mime.startsWith('image')) return '🖼';
  if (mime.includes('pdf')) return '📄';
  if (mime.includes('word') || mime.includes('document')) return '📝';
  if (mime.includes('sheet') || mime.includes('excel')) return '📊';
  return '📎';
};

const Badge = ({ statut }: { statut: DocStatut }) => {
  const c = STATUT_COLORS[statut] || { bg:'rgba(255,255,255,0.1)', color:'#fff' };
  return (
    <span style={{ background:c.bg, color:c.color, borderRadius:R.full,
      padding:'2px 10px', fontSize:10, fontWeight:700, whiteSpace:'nowrap' }}>
      {STATUT_LABELS[statut] || statut}
    </span>
  );
};

interface Props {
  user: { id: string; prenom?: string; nom?: string; role?: string };
  onClose?: () => void;
}

type Onglet = 'demandes' | 'ged' | 'nouvelle';

export default function DocumentCenter({ user, onClose }: Props) {
  const isFondatrice = user.role === 'fondatrice';
  const [onglet, setOnglet]         = useState<Onglet>('demandes');
  const [demandes, setDemandes]     = useState<DocRequest[]>([]);
  const [gedDocs, setGedDocs]       = useState<BellaiaDocument[]>([]);
  const [categories, setCategories] = useState<DocCategorie[]>([]);
  const [selected, setSelected]     = useState<DocRequest | null>(null);
  const [submissions, setSubmissions] = useState<DocSubmission[]>([]);
  const [loading, setLoading]       = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [erreur, setErreur]         = useState('');
  const [succes, setSucces]         = useState('');
  const [filtreStatut, setFiltreStatut] = useState('tous');
  const fileRef = React.useRef<HTMLInputElement>(null);
  const gedRef  = React.useRef<HTMLInputElement>(null);

  // Formulaire nouvelle demande
  const [form, setForm] = useState({
    titre:'', categorie:'', destinataireNom:'', consignes:'',
    module:'', dateEcheance:'', obligatoire:true,
  });

  const charger = useCallback(async () => {
    setLoading(true); setErreur('');
    try {
      const [cats, reqs] = await Promise.all([
        getCategories(),
        getDemandesDoc(isFondatrice ? {} : { destinataireId: user.id }),
      ]);
      setCategories(cats);
      setDemandes(reqs);
      if (onglet === 'ged') {
        const docs = await getDocumentsGED(
          isFondatrice ? {} : { clientId: user.id }
        );
        setGedDocs(docs);
      }
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  }, [user.id, isFondatrice, onglet]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirDemande = async (req: DocRequest) => {
    setSelected(req); setErreur(''); setSucces('');
    try {
      const subs = await getSubmissions(req.id);
      setSubmissions(subs);
      if (req.statut === 'demande') {
        await mettreAJourStatutDoc(req.id, 'vu');
      }
    } catch(e: any) { setErreur(e.message); }
  };

  const handleDeposer = async (file: File) => {
    if (!selected) return;
    setUploading(true); setErreur('');
    try {
      await deposerDocument(selected.id, user.id, file);
      const subs = await getSubmissions(selected.id);
      setSubmissions(subs);
      setSucces('Document déposé avec succès');
      const reqs = await getDemandesDoc(
        isFondatrice ? {} : { destinataireId: user.id }
      );
      setDemandes(reqs);
    } catch(e: any) { setErreur(e.message); }
    finally { setUploading(false); }
  };

  const handleValider = async (statut: DocStatut, note?: string) => {
    if (!selected) return;
    setLoading(true);
    try {
      await mettreAJourStatutDoc(selected.id, statut, note);
      setSucces(`Document ${statut === 'accepte' ? 'accepté' : 'refusé'}`);
      const reqs = await getDemandesDoc({});
      setDemandes(reqs);
      setSelected(prev => prev ? { ...prev, statut } : null);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  const handleGEDUpload = async (file: File) => {
    setUploading(true); setErreur('');
    try {
      await uploaderDocumentGED(file, {
        titre:    file.name,
        creePar:  user.id,
        clientId: isFondatrice ? undefined : user.id,
      });
      setSucces('Document ajouté à la GED');
      const docs = await getDocumentsGED(
        isFondatrice ? {} : { clientId: user.id }
      );
      setGedDocs(docs);
    } catch(e: any) { setErreur(e.message); }
    finally { setUploading(false); }
  };

  const handleCreerDemande = async () => {
    if (!form.titre) { setErreur('Le titre est obligatoire'); return; }
    setLoading(true); setErreur('');
    try {
      await creerDemandeDoc({
        titre:           form.titre,
        categorie:       form.categorie || undefined,
        destinataireNom: form.destinataireNom || undefined,
        consignes:       form.consignes || undefined,
        module:          form.module || undefined,
        dateEcheance:    form.dateEcheance || undefined,
        obligatoire:     form.obligatoire,
        creePar:         user.id,
      });
      setSucces('Demande de document créée');
      setOnglet('demandes');
      await charger();
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  // ── Header ──────────────────────────────────────────────────
  const renderHeader = () => (
    <div style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border,
      background:C.surface, display:'flex', justifyContent:'space-between', alignItems:'center',
      flexShrink:0 }}>
      <div>
        <div style={{ fontSize:16, fontWeight:800, color:C.cream, fontFamily:FS }}>
          📁 Documents
        </div>
        <div style={{ fontSize:11, color:C.muted }}>
          {demandes.length} demande{demandes.length !== 1 ? 's' : ''} · {gedDocs.length} en GED
        </div>
      </div>
      <div style={{ display:'flex', gap:6 }}>
        {isFondatrice && (
          <button onClick={() => setOnglet('nouvelle')}
            style={{ background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
              border:'none', borderRadius:R.md, padding:'7px 12px',
              color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:SA }}>
            + Demande
          </button>
        )}
        {onClose && (
          <button onClick={onClose}
            style={{ background:'rgba(255,255,255,0.06)', border:'1px solid '+C.border,
              borderRadius:R.md, padding:'7px 10px', color:C.muted, cursor:'pointer' }}>
            ✕
          </button>
        )}
      </div>
    </div>
  );

  // ── Onglets ─────────────────────────────────────────────────
  const renderOnglets = () => (
    <div style={{ display:'flex', background:C.surface, borderBottom:'1px solid '+C.border,
      flexShrink:0 }}>
      {([
        { key:'demandes', label:'📋 Demandes' },
        { key:'ged',      label:'🗂 GED' },
      ] as { key: Onglet; label: string }[]).map(o => (
        <button key={o.key} onClick={() => setOnglet(o.key)}
          style={{ flex:1, padding:'10px', border:'none',
            background: onglet===o.key ? C.card : 'transparent',
            color: onglet===o.key ? C.cream : C.muted,
            fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:SA,
            borderBottom: onglet===o.key ? `2px solid ${C.violet}` : '2px solid transparent' }}>
          {o.label}
        </button>
      ))}
    </div>
  );

  // ── Liste demandes ──────────────────────────────────────────
  const renderDemandes = () => {
    const filtered = demandes.filter(d =>
      filtreStatut === 'tous' || d.statut === filtreStatut
    );
    return (
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* Filtres */}
        <div style={{ padding:'8px 14px', borderBottom:'1px solid '+C.border,
          display:'flex', gap:6, overflowX:'auto', flexShrink:0 }}>
          {['tous','demande','depose','a_verifier','accepte','refuse'].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              style={{ background: filtreStatut===s ? C.violet : 'rgba(255,255,255,0.05)',
                border:'1px solid '+(filtreStatut===s ? C.violet : C.border),
                borderRadius:R.full, padding:'4px 12px',
                color: filtreStatut===s ? '#fff' : C.muted,
                fontSize:10, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:SA }}>
              {s === 'tous' ? 'Tous' : STATUT_LABELS[s as DocStatut]?.replace(/^\S+\s/,'') || s}
            </button>
          ))}
        </div>

        {/* Messages */}
        {(erreur || succes) && (
          <div style={{ margin:'8px 14px',
            background: erreur ? 'rgba(248,113,113,0.1)' : 'rgba(110,231,160,0.1)',
            border: `1px solid ${erreur ? 'rgba(248,113,113,0.3)' : 'rgba(110,231,160,0.25)'}`,
            borderRadius:R.md, padding:'8px 12px', fontSize:11,
            color: erreur ? C.danger : C.success,
            display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            {erreur || succes}
            <button onClick={()=>{ setErreur(''); setSucces(''); }}
              style={{ background:'none', border:'none', color:'inherit', cursor:'pointer' }}>✕</button>
          </div>
        )}

        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && (
            <div style={{ textAlign:'center', padding:32 }}>
              <div style={{ width:24, height:24, borderRadius:'50%',
                border:'2px solid rgba(124,58,237,0.2)', borderTopColor:C.violet,
                animation:'spin 0.7s linear infinite', margin:'0 auto' }}/>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📁</div>
              <div style={{ fontSize:14, color:C.cream, fontWeight:600, marginBottom:6 }}>
                Aucun document
              </div>
              <div style={{ fontSize:12, color:C.muted }}>
                {isFondatrice ? 'Créez une demande de document pour commencer'
                  : 'Les demandes de documents apparaîtront ici'}
              </div>
            </div>
          )}
          {filtered.map(req => (
            <div key={req.id} onClick={() => ouvrirDemande(req)}
              style={{ padding:'13px 16px', borderBottom:'1px solid '+C.border,
                cursor:'pointer', transition:'background 0.15s',
                background: selected?.id===req.id ? C.card : 'transparent' }}>
              <div style={{ display:'flex', justifyContent:'space-between',
                alignItems:'flex-start', marginBottom:4 }}>
                <div style={{ flex:1, minWidth:0, marginRight:10 }}>
                  <div style={{ fontSize:12, fontWeight:800, color:C.cream,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {typeIcon()} {req.titre}
                  </div>
                  <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                    {req.reference} · {req.destinataire_nom || 'Non assigné'}
                    {req.date_echeance && ` · Échéance ${fmtDate(req.date_echeance)}`}
                  </div>
                </div>
                <Badge statut={req.statut}/>
              </div>
              {req.categorie && (
                <span style={{ fontSize:9, color:C.violetL, fontWeight:700,
                  background:'rgba(124,58,237,0.1)', borderRadius:3, padding:'1px 6px' }}>
                  {categories.find(c=>c.code===req.categorie)?.libelle || req.categorie}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Panneau détail si sélectionné */}
        {selected && renderDetailDemande()}
      </div>
    );
  };

  // ── Détail demande ──────────────────────────────────────────
  const renderDetailDemande = () => (
    <div style={{ position:'fixed', inset:0, background:'rgba(9,7,15,0.92)', zIndex:400,
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={() => setSelected(null)}>
      <div onClick={e => e.stopPropagation()}
        style={{ background:C.surface, borderRadius:'20px 20px 0 0',
          border:'1px solid '+C.border, borderBottom:'none',
          padding:'20px 16px 36px', width:'100%', maxWidth:500,
          maxHeight:'88vh', overflowY:'auto' }}>
        <div style={{ width:36, height:4, background:C.border,
          borderRadius:2, margin:'0 auto 16px' }}/>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between',
          alignItems:'flex-start', marginBottom:16 }}>
          <div style={{ flex:1, marginRight:10 }}>
            <div style={{ fontSize:15, fontWeight:800, color:C.cream, fontFamily:FS }}>
              {selected.titre}
            </div>
            <div style={{ fontSize:10, color:C.muted, marginTop:3 }}>
              {selected.reference} · {fmtDate(selected.created_at)}
            </div>
          </div>
          <Badge statut={selected.statut}/>
        </div>

        {selected.consignes && (
          <div style={{ background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
            borderRadius:R.md, padding:'10px 12px', fontSize:12, color:C.info,
            marginBottom:14, lineHeight:1.6 }}>
            ℹ️ {selected.consignes}
          </div>
        )}

        {/* Messages */}
        {(erreur || succes) && (
          <div style={{ background: erreur ? 'rgba(248,113,113,0.1)' : 'rgba(110,231,160,0.1)',
            border:`1px solid ${erreur ? 'rgba(248,113,113,0.3)' : 'rgba(110,231,160,0.25)'}`,
            borderRadius:R.md, padding:'8px 12px', fontSize:11,
            color: erreur ? C.danger : C.success, marginBottom:12 }}>
            {erreur || succes}
          </div>
        )}

        {/* Dépôts existants */}
        {submissions.length > 0 && (
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:10, fontWeight:700, color:C.mutedL,
              textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:8 }}>
              Documents déposés ({submissions.length})
            </div>
            {submissions.map(s => (
              <div key={s.id} style={{ display:'flex', alignItems:'center', gap:10,
                padding:'9px 12px', background:C.card, borderRadius:R.md, marginBottom:6 }}>
                <span style={{ fontSize:22 }}>{typeIcon(s.type_mime)}</span>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, color:C.cream, fontWeight:600,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {s.nom_fichier}
                  </div>
                  <div style={{ fontSize:10, color:C.muted }}>
                    v{s.version} · {fmtSize(s.taille_bytes)} · {fmtDate(s.created_at)}
                  </div>
                </div>
                {s.signed_url && (
                  <a href={s.signed_url} target="_blank" rel="noopener noreferrer"
                    style={{ background:'rgba(124,58,237,0.15)',
                      border:'1px solid rgba(124,58,237,0.3)',
                      borderRadius:R.sm, padding:'5px 10px',
                      color:C.violetL, fontSize:10, fontWeight:700,
                      cursor:'pointer', textDecoration:'none' }}>
                    ⬇ Voir
                  </a>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Bouton déposer (client/hôte) */}
        {!isFondatrice && selected.statut !== 'accepte' && (
          <div>
            <input ref={fileRef} type="file" style={{ display:'none' }}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xls,.xlsx"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleDeposer(f);
                e.target.value = '';
              }}/>
            <button onClick={() => fileRef.current?.click()} disabled={uploading}
              style={{ width:'100%', background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
                border:'none', borderRadius:R.md, padding:'12px',
                color:'#fff', fontSize:13, fontWeight:700,
                cursor:uploading ? 'wait' : 'pointer', fontFamily:SA }}>
              {uploading ? '⏳ Envoi...' : '📤 Déposer un document'}
            </button>
          </div>
        )}

        {/* Actions fondatrice */}
        {isFondatrice && selected.statut === 'depose' && (
          <div style={{ display:'flex', gap:8, marginTop:4 }}>
            <button onClick={() => handleValider('accepte')}
              style={{ flex:1, background:'rgba(110,231,160,0.15)',
                border:'1px solid rgba(110,231,160,0.3)', borderRadius:R.md,
                padding:'11px', color:C.success, fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:SA }}>
              ✅ Accepter
            </button>
            <button onClick={() => handleValider('refuse', 'Document non conforme')}
              style={{ flex:1, background:'rgba(248,113,113,0.1)',
                border:'1px solid rgba(248,113,113,0.3)', borderRadius:R.md,
                padding:'11px', color:C.danger, fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:SA }}>
              ❌ Refuser
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── GED ─────────────────────────────────────────────────────
  const renderGED = () => (
    <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
      <div style={{ padding:'10px 14px', borderBottom:'1px solid '+C.border, flexShrink:0 }}>
        <input ref={gedRef} type="file" style={{ display:'none' }}
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) handleGEDUpload(f);
            e.target.value = '';
          }}/>
        <button onClick={() => gedRef.current?.click()} disabled={uploading}
          style={{ width:'100%', background:'rgba(201,168,76,0.1)',
            border:'1px solid rgba(201,168,76,0.3)', borderRadius:R.md,
            padding:'10px', color:C.gold, fontSize:12, fontWeight:700,
            cursor:uploading ? 'wait' : 'pointer', fontFamily:SA }}>
          {uploading ? '⏳ Envoi...' : '📂 Ajouter un document à la GED'}
        </button>
      </div>

      {(erreur || succes) && (
        <div style={{ margin:'8px 14px',
          background: erreur ? 'rgba(248,113,113,0.1)' : 'rgba(110,231,160,0.1)',
          border:`1px solid ${erreur ? 'rgba(248,113,113,0.3)' : 'rgba(110,231,160,0.25)'}`,
          borderRadius:R.md, padding:'8px 12px', fontSize:11,
          color: erreur ? C.danger : C.success }}>
          {erreur || succes}
        </div>
      )}

      <div style={{ flex:1, overflowY:'auto' }}>
        {gedDocs.length === 0 && !loading && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>🗂</div>
            <div style={{ fontSize:14, color:C.cream, fontWeight:600 }}>GED vide</div>
            <div style={{ fontSize:12, color:C.muted, marginTop:6 }}>
              Ajoutez des documents pour les retrouver ici
            </div>
          </div>
        )}
        {gedDocs.map(doc => (
          <div key={doc.id} style={{ display:'flex', alignItems:'center', gap:10,
            padding:'12px 16px', borderBottom:'1px solid '+C.border }}>
            <span style={{ fontSize:26, flexShrink:0 }}>{typeIcon(doc.type_mime)}</span>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.cream,
                overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {doc.titre}
              </div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                {doc.categorie && `${doc.categorie} · `}
                {fmtSize(doc.taille_bytes)} · {fmtDate(doc.created_at)}
              </div>
            </div>
            {doc.signed_url && (
              <a href={doc.signed_url} target="_blank" rel="noopener noreferrer"
                style={{ background:'rgba(201,168,76,0.1)',
                  border:'1px solid rgba(201,168,76,0.3)', borderRadius:R.sm,
                  padding:'6px 11px', color:C.gold, fontSize:10, fontWeight:700,
                  textDecoration:'none', flexShrink:0 }}>
                ⬇
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // ── Nouvelle demande ────────────────────────────────────────
  const renderNouvelleDemande = () => (
    <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
        <button onClick={() => setOnglet('demandes')}
          style={{ background:'none', border:'none', color:C.muted,
            fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:15, fontWeight:800, color:C.cream, fontFamily:FS }}>
          Nouvelle demande
        </div>
      </div>

      {erreur && (
        <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
          borderRadius:R.md, padding:'9px 12px', fontSize:12, color:C.danger, marginBottom:14 }}>
          ⚠️ {erreur}
        </div>
      )}

      {[
        { label:'Titre du document *', key:'titre', placeholder:'Ex: Carte d\'identité recto-verso' },
        { label:'Destinataire', key:'destinataireNom', placeholder:'Nom du client ou hôte' },
        { label:'Consignes', key:'consignes', placeholder:'Instructions pour le dépôt...' },
        { label:'Module', key:'module', placeholder:'EVENTS / FOOD / BSH...' },
      ].map(f => (
        <div key={f.key} style={{ marginBottom:12 }}>
          <label style={{ fontSize:10, fontWeight:700, color:C.mutedL, display:'block',
            marginBottom:4, textTransform:'uppercase', letterSpacing:'0.07em' }}>
            {f.label}
          </label>
          <input value={(form as any)[f.key]}
            onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
            placeholder={f.placeholder}
            style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
              borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:12,
              outline:'none', fontFamily:SA, boxSizing:'border-box' }}/>
        </div>
      ))}

      <div style={{ marginBottom:12 }}>
        <label style={{ fontSize:10, fontWeight:700, color:C.mutedL, display:'block',
          marginBottom:4, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          Catégorie
        </label>
        <select value={form.categorie}
          onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}
          style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
            borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:12,
            outline:'none', fontFamily:SA, boxSizing:'border-box' }}>
          <option value="">— Choisir une catégorie —</option>
          {categories.map(c => (
            <option key={c.code} value={c.code}>{c.libelle}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:10, fontWeight:700, color:C.mutedL, display:'block',
          marginBottom:4, textTransform:'uppercase', letterSpacing:'0.07em' }}>
          Date d'échéance
        </label>
        <input type="date" value={form.dateEcheance}
          onChange={e => setForm(f => ({ ...f, dateEcheance: e.target.value }))}
          style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
            borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:12,
            outline:'none', fontFamily:SA, boxSizing:'border-box' }}/>
      </div>

      <button onClick={handleCreerDemande} disabled={loading}
        style={{ width:'100%', background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
          border:'none', borderRadius:R.md, padding:'12px',
          color:'#fff', fontSize:13, fontWeight:700,
          cursor:loading ? 'not-allowed' : 'pointer', fontFamily:SA }}>
        {loading ? '⏳ Création...' : '✓ Créer la demande'}
      </button>
    </div>
  );

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      fontFamily:SA, overflow:'hidden', background:C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {renderHeader()}
      {onglet !== 'nouvelle' && renderOnglets()}
      {onglet === 'demandes' && renderDemandes()}
      {onglet === 'ged'      && renderGED()}
      {onglet === 'nouvelle' && renderNouvelleDemande()}
    </div>
  );
}

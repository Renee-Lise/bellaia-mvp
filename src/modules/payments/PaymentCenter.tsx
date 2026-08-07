// ═══════════════════════════════════════════════════════════
// BELLAÏA PAYMENT CENTER — Module paiements complet
// src/modules/payments/PaymentCenter.tsx
// Parcours : facture → acompte/total → mode → confirmation → reçu
// ═══════════════════════════════════════════════════════════
"use client";
import React, { useState, useEffect, useCallback } from "react";
import type { Paiement, Echeance, Recu, PayStatut, PayMode } from "./paymentTypes";
import { STATUT_LABELS, STATUT_COLORS, MODE_LABELS } from "./paymentTypes";
import {
  getPaiements, getPaiement, creerPaiement, mettreAJourStatut,
  validerManuellement, getEcheances, creerEcheances, payerEcheance,
  genererRecu, getRecus, getHistorique, notifierPaiement,
} from "./paymentApi";

// ── Palette ─────────────────────────────────────────────────
const C = {
  bg:     "#09070f", surface:"#181428", card:"#1e1a30", card2:"#231f38",
  border: "rgba(124,58,237,0.22)",
  violet: "#7c3aed", violetL:"#9d6ef5", violetD:"#5b21b6",
  gold:   "#c9a84c", goldL:"#e8c96a",
  cream:  "#f0ebff", muted:"#8b7fa8", mutedL:"#b8aed0",
  success:"#6ee7a0", danger:"#f87171", warning:"#fbbf24", info:"#60a5fa",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Georgia',serif";
const R  = { sm:6, md:10, lg:14, xl:18, full:9999 };

// ── Helpers ─────────────────────────────────────────────────
const fmtPrix = (n?: number) =>
  n !== undefined ? n.toLocaleString('fr-FR', { style:'currency', currency:'EUR' }) : '—';
const fmtDate = (s?: string) =>
  s ? new Date(s).toLocaleDateString('fr-FR', { day:'2-digit', month:'short', year:'numeric' }) : '—';

const Badge = ({ statut }: { statut: PayStatut }) => {
  const c = STATUT_COLORS[statut] || { bg:'rgba(255,255,255,0.1)', color:'#fff' };
  return (
    <span style={{ background:c.bg, color:c.color, borderRadius:R.full,
      padding:'2px 10px', fontSize:11, fontWeight:700, whiteSpace:'nowrap' }}>
      {STATUT_LABELS[statut] || statut}
    </span>
  );
};

// ── Props ────────────────────────────────────────────────────
interface Props {
  user: { id: string; prenom?: string; nom?: string; role?: string };
  // Mode fondatrice : gestion complète
  // Mode client : vue de ses paiements + parcours
  initialPaiementId?: string;
  onClose?: () => void;
}

type Vue = 'liste' | 'detail' | 'creer' | 'payer';

export default function PaymentCenter({ user, initialPaiementId, onClose }: Props) {
  const isFondatrice = user.role === 'fondatrice';

  const [vue, setVue]               = useState<Vue>('liste');
  const [paiements, setPaiements]   = useState<Paiement[]>([]);
  const [actif, setActif]           = useState<Paiement | null>(null);
  const [echeances, setEcheances]   = useState<Echeance[]>([]);
  const [recus, setRecus]           = useState<Recu[]>([]);
  const [historique, setHistorique] = useState<any[]>([]);
  const [loading, setLoading]       = useState(false);
  const [erreur, setErreur]         = useState('');
  const [succes, setSucces]         = useState('');

  // Formulaire création
  const [form, setForm] = useState({
    motif:'', clientNom:'', clientEmail:'', module:'',
    montantTotal:'', typePaiement:'integral', nbEcheances:'1',
    dateEcheance:'', notes:'',
  });

  // Formulaire paiement
  const [payForm, setPayForm] = useState({
    mode:'virement' as PayMode,
    montant:'', note:'',
  });

  const [filtreStatut, setFiltreStatut] = useState<string>('tous');

  // ── Chargement ─────────────────────────────────────────────
  const charger = useCallback(async () => {
    setLoading(true); setErreur('');
    try {
      const filters = isFondatrice ? {} : { clientId: user.id };
      const data = await getPaiements(filters);
      setPaiements(data);
      if (initialPaiementId) {
        const p = data.find(x => x.id === initialPaiementId);
        if (p) ouvrirDetail(p);
      }
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  }, [user.id, isFondatrice, initialPaiementId]);

  useEffect(() => { charger(); }, [charger]);

  const ouvrirDetail = async (p: Paiement) => {
    setActif(p); setVue('detail'); setErreur(''); setSucces('');
    try {
      const [ech, rec, hist] = await Promise.all([
        getEcheances(p.id), getRecus(p.id), getHistorique(p.id),
      ]);
      setEcheances(ech); setRecus(rec); setHistorique(hist);
    } catch(e: any) { setErreur(e.message); }
  };

  // ── Créer un paiement ─────────────────────────────────────
  const handleCreer = async () => {
    if (!form.motif || !form.montantTotal) {
      setErreur('Motif et montant obligatoires'); return;
    }
    setLoading(true); setErreur('');
    try {
      const montant = parseFloat(form.montantTotal);
      const acompte = form.typePaiement === 'acompte' ? Math.round(montant * 0.3 * 100) / 100 : 0;
      const p = await creerPaiement({
        clientNom:    form.clientNom || undefined,
        clientEmail:  form.clientEmail || undefined,
        module:       form.module || undefined,
        motif:        form.motif,
        montantTotal: montant,
        montantAcompte: acompte,
        typePaiement: form.typePaiement,
        nbEcheances:  parseInt(form.nbEcheances) || 1,
        dateEcheance: form.dateEcheance || undefined,
        notes:        form.notes || undefined,
        creePar:      user.id,
      });
      if (form.typePaiement === 'fractionne' && parseInt(form.nbEcheances) > 1) {
        await creerEcheances(p.id, montant, parseInt(form.nbEcheances), form.dateEcheance);
      }
      setSucces(`Paiement ${p.reference} créé avec succès`);
      await charger();
      ouvrirDetail(p);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  // ── Valider un paiement ───────────────────────────────────
  const handleValider = async () => {
    if (!actif) return;
    const montant = parseFloat(payForm.montant) || actif.montant_total;
    setLoading(true); setErreur('');
    try {
      const p = await validerManuellement(
        actif.id, user.id, payForm.mode, montant, payForm.note || undefined
      );
      // Générer le reçu automatiquement
      const recu = await genererRecu(actif.id, montant);
      // Notifier le client si possible
      if (actif.client_id) {
        await notifierPaiement(
          actif.client_id,
          `Paiement confirmé — ${actif.reference}`,
          `Votre paiement de ${fmtPrix(montant)} a été confirmé. Réf. reçu : ${recu.reference}`,
          actif.id
        );
      }
      setSucces(`Paiement validé · Reçu ${recu.reference} généré`);
      await ouvrirDetail({ ...actif, ...p });
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); setVue('detail'); }
  };

  // ── Changer statut ────────────────────────────────────────
  const handleStatut = async (statut: PayStatut) => {
    if (!actif) return;
    setLoading(true); setErreur('');
    try {
      const p = await mettreAJourStatut(actif.id, statut);
      setActif(p);
      setSucces(`Statut mis à jour : ${STATUT_LABELS[statut]}`);
      const hist = await getHistorique(actif.id);
      setHistorique(hist);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  // ── Payer une échéance ────────────────────────────────────
  const handlePayerEcheance = async (ech: Echeance) => {
    setLoading(true); setErreur('');
    try {
      await payerEcheance(ech.id, payForm.mode, payForm.note || undefined);
      const echs = await getEcheances(actif!.id);
      setEcheances(echs);
      const toutPaye = echs.every(e => e.statut === 'paye');
      if (toutPaye && actif) {
        await mettreAJourStatut(actif.id, 'paye', { montantPaye: actif.montant_total });
        await genererRecu(actif.id, actif.montant_total);
      }
      setSucces(`Échéance ${ech.numero} payée`);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  // ── UI helpers ────────────────────────────────────────────
  const Inp = ({ label, value, onChange, type='text', placeholder='' }: any) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:10, fontWeight:700, color:C.mutedL,
        letterSpacing:'0.07em', textTransform:'uppercase', display:'block', marginBottom:4 }}>
        {label}
      </label>
      <input type={type} value={value} onChange={(e:any)=>onChange(e.target.value)}
        placeholder={placeholder}
        style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
          borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:13,
          outline:'none', fontFamily:SA, boxSizing:'border-box' }}/>
    </div>
  );

  const Sel = ({ label, value, onChange, options }: any) => (
    <div style={{ marginBottom:12 }}>
      <label style={{ fontSize:10, fontWeight:700, color:C.mutedL,
        letterSpacing:'0.07em', textTransform:'uppercase', display:'block', marginBottom:4 }}>
        {label}
      </label>
      <select value={value} onChange={(e:any)=>onChange(e.target.value)}
        style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
          borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:13,
          outline:'none', fontFamily:SA, boxSizing:'border-box' }}>
        {options.map((o: any) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );

  // ── RENDU LISTE ───────────────────────────────────────────
  const renderListe = () => {
    const filtered = paiements.filter(p =>
      filtreStatut === 'tous' || p.statut === filtreStatut
    );
    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {/* Header */}
        <div style={{ padding:'14px 16px', borderBottom:'1px solid '+C.border,
          background:C.surface, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:16, fontWeight:800, color:C.cream, fontFamily:FS }}>
              💳 Paiements
            </div>
            <div style={{ fontSize:11, color:C.muted }}>
              {paiements.length} demande{paiements.length !== 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            {isFondatrice && (
              <button onClick={() => { setVue('creer'); setErreur(''); setSucces(''); }}
                style={{ background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
                  border:'none', borderRadius:R.md, padding:'7px 14px',
                  color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:SA }}>
                + Nouveau
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

        {/* Filtres statut */}
        <div style={{ padding:'8px 14px', borderBottom:'1px solid '+C.border,
          display:'flex', gap:6, overflowX:'auto' }}>
          {['tous','en_attente','paye','partiellement_paye','echoue'].map(s => (
            <button key={s} onClick={() => setFiltreStatut(s)}
              style={{ background: filtreStatut===s ? C.violet : 'rgba(255,255,255,0.05)',
                border:'1px solid '+(filtreStatut===s ? C.violet : C.border),
                borderRadius:R.full, padding:'4px 12px', color: filtreStatut===s ? '#fff' : C.muted,
                fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap', fontFamily:SA }}>
              {s === 'tous' ? 'Tous' : STATUT_LABELS[s as PayStatut] || s}
            </button>
          ))}
        </div>

        {/* Erreur */}
        {erreur && (
          <div style={{ margin:'8px 14px', background:'rgba(248,113,113,0.1)',
            border:'1px solid rgba(248,113,113,0.3)', borderRadius:R.md,
            padding:'8px 12px', fontSize:11, color:C.danger, display:'flex',
            justifyContent:'space-between' }}>
            ⚠️ {erreur}
            <button onClick={()=>setErreur('')} style={{ background:'none', border:'none',
              color:C.danger, cursor:'pointer' }}>✕</button>
          </div>
        )}

        {/* Liste */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading && (
            <div style={{ textAlign:'center', padding:32 }}>
              <div style={{ width:24, height:24, borderRadius:'50%',
                border:`2px solid ${C.violetG||'rgba(124,58,237,0.2)'}`, borderTopColor:C.violet,
                animation:'spin 0.7s linear infinite', margin:'0 auto' }}/>
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign:'center', padding:'48px 24px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>💳</div>
              <div style={{ fontSize:14, color:C.cream, fontWeight:600, marginBottom:6 }}>
                Aucun paiement
              </div>
              <div style={{ fontSize:12, color:C.muted }}>
                {isFondatrice ? 'Créez une demande de paiement pour commencer'
                  : 'Vos paiements apparaîtront ici'}
              </div>
            </div>
          )}
          {filtered.map(p => {
            const montantAff = p.type_paiement === 'acompte' ? p.montant_acompte : p.montant_total;
            const pct = p.montant_total > 0
              ? Math.round((p.montant_paye / p.montant_total) * 100) : 0;
            return (
              <div key={p.id} onClick={() => ouvrirDetail(p)}
                style={{ padding:'13px 16px', borderBottom:'1px solid '+C.border,
                  cursor:'pointer', transition:'background 0.15s' }}>
                <div style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'flex-start', marginBottom:6 }}>
                  <div style={{ flex:1, minWidth:0, marginRight:10 }}>
                    <div style={{ fontSize:12, fontWeight:800, color:C.cream,
                      overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {p.motif}
                    </div>
                    <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                      {p.reference} · {p.client_nom || 'Client'} · {fmtDate(p.created_at)}
                    </div>
                  </div>
                  <Badge statut={p.statut}/>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <div style={{ fontSize:16, fontWeight:800, color:C.gold }}>
                    {fmtPrix(montantAff)}
                    {p.montant_total !== montantAff && (
                      <span style={{ fontSize:10, color:C.muted, fontWeight:400, marginLeft:4 }}>
                        / {fmtPrix(p.montant_total)}
                      </span>
                    )}
                  </div>
                  {p.statut === 'partiellement_paye' && (
                    <div style={{ fontSize:10, color:C.warning }}>{pct}% payé</div>
                  )}
                  {p.recu_genere && (
                    <span style={{ fontSize:10, color:C.success }}>✓ Reçu</span>
                  )}
                </div>
                {/* Barre de progression */}
                {p.montant_paye > 0 && p.montant_total > 0 && (
                  <div style={{ marginTop:6, height:3, background:'rgba(255,255,255,0.07)',
                    borderRadius:R.full, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:`${pct}%`,
                      background:`linear-gradient(90deg,${C.violet},${C.violetL})`,
                      borderRadius:R.full, transition:'width 0.5s' }}/>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── RENDU CRÉATION ────────────────────────────────────────
  const renderCreer = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid '+C.border,
        background:C.surface, display:'flex', alignItems:'center', gap:10 }}>
        <button onClick={() => setVue('liste')}
          style={{ background:'none', border:'none', color:C.muted, fontSize:18, cursor:'pointer' }}>
          ←
        </button>
        <div style={{ fontSize:15, fontWeight:800, color:C.cream, fontFamily:FS }}>
          Nouvelle demande de paiement
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', padding:'16px' }}>
        {erreur && (
          <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
            borderRadius:R.md, padding:'9px 12px', fontSize:12, color:C.danger, marginBottom:14 }}>
            ⚠️ {erreur}
          </div>
        )}

        <Inp label="Motif *" value={form.motif}
          onChange={(v:string)=>setForm(f=>({...f,motif:v}))}
          placeholder="Ex: Acompte événement mariage Dupont"/>
        <Inp label="Client — nom" value={form.clientNom}
          onChange={(v:string)=>setForm(f=>({...f,clientNom:v}))}
          placeholder="Nom complet du client"/>
        <Inp label="Client — email" value={form.clientEmail} type="email"
          onChange={(v:string)=>setForm(f=>({...f,clientEmail:v}))}
          placeholder="email@client.com"/>
        <Inp label="Module" value={form.module}
          onChange={(v:string)=>setForm(f=>({...f,module:v}))}
          placeholder="EVENTS / FOOD / BSH / VILO..."/>

        <div style={{ display:'flex', gap:10 }}>
          <div style={{ flex:1 }}>
            <Inp label="Montant total (€) *" value={form.montantTotal} type="number"
              onChange={(v:string)=>setForm(f=>({...f,montantTotal:v}))}
              placeholder="0.00"/>
          </div>
          <div style={{ flex:1 }}>
            <Inp label="Date d'échéance" value={form.dateEcheance} type="date"
              onChange={(v:string)=>setForm(f=>({...f,dateEcheance:v}))}/>
          </div>
        </div>

        <Sel label="Type de paiement" value={form.typePaiement}
          onChange={(v:string)=>setForm(f=>({...f,typePaiement:v}))}
          options={[
            { value:'integral',    label:'Paiement intégral' },
            { value:'acompte',     label:'Acompte (30% automatique)' },
            { value:'solde',       label:'Solde restant' },
            { value:'fractionne',  label:'Paiement fractionné' },
          ]}/>

        {form.typePaiement === 'fractionne' && (
          <Inp label="Nombre d'échéances" value={form.nbEcheances} type="number"
            onChange={(v:string)=>setForm(f=>({...f,nbEcheances:v}))}
            placeholder="2, 3, 4..."/>
        )}

        {form.typePaiement === 'acompte' && form.montantTotal && (
          <div style={{ background:'rgba(201,168,76,0.08)', border:'1px solid rgba(201,168,76,0.2)',
            borderRadius:R.md, padding:'9px 12px', fontSize:12, color:C.gold, marginBottom:12 }}>
            Acompte calculé : {fmtPrix(Math.round(parseFloat(form.montantTotal) * 0.3 * 100)/100)}
            <span style={{ color:C.muted, marginLeft:6 }}>(30%)</span>
          </div>
        )}

        <Inp label="Notes internes" value={form.notes}
          onChange={(v:string)=>setForm(f=>({...f,notes:v}))}
          placeholder="Informations complémentaires..."/>

        {/* Mode manuel — avertissement honnête PSP */}
        <div style={{ background:'rgba(96,165,250,0.08)', border:'1px solid rgba(96,165,250,0.2)',
          borderRadius:R.md, padding:'10px 13px', fontSize:12, color:C.info, marginBottom:16,
          lineHeight:1.6 }}>
          ℹ️ <strong>Mode paiement manuel</strong> — La demande sera créée et suivie dans Bellaïa.
          Le paiement réel (virement, SumUp, PayPal) est effectué en dehors de l'application
          et confirmé manuellement par la fondatrice.
          L'intégration PSP directe (SumUp API, PayPal SDK) sera disponible
          dans une prochaine mise à jour.
        </div>

        <button onClick={handleCreer} disabled={loading}
          style={{ width:'100%', background:loading
            ? 'rgba(124,58,237,0.3)'
            : `linear-gradient(135deg,${C.violet},${C.violetD})`,
            border:'none', borderRadius:R.md, padding:'12px',
            color:'#fff', fontSize:14, fontWeight:700, cursor:loading?'not-allowed':'pointer',
            fontFamily:SA, boxShadow:loading?'none':'0 4px 16px rgba(124,58,237,0.35)' }}>
          {loading ? '⏳ Création...' : '✓ Créer la demande de paiement'}
        </button>
      </div>
    </div>
  );

  // ── RENDU DÉTAIL ──────────────────────────────────────────
  const renderDetail = () => {
    if (!actif) return null;
    const montantRestant = actif.montant_total - (actif.montant_paye || 0);
    const pct = actif.montant_total > 0
      ? Math.round(((actif.montant_paye||0) / actif.montant_total) * 100) : 0;

    return (
      <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
        {/* Header */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid '+C.border,
          background:C.surface, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
          <button onClick={() => { setVue('liste'); setActif(null); }}
            style={{ background:'none', border:'none', color:C.muted, fontSize:18, cursor:'pointer' }}>
            ←
          </button>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:14, fontWeight:800, color:C.cream, fontFamily:FS }}>
              {actif.motif}
            </div>
            <div style={{ fontSize:10, color:C.muted }}>{actif.reference}</div>
          </div>
          <Badge statut={actif.statut}/>
        </div>

        <div style={{ flex:1, overflowY:'auto', padding:'14px 16px' }}>
          {/* Messages */}
          {succes && (
            <div style={{ background:'rgba(110,231,160,0.1)', border:'1px solid rgba(110,231,160,0.25)',
              borderRadius:R.md, padding:'9px 12px', fontSize:12, color:C.success,
              marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              ✅ {succes}
              <button onClick={()=>setSucces('')} style={{ background:'none', border:'none',
                color:C.success, cursor:'pointer' }}>✕</button>
            </div>
          )}
          {erreur && (
            <div style={{ background:'rgba(248,113,113,0.1)', border:'1px solid rgba(248,113,113,0.3)',
              borderRadius:R.md, padding:'9px 12px', fontSize:12, color:C.danger,
              marginBottom:12, display:'flex', justifyContent:'space-between' }}>
              ⚠️ {erreur}
              <button onClick={()=>setErreur('')} style={{ background:'none', border:'none',
                color:C.danger, cursor:'pointer' }}>✕</button>
            </div>
          )}

          {/* Carte montants */}
          <div style={{ background:C.card, border:'1px solid '+C.border,
            borderRadius:R.lg, padding:'16px', marginBottom:14 }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
              {[
                { label:'Total', value:fmtPrix(actif.montant_total), color:C.cream },
                { label:'Payé', value:fmtPrix(actif.montant_paye||0), color:C.success },
                { label:'Restant', value:fmtPrix(montantRestant), color:montantRestant>0?C.warning:C.success },
              ].map(item => (
                <div key={item.label} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:C.muted, textTransform:'uppercase',
                    letterSpacing:'0.07em', marginBottom:3 }}>{item.label}</div>
                  <div style={{ fontSize:15, fontWeight:800, color:item.color }}>{item.value}</div>
                </div>
              ))}
            </div>
            {/* Barre progression */}
            <div style={{ height:6, background:'rgba(255,255,255,0.07)', borderRadius:R.full }}>
              <div style={{ height:'100%', width:`${pct}%`,
                background:`linear-gradient(90deg,${C.violet},${C.violetL})`,
                borderRadius:R.full, transition:'width 0.5s' }}/>
            </div>
            <div style={{ textAlign:'center', fontSize:10, color:C.muted, marginTop:4 }}>
              {pct}% payé
            </div>
          </div>

          {/* Infos */}
          <div style={{ background:C.card, border:'1px solid '+C.border,
            borderRadius:R.lg, padding:'14px', marginBottom:14 }}>
            {[
              ['Client',      actif.client_nom || '—'],
              ['Module',      actif.module || '—'],
              ['Type',        actif.type_paiement],
              ['Mode',        actif.mode ? MODE_LABELS[actif.mode as PayMode] : '—'],
              ['Échéance',    fmtDate(actif.date_echeance)],
              ['Créé le',     fmtDate(actif.created_at)],
              ['Payé le',     fmtDate(actif.date_paiement)],
              ['Réf. externe', actif.provider_reference || '—'],
            ].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between',
                padding:'5px 0', borderBottom:'1px solid rgba(255,255,255,0.04)',
                fontSize:12 }}>
                <span style={{ color:C.muted }}>{k}</span>
                <span style={{ color:C.cream, fontWeight:600 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Actions fondatrice */}
          {isFondatrice && actif.statut !== 'paye' && actif.statut !== 'annule' && (
            <div style={{ background:C.card, border:'1px solid '+C.border,
              borderRadius:R.lg, padding:'14px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.mutedL,
                textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                Valider le paiement
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>Mode reçu</label>
                <select value={payForm.mode}
                  onChange={e=>setPayForm(f=>({...f,mode:e.target.value as PayMode}))}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border,
                    borderRadius:R.md, padding:'8px 10px', color:C.cream, fontSize:12,
                    outline:'none', fontFamily:SA, boxSizing:'border-box' }}>
                  {(Object.entries(MODE_LABELS) as [PayMode,string][]).map(([v,l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom:10 }}>
                <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>Montant reçu (€)</label>
                <input type="number"
                  value={payForm.montant || actif.montant_total}
                  onChange={e=>setPayForm(f=>({...f,montant:e.target.value}))}
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border,
                    borderRadius:R.md, padding:'8px 10px', color:C.cream, fontSize:12,
                    outline:'none', fontFamily:SA, boxSizing:'border-box' }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ fontSize:10, color:C.muted, display:'block', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'0.06em' }}>Note</label>
                <input type="text" value={payForm.note}
                  onChange={e=>setPayForm(f=>({...f,note:e.target.value}))}
                  placeholder="Référence virement, remarque..."
                  style={{ width:'100%', background:C.card2, border:'1px solid '+C.border,
                    borderRadius:R.md, padding:'8px 10px', color:C.cream, fontSize:12,
                    outline:'none', fontFamily:SA, boxSizing:'border-box' }}/>
              </div>

              {/* Avertissement mode manuel */}
              <div style={{ background:'rgba(251,191,36,0.08)', border:'1px solid rgba(251,191,36,0.2)',
                borderRadius:R.md, padding:'8px 10px', fontSize:11, color:C.warning,
                marginBottom:10, lineHeight:1.5 }}>
                ⚠️ Mode paiement manuel — Confirmez uniquement après réception réelle du paiement.
              </div>

              <button onClick={handleValider} disabled={loading}
                style={{ width:'100%', background:`linear-gradient(135deg,${C.success.replace('#','rgba(').replace('a0','160,0.9')},#059669)`,
                  border:'none', borderRadius:R.md, padding:'11px',
                  color:'#0a1f14', fontSize:13, fontWeight:800,
                  cursor:loading?'not-allowed':'pointer', fontFamily:SA }}>
                {loading ? '⏳...' : '✅ Confirmer le paiement + Générer le reçu'}
              </button>

              {/* Actions statut */}
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                {actif.statut !== 'en_attente' && (
                  <button onClick={()=>handleStatut('en_attente')}
                    style={{ flex:1, background:'rgba(96,165,250,0.1)',
                      border:'1px solid rgba(96,165,250,0.25)', borderRadius:R.md,
                      padding:'7px', color:C.info, fontSize:11, cursor:'pointer', fontFamily:SA }}>
                    En attente
                  </button>
                )}
                <button onClick={()=>handleStatut('annule')}
                  style={{ flex:1, background:'rgba(248,113,113,0.1)',
                    border:'1px solid rgba(248,113,113,0.25)', borderRadius:R.md,
                    padding:'7px', color:C.danger, fontSize:11, cursor:'pointer', fontFamily:SA }}>
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Échéances */}
          {echeances.length > 0 && (
            <div style={{ background:C.card, border:'1px solid '+C.border,
              borderRadius:R.lg, padding:'14px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.mutedL,
                textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                Échéances ({echeances.length})
              </div>
              {echeances.map(ech => (
                <div key={ech.id} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'8px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                  <div>
                    <div style={{ fontSize:12, color:C.cream, fontWeight:600 }}>
                      Échéance {ech.numero} — {fmtPrix(ech.montant)}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>
                      {fmtDate(ech.date_echeance)}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <span style={{
                      background: ech.statut==='paye'?'rgba(110,231,160,0.15)':'rgba(251,191,36,0.15)',
                      color: ech.statut==='paye'?C.success:C.warning,
                      borderRadius:R.full, padding:'2px 8px', fontSize:10, fontWeight:700
                    }}>
                      {ech.statut==='paye'?'Payée':'En attente'}
                    </span>
                    {isFondatrice && ech.statut !== 'paye' && (
                      <button onClick={()=>handlePayerEcheance(ech)}
                        style={{ background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
                          border:'none', borderRadius:R.sm, padding:'4px 10px',
                          color:'#fff', fontSize:10, fontWeight:700, cursor:'pointer', fontFamily:SA }}>
                        Valider
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reçus */}
          {recus.length > 0 && (
            <div style={{ background:C.card, border:'1px solid '+C.border,
              borderRadius:R.lg, padding:'14px', marginBottom:14 }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.mutedL,
                textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                Reçus générés
              </div>
              {recus.map(r => (
                <div key={r.id} style={{ display:'flex', justifyContent:'space-between',
                  alignItems:'center', padding:'7px 0' }}>
                  <div>
                    <div style={{ fontSize:12, color:C.success, fontWeight:700 }}>
                      ✓ {r.reference}
                    </div>
                    <div style={{ fontSize:10, color:C.muted }}>
                      {fmtPrix(r.montant)} · {fmtDate(r.genere_le)}
                    </div>
                  </div>
                  {r.storage_path && (
                    <button style={{ background:'rgba(110,231,160,0.1)',
                      border:'1px solid rgba(110,231,160,0.25)', borderRadius:R.sm,
                      padding:'5px 10px', color:C.success, fontSize:11, cursor:'pointer', fontFamily:SA }}>
                      📄 Télécharger
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Historique */}
          {historique.length > 0 && (
            <div style={{ background:C.card, border:'1px solid '+C.border,
              borderRadius:R.lg, padding:'14px' }}>
              <div style={{ fontSize:11, fontWeight:700, color:C.mutedL,
                textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:10 }}>
                Historique
              </div>
              {historique.map((h, i) => (
                <div key={i} style={{ display:'flex', gap:8, padding:'5px 0',
                  borderBottom:'1px solid rgba(255,255,255,0.04)', fontSize:11 }}>
                  <span style={{ color:C.muted, flexShrink:0 }}>{fmtDate(h.created_at)}</span>
                  <span style={{ color:C.mutedL }}>
                    {h.ancien_statut} → <strong style={{color:C.cream}}>{h.nouveau_statut}</strong>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      fontFamily:SA, overflow:'hidden', background:C.bg }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {vue === 'liste'  && renderListe()}
      {vue === 'creer'  && renderCreer()}
      {vue === 'detail' && renderDetail()}
    </div>
  );
}

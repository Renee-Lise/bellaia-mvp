// src/modules/assistant/BellaiaAssistant.tsx
// IA Bellaïa — Interface conversationnelle + actions validées fondatrice
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { IASession, IAMessage, IABrouillon, IAAction } from "./assistantTypes";
import { CONTEXTES } from "./assistantTypes";

const C = {
  bg:"#09070f", surface:"#181428", card:"#1e1a30", card2:"#231f38",
  border:"rgba(124,58,237,0.22)", borderG:"rgba(201,168,76,0.2)",
  violet:"#7c3aed", violetL:"#9d6ef5", violetD:"#5b21b6",
  gold:"#c9a84c", goldL:"#e8c96a",
  cream:"#f0ebff", muted:"#8b7fa8", mutedL:"#b8aed0",
  success:"#6ee7a0", danger:"#f87171", warning:"#fbbf24", info:"#60a5fa",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Georgia',serif";
const R  = { sm:6, md:10, lg:14, xl:18, full:9999 };

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function getToken(): Promise<string> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(SB_URL, SB_KEY);
  const { data } = await sb.auth.getSession();
  if (!data.session) throw new Error('SESSION_ABSENTE');
  return data.session.access_token;
}

async function sbFetch(path: string, opts: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
    ...opts,
    headers: {
      apikey: SB_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(opts.headers || {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Erreur ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

interface Props {
  user: { id: string; prenom?: string; nom?: string; role?: string };
  contexteInitial?: string;
  onClose?: () => void;
}

export default function BellaiaAssistant({ user, contexteInitial, onClose }: Props) {
  const isFondatrice = user.role === 'fondatrice';
  const [sessions, setSessions]     = useState<IASession[]>([]);
  const [session, setSession]       = useState<IASession | null>(null);
  const [messages, setMessages]     = useState<IAMessage[]>([]);
  const [brouillons, setBrouillons] = useState<IABrouillon[]>([]);
  const [input, setInput]           = useState('');
  const [contexte, setContexte]     = useState(contexteInitial || 'general');
  const [loading, setLoading]       = useState(false);
  const [erreur, setErreur]         = useState('');
  const [vue, setVue]               = useState<'chat'|'sessions'|'brouillons'>('chat');
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const nomFondatrice = [user.prenom, user.nom].filter(Boolean).join(' ') || 'Fondatrice';

  // ── Charger les sessions ────────────────────────────────────
  const chargerSessions = useCallback(async () => {
    try {
      const data = await sbFetch(
        `ia_conversations?user_id=eq.${user.id}&archive=eq.false&order=updated_at.desc`
      );
      setSessions(data || []);
    } catch(e: any) { setErreur(e.message); }
  }, [user.id]);

  useEffect(() => { chargerSessions(); }, [chargerSessions]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [messages]);

  // ── Créer ou charger une session ────────────────────────────
  const nouvelleSession = async () => {
    try {
      const data = await sbFetch('ia_conversations', {
        method: 'POST',
        body: JSON.stringify({
          user_id:  user.id,
          titre:    `Session ${new Date().toLocaleDateString('fr-FR')}`,
          contexte,
          archive:  false,
        }),
      });
      const s = data?.[0];
      if (s) { setSession(s); setMessages([]); setVue('chat'); }
    } catch(e: any) { setErreur(e.message); }
  };

  const chargerSession = async (s: IASession) => {
    setSession(s); setVue('chat'); setErreur('');
    try {
      const data = await sbFetch(
        `ia_messages?conversation_id=eq.${s.id}&order=created_at.asc`
      );
      setMessages(data || []);
    } catch(e: any) { setErreur(e.message); }
  };

  // ── Envoyer un message à l'IA ───────────────────────────────
  const envoyer = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setInput('');
    setLoading(true);
    setErreur('');

    let currentSession = session;
    if (!currentSession) {
      try {
        const data = await sbFetch('ia_conversations', {
          method: 'POST',
          body: JSON.stringify({
            user_id: user.id,
            titre:   question.slice(0, 60),
            contexte,
            archive: false,
          }),
        });
        currentSession = data?.[0];
        if (currentSession) setSession(currentSession);
      } catch(e: any) { setErreur(e.message); setLoading(false); return; }
    }

    // Ajouter le message utilisateur immédiatement
    const msgUser: IAMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: currentSession!.id,
      role: 'user',
      contenu: question,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, msgUser]);

    try {
      // Sauvegarder le message user en base
      await sbFetch('ia_messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: currentSession!.id,
          role:    'user',
          contenu: question,
        }),
      });

      // Construire l'historique pour l'IA
      const historique = messages.slice(-10).map(m => ({
        role:    m.role === 'user' ? 'user' : 'assistant',
        content: m.contenu,
      }));

      // Prompt système contextuel
      const systemPrompt = `Tu es Bellaïa, assistante intelligente de Bella'Studio (Sinnamary, Guyane française).
Tu assistes ${nomFondatrice}, fondatrice de Bella'Studio.
Contexte actuel : ${CONTEXTES.find(c=>c.value===contexte)?.label || contexte}.
Principe fondamental : tu proposes, tu analyses, tu rédiges. Tu ne modifies jamais de données sans validation explicite de la fondatrice.
Tu réponds toujours en français. Tu es précise, professionnelle, bienveillante et créative.
Si tu génères un document (devis, contrat, email, analyse), indique-le clairement en commençant par "📄 DOCUMENT :" pour que la fondatrice puisse le valider.`;

      // Appel à l'API Claude
      const tok = typeof window !== "undefined" ? localStorage.getItem("bellaia_token") || "" : "";
      const response = await fetch('/api/ia/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tok}` },
        body: JSON.stringify({
          systemPrompt,
          messages: [...historique, { role:'user', content:question }],
          sessionId: currentSession!.id,
          userId:    user.id,
          contexte,
        }),
      });

      if (!response.ok) {
        // Fallback si la route IA n'existe pas encore
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur IA ${response.status}`);
      }

      const data = await response.json();
      const reponse = data.content || data.response || '...';

      // Sauvegarder la réponse IA
      await sbFetch('ia_messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: currentSession!.id,
          role:    'assistant',
          contenu: reponse,
          modele:  data.model || 'claude-sonnet-4-6',
          tokens:  data.usage?.output_tokens,
        }),
      });

      const msgAssistant: IAMessage = {
        id: `tmp-ia-${Date.now()}`,
        conversation_id: currentSession!.id,
        role: 'assistant',
        contenu: reponse,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msgAssistant]);

      // Si c'est un document → créer un brouillon automatiquement
      if (reponse.includes('📄 DOCUMENT :')) {
        await sbFetch('ia_brouillons', {
          method: 'POST',
          body: JSON.stringify({
            conversation_id: currentSession!.id,
            user_id:  user.id,
            type:     'document',
            titre:    question.slice(0, 80),
            contenu:  reponse,
            statut:   'propose',
          }),
        });
      }

      // Mettre à jour le titre de la session si c'est le premier message
      if (messages.length === 0) {
        await sbFetch(`ia_conversations?id=eq.${currentSession!.id}`, {
          method: 'PATCH',
          body: JSON.stringify({ titre: question.slice(0, 60) }),
        });
      }
    } catch(e: any) {
      // Afficher l'erreur dans le chat
      const msgErr: IAMessage = {
        id: `tmp-err-${Date.now()}`,
        conversation_id: currentSession!.id,
        role: 'assistant',
        contenu: `⚠️ ${e.message === 'Failed to fetch'
          ? 'La route /api/ia/chat n\'est pas encore configurée. Vérifiez les variables d\'environnement ANTHROPIC_API_KEY.'
          : e.message}`,
        created_at: new Date().toISOString(),
      };
      setMessages(prev => [...prev, msgErr]);
      console.error('[BellaiaAssistant] erreur IA:', e.message);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Valider un brouillon ────────────────────────────────────
  const validerBrouillon = async (b: IABrouillon, statut: 'valide'|'refuse') => {
    try {
      await sbFetch(`ia_brouillons?id=eq.${b.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ statut }),
      });
      setBrouillons(prev => prev.map(x => x.id===b.id ? {...x, statut} : x));
    } catch(e: any) { setErreur(e.message); }
  };

  const chargerBrouillons = async () => {
    try {
      const data = await sbFetch(
        `ia_brouillons?user_id=eq.${user.id}&order=created_at.desc`
      );
      setBrouillons(data || []);
    } catch(e: any) { setErreur(e.message); }
  };

  // ── Suggestions de prompts ──────────────────────────────────
  const suggestions = {
    general:   ['Analyse mes ventes du mois', 'Rédige un email de suivi client', 'Quels sont mes prochains événements ?'],
    events:    ['Rédige un devis pour un événement', 'Analyse les dossiers en cours', 'Crée un planning type mariage'],
    food:      ['Optimise mon menu du jour', 'Calcule le coût d\'une recette', 'Rédige une fiche technique'],
    bsh:       ['Rédige une fiche produit', 'Analyse les commandes récentes', 'Propose une offre VIP'],
    compta:    ['Résume mes paiements du mois', 'Identifie les impayés', 'Prépare un rapport financier'],
    crm:       ['Liste mes clients actifs', 'Rédige un message de relance', 'Analyse la fidélité client'],
    documents: ['Génère un contrat type', 'Liste les documents manquants', 'Rédige une charte'],
  }[contexte] || ['Bonjour Bellaïa, aide-moi avec...'];

  // ── Rendu message ───────────────────────────────────────────
  const renderMessage = (msg: IAMessage, i: number) => {
    const isUser = msg.role === 'user';
    const isDoc  = msg.contenu.includes('📄 DOCUMENT :');
    return (
      <div key={msg.id} style={{ display:'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom:12, gap:8, alignItems:'flex-end' }}>
        {!isUser && (
          <div style={{ width:28, height:28, borderRadius:'50%', flexShrink:0,
            background:`linear-gradient(135deg,${C.violet},${C.gold})`,
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>
            ✦
          </div>
        )}
        <div style={{ maxWidth:'78%' }}>
          {isDoc && (
            <div style={{ fontSize:9, color:C.gold, fontWeight:700,
              letterSpacing:'0.1em', marginBottom:4, textTransform:'uppercase' }}>
              📄 Document généré — à valider
            </div>
          )}
          <div style={{
            background: isUser
              ? `linear-gradient(135deg,${C.violet},${C.violetD})`
              : isDoc ? 'rgba(201,168,76,0.08)' : C.card2,
            border: isDoc ? `1px solid ${C.borderG}` : isUser ? 'none' : `1px solid ${C.border}`,
            borderRadius: isUser
              ? `${R.lg}px ${R.lg}px 4px ${R.lg}px`
              : `${R.lg}px ${R.lg}px ${R.lg}px 4px`,
            padding:'10px 14px',
            boxShadow: isUser ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
          }}>
            <div style={{ fontSize:13, color:C.cream, lineHeight:1.65,
              whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
              {msg.contenu}
            </div>
          </div>
          <div style={{ fontSize:9, color:C.muted, marginTop:3,
            textAlign: isUser ? 'right' : 'left' }}>
            {new Date(msg.created_at).toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
            {msg.modele && ` · ${msg.modele}`}
          </div>
        </div>
      </div>
    );
  };

  // ── Vue Chat ────────────────────────────────────────────────
  const renderChat = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'12px 16px', borderBottom:'1px solid '+C.border,
        background:C.surface, display:'flex', alignItems:'center',
        gap:10, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:10, flexShrink:0,
          background:`linear-gradient(135deg,${C.violet},${C.gold})`,
          display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          ✦
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:14, fontWeight:800, color:C.cream, fontFamily:FS }}>
            Bellaïa
          </div>
          <div style={{ fontSize:10, color:C.muted }}>
            {CONTEXTES.find(c=>c.value===contexte)?.label || 'Assistante IA'}
            {session && ` · ${session.titre?.slice(0,30)}`}
          </div>
        </div>
        <div style={{ display:'flex', gap:6 }}>
          <button onClick={() => { setVue('sessions'); chargerSessions(); }}
            title="Historique" style={{ background:'rgba(255,255,255,0.06)',
              border:'1px solid '+C.border, borderRadius:R.md, padding:'6px 9px',
              color:C.muted, cursor:'pointer', fontSize:14 }}>📋</button>
          <button onClick={() => { setVue('brouillons'); chargerBrouillons(); }}
            title="Brouillons" style={{ background:'rgba(201,168,76,0.08)',
              border:'1px solid '+C.borderG, borderRadius:R.md, padding:'6px 9px',
              color:C.gold, cursor:'pointer', fontSize:14 }}>📄</button>
          {onClose && (
            <button onClick={onClose} style={{ background:'rgba(255,255,255,0.06)',
              border:'1px solid '+C.border, borderRadius:R.md, padding:'6px 10px',
              color:C.muted, cursor:'pointer' }}>✕</button>
          )}
        </div>
      </div>

      {/* Sélecteur contexte */}
      <div style={{ padding:'8px 14px', borderBottom:'1px solid '+C.border,
        background:C.surface, flexShrink:0 }}>
        <select value={contexte} onChange={e => setContexte(e.target.value)}
          style={{ width:'100%', background:C.card, border:'1px solid '+C.border,
            borderRadius:R.md, padding:'6px 10px', color:C.cream, fontSize:11,
            outline:'none', fontFamily:SA }}>
          {CONTEXTES.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px 0 16px' }}>
            <div style={{ fontSize:40, marginBottom:10 }}>✦</div>
            <div style={{ fontSize:15, fontWeight:800, color:C.cream,
              fontFamily:FS, marginBottom:6 }}>
              Bonjour, je suis Bellaïa
            </div>
            <div style={{ fontSize:12, color:C.muted, lineHeight:1.6, marginBottom:20 }}>
              Votre assistante intelligente pour Bella'Studio.<br/>
              Je propose, j'analyse, je rédige — vous validez.
            </div>
            {/* Suggestions */}
            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => { setInput(s); inputRef.current?.focus(); }}
                  style={{ background:C.card, border:'1px solid '+C.border,
                    borderRadius:R.md, padding:'9px 14px', color:C.mutedL,
                    fontSize:12, cursor:'pointer', textAlign:'left', fontFamily:SA,
                    transition:'all 0.15s' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((m, i) => renderMessage(m, i))}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'flex-end', marginBottom:12 }}>
            <div style={{ width:28, height:28, borderRadius:'50%',
              background:`linear-gradient(135deg,${C.violet},${C.gold})`,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, flexShrink:0 }}>
              ✦
            </div>
            <div style={{ background:C.card2, border:'1px solid '+C.border,
              borderRadius:`${R.lg}px ${R.lg}px ${R.lg}px 4px`,
              padding:'12px 16px', display:'flex', gap:4, alignItems:'center' }}>
              {[0,1,2].map(i => (
                <div key={i} style={{ width:6, height:6, borderRadius:'50%',
                  background:C.violetL, animation:`pulse 1.2s ease-in-out ${i*0.2}s infinite` }}/>
              ))}
            </div>
          </div>
        )}
        <div ref={endRef}/>
      </div>

      {/* Erreur */}
      {erreur && (
        <div style={{ padding:'6px 14px', background:'rgba(248,113,113,0.1)',
          borderTop:'1px solid rgba(248,113,113,0.3)', fontSize:11, color:C.danger,
          display:'flex', justifyContent:'space-between', flexShrink:0 }}>
          ⚠️ {erreur}
          <button onClick={()=>setErreur('')} style={{ background:'none', border:'none',
            color:C.danger, cursor:'pointer' }}>✕</button>
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{ padding:'10px 14px', borderTop:'1px solid '+C.border,
        background:C.surface, flexShrink:0 }}>
        <div style={{ display:'flex', gap:8, alignItems:'flex-end' }}>
          <textarea ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); envoyer(); }
            }}
            placeholder="Posez votre question à Bellaïa... (Entrée pour envoyer)"
            rows={2}
            style={{ flex:1, background:C.card, border:'1px solid '+C.border,
              borderRadius:R.md, padding:'9px 12px', color:C.cream, fontSize:13,
              outline:'none', fontFamily:SA, resize:'none', lineHeight:1.5 }}/>
          <button onClick={envoyer} disabled={!input.trim() || loading}
            style={{ background: input.trim() && !loading
              ? `linear-gradient(135deg,${C.violet},${C.violetD})`
              : 'rgba(124,58,237,0.2)',
              border:'none', borderRadius:R.md, padding:'9px 14px',
              color:'#fff', fontSize:18, cursor:input.trim()&&!loading?'pointer':'not-allowed',
              flexShrink:0, boxShadow: input.trim()&&!loading
                ?'0 2px 8px rgba(124,58,237,0.3)':'none' }}>
            ✦
          </button>
        </div>
        <div style={{ fontSize:9, color:'rgba(139,127,168,0.4)', textAlign:'center', marginTop:5 }}>
          Bellaïa propose — Renée-Lise décide · Aucune action sans validation
        </div>
      </div>
    </div>
  );

  // ── Vue Sessions ────────────────────────────────────────────
  const renderSessions = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid '+C.border,
        background:C.surface, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={() => setVue('chat')}
          style={{ background:'none', border:'none', color:C.muted, fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:14, fontWeight:800, color:C.cream, fontFamily:FS }}>
          Historique des sessions
        </div>
        <div style={{ marginLeft:'auto' }}>
          <button onClick={nouvelleSession}
            style={{ background:`linear-gradient(135deg,${C.violet},${C.violetD})`,
              border:'none', borderRadius:R.md, padding:'6px 12px',
              color:'#fff', fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:SA }}>
            + Nouvelle
          </button>
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto' }}>
        {sessions.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>✦</div>
            <div style={{ fontSize:13, color:C.muted }}>Aucune session</div>
          </div>
        )}
        {sessions.map(s => (
          <div key={s.id} onClick={() => chargerSession(s)}
            style={{ padding:'13px 16px', borderBottom:'1px solid '+C.border,
              cursor:'pointer', display:'flex', justifyContent:'space-between',
              alignItems:'center' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:C.cream }}>{s.titre}</div>
              <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                {CONTEXTES.find(c=>c.value===s.contexte)?.label || s.contexte} ·{' '}
                {new Date(s.updated_at).toLocaleDateString('fr-FR')}
              </div>
            </div>
            <span style={{ fontSize:16, color:C.muted }}>›</span>
          </div>
        ))}
      </div>
    </div>
  );

  // ── Vue Brouillons ──────────────────────────────────────────
  const renderBrouillons = () => (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ padding:'12px 16px', borderBottom:'1px solid '+C.border,
        background:C.surface, display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
        <button onClick={() => setVue('chat')}
          style={{ background:'none', border:'none', color:C.muted, fontSize:18, cursor:'pointer' }}>←</button>
        <div style={{ fontSize:14, fontWeight:800, color:C.cream, fontFamily:FS }}>
          Brouillons à valider
        </div>
      </div>
      <div style={{ flex:1, overflowY:'auto', padding:'14px' }}>
        {brouillons.length === 0 && (
          <div style={{ textAlign:'center', padding:'48px 24px' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>📄</div>
            <div style={{ fontSize:13, color:C.muted }}>Aucun brouillon</div>
          </div>
        )}
        {brouillons.map(b => (
          <div key={b.id} style={{ background:C.card, border:'1px solid '+C.border,
            borderRadius:R.lg, padding:'14px', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'flex-start', marginBottom:8 }}>
              <div>
                <div style={{ fontSize:12, fontWeight:700, color:C.cream }}>{b.titre}</div>
                <div style={{ fontSize:10, color:C.muted, marginTop:2 }}>
                  {b.type} · {new Date(b.created_at).toLocaleDateString('fr-FR')}
                </div>
              </div>
              <span style={{
                background: b.statut==='valide'   ? 'rgba(110,231,160,0.15)'
                          : b.statut==='refuse'   ? 'rgba(248,113,113,0.15)'
                          : 'rgba(251,191,36,0.15)',
                color: b.statut==='valide'   ? C.success
                     : b.statut==='refuse'   ? C.danger
                     : C.warning,
                borderRadius:R.full, padding:'2px 8px', fontSize:9, fontWeight:700 }}>
                {b.statut}
              </span>
            </div>
            <div style={{ fontSize:11, color:C.mutedL, lineHeight:1.6, marginBottom:10,
              maxHeight:80, overflow:'hidden', textOverflow:'ellipsis' }}>
              {b.contenu.slice(0, 200)}...
            </div>
            {b.statut === 'propose' && isFondatrice && (
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => validerBrouillon(b,'valide')}
                  style={{ flex:1, background:'rgba(110,231,160,0.1)',
                    border:'1px solid rgba(110,231,160,0.3)', borderRadius:R.md,
                    padding:'7px', color:C.success, fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:SA }}>
                  ✅ Valider
                </button>
                <button onClick={() => validerBrouillon(b,'refuse')}
                  style={{ flex:1, background:'rgba(248,113,113,0.1)',
                    border:'1px solid rgba(248,113,113,0.3)', borderRadius:R.md,
                    padding:'7px', color:C.danger, fontSize:11, fontWeight:700,
                    cursor:'pointer', fontFamily:SA }}>
                  ❌ Refuser
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column',
      fontFamily:SA, overflow:'hidden', background:C.bg }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:0.3;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }
      `}</style>
      {vue === 'chat'       && renderChat()}
      {vue === 'sessions'   && renderSessions()}
      {vue === 'brouillons' && renderBrouillons()}
    </div>
  );
}

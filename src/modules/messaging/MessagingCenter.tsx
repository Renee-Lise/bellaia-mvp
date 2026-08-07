// ═══════════════════════════════════════════════════════════
// BELLAÏA MESSAGING CENTER — Composant principal
// src/modules/messaging/MessagingCenter.tsx
// WhatsApp = option secondaire uniquement
// ═══════════════════════════════════════════════════════════
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, Message, Attachment } from "./messagingTypes";
import {
  getConversations, getMessages, sendMessage, deleteMessage,
  marquerLu, toggleReaction, uploadAttachment, getSignedUrl,
  subscribeToMessages, createGroupConv,
} from "./messagingApi";

// ── Palette DS Bellaïa ──────────────────────────────────────
const C = {
  bg:      "#09070f",
  surface: "#181428",
  card:    "#1e1a30",
  card2:   "#231f38",
  border:  "rgba(124,58,237,0.22)",
  violet:  "#7c3aed",
  violetL: "#9d6ef5",
  gold:    "#c9a84c",
  cream:   "#f0ebff",
  muted:   "#8b7fa8",
  mutedL:  "#b8aed0",
  success: "#6ee7a0",
  danger:  "#f87171",
  me_bg:   "linear-gradient(135deg,#7c3aed,#5b21b6)",
  other_bg:"#231f38",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Georgia',serif";
const R  = { sm:6, md:10, lg:14, xl:18, full:9999 };

// ── Helpers ─────────────────────────────────────────────────
const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) return d.toLocaleTimeString('fr-FR', { hour:'2-digit', minute:'2-digit' });
  return d.toLocaleDateString('fr-FR', { day:'2-digit', month:'short' });
};
const fmtSize = (bytes?: number) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024*1024) return `${(bytes/1024).toFixed(1)} Ko`;
  return `${(bytes/(1024*1024)).toFixed(1)} Mo`;
};
const typeIcon = (mime?: string) => {
  if (!mime) return '📎';
  if (mime.startsWith('image')) return '🖼';
  if (mime.startsWith('video')) return '🎬';
  if (mime.startsWith('audio')) return '🎵';
  if (mime.includes('pdf')) return '📄';
  return '📎';
};

// ── Props ────────────────────────────────────────────────────
interface Props {
  user: {
    id: string;
    prenom?: string;
    nom?: string;
    role?: string;
    email?: string;
  };
  onClose?: () => void;
  initialConvId?: string;
}

export default function MessagingCenter({ user, onClose, initialConvId }: Props) {
  const [convs, setConvs]         = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [texte, setTexte]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [reponseA, setReponseA]   = useState<Message | null>(null);
  const [emojiMsg, setEmojiMsg]   = useState<string | null>(null);
  const [search, setSearch]       = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupNom, setGroupNom]   = useState('');
  const [view, setView]           = useState<'liste'|'conv'>('liste');
  const [nonLus, setNonLus]       = useState<Record<string,number>>({});
  const [erreur, setErreur]       = useState('');

  const endRef    = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const fileRef   = useRef<HTMLInputElement>(null);
  const unsubRef  = useRef<(() => void) | null>(null);

  const nomComplet = [user.prenom, user.nom].filter(Boolean).join(' ') || user.email || 'Moi';

  // ── Chargement conversations ───────────────────────────────
  const chargerConvs = useCallback(async () => {
    try {
      const data = await getConversations(user.id);
      setConvs(data);
      if (initialConvId) {
        const c = data.find(x => x.id === initialConvId);
        if (c) ouvrirConv(c);
      }
    } catch (e: any) {
      setErreur(e.message);
    }
  }, [user.id, initialConvId]);

  useEffect(() => { chargerConvs(); }, [chargerConvs]);

  // ── Ouvrir une conversation ────────────────────────────────
  const ouvrirConv = useCallback(async (conv: Conversation) => {
    setActiveConv(conv);
    setView('conv');
    setMessages([]);
    setReponseA(null);
    setErreur('');
    setLoadingMsgs(true);

    // Désabonner de l'ancienne conv
    if (unsubRef.current) { unsubRef.current(); unsubRef.current = null; }

    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      // Marquer comme lus
      const nonLuIds = msgs
        .filter(m => m.auteur_id !== user.id && !m.lu_par?.includes(user.id))
        .map(m => m.id);
      if (nonLuIds.length) await marquerLu(nonLuIds, user.id);
    } catch (e: any) {
      setErreur(e.message);
    } finally {
      setLoadingMsgs(false);
    }

    // S'abonner aux nouveaux messages en temps réel
    const unsub = subscribeToMessages(conv.id, (msg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
      if (msg.auteur_id !== user.id) {
        marquerLu([msg.id], user.id).catch(() => {});
      }
    });
    unsubRef.current = unsub;
  }, [user.id]);

  useEffect(() => () => { if (unsubRef.current) unsubRef.current(); }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Envoyer message ────────────────────────────────────────
  const envoyer = async () => {
    if (!texte.trim() || !activeConv || loading) return;
    const contenu = texte.trim();
    setTexte('');
    setReponseA(null);
    setLoading(true);
    try {
      await sendMessage(activeConv.id, user.id, contenu, 'texte', {}, reponseA?.id);
    } catch (e: any) {
      setErreur(e.message);
      setTexte(contenu);
    } finally {
      setLoading(false);
    }
  };

  // ── Upload fichier ─────────────────────────────────────────
  const envoyerFichier = async (file: File) => {
    if (!activeConv) return;
    setUploading(true);
    try {
      const { storage_path, signed_url } = await uploadAttachment(file, activeConv.id, user.id);
      const isImage = file.type.startsWith('image');
      const isVideo = file.type.startsWith('video');
      const isAudio = file.type.startsWith('audio');
      const type = isImage ? 'image' : isVideo ? 'video' : isAudio ? 'audio' : 'document';
      await sendMessage(activeConv.id, user.id, file.name, type, {
        storage_path, nom: file.name, mime: file.type,
        taille: file.size, url: signed_url,
      });
    } catch (e: any) {
      setErreur(`Upload échoué : ${e.message}`);
    } finally {
      setUploading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────
  const convsFiltrees = convs.filter(c =>
    !search || (c.nom || c.client_nom || '').toLowerCase().includes(search.toLowerCase())
  );

  const renderBulle = (msg: Message, index: number) => {
    const isMe = msg.auteur_id === user.id;
    const showDate = index === 0 ||
      new Date(msg.created_at).toDateString() !== new Date(messages[index-1].created_at).toDateString();

    return (
      <React.Fragment key={msg.id}>
        {showDate && (
          <div style={{textAlign:'center',margin:'12px 0'}}>
            <span style={{fontSize:10,color:C.muted,background:C.card2,padding:'3px 10px',borderRadius:R.full}}>
              {new Date(msg.created_at).toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long'})}
            </span>
          </div>
        )}

        {msg.supprime ? (
          <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',marginBottom:4}}>
            <span style={{fontSize:11,color:C.muted,fontStyle:'italic',padding:'4px 10px',
              border:'1px solid '+C.border,borderRadius:R.lg}}>
              🚫 Message supprimé
            </span>
          </div>
        ) : (
          <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',
            marginBottom:4,gap:6,alignItems:'flex-end',position:'relative'}}>

            {/* Avatar expéditeur */}
            {!isMe && (
              <div style={{width:28,height:28,borderRadius:'50%',flexShrink:0,
                background:`linear-gradient(135deg,${C.violetL},${C.gold})`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:11,fontWeight:700,color:'#fff'}}>
                {(msg.auteur_prenom||'?')[0]}{(msg.auteur_nom||'')[0]}
              </div>
            )}

            <div style={{maxWidth:'72%'}}>
              {/* Nom expéditeur en groupe */}
              {!isMe && activeConv?.type === 'groupe' && (
                <div style={{fontSize:10,color:C.violetL,fontWeight:700,marginBottom:2,paddingLeft:4}}>
                  {[msg.auteur_prenom, msg.auteur_nom].filter(Boolean).join(' ')}
                </div>
              )}

              {/* Message répondu */}
              {msg.reponse_a && msg.msg_repondu && (
                <div style={{background:'rgba(255,255,255,0.06)',borderLeft:'2px solid '+C.violet,
                  borderRadius:R.sm,padding:'4px 8px',marginBottom:4,fontSize:11,color:C.mutedL}}>
                  ↩ {msg.msg_repondu.contenu?.slice(0,60)}...
                </div>
              )}

              {/* Bulle */}
              <div
                onClick={() => setEmojiMsg(emojiMsg === msg.id ? null : msg.id)}
                style={{
                  background: isMe ? C.me_bg : C.other_bg,
                  borderRadius: isMe
                    ? `${R.lg}px ${R.lg}px 4px ${R.lg}px`
                    : `${R.lg}px ${R.lg}px ${R.lg}px 4px`,
                  padding: msg.type === 'texte' ? '9px 13px' : '6px',
                  cursor:'pointer',
                  boxShadow: isMe ? '0 2px 8px rgba(124,58,237,0.3)' : 'none',
                  border: isMe ? 'none' : '1px solid '+C.border,
                }}>

                {/* Contenu selon le type */}
                {msg.type === 'texte' && (
                  <p style={{margin:0,fontSize:13,color:C.cream,lineHeight:1.5,wordBreak:'break-word'}}>
                    {msg.contenu}
                  </p>
                )}

                {msg.type === 'image' && msg.metadata?.url && (
                  <div>
                    <img src={msg.metadata.url} alt={msg.metadata.nom}
                      style={{maxWidth:220,maxHeight:200,borderRadius:R.md,display:'block',cursor:'pointer'}}
                      onClick={() => window.open(msg.metadata.url,'_blank')}/>
                    <p style={{margin:'4px 0 0',fontSize:10,color:isMe?'rgba(255,255,255,0.6)':C.muted}}>
                      {msg.metadata.nom}
                    </p>
                  </div>
                )}

                {msg.type === 'video' && (
                  <div>
                    <video src={msg.metadata?.url} controls
                      style={{maxWidth:220,borderRadius:R.md,display:'block'}}/>
                    <p style={{margin:'4px 0 0',fontSize:10,color:isMe?'rgba(255,255,255,0.6)':C.muted}}>
                      {msg.metadata?.nom}
                    </p>
                  </div>
                )}

                {msg.type === 'audio' && (
                  <div>
                    <audio src={msg.metadata?.url} controls
                      style={{width:200,height:36}}/>
                  </div>
                )}

                {msg.type === 'document' && (
                  <button onClick={() => window.open(msg.metadata?.url,'_blank')}
                    style={{background:'none',border:'none',cursor:'pointer',display:'flex',
                      gap:8,alignItems:'center',padding:'4px 6px'}}>
                    <span style={{fontSize:24}}>{typeIcon(msg.metadata?.mime)}</span>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:12,color:C.cream,fontWeight:600}}>{msg.metadata?.nom}</div>
                      <div style={{fontSize:10,color:isMe?'rgba(255,255,255,0.5)':C.muted}}>
                        {fmtSize(msg.metadata?.taille)} · Télécharger
                      </div>
                    </div>
                  </button>
                )}

                {msg.type === 'lien' && (
                  <a href={msg.metadata?.url} target="_blank" rel="noopener noreferrer"
                    style={{color:C.violetL,fontSize:13,wordBreak:'break-all'}}>
                    🔗 {msg.contenu}
                  </a>
                )}
              </div>

              {/* Heure + statut lu */}
              <div style={{display:'flex',justifyContent:isMe?'flex-end':'flex-start',
                gap:4,marginTop:2,alignItems:'center'}}>
                <span style={{fontSize:9,color:C.muted}}>{fmtTime(msg.created_at)}</span>
                {isMe && <span style={{fontSize:9,color:C.violetL}}>✓✓</span>}
              </div>

              {/* Réactions */}
              {msg.reactions && msg.reactions.length > 0 && (
                <div style={{display:'flex',gap:3,flexWrap:'wrap',marginTop:3}}>
                  {Object.entries(
                    msg.reactions.reduce((acc: Record<string,number>, r) => {
                      acc[r.emoji] = (acc[r.emoji] || 0) + 1; return acc;
                    }, {})
                  ).map(([emoji, count]) => (
                    <button key={emoji}
                      onClick={() => toggleReaction(msg.id, user.id, emoji)}
                      style={{background:'rgba(255,255,255,0.08)',border:'1px solid '+C.border,
                        borderRadius:R.full,padding:'2px 7px',fontSize:11,cursor:'pointer',
                        color:C.cream,display:'flex',gap:3,alignItems:'center'}}>
                      {emoji} {count > 1 && <span style={{fontSize:9}}>{count}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Picker réactions */}
              {emojiMsg === msg.id && (
                <div style={{display:'flex',gap:4,background:C.card2,borderRadius:R.full,
                  padding:'4px 8px',marginTop:4,border:'1px solid '+C.border}}>
                  {['❤️','👍','😂','😮','🙏','🔥'].map(e => (
                    <button key={e} onClick={() => { toggleReaction(msg.id,user.id,e); setEmojiMsg(null); }}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:18,padding:2}}>
                      {e}
                    </button>
                  ))}
                  <button onClick={() => { setReponseA(msg); setEmojiMsg(null); inputRef.current?.focus(); }}
                    style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:C.mutedL,padding:2}}>
                    ↩
                  </button>
                  {isMe && (
                    <button onClick={() => { deleteMessage(msg.id); setEmojiMsg(null); }}
                      style={{background:'none',border:'none',cursor:'pointer',fontSize:14,color:C.danger,padding:2}}>
                      🗑
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </React.Fragment>
    );
  };

  // ── LISTE DES CONVERSATIONS ────────────────────────────────
  const renderListe = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.bg}}>
      {/* Header */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid '+C.border,
        display:'flex',justifyContent:'space-between',alignItems:'center',
        background:C.surface}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.cream,fontFamily:FS}}>💬 Messagerie</div>
          <div style={{fontSize:11,color:C.muted}}>Bellaïa · Messages internes</div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={() => setShowNewGroup(true)}
            style={{background:`linear-gradient(135deg,${C.violet},#5b21b6)`,border:'none',
              borderRadius:R.md,padding:'6px 12px',color:'#fff',fontSize:11,fontWeight:700,
              cursor:'pointer',fontFamily:SA}}>
            + Groupe
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid '+C.border,
                borderRadius:R.md,padding:'6px 10px',color:C.muted,fontSize:13,cursor:'pointer'}}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Barre de recherche */}
      <div style={{padding:'10px 14px',borderBottom:'1px solid '+C.border}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher une conversation..."
          style={{width:'100%',background:C.card,border:'1px solid '+C.border,
            borderRadius:R.md,padding:'8px 12px',color:C.cream,fontSize:12,
            outline:'none',fontFamily:SA,boxSizing:'border-box'}}/>
      </div>

      {/* Erreur */}
      {erreur && (
        <div style={{margin:'8px 14px',background:'rgba(248,113,113,0.1)',border:'1px solid rgba(248,113,113,0.3)',
          borderRadius:R.md,padding:'8px 12px',fontSize:11,color:C.danger}}>
          ⚠️ {erreur}
          <button onClick={()=>setErreur('')} style={{background:'none',border:'none',color:C.danger,cursor:'pointer',marginLeft:8}}>✕</button>
        </div>
      )}

      {/* Liste */}
      <div style={{flex:1,overflowY:'auto'}}>
        {convsFiltrees.length === 0 && (
          <div style={{textAlign:'center',padding:'48px 24px'}}>
            <div style={{fontSize:36,marginBottom:12}}>💬</div>
            <div style={{fontSize:14,color:C.cream,fontWeight:600,marginBottom:6}}>Aucune conversation</div>
            <div style={{fontSize:12,color:C.muted}}>Vos échanges avec les clients et l'équipe apparaîtront ici</div>
          </div>
        )}
        {convsFiltrees.map(conv => {
          const initiales = (conv.nom || conv.client_nom || '?').slice(0,2).toUpperCase();
          const nl = nonLus[conv.id] || 0;
          return (
            <div key={conv.id} onClick={() => ouvrirConv(conv)}
              style={{display:'flex',gap:11,alignItems:'center',padding:'12px 16px',
                cursor:'pointer',borderBottom:'1px solid '+C.border,
                background:activeConv?.id===conv.id?C.card:'transparent',
                transition:'background 0.15s'}}>
              {/* Avatar */}
              <div style={{width:42,height:42,borderRadius:'50%',flexShrink:0,
                background:`linear-gradient(135deg,${C.violet},${C.gold})`,
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:14,fontWeight:800,color:'#fff',position:'relative'}}>
                {initiales}
                {conv.type==='groupe' && (
                  <span style={{position:'absolute',bottom:-2,right:-2,background:C.gold,
                    borderRadius:'50%',width:14,height:14,fontSize:8,display:'flex',
                    alignItems:'center',justifyContent:'center',color:C.bg}}>👥</span>
                )}
              </div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:2}}>
                  <span style={{fontSize:13,fontWeight:nl>0?800:600,color:C.cream,
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                    {conv.nom || conv.client_nom || 'Conversation'}
                  </span>
                  <span style={{fontSize:10,color:C.muted,flexShrink:0,marginLeft:8}}>
                    {conv.updated_at ? fmtTime(conv.updated_at) : ''}
                  </span>
                </div>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:11,color:C.muted,overflow:'hidden',textOverflow:'ellipsis',
                    whiteSpace:'nowrap',fontStyle:'italic'}}>
                    {conv.dernier_message ? '...' : 'Démarrer la conversation'}
                  </span>
                  {nl > 0 && (
                    <span style={{background:C.violet,color:'#fff',borderRadius:R.full,
                      minWidth:18,height:18,fontSize:9,fontWeight:800,flexShrink:0,
                      display:'flex',alignItems:'center',justifyContent:'center',padding:'0 4px',marginLeft:6}}>
                      {nl > 99 ? '99+' : nl}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── CONVERSATION ───────────────────────────────────────────
  const renderConv = () => (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:C.bg}}>
      {/* Header conversation */}
      <div style={{padding:'12px 14px',borderBottom:'1px solid '+C.border,
        display:'flex',alignItems:'center',gap:10,background:C.surface,flexShrink:0}}>
        <button onClick={()=>setView('liste')}
          style={{background:'none',border:'none',color:C.muted,fontSize:18,cursor:'pointer',padding:'0 4px'}}>
          ←
        </button>
        <div style={{width:36,height:36,borderRadius:'50%',
          background:`linear-gradient(135deg,${C.violet},${C.gold})`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:13,fontWeight:800,color:'#fff',flexShrink:0}}>
          {(activeConv?.nom||activeConv?.client_nom||'?').slice(0,2).toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.cream,overflow:'hidden',
            textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
            {activeConv?.nom || activeConv?.client_nom || 'Conversation'}
          </div>
          <div style={{fontSize:10,color:C.muted}}>
            {activeConv?.type === 'groupe' ? '👥 Groupe' : '💬 Direct'}
            {activeConv?.module && ` · ${activeConv.module}`}
          </div>
        </div>
        {/* Appels */}
        <div style={{display:'flex',gap:6}}>
          <button title="Appel audio"
            style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.25)',
              borderRadius:R.md,padding:'6px 9px',fontSize:15,cursor:'pointer',color:C.violetL}}>
            📞
          </button>
          <button title="Appel vidéo"
            style={{background:'rgba(124,58,237,0.12)',border:'1px solid rgba(124,58,237,0.25)',
              borderRadius:R.md,padding:'6px 9px',fontSize:15,cursor:'pointer',color:C.violetL}}>
            📹
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{flex:1,overflowY:'auto',padding:'12px 14px'}}>
        {loadingMsgs && (
          <div style={{textAlign:'center',padding:24}}>
            <div style={{width:24,height:24,borderRadius:'50%',border:'2px solid rgba(124,58,237,0.3)',
              borderTopColor:C.violet,animation:'spin 0.7s linear infinite',margin:'0 auto'}}/>
          </div>
        )}
        {!loadingMsgs && messages.length === 0 && (
          <div style={{textAlign:'center',padding:'48px 16px'}}>
            <div style={{fontSize:36,marginBottom:12}}>👋</div>
            <div style={{fontSize:14,color:C.cream,fontWeight:600,marginBottom:6}}>
              Démarrez la conversation
            </div>
            <div style={{fontSize:12,color:C.muted}}>Envoyez un premier message ci-dessous</div>
          </div>
        )}
        {messages.map((msg, i) => renderBulle(msg, i))}
        <div ref={endRef}/>
      </div>

      {/* Zone de réponse */}
      {reponseA && (
        <div style={{padding:'6px 14px',background:C.card,borderTop:'1px solid '+C.border,
          display:'flex',alignItems:'center',gap:8}}>
          <div style={{flex:1,borderLeft:'2px solid '+C.violet,paddingLeft:8}}>
            <div style={{fontSize:10,color:C.violetL,fontWeight:700}}>Répondre à</div>
            <div style={{fontSize:11,color:C.mutedL}}>{reponseA.contenu?.slice(0,60)}...</div>
          </div>
          <button onClick={()=>setReponseA(null)}
            style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:16}}>✕</button>
        </div>
      )}

      {/* Erreur */}
      {erreur && (
        <div style={{padding:'6px 14px',background:'rgba(248,113,113,0.1)',
          borderTop:'1px solid rgba(248,113,113,0.3)',fontSize:11,color:C.danger,
          display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          ⚠️ {erreur}
          <button onClick={()=>setErreur('')} style={{background:'none',border:'none',color:C.danger,cursor:'pointer'}}>✕</button>
        </div>
      )}

      {/* Zone de saisie */}
      <div style={{padding:'10px 14px',borderTop:'1px solid '+C.border,
        background:C.surface,flexShrink:0}}>
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          {/* Bouton pièce jointe */}
          <button onClick={()=>fileRef.current?.click()}
            disabled={uploading}
            style={{background:'rgba(124,58,237,0.1)',border:'1px solid '+C.border,
              borderRadius:R.md,padding:'9px 11px',color:C.violetL,fontSize:16,
              cursor:uploading?'wait':'pointer',flexShrink:0}}>
            {uploading ? '⏳' : '📎'}
          </button>
          <input ref={fileRef} type="file" style={{display:'none'}}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={e => { const f=e.target.files?.[0]; if(f) envoyerFichier(f); e.target.value=''; }}/>

          {/* Champ texte */}
          <input ref={inputRef} value={texte}
            onChange={e=>setTexte(e.target.value)}
            onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();envoyer();}}}
            placeholder="Écrivez un message..."
            style={{flex:1,background:C.card,border:'1px solid '+C.border,borderRadius:R.md,
              padding:'9px 13px',color:C.cream,fontSize:13,outline:'none',fontFamily:SA,
              boxSizing:'border-box'}}/>

          {/* Emoji rapides */}
          <button onClick={()=>{}}
            style={{background:'rgba(201,168,76,0.1)',border:'1px solid rgba(201,168,76,0.25)',
              borderRadius:R.md,padding:'9px 11px',color:C.gold,fontSize:16,cursor:'pointer',flexShrink:0}}>
            😊
          </button>

          {/* Envoyer */}
          <button onClick={envoyer} disabled={!texte.trim()||loading}
            style={{background:texte.trim()
              ? `linear-gradient(135deg,${C.violet},#5b21b6)`
              : 'rgba(124,58,237,0.2)',
              border:'none',borderRadius:R.md,padding:'9px 14px',
              color:'#fff',fontSize:16,cursor:texte.trim()?'pointer':'not-allowed',
              flexShrink:0,transition:'all 0.2s',
              boxShadow:texte.trim()?'0 2px 8px rgba(124,58,237,0.3)':'none'}}>
            {loading ? '⏳' : '➤'}
          </button>
        </div>

        {/* Option WhatsApp secondaire */}
        {activeConv?.type === 'direct' && (
          <div style={{marginTop:6,textAlign:'center'}}>
            <button
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Bonjour, je vous contacte depuis Bellaïa.')}`, '_blank')}
              style={{background:'none',border:'none',fontSize:10,color:'rgba(139,127,168,0.4)',
                cursor:'pointer',fontFamily:SA}}>
              Ouvrir aussi dans WhatsApp ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── MODAL NOUVEAU GROUPE ───────────────────────────────────
  const renderNewGroup = () => (
    <div style={{position:'fixed',inset:0,background:'rgba(9,7,15,0.9)',zIndex:600,
      display:'flex',alignItems:'center',justifyContent:'center',padding:20}}>
      <div style={{background:C.surface,border:'1px solid '+C.border,borderRadius:R.xl,
        padding:'24px 20px',width:'100%',maxWidth:360}}>
        <h3 style={{margin:'0 0 16px',fontSize:16,fontWeight:800,color:C.cream,fontFamily:FS}}>
          Créer un groupe
        </h3>
        <input value={groupNom} onChange={e=>setGroupNom(e.target.value)}
          placeholder="Nom du groupe"
          style={{width:'100%',background:C.card,border:'1px solid '+C.border,
            borderRadius:R.md,padding:'10px 12px',color:C.cream,fontSize:13,
            outline:'none',fontFamily:SA,boxSizing:'border-box',marginBottom:16}}/>
        <p style={{fontSize:11,color:C.muted,marginBottom:16,lineHeight:1.5}}>
          Les participants pourront être ajoutés depuis la liste des clients et hôtes.
        </p>
        <div style={{display:'flex',gap:8}}>
          <button onClick={async()=>{
            if(!groupNom.trim()) return;
            try {
              const conv = await createGroupConv(user.id, groupNom.trim(), [], undefined);
              setShowNewGroup(false);
              setGroupNom('');
              await chargerConvs();
              ouvrirConv(conv);
            } catch(e:any){setErreur(e.message);}
          }} style={{flex:1,background:`linear-gradient(135deg,${C.violet},#5b21b6)`,
            border:'none',borderRadius:R.md,padding:'11px',color:'#fff',
            fontWeight:700,fontSize:13,cursor:'pointer',fontFamily:SA}}>
            Créer
          </button>
          <button onClick={()=>{setShowNewGroup(false);setGroupNom('');}}
            style={{flex:1,background:'rgba(255,255,255,0.04)',border:'1px solid '+C.border,
              borderRadius:R.md,padding:'11px',color:C.muted,fontSize:13,cursor:'pointer'}}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{height:'100%',display:'flex',flexDirection:'column',
      fontFamily:SA,overflow:'hidden',position:'relative'}}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width:3px; }
        ::-webkit-scrollbar-thumb { background:rgba(124,58,237,0.3); border-radius:2px; }
      `}</style>

      {view === 'liste' ? renderListe() : renderConv()}
      {showNewGroup && renderNewGroup()}
    </div>
  );
}

// src/modules/messaging/MessagingCenter.tsx — v3
// Session via bellaiaSession.ts · Groupe avec sélection participants réelle
"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { Conversation, Message } from "./messagingTypes";
import {
  getConversations, getProfiles, creerConversationDirecte, creerGroupe,
  getMessages, envoyerMessage, supprimerMessage, marquerLu,
  toggleReaction, uploadAttachment, subscribeToMessages,
} from "./messagingApi";

const C = {
  bg:"#09070f", surface:"#181428", card:"#1e1a30", card2:"#231f38",
  border:"rgba(124,58,237,0.22)",
  violet:"#7c3aed", violetL:"#9d6ef5", violetD:"#5b21b6",
  gold:"#c9a84c", cream:"#f0ebff", muted:"#8b7fa8", mutedL:"#b8aed0",
  success:"#6ee7a0", danger:"#f87171", warning:"#fbbf24",
  meBg:"linear-gradient(135deg,#7c3aed,#5b21b6)",
  otherBg:"#231f38",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Georgia',serif";
const R  = { sm:6, md:10, lg:14, xl:18, full:9999 };

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const isToday = d.toDateString() === new Date().toDateString();
  return isToday
    ? d.toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" })
    : d.toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
};
const fmtSize = (b?: number) =>
  !b ? "" : b < 1024 ? `${b}o` : b < 1048576 ? `${(b/1024).toFixed(1)}Ko` : `${(b/1048576).toFixed(1)}Mo`;
const mimeIcon = (m?: string) =>
  !m?"📎":m.startsWith("image")?"🖼":m.startsWith("video")?"🎬":m.startsWith("audio")?"🎵":m.includes("pdf")?"📄":"📎";

interface Props {
  user: { id:string; prenom?:string; nom?:string; role?:string; email?:string };
  onClose?: () => void;
  initialConvId?: string;
}

export default function MessagingCenter({ user, onClose, initialConvId }: Props) {
  const [convs, setConvs]           = useState<Conversation[]>([]);
  const [active, setActive]         = useState<Conversation | null>(null);
  const [messages, setMessages]     = useState<Message[]>([]);
  const [texte, setTexte]           = useState("");
  const [reponseA, setReponseA]     = useState<Message | null>(null);
  const [emojiFor, setEmojiFor]     = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [vue, setVue]               = useState<"liste"|"conv"|"newGroup"|"newDirect">("liste");
  const [loading, setLoading]       = useState(false);
  const [loadMsgs, setLoadMsgs]     = useState(false);
  const [uploading, setUploading]   = useState(false);
  const [erreur, setErreur]         = useState("");

  // Nouveau groupe
  const [groupNom, setGroupNom]     = useState("");
  const [profiles, setProfiles]     = useState<any[]>([]);
  const [selected, setSelected]     = useState<string[]>([]);
  const [searchP, setSearchP]       = useState("");

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);
  const unsubRef = useRef<(()=>void)|null>(null);

  const nomComplet = [user.prenom, user.nom].filter(Boolean).join(" ") || user.email || "Moi";

  const charger = useCallback(async () => {
    setErreur("");
    try {
      const data = await getConversations(user.id);
      setConvs(data);
      if (initialConvId) {
        const c = data.find(x => x.id === initialConvId);
        if (c) ouvrirConv(c);
      }
    } catch(e: any) { setErreur(e.message); }
  }, [user.id, initialConvId]);

  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => () => { unsubRef.current?.(); }, []);

  const ouvrirConv = useCallback(async (conv: Conversation) => {
    setActive(conv); setVue("conv"); setMessages([]); setReponseA(null); setErreur("");
    unsubRef.current?.();
    setLoadMsgs(true);
    try {
      const msgs = await getMessages(conv.id);
      setMessages(msgs);
      const nonLus = msgs.filter(m => m.auteur_id !== user.id).map(m => m.id);
      if (nonLus.length) marquerLu(nonLus, user.id).catch(() => {});
    } catch(e: any) { setErreur(e.message); }
    finally { setLoadMsgs(false); }
    const unsub = subscribeToMessages(conv.id, msg => {
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
      if (msg.auteur_id !== user.id) marquerLu([msg.id], user.id).catch(() => {});
    });
    unsubRef.current = unsub;
  }, [user.id]);

  const envoyer = async () => {
    if (!texte.trim() || !active || loading) return;
    const txt = texte.trim(); setTexte(""); setReponseA(null); setLoading(true);
    try {
      const msg = await envoyerMessage(active.id, user.id, txt, "texte", {}, reponseA?.id);
      if (msg) setMessages(prev => [...prev, msg]);
    } catch(e: any) { setErreur(e.message); setTexte(txt); }
    finally { setLoading(false); }
  };

  const envoyerFichier = async (file: File) => {
    if (!active) return;
    setUploading(true);
    try {
      const { storage_path, signed_url } = await uploadAttachment(file, active.id, user.id);
      const type = file.type.startsWith("image")?"image":file.type.startsWith("video")?"video":file.type.startsWith("audio")?"audio":"document";
      const msg = await envoyerMessage(active.id, user.id, file.name, type, {
        storage_path, nom:file.name, mime:file.type, taille:file.size, url:signed_url,
      });
      if (msg) setMessages(prev => [...prev, msg]);
    } catch(e: any) { setErreur(`Upload échoué : ${e.message}`); }
    finally { setUploading(false); }
  };

  const chargerProfiles = async () => {
    try {
      const data = await getProfiles();
      setProfiles(data.filter((p: any) => p.id !== user.id));
    } catch(e: any) { setErreur(e.message); }
  };

  const creerGroupeAction = async () => {
    if (!groupNom.trim() || selected.length === 0) {
      setErreur("Nom et au moins un participant requis"); return;
    }
    setLoading(true);
    try {
      const conv = await creerGroupe(user.id, groupNom.trim(), selected);
      setVue("liste");
      setGroupNom(""); setSelected([]);
      await charger();
      ouvrirConv(conv);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  const ouvrirDirect = async (otherId: string, autreNom: string) => {
    setLoading(true);
    try {
      const conv = await creerConversationDirecte(user.id, otherId, autreNom);
      await charger();
      ouvrirConv(conv);
    } catch(e: any) { setErreur(e.message); }
    finally { setLoading(false); }
  };

  const filteredConvs = convs.filter(c =>
    !search || (c.nom || "").toLowerCase().includes(search.toLowerCase())
  );
  const filteredProfiles = profiles.filter(p => {
    const nom = [p.prenom, p.nom].filter(Boolean).join(" ").toLowerCase();
    return !searchP || nom.includes(searchP.toLowerCase()) || (p.role||"").includes(searchP.toLowerCase());
  });

  // ── Bulle message ────────────────────────────────────────────
  const renderBulle = (msg: Message, i: number) => {
    const isMe = msg.auteur_id === user.id;
    const showDate = i === 0 || new Date(msg.created_at).toDateString() !== new Date(messages[i-1].created_at).toDateString();
    const supprime = msg.supprime || msg.contenu === "[Message supprimé]";

    return (
      <React.Fragment key={msg.id}>
        {showDate && (
          <div style={{textAlign:"center",margin:"12px 0"}}>
            <span style={{fontSize:10,color:C.muted,background:C.card2,padding:"3px 10px",borderRadius:R.full}}>
              {new Date(msg.created_at).toLocaleDateString("fr-FR",{weekday:"long",day:"numeric",month:"long"})}
            </span>
          </div>
        )}
        <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",
          marginBottom:4,gap:6,alignItems:"flex-end"}}>
          {!isMe && (
            <div style={{width:26,height:26,borderRadius:"50%",flexShrink:0,
              background:`linear-gradient(135deg,${C.violetL},${C.gold})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:10,fontWeight:700,color:"#fff"}}>
              {(msg.auteur_id||"?")[0].toUpperCase()}
            </div>
          )}
          <div style={{maxWidth:"74%"}}>
            {supprime ? (
              <span style={{fontSize:11,color:C.muted,fontStyle:"italic",
                padding:"5px 10px",border:"1px solid "+C.border,borderRadius:R.lg,display:"block"}}>
                🚫 Message supprimé
              </span>
            ) : (
              <div onClick={() => setEmojiFor(emojiFor === msg.id ? null : msg.id)}
                style={{
                  background: isMe ? C.meBg : C.otherBg,
                  borderRadius: isMe ? `${R.lg}px ${R.lg}px 4px ${R.lg}px` : `${R.lg}px ${R.lg}px ${R.lg}px 4px`,
                  padding: msg.type === "texte" ? "9px 13px" : "6px",
                  cursor:"pointer",
                  border: isMe ? "none" : "1px solid "+C.border,
                  boxShadow: isMe ? "0 2px 8px rgba(124,58,237,0.25)" : "none",
                }}>
                {msg.type === "texte" && (
                  <p style={{margin:0,fontSize:13,color:C.cream,lineHeight:1.5,wordBreak:"break-word"}}>
                    {msg.contenu}
                  </p>
                )}
                {msg.type === "image" && msg.metadata?.url && (
                  <img src={msg.metadata.url} alt={msg.metadata.nom}
                    style={{maxWidth:220,maxHeight:200,borderRadius:R.md,display:"block",cursor:"pointer"}}
                    onClick={()=>window.open(msg.metadata.url,"_blank")}/>
                )}
                {msg.type === "video" && msg.metadata?.url && (
                  <video src={msg.metadata.url} controls style={{maxWidth:220,borderRadius:R.md}}/>
                )}
                {msg.type === "audio" && msg.metadata?.url && (
                  <audio src={msg.metadata.url} controls style={{width:200}}/>
                )}
                {msg.type === "document" && (
                  <button onClick={()=>window.open(msg.metadata?.url,"_blank")}
                    style={{background:"none",border:"none",cursor:"pointer",display:"flex",gap:8,alignItems:"center",padding:4}}>
                    <span style={{fontSize:22}}>{mimeIcon(msg.metadata?.mime)}</span>
                    <div style={{textAlign:"left"}}>
                      <div style={{fontSize:12,color:C.cream,fontWeight:600}}>{msg.metadata?.nom}</div>
                      <div style={{fontSize:10,color:C.muted}}>{fmtSize(msg.metadata?.taille)}</div>
                    </div>
                  </button>
                )}
              </div>
            )}
            <div style={{display:"flex",justifyContent:isMe?"flex-end":"flex-start",
              gap:4,marginTop:2,alignItems:"center"}}>
              <span style={{fontSize:9,color:C.muted}}>{fmtTime(msg.created_at)}</span>
              {isMe && <span style={{fontSize:9,color:C.violetL}}>✓✓</span>}
            </div>
            {/* Réactions */}
            {emojiFor === msg.id && (
              <div style={{display:"flex",gap:4,background:C.card2,borderRadius:R.full,
                padding:"4px 8px",border:"1px solid "+C.border,marginTop:4,flexWrap:"wrap"}}>
                {["❤️","👍","😂","😮","🙏","🔥"].map(e => (
                  <button key={e} onClick={()=>{toggleReaction(msg.id,user.id,e);setEmojiFor(null);}}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:18,padding:2}}>
                    {e}
                  </button>
                ))}
                <button onClick={()=>{setReponseA(msg);setEmojiFor(null);inputRef.current?.focus();}}
                  style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.mutedL,padding:2}}>↩</button>
                {isMe && !supprime && (
                  <button onClick={()=>{supprimerMessage(msg.id);setEmojiFor(null);}}
                    style={{background:"none",border:"none",cursor:"pointer",fontSize:14,color:C.danger,padding:2}}>🗑</button>
                )}
              </div>
            )}
          </div>
        </div>
      </React.Fragment>
    );
  };

  // ── LISTE ────────────────────────────────────────────────────
  if (vue === "liste") return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:SA}}>
      <div style={{padding:"14px 16px",borderBottom:"1px solid "+C.border,background:C.surface,
        display:"flex",justifyContent:"space-between",alignItems:"center",flexShrink:0}}>
        <div>
          <div style={{fontSize:16,fontWeight:800,color:C.cream,fontFamily:FS}}>💬 Messagerie</div>
          <div style={{fontSize:11,color:C.muted}}>{convs.length} conversation{convs.length!==1?"s":""}</div>
        </div>
        <div style={{display:"flex",gap:6}}>
          <button onClick={()=>{setVue("newDirect");chargerProfiles();}}
            style={{background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.3)",
              borderRadius:R.md,padding:"6px 10px",color:C.violetL,fontSize:11,fontWeight:700,cursor:"pointer"}}>
            + Direct
          </button>
          <button onClick={()=>{setVue("newGroup");chargerProfiles();}}
            style={{background:`linear-gradient(135deg,${C.violet},${C.violetD})`,border:"none",
              borderRadius:R.md,padding:"6px 10px",color:"#fff",fontSize:11,fontWeight:700,cursor:"pointer"}}>
            + Groupe
          </button>
          {onClose && (
            <button onClick={onClose}
              style={{background:"rgba(255,255,255,0.06)",border:"1px solid "+C.border,
                borderRadius:R.md,padding:"6px 10px",color:C.muted,cursor:"pointer"}}>✕</button>
          )}
        </div>
      </div>
      <div style={{padding:"8px 14px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:R.md,
            padding:"7px 12px",color:C.cream,fontSize:12,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      </div>
      {erreur && (
        <div style={{margin:"8px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:R.md,padding:"8px 12px",fontSize:11,color:C.danger,display:"flex",justifyContent:"space-between"}}>
          ⚠️ {erreur}
          <button onClick={()=>setErreur("")} style={{background:"none",border:"none",color:C.danger,cursor:"pointer"}}>✕</button>
        </div>
      )}
      <div style={{flex:1,overflowY:"auto"}}>
        {filteredConvs.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 24px"}}>
            <div style={{fontSize:36,marginBottom:12}}>💬</div>
            <div style={{fontSize:14,color:C.cream,fontWeight:600,marginBottom:6}}>Aucune conversation</div>
            <div style={{fontSize:12,color:C.muted}}>Créez une conversation directe ou un groupe</div>
          </div>
        )}
        {filteredConvs.map(conv => (
          <div key={conv.id} onClick={()=>ouvrirConv(conv)}
            style={{display:"flex",gap:11,alignItems:"center",padding:"12px 16px",
              cursor:"pointer",borderBottom:"1px solid "+C.border,
              background:active?.id===conv.id?C.card:"transparent"}}>
            <div style={{width:42,height:42,borderRadius:"50%",flexShrink:0,
              background:`linear-gradient(135deg,${C.violet},${C.gold})`,
              display:"flex",alignItems:"center",justifyContent:"center",
              fontSize:15,fontWeight:800,color:"#fff",position:"relative"}}>
              {(conv.nom||"?")[0].toUpperCase()}
              {conv.type==="groupe" && (
                <span style={{position:"absolute",bottom:-2,right:-2,background:C.gold,
                  borderRadius:"50%",width:14,height:14,fontSize:8,
                  display:"flex",alignItems:"center",justifyContent:"center",color:C.bg}}>
                  👥
                </span>
              )}
            </div>
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:2}}>
                <span style={{fontSize:13,fontWeight:700,color:C.cream,overflow:"hidden",
                  textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                  {conv.nom || "Conversation"}
                </span>
                <span style={{fontSize:10,color:C.muted,flexShrink:0,marginLeft:8}}>
                  {conv.updated_at ? fmtTime(conv.updated_at) : ""}
                </span>
              </div>
              <div style={{fontSize:11,color:C.muted,fontStyle:"italic"}}>
                {conv.type === "groupe" ? "👥 Groupe" : "💬 Direct"}
                {conv.module && ` · ${conv.module}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // ── NOUVELLE CONVERSATION DIRECTE ────────────────────────────
  if (vue === "newDirect") return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:SA}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,background:C.surface,
        display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={()=>setVue("liste")} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button>
        <div style={{fontSize:14,fontWeight:800,color:C.cream,fontFamily:FS}}>Nouvelle conversation</div>
      </div>
      <div style={{padding:"10px 14px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <input value={searchP} onChange={e=>setSearchP(e.target.value)}
          placeholder="🔍 Rechercher un contact..."
          style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:R.md,
            padding:"7px 12px",color:C.cream,fontSize:12,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      </div>
      {erreur && (
        <div style={{margin:"8px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:R.md,padding:"8px 12px",fontSize:11,color:C.danger}}>
          ⚠️ {erreur}
        </div>
      )}
      <div style={{flex:1,overflowY:"auto"}}>
        {filteredProfiles.map(p => {
          const nom = [p.prenom, p.nom].filter(Boolean).join(" ");
          return (
            <div key={p.id} onClick={()=>ouvrirDirect(p.id, nom)}
              style={{display:"flex",gap:12,alignItems:"center",padding:"12px 16px",
                cursor:"pointer",borderBottom:"1px solid "+C.border}}>
              <div style={{width:38,height:38,borderRadius:"50%",flexShrink:0,
                background:`linear-gradient(135deg,${C.violet},${C.gold})`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:14,fontWeight:800,color:"#fff"}}>
                {(nom||"?")[0].toUpperCase()}
              </div>
              <div>
                <div style={{fontSize:13,fontWeight:700,color:C.cream}}>{nom || "Utilisateur"}</div>
                <div style={{fontSize:10,color:C.muted,textTransform:"capitalize"}}>{p.role}</div>
              </div>
            </div>
          );
        })}
        {filteredProfiles.length === 0 && (
          <div style={{textAlign:"center",padding:"32px 24px",color:C.muted,fontSize:12}}>
            Aucun contact trouvé
          </div>
        )}
      </div>
    </div>
  );

  // ── NOUVEAU GROUPE ───────────────────────────────────────────
  if (vue === "newGroup") return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:SA}}>
      <div style={{padding:"12px 16px",borderBottom:"1px solid "+C.border,background:C.surface,
        display:"flex",alignItems:"center",justifyContent:"space-between",flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <button onClick={()=>setVue("liste")} style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button>
          <div style={{fontSize:14,fontWeight:800,color:C.cream,fontFamily:FS}}>Nouveau groupe</div>
        </div>
        <button onClick={creerGroupeAction} disabled={loading||!groupNom.trim()||selected.length===0}
          style={{background:groupNom.trim()&&selected.length>0?`linear-gradient(135deg,${C.violet},${C.violetD})`:"rgba(124,58,237,0.2)",
            border:"none",borderRadius:R.md,padding:"7px 14px",color:"#fff",
            fontSize:12,fontWeight:700,cursor:groupNom.trim()&&selected.length>0?"pointer":"not-allowed"}}>
          {loading?"⏳":"Créer"}
        </button>
      </div>

      <div style={{padding:"12px 14px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <input value={groupNom} onChange={e=>setGroupNom(e.target.value)}
          placeholder="Nom du groupe..."
          style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:R.md,
            padding:"9px 12px",color:C.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box",marginBottom:8}}/>
        {selected.length > 0 && (
          <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
            {selected.map(id => {
              const p = profiles.find(x=>x.id===id);
              const n = p ? [p.prenom,p.nom].filter(Boolean).join(" ") : id.slice(0,8);
              return (
                <span key={id} style={{background:"rgba(124,58,237,0.15)",border:"1px solid rgba(124,58,237,0.3)",
                  borderRadius:R.full,padding:"3px 10px",fontSize:11,color:C.violetL,
                  display:"flex",alignItems:"center",gap:5}}>
                  {n}
                  <button onClick={()=>setSelected(prev=>prev.filter(x=>x!==id))}
                    style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:12,padding:0}}>
                    ✕
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div style={{padding:"8px 14px",borderBottom:"1px solid "+C.border,flexShrink:0}}>
        <input value={searchP} onChange={e=>setSearchP(e.target.value)}
          placeholder="🔍 Rechercher un participant..."
          style={{width:"100%",background:C.card,border:"1px solid "+C.border,borderRadius:R.md,
            padding:"7px 12px",color:C.cream,fontSize:12,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
      </div>

      {erreur && (
        <div style={{margin:"8px 14px",background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",
          borderRadius:R.md,padding:"8px 12px",fontSize:11,color:C.danger}}>
          ⚠️ {erreur}
        </div>
      )}

      <div style={{flex:1,overflowY:"auto"}}>
        {filteredProfiles.map(p => {
          const nom = [p.prenom, p.nom].filter(Boolean).join(" ");
          const isSelected = selected.includes(p.id);
          return (
            <div key={p.id} onClick={()=>setSelected(prev=>isSelected?prev.filter(x=>x!==p.id):[...prev,p.id])}
              style={{display:"flex",gap:12,alignItems:"center",padding:"11px 16px",
                cursor:"pointer",borderBottom:"1px solid "+C.border,
                background:isSelected?"rgba(124,58,237,0.08)":"transparent"}}>
              <div style={{width:36,height:36,borderRadius:"50%",flexShrink:0,
                background:isSelected?`linear-gradient(135deg,${C.violet},${C.violetD})`:`linear-gradient(135deg,${C.card2},${C.card})`,
                border:`2px solid ${isSelected?C.violet:C.border}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:13,fontWeight:800,color:"#fff"}}>
                {isSelected?"✓":(nom||"?")[0].toUpperCase()}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:13,fontWeight:700,color:C.cream}}>{nom||"Utilisateur"}</div>
                <div style={{fontSize:10,color:C.muted,textTransform:"capitalize"}}>{p.role}</div>
              </div>
              {isSelected && <span style={{color:C.violet,fontSize:18}}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );

  // ── CONVERSATION ─────────────────────────────────────────────
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,fontFamily:SA}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(124,58,237,0.3);border-radius:2px}`}</style>
      <div style={{padding:"11px 14px",borderBottom:"1px solid "+C.border,background:C.surface,
        display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
        <button onClick={()=>{setVue("liste");unsubRef.current?.();}}
          style={{background:"none",border:"none",color:C.muted,fontSize:18,cursor:"pointer"}}>←</button>
        <div style={{width:34,height:34,borderRadius:"50%",flexShrink:0,
          background:`linear-gradient(135deg,${C.violet},${C.gold})`,
          display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:800,color:"#fff"}}>
          {(active?.nom||"?")[0].toUpperCase()}
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:14,fontWeight:700,color:C.cream,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            {active?.nom || "Conversation"}
          </div>
          <div style={{fontSize:10,color:C.muted}}>
            {active?.type==="groupe"?"👥 Groupe":"💬 Direct"}
            {active?.module&&` · ${active.module}`}
          </div>
        </div>
        {/* Appels — prochainement */}
        <span title="Appels — prochainement" style={{opacity:0.35,fontSize:15,cursor:"default"}}>📞</span>
        <span title="Vidéo — prochainement" style={{opacity:0.35,fontSize:15,cursor:"default"}}>📹</span>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 14px"}}>
        {loadMsgs && (
          <div style={{textAlign:"center",padding:24}}>
            <div style={{width:24,height:24,borderRadius:"50%",border:`2px solid rgba(124,58,237,0.2)`,borderTopColor:C.violet,animation:"spin 0.7s linear infinite",margin:"0 auto"}}/>
          </div>
        )}
        {!loadMsgs && messages.length === 0 && (
          <div style={{textAlign:"center",padding:"48px 16px"}}>
            <div style={{fontSize:36,marginBottom:12}}>👋</div>
            <div style={{fontSize:14,color:C.cream,fontWeight:600,marginBottom:6}}>Démarrez la conversation</div>
            <div style={{fontSize:12,color:C.muted}}>Envoyez un premier message ci-dessous</div>
          </div>
        )}
        {messages.map((msg, i) => renderBulle(msg, i))}
        <div ref={endRef}/>
      </div>

      {reponseA && (
        <div style={{padding:"6px 14px",background:C.card,borderTop:"1px solid "+C.border,
          display:"flex",alignItems:"center",gap:8,flexShrink:0}}>
          <div style={{flex:1,borderLeft:"2px solid "+C.violet,paddingLeft:8}}>
            <div style={{fontSize:10,color:C.violetL,fontWeight:700}}>Répondre à</div>
            <div style={{fontSize:11,color:C.mutedL}}>{reponseA.contenu?.slice(0,60)}...</div>
          </div>
          <button onClick={()=>setReponseA(null)} style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
      )}

      {erreur && (
        <div style={{padding:"6px 14px",background:"rgba(248,113,113,0.1)",borderTop:"1px solid rgba(248,113,113,0.3)",
          fontSize:11,color:C.danger,display:"flex",justifyContent:"space-between",flexShrink:0}}>
          ⚠️ {erreur}
          <button onClick={()=>setErreur("")} style={{background:"none",border:"none",color:C.danger,cursor:"pointer"}}>✕</button>
        </div>
      )}

      <div style={{padding:"9px 14px",borderTop:"1px solid "+C.border,background:C.surface,flexShrink:0}}>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>fileRef.current?.click()} disabled={uploading}
            style={{background:"rgba(124,58,237,0.1)",border:"1px solid "+C.border,borderRadius:R.md,
              padding:"8px 10px",color:C.violetL,fontSize:16,cursor:uploading?"wait":"pointer",flexShrink:0}}>
            {uploading?"⏳":"📎"}
          </button>
          <input ref={fileRef} type="file" style={{display:"none"}}
            accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={e=>{const f=e.target.files?.[0];if(f)envoyerFichier(f);e.target.value="";}}/>
          <input ref={inputRef} value={texte}
            onChange={e=>setTexte(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();envoyer();}}}
            placeholder="Écrivez un message..."
            style={{flex:1,background:C.card,border:"1px solid "+C.border,borderRadius:R.md,
              padding:"8px 12px",color:C.cream,fontSize:13,outline:"none",fontFamily:SA,boxSizing:"border-box"}}/>
          <button onClick={envoyer} disabled={!texte.trim()||loading}
            style={{background:texte.trim()&&!loading?`linear-gradient(135deg,${C.violet},${C.violetD})`:"rgba(124,58,237,0.2)",
              border:"none",borderRadius:R.md,padding:"8px 13px",
              color:"#fff",fontSize:16,cursor:texte.trim()&&!loading?"pointer":"not-allowed",flexShrink:0}}>
            {loading?"⏳":"➤"}
          </button>
        </div>
        {active?.type==="direct" && (
          <div style={{textAlign:"center",marginTop:5}}>
            <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent("Bonjour")}`, "_blank")}
              style={{background:"none",border:"none",fontSize:10,color:"rgba(139,127,168,0.35)",cursor:"pointer"}}>
              Ouvrir aussi dans WhatsApp ↗
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MessagingCenter.tsx — Messagerie Interne Bellaïa
// Conversations · Messages · WhatsApp · Canal interne
// src/modules/messaging/MessagingCenter.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useMemo } from "react";
import type {
  Conversation, Message, BrouillonMessage, CanalMessage,
} from "./messagingTypes";

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

const CANAL_ICO: Record<CanalMessage, string> = {
  interne:"💬", whatsapp:"🟢", email:"✉️",
  messenger:"🔵", telegram:"✈️", signal:"🔒",
};
const CANAL_LABELS: Record<CanalMessage, string> = {
  interne:"Interne", whatsapp:"WhatsApp", email:"Email",
  messenger:"Messenger (bientôt)", telegram:"Telegram (bientôt)", signal:"Signal (bientôt)",
};

function fmtHeure(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("fr-FR", { hour:"2-digit", minute:"2-digit" });
  } catch { return iso; }
}
function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", { day:"2-digit", month:"short" });
  } catch { return iso; }
}
function now(): string { return new Date().toISOString(); }
function genId(): string { return "msg_" + Date.now().toString(36); }

// ── Supabase helpers ───────────────────────────────────────
const SB_URL = () => process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = () => process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

async function getToken(): Promise<string> {
  return (await (window as any).getTokenAsync?.()) ?? SB_KEY();
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

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function MessagingCenter() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [active,        setActive]        = useState<Conversation | null>(null);
  const [brouillon,     setBrouillon]     = useState<BrouillonMessage>({
    destinataireNom:"", canal:"interne", contenu:"", piecesJointes:[],
  });
  const [modalNouv,     setModalNouv]     = useState(false);
  const [search,        setSearch]        = useState("");
  const [sending,       setSending]       = useState(false);
  const [source,        setSource]        = useState<"local"|"supabase">("local");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Chargement conversations depuis Supabase
  useEffect(() => {
    sbGet("bellaia_conversations", "order=date_dernier_msg.desc&limit=50").then(rows => {
      if (rows.length > 0) {
        const mapped: Conversation[] = rows.map((r: any) => ({
          id:             r.id,
          titre:          r.titre || r.destinataire_nom,
          destinataire:   { id:r.destinataire_id||"", nom:r.destinataire_nom||"",
            type:"client", telephone:r.destinataire_tel, email:r.destinataire_email },
          canal:          r.canal || "interne",
          messages:       [],
          clientId:       r.client_id,
          devisRef:       r.devis_ref,
          commandeRef:    r.commande_ref,
          dernierMessage: r.dernier_message,
          dateDernierMsg: r.date_dernier_msg,
          nonLus:         r.non_lus || 0,
          archivee:       r.archivee || false,
          createdAt:      r.created_at,
        }));
        setConversations(mapped);
        setSource("supabase");
      }
    }).catch(() => {});
  }, []);

  // Scroll auto vers le dernier message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [active?.messages]);

  // Charger les messages d'une conversation
  const ouvrirConversation = async (conv: Conversation) => {
    setActive(conv);
    if (conv.messages.length > 0) return;
    const rows = await sbGet("bellaia_messages",
      `conversation_id=eq.${conv.id}&order=created_at.asc`);
    if (rows.length) {
      const msgs: Message[] = rows.map((r: any) => ({
        id: r.id, conversationId: r.conversation_id,
        auteur: r.auteur, contenu: r.contenu, canal: r.canal,
        statut: r.statut, devisRef: r.devis_ref,
        commandeRef: r.commande_ref, createdAt: r.created_at,
      }));
      setConversations(cs => cs.map(c => c.id === conv.id ? { ...c, messages: msgs } : c));
      setActive(a => a ? { ...a, messages: msgs } : null);
    }
  };

  // Envoyer un message dans la conversation active
  const envoyerMessage = async () => {
    if (!active || !brouillon.contenu.trim()) return;
    setSending(true);

    const nv: Message = {
      id:             genId(),
      conversationId: active.id,
      auteur:         "fondatrice",
      contenu:        brouillon.contenu.trim(),
      canal:          active.canal,
      statut:         "envoye",
      createdAt:      now(),
    };

    // Mise à jour locale optimiste
    const updatedMsgs = [...(active.messages || []), nv];
    setConversations(cs => cs.map(c => c.id === active.id
      ? { ...c, messages:updatedMsgs, dernierMessage:nv.contenu, dateDernierMsg:nv.createdAt }
      : c));
    setActive(a => a ? { ...a, messages:updatedMsgs } : null);
    setBrouillon(b => ({ ...b, contenu:"" }));

    // Persister dans Supabase
    await sbPost("bellaia_messages", {
      conversation_id: active.id,
      auteur:          "fondatrice",
      contenu:         nv.contenu,
      canal:           active.canal,
      statut:          "envoye",
      devis_ref:       active.devisRef,
      commande_ref:    active.commandeRef,
    }).catch(() => {});

    // Si WhatsApp : ouvrir l'app
    if (active.canal === "whatsapp" && active.destinataire.telephone) {
      const num = active.destinataire.telephone.replace(/\D/g, "");
      window.open(`https://wa.me/${num}?text=${encodeURIComponent(nv.contenu)}`, "_blank");
    }

    setSending(false);
  };

  // Créer une nouvelle conversation
  const creerConversation = async () => {
    if (!brouillon.destinataireNom.trim()) return;
    setSending(true);
    const id = genId().replace("msg_", "conv_");
    const nv: Conversation = {
      id,
      titre:          brouillon.destinataireNom,
      destinataire:   {
        id:        genId(), nom:brouillon.destinataireNom,
        type:      "client",
        telephone: brouillon.destinataireTel,
        email:     brouillon.destinataireEmail,
      },
      canal:          brouillon.canal,
      messages:       [],
      nonLus:         0,
      archivee:       false,
      createdAt:      now(),
    };

    await sbPost("bellaia_conversations", {
      id, titre: nv.titre,
      destinataire_nom: nv.destinataire.nom,
      destinataire_tel: nv.destinataire.telephone,
      destinataire_email: nv.destinataire.email,
      canal: nv.canal,
      non_lus: 0, archivee: false,
    }).catch(() => {});

    setConversations(cs => [nv, ...cs]);
    setActive(nv);
    setModalNouv(false);
    setBrouillon({ destinataireNom:"", canal:"interne", contenu:"", piecesJointes:[] });
    setSending(false);
  };

  const archiver = async (id: string) => {
    setConversations(cs => cs.map(c => c.id === id ? { ...c, archivee:true } : c));
    if (active?.id === id) setActive(null);
  };

  const filtrees = useMemo(() =>
    conversations.filter(c =>
      !c.archivee &&
      (!search || c.titre.toLowerCase().includes(search.toLowerCase()) ||
       c.destinataire.nom.toLowerCase().includes(search.toLowerCase()))
    ),
  [conversations, search]);

  // ── Vue conversation active ────────────────────────────
  if (active) return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", gap:8, padding:"10px 14px",
        background:"rgba(0,0,0,0.3)", borderBottom:`1px solid ${CLR.line}`, flexShrink:0 }}>
        <button onClick={() => setActive(null)}
          style={{ background:"none", border:`1px solid ${CLR.line}`, borderRadius:8,
            padding:"4px 10px", color:CLR.creamD, cursor:"pointer", fontSize:11 }}>‹</button>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{active.titre}</div>
          <div style={{ fontSize:10, color:CLR.creamD }}>
            {CANAL_ICO[active.canal]} {CANAL_LABELS[active.canal]}
            {active.devisRef ? ` · ${active.devisRef}` : ""}
            {active.commandeRef ? ` · ${active.commandeRef}` : ""}
          </div>
        </div>
        {active.destinataire.telephone && (
          <button onClick={() => window.open(
            `https://wa.me/${active.destinataire.telephone!.replace(/\D/g,"")}`, "_blank"
          )}
            style={{ background:"rgba(37,211,102,0.12)", border:"1px solid rgba(37,211,102,0.3)",
              borderRadius:8, padding:"4px 10px", color:"#25d366", fontSize:10, cursor:"pointer" }}>
            💬 WA
          </button>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px",
        display:"flex", flexDirection:"column", gap:8 }}>
        {active.messages.length === 0 && (
          <div style={{ textAlign:"center", padding:"24px", color:CLR.creamD, fontStyle:"italic" }}>
            Aucun message dans cette conversation.
          </div>
        )}
        {active.messages.map(m => {
          const isMe = m.auteur === "fondatrice";
          return (
            <div key={m.id} style={{ display:"flex",
              justifyContent:isMe?"flex-end":"flex-start" }}>
              <div style={{ maxWidth:"80%", background:isMe?"rgba(21,128,61,0.2)":CLR.card,
                border:`1px solid ${isMe?"rgba(21,128,61,0.4)":CLR.line}`,
                borderRadius:12, padding:"9px 12px" }}>
                <div style={{ fontSize:12, color:"#fff", lineHeight:1.5 }}>{m.contenu}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.35)", marginTop:4,
                  textAlign:"right" }}>
                  {fmtHeure(m.createdAt)} · {m.statut}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef}/>
      </div>

      {/* Zone de saisie */}
      <div style={{ padding:"10px 14px", borderTop:`1px solid ${CLR.line}`,
        background:"rgba(0,0,0,0.2)", flexShrink:0 }}>
        <div style={{ display:"flex", gap:8 }}>
          <textarea
            rows={2}
            value={brouillon.contenu}
            onChange={e => setBrouillon(b => ({ ...b, contenu:e.target.value }))}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyerMessage(); }
            }}
            placeholder="Votre message… (Entrée pour envoyer)"
            style={{ ...inp, resize:"none" as const, flex:1 }}
          />
          <button onClick={envoyerMessage} disabled={sending || !brouillon.contenu.trim()}
            style={{ background:CLR.vert, border:"none", borderRadius:10, padding:"0 16px",
              color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
              opacity:sending || !brouillon.contenu.trim() ? 0.5 : 1 }}>
            {sending ? "…" : "↑"}
          </button>
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:4 }}>
          Maj+Entrée pour aller à la ligne · Entrée pour envoyer
        </div>
      </div>
    </div>
  );

  // ── Liste conversations ────────────────────────────────
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:12, fontFamily:SA }}>
      {/* En-tête */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>💬 Messagerie</div>
          <div style={{ fontSize:10, color:source==="supabase"?CLR.vertL:"rgba(255,255,255,0.3)" }}>
            {source==="supabase"?"✅ Connecté":"📦 Local"}
            {" · "}{conversations.filter(c => !c.archivee).length} conversation{conversations.length>1?"s":""}
          </div>
        </div>
        <button onClick={() => setModalNouv(true)}
          style={{ background:CLR.vert, border:"none", borderRadius:8, padding:"7px 14px",
            color:"#fff", fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          + Nouvelle
        </button>
      </div>

      <input value={search} onChange={e => setSearch(e.target.value)}
        placeholder="🔍 Rechercher une conversation…"
        style={{ ...inp, padding:"9px 13px" }}/>

      {/* Filtres canal */}
      <div style={{ display:"flex", gap:4, overflowX:"auto" }}>
        {(["interne","whatsapp","email"] as CanalMessage[]).map(c => {
          const nb = filtrees.filter(cv => cv.canal === c).length;
          return (
            <div key={c} style={{ padding:"4px 10px", borderRadius:99, fontSize:9,
              background:"rgba(255,255,255,0.07)", color:CLR.creamD, flexShrink:0 }}>
              {CANAL_ICO[c]} {nb}
            </div>
          );
        })}
      </div>

      {filtrees.length === 0 && (
        <div style={{ textAlign:"center", padding:"32px", color:CLR.creamD, fontStyle:"italic" }}>
          Aucune conversation. Créez la première avec "+ Nouvelle".
        </div>
      )}

      {/* Liste */}
      <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
        {filtrees.map(c => (
          <div key={c.id} onClick={() => ouvrirConversation(c)}
            style={{ background:CLR.card, border:`1px solid ${c.nonLus>0?"rgba(21,128,61,0.4)":CLR.line}`,
              borderRadius:12, padding:"12px 14px", cursor:"pointer",
              display:"flex", gap:10, alignItems:"center" }}>
            {/* Avatar */}
            <div style={{ width:40, height:40, borderRadius:"50%", background:"rgba(21,128,61,0.15)",
              display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>
              {CANAL_ICO[c.canal]}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:2 }}>
                <div style={{ fontSize:13, fontWeight:700, color:"#fff",
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {c.titre}
                </div>
                {c.dateDernierMsg && (
                  <span style={{ fontSize:9, color:"rgba(255,255,255,0.35)", flexShrink:0 }}>
                    {fmtDate(c.dateDernierMsg)}
                  </span>
                )}
              </div>
              <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                <div style={{ fontSize:11, color:CLR.creamD,
                  overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", flex:1 }}>
                  {c.dernierMessage || "Aucun message"}
                </div>
                {c.nonLus > 0 && (
                  <span style={{ background:CLR.vert, color:"#fff", borderRadius:99,
                    fontSize:9, padding:"1px 6px", fontWeight:700, flexShrink:0 }}>
                    {c.nonLus}
                  </span>
                )}
              </div>
              {(c.devisRef || c.commandeRef) && (
                <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)", marginTop:3 }}>
                  {c.devisRef || c.commandeRef}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal nouvelle conversation */}
      {modalNouv && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.85)", zIndex:1000,
          display:"flex", flexDirection:"column", overflowY:"auto", padding:20 }}>
          <div style={{ background:CLR.night, border:`1px solid ${CLR.line}`,
            borderRadius:16, padding:20, maxWidth:460, margin:"auto", width:"100%" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:700, color:"#fff" }}>Nouvelle conversation</div>
              <button onClick={() => setModalNouv(false)}
                style={{ background:"none", border:"none", color:CLR.creamD,
                  cursor:"pointer", fontSize:20 }}>✕</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:9 }}>
              {[["Destinataire *","destinataireNom","text","Nom du client ou contact"],
                ["Téléphone","destinataireTel","tel","+594 ..."],
                ["Email","destinataireEmail","email","email@..."]].map(([l,k,t,ph]) => (
                <div key={k} style={{ display:"flex", flexDirection:"column", gap:3 }}>
                  <label style={{ fontSize:10, color:CLR.creamD }}>{l}</label>
                  <input type={t} placeholder={ph}
                    value={(brouillon as any)[k] || ""}
                    onChange={e => setBrouillon(b => ({ ...b, [k]: e.target.value }))}
                    style={inp}/>
                </div>
              ))}
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>Canal</label>
                <select value={brouillon.canal}
                  onChange={e => setBrouillon(b => ({ ...b, canal:e.target.value as CanalMessage }))}
                  style={{ ...inp, background:"#1a1a2e" }}>
                  {(["interne","whatsapp","email"] as CanalMessage[]).map(c => (
                    <option key={c} value={c}>{CANAL_ICO[c]} {CANAL_LABELS[c]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                <label style={{ fontSize:10, color:CLR.creamD }}>Message initial</label>
                <textarea rows={3} value={brouillon.contenu}
                  onChange={e => setBrouillon(b => ({ ...b, contenu:e.target.value }))}
                  placeholder="Premier message…"
                  style={{ ...inp, resize:"vertical" as const }}/>
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={creerConversation} disabled={sending || !brouillon.destinataireNom.trim()}
                  style={{ flex:1, background:CLR.vert, border:"none", borderRadius:10, padding:"11px",
                    color:"#fff", fontWeight:700, fontSize:13, cursor:"pointer",
                    fontFamily:SA, opacity:sending?0.6:1 }}>
                  {sending ? "…" : "✅ Créer la conversation"}
                </button>
                <button onClick={() => setModalNouv(false)}
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

// ═══════════════════════════════════════════════════════════
// BellaiaAssistant.tsx — Interface IA Conversationnelle
// Branché sur CRM · Catalogue · Stock · Workflow · Recherche
// src/modules/assistant/BellaiaAssistant.tsx
// ═══════════════════════════════════════════════════════════
import React, { useState, useEffect, useRef, useCallback } from "react";
import type { DomaineIA, Message, ActionProposee } from "./assistantTypes";
import {
  msgUser, msgAssistant, genConvId, now, fmtDateHeure,
  DOMAINE_LABELS, getSuggestions, resumerAction, actionsEnAttente,
  messageValidation,
} from "./assistantUtils";
import { routerLocal } from "./assistantRouter";
import { envoyerMessage } from "./assistantApi";
import { WorkflowEngine } from "../core/WorkflowEngine";

const SA  = "system-ui, -apple-system, sans-serif";
const FS  = "Georgia, 'Times New Roman', serif";
const CLR = {
  vert:"#15803d", vertL:"#22c55e",
  or:"#c9a96e",   creamD:"rgba(245,240,232,0.6)",
  card:"rgba(255,255,255,0.04)", line:"rgba(255,255,255,0.1)",
  danger:"#f87171",
};

const DOMAINES_RAPIDES: DomaineIA[] = [
  "GENERAL","ERP","FOOD","EVENTS","COMM","BSH","ODYSSEE","MOTIPY",
];

// ── Icône domaine ─────────────────────────────────────────
const DOMAINE_ICO: Record<DomaineIA, string> = {
  FOOD:"🍃", EVENTS:"✨", BSH:"💜", ODYSSEE:"💆",
  EDITIONS:"📚", MOTIPY:"🌿", VILO:"🤝",
  ERP:"⚙", COMM:"📣", GENERAL:"◎",
};

// ══════════════════════════════════════════════════════════
// BULLE DE MESSAGE
// ══════════════════════════════════════════════════════════
function BulleMessage({
  msg, onValiderAction, onRefuserAction,
}: {
  msg: Message;
  onValiderAction?: (id: string) => void;
  onRefuserAction?: (id: string) => void;
}) {
  const isIA   = msg.role === "assistant";
  const isUser = msg.role === "user";

  return (
    <div style={{ display:"flex", justifyContent:isUser?"flex-end":"flex-start",
      marginBottom:8 }}>
      <div style={{
        maxWidth:"82%",
        padding:"10px 13px",
        borderRadius:14,
        background:isUser
          ? "rgba(21,128,61,0.25)"
          : isIA ? "rgba(255,255,255,0.07)" : "rgba(201,168,76,0.1)",
        borderBottomRightRadius: isUser ? 2 : 14,
        borderBottomLeftRadius:  isUser ? 14 : 2,
        border: isIA ? `1px solid ${CLR.line}` : "none",
      }}>
        {/* Texte */}
        <div style={{ fontSize:13, color:"#fff", lineHeight:1.6,
          whiteSpace:"pre-wrap" as const }}>
          {msg.contenu}
        </div>
        {/* Horodatage */}
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.3)",
          marginTop:5, textAlign:isUser?"right":"left" }}>
          {fmtDateHeure(msg.timestamp)}
          {msg.domaine && msg.domaine !== "GENERAL" && (
            <span style={{ marginLeft:6 }}>
              {DOMAINE_ICO[msg.domaine]} {msg.domaine}
            </span>
          )}
        </div>

        {/* Suggestions de suivi */}
        {isIA && msg.suggestions && msg.suggestions.length > 0 && (
          <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4 }}>
            {msg.suggestions.map((s, i) => (
              <button key={i}
                style={{ background:"rgba(21,128,61,0.15)", border:`1px solid ${CLR.vert}44`,
                  borderRadius:8, padding:"5px 10px", color:CLR.vertL, fontSize:10,
                  cursor:"pointer", textAlign:"left" as const, fontFamily:SA }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// CARTE ACTION (en attente de validation fondatrice)
// ══════════════════════════════════════════════════════════
function CarteAction({
  action, onValider, onRefuser,
}: {
  action: ActionProposee;
  onValider: () => void;
  onRefuser: () => void;
}) {
  const risqueCouleur = {
    faible:"#22c55e", moyen:"#fb923c", eleve:"#f87171",
  }[action.risque];

  return (
    <div style={{ background:"rgba(201,168,76,0.08)", border:"1px solid rgba(201,168,76,0.3)",
      borderRadius:12, padding:"12px 14px", margin:"8px 0" }}>
      <div style={{ fontSize:10, color:CLR.or, fontWeight:700, marginBottom:6 }}>
        ⚠️ ACTION EN ATTENTE DE VALIDATION
      </div>
      <div style={{ fontSize:12, fontWeight:700, color:"#fff", marginBottom:4 }}>
        {action.libelle}
      </div>
      <div style={{ fontSize:11, color:CLR.creamD, marginBottom:10, lineHeight:1.5 }}>
        {action.description}
      </div>
      <div style={{ display:"flex", gap:4, alignItems:"center", marginBottom:10 }}>
        <span style={{ fontSize:9, background:`${risqueCouleur}22`,
          color:risqueCouleur, borderRadius:4, padding:"2px 8px", fontWeight:700 }}>
          Risque {action.risque}
        </span>
        <span style={{ fontSize:9, color:CLR.creamD }}>{action.type.replace(/_/g," ")}</span>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={onValider}
          style={{ flex:1, background:"rgba(21,128,61,0.2)",
            border:"1px solid rgba(21,128,61,0.4)", borderRadius:9, padding:"8px",
            color:CLR.vertL, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          ✅ Valider
        </button>
        <button onClick={onRefuser}
          style={{ flex:1, background:"rgba(248,113,113,0.1)",
            border:"1px solid rgba(248,113,113,0.3)", borderRadius:9, padding:"8px",
            color:CLR.danger, fontWeight:700, fontSize:12, cursor:"pointer", fontFamily:SA }}>
          ✕ Refuser
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function BellaiaAssistant() {
  const [messages,  setMessages]  = useState<Message[]>([]);
  const [actions,   setActions]   = useState<ActionProposee[]>([]);
  const [domaine,   setDomaine]   = useState<DomaineIA>("GENERAL");
  const [texte,     setTexte]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [convId]                  = useState(genConvId);
  const [apiOk,     setApiOk]     = useState<boolean|null>(null);

  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);

  // Message de bienvenue
  useEffect(() => {
    const bienvenue: Message = {
      id:          genConvId(),
      role:        "assistant",
      contenu:     `Bonjour Renée-Lise 🌿\n\nJe suis Bellaïa, votre assistante Bella'Studio.\n\nJe peux vous aider sur : Food, Events, BSH, Odyssée, communication, CRM, stocks et comptabilité.\n\nQue puis-je faire pour vous aujourd'hui ?`,
      domaine:     "GENERAL",
      timestamp:   now(),
      suggestions: getSuggestions("GENERAL", 3),
    };
    setMessages([bienvenue]);

    // Tester la disponibilité de l'API
    fetch("/api/chat", { method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ messages:[{role:"user",content:"ping"}], max_tokens:5 }),
    }).then(r => setApiOk(r.ok)).catch(() => setApiOk(false));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior:"smooth" });
  }, [messages, loading]);

  // Détecter automatiquement le domaine depuis le texte
  const detecterDomaine = useCallback((t: string) => {
    const detection = routerLocal(t);
    if (detection.confiance > 60 && detection.domaine !== "GENERAL") {
      setDomaine(detection.domaine);
    }
  }, []);

  const envoyer = useCallback(async () => {
    const q = texte.trim();
    if (!q || loading) return;

    // Détecter domaine
    detecterDomaine(q);
    const domaineActuel = routerLocal(q).confiance > 60
      ? routerLocal(q).domaine : domaine;

    // Ajouter message user
    const msgU = msgUser(q, domaineActuel);
    setMessages(ms => [...ms, msgU]);
    setTexte("");
    setLoading(true);

    try {
      const reponse = await envoyerMessage({
        messages:     [...messages, msgU],
        domaine:      domaineActuel,
        texteUser:    q,
        avecContexte: true,
      });

      const msgIA = msgAssistant(reponse.texte, reponse.domaine, reponse.suggestions);
      setMessages(ms => [...ms, msgIA]);

      // Ajouter les actions proposées à la file d'attente
      if (reponse.actions?.length) {
        setActions(as => [...as, ...reponse.actions!]);
      }

      // Mettre à jour le domaine détecté
      if (reponse.domaine !== "GENERAL") {
        setDomaine(reponse.domaine);
      }
    } catch {
      setMessages(ms => [...ms, msgAssistant(
        "Désolée, une erreur est survenue. Réessayez dans quelques instants.",
        domaine
      )]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [texte, loading, messages, domaine, detecterDomaine]);

  const validerAction = useCallback(async (id: string) => {
    const action = actions.find(a => a.id === id);
    if (!action) return;

    // Marquer comme validée immédiatement dans l'UI
    setActions(as => as.map(a =>
      a.id === id ? { ...a, statut:"validee", valideeLe:now() } : a
    ));

    let msgResultat = "✅ Action validée et exécutée.";

    try {
      // Exécution réelle via WorkflowEngine selon le type d'action
      switch (action.type) {
        case "creer_commande":
        case "creer_facture": {
          const payload = action.payload as any;
          const res = await WorkflowEngine.transitionner({
            entiteTable:   payload.entiteTable || "bellaia_commandes",
            entiteId:      payload.entiteId    || payload.id || "",
            bu:            (action.domaine as any) || "GENERAL",
            statutActuel:  payload.statutActuel  || "COMMANDE",
            nouveauStatut: action.type === "creer_facture" ? "FACTURE" : "COMMANDE",
            clientNom:     payload.clientNom || "",
            clientTel:     payload.clientTel,
            reference:     payload.reference,
            montant:       payload.montant,
            operateur:     "fondatrice",
          });
          if (res.ok) {
            msgResultat = `✅ ${action.libelle}\nActions lancées : ${(res.actionsLancees||[]).join(", ")}`;
          } else {
            msgResultat = `⚠️ ${res.raison || "Transition non autorisée."}`;
          }
          break;
        }
        case "envoyer_whatsapp": {
          const payload = action.payload as any;
          if (payload.telephone && payload.message) {
            const num = payload.telephone.replace(/\D/g,"");
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(payload.message)}`, "_blank");
            msgResultat = "✅ WhatsApp ouvert avec le message pré-rempli.";
          }
          break;
        }
        default:
          msgResultat = `✅ Action "${action.libelle}" validée.\n(Exécution de type "${action.type}" — disponible dans la prochaine session)`;
      }
    } catch (err) {
      msgResultat = "⚠️ L'action a été validée mais une erreur est survenue lors de l'exécution.";
    }

    // Marquer comme exécutée
    setActions(as => as.map(a =>
      a.id === id ? { ...a, statut:"executee", executeeLE:now() } : a
    ));

    setMessages(ms => [...ms, msgAssistant(msgResultat, domaine)]);
  }, [actions, domaine]);

  const refuserAction = useCallback((id: string) => {
    setActions(as => as.map(a =>
      a.id === id ? { ...a, statut:"refusee" } : a
    ));
    setMessages(ms => [...ms, msgAssistant(
      "Action annulée. Comment puis-je vous aider autrement ?",
      domaine
    )]);
  }, [domaine]);

  const utiliserSuggestion = useCallback((s: string) => {
    setTexte(s);
    inputRef.current?.focus();
  }, []);

  const actionsAttente = actionsEnAttente(actions);

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%",
      maxHeight:"100vh", fontFamily:SA }}>

      {/* ── Header ── */}
      <div style={{ padding:"10px 14px", borderBottom:`1px solid ${CLR.line}`,
        display:"flex", justifyContent:"space-between", alignItems:"center",
        background:"rgba(0,0,0,0.3)", flexShrink:0 }}>
        <div>
          <div style={{ fontFamily:FS, fontSize:15, color:CLR.or }}>
            ◎ Bellaïa IA
          </div>
          <div style={{ fontSize:9, color:CLR.creamD }}>
            {apiOk === true  && "✅ Connexion IA active"}
            {apiOk === false && "📦 Mode local (IA indisponible)"}
            {apiOk === null  && "⏳ Test connexion…"}
          </div>
        </div>
        {/* Domaine actif */}
        <div style={{ fontSize:10, background:"rgba(21,128,61,0.15)",
          border:`1px solid ${CLR.vert}44`, borderRadius:8, padding:"4px 10px",
          color:CLR.vertL }}>
          {DOMAINE_ICO[domaine]} {domaine}
        </div>
      </div>

      {/* ── Sélecteur de domaine ── */}
      <div style={{ display:"flex", gap:5, padding:"8px 14px",
        overflowX:"auto", borderBottom:`1px solid ${CLR.line}`, flexShrink:0 }}>
        {DOMAINES_RAPIDES.map(d => (
          <button key={d} onClick={() => setDomaine(d)}
            style={{ padding:"4px 10px", borderRadius:99, border:"none", cursor:"pointer",
              fontSize:9, fontWeight:700, flexShrink:0, fontFamily:SA,
              background:domaine===d?"rgba(21,128,61,0.25)":"rgba(255,255,255,0.06)",
              color:domaine===d?CLR.vertL:"rgba(255,255,255,0.45)" }}>
            {DOMAINE_ICO[d]} {d}
          </button>
        ))}
      </div>

      {/* ── Actions en attente ── */}
      {actionsAttente.length > 0 && (
        <div style={{ padding:"0 14px", flexShrink:0 }}>
          {actionsAttente.map(a => (
            <CarteAction key={a.id} action={a}
              onValider={() => validerAction(a.id)}
              onRefuser={() => refuserAction(a.id)}
            />
          ))}
        </div>
      )}

      {/* ── Fil de messages ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"12px 14px" }}>
        {messages.map(m => (
          <BulleMessage
            key={m.id}
            msg={{
              ...m,
              // Brancher suggestions sur utiliserSuggestion
              suggestions: m.role === "assistant" ? m.suggestions : undefined,
            }}
            onValiderAction={validerAction}
            onRefuserAction={refuserAction}
          />
        ))}

        {/* Suggestions cliquables sous le dernier message IA */}
        {messages.length > 0 && messages[messages.length-1].role === "assistant"
          && messages[messages.length-1].suggestions?.length && (
          <div style={{ display:"flex", flexDirection:"column", gap:5, marginBottom:8 }}>
            {messages[messages.length-1].suggestions!.map((s, i) => (
              <button key={i} onClick={() => utiliserSuggestion(s)}
                style={{ background:"rgba(21,128,61,0.12)", border:`1px solid ${CLR.vert}33`,
                  borderRadius:9, padding:"7px 12px", color:CLR.vertL, fontSize:11,
                  cursor:"pointer", textAlign:"left" as const, fontFamily:SA }}>
                ↳ {s}
              </button>
            ))}
          </div>
        )}

        {/* Indicateur de frappe */}
        {loading && (
          <div style={{ display:"flex", gap:5, padding:"8px 0", alignItems:"center" }}>
            <div style={{ width:8, height:8, borderRadius:"50%",
              background:CLR.vertL, animation:"pulse 1s infinite" }}/>
            <span style={{ fontSize:11, color:CLR.creamD, fontStyle:"italic" }}>
              Bellaïa réfléchit…
            </span>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* ── Zone de saisie ── */}
      <div style={{ padding:"10px 14px", borderTop:`1px solid ${CLR.line}`,
        flexShrink:0, background:"rgba(0,0,0,0.2)" }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          <textarea
            ref={inputRef}
            value={texte}
            onChange={e => setTexte(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                envoyer();
              }
            }}
            placeholder="Posez votre question à Bellaïa… (Entrée pour envoyer)"
            rows={2}
            style={{
              flex:1, background:"rgba(255,255,255,0.07)",
              border:`1px solid ${CLR.line}`, borderRadius:10,
              padding:"9px 12px", color:"#fff", fontSize:13,
              fontFamily:SA, outline:"none", resize:"none" as const,
              lineHeight:1.5,
            }}
          />
          <button
            onClick={envoyer}
            disabled={!texte.trim() || loading}
            style={{
              background:(!texte.trim()||loading)?"rgba(255,255,255,0.08)":CLR.vert,
              border:"none", borderRadius:10, padding:"11px 16px",
              color:"#fff", fontWeight:700, fontSize:16,
              cursor:(!texte.trim()||loading)?"default":"pointer",
              transition:"background 0.2s", flexShrink:0,
            }}>
            ➤
          </button>
        </div>
        <div style={{ fontSize:9, color:"rgba(255,255,255,0.25)", marginTop:5 }}>
          Shift+Entrée pour nouvelle ligne · Bellaïa accède aux données réelles Bellaïa Studio
        </div>
      </div>
    </div>
  );
}

"use client";
// ═══════════════════════════════════════════════════════════
// Messages & notifications — src/app/bsh/espace/messages/MessagesClient.tsx
//
// Liste complète de bellaia_notifications (déjà utilisée, en aperçu,
// par le tableau de bord) avec marquer comme lu — pas la messagerie
// interne complète (conversations, pièces jointes, temps réel :
// src/modules/messaging/), système transversal à tous les pôles dont
// les policies RLS restent à vérifier avant d'y exposer une cliente.
// Le lien "Ouvrir la messagerie" renvoie donc vers l'accueil Bellaïa,
// où cette messagerie existe déjà (bouton "💬 Envoyer un message" du
// portail client) — même principe que le lien BSH Members du tableau
// de bord.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";

interface Notification {
  id: string;
  titre: string;
  contenu: string | null;
  lu: boolean;
  created_at: string;
}

export default function MessagesClient() {
  const etat = useBshEspace();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etat]);

  async function charger() {
    if (etat.statut !== "connectee") return;
    const res = await espaceFetch(
      etat.token,
      "bellaia_notifications?select=id,titre,contenu,lu,created_at&order=created_at.desc&limit=100"
    );
    if (res.ok) setNotifications(await res.json());
  }

  const marquerLu = async (id: string) => {
    if (etat.statut !== "connectee" || busyId) return;
    setBusyId(id);
    const res = await espaceFetch(etat.token, `bellaia_notifications?id=eq.${id}`, {
      method: "PATCH",
      body: JSON.stringify({ lu: true }),
    });
    if (res.ok) {
      setNotifications((p) => (p ? p.map((n) => (n.id === id ? { ...n, lu: true } : n)) : p));
    }
    setBusyId(null);
  };

  const marquerToutLu = async () => {
    if (etat.statut !== "connectee" || !notifications) return;
    const nonLues = notifications.filter((n) => !n.lu);
    if (nonLues.length === 0) return;
    await Promise.all(
      nonLues.map((n) => espaceFetch(etat.token as string, `bellaia_notifications?id=eq.${n.id}`, {
        method: "PATCH",
        body: JSON.stringify({ lu: true }),
      }))
    );
    setNotifications((p) => (p ? p.map((n) => ({ ...n, lu: true })) : p));
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de vos messages…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour voir vos notifications.
        </p>
        <Link
          href="/"
          style={{
            background: C.gold,
            borderRadius: 2,
            padding: "11px 24px",
            color: C.night,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.06em",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Se connecter
        </Link>
      </div>
    );
  }

  if (etat.statut === "erreur") {
    return <EtatVide message={`Un problème est survenu : ${etat.message}`} />;
  }

  const nonLues = (notifications || []).filter((n) => !n.lu).length;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 0,
        color: C.cream,
        fontFamily: BODY,
        fontWeight: 300,
        maxWidth: 560,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 60%, ${C.night} 100%)`,
          padding: "32px 22px 26px",
        }}
      >
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.18em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 10,
          }}
        >
          Mon espace BSH
        </span>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 22, margin: 0, color: C.cream }}>
          Messages &amp; notifications
        </h1>
      </div>

      {/* ── Ouvrir la messagerie ── */}
      <div
        style={{
          background: `linear-gradient(135deg, ${C.plum} 0%, ${C.plumD} 100%)`,
          borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`,
          padding: "16px 22px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.cream, marginBottom: 3 }}>
            Une question pour la fondatrice ?
          </div>
          <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
            La messagerie de votre compte Bellaïa s&apos;ouvre depuis l&apos;accueil.
          </div>
        </div>
        <Link
          href="/"
          style={{
            background: C.gold,
            borderRadius: 2,
            padding: "9px 16px",
            color: C.night,
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.04em",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          Ouvrir la messagerie →
        </Link>
      </div>

      {/* ── Notifications ── */}
      <div style={{ padding: "18px 22px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
          <TitreSection>Notifications</TitreSection>
          {nonLues > 0 && (
            <button
              onClick={marquerToutLu}
              style={{
                background: "none",
                border: "none",
                color: C.goldL,
                fontSize: 10,
                letterSpacing: "0.02em",
                cursor: "pointer",
                fontFamily: BODY,
              }}
            >
              Tout marquer comme lu
            </button>
          )}
        </div>

        {notifications === null ? (
          <EtatVide message="Chargement…" />
        ) : notifications.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            Vous n&apos;avez pas encore de notification.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.lu && marquerLu(n.id)}
                style={{
                  background: n.lu ? "rgba(46,26,46,0.5)" : "rgba(198,161,91,0.08)",
                  border: `1px solid ${n.lu ? C.borderM : "rgba(198,161,91,0.3)"}`,
                  borderRadius: 4,
                  padding: "11px 13px",
                  cursor: n.lu ? "default" : "pointer",
                  opacity: busyId === n.id ? 0.6 : 1,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: n.lu ? 400 : 700, color: C.cream }}>{n.titre}</span>
                  {!n.lu && <span style={{ fontSize: 8, color: C.gold, whiteSpace: "nowrap" }}>●&nbsp;non lu</span>}
                </div>
                {n.contenu && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>{n.contenu}</div>
                )}
                <div style={{ fontSize: 9, color: "rgba(203,185,185,0.4)", marginTop: 5 }}>
                  {new Date(n.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TitreSection({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 10,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: C.gold,
      }}
    >
      {children}
    </div>
  );
}

function EtatVide({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 22px", textAlign: "center", color: C.muted, fontFamily: BODY, fontSize: 13 }}>
      {message}
    </div>
  );
}

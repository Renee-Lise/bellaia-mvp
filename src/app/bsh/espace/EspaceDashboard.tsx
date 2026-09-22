"use client";
// ═══════════════════════════════════════════════════════════
// Tableau de bord — Mon espace BSH — src/app/bsh/espace/EspaceDashboard.tsx
//
// Bandeau statut membre conditionnel (comme dans BSHMembersPage) puis
// tuiles de résumé lisant les vraies tables de la migration 0001
// (favoris, panier_items, reservations_experiences), stripe_payment_intents
// (commandes réelles, migration 0002) et la table existante
// bellaia_notifications. Aucune nouvelle table.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { useBshEspace, espaceFetch } from "./useBshEspace";

interface Reservation {
  id: string;
  titre: string;
  statut: string;
  date_souhaitee: string | null;
}

interface Notification {
  id: string;
  titre: string;
  contenu: string | null;
}

const LABEL_STATUT_RESA: Record<string, string> = {
  demande_recue: "Demande reçue",
  validee: "Validée",
  acompte_recu: "Acompte reçu",
  confirmee: "Confirmée",
  realisee: "Réalisée",
  annulee: "Annulée",
};

function deconnecter() {
  localStorage.removeItem("bellaia_token");
  localStorage.removeItem("bellaia_refresh");
  localStorage.removeItem("bellaia_expiry");
  window.location.href = "/";
}

export default function EspaceDashboard() {
  const etat = useBshEspace();
  const [favorisCount, setFavorisCount] = useState<number | null>(null);
  const [panierCount, setPanierCount] = useState<number | null>(null);
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [commandesCount, setCommandesCount] = useState<number | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const [rFav, rPanier, rResa, rNotif, rCmd] = await Promise.all([
        espaceFetch(token, "favoris?select=id"),
        espaceFetch(token, "panier_items?select=id,quantite"),
        espaceFetch(
          token,
          "reservations_experiences?select=id,titre,statut,date_souhaitee&order=created_at.desc&limit=5"
        ),
        espaceFetch(
          token,
          "bellaia_notifications?select=id,titre,contenu&lu=eq.false&order=created_at.desc&limit=5"
        ),
        espaceFetch(token, "stripe_payment_intents?module=eq.BSH&select=id"),
      ]);
      if (!actif) return;
      if (rFav.ok) setFavorisCount((await rFav.json()).length);
      if (rPanier.ok) {
        const lignes: { quantite: number }[] = await rPanier.json();
        setPanierCount(lignes.reduce((s, l) => s + (l.quantite || 0), 0));
      }
      if (rResa.ok) setReservations(await rResa.json());
      if (rNotif.ok) setNotifications(await rNotif.json());
      if (rCmd.ok) setCommandesCount((await rCmd.json()).length);
    })();

    return () => {
      actif = false;
    };
  }, [etat]);

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de votre espace…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour accéder à votre espace
          BSH — favoris, panier, réservations et suivi.
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

  const { profil } = etat;
  const prenom = profil.prenom || profil.nom || profil.email || "";

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
      {/* ── En-tête ── */}
      <div
        style={{
          background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 60%, ${C.night} 100%)`,
          padding: "32px 22px 26px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
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
          <h1
            style={{
              fontFamily: DISPLAY,
              fontWeight: 500,
              fontSize: 22,
              margin: 0,
              color: C.cream,
            }}
          >
            Bonjour{prenom ? `, ${prenom}` : ""}
          </h1>
        </div>
        <button
          onClick={deconnecter}
          style={{
            background: "transparent",
            border: `1px solid ${C.borderM}`,
            borderRadius: 2,
            padding: "6px 12px",
            color: C.muted,
            fontSize: 10,
            letterSpacing: "0.04em",
            cursor: "pointer",
            fontFamily: BODY,
          }}
        >
          Déconnexion
        </button>
      </div>

      {/* ── Bandeau statut membre ── */}
      <BandeauStatut statut={profil.membership_status} />

      {/* ── Notifications non lues ── */}
      {notifications && notifications.length > 0 && (
        <div style={{ padding: "18px 22px 0" }}>
          <TitreSection>Notifications</TitreSection>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{
                  background: "rgba(198,161,91,0.06)",
                  border: `1px solid ${C.borderM}`,
                  borderRadius: 4,
                  padding: "10px 12px",
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 500, color: C.cream }}>{n.titre}</div>
                {n.contenu && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 3, lineHeight: 1.5 }}>
                    {n.contenu}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tuiles de résumé ── */}
      <div style={{ padding: "22px 22px 0" }}>
        <TitreSection>Vue d&apos;ensemble</TitreSection>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Tuile
            ico="📦"
            titre="Commandes"
            valeur={commandesCount === null ? "…" : String(commandesCount)}
            sousTitre={commandesCount ? "voir le suivi →" : "aucune pour l'instant"}
            href="/bsh/espace/commandes"
          />
          <Tuile
            ico="♥"
            titre="Favoris"
            valeur={favorisCount === null ? "…" : String(favorisCount)}
            sousTitre={favorisCount ? "article(s) enregistré(s)" : "aucun pour l'instant"}
          />
          <Tuile
            ico="🛍"
            titre="Panier"
            valeur={panierCount === null ? "…" : String(panierCount)}
            sousTitre={panierCount ? "article(s) — Prix à venir" : "panier vide"}
          />
          <Tuile
            ico="🎁"
            titre="Réservations"
            valeur={reservations === null ? "…" : String(reservations.length)}
            sousTitre={
              reservations && reservations.length > 0
                ? LABEL_STATUT_RESA[reservations[0].statut] || reservations[0].statut
                : "aucune pour l'instant"
            }
          />
        </div>
      </div>

      {/* ── Préférences ── */}
      <div style={{ padding: "22px 22px 32px" }}>
        <TitreSection>Préférences</TitreSection>
        <div
          style={{
            background: "rgba(46,26,46,0.5)",
            border: `1px solid ${C.borderM}`,
            borderRadius: 4,
            padding: "14px",
            fontSize: 12,
            color: C.muted,
            fontStyle: "italic",
          }}
        >
          Bientôt disponible.
        </div>
      </div>
    </div>
  );
}

function BandeauStatut({ statut }: { statut: string | null }) {
  if (statut === "founding_member" || statut === "member") {
    const fondatrice = statut === "founding_member";
    return (
      <div
        style={{
          background: "rgba(198,161,91,0.1)",
          borderTop: `1px solid ${C.borderM}`,
          borderBottom: `1px solid ${C.borderM}`,
          padding: "14px 22px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 22 }}>{fondatrice ? "💎" : "✦"}</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: BODY }}>
            {fondatrice ? "Membre Fondateur" : "Membre BSH Members"}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            {fondatrice
              ? "Vous faites partie des premières membres de BSH Members."
              : "Vous faites partie du programme BSH Members."}
          </div>
        </div>
      </div>
    );
  }

  if (statut === "member_pending") {
    return (
      <div
        style={{
          background: "rgba(198,161,91,0.06)",
          borderTop: `1px solid ${C.borderM}`,
          borderBottom: `1px solid ${C.borderM}`,
          padding: "14px 22px",
          display: "flex",
          gap: 12,
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: 22 }}>⏳</span>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, fontFamily: BODY }}>
            Demande en cours d&apos;examen
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
            Votre demande d&apos;adhésion à BSH Members a été transmise à la
            fondatrice.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${C.plum} 0%, ${C.plumD} 100%)`,
        borderTop: `1px solid ${C.border}`,
        borderBottom: `1px solid ${C.border}`,
        padding: "18px 22px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.cream, marginBottom: 3 }}>
          Découvrez BSH Members
        </div>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.5 }}>
          Le club privé de Bella&apos;Secret Home — adhésion validée
          personnellement par la fondatrice.
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
        Découvrir →
      </Link>
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
        marginBottom: 10,
      }}
    >
      {children}
    </div>
  );
}

function Tuile({
  ico,
  titre,
  valeur,
  sousTitre,
  href,
}: {
  ico: string;
  titre: string;
  valeur: string;
  sousTitre: string;
  href?: string;
}) {
  const contenu = (
    <>
      <div style={{ fontSize: 18, marginBottom: 6 }}>{ico}</div>
      <div style={{ fontSize: 11, color: C.muted, marginBottom: 2 }}>{titre}</div>
      <div
        style={{
          fontFamily: DISPLAY,
          fontSize: 20,
          fontWeight: 500,
          color: C.cream,
          marginBottom: 3,
        }}
      >
        {valeur}
      </div>
      <div style={{ fontSize: 10, color: "rgba(203,185,185,0.5)" }}>{sousTitre}</div>
    </>
  );
  const style: React.CSSProperties = {
    background: "rgba(46,26,46,0.5)",
    border: `1px solid ${C.borderM}`,
    borderRadius: 4,
    padding: "14px",
    display: "block",
    textDecoration: "none",
  };
  return href ? (
    <Link href={href} style={style}>
      {contenu}
    </Link>
  ) : (
    <div style={style}>{contenu}</div>
  );
}

function EtatVide({ message }: { message: string }) {
  return (
    <div style={{ padding: "60px 22px", textAlign: "center", color: C.muted, fontFamily: BODY, fontSize: 13 }}>
      {message}
    </div>
  );
}

"use client";
// ═══════════════════════════════════════════════════════════
// Page publique BSH Members — src/app/bsh/members/MembersPublicClient.tsx
//
// Cahier des charges BSH Members §2 (parcours d'adhésion) et §3
// (page publique). Contenu public visible par toutes, mais la zone
// d'action change selon la session : invite à se connecter si
// déconnectée, formulaire de demande (18+ + charte, bloquants) si
// cliente non-membre, état "en cours" si member_pending, lien vers
// l'espace privé si déjà membre. Écrit directement dans profiles
// (membership_status → member_pending), bellaia_notifications et
// bsh_members_demandes — même triptyque que
// BSHMembersPage.demanderAdhesion dans l'ancienne SPA, RLS déjà
// vérifiée (migrations 0004/0005/0006).
// ═══════════════════════════════════════════════════════════
import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../bshTokens";
import { useBshEspace, espaceFetch } from "../espace/useBshEspace";

const AVANTAGES = [
  "Accès au programme BSH Members",
  "Informations et découvertes en avant-première",
  "Participation à certains votes, tests et sélections BSH",
  "Priorité d'information sur certaines nouveautés et événements",
  "Contenus ou opérations ponctuellement réservés aux membres",
];

export default function MembersPublicClient() {
  const etat = useBshEspace();
  const [confirme18, setConfirme18] = useState(false);
  const [charteSigned, setCharteSigned] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");
  const [statutLocal, setStatutLocal] = useState<string | null>(null);

  const envoyerDemande = async () => {
    if (etat.statut !== "connectee" || !confirme18 || !charteSigned || envoi) return;
    setEnvoi(true);
    setErreur("");
    const { token, profil } = etat;

    const res = await espaceFetch(token, `profiles?id=eq.${profil.id}`, {
      method: "PATCH",
      body: JSON.stringify({ membership_status: "member_pending" }),
    });

    if (res.ok) {
      setStatutLocal("member_pending");
      espaceFetch(token, "bellaia_notifications", {
        method: "POST",
        body: JSON.stringify({
          user_id: profil.id,
          type: "bsh_members",
          titre: "Nouvelle demande BSH Members",
          contenu: `${profil.prenom || ""} ${profil.nom || ""} (${profil.email || ""}) a demandé à rejoindre BSH Members.`,
          lu: false,
        }),
      }).catch(() => {});
      espaceFetch(token, "bsh_members_demandes", {
        method: "POST",
        body: JSON.stringify({
          user_id: profil.id,
          confirmation_18: confirme18,
          charte_acceptee: charteSigned,
        }),
      }).catch(() => {});
    } else {
      setErreur("Impossible d'enregistrer votre demande. Réessayez.");
    }
    setEnvoi(false);
  };

  const statutActuel = etat.statut === "connectee" ? statutLocal ?? etat.profil.membership_status : null;

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
      {/* ── Hero ── */}
      <div
        style={{
          background: `linear-gradient(160deg, ${C.plum} 0%, ${C.plumD} 50%, ${C.night} 100%)`,
          padding: "36px 22px 32px",
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
          <Image
            src="/bsh-members-logo.png"
            alt="BSH Members"
            width={96}
            height={96}
            style={{ borderRadius: "50%" }}
            priority
          />
        </div>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.2em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 10,
          }}
        >
          Programme exclusif
        </span>
        <h1
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 26,
            margin: "0 0 8px",
            color: C.cream,
          }}
        >
          BSH Members
        </h1>
        <p
          style={{
            fontSize: 12,
            letterSpacing: "0.1em",
            color: C.gold,
            textTransform: "uppercase",
            margin: "0 0 18px",
          }}
        >
          Exclusivité · Privilèges · Accès réservé
        </p>
        <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.8, margin: "0 auto", maxWidth: 380 }}>
          Le club privé de Bella&apos;Secret Home. Un programme sobre et
          confidentiel, pensé pour évoluer progressivement — chaque nouvel
          avantage sera annoncé aux membres avant d&apos;être activé.
        </p>
      </div>

      {/* ── Avantages ── */}
      <div style={{ background: C.night, padding: "28px 22px", borderTop: `1px solid ${C.border}` }}>
        <span
          style={{
            fontSize: 9,
            letterSpacing: "0.14em",
            color: C.gold,
            textTransform: "uppercase",
            display: "block",
            marginBottom: 12,
          }}
        >
          Avantages au lancement
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {AVANTAGES.map((a) => (
            <div key={a} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ color: C.gold, flexShrink: 0, marginTop: 1 }}>✦</span>
              <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>{a}</span>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", fontStyle: "italic", margin: "16px 0 0" }}>
          Le programme et ses avantages évolueront progressivement.
        </p>
      </div>

      {/* ── Zone d'action, selon la session ── */}
      <div style={{ background: C.plumD, padding: "28px 22px", borderTop: `1px solid ${C.border}` }}>
        <h2
          style={{
            fontFamily: DISPLAY,
            fontWeight: 500,
            fontSize: 18,
            margin: "0 0 16px",
            color: C.cream,
            textAlign: "center",
          }}
        >
          Rejoindre BSH Members
        </h2>

        {etat.statut === "chargement" && (
          <p style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>Chargement…</p>
        )}

        {etat.statut === "deconnectee" && (
          <div style={{ textAlign: "center" }}>
            <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7, marginBottom: 18 }}>
              Créez un compte ou connectez-vous pour demander à rejoindre BSH
              Members.
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
              Créer un compte / Se connecter
            </Link>
          </div>
        )}

        {etat.statut === "erreur" && (
          <p style={{ fontSize: 12, color: "#f87171", textAlign: "center" }}>
            Un problème est survenu : {etat.message}
          </p>
        )}

        {etat.statut === "connectee" && (statutActuel === "member" || statutActuel === "founding_member") && (
          <div
            style={{
              background: "rgba(198,161,91,0.08)",
              border: `1px solid ${C.borderM}`,
              borderRadius: 6,
              padding: "16px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>
              {statutActuel === "founding_member" ? "💎" : "✦"}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 10 }}>
              Vous êtes déjà membre
            </div>
            <Link
              href="/bsh/espace/members"
              style={{
                background: C.gold,
                borderRadius: 2,
                padding: "10px 20px",
                color: C.night,
                fontSize: 12,
                fontWeight: 500,
                letterSpacing: "0.06em",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              Accéder à mon espace membre
            </Link>
          </div>
        )}

        {etat.statut === "connectee" && statutActuel === "member_pending" && (
          <div
            style={{
              background: "rgba(198,161,91,0.08)",
              border: `1px solid ${C.borderM}`,
              borderRadius: 6,
              padding: "16px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 20, marginBottom: 8 }}>⏳</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.gold, marginBottom: 4 }}>
              Demande en cours d&apos;examen
            </div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              Votre demande a été transmise à la fondatrice. Vous serez
              notifiée dès qu&apos;elle sera traitée.
            </div>
          </div>
        )}

        {etat.statut === "connectee" &&
          (statutActuel === "customer" || !statutActuel) && (
            <div>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 12 }}>
                <input
                  type="checkbox"
                  checked={confirme18}
                  onChange={(e) => setConfirme18(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.gold, flexShrink: 0, marginTop: 1, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  Je confirme avoir <strong style={{ color: C.cream }}>18 ans ou plus</strong> et
                  souhaiter rejoindre BSH Members.
                </span>
              </label>
              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", marginBottom: 20 }}>
                <input
                  type="checkbox"
                  checked={charteSigned}
                  onChange={(e) => setCharteSigned(e.target.checked)}
                  style={{ width: 18, height: 18, accentColor: C.gold, flexShrink: 0, marginTop: 1, cursor: "pointer" }}
                />
                <span style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
                  J&apos;accepte la <strong style={{ color: C.cream }}>charte BSH Members</strong> :
                  confidentialité, respect, discrétion. Je comprends que
                  l&apos;adhésion est validée par la fondatrice.
                </span>
              </label>

              {erreur && (
                <div
                  style={{
                    background: "rgba(248,113,113,0.1)",
                    border: "1px solid rgba(248,113,113,0.3)",
                    borderRadius: 6,
                    padding: "8px 12px",
                    fontSize: 11,
                    color: "#f87171",
                    marginBottom: 12,
                  }}
                >
                  ⚠️ {erreur}
                </div>
              )}

              <button
                onClick={envoyerDemande}
                disabled={!confirme18 || !charteSigned || envoi}
                style={{
                  width: "100%",
                  background: confirme18 && charteSigned && !envoi ? C.gold : "rgba(198,161,91,0.2)",
                  border: "none",
                  borderRadius: 2,
                  padding: "12px",
                  color: confirme18 && charteSigned ? C.night : "rgba(198,161,91,0.5)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  cursor: confirme18 && charteSigned && !envoi ? "pointer" : "not-allowed",
                  fontFamily: BODY,
                  textTransform: "uppercase",
                }}
              >
                {envoi ? "Envoi en cours…" : "Demander à rejoindre BSH Members"}
              </button>
              <p style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", textAlign: "center", marginTop: 12, fontStyle: "italic" }}>
                Aucun abonnement. Aucun paiement. Adhésion validée par la
                fondatrice.
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

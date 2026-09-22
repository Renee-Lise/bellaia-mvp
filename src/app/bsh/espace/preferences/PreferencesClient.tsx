"use client";
// ═══════════════════════════════════════════════════════════
// Préférences — src/app/bsh/espace/preferences/PreferencesClient.tsx
//
// Modifie uniquement prenom/nom/telephone sur profiles — jamais
// role/statut/membership_status/age_verifi, qui ne doivent pouvoir
// être changés que par la fondatrice/assistante. Le payload envoyé ne
// contient que ces trois champs, par construction : ce n'est pas une
// vraie barrière de sécurité (elle doit venir de la policy RLS,
// vérifiée séparément avec Renée-Lise), juste une discipline côté
// client pour ne jamais donner l'occasion d'envoyer plus que prévu.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";

export default function PreferencesClient() {
  const etat = useBshEspace();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [enregistrement, setEnregistrement] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "erreur"; texte: string } | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    setPrenom(etat.profil.prenom || "");
    setNom(etat.profil.nom || "");
    setTelephone(etat.profil.telephone || "");
  }, [etat]);

  const enregistrer = async () => {
    if (etat.statut !== "connectee" || enregistrement) return;
    setEnregistrement(true);
    setMessage(null);
    const res = await espaceFetch(etat.token, `profiles?id=eq.${etat.profil.id}`, {
      method: "PATCH",
      body: JSON.stringify({
        prenom: prenom.trim() || null,
        nom: nom.trim() || null,
        telephone: telephone.trim() || null,
      }),
    });
    setMessage(
      res.ok
        ? { type: "ok", texte: "Vos coordonnées ont été mises à jour." }
        : { type: "erreur", texte: "Impossible d'enregistrer vos coordonnées. Réessayez." }
    );
    setEnregistrement(false);
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de vos préférences…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour modifier vos préférences.
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

  const champStyle: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    background: "rgba(255,255,255,0.06)",
    border: `1px solid ${C.borderM}`,
    borderRadius: 2,
    padding: "9px 11px",
    color: C.cream,
    fontSize: 12,
    fontFamily: BODY,
    outline: "none",
  };

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
          Préférences
        </h1>
      </div>

      <div style={{ padding: "22px 22px 32px" }}>
        <TitreSection>Mes coordonnées</TitreSection>
        <div
          style={{
            background: "rgba(46,26,46,0.5)",
            border: `1px solid ${C.borderM}`,
            borderRadius: 4,
            padding: "14px",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <Champ label="Email">
            <div style={{ fontSize: 12, color: C.muted, padding: "9px 0" }}>{etat.profil.email || "—"}</div>
          </Champ>
          <Champ label="Prénom">
            <input value={prenom} onChange={(e) => setPrenom(e.target.value)} style={champStyle} />
          </Champ>
          <Champ label="Nom">
            <input value={nom} onChange={(e) => setNom(e.target.value)} style={champStyle} />
          </Champ>
          <Champ label="Téléphone">
            <input value={telephone} onChange={(e) => setTelephone(e.target.value)} style={champStyle} />
          </Champ>

          {message && (
            <div style={{ fontSize: 11, color: message.type === "ok" ? "#6ee7a0" : "#f87171" }}>
              {message.texte}
            </div>
          )}

          <button
            onClick={enregistrer}
            disabled={enregistrement}
            style={{
              background: enregistrement ? "rgba(198,161,91,0.2)" : C.gold,
              border: "none",
              borderRadius: 2,
              padding: "10px",
              color: enregistrement ? "rgba(198,161,91,0.5)" : C.night,
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: enregistrement ? "not-allowed" : "pointer",
              fontFamily: BODY,
            }}
          >
            {enregistrement ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span style={{ fontSize: 10, color: "rgba(203,185,185,0.5)", letterSpacing: "0.04em" }}>{label}</span>
      {children}
    </label>
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

function EtatVide({ message }: { message: string }) {
  return (
    <div style={{ padding: "40px 22px", textAlign: "center", color: C.muted, fontFamily: BODY, fontSize: 13 }}>
      {message}
    </div>
  );
}

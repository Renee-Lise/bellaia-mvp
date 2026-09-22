"use client";
// ═══════════════════════════════════════════════════════════
// Réservations & expériences — src/app/bsh/espace/reservations/ReservationsClient.tsx
//
// Lit/écrit reservations_experiences (migration 0001). RLS : la
// cliente voit et crée ses propres réservations, mais ne peut ni les
// modifier ni les annuler elle-même une fois envoyées (pas de policy
// UPDATE/DELETE côté cliente) — c'est la fondatrice qui fait avancer
// le statut, même logique manuelle que Le Cercle/Lounge/Members,
// mais via une vraie demande structurée plutôt qu'un DM WhatsApp.
// Le champ titre peut être pré-rempli depuis /bsh/coffrets (lien
// "Réserver cette expérience" avec ?titre=...).
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";
import { LABEL_STATUT_RESA, COULEUR_STATUT_RESA } from "../reservationsLabels";

interface Reservation {
  id: string;
  titre: string;
  statut: string;
  date_souhaitee: string | null;
  notes: string | null;
  created_at: string;
}

export default function ReservationsClient() {
  const etat = useBshEspace();
  const searchParams = useSearchParams();
  const [reservations, setReservations] = useState<Reservation[] | null>(null);
  const [titre, setTitre] = useState(searchParams.get("titre") || "");
  const [dateSouhaitee, setDateSouhaitee] = useState("");
  const [notes, setNotes] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const res = await espaceFetch(
        token,
        "reservations_experiences?select=id,titre,statut,date_souhaitee,notes,created_at&order=created_at.desc&limit=50"
      );
      if (!actif || !res.ok) return;
      setReservations(await res.json());
    })();

    return () => {
      actif = false;
    };
  }, [etat]);

  const envoyer = async () => {
    if (etat.statut !== "connectee" || !titre.trim() || envoi) return;
    setEnvoi(true);
    setErreur("");
    const res = await espaceFetch(etat.token, "reservations_experiences", {
      method: "POST",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({
        titre: titre.trim(),
        date_souhaitee: dateSouhaitee || null,
        notes: notes.trim() || null,
        univers: "bsh",
      }),
    });
    if (res.ok) {
      const rows = await res.json();
      if (rows[0]) setReservations((p) => [rows[0], ...(p || [])]);
      setTitre("");
      setDateSouhaitee("");
      setNotes("");
    } else {
      setErreur("Votre demande n'a pas pu être envoyée. Réessayez.");
    }
    setEnvoi(false);
  };

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de vos réservations…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour réserver une expérience BSH.
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
          Réservations &amp; expériences
        </h1>
      </div>

      {/* ── Nouvelle demande ── */}
      <div style={{ padding: "22px 22px 0" }}>
        <TitreSection>Faire une demande</TitreSection>
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
          <input
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            placeholder="Quelle expérience souhaitez-vous ? (ex. Coffret Nuit de Velours)"
            style={champStyle}
          />
          <input
            type="date"
            value={dateSouhaitee}
            onChange={(e) => setDateSouhaitee(e.target.value)}
            style={champStyle}
          />
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Précisions (optionnel)"
            rows={2}
            style={{ ...champStyle, resize: "vertical" }}
          />
          {erreur && <div style={{ fontSize: 11, color: "#f87171" }}>{erreur}</div>}
          <button
            onClick={envoyer}
            disabled={!titre.trim() || envoi}
            style={{
              background: titre.trim() && !envoi ? C.gold : "rgba(198,161,91,0.2)",
              border: "none",
              borderRadius: 2,
              padding: "10px",
              color: titre.trim() ? C.night : "rgba(198,161,91,0.5)",
              fontSize: 12,
              fontWeight: 500,
              letterSpacing: "0.04em",
              cursor: titre.trim() && !envoi ? "pointer" : "not-allowed",
              fontFamily: BODY,
            }}
          >
            {envoi ? "Envoi…" : "Envoyer la demande"}
          </button>
          <p style={{ fontSize: 10, color: "rgba(203,185,185,0.4)", margin: 0, fontStyle: "italic" }}>
            Votre demande est transmise à la fondatrice, qui la valide et fait avancer son statut.
          </p>
        </div>
      </div>

      {/* ── Mes demandes ── */}
      <div style={{ padding: "22px 22px 32px" }}>
        <TitreSection>Mes demandes</TitreSection>
        {reservations === null ? (
          <EtatVide message="Chargement…" />
        ) : reservations.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.7 }}>
            Aucune demande pour l&apos;instant.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {reservations.map((r) => (
              <div
                key={r.id}
                style={{
                  background: "rgba(46,26,46,0.5)",
                  border: `1px solid ${C.borderM}`,
                  borderRadius: 4,
                  padding: "12px 13px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, color: C.cream, fontWeight: 500 }}>{r.titre}</span>
                  <span
                    style={{
                      fontSize: 9,
                      color: COULEUR_STATUT_RESA[r.statut] || C.gold,
                      border: `1px solid ${COULEUR_STATUT_RESA[r.statut] || C.gold}55`,
                      borderRadius: 20,
                      padding: "2px 8px",
                      whiteSpace: "nowrap",
                      height: "fit-content",
                    }}
                  >
                    {LABEL_STATUT_RESA[r.statut] || r.statut}
                  </span>
                </div>
                {r.date_souhaitee && (
                  <div style={{ fontSize: 11, color: C.muted }}>
                    Souhaitée le {new Date(r.date_souhaitee).toLocaleDateString("fr-FR")}
                  </div>
                )}
                {r.notes && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{r.notes}</div>}
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

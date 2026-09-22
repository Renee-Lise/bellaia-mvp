"use client";
// ═══════════════════════════════════════════════════════════
// Commandes & suivi — src/app/bsh/espace/commandes/CommandesClient.tsx
//
// Lit stripe_payment_intents (seule table réelle des commandes BSH,
// cf. Étape 4 sous-page 2 — RLS déjà vérifiée : stripe_client_select
// restreint chaque cliente à ses propres lignes), filtrée par
// module=BSH. La frise de statut suit statut_suivi (migration 0002),
// distincte du statut de paiement Stripe brut — sauf si le paiement a
// lui-même échoué/été annulé/remboursé, auquel cas c'est ce qui prime
// sur l'écran plutôt que la frise de préparation.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import Link from "next/link";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";

interface Commande {
  id: string;
  commande_id: string | null;
  description: string | null;
  items_json: { nom?: string; qty?: number }[] | null;
  montant_total_cts: number | null;
  statut: string | null;
  statut_suivi: string | null;
  created_at: string | null;
}

const ETAPES = [
  { label: "Demande reçue", ico: "📩" },
  { label: "Validée", ico: "✓" },
  { label: "Paiement", ico: "💳" },
  { label: "Préparation", ico: "📦" },
  { label: "Expédiée", ico: "🚚" },
  { label: "Terminée", ico: "✦" },
];

const ETAPE_INDEX: Record<string, number> = {
  "Demande reçue": 0,
  "Validation fondatrice": 1,
  Confirmée: 1,
  "Paiement en attente": 2,
  "Acompte reçu": 2,
  "Paiement complet reçu": 2,
  Préparation: 3,
  Expédiée: 4,
  Terminée: 5,
};

const LABEL_PAIEMENT_PROBLEME: Record<string, string> = {
  failed: "Le paiement a échoué.",
  canceled: "Ce paiement a été annulé.",
  refunded: "Cette commande a été remboursée.",
};

export default function CommandesClient() {
  const etat = useBshEspace();
  const [commandes, setCommandes] = useState<Commande[] | null>(null);

  useEffect(() => {
    if (etat.statut !== "connectee") return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const res = await espaceFetch(
        token,
        "stripe_payment_intents?module=eq.BSH&select=id,commande_id,description,items_json,montant_total_cts,statut,statut_suivi,created_at&order=created_at.desc&limit=50"
      );
      if (!actif) return;
      if (res.ok) setCommandes(await res.json());
    })();

    return () => {
      actif = false;
    };
  }, [etat]);

  if (etat.statut === "chargement") {
    return <EtatVide message="Chargement de vos commandes…" />;
  }

  if (etat.statut === "deconnectee") {
    return (
      <div style={{ padding: "60px 22px", textAlign: "center", color: C.cream, fontFamily: BODY }}>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: C.muted, marginBottom: 20 }}>
          Connectez-vous à votre compte Bellaïa pour voir vos commandes BSH.
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
          Commandes &amp; suivi
        </h1>
      </div>

      <div style={{ padding: "18px 22px 32px" }}>
        {commandes === null ? (
          <EtatVide message="Chargement de vos commandes…" />
        ) : commandes.length === 0 ? (
          <EtatVide message="Vous n'avez pas encore de commande chez Bella'Secret Home." />
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {commandes.map((c) => (
              <CommandeCard key={c.id} c={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CommandeCard({ c }: { c: Commande }) {
  const items = Array.isArray(c.items_json) ? c.items_json : [];
  const produit =
    items.length > 0
      ? items.map((i) => `${i.nom || "Article"} ×${i.qty || 1}`).join(", ")
      : c.description || "Commande BSH";
  const montant = ((c.montant_total_cts || 0) / 100).toFixed(2).replace(".", ",");
  const date = c.created_at
    ? new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })
    : "";
  const reference = c.commande_id || c.id.slice(0, 8);
  const annulee = c.statut_suivi === "Annulée";
  const problemePaiement = c.statut ? LABEL_PAIEMENT_PROBLEME[c.statut] : undefined;

  return (
    <div
      style={{
        background: "rgba(46,26,46,0.5)",
        border: `1px solid ${C.borderM}`,
        borderRadius: 4,
        padding: "16px 16px 18px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 10, color: C.gold, letterSpacing: "0.04em" }}>{reference}</span>
        <span style={{ fontSize: 10, color: "rgba(203,185,185,0.5)" }}>{date}</span>
      </div>
      <div style={{ fontSize: 13, color: C.cream, marginBottom: 4 }}>{produit}</div>
      <div style={{ fontFamily: DISPLAY, fontSize: 16, color: C.goldL, marginBottom: 14 }}>{montant} €</div>

      {annulee ? (
        <BandeauEtat couleur="#f87171" texte="Commande annulée." />
      ) : problemePaiement ? (
        <BandeauEtat couleur="#f87171" texte={problemePaiement} />
      ) : (
        <Frise etapeActuelle={ETAPE_INDEX[c.statut_suivi || "Demande reçue"] ?? 0} />
      )}
    </div>
  );
}

function Frise({ etapeActuelle }: { etapeActuelle: number }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start" }}>
      {ETAPES.map((e, i) => {
        const atteinte = i <= etapeActuelle;
        return (
          <div key={e.label} style={{ display: "flex", alignItems: "center", flex: i < ETAPES.length - 1 ? 1 : "none" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 30 }}>
              <div
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 10,
                  background: atteinte ? C.gold : "rgba(255,255,255,0.06)",
                  color: atteinte ? C.night : "rgba(203,185,185,0.4)",
                  border: `1px solid ${atteinte ? C.gold : C.borderM}`,
                }}
              >
                {e.ico}
              </div>
              <div
                style={{
                  fontSize: 8,
                  color: atteinte ? C.goldL : "rgba(203,185,185,0.4)",
                  textAlign: "center",
                  marginTop: 4,
                  lineHeight: 1.2,
                }}
              >
                {e.label}
              </div>
            </div>
            {i < ETAPES.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 1,
                  background: i < etapeActuelle ? C.gold : C.borderM,
                  marginBottom: 16,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BandeauEtat({ couleur, texte }: { couleur: string; texte: string }) {
  return (
    <div
      style={{
        background: `${couleur}18`,
        border: `1px solid ${couleur}55`,
        borderRadius: 4,
        padding: "8px 12px",
        fontSize: 11,
        color: couleur,
      }}
    >
      {texte}
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

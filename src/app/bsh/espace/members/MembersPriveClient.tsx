"use client";
// ═══════════════════════════════════════════════════════════
// Espace privé membre — src/app/bsh/espace/members/MembersPriveClient.tsx
//
// Cahier des charges BSH Members §4. Accessible uniquement à
// member/founding_member connectés — un compte customer/member_pending
// (ou déconnecté) est redirigé vers /bsh/members, sans message
// d'erreur technique (§4 : "sans message d'erreur technique").
// Lit member_benefits (is_active=true, vide au lancement — rien
// inventé) et bsh_members_demandes (ses propres lignes) pour
// l'historique. Le lien WhatsApp passe par la route serveur déjà
// sécurisée (/api/bsh-members/whatsapp-link) — jamais lu ici
// directement.
// ═══════════════════════════════════════════════════════════
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { BSH_PALETTE as C, BSH_FONT_DISPLAY as DISPLAY, BSH_FONT_BODY as BODY } from "../../bshTokens";
import { useBshEspace, espaceFetch } from "../useBshEspace";

interface Avantage {
  id: string;
  title: string;
  description: string | null;
  valid_until: string | null;
}

interface Demande {
  id: string;
  demande_le: string;
  decision: string;
  decision_le: string | null;
}

const LABEL_DECISION: Record<string, string> = {
  en_attente: "En cours d'examen",
  acceptee: "Acceptée",
  refusee: "Non retenue",
};

export default function MembersPriveClient() {
  const etat = useBshEspace();
  const router = useRouter();
  const [avantages, setAvantages] = useState<Avantage[] | null>(null);
  const [historique, setHistorique] = useState<Demande[] | null>(null);
  const [lienEnCours, setLienEnCours] = useState(false);

  const statut = etat.statut === "connectee" ? etat.profil.membership_status : null;
  const estMembre = statut === "member" || statut === "founding_member";

  useEffect(() => {
    if (etat.statut === "connectee" && !estMembre) {
      router.replace("/bsh/members");
    } else if (etat.statut === "deconnectee") {
      router.replace("/bsh/members");
    }
  }, [etat.statut, estMembre, router]);

  useEffect(() => {
    if (etat.statut !== "connectee" || !estMembre) return;
    const { token } = etat;
    let actif = true;

    (async () => {
      const [rAv, rHist] = await Promise.all([
        espaceFetch(token, "member_benefits?is_active=eq.true&select=id,title,description,valid_until&order=created_at.desc"),
        espaceFetch(token, "bsh_members_demandes?select=id,demande_le,decision,decision_le&order=demande_le.desc"),
      ]);
      if (!actif) return;
      if (rAv.ok) setAvantages(await rAv.json());
      if (rHist.ok) setHistorique(await rHist.json());
    })();

    return () => {
      actif = false;
    };
  }, [etat, estMembre]);

  const ouvrirCommunaute = async () => {
    if (etat.statut !== "connectee" || lienEnCours) return;
    setLienEnCours(true);
    try {
      const r = await fetch("/api/bsh-members/whatsapp-link", {
        headers: { Authorization: `Bearer ${etat.token}` },
      });
      const d = await r.json();
      if (d.link) window.open(d.link, "_blank");
      else alert(d.error || "Accès non autorisé.");
    } catch {
      alert("Impossible de récupérer le lien. Réessayez.");
    }
    setLienEnCours(false);
  };

  // Chargement, redirection en cours, ou statut non-membre : rien
  // d'affiché — jamais de message d'erreur technique (cahier §4).
  if (etat.statut !== "connectee" || !estMembre) {
    return <div style={{ minHeight: "40vh" }} />;
  }

  const { profil } = etat;
  const estFondateur = statut === "founding_member";

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
          textAlign: "center",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
          <Image src="/bsh-members-logo.png" alt="BSH Members" width={72} height={72} style={{ borderRadius: "50%" }} priority />
        </div>
        <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 20, margin: "0 0 6px", color: C.cream }}>
          Espace BSH Members
        </h1>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 10,
            color: C.gold,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <span>{estFondateur ? "💎" : "✦"}</span>
          <span>{estFondateur ? "Membre Fondateur" : "Membre"}</span>
        </div>
        {profil.prenom && (
          <p style={{ fontSize: 12, color: C.muted, marginTop: 10 }}>Bienvenue, {profil.prenom}.</p>
        )}
      </div>

      {/* ── Avantages actifs ── */}
      <div style={{ padding: "22px 22px 0" }}>
        <TitreSection>Avantages actifs</TitreSection>
        {avantages === null ? (
          <p style={{ fontSize: 12, color: C.muted }}>Chargement…</p>
        ) : avantages.length === 0 ? (
          <div
            style={{
              background: "rgba(46,26,46,0.5)",
              border: `1px solid ${C.borderM}`,
              borderRadius: 4,
              padding: "18px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 22, marginBottom: 8 }}>✦</div>
            <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6 }}>
              Des avantages arrivent bientôt. La fondatrice les activera
              progressivement.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {avantages.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "rgba(46,26,46,0.5)",
                  border: `1px solid ${C.borderM}`,
                  borderRadius: 4,
                  padding: "12px 13px",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: C.cream, marginBottom: 4 }}>{a.title}</div>
                {a.description && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{a.description}</div>}
                {a.valid_until && (
                  <div style={{ fontSize: 10, color: C.gold, marginTop: 6 }}>
                    Jusqu&apos;au {new Date(a.valid_until).toLocaleDateString("fr-FR")}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Nouveautés / événements / découvertes réservés — à venir ── */}
      <div style={{ padding: "22px 22px 0" }}>
        <TitreSection>Nouveautés &amp; découvertes réservées</TitreSection>
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
          Avant-premières, événements réservés et tests membres
          apparaîtront ici au fur et à mesure de leur activation.
        </div>
      </div>

      {/* ── Communauté WhatsApp ── */}
      <div style={{ padding: "22px 22px 0" }}>
        <TitreSection>Communauté</TitreSection>
        <div
          style={{
            background: "rgba(37,211,102,0.05)",
            border: "1px solid rgba(37,211,102,0.15)",
            borderRadius: 4,
            padding: "14px",
          }}
        >
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.6, marginBottom: 12 }}>
            Rejoignez le groupe privé des membres BSH pour les échanges,
            les avant-premières et les discussions.
          </div>
          <button
            onClick={ouvrirCommunaute}
            disabled={lienEnCours}
            style={{
              width: "100%",
              background: "rgba(37,211,102,0.1)",
              border: "1px solid rgba(37,211,102,0.25)",
              borderRadius: 2,
              padding: "10px 16px",
              color: "#25d366",
              fontSize: 12,
              fontWeight: 500,
              cursor: lienEnCours ? "default" : "pointer",
              fontFamily: BODY,
            }}
          >
            {lienEnCours ? "…" : "Accéder à la communauté BSH Members"}
          </button>
        </div>
      </div>

      {/* ── Historique ── */}
      {historique && historique.length > 0 && (
        <div style={{ padding: "22px 22px 32px" }}>
          <TitreSection>Historique</TitreSection>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {historique.map((h) => (
              <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted }}>
                <span>
                  Demande du {new Date(h.demande_le).toLocaleDateString("fr-FR")}
                </span>
                <span style={{ color: C.gold }}>{LABEL_DECISION[h.decision] || h.decision}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {(!historique || historique.length === 0) && <div style={{ paddingBottom: 32 }} />}
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

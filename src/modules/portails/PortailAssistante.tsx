"use client";
// ═══════════════════════════════════════════════════════════
// Portail assistante — espace de travail (prévisualisation).
// • N'affiche QUE les outils correspondant aux permissions accordées
//   par la fondatrice (mes_acces) : aucune permission n'est créée,
//   demandée ou élargie depuis cet écran.
// • Missions : uniquement celles assignées à la personne connectée
//   (filtre assigne_a + règle d'accès en base).
// • Aucun coût, marge, e-mail de membre ni donnée fondatrice affichés
//   sans la permission correspondante (contrôlé aussi côté serveur).
// Lecture seule : les actions ouvrent les outils existants (onOuvrir).
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect } from "../events/eventsAtelierLib";
import { mesAcces, aPerm, type Acces } from "../equipe/equipeLib";
import { MARQUES } from "../../design/marques";
import { Surface, Titre, Indicateur, Puce, LogoMarque, BandeauInfo } from "../../design/composants";
import { monIdentifiant } from "./portailsLib";

// Outils : [clé d'ouverture, libellé, icône, permission requise (null = toujours), univers]
const OUTILS: [string, string, string, string | null, string][] = [
  ["missions", "Mes missions", "✓", null, "*"],
  ["agenda", "Mon agenda", "🗓", null, "*"],
  ["messagerie", "Messages", "💬", null, "*"],
  ["notifications", "Notifications", "🔔", null, "*"],
  ["equipe_gerer", "Attribuer des missions", "👥", "missions.gerer", "*"],
  ["food_catalogue", "Plats et recettes", "🍽", "food.consulter", "FOOD"],
  ["food_commande", "Prendre une commande", "🧾", "food.commandes", "FOOD"],
  ["food_recette", "Proposer une fiche recette", "✍︎", "food.recettes.proposer", "FOOD"],
  ["bibliotheque", "Bibliothèque Bella'Food", "📚", "bibliotheque.gerer", "FOOD"],
  ["revente", "Collection de revente", "🛍", "food.revente.gerer", "FOOD"],
  ["paiement_lien", "Lien de paiement", "💳", "paiements.creer_lien", "*"],
  ["assistant_ia", "Assistant Bellaïa (IA)", "✦", "ia.utiliser", "*"],
  ["alertes", "Alertes de commandes", "🔔", "notifications.commandes", "*"],
];
const STATUTS: Record<string, [string, "neutre" | "ok" | "alerte" | "accent"]> = {
  a_faire: ["À faire", "neutre"], en_cours: ["En cours", "accent"], a_valider: ["À valider", "alerte"], fait: ["Validée", "ok"], annule: ["Annulée", "neutre"],
};
const dateFr = (d?: string | null) => d ? new Date(d.length <= 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) : "Sans échéance";
const duree = (min: number) => min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}` : `${min} min`;

export default function PortailAssistante({ prenom, onOuvrir, onDeconnexion }: { prenom?: string; onOuvrir?: (cle: string) => void; onDeconnexion?: () => void }) {
  const m = MARQUES.STUDIO;
  const [acces, setAcces] = useState<Acces | null>(null);
  const [missions, setMissions] = useState<any[] | null>(null);
  const [nom, setNom] = useState(prenom || "");
  useEffect(() => { (async () => {
    const [a, id] = await Promise.all([mesAcces(), monIdentifiant()]);
    setAcces(a);
    if (!id) { setMissions([]); return; }
    const [l, p] = await Promise.all([
      sbSelect<any>("bellaia_missions", `assigne_a=eq.${id}&select=id,titre,pole,univers,type,statut,priorite,echeance,date_prevue,heure,temps_passe_min,updated_at&order=updated_at.desc&limit=200`).catch(() => []),
      prenom ? Promise.resolve([]) : sbSelect<any>("profiles", `id=eq.${id}&select=prenom`).catch(() => []),
    ]);
    setMissions(l); if (!prenom && p[0]?.prenom) setNom(p[0].prenom);
  })(); }, []);

  const outils = useMemo(() => OUTILS.filter(([, , , p, u]) => !p || aPerm(acces, p, u)), [acces]);
  const st = useMemo(() => {
    const l = missions || []; const debutMois = new Date(); debutMois.setDate(1); debutMois.setHours(0, 0, 0, 0);
    const ouvertes = l.filter(x => ["a_faire", "en_cours"].includes(x.statut)).sort((a, b) => (a.priorite || 2) - (b.priorite || 2) || String(a.echeance || a.date_prevue || "9").localeCompare(String(b.echeance || b.date_prevue || "9")));
    const faitesMois = l.filter(x => x.statut === "fait" && new Date(x.updated_at) >= debutMois);
    return {
      ouvertes, aValider: l.filter(x => x.statut === "a_valider"), faitesMois,
      historique: l.filter(x => ["fait", "annule"].includes(x.statut)).slice(0, 5),
      tempsMois: l.filter(x => new Date(x.updated_at) >= debutMois).reduce((s, x) => s + (Number(x.temps_passe_min) || 0), 0),
      urgentes: ouvertes.filter(x => x.priorite === 1).length,
    };
  }, [missions]);

  if (!missions) return <div style={{ background: m.fond, minHeight: "100vh", color: m.doux, padding: 30, fontFamily: m.sans }}>Préparation de votre espace…</div>;
  const heure = new Date().getHours(); const salut = heure < 12 ? "Bonjour" : heure < 18 ? "Bel après-midi" : "Bonsoir";
  const ligneMission = (x: any) => { const [l, ton] = STATUTS[x.statut] || [x.statut, "neutre"]; return (
    <div key={x.id} onClick={() => onOuvrir?.("missions")} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer" }}>
      <div style={{ width: 6, alignSelf: "stretch", borderRadius: 9, background: x.priorite === 1 ? "#c0703a" : m.secondaire }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 650, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{x.titre || "Mission"}</div>
        <div style={{ fontSize: 12, color: m.doux, marginTop: 2 }}>{dateFr(x.echeance || x.date_prevue)}{x.heure ? ` · ${String(x.heure).slice(0, 5)}` : ""} · {x.univers || x.pole}</div>
      </div>
      <Puce m={m} ton={ton}>{l}</Puce>
    </div>); };

  return (
    <div style={{ background: m.fond, minHeight: "100vh", color: m.texte, fontFamily: m.sans, paddingBottom: 40 }}>
      <BandeauInfo m={m} messages={[`${st.ouvertes.length} mission${st.ouvertes.length > 1 ? "s" : ""} en cours`, st.aValider.length ? `${st.aValider.length} en attente de validation par la fondatrice` : "Aucune mission en attente de validation", "Vos accès sont définis par la fondatrice"]} />
      <div style={{ background: m.degrade, color: "#fff", padding: "22px 16px 26px", borderRadius: "0 0 26px 26px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMarque m={m} taille={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: "#e9d6a8", fontWeight: 700 }}>Espace assistante</div>
            <div style={{ fontFamily: m.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>{salut}{nom ? `, ${nom}` : ""}</div>
          </div>
          {onDeconnexion && <button onClick={onDeconnexion} aria-label="Se déconnecter" style={{ alignSelf: "flex-start", minHeight: 36, padding: "6px 12px", borderRadius: 999, border: "1px solid rgba(255,255,255,0.35)", background: "rgba(0,0,0,0.18)", color: "#fff", fontSize: 12, fontWeight: 700, fontFamily: m.sans }}>Quitter</button>}
        </div>
        <div style={{ marginTop: 14, fontSize: 13.5, opacity: 0.88, lineHeight: 1.4 }}>
          {st.urgentes ? `${st.urgentes} mission${st.urgentes > 1 ? "s" : ""} urgente${st.urgentes > 1 ? "s" : ""} à traiter en priorité.` : st.ouvertes.length ? "Vos missions du moment sont prêtes ci-dessous." : "Aucune mission ouverte pour l'instant."}
        </div>
      </div>

      <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Indicateur m={m} libelle="À traiter" valeur={String(st.ouvertes.length)} detail={st.urgentes ? `${st.urgentes} urgente(s)` : "Aucune urgence"} tendance={st.urgentes ? "bas" : null} onClick={() => onOuvrir?.("missions")} />
          <Indicateur m={m} libelle="À valider" valeur={String(st.aValider.length)} detail="Par la fondatrice" />
          <Indicateur m={m} libelle="Validées ce mois" valeur={String(st.faitesMois.length)} />
          <Indicateur m={m} libelle="Temps déclaré ce mois" valeur={duree(st.tempsMois)} />
        </div>

        <Surface m={m}>
          <Titre m={m} sur="Priorités" niveau={3}>Prochaines missions</Titre>
          {st.ouvertes.length ? st.ouvertes.slice(0, 6).map(ligneMission) : <div style={{ color: m.doux, fontSize: 13.5 }}>Rien à faire pour le moment. Les nouvelles missions apparaissent ici dès leur attribution.</div>}
        </Surface>

        <div>
          <Titre m={m} sur="Vos outils" niveau={3}>Accès autorisés</Titre>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {outils.map(([cle, l, ic]) => <Surface key={cle} m={m} onClick={() => onOuvrir?.(cle)} style={{ padding: 14, minHeight: 84, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div style={{ width: 34, height: 34, borderRadius: 12, display: "grid", placeItems: "center", background: m.surface2, color: m.principale, fontSize: 17 }}>{ic}</div>
              <div style={{ fontWeight: 650, fontSize: 13.5, lineHeight: 1.25 }}>{l}</div>
            </Surface>)}
          </div>
          <div style={{ fontSize: 12, color: m.doux, marginTop: 10, lineHeight: 1.45 }}>
            Seuls les outils autorisés par la fondatrice sont affichés. Pour un nouvel accès, adressez-lui votre demande : aucune permission n'est ajoutée automatiquement.
          </div>
        </div>

        {!!st.aValider.length && <Surface m={m}>
          <Titre m={m} sur="En attente" niveau={3}>Transmises à la fondatrice</Titre>
          {st.aValider.slice(0, 5).map(ligneMission)}
        </Surface>}

        <Surface m={m}>
          <Titre m={m} sur="Historique" niveau={3}>Dernières missions terminées</Titre>
          {st.historique.length ? st.historique.map(ligneMission) : <div style={{ color: m.doux, fontSize: 13.5 }}>Votre historique s'affichera ici.</div>}
        </Surface>
      </div>
    </div>
  );
}

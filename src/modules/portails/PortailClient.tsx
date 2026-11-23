"use client";
// ═══════════════════════════════════════════════════════════
// Portail cliente — « Ma maison Bellaïa » (prévisualisation).
// • Commandes : uniquement celles de la personne connectée
//   (règle d'accès en base : created_by = elle-même).
// • Dossiers Bella'Even's : RPC client_mes_dossiers_events (sans les
//   notes internes de la fondatrice).
// • Univers : uniquement ceux qui ont déjà un espace client. Les espaces
//   adultes (Bella'Secret Home) n'apparaissent JAMAIS pour une mineure ;
//   l'entrée dans BSH garde ses contrôles existants (confirmation de
//   majorité, adhésion validée par la fondatrice), sans changement.
// • Favoris : ceux enregistrés sur cet appareil (synchronisation entre
//   appareils = phase 3, table dédiée à valider).
// • Fidélité, abonnements, parrainage : affichés « bientôt », aucun
//   avantage ni tarif annoncé tant qu'ils ne sont pas validés.
// Lecture seule : rien n'est modifié depuis cet écran.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect, sbRpc } from "../events/eventsAtelierLib";
import { MARQUES, marqueDe } from "../../design/marques";
import { Surface, Titre, Puce, LogoMarque, Carrousel, Bouton, type Banniere } from "../../design/composants";
import { monIdentifiant, favorisLocaux } from "./portailsLib";
import { chargerAgenda, type ElementAgenda } from "../calendrier/CalendrierPremium";

const euros = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const dateFr = (d?: string | null) => d ? new Date(d.length <= 10 ? d + "T12:00:00" : d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "";
const age = (d?: string | null) => { if (!d) return null; const n = new Date(d), a = new Date(); let x = a.getFullYear() - n.getFullYear(); if (a < new Date(a.getFullYear(), n.getMonth(), n.getDate())) x--; return x; };
const STATUT_CMD: Record<string, [string, "neutre" | "ok" | "alerte" | "accent"]> = {
  brouillon: ["Enregistrée", "neutre"], nouvelle: ["Reçue", "accent"], en_attente: ["En attente", "alerte"], confirmee: ["Confirmée", "ok"], en_preparation: ["En préparation", "accent"], prete: ["Prête", "ok"], livree: ["Remise", "ok"], terminee: ["Terminée", "ok"], annulee: ["Annulée", "neutre"],
};
// Univers proposés : uniquement ceux qui disposent déjà d'un espace client dans l'application (aucun univers annoncé sans écran réel).
const UNIVERS_CLIENT = ["BSH", "ODYSSEE", "EVENTS", "FOOD", "VILO", "EDITIONS", "MOTIPY"];
const ACCROCHES: Record<string, string> = {
  STUDIO: "Créations et papeterie", BSH: "Espace privé, adultes uniquement", ODYSSEE: "Beauté et bien-être", EVENTS: "Vos événements sur mesure", FOOD: "Cuisine gastronomique",
  VILO: "Assistance et services", EDITIONS: "Livres et histoires", MOTIPY: "Univers jeunesse", VILDOR: "Pâtisserie artisanale (partenaire)",
};

export default function PortailClient({ onOuvrir, ouverts, onDeconnexion }: { onOuvrir?: (cle: string) => void; ouverts?: string[]; onDeconnexion?: () => void }) {
  const m = { ...MARQUES.STUDIO, nom: "Bellaïa", logo: MARQUES.GENERAL.logo };
  const [d, setD] = useState<any>(null);
  const [favs, setFavs] = useState<Record<string, string[]>>({});
  useEffect(() => { setFavs(favorisLocaux()); (async () => {
    const id = await monIdentifiant();
    if (!id) { setD({ horsSession: true }); return; }
    const [p, cmd, dossiers, unites] = await Promise.all([
      sbSelect<any>("profiles", `id=eq.${id}&select=prenom,role,membership_status,age_verifi,date_naissance`).catch(() => []),
      sbSelect<any>("bellaia_commandes", `created_by=eq.${id}&select=id,reference,bu,statut,total,date_commande,date_livraison,created_at&order=created_at.desc&limit=30`).catch(() => []),
      sbRpc<any[]>("client_mes_dossiers_events", {}).catch(() => []),
      sbSelect<any>("business_units", "select=code,nom,couleur,statut,ordre&order=ordre.asc").catch(() => []),
    ]);
    setD({ id, p: p[0] || {}, cmd, dossiers: Array.isArray(dossiers) ? dossiers : [], unites });
  })(); }, []);

  const a = age(d?.p?.date_naissance);
  const mineure = a != null && a < 18;
  const bshOuvert = !mineure && ["member", "founding_member"].includes(d?.p?.membership_status);
  // Espaces adultes : jamais visibles pour une mineure. Âge inconnu : l'espace existant applique
  // ses propres contrôles (confirmation de majorité à l'entrée de Bella'Secret Home), inchangés.
  const univers = useMemo(() => (d?.unites || []).filter((u: any) => UNIVERS_CLIENT.includes(u.code) && u.statut !== "archive")
    .filter((u: any) => !(mineure && marqueDe(u.code).adulte)), [d, mineure]);
  const enCours = (d?.cmd || []).filter((c: any) => !/annul|termin|livr/i.test(c.statut || ""));
  const nbFavs = Object.values(favs).reduce((s, l) => s + l.length, 0);
  const bannieres: Banniere[] = useMemo(() => !d || d.horsSession ? [] : [
    enCours.length ? { id: "c", type: "promo", statut: "publiee", titre: `${enCours.length} commande${enCours.length > 1 ? "s" : ""} en cours`, texte: "Suivez leur avancement en temps réel", cta: "Voir", destination: "commandes" } : null,
    d.dossiers.length ? { id: "e", type: "promo", statut: "publiee", titre: "Votre événement", texte: "Retrouvez votre devis et votre dossier Bella'Even's", cta: "Ouvrir", destination: "events" } : null,
    { id: "u", type: "promo", statut: "publiee", titre: "La maison Bellaïa", texte: "Découvrez nos univers et leurs boutiques", cta: "Explorer", destination: "univers" },
  ].filter(Boolean) as Banniere[], [d]);

  if (!d) return <div style={{ background: m.fond, minHeight: "100vh", color: m.doux, padding: 30, fontFamily: m.sans }}>Ouverture de votre espace…</div>;
  if (d.horsSession) return <div style={{ background: m.fond, minHeight: "100vh", color: m.texte, padding: 30, fontFamily: m.sans }}>
    <LogoMarque m={m} taille={56} /><Titre m={m} sur="Mon espace">Connectez-vous pour retrouver vos commandes</Titre>
    <div style={{ color: m.doux, fontSize: 14 }}>Votre espace personnel n'est visible qu'une fois connectée.</div></div>;
  const carteUnivers = (u: any) => { const mq = marqueDe(u.code, u); const verrou = false; const bientot = ouverts ? !ouverts.includes(u.code) : u.statut === "en développement"; return (
    <div key={u.code} onClick={() => !verrou && !bientot && onOuvrir?.(`univers:${u.code}`)} style={{ position: "relative", borderRadius: mq.rayon, overflow: "hidden", background: mq.degrade, color: "#fff", minHeight: 118, padding: 12, display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: verrou || bientot ? "default" : "pointer", boxShadow: m.ombre }}>
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 35%, rgba(0,0,0,0.42) 100%)" }} />
      <div style={{ position: "relative" }}><LogoMarque m={mq} taille={30} /></div>
      <div style={{ position: "relative", textShadow: "0 1px 2px rgba(0,0,0,0.35)" }}>
        <div style={{ fontFamily: mq.serif, fontSize: 18, fontWeight: 600, lineHeight: 1.1 }}>{mq.nom}</div>
        <div style={{ fontSize: 11.5, opacity: 0.92, marginTop: 2 }}>{bientot ? "Bientôt disponible" : u.code === "BSH" && !bshOuvert ? (d.p.membership_status === "member_pending" ? "Adhésion en cours d'examen" : "Réservé aux adultes") : ACCROCHES[u.code] || ""}</div>
      </div>
    </div>); };
  const heure = new Date().getHours(); const salut = heure < 12 ? "Bonjour" : heure < 18 ? "Bel après-midi" : "Bonsoir";

  return (
    <div style={{ background: m.fond, minHeight: "100vh", color: m.texte, fontFamily: m.sans, paddingBottom: 40 }}>
      <div style={{ padding: "18px 16px 8px", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMarque m={m} taille={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: m.accent, fontWeight: 700 }}>Ma maison Bellaïa</div>
          <div style={{ fontFamily: m.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>{salut}{d.p.prenom ? `, ${d.p.prenom}` : ""}</div>
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Carrousel m={m} bannieres={bannieres} hauteur={190} onAller={b => b.destination === "univers" ? document.getElementById("pc-univers")?.scrollIntoView({ behavior: "smooth", block: "start" }) : onOuvrir?.(b.destination || "")} />

        <Surface m={m}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <Titre m={m} sur="Suivi" niveau={3}>Mes commandes</Titre>
            {d.cmd.length > 4 && <Bouton m={m} variante="discret" onClick={() => onOuvrir?.("commandes")}>Tout voir</Bouton>}
          </div>
          {d.cmd.length ? d.cmd.slice(0, 4).map((c: any) => { const [l, ton] = STATUT_CMD[String(c.statut || "").toLowerCase()] || [c.statut || "—", "neutre"]; const mq = marqueDe(c.bu || "GENERAL"); return (
            <div key={c.id} onClick={() => onOuvrir?.("commandes")} style={{ display: "flex", gap: 10, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer" }}>
              <LogoMarque m={mq} taille={34} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 650, fontSize: 14 }}>{mq.nom}</div>
                <div style={{ fontSize: 12, color: m.doux }}>{c.reference} · {dateFr(c.date_commande || c.created_at)}{c.date_livraison ? ` · remise le ${dateFr(c.date_livraison)}` : ""}</div>
              </div>
              <div style={{ textAlign: "right" }}><div style={{ fontWeight: 700, fontSize: 14 }}>{euros(c.total)}</div><Puce m={m} ton={ton}>{l}</Puce></div>
            </div>); })
            : <div style={{ color: m.doux, fontSize: 13.5 }}>Aucune commande pour l'instant.</div>}
        </Surface>

        <ResumeAgenda m={m} userId={d.id} onVoir={() => onOuvrir?.("agenda")} />

        {!!d.dossiers.length && <Surface m={m}>
          <Titre m={m} sur="Bella'Even's" niveau={3}>Mes événements</Titre>
          {d.dossiers.slice(0, 3).map((x: any) => (
            <div key={x.id} onClick={() => onOuvrir?.("events")} style={{ padding: "10px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer" }}>
              <div style={{ fontWeight: 650, fontSize: 14 }}>{x.type_evenement || x.prestation || "Événement"}{x.date_souhaitee ? ` · ${dateFr(x.date_souhaitee)}` : ""}</div>
              <div style={{ fontSize: 12, color: m.doux, marginTop: 2 }}>{x.reference} · {x.devis_accepte_at ? "Devis accepté" : x.devis_envoye_at ? "Devis à consulter" : "Demande reçue"}{x.statut_paiement ? ` · ${x.statut_paiement}` : ""}</div>
            </div>))}
        </Surface>}

        {[["Nos univers", "Boutiques et services", univers.filter((u: any) => !marqueDe(u.code).adulte && !marqueDe(u.code).jeunesse)],
          ["Famille", "Jeunesse et famille", univers.filter((u: any) => marqueDe(u.code).jeunesse)],
          ["Espace privé", "Réservé aux adultes", univers.filter((u: any) => marqueDe(u.code).adulte)]].filter(([, , l]) => (l as any[]).length).map(([sur, titre, l]) => (
          <div key={sur as string} id={sur === "Nos univers" ? "pc-univers" : undefined} style={{ scrollMarginTop: 12 }}>
            <Titre m={m} sur={sur as string} niveau={3}>{titre}</Titre>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{(l as any[]).map(carteUnivers)}</div>
          </div>))}

        <Surface m={m}>
          <Titre m={m} sur="Mes envies" niveau={3}>Favoris</Titre>
          {nbFavs ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{Object.entries(favs).filter(([k]) => !(mineure && marqueDe(k).adulte)).map(([k, l]) => <Puce key={k} m={m} ton="accent">{marqueDe(k).nom} · {l.length}</Puce>)}</div>
            : <div style={{ color: m.doux, fontSize: 13.5 }}>Touchez le cœur d'un article dans une boutique pour le retrouver ici.</div>}
          <div style={{ fontSize: 11.5, color: m.doux, marginTop: 8 }}>Favoris enregistrés sur cet appareil.</div>
        </Surface>

        <Surface m={m} style={{ background: m.surface2 }}>
          <Titre m={m} sur="Bientôt" niveau={3}>Fidélité, abonnements et parrainage</Titre>
          <div style={{ color: m.doux, fontSize: 13.5, lineHeight: 1.45 }}>Ces avantages sont en préparation. Ils apparaîtront ici dès leur ouverture officielle.</div>
        </Surface>

        <Surface m={m}>
          <Titre m={m} sur="Mon compte" niveau={3}>Préférences</Titre>
          {[["profil", "Mes informations"], ["notifications", "Notifications"], ["confidentialite", "Confidentialité et mes données"], ["aide", "Aide et contact"]].map(([k, l]) =>
            <div key={k} onClick={() => onOuvrir?.(k)} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 14.5, cursor: "pointer" }}><span>{l}</span><span style={{ color: m.doux }}>›</span></div>)}
          {onDeconnexion && <div onClick={onDeconnexion} style={{ padding: "12px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 14.5, cursor: "pointer", color: "#b4523f" }}>Se déconnecter</div>}
        </Surface>
      </div>
    </div>
  );
}

// Accueil : résumé compact de l'agenda (l'agenda complet est une rubrique indépendante « Mon agenda »).
function ResumeAgenda({ m, userId, onVoir }: { m: any; userId: string; onVoir: () => void }) {
  const [prochains, setProchains] = useState<ElementAgenda[] | null>(null);
  useEffect(() => { chargerAgenda("cliente", { userId }).then(l => { const maintenant = Date.now(); setProchains(l.filter(e => e.debut.getTime() >= maintenant - 3600e3).sort((a, b) => a.debut.getTime() - b.debut.getTime()).slice(0, 3)); }).catch(() => setProchains([])); }, [userId]);
  const quand = (d: Date) => d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" }) + (d.getHours() || d.getMinutes() ? " · " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "");
  return <Surface m={m}>
    <Titre m={m} sur="À venir" niveau={3}>Mon agenda</Titre>
    {prochains === null ? <div style={{ color: m.doux, fontSize: 13.5 }}>Chargement…</div>
      : prochains.length === 0 ? <div style={{ color: m.doux, fontSize: 13.5 }}>Aucun rendez-vous, livraison ou prestation à venir.</div>
      : prochains.map(e => <div key={e.id} style={{ padding: "9px 0", borderTop: `1px solid ${m.ligne}` }}><div style={{ fontWeight: 650, fontSize: 14 }}>{e.titre}</div><div style={{ fontSize: 12.5, color: m.doux }}>{quand(e.debut)}</div></div>)}
    <div style={{ marginTop: 10 }}><Bouton m={m} variante="discret" onClick={onVoir}>Voir mon agenda</Bouton></div>
  </Surface>;
}

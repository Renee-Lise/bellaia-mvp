"use client";
// ═══════════════════════════════════════════════════════════
// Portail fondatrice — centre de direction (prévisualisation).
// Accueil personnalisé, indicateurs réels (CA, encaissements, en attente,
// commandes, clientes, stocks critiques), Actions requises, agenda,
// univers en cartes illustrées, raccourcis personnalisables.
// Lecture seule : les outils existants restent accessibles tels quels
// (onOuvrir(section)). Aucune donnée n'est modifiée ici.
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useMemo, useState } from "react";
import { sbSelect } from "../events/eventsAtelierLib";
import { MARQUES, marqueDe } from "../../design/marques";
import { Surface, Titre, Indicateur, Puce, LogoMarque, Carrousel, BandeauInfo, type Banniere } from "../../design/composants";

const euros = (n: number) => (Number(n) || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const RACCOURCIS_DEFAUT: [string, string, string][] = [["commandes", "Commandes", "🧾"], ["administratif", "Administration", "📄"], ["food", "Bella'Food", "🍽"], ["bsh", "Secret Home", "🗝"], ["events", "Even's", "🎀"], ["actions", "Actions requises", "✓"], ["equipe", "Équipe", "👥"], ["agenda", "Agenda", "🗓"]];

export default function PortailFondatrice({ prenom = "Renée-Lise", onOuvrir }: { prenom?: string; onOuvrir?: (cle: string) => void }) {
  const m = MARQUES.GENERAL;
  const [d, setD] = useState<any>(null);
  const [raccourcis, setRaccourcis] = useState<string[]>(RACCOURCIS_DEFAUT.slice(0, 6).map(r => r[0]));
  const [edition, setEdition] = useState(false);
  useEffect(() => { try { const r = JSON.parse(localStorage.getItem("bellaia_raccourcis") || "null"); if (Array.isArray(r)) setRaccourcis(r); } catch {} }, []);
  useEffect(() => { (async () => {
    const g = (t: string, q: string) => sbSelect<any>(t, q).catch(() => []);
    const debutMois = new Date(); debutMois.setDate(1);
    const [fin, crm, cmd, stocks, actions, agenda, unites] = await Promise.all([
      g("v_dashboard_finances", "select=*"), g("v_dashboard_crm", "select=*"),
      g("bellaia_commandes", `select=id,bu,total,statut,created_at&created_at=gte.${debutMois.toISOString().slice(0, 10)}&order=created_at.desc&limit=500`),
      g("v_stocks_critiques", "select=id,nom,univers,quantite,quantite_min&limit=50"),
      g("bellaia_actions", "statut=eq.a_faire&select=id,cle,titre,univers,priorite,date_limite&order=priorite.asc,date_limite.asc.nullslast&limit=50"),
      g("v_calendar_upcoming", "select=id,titre,date_debut,pole,countdown_label&limit=6"),
      g("business_units", "select=code,nom,couleur,statut,ordre&order=ordre.asc"),
    ]);
    setD({ fin: fin[0] || {}, crm: crm[0] || {}, cmd, stocks, actions, agenda, unites });
  })(); }, []);
  const sauver = (l: string[]) => { setRaccourcis(l); try { localStorage.setItem("bellaia_raccourcis", JSON.stringify(l)); } catch {} };
  const heure = new Date().getHours(); const salut = heure < 12 ? "Bonjour" : heure < 18 ? "Bel après-midi" : "Bonsoir";
  const urgentes = useMemo(() => (d?.actions || []).filter((a: any) => a.priorite === 1), [d]);
  const bannieres: Banniere[] = useMemo(() => !d ? [] : [
    urgentes.length ? { id: "a", type: "promo", statut: "publiee", titre: `${urgentes.length} décision${urgentes.length > 1 ? "s" : ""} prioritaire${urgentes.length > 1 ? "s" : ""}`, texte: urgentes[0]?.titre, cta: "Voir les actions", destination: "actions" } : null,
    { id: "b", type: "promo", statut: "publiee", titre: "Vos univers", texte: `${(d.unites || []).filter((u: any) => u.statut !== "archive").length} marques dans la maison Bellaïa`, cta: "Explorer", destination: "univers" },
  ].filter(Boolean) as Banniere[], [d, urgentes]);
  if (!d) return <div style={{ background: m.fond, minHeight: "100vh", color: m.doux, padding: 30, fontFamily: m.sans }}>Préparation de votre centre de direction…</div>;
  const caMois = d.cmd.filter((c: any) => !/annul/i.test(c.statut || "")).reduce((s: number, c: any) => s + (Number(c.total) || 0), 0);

  return (
    <div style={{ background: m.degrade, backgroundColor: m.fond, minHeight: "100vh", color: m.texte, fontFamily: m.sans, paddingBottom: 40 }}>
      <BandeauInfo m={m} messages={[`${d.actions.length} actions requises`, `${d.stocks.length} stocks sous le seuil`, `${d.cmd.length} commandes ce mois-ci`]} />
      <div style={{ padding: "18px 16px 6px", display: "flex", alignItems: "center", gap: 12 }}>
        <LogoMarque m={m} taille={44} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, letterSpacing: 2.6, textTransform: "uppercase", color: m.accent, fontWeight: 700 }}>Centre de direction</div>
          <div style={{ fontFamily: m.serif, fontSize: 28, fontWeight: 600, lineHeight: 1.05 }}>{salut}, {prenom}</div>
        </div>
      </div>
      <div style={{ padding: "8px 16px", display: "flex", flexDirection: "column", gap: 14 }}>
        <Carrousel m={m} bannieres={bannieres} hauteur={200} onAller={b => onOuvrir?.(b.destination || "")} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Indicateur m={m} libelle="Facturé ce mois" valeur={euros(d.fin.ca_facture_mois)} detail={`Encaissé ${euros(d.fin.encaisse_mois)}`} />
          <Indicateur m={m} libelle="En attente de paiement" valeur={euros(d.fin.total_en_attente)} detail={d.fin.nb_factures_retard ? `${d.fin.nb_factures_retard} facture(s) en retard` : "Aucun retard"} tendance={d.fin.nb_factures_retard ? "bas" : null} />
          <Indicateur m={m} libelle="Commandes du mois" valeur={String(d.cmd.length)} detail={`${euros(caMois)} commandés`} onClick={() => onOuvrir?.("commandes")} />
          <Indicateur m={m} libelle="Clientes actives" valeur={String(d.crm.nb_clientes_actives ?? 0)} detail={`${d.crm.nb_prospects ?? 0} prospects`} />
        </div>

        <Surface m={m} style={{ background: m.surface2 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><Titre m={m} niveau={3} sur="À décider">Actions requises</Titre><button onClick={() => onOuvrir?.("actions")} style={{ background: "none", border: "none", color: m.accent, fontWeight: 700, fontSize: 13 }}>Tout voir ({d.actions.length})</button></div>
          {d.actions.slice(0, 4).map((a: any) => <div key={a.id} onClick={() => onOuvrir?.("actions")} style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "10px 0", borderTop: `1px solid ${m.ligne}`, cursor: "pointer" }}>
            <span style={{ width: 8, height: 8, borderRadius: 9, marginTop: 6, flex: "none", background: a.priorite === 1 ? m.secondaire : m.accent }} />
            <div style={{ flex: 1 }}><div style={{ fontSize: 14, lineHeight: 1.35 }}>{a.titre}</div><div style={{ fontSize: 11.5, color: m.doux, marginTop: 2 }}>{marqueDe(a.univers).nom}{a.date_limite ? ` · avant le ${new Date(a.date_limite).toLocaleDateString("fr-FR")}` : ""}</div></div>
          </div>)}
        </Surface>

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}><Titre m={m} niveau={3} sur="Accès rapide">Mes raccourcis</Titre><button onClick={() => setEdition(e => !e)} style={{ background: "none", border: "none", color: m.accent, fontWeight: 700, fontSize: 13 }}>{edition ? "Terminer" : "Personnaliser"}</button></div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
            {(edition ? RACCOURCIS_DEFAUT : RACCOURCIS_DEFAUT.filter(r => raccourcis.includes(r[0]))).map(([k, l, i]) => { const actif = raccourcis.includes(k); return (
              <button key={k} onClick={() => edition ? sauver(actif ? raccourcis.filter(x => x !== k) : [...raccourcis, k]) : onOuvrir?.(k)} style={{ background: m.surface, border: `1px solid ${edition && actif ? m.accent : m.ligne}`, borderRadius: m.rayon, padding: "14px 6px", color: m.texte, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, fontFamily: m.sans, opacity: edition && !actif ? 0.5 : 1, boxShadow: m.ombre }}>
                <span style={{ width: 38, height: 38, borderRadius: 99, display: "grid", placeItems: "center", background: `${m.accent}22`, color: m.accent, fontSize: 17 }}>{i}</span><span style={{ fontSize: 12, fontWeight: 600 }}>{l}</span></button>); })}
          </div>
        </div>

        <div>
          <Titre m={m} niveau={3} sur="La maison Bellaïa">Mes univers</Titre>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {(d.unites || []).filter((u: any) => u.code !== "GENERAL").map((u: any) => { const mu = marqueDe(u.code, u); return (
              <button key={u.code} onClick={() => onOuvrir?.("univers:" + u.code)} style={{ position: "relative", overflow: "hidden", border: "none", borderRadius: m.rayon, padding: 0, minHeight: 112, background: mu.degrade, textAlign: "left", cursor: "pointer", boxShadow: m.ombre }}>
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.45))" }} />
                <div style={{ position: "absolute", top: 10, left: 10 }}><LogoMarque m={mu} taille={34} /></div>
                {mu.jeunesse && <div style={{ position: "absolute", top: 12, right: 10 }}><Puce m={m}>Jeunesse</Puce></div>}
                {mu.independant && <div style={{ position: "absolute", top: 12, right: 10 }}><Puce m={m}>Indépendant</Puce></div>}
                <div style={{ position: "absolute", bottom: 10, left: 12, right: 10, color: "#fff", fontFamily: m.serif, fontSize: 17, fontWeight: 600, lineHeight: 1.1 }}>{mu.nom}</div>
              </button>); })}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          <Surface m={m}><Titre m={m} niveau={3} sur="Stocks">Sous le seuil d'alerte</Titre>
            {d.stocks.length ? d.stocks.slice(0, 5).map((s: any) => <div key={s.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 13.5 }}><span>{s.nom}</span><span style={{ color: m.secondaire }}>{s.quantite} / {s.quantite_min}</span></div>) : <div style={{ fontSize: 13, color: m.doux }}>Aucun stock critique.</div>}</Surface>
          <Surface m={m}><Titre m={m} niveau={3} sur="Agenda">Prochaines échéances</Titre>
            {d.agenda.length ? d.agenda.map((e: any) => <div key={e.id} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderTop: `1px solid ${m.ligne}`, fontSize: 13.5 }}><span>{e.titre}</span><span style={{ color: m.doux }}>{e.countdown_label || new Date(e.date_debut).toLocaleDateString("fr-FR")}</span></div>) : <div style={{ fontSize: 13, color: m.doux }}>Rien de prévu prochainement.</div>}</Surface>
        </div>
      </div>
    </div>
  );
}

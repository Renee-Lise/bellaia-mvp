"use client";
// Boutique numérique Bellaïa : catalogue, fiche produit, aperçu, panier, paiement (Stripe), produits gratuits,
// « Mes achats et documents » (téléchargements). Aucun passage par WhatsApp. Les contenus adultes n'apparaissent pas ici.
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { couleurs, espace, police, prixFr, rayon, taille } from "@/design/tokens";
import { Badge, Bouton, EtatVide, Message, Section } from "@/design/base";
import { Icone } from "@/design/Icone";
import { getBellaiaToken } from "@/lib/bellaiaSession";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const CLE_PANIER = "bellaia-panier";
const POLES: Record<string, string> = { EDITIONS: "Bella’Studio Éditions", ODYSSEE: "Bella’Odyssée", MOTIPY: "Mo Ti-Péyi", VILO: "Vilo’Assistance", EVENTS: "Bella’Events", STRUCTURE: "Bella’Structure", INVEST: "BellaInvest", FOOD: "Bella’Food", VILDOR: "Vil’Dor Pâtisse" };

export interface Produit { id: string; reference: string | null; nom: string; business_unit: string | null; description_courte: string | null; description_longue: string | null; prix: number | null; prix_promotion: number | null; galerie_photos: string[] | null; apercu_chemin: string | null; format_fichier: string | null; nb_pages: number | null; licence: string | null; public_age: string | null; version_fichier: string | null; }
interface Achat { id: string; produit_id: string; accorde_le: string; prix_paye_cts: number; version_achetee: string | null; catalogue_produits: { nom: string; reference: string | null; format_fichier: string | null; business_unit: string | null } | null; }

const cts = (p: Produit) => { const b = Number(p.prix ?? -1); const pr = Number(p.prix_promotion ?? 0); if (b < 0) return -1; return Math.round(((pr > 0 && pr < b) ? pr : b) * 100); };
const apercuUrl = (chemin: string) => `${SB_URL}/storage/v1/object/public/boutique-apercus/${chemin.split("/").map(encodeURIComponent).join("/")}`;
async function jeton(): Promise<string | null> { try { return await getBellaiaToken(); } catch { return null; } }
function lirePanier(): string[] { try { const v = JSON.parse(localStorage.getItem(CLE_PANIER) || "[]"); return Array.isArray(v) ? v.filter((x: unknown) => typeof x === "string") : []; } catch { return []; } }

type Vue = { nom: "catalogue" } | { nom: "fiche"; id: string } | { nom: "panier" } | { nom: "achats" };

export default function BoutiqueClient() {
  const [vue, setVue] = useState<Vue>({ nom: "catalogue" });
  const [produits, setProduits] = useState<Produit[] | null>(null);
  const [etat, setEtat] = useState<"chargement" | "ouverte" | "fermee">("chargement");
  const [panier, setPanier] = useState<string[]>([]);
  const [achats, setAchats] = useState<Achat[] | null>(null);
  const [connecte, setConnecte] = useState<boolean | null>(null);
  const [message, setMessage] = useState<{ ton: "info" | "succes" | "alerte"; texte: string } | null>(null);
  const [enCours, setEnCours] = useState<string | null>(null);
  const [pole, setPole] = useState<string>("");

  useEffect(() => { setPanier(lirePanier()); }, []);
  useEffect(() => { try { localStorage.setItem(CLE_PANIER, JSON.stringify(panier)); } catch { /* navigation privée */ } }, [panier]);

  const charger = useCallback(async () => {
    try {
      const r = await fetch(`${SB_URL}/rest/v1/catalogue_produits?select=id,reference,nom,business_unit,description_courte,description_longue,prix,prix_promotion,galerie_photos,apercu_chemin,format_fichier,nb_pages,licence,public_age,version_fichier&type_produit=eq.numerique&statut=eq.publie&visible_client=eq.true&disponible=eq.true&public_age=neq.adulte&order=ordre.asc.nullslast,nom.asc`, { headers: { apikey: SB_KEY }, cache: "no-store" });
      if (!r.ok) { setEtat("fermee"); setProduits([]); return; }
      setProduits(await r.json()); setEtat("ouverte");
    } catch { setEtat("fermee"); setProduits([]); }
  }, []);

  const chargerAchats = useCallback(async (): Promise<Achat[]> => {
    const t = await jeton(); setConnecte(!!t);
    if (!t) { setAchats([]); return []; }
    try {
      const r = await fetch(`${SB_URL}/rest/v1/boutique_droits?select=id,produit_id,accorde_le,prix_paye_cts,version_achetee,catalogue_produits(nom,reference,format_fichier,business_unit)&revoque_le=is.null&order=accorde_le.desc`, { headers: { apikey: SB_KEY, Authorization: `Bearer ${t}` }, cache: "no-store" });
      const a: Achat[] = r.ok ? await r.json() : []; setAchats(a); return a;
    } catch { setAchats([]); return []; }
  }, []);

  useEffect(() => { charger(); chargerAchats(); }, [charger, chargerAchats]);

  // Retour de paiement : la confirmation vient du serveur (webhook Stripe), jamais de cette page.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const retour = q.get("achat");
    if (retour === "annule") { setMessage({ ton: "info", texte: "Paiement annulé : aucun montant n'a été prélevé. Votre panier est conservé." }); return; }
    if (retour !== "confirme") return;
    setVue({ nom: "achats" }); setPanier([]);
    setMessage({ ton: "info", texte: "Paiement reçu par notre prestataire : votre achat apparaît ici dès sa confirmation (quelques secondes)." });
    let n = 0; const avant = (achats || []).length;
    const id = window.setInterval(async () => {
      n += 1; const a = await chargerAchats();
      if (a.length > avant) { window.clearInterval(id); setMessage({ ton: "succes", texte: "Achat confirmé. Votre document est prêt à télécharger." }); }
      else if (n >= 12) { window.clearInterval(id); setMessage({ ton: "info", texte: "La confirmation prend plus de temps que prévu. Votre achat apparaîtra ici automatiquement ; vous recevrez aussi votre facture." }); }
    }, 3000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const possedes = useMemo(() => new Set((achats || []).map(a => a.produit_id)), [achats]);
  const liste = useMemo(() => (produits || []).filter(p => !pole || p.business_unit === pole), [produits, pole]);
  const polesPresents = useMemo(() => Array.from(new Set((produits || []).map(p => p.business_unit).filter(Boolean))) as string[], [produits]);
  const lignes = panier.map(id => (produits || []).find(p => p.id === id)).filter(Boolean) as Produit[];
  const total = lignes.reduce((s, p) => s + Math.max(0, cts(p)), 0);

  const ajouter = (p: Produit) => { if (!panier.includes(p.id)) setPanier([...panier, p.id]); setMessage({ ton: "succes", texte: `« ${p.nom} » est dans votre panier.` }); };
  const retirer = (id: string) => setPanier(panier.filter(x => x !== id));

  async function payer() {
    setMessage(null); const t = await jeton();
    if (!t) { setMessage({ ton: "alerte", texte: "Connectez-vous à Bellaïa pour acheter : vos documents seront rangés dans votre bibliothèque personnelle." }); return; }
    setEnCours("payer");
    try {
      const r = await fetch("/api/boutique/commander", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ produits: lignes.filter(p => cts(p) > 0).map(p => p.id) }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) { window.location.href = d.url; return; }
      setMessage({ ton: "alerte", texte: d.error || "Le paiement n'a pas pu démarrer. Réessayez dans un instant." });
    } catch { setMessage({ ton: "alerte", texte: "Connexion impossible. Vérifiez votre réseau puis réessayez." }); }
    setEnCours(null);
  }

  async function obtenirGratuit(p: Produit) {
    setMessage(null); const t = await jeton();
    if (!t) { setMessage({ ton: "alerte", texte: "Connectez-vous à Bellaïa pour recevoir ce document gratuit dans votre bibliothèque." }); return; }
    setEnCours(p.id);
    try {
      const r = await fetch("/api/boutique/obtenir", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${t}` }, body: JSON.stringify({ produit: p.id }) });
      const d = await r.json().catch(() => ({}));
      if (r.ok) { await chargerAchats(); setMessage({ ton: "succes", texte: `« ${p.nom} » a été ajouté à « Mes achats et documents ».` }); }
      else setMessage({ ton: "alerte", texte: d.error || "Ce document n'a pas pu être ajouté." });
    } catch { setMessage({ ton: "alerte", texte: "Connexion impossible. Vérifiez votre réseau puis réessayez." }); }
    setEnCours(null);
  }

  async function telecharger(produitId: string) {
    setMessage(null); const t = await jeton(); if (!t) { setMessage({ ton: "alerte", texte: "Votre session a expiré : reconnectez-vous." }); return; }
    setEnCours(produitId);
    try {
      const r = await fetch(`/api/boutique/telecharger?produit=${encodeURIComponent(produitId)}`, { headers: { Authorization: `Bearer ${t}` } });
      const d = await r.json().catch(() => ({}));
      if (r.ok && d.url) window.location.href = d.url; else setMessage({ ton: "alerte", texte: d.error || "Téléchargement impossible pour le moment." });
    } catch { setMessage({ ton: "alerte", texte: "Connexion impossible. Vérifiez votre réseau puis réessayez." }); }
    setEnCours(null);
  }

  const produitVue = vue.nom === "fiche" ? (produits || []).find(p => p.id === vue.id) : undefined;

  return (
    <div style={{ minHeight: "100dvh", background: couleurs.ivoire, color: couleurs.nuit, fontFamily: police.texte }}>
      <header style={{ position: "sticky", top: 0, zIndex: 5, background: "rgba(250,247,241,.94)", backdropFilter: "blur(10px)", borderBottom: `1px solid ${couleurs.trait}`, paddingTop: "env(safe-area-inset-top)" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: `${espace[3]}px ${espace[4]}px`, display: "flex", alignItems: "center", gap: espace[3] }}>
          {vue.nom !== "catalogue" ? <button aria-label="Retour au catalogue" onClick={() => { setVue({ nom: "catalogue" }); setMessage(null); }} style={{ background: "none", border: 0, padding: 10, margin: -10, color: couleurs.nuit, cursor: "pointer" }}><Icone nom="retour" /></button> : null}
          <a href="/" style={{ fontFamily: police.titre, fontSize: taille.xl, color: couleurs.nuit, textDecoration: "none" }}>Bellaïa</a>
          <span style={{ color: couleurs.texte2, fontSize: taille.s }}>Boutique</span>
          <nav style={{ marginLeft: "auto", display: "flex", gap: espace[1] }} aria-label="Boutique">
            <button data-test="onglet-achats" onClick={() => { setVue({ nom: "achats" }); setMessage(null); chargerAchats(); }} style={lienNav(vue.nom === "achats")}><Icone nom="livre" taille={18} /><span>Mes achats</span></button>
            <button data-test="onglet-panier" onClick={() => { setVue({ nom: "panier" }); setMessage(null); }} style={lienNav(vue.nom === "panier")} aria-label={`Panier, ${panier.length} article(s)`}><Icone nom="panier" taille={18} /><span>{panier.length || ""}</span></button>
          </nav>
        </div>
      </header>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: `${espace[4]}px ${espace[4]}px calc(${espace[7]}px + env(safe-area-inset-bottom))` }}>
        {message ? <Message ton={message.ton}>{message.texte}</Message> : null}

        {vue.nom === "catalogue" && (
          etat === "chargement" ? <p role="status" style={{ color: couleurs.texte2 }}>Chargement du catalogue…</p>
          : etat === "fermee" || !liste.length && !pole ? <EtatVide titre="La boutique ouvre bientôt" texte="Nos guides, cahiers et créations numériques seront ici, à acheter et télécharger directement dans Bellaïa." />
          : <>
              <h1 style={{ fontFamily: police.titre, fontWeight: 500, fontSize: taille.xxl, margin: `${espace[4]}px 0 ${espace[2]}px` }}>Créations numériques</h1>
              <p style={{ margin: `0 0 ${espace[4]}px`, color: couleurs.texte2, fontSize: taille.s }}>Téléchargement immédiat après paiement. Retrouvez vos achats à tout moment dans « Mes achats ».</p>
              {polesPresents.length > 1 ? <div role="tablist" aria-label="Filtrer par univers" style={{ display: "flex", gap: espace[2], overflowX: "auto", paddingBottom: espace[2], marginBottom: espace[3] }}>
                {["", ...polesPresents].map(c => <button key={c || "tous"} role="tab" aria-selected={pole === c} onClick={() => setPole(c)} style={puce(pole === c)}>{c ? POLES[c] || c : "Tout"}</button>)}
              </div> : null}
              <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                {liste.map(p => (
                  <li key={p.id} style={{ borderTop: `1px solid ${couleurs.trait}` }}>
                    <button data-test="produit" onClick={() => setVue({ nom: "fiche", id: p.id })} style={{ all: "unset", cursor: "pointer", display: "grid", gridTemplateColumns: "64px 1fr auto", gap: espace[4], alignItems: "center", width: "100%", padding: `${espace[4]}px 0` }}>
                      <Vignette p={p} />
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontFamily: police.titre, fontSize: taille.l, lineHeight: 1.25 }}>{p.nom}</span>
                        <span style={{ display: "block", color: couleurs.texte2, fontSize: taille.s, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{[POLES[p.business_unit || ""] || p.business_unit, p.format_fichier, p.nb_pages ? `${p.nb_pages} pages` : null].filter(Boolean).join(" · ")}</span>
                      </span>
                      <span style={{ fontWeight: 600, fontSize: taille.s, whiteSpace: "nowrap" }}>{possedes.has(p.id) ? <Badge>Acheté</Badge> : cts(p) >= 0 ? prixFr(cts(p)) : ""}</span>
                    </button>
                  </li>))}
              </ul>
            </>
        )}

        {vue.nom === "fiche" && (produitVue ? <article>
          <div style={{ display: "grid", gap: espace[5], gridTemplateColumns: "minmax(0,1fr)", marginTop: espace[3] }}>
            <Vignette p={produitVue} grande />
            <div>
              <p style={{ margin: 0, color: couleurs.texte2, fontSize: taille.xs, letterSpacing: ".12em", textTransform: "uppercase" }}>{POLES[produitVue.business_unit || ""] || produitVue.business_unit}{produitVue.reference ? ` · ${produitVue.reference}` : ""}</p>
              <h1 style={{ fontFamily: police.titre, fontWeight: 500, fontSize: taille.xxl, margin: `${espace[2]}px 0` }}>{produitVue.nom}</h1>
              <p style={{ fontSize: taille.xl, margin: `0 0 ${espace[4]}px` }}>{cts(produitVue) >= 0 ? prixFr(cts(produitVue)) : ""}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: espace[3] }}>
                {possedes.has(produitVue.id) ? <Bouton icone="telecharger" enCours={enCours === produitVue.id} onClick={() => telecharger(produitVue.id)}>Télécharger</Bouton>
                  : cts(produitVue) === 0 ? <Bouton icone="telecharger" enCours={enCours === produitVue.id} onClick={() => obtenirGratuit(produitVue)}>Obtenir gratuitement</Bouton>
                  : <Bouton icone="panier" data-test="ajouter" onClick={() => ajouter(produitVue)} disabled={panier.includes(produitVue.id)}>{panier.includes(produitVue.id) ? "Dans le panier" : "Ajouter au panier"}</Bouton>}
                {produitVue.apercu_chemin ? <Bouton variante="secondaire" icone="oeil" onClick={() => window.open(apercuUrl(produitVue.apercu_chemin as string), "_blank", "noopener")}>Aperçu gratuit</Bouton> : null}
              </div>
            </div>
          </div>
          {produitVue.description_longue || produitVue.description_courte ? <Section titre="Description"><p style={{ margin: 0, lineHeight: 1.65, whiteSpace: "pre-line" }}>{produitVue.description_longue || produitVue.description_courte}</p></Section> : null}
          <Section titre="Détails">
            <dl style={{ display: "grid", gridTemplateColumns: "max-content 1fr", gap: `${espace[2]}px ${espace[5]}px`, margin: 0, fontSize: taille.s }}>
              {[["Format", produitVue.format_fichier], ["Pages", produitVue.nb_pages], ["Version", produitVue.version_fichier], ["Public", produitVue.public_age === "jeunesse" ? "Jeunesse" : "Tout public"], ["Livraison", "Téléchargement dans « Mes achats », sans limite de durée"], ["Utilisation", produitVue.licence || "Usage personnel ; reproduction et revente interdites"]].filter(([, v]) => v !== null && v !== undefined && v !== "").map(([k, v]) => <React.Fragment key={String(k)}><dt style={{ color: couleurs.texte2 }}>{k}</dt><dd style={{ margin: 0 }}>{String(v)}</dd></React.Fragment>)}
            </dl>
          </Section>
          <Section titre="Droit de rétractation"><p style={{ margin: 0, fontSize: taille.s, lineHeight: 1.6, color: couleurs.texte2 }}>Pour un contenu numérique fourni immédiatement, vous acceptez, au moment du paiement, que le téléchargement commence avant la fin du délai de rétractation, et vous renoncez à ce droit (article L221-28 du Code de la consommation). Un document défectueux est remplacé ou remboursé.</p></Section>
        </article> : <EtatVide titre="Produit introuvable" texte="Ce produit n'est plus proposé." action={<Bouton variante="secondaire" onClick={() => setVue({ nom: "catalogue" })}>Retour au catalogue</Bouton>} />)}

        {vue.nom === "panier" && (lignes.length ? <>
          <h1 style={{ fontFamily: police.titre, fontWeight: 500, fontSize: taille.xxl, margin: `${espace[4]}px 0` }}>Votre panier</h1>
          <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
            {lignes.map(p => <li key={p.id} style={{ display: "flex", alignItems: "center", gap: espace[3], padding: `${espace[3]}px 0`, borderTop: `1px solid ${couleurs.trait}` }}>
              <span style={{ flex: 1, minWidth: 0 }}>{p.nom}</span><span style={{ fontWeight: 600 }}>{prixFr(Math.max(0, cts(p)))}</span>
              <button aria-label={`Retirer ${p.nom}`} onClick={() => retirer(p.id)} style={{ background: "none", border: 0, padding: 10, color: couleurs.texte2, cursor: "pointer" }}><Icone nom="fermer" taille={18} /></button>
            </li>)}
          </ul>
          <div style={{ display: "flex", justifyContent: "space-between", padding: `${espace[4]}px 0`, borderTop: `1px solid ${couleurs.nuit}`, fontSize: taille.l }}><span>Total TTC</span><strong data-test="total">{prixFr(total)}</strong></div>
          <p style={{ fontSize: taille.xs, color: couleurs.texte2, lineHeight: 1.55 }}>Paiement sécurisé par Stripe. Votre facture et vos documents sont disponibles dans « Mes achats » dès la confirmation du paiement.</p>
          <Bouton data-test="payer" icone="verrou" enCours={enCours === "payer"} onClick={payer} style={{ width: "100%" }}>Payer {prixFr(total)}</Bouton>
        </> : <EtatVide icone="panier" titre="Votre panier est vide" action={<Bouton variante="secondaire" onClick={() => setVue({ nom: "catalogue" })}>Voir le catalogue</Bouton>} />)}

        {vue.nom === "achats" && (<>
          <h1 style={{ fontFamily: police.titre, fontWeight: 500, fontSize: taille.xxl, margin: `${espace[4]}px 0` }}>Mes achats et documents</h1>
          {connecte === false ? <EtatVide icone="verrou" titre="Connectez-vous" texte="Vos achats sont rangés dans votre espace personnel Bellaïa." action={<a href="/" style={{ color: couleurs.nuit }}>Se connecter</a>} />
          : achats === null ? <p role="status" style={{ color: couleurs.texte2 }}>Chargement…</p>
          : achats.length === 0 ? <EtatVide titre="Aucun document pour l'instant" texte="Vos achats et documents gratuits apparaîtront ici, prêts à télécharger sur tous vos appareils." />
          : <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {achats.map(a => <li key={a.id} data-test="achat" style={{ display: "flex", alignItems: "center", gap: espace[3], padding: `${espace[4]}px 0`, borderTop: `1px solid ${couleurs.trait}` }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: "block", fontFamily: police.titre, fontSize: taille.l }}>{a.catalogue_produits?.nom || "Document"}</span>
                  <span style={{ display: "block", fontSize: taille.xs, color: couleurs.texte2 }}>{[new Date(a.accorde_le).toLocaleDateString("fr-FR"), a.catalogue_produits?.format_fichier, a.version_achetee ? `version ${a.version_achetee}` : null, prixFr(a.prix_paye_cts)].filter(Boolean).join(" · ")}</span>
                </span>
                <Bouton variante="secondaire" icone="telecharger" enCours={enCours === a.produit_id} onClick={() => telecharger(a.produit_id)} aria-label={`Télécharger ${a.catalogue_produits?.nom || "le document"}`}>Télécharger</Bouton>
              </li>)}
            </ul>}
          <Section titre="Besoin d'aide ?"><p style={{ margin: 0, fontSize: taille.s, color: couleurs.texte2, lineHeight: 1.6 }}>Un fichier ne s'ouvre pas ou un achat n'apparaît pas ? Écrivez-nous depuis la messagerie de votre espace Bellaïa en indiquant le nom du document : nous vous répondons et remplaçons tout fichier défectueux.</p></Section>
        </>)}
      </main>
    </div>
  );
}

function Vignette({ p, grande }: { p: Produit; grande?: boolean }) {
  const img = p.galerie_photos?.[0];
  const d = grande ? { width: "100%", maxWidth: 360, aspectRatio: "3 / 4" } : { width: 64, height: 84 };
  return img ? <img src={img} alt="" style={{ ...d, objectFit: "cover", borderRadius: rayon.s, background: couleurs.rosePoudre }} />
    : <span aria-hidden style={{ ...d, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: rayon.s, background: couleurs.rosePoudre, color: couleurs.prune }}><Icone nom="livre" taille={grande ? 40 : 22} /></span>;
}
const lienNav = (actif: boolean): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 44, padding: "0 12px", border: 0, borderRadius: 999, background: actif ? couleurs.rosePoudre : "transparent", color: couleurs.nuit, fontSize: 14, fontWeight: 600, cursor: "pointer" });
const puce = (actif: boolean): React.CSSProperties => ({ flex: "0 0 auto", minHeight: 36, padding: "0 14px", borderRadius: 999, border: `1px solid ${actif ? couleurs.nuit : couleurs.trait}`, background: actif ? couleurs.nuit : "transparent", color: actif ? couleurs.ivoire : couleurs.nuit, fontSize: 13, cursor: "pointer" });

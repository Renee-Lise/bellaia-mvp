// ═══════════════════════════════════════════════════════════
// BSH Experiences — espace fondatrice
// Tableau de bord, événements (catégories + workflow publication),
// lieux, budget, check-lists, préinscriptions, invitations, messages
// modèles, playlists Diamond B / La Louve.
// src/modules/bshExperiences/BshExperiencesF.tsx
// ═══════════════════════════════════════════════════════════
import React, { useEffect, useState } from "react";
import {
  getEvenementsBSH, creerEvenementBSH, majEvenementBSH,
  getLieuxBSH, creerLieuBSH, majLieuBSH, supprimerLieuBSH,
  getBudgetLignesBSH, creerBudgetLigneBSH, supprimerBudgetLigneBSH,
  getChecklistBSH, creerChecklistItemBSH, majChecklistItemBSH, supprimerChecklistItemBSH,
  getPreinscriptionsBSH, majStatutPreinscriptionBSH,
  getInvitationsBSH, creerInvitationBSH, pointerInvitationBSH, annulerInvitationBSH,
  getMessagesModelesBSH, creerMessageModeleBSH, majMessageModeleBSH, supprimerMessageModeleBSH,
  getPlaylistsBSH, creerPlaylistBSH, supprimerPlaylistBSH,
  getHotesBSH,
} from "./bshExperiencesApi";
import type {
  EvenementBSH, LieuBSH, BudgetLigneBSH, ChecklistItemBSH,
  PreinscriptionBSH, InvitationBSH, MessageModeleBSH, PlaylistBSH, CategorieEvenement,
} from "./bshExperiencesApi";

// Palette BSH (bshTokens.ts) + fuchsia ajouté — aucune teinte fuchsia
// n'existait dans la palette BSH d'origine, celle-ci est une
// proposition à valider avec Renée-Lise, pas une valeur officielle.
const C = {
  night: "#0b0709", plum: "#2e1a2e", plumD: "#17101a",
  gold: "#c6a15b", goldL: "#e0c17e", cream: "#f1e7e2", muted: "#cbb9b9",
  rose: "#e3b9bd", fuchsia: "#d9499f",
  card: "rgba(255,255,255,0.04)", line: "rgba(198,161,91,0.18)",
};
const SA = "'Inter',system-ui,sans-serif";
const FS = "'Cormorant Garamond',Georgia,serif";

const CATEGORIES: { id: CategorieEvenement; l: string; ico: string }[] = [
  { id: "boudoir_session", l: "Boudoir Session", ico: "🕯" },
  { id: "wolf_night", l: "Wolf Night — Diamond B", ico: "🐺" },
  { id: "secret_wolf_ball", l: "Secret Wolf Ball", ico: "🎭" },
  { id: "private_experience", l: "Private Experience", ico: "🔑" },
];

const inp: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)", border: `1px solid ${C.line}`, borderRadius: 8,
  padding: "8px 10px", color: C.cream, fontSize: 12, fontFamily: SA, outline: "none", width: "100%", boxSizing: "border-box",
};
const btnP: React.CSSProperties = {
  background: `linear-gradient(135deg,${C.gold},${C.goldL})`, border: "none", borderRadius: 9,
  padding: "9px 14px", color: C.plumD, fontWeight: 700, fontSize: 12, cursor: "pointer", fontFamily: SA,
};
const btnS: React.CSSProperties = {
  background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "6px 12px",
  color: C.muted, cursor: "pointer", fontSize: 11, fontFamily: SA,
};
const card: React.CSSProperties = { background: C.card, border: `1px solid ${C.line}`, borderRadius: 12, padding: "12px 14px" };

const ONGLETS = [
  { id: "dash", l: "📊 Tableau de bord" },
  { id: "evts", l: "✨ Événements" },
  { id: "lieux", l: "📍 Lieux" },
  { id: "budget", l: "💰 Budget" },
  { id: "check", l: "✅ Check-lists" },
  { id: "preins", l: "📝 Préinscriptions" },
  { id: "invit", l: "🎟 Invitations" },
  { id: "msg", l: "💬 Messages" },
  { id: "music", l: "🎵 Diamond B" },
] as const;
type Onglet = typeof ONGLETS[number]["id"];

export default function BshExperiencesF() {
  const [onglet, setOnglet] = useState<Onglet>("dash");
  const [evenements, setEvenements] = useState<EvenementBSH[]>([]);
  const [lieux, setLieux] = useState<LieuBSH[]>([]);
  const [budget, setBudget] = useState<BudgetLigneBSH[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItemBSH[]>([]);
  const [preins, setPreins] = useState<PreinscriptionBSH[]>([]);
  const [invitations, setInvitations] = useState<InvitationBSH[]>([]);
  const [messages, setMessages] = useState<MessageModeleBSH[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistBSH[]>([]);
  const [chargement, setChargement] = useState(true);

  const charger = async () => {
    setChargement(true);
    const [e, l, b, c, p, i, m, pl] = await Promise.all([
      getEvenementsBSH(), getLieuxBSH(), getBudgetLignesBSH(), getChecklistBSH(),
      getPreinscriptionsBSH(), getInvitationsBSH(), getMessagesModelesBSH(), getPlaylistsBSH(),
    ]);
    setEvenements(e); setLieux(l); setBudget(b); setChecklist(c);
    setPreins(p); setInvitations(i); setMessages(m); setPlaylists(pl);
    setChargement(false);
  };
  useEffect(() => { charger(); }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: SA, color: C.cream }}>
      <div style={{ fontFamily: FS, fontSize: 20, fontWeight: 700, color: C.goldL, letterSpacing: 1 }}>
        BSH Secret Circle & Experiences
      </div>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1 }}>PLAISIR · ÉLÉGANCE · INTIMITÉ</div>

      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 2 }}>
        {ONGLETS.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id)}
            style={{ flexShrink: 0, padding: "6px 11px", borderRadius: 99, border: "none", cursor: "pointer",
              fontSize: 10, fontWeight: 700, fontFamily: SA,
              background: onglet === o.id ? C.gold : "rgba(255,255,255,0.06)",
              color: onglet === o.id ? C.plumD : C.muted }}>
            {o.l}
          </button>
        ))}
      </div>

      {chargement ? (
        <div style={{ textAlign: "center", padding: 30, color: C.muted, fontSize: 12 }}>Chargement…</div>
      ) : (
        <>
          {onglet === "dash" && <Dashboard evenements={evenements} lieux={lieux} budget={budget} checklist={checklist} preins={preins} />}
          {onglet === "evts" && <Evenements evenements={evenements} recharger={charger} />}
          {onglet === "lieux" && <Lieux lieux={lieux} recharger={charger} />}
          {onglet === "budget" && <Budget budget={budget} evenements={evenements} recharger={charger} />}
          {onglet === "check" && <Checklist checklist={checklist} recharger={charger} />}
          {onglet === "preins" && <Preinscriptions preins={preins} evenements={evenements} recharger={charger} />}
          {onglet === "invit" && <Invitations invitations={invitations} evenements={evenements} recharger={charger} />}
          {onglet === "msg" && <Messages messages={messages} recharger={charger} />}
          {onglet === "music" && <DiamondB playlists={playlists} evenements={evenements} recharger={charger} />}
        </>
      )}
    </div>
  );
}

// ── Dashboard ───────────────────────────────────────────────
function Dashboard({ evenements, lieux, budget, checklist, preins }: {
  evenements: EvenementBSH[]; lieux: LieuBSH[]; budget: BudgetLigneBSH[]; checklist: ChecklistItemBSH[]; preins: PreinscriptionBSH[];
}) {
  const publies = evenements.filter(e => e.publie).length;
  const brouillons = evenements.filter(e => !e.publie).length;
  const lieuxContactes = lieux.filter(l => l.statut !== "a_contacter").length;
  const preinsConfirmees = preins.filter(p => p.statut === "confirme").length;
  const totalPrevu = budget.reduce((s, b) => s + b.montantPrevu, 0);
  const totalEngage = budget.reduce((s, b) => s + b.montantEngage, 0);
  const tachesRestantes = checklist.filter(c => !c.fait).length;
  const villes = ["Saint-Laurent-du-Maroni", "Kourou", "Cayenne"];
  const preinsParVille = villes.map(v => ({ ville: v, n: preins.filter(p => p.villePreferee === v).length }));
  const maxVille = Math.max(1, ...preinsParVille.map(v => v.n));

  const Stat = ({ l, v, col }: { l: string; v: string | number; col?: string }) => (
    <div style={{ ...card, flex: "1 1 130px" }}>
      <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1, marginBottom: 4 }}>{l.toUpperCase()}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: col || C.cream }}>{v}</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Stat l="Première édition" v="En préparation" />
        <Stat l="Capacité pilote" v="5 à 6 personnes" />
        <Stat l="Durée" v="2 h 30" />
        <Stat l="Événements publiés" v={publies} col={C.goldL} />
        <Stat l="Brouillons" v={brouillons} />
        <Stat l="Lieux contactés" v={`${lieuxContactes} / ${lieux.length}`} />
        <Stat l="Préinscriptions confirmées" v={preinsConfirmees} col={C.fuchsia} />
        <Stat l="Tâches restantes" v={tachesRestantes} col={tachesRestantes > 0 ? "#f87171" : C.goldL} />
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>BUDGET — PRÉVU VS ENGAGÉ</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span>Prévu : <strong style={{ color: C.goldL }}>{totalPrevu.toFixed(2)}€</strong></span>
          <span>Engagé : <strong style={{ color: C.fuchsia }}>{totalEngage.toFixed(2)}€</strong></span>
        </div>
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 8, overflow: "hidden" }}>
          <div style={{ width: `${totalPrevu > 0 ? Math.min(100, (totalEngage / totalPrevu) * 100) : 0}%`, height: "100%", background: `linear-gradient(90deg,${C.gold},${C.fuchsia})` }} />
        </div>
      </div>

      <div style={card}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 1, marginBottom: 8 }}>PRÉINSCRIPTIONS PAR VILLE</div>
        {preinsParVille.map(v => (
          <div key={v.ville} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <div style={{ fontSize: 11, color: C.muted, width: 150, flexShrink: 0 }}>{v.ville}</div>
            <div style={{ flex: 1, background: "rgba(255,255,255,0.06)", borderRadius: 4, height: 10, overflow: "hidden" }}>
              <div style={{ width: `${(v.n / maxVille) * 100}%`, height: "100%", background: C.gold }} />
            </div>
            <div style={{ fontSize: 11, color: C.cream, width: 20, textAlign: "right" }}>{v.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Événements ──────────────────────────────────────────────
function Evenements({ evenements, recharger }: { evenements: EvenementBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<EvenementBSH>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  const ouvrir = (e?: EvenementBSH) => { setForm(e || { capacite: 6, publie: false, statut: "actif" }); setErreur(null); setModal(true); };

  const enregistrer = async () => {
    if (!form.nom?.trim()) { setErreur("Le nom de l'événement est obligatoire."); return; }
    const res = form.id ? await majEvenementBSH(form.id, form) : await creerEvenementBSH(form);
    if (!res.ok) { setErreur(res.error || "Échec de l'enregistrement."); return; }
    setModal(false); await recharger();
  };

  const togglerPublication = async (e: EvenementBSH) => {
    const res = await majEvenementBSH(e.id, { publie: !e.publie });
    if (!res.ok) { alert("Échec : " + (res.error || "")); return; }
    await recharger();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => ouvrir()} style={{ ...btnP, alignSelf: "flex-start" }}>+ Nouvel événement</button>
      {evenements.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucun événement — commencez par "BSH Boudoir Session — Première édition".</div>}
      {evenements.map(e => {
        const cat = CATEGORIES.find(c => c.id === e.categorie);
        return (
          <div key={e.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: C.cream }}>{e.ico} {e.nom}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{cat ? `${cat.ico} ${cat.l}` : "Sans catégorie"} · {e.ville || "Ville à déterminer"}</div>
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 4,
                background: e.publie ? "rgba(198,161,91,0.2)" : "rgba(255,255,255,0.06)", color: e.publie ? C.goldL : C.muted }}>
                {e.publie ? "PUBLIÉ" : "BROUILLON"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
              {e.capacite} place{e.capacite > 1 ? "s" : ""} ({e.placesRestantes} restantes) · {e.dureeMinutes ? `${e.dureeMinutes} min` : "Durée à définir"} · {e.prix > 0 ? `${e.prix.toFixed(2)}€` : "Tarif à définir"}
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
              <button onClick={() => ouvrir(e)} style={btnS}>✎ Modifier</button>
              <button onClick={() => togglerPublication(e)} style={{ ...btnS, color: e.publie ? "#f87171" : C.goldL }}>
                {e.publie ? "Suspendre" : "Publier"}
              </button>
            </div>
          </div>
        );
      })}

      {modal && (
        <Modal titre={form.id ? "Modifier l'événement" : "Nouvel événement"} onClose={() => setModal(false)}>
          <Champ label="Nom *"><input style={inp} value={form.nom || ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></Champ>
          <Champ label="Catégorie">
            <select style={{ ...inp, background: C.plumD }} value={form.categorie || ""} onChange={e => setForm(f => ({ ...f, categorie: e.target.value as CategorieEvenement }))}>
              <option value="">— Choisir —</option>
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.ico} {c.l}</option>)}
            </select>
          </Champ>
          <Champ label="Description"><textarea style={{ ...inp, minHeight: 60 }} value={form.description || ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8 }}>
            <Champ label="Ville (à déterminer si inconnue)">
              <select style={{ ...inp, background: C.plumD }} value={form.ville || ""} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))}>
                <option value="">À déterminer</option>
                <option value="Saint-Laurent-du-Maroni">Saint-Laurent-du-Maroni</option>
                <option value="Kourou">Kourou</option>
                <option value="Cayenne">Cayenne</option>
              </select>
            </Champ>
            <Champ label="Date"><input type="date" style={inp} value={form.dateEvenement || ""} onChange={e => setForm(f => ({ ...f, dateEvenement: e.target.value }))} /></Champ>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Champ label="Capacité"><input type="number" style={inp} value={form.capacite ?? 6} onChange={e => setForm(f => ({ ...f, capacite: parseInt(e.target.value) || 0, placesRestantes: parseInt(e.target.value) || 0 }))} /></Champ>
            <Champ label="Durée (min)"><input type="number" style={inp} value={form.dureeMinutes ?? ""} onChange={e => setForm(f => ({ ...f, dureeMinutes: parseInt(e.target.value) || undefined }))} /></Champ>
            <Champ label="Tarif (€, 0 = à définir)"><input type="number" style={inp} value={form.prix ?? 0} onChange={e => setForm(f => ({ ...f, prix: parseFloat(e.target.value) || 0 }))} /></Champ>
          </div>
          <Champ label="Budget cible (€)"><input type="number" style={inp} value={form.budgetCible ?? ""} onChange={e => setForm(f => ({ ...f, budgetCible: parseFloat(e.target.value) || undefined }))} /></Champ>
          {erreur && <div style={{ fontSize: 11, color: "#f87171" }}>⚠️ {erreur}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Lieux ───────────────────────────────────────────────────
const STATUTS_LIEU = [
  { id: "a_contacter", l: "À contacter" }, { id: "contacte", l: "Contacté" },
  { id: "reponse_recue", l: "Réponse reçue" }, { id: "devis_demande", l: "Devis demandé" },
  { id: "accepte", l: "Accepté" }, { id: "refuse", l: "Refusé" }, { id: "reserve", l: "Réservé" },
];

function Lieux({ lieux, recharger }: { lieux: LieuBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<LieuBSH>>({});
  const ouvrir = (l?: LieuBSH) => { setForm(l || { statut: "a_contacter" }); setModal(true); };
  const enregistrer = async () => {
    if (!form.nom?.trim()) return;
    const res = form.id ? await majLieuBSH(form.id, form) : await creerLieuBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); await recharger();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => ouvrir()} style={{ ...btnP, alignSelf: "flex-start" }}>+ Nouveau lieu</button>
      {lieux.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucun lieu enregistré.</div>}
      {lieux.map(l => (
        <div key={l.id} style={card} onClick={() => ouvrir(l)}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{l.nom}</div>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.goldL }}>{STATUTS_LIEU.find(s => s.id === l.statut)?.l || l.statut}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{l.ville || "Ville ?"} · {l.telephone || "Tél. ?"} · {l.tarifEstime ? `~${l.tarifEstime}€` : "Tarif à vérifier"}</div>
        </div>
      ))}
      {modal && (
        <Modal titre={form.id ? "Modifier le lieu" : "Nouveau lieu"} onClose={() => setModal(false)}>
          <Champ label="Nom *"><input style={inp} value={form.nom || ""} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} /></Champ>
          <Champ label="Adresse"><input style={inp} value={form.adresse || ""} onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8 }}>
            <Champ label="Ville"><input style={inp} value={form.ville || ""} onChange={e => setForm(f => ({ ...f, ville: e.target.value }))} /></Champ>
            <Champ label="Téléphone"><input style={inp} value={form.telephone || ""} onChange={e => setForm(f => ({ ...f, telephone: e.target.value }))} /></Champ>
          </div>
          <Champ label="Contact référent"><input style={inp} value={form.contactReferent || ""} onChange={e => setForm(f => ({ ...f, contactReferent: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8 }}>
            <Champ label="Tarif estimé (€)"><input type="number" style={inp} value={form.tarifEstime ?? ""} onChange={e => setForm(f => ({ ...f, tarifEstime: parseFloat(e.target.value) || undefined }))} /></Champ>
            <Champ label="Statut">
              <select style={{ ...inp, background: C.plumD }} value={form.statut || "a_contacter"} onChange={e => setForm(f => ({ ...f, statut: e.target.value }))}>
                {STATUTS_LIEU.map(s => <option key={s.id} value={s.id}>{s.l}</option>)}
              </select>
            </Champ>
          </div>
          <Champ label="Notes"><textarea style={{ ...inp, minHeight: 50 }} value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            {form.id && <button onClick={async () => { if (confirm("Supprimer ce lieu ?")) { await supprimerLieuBSH(form.id!); setModal(false); await recharger(); } }} style={{ ...btnS, color: "#f87171" }}>Supprimer</button>}
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Budget ──────────────────────────────────────────────────
function Budget({ budget, evenements, recharger }: { budget: BudgetLigneBSH[]; evenements: EvenementBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<BudgetLigneBSH>>({ scenario: "confortable" });
  const enregistrer = async () => {
    if (!form.poste?.trim()) return;
    const res = await creerBudgetLigneBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); setForm({ scenario: "confortable" }); await recharger();
  };
  const scenarios = ["economique", "confortable", "reel"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setModal(true)} style={{ ...btnP, alignSelf: "flex-start" }}>+ Ligne de budget</button>
      {scenarios.map(sc => {
        const lignes = budget.filter(b => b.scenario === sc);
        if (!lignes.length) return null;
        const total = lignes.reduce((s, l) => s + l.montantPrevu, 0);
        return (
          <div key={sc} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.goldL, textTransform: "uppercase" }}>{sc}</div>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{total.toFixed(2)}€</div>
            </div>
            {lignes.map(l => (
              <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                <span style={{ fontSize: 11 }}>{l.poste}</span>
                <span style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: C.muted }}>prévu {l.montantPrevu.toFixed(2)}€ · payé {l.montantPaye.toFixed(2)}€</span>
                  <button onClick={async () => { await supprimerBudgetLigneBSH(l.id); await recharger(); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 11 }}>✕</button>
                </span>
              </div>
            ))}
          </div>
        );
      })}
      {budget.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucune ligne de budget — exemple de départ : Location 0€/80€, Décoration 20€/40€, Collations 20€/35€ (éco/confort).</div>}
      {modal && (
        <Modal titre="Nouvelle ligne de budget" onClose={() => setModal(false)}>
          <Champ label="Événement (optionnel)">
            <select style={{ ...inp, background: C.plumD }} value={form.evenementId || ""} onChange={e => setForm(f => ({ ...f, evenementId: e.target.value || undefined }))}>
              <option value="">— Aucun —</option>
              {evenements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </Champ>
          <Champ label="Scénario">
            <select style={{ ...inp, background: C.plumD }} value={form.scenario} onChange={e => setForm(f => ({ ...f, scenario: e.target.value }))}>
              {scenarios.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </Champ>
          <Champ label="Poste *"><input style={inp} placeholder="Location, décoration, collations…" value={form.poste || ""} onChange={e => setForm(f => ({ ...f, poste: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8 }}>
            <Champ label="Prévu (€)"><input type="number" style={inp} value={form.montantPrevu ?? 0} onChange={e => setForm(f => ({ ...f, montantPrevu: parseFloat(e.target.value) || 0 }))} /></Champ>
            <Champ label="Engagé (€)"><input type="number" style={inp} value={form.montantEngage ?? 0} onChange={e => setForm(f => ({ ...f, montantEngage: parseFloat(e.target.value) || 0 }))} /></Champ>
            <Champ label="Payé (€)"><input type="number" style={inp} value={form.montantPaye ?? 0} onChange={e => setForm(f => ({ ...f, montantPaye: parseFloat(e.target.value) || 0 }))} /></Champ>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Check-list ──────────────────────────────────────────────
function Checklist({ checklist, recharger }: { checklist: ChecklistItemBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<ChecklistItemBSH>>({ cibleType: "evenement", priorite: "normale" });
  const [hotes, setHotes] = useState<{ id: string; nom: string }[]>([]);
  useEffect(() => { if (modal) getHotesBSH().then(setHotes); }, [modal]);

  const enregistrer = async () => {
    if (!form.titre?.trim() || !form.cibleId) return;
    const res = await creerChecklistItemBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); setForm({ cibleType: "evenement", priorite: "normale" }); await recharger();
  };
  const toggler = async (it: ChecklistItemBSH) => { await majChecklistItemBSH(it.id, { fait: !it.fait }); await recharger(); };

  const taches = [
    "Publier le sondage dans le Cercle et le Lounge", "Contacter le Domaine du Lac Bleu",
    "Contacter l'Office de tourisme", "Contacter les autres établissements",
    "Obtenir les conditions et devis écrits", "Recueillir au moins 5 manifestations d'intérêt",
    "Sélectionner les produits", "Établir le budget définitif",
    "Vérifier les obligations légales et l'assurance", "Confirmer le lieu et préparer les invitations",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setModal(true)} style={btnP}>+ Tâche</button>
        <button onClick={() => navigator.clipboard?.writeText(taches.map(t => "☐ " + t).join("\n")).then(() => alert("Check-list de lancement copiée."))} style={btnS}>📋 Copier la check-list de lancement</button>
      </div>
      {checklist.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucune tâche. Les 10 tâches de lancement ci-dessus peuvent être copiées puis ajoutées une à une.</div>}
      {checklist.map(it => (
        <div key={it.id} style={{ ...card, display: "flex", alignItems: "center", gap: 10 }}>
          <input type="checkbox" checked={it.fait} onChange={() => toggler(it)} style={{ width: 16, height: 16 }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, textDecoration: it.fait ? "line-through" : "none", color: it.fait ? C.muted : C.cream }}>{it.titre}</div>
            <div style={{ fontSize: 9, color: C.muted }}>{it.cibleType} · {it.responsable || "non assigné"} {it.echeance ? "· " + it.echeance : ""}</div>
          </div>
          <button onClick={async () => { await supprimerChecklistItemBSH(it.id); await recharger(); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
        </div>
      ))}
      {modal && (
        <Modal titre="Nouvelle tâche" onClose={() => setModal(false)}>
          <Champ label="Titre *"><input style={inp} value={form.titre || ""} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></Champ>
          <Champ label="Rattachée à">
            <select style={{ ...inp, background: C.plumD }} value={form.cibleType} onChange={e => setForm(f => ({ ...f, cibleType: e.target.value as any, cibleId: undefined }))}>
              <option value="evenement">Un événement (UUID libre pour l'instant)</option>
              <option value="hote">Une hôtesse</option>
            </select>
          </Champ>
          {form.cibleType === "hote" ? (
            <Champ label="Hôtesse *">
              <select style={{ ...inp, background: C.plumD }} value={form.cibleId || ""} onChange={e => setForm(f => ({ ...f, cibleId: e.target.value }))}>
                <option value="">— Choisir —</option>
                {hotes.map(h => <option key={h.id} value={h.id}>{h.nom}</option>)}
              </select>
            </Champ>
          ) : (
            <Champ label="Identifiant événement *"><input style={inp} value={form.cibleId || ""} onChange={e => setForm(f => ({ ...f, cibleId: e.target.value }))} placeholder="Collez l'id depuis l'onglet Événements" /></Champ>
          )}
          <Champ label="Responsable"><input style={inp} value={form.responsable || ""} onChange={e => setForm(f => ({ ...f, responsable: e.target.value }))} /></Champ>
          <Champ label="Échéance"><input type="date" style={inp} value={form.echeance || ""} onChange={e => setForm(f => ({ ...f, echeance: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Préinscriptions ─────────────────────────────────────────
const STATUTS_PREINS = ["interesse", "preinscrit", "liste_attente", "confirme", "present", "absent", "annule"];

function Preinscriptions({ preins, evenements, recharger }: { preins: PreinscriptionBSH[]; evenements: EvenementBSH[]; recharger: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 11, color: C.muted }}>Formulaire public à intégrer sur la page d'accueil — gratuit, sans engagement, jamais une réservation confirmée.</div>
      {preins.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucune préinscription pour l'instant.</div>}
      {preins.map(p => {
        const evt = evenements.find(e => e.id === p.evenementId);
        return (
          <div key={p.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{p.pseudonyme}</div>
              <select value={p.statut} onChange={async e => { await majStatutPreinscriptionBSH(p.id, e.target.value); await recharger(); }}
                style={{ background: C.plumD, border: `1px solid ${C.line}`, borderRadius: 6, color: C.goldL, fontSize: 10, padding: "2px 6px" }}>
                {STATUTS_PREINS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>
              {p.contact || "Contact ?"} · {p.villePreferee || "Ville ?"} · {evt?.nom || "Événement non précisé"}
            </div>
            {p.disponibilites && <div style={{ fontSize: 10, color: C.muted, marginTop: 2, fontStyle: "italic" }}>{p.disponibilites}</div>}
          </div>
        );
      })}
    </div>
  );
}

// ── Invitations ─────────────────────────────────────────────
function Invitations({ invitations, evenements, recharger }: { invitations: InvitationBSH[]; evenements: EvenementBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<{ evenementId: string; nomDestinataire: string; categorie: string }>({ evenementId: "", nomDestinataire: "", categorie: "invite" });
  const enregistrer = async () => {
    if (!form.evenementId || !form.nomDestinataire.trim()) return;
    const res = await creerInvitationBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); setForm({ evenementId: "", nomDestinataire: "", categorie: "invite" }); await recharger();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setModal(true)} style={{ ...btnP, alignSelf: "flex-start" }}>+ Invitation</button>
      {invitations.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucune invitation émise.</div>}
      {invitations.map(i => {
        const evt = evenements.find(e => e.id === i.evenementId);
        return (
          <div key={i.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{i.nomDestinataire}</div>
              <span style={{ fontSize: 9, fontWeight: 700, color: i.annulee ? "#f87171" : i.utilisee ? C.goldL : C.muted }}>
                {i.annulee ? "ANNULÉE" : i.utilisee ? "UTILISÉE" : "EN ATTENTE"}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{evt?.nom || "Événement ?"} · {i.categorie} · code {i.code.slice(0, 8)}</div>
            {!i.utilisee && !i.annulee && (
              <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                <button onClick={async () => { await pointerInvitationBSH(i.id); await recharger(); }} style={btnS}>✓ Marquer utilisée</button>
                <button onClick={async () => { await annulerInvitationBSH(i.id); await recharger(); }} style={{ ...btnS, color: "#f87171" }}>Annuler</button>
              </div>
            )}
          </div>
        );
      })}
      {modal && (
        <Modal titre="Nouvelle invitation" onClose={() => setModal(false)}>
          <Champ label="Événement *">
            <select style={{ ...inp, background: C.plumD }} value={form.evenementId} onChange={e => setForm(f => ({ ...f, evenementId: e.target.value }))}>
              <option value="">— Choisir —</option>
              {evenements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </Champ>
          <Champ label="Destinataire *"><input style={inp} value={form.nomDestinataire} onChange={e => setForm(f => ({ ...f, nomDestinataire: e.target.value }))} /></Champ>
          <Champ label="Catégorie">
            <select style={{ ...inp, background: C.plumD }} value={form.categorie} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))}>
              {["invite", "cercle", "members", "vip", "equipe"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Champ>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Créer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Messages modèles ────────────────────────────────────────
const TYPES_MESSAGE = ["preinscription", "invitation", "confirmation_reservation", "liste_attente", "rappel", "ouverture_ventes", "complet", "remerciement", "demande_avis"];

function Messages({ messages, recharger }: { messages: MessageModeleBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<MessageModeleBSH>>({ type: TYPES_MESSAGE[0] });
  const enregistrer = async () => {
    if (!form.titre?.trim() || !form.contenu?.trim()) return;
    const res = form.id ? await majMessageModeleBSH(form.id, form) : await creerMessageModeleBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); setForm({ type: TYPES_MESSAGE[0] }); await recharger();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <button onClick={() => setModal(true)} style={{ ...btnP, alignSelf: "flex-start" }}>+ Modèle</button>
      {messages.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucun modèle — créez-en un pour chaque étape (préinscription, invitation, rappel...).</div>}
      {messages.map(m => (
        <div key={m.id} style={card}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, fontWeight: 700 }}>{m.titre}</div>
            <span style={{ fontSize: 9, color: C.muted }}>{m.type}</span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4, whiteSpace: "pre-wrap" }}>{m.contenu}</div>
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            <button onClick={() => navigator.clipboard?.writeText(m.contenu).then(() => alert("Copié."))} style={btnS}>📋 Copier</button>
            <button onClick={() => window.open("https://wa.me/?text=" + encodeURIComponent(m.contenu), "_blank")} style={btnS}>💬 WhatsApp</button>
            <button onClick={async () => { if (confirm("Supprimer ce modèle ?")) { await supprimerMessageModeleBSH(m.id); await recharger(); } }} style={{ ...btnS, color: "#f87171" }}>Supprimer</button>
          </div>
        </div>
      ))}
      {modal && (
        <Modal titre="Nouveau modèle" onClose={() => setModal(false)}>
          <Champ label="Type">
            <select style={{ ...inp, background: C.plumD }} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {TYPES_MESSAGE.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </Champ>
          <Champ label="Titre *"><input style={inp} value={form.titre || ""} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></Champ>
          <Champ label="Contenu *"><textarea style={{ ...inp, minHeight: 120 }} value={form.contenu || ""} onChange={e => setForm(f => ({ ...f, contenu: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Diamond B / La Louve ────────────────────────────────────
function DiamondB({ playlists, evenements, recharger }: { playlists: PlaylistBSH[]; evenements: EvenementBSH[]; recharger: () => void }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState<Partial<PlaylistBSH>>({});
  const enregistrer = async () => {
    if (!form.titre?.trim()) return;
    const res = await creerPlaylistBSH(form);
    if (!res.ok) { alert("Échec : " + ("error" in res ? res.error : "")); return; }
    setModal(false); setForm({}); await recharger();
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 11, color: C.muted }}>Univers musical Diamond B — La Louve, indépendant de son répertoire chrétien. Aucun lien n'est pré-rempli : ajoutez les vrais liens officiels vous-même.</div>
      <button onClick={() => setModal(true)} style={{ ...btnP, alignSelf: "flex-start" }}>+ Morceau / playlist</button>
      {playlists.length === 0 && <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Aucune association musique ↔ événement pour l'instant.</div>}
      {playlists.map(p => {
        const evt = evenements.find(e => e.id === p.evenementId);
        return (
          <div key={p.id} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>{p.titre}</div>
              <button onClick={async () => { await supprimerPlaylistBSH(p.id); await recharger(); }} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{evt?.nom || "Aucun événement lié"} {p.sequenceProgramme ? "· " + p.sequenceProgramme : ""}</div>
            {p.lienExterne && <a href={p.lienExterne} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: C.fuchsia }}>{p.lienExterne}</a>}
          </div>
        );
      })}
      {modal && (
        <Modal titre="Nouveau morceau / playlist" onClose={() => setModal(false)}>
          <Champ label="Titre *"><input style={inp} value={form.titre || ""} onChange={e => setForm(f => ({ ...f, titre: e.target.value }))} /></Champ>
          <Champ label="Événement (optionnel)">
            <select style={{ ...inp, background: C.plumD }} value={form.evenementId || ""} onChange={e => setForm(f => ({ ...f, evenementId: e.target.value || undefined }))}>
              <option value="">— Aucun —</option>
              {evenements.map(e => <option key={e.id} value={e.id}>{e.nom}</option>)}
            </select>
          </Champ>
          <Champ label="Séquence du programme"><input style={inp} placeholder="Accueil, animation, clôture…" value={form.sequenceProgramme || ""} onChange={e => setForm(f => ({ ...f, sequenceProgramme: e.target.value }))} /></Champ>
          <Champ label="Lien officiel (Spotify, YouTube…)"><input style={inp} value={form.lienExterne || ""} onChange={e => setForm(f => ({ ...f, lienExterne: e.target.value }))} /></Champ>
          <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
            <button onClick={enregistrer} style={{ ...btnP, flex: 1 }}>Enregistrer</button>
            <button onClick={() => setModal(false)} style={{ ...btnS, flex: 1 }}>Annuler</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ── Composants partagés ─────────────────────────────────────
function Champ({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
      <label style={{ fontSize: 10, color: C.muted }}>{label}</label>
      {children}
    </div>
  );
}

function Modal({ titre, onClose, children }: { titre: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 999, display: "flex", flexDirection: "column", overflowY: "auto", padding: 20 }}>
      <div style={{ background: C.plumD, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, maxWidth: 480, margin: "auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.cream, fontFamily: FS }}>{titre}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
      </div>
    </div>
  );
}

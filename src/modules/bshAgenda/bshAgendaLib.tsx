"use client";
// ═══════════════════════════════════════════════════════════
// BSH Secret Agenda — boîte à outils commune
// • heure de Cayenne (America/Cayenne = UTC−3 toute l'année, pas
//   d'heure d'été) : saisie et affichage toujours en heure locale BSH
// • accès Supabase (réutilise le client REST de Bella'Event)
// • palette BSH + petits composants d'interface
// ═══════════════════════════════════════════════════════════
import React from "react";
export { sbSelect, sbInsert, sbUpdate, sbDelete, sbRpc, uploadStorage, compresserImage, slug, telecharger } from "../events/eventsAtelierLib";

export const BUCKET_BSH = "bsh-visuels";

export const K = {
  fond: "#0b0709", surface: "#160f13", prune: "#2e1a2e", bord: "#5c1522", bord2: "#7a2030",
  rose: "#e3b9bd", or: "#c6a15b", creme: "#f1e7e2", cremeF: "rgba(241,231,226,.75)", cremeD: "rgba(241,231,226,.48)",
  verre: "rgba(255,255,255,.04)", verre2: "rgba(255,255,255,.07)", ligne: "rgba(198,161,91,.18)",
  ok: "#4ade80", alerte: "#fbbf24", erreur: "#f87171",
};
// Palette des graphiques — validée (sombre, surface #160f13) : bande de
// luminosité, chroma, séparation daltonisme ΔE ≥ 8, contraste ≥ 3:1.
export const SERIES = { chaine: "#c98500", cercle: "#d55181", lounge: "#9085e9", evenement: "#199e70" } as const;
export const FS = "'Cormorant Garamond',Georgia,serif";
export const SA = "Inter,system-ui,sans-serif";

// ── Heure de Cayenne ─────────────────────────────────────────
const DECALAGE_MS = 3 * 3600 * 1000;
export const FUSEAU = "America/Cayenne";
/** Composantes en heure de Cayenne d'un instant ISO. */
export function enCayenne(iso: string | Date) {
  const d = new Date(new Date(iso).getTime() - DECALAGE_MS);
  return { a: d.getUTCFullYear(), m: d.getUTCMonth(), j: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), js: d.getUTCDay() };
}
const p2 = (n: number) => String(n).padStart(2, "0");
/** "AAAA-MM-JJ" du jour (heure de Cayenne). */
export function cleJour(iso: string | Date) { const c = enCayenne(iso); return `${c.a}-${p2(c.m + 1)}-${p2(c.j)}`; }
export function heureCayenne(iso: string | Date) { const c = enCayenne(iso); return `${p2(c.h)}:${p2(c.mi)}`; }
/** Date "AAAA-MM-JJ" + heure "HH:MM" saisies à Cayenne → ISO UTC. */
export function versIso(date: string, heure = "00:00") { return new Date(`${date}T${heure || "00:00"}:00-03:00`).toISOString(); }
export function aujourdhui() { return cleJour(new Date()); }
/** Ajoute n jours à une clé "AAAA-MM-JJ". */
export function plusJours(cle: string, n: number) { const d = new Date(cle + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function jourSemaine(cle: string) { return new Date(cle + "T12:00:00Z").getUTCDay(); }
export function lundiDe(cle: string) { const js = jourSemaine(cle); return plusJours(cle, js === 0 ? -6 : 1 - js); }
export const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
export const JOURS_COURTS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
export const MOIS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function libelleDate(cle: string, long = true) {
  const [a, m, j] = cle.split("-").map(Number);
  return `${long ? JOURS[jourSemaine(cle)] + " " : ""}${j} ${MOIS[m - 1]}${long ? " " + a : ""}`;
}
export function libelleInstant(iso?: string | null) { if (!iso) return "—"; return `${libelleDate(cleJour(iso), false)} · ${heureCayenne(iso)}`; }
export function joursEntre(a: string, b: string) { return Math.round((new Date(b + "T12:00:00Z").getTime() - new Date(a + "T12:00:00Z").getTime()) / 86400000); }
export function compteARebours(iso?: string | null) {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "c'est le jour J";
  const j = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000);
  return j > 0 ? `J−${j}${h ? ` ${h} h` : ""}` : `${h} h`;
}

// ── Libellés ─────────────────────────────────────────────────
export const ESPACES: Record<string, string> = { chaine: "Chaîne BSH", cercle: "Cercle BSH", lounge: "BSH Lounge", evenement: "Événement", bellaia: "Bellaïa" };
export const STATUTS_PUB: [string, string, string][] = [
  ["brouillon", "Brouillon", K.cremeD], ["en_attente", "À valider", K.alerte], ["valide", "Validé", K.or], ["programme", "Programmé", "#9085e9"],
  ["pret", "Prêt à publier", K.rose], ["publie", "Publié", K.ok], ["reporte", "Reporté", "#fb923c"], ["annule", "Annulé", K.erreur], ["archive", "Archivé", K.cremeD],
];
export const statutPub = (s: string) => STATUTS_PUB.find(x => x[0] === s) || [s, s, K.cremeD];

// ── Composants d'interface ───────────────────────────────────
export const champ: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: `1px solid ${K.ligne}`, borderRadius: 9, padding: "8px 10px", color: K.creme, fontSize: 13, outline: "none", fontFamily: SA, width: "100%", boxSizing: "border-box" };
export function bouton(v: "or" | "ghost" | "danger" | "plein" = "ghost", petit = false): React.CSSProperties {
  const base: React.CSSProperties = { padding: petit ? "5px 10px" : "8px 14px", borderRadius: 10, cursor: "pointer", fontSize: petit ? 11 : 12, fontWeight: 700, fontFamily: SA, whiteSpace: "nowrap", border: `1px solid ${K.ligne}`, background: K.verre, color: K.creme };
  if (v === "or") return { ...base, border: `1px solid ${K.or}66`, background: `${K.or}1f`, color: K.or };
  if (v === "plein") return { ...base, border: "none", background: `linear-gradient(135deg,${K.bord2},${K.bord})`, color: K.creme };
  if (v === "danger") return { ...base, border: `1px solid ${K.erreur}55`, background: `${K.erreur}14`, color: K.erreur };
  return base;
}
export function Etiquette({ couleur, children }: { couleur: string; children: React.ReactNode }) {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 10, fontWeight: 700, color: K.creme, background: `${couleur}22`, border: `1px solid ${couleur}66`, borderRadius: 99, padding: "2px 8px", whiteSpace: "nowrap" }}><span style={{ width: 6, height: 6, borderRadius: 99, background: couleur }} />{children}</span>;
}
export function Champ({ label, children, aide }: { label: string; children: React.ReactNode; aide?: string }) {
  // <div> et non <label> : un <label> renverrait les clics de ses boutons
  // internes (ex. « Aperçu ») vers le premier contrôle qu'il contient.
  return <div role="group" aria-label={label} style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
    <span style={{ fontSize: 10, fontWeight: 700, color: K.cremeD, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</span>
    {children}
    {aide && <span style={{ fontSize: 10, color: K.cremeD }}>{aide}</span>}
  </div>;
}
export function Carte({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: K.verre, border: `1px solid ${K.ligne}`, borderRadius: 14, padding: 14, ...style }}>{children}</div>;
}
export function Vide({ children }: { children: React.ReactNode }) {
  return <div style={{ textAlign: "center", padding: "22px 12px", color: K.cremeD, fontSize: 12, fontStyle: "italic", border: `1px dashed ${K.ligne}`, borderRadius: 12 }}>{children}</div>;
}
export function Titre({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
    <div style={{ fontFamily: FS, fontSize: 22, fontWeight: 700, color: K.creme, flex: 1, minWidth: 180 }}>{children}</div>{action}
  </div>;
}
export function Feuille({ titre, onFermer, children, large }: { titre: string; onFermer: () => void; children: React.ReactNode; large?: boolean }) {
  return (
    <div onClick={onFermer} style={{ position: "fixed", inset: 0, background: "rgba(5,2,4,0.78)", zIndex: 1200, display: "flex", alignItems: "flex-end", justifyContent: "center", backdropFilter: "blur(3px)" }}>
      <div onClick={e => e.stopPropagation()} className="bsh-feuille" style={{ background: `linear-gradient(180deg,${K.prune},${K.fond})`, border: `1px solid ${K.ligne}`, borderRadius: "18px 18px 0 0", padding: 18, width: "100%", maxWidth: large ? 980 : 680, display: "flex", flexDirection: "column", gap: 12, maxHeight: "92vh", overflowY: "auto", fontFamily: SA, boxShadow: `0 -10px 40px ${K.bord}55` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ fontFamily: FS, fontSize: 20, fontWeight: 700, color: K.or, flex: 1 }}>{titre}</div>
          <button style={bouton("ghost", true)} onClick={onFermer}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
export function Erreur({ msg }: { msg: string }) { return msg ? <div style={{ fontSize: 12, color: K.erreur }}>⚠️ {msg}</div> : null; }

/** Grille de champs : 1 colonne sur téléphone, plusieurs ensuite. */
export const grille = (min = 200): React.CSSProperties => ({ display: "grid", gridTemplateColumns: `repeat(auto-fit,minmax(min(${min}px,100%),1fr))`, gap: 10 });

// ── Hôtes (menu déroulant au lieu d'un identifiant à coller) ──
export type Hote = { id: string; nom: string | null; prenom: string | null; statut: string; profile_id: string | null; telephone?: string | null };
export const nomHote = (h?: Hote | null) => h ? [h.prenom, h.nom].filter(Boolean).join(" ") || "Hôte sans nom" : "—";
export function ChoixHote({ hotes, valeur, onChange }: { hotes: Hote[]; valeur?: string | null; onChange: (id: string | null) => void }) {
  return <select style={champ} value={valeur || ""} onChange={e => onChange(e.target.value || null)}>
    <option value="">— Aucun hôte —</option>
    {hotes.filter(h => h.statut === "active" || h.id === valeur).map(h => <option key={h.id} value={h.id}>{nomHote(h)}{h.statut !== "active" ? " (inactive)" : ""}</option>)}
  </select>;
}

/** Fichier calendrier (.ics) pour un rappel dans l'agenda du téléphone. */
export function fichierRappel(titre: string, debutIso: string, description: string, minutesAvant = 30) {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const fin = new Date(new Date(debutIso).getTime() + 15 * 60000).toISOString();
  const esc = (s: string) => (s || "").replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Bellaia//BSH Secret Agenda//FR", "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@bellaia`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(debutIso)}`, `DTEND:${f(fin)}`, `SUMMARY:${esc("📢 " + titre)}`, `DESCRIPTION:${esc(description)}`,
    "BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${esc(titre)}`, `TRIGGER:-PT${minutesAvant}M`, "END:VALARM",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  return new Blob([ics], { type: "text/calendar" });
}

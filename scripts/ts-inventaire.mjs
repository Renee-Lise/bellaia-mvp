// Inventaire reproductible des erreurs TypeScript (lot P7).
// Usage : node scripts/ts-inventaire.mjs  → docs/qualite/TS_INVENTAIRE.md
// Gravité :
//   critique : peut planter à l'exécution (nom introuvable, méthode
//              absente, import manquant, appel invalide)
//   élevée   : toute erreur dans paiements / commandes / permissions / API
//   moyenne  : incompatibilité de types (valeur inattendue possible)
//   faible   : typage incomplet (état non typé, propriétés sur {})
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
let sortie = "";
try { sortie = execSync("npx tsc --noEmit -p .", { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
catch (e) { sortie = String(e.stdout || ""); }
const lignes = sortie.split("\n").filter(l => / error TS\d+/.test(l));
const CRITIQUES = new Set(["TS2304", "TS2552", "TS2551", "TS2349", "TS2305", "TS2614", "TS2459", "TS2554", "TS2724", "TS2307", "TS18048", "TS2722"]);
const MOYENNES = new Set(["TS2322", "TS2345", "TS2739", "TS2741", "TS2353", "TS2367", "TS2769"]);
// Fichiers jamais chargés par l'application (vérifié le 18/11 : aucun
// import depuis l'appli ; anciennes copies extraites de BellaiaApp.tsx).
// Leurs erreurs n'ont aucun effet pour les utilisateurs : à supprimer
// ou à recâbler — décision à prendre, rien n'est supprimé d'office.
const NON_CHARGES = ["src/modules/events/ClientEvents.tsx", "src/modules/events/EventsCommandesF.tsx", "src/modules/events/EventsCatalogue.tsx", "src/modules/events/EventsDocumentsF.tsx",
  "src/modules/events/index.ts", "src/modules/events/EventsDemandesF.tsx", "src/modules/events/EventsPortail.tsx", "src/modules/events/eventsUtils.ts", "src/modules/events/eventsConsts.ts", "src/modules/events/eventsTypes.ts",
  "src/modules/assistant/assistantApi.ts", "src/modules/assistant/assistantUtils.ts", "src/modules/assistant/assistantRouter.ts", "src/modules/assistant/assistantPrompts.ts"];
const SENSIBLE = /(api\/|paiement|payment|sumup|stripe|commande|permission|lib\/paiements|PaymentSelector)/i;
const erreurs = lignes.map(l => {
  const m = l.match(/^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/);
  if (!m) return null;
  const [, fichier, ligne, , code, message] = m;
  const gravite = CRITIQUES.has(code) ? "critique" : SENSIBLE.test(fichier) ? "élevée" : MOYENNES.has(code) ? "moyenne" : "faible";
  return { fichier, ligne: Number(ligne), code, message, gravite, charge: !NON_CHARGES.includes(fichier) };
}).filter(Boolean);
const compter = (cle) => Object.entries(erreurs.reduce((a, e) => (a[e[cle]] = (a[e[cle]] || 0) + 1, a), {})).sort((a, b) => b[1] - a[1]);
const ordre = ["critique", "élevée", "moyenne", "faible"];
let md = `# Inventaire des erreurs TypeScript\n\nGénéré le ${new Date().toISOString().slice(0, 16).replace("T", " ")} par \`node scripts/ts-inventaire.mjs\` — **${erreurs.length} erreurs**.\n\n`;
md += `## Par gravité\n\n| Gravité | Nombre |\n|---|---|\n${ordre.map(g => `| ${g} | ${erreurs.filter(e => e.gravite === g).length} |`).join("\n")}\n\n`;
const actives = erreurs.filter(e => e.charge);
md += `## Code réellement chargé par l'application\n\n**${actives.length} erreurs** dans le code utilisé (dont ${actives.filter(e => e.gravite === "critique").length} critiques, ${actives.filter(e => e.gravite === "élevée").length} élevées) — ${erreurs.length - actives.length} dans des fichiers jamais chargés.\n\n`;
md += `## Par fichier\n\n| Fichier | Total | Critiques |\n|---|---|---|\n${compter("fichier").map(([f, n]) => `| ${f}${NON_CHARGES.includes(f) ? " _(non chargé)_" : ""} | ${n} | ${erreurs.filter(e => e.fichier === f && e.gravite === "critique").length} |`).join("\n")}\n\n`;
md += `## Par code\n\n| Code | Nombre |\n|---|---|\n${compter("code").map(([c, n]) => `| ${c} | ${n} |`).join("\n")}\n\n`;
for (const g of ["critique", "élevée"]) {
  const l = erreurs.filter(e => e.gravite === g);
  md += `## Détail — ${g} (${l.length})\n\n${l.slice(0, 400).map(e => `- \`${e.fichier}:${e.ligne}\` ${e.code} — ${e.message.replace(/\|/g, "\\|").slice(0, 160)}`).join("\n")}\n\n`;
}
writeFileSync("docs/qualite/TS_INVENTAIRE.md", md);
console.log(`${erreurs.length} erreurs (${erreurs.filter(e => e.charge).length} dans le code chargé, dont ${erreurs.filter(e => e.charge && e.gravite === "critique").length} critiques) — ` + ordre.map(g => `${g}: ${erreurs.filter(e => e.gravite === g).length}`).join(", "));

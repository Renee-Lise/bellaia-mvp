// ═══════════════════════════════════════════════════════════
// Récupération d'une page web SANS risque SSRF :
//  • https / http uniquement, ports standards, pas d'identifiants
//  • résolution DNS vérifiée : aucune adresse privée, locale, de
//    lien local, de métadonnées cloud (169.254.x) ni IPv6 interne
//  • redirections suivies à la main (max 3), chacune revérifiée
//  • taille max et délai max ; seul du texte / HTML est accepté
// ═══════════════════════════════════════════════════════════
import { lookup } from "node:dns/promises";
import net from "node:net";

const MAX_OCTETS = 2_500_000;
const DELAI_MS = 12_000;

function ipPrivee(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || a >= 224;
  }
  const v = ip.toLowerCase();
  if (v === "::1" || v === "::" ) return true;
  if (v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80")) return true;
  const m = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/); if (m) return ipPrivee(m[1]);
  return false;
}

export async function verifierUrl(brute: string): Promise<URL> {
  let u: URL;
  try { u = new URL(String(brute).trim()); } catch { throw new Error("Lien invalide."); }
  if (!["https:", "http:"].includes(u.protocol)) throw new Error("Seuls les liens http(s) sont acceptés.");
  if (u.username || u.password) throw new Error("Lien avec identifiants refusé.");
  if (u.port && !["80", "443"].includes(u.port)) throw new Error("Port non autorisé.");
  const hote = u.hostname.replace(/^\[|\]$/g, "");
  if (/^(localhost|.*\.local|.*\.internal)$/i.test(hote)) throw new Error("Adresse interne refusée.");
  const adresses = net.isIP(hote) ? [{ address: hote }] : await lookup(hote, { all: true });
  if (!adresses.length || adresses.some(a => ipPrivee(a.address))) throw new Error("Adresse privée ou interne refusée.");
  return u;
}

export async function recupererPage(brute: string): Promise<{ url: string; html: string; type: string }> {
  let courant = await verifierUrl(brute);
  for (let saut = 0; saut <= 3; saut++) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), DELAI_MS);
    let r: Response;
    try {
      r = await fetch(courant.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; BellaiaImport/1.0)", accept: "text/html,application/xhtml+xml,text/plain;q=0.9" } });
    } finally { clearTimeout(t); }
    if (r.status >= 300 && r.status < 400) {
      const loc = r.headers.get("location"); if (!loc) throw new Error("Redirection invalide.");
      courant = await verifierUrl(new URL(loc, courant).toString()); continue;
    }
    if (!r.ok) throw new Error(`Page inaccessible (HTTP ${r.status}).`);
    const type = r.headers.get("content-type") || "";
    if (!/text\/html|text\/plain|application\/xhtml/.test(type)) throw new Error("Ce lien ne renvoie pas une page lisible.");
    const lecteur = r.body?.getReader(); if (!lecteur) throw new Error("Réponse vide.");
    const morceaux: Uint8Array[] = []; let total = 0;
    for (;;) { const { done, value } = await lecteur.read(); if (done) break; total += value.length; if (total > MAX_OCTETS) { lecteur.cancel(); break; } morceaux.push(value); }
    const html = new TextDecoder("utf-8").decode(Buffer.concat(morceaux.map(m => Buffer.from(m))));
    return { url: courant.toString(), html, type };
  }
  throw new Error("Trop de redirections.");
}

/** Recette structurée publiée par le site (schema.org/Recipe en JSON-LD) — SANS IA. */
export function recetteJsonLd(html: string): any | null {
  const blocs = Array.from(html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)).map(m => m[1]);
  const trouver = (o: any): any => {
    if (!o || typeof o !== "object") return null;
    if (Array.isArray(o)) { for (const x of o) { const r = trouver(x); if (r) return r; } return null; }
    const t = o["@type"]; if (t === "Recipe" || (Array.isArray(t) && t.includes("Recipe"))) return o;
    if (o["@graph"]) return trouver(o["@graph"]);
    return null;
  };
  for (const b of blocs) { try { const r = trouver(JSON.parse(b.trim())); if (r) return r; } catch { /* bloc invalide */ } }
  return null;
}

export function texteDeHtml(html: string, max = 60000): string {
  return html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|li|h\d|div|tr)>/gi, "\n").replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&apos;/g, "'").replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, max);
}

export const meta = (html: string, prop: string) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, "i"))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, "i"))?.[1] || null;

/** Téléchargement d'un FICHIER public (ex. Google Drive partagé « tous les utilisateurs disposant du lien »),
 *  mêmes protections SSRF, taille plafonnée, types autorisés uniquement. */
export async function recupererFichier(brute: string, maxOctets = 25_000_000): Promise<{ octets: Buffer; type: string }> {
  let courant = await verifierUrl(brute);
  for (let saut = 0; saut <= 4; saut++) {
    const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 25_000);
    let r: Response;
    try { r = await fetch(courant.toString(), { redirect: "manual", signal: ctrl.signal, headers: { "user-agent": "Mozilla/5.0 (compatible; BellaiaImport/1.0)" } }); }
    finally { clearTimeout(t); }
    if (r.status >= 300 && r.status < 400) { const loc = r.headers.get("location"); if (!loc) throw new Error("Redirection invalide."); courant = await verifierUrl(new URL(loc, courant).toString()); continue; }
    if (!r.ok) throw new Error(`Fichier inaccessible (HTTP ${r.status}).`);
    const type = (r.headers.get("content-type") || "").split(";")[0].trim();
    if (/text\/html/.test(type)) throw new Error("Le fichier n'est pas public : partagez-le en lecture « Tous les utilisateurs disposant du lien », ou importez-le depuis l'app Fichiers.");
    if (!/^(application\/pdf|image\/(jpeg|png|webp|gif)|application\/octet-stream)$/.test(type)) throw new Error(`Type de fichier non pris en charge (${type || "inconnu"}).`);
    const lecteur = r.body?.getReader(); if (!lecteur) throw new Error("Réponse vide.");
    const morceaux: Buffer[] = []; let total = 0;
    for (;;) { const { done, value } = await lecteur.read(); if (done) break; total += value.length; if (total > maxOctets) { lecteur.cancel(); throw new Error("Fichier trop volumineux."); } morceaux.push(Buffer.from(value)); }
    const octets = Buffer.concat(morceaux);
    const typeReel = octets.subarray(0, 4).toString() === "%PDF" ? "application/pdf" : type;
    return { octets, type: typeReel };
  }
  throw new Error("Trop de redirections.");
}

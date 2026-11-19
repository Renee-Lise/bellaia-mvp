// ═══════════════════════════════════════════════════════════
// Extraction du TEXTE d'un PDF, sans bibliothèque ni IA (coût 0 €).
// Gère : flux FlateDecode, flux d'objets (PDF 1.5+), polices simples
// (WinAnsi / Differences) et composites (Identity-H + ToUnicode),
// XObjects de formulaire, ordre de lecture par ligne.
// Un PDF scanné (images seules) renvoie un texte vide : l'appelant
// bascule alors sur l'analyse IA (si le budget le permet).
// ═══════════════════════════════════════════════════════════
import { inflateSync } from "zlib";

type Obj = any;
type Ref = { ref: [number, number] };
const estRef = (o: any): o is Ref => o && typeof o === "object" && Array.isArray(o.ref);

// ── Analyseur d'objets PDF (dictionnaires, tableaux, noms, chaînes…)
class Lecteur {
  i = 0; s: string;
  constructor(s: string) { this.s = s; }
  blanc() { const s = this.s; while (this.i < s.length) { const c = s[this.i]; if (c === "%") { while (this.i < s.length && s[this.i] !== "\n" && s[this.i] !== "\r") this.i++; } else if (/\s|\0/.test(c)) this.i++; else break; } }
  valeur(): Obj {
    this.blanc(); const s = this.s; const c = s[this.i];
    if (c === "<" && s[this.i + 1] === "<") { this.i += 2; const d: Record<string, Obj> = {}; for (;;) { this.blanc(); if (s[this.i] === ">" && s[this.i + 1] === ">") { this.i += 2; return d; } if (this.i >= s.length) return d; const k = this.valeur(); if (typeof k !== "object" || !k?.nom) { this.i++; continue; } d[k.nom] = this.valeur(); } }
    if (c === "[") { this.i++; const a: Obj[] = []; for (;;) { this.blanc(); if (s[this.i] === "]") { this.i++; return a; } if (this.i >= s.length) return a; a.push(this.valeur()); } }
    if (c === "/") { let j = this.i + 1; while (j < s.length && !/[\s\/\[\]<>()%{}]/.test(s[j])) j++; const n = s.slice(this.i + 1, j).replace(/#([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))); this.i = j; return { nom: n }; }
    if (c === "(") return { chaine: this.litterale() };
    if (c === "<") { const j = s.indexOf(">", this.i); const h = s.slice(this.i + 1, j).replace(/\s/g, ""); this.i = j + 1; return { chaine: hexVersOctets(h), hex: true }; }
    const m = /^[+-]?(\d+\.?\d*|\.\d+)/.exec(s.slice(this.i, this.i + 32));
    if (m) {
      this.i += m[0].length;
      const r = /^\s+(\d+)\s+R(?![A-Za-z])/.exec(s.slice(this.i, this.i + 24));
      if (r && /^\d+$/.test(m[0])) { this.i += r[0].length; return { ref: [Number(m[0]), Number(r[1])] }; }
      return Number(m[0]);
    }
    let j = this.i; while (j < s.length && !/[\s\/\[\]<>()%]/.test(s[j])) j++;
    const mot = s.slice(this.i, j); this.i = Math.max(j, this.i + 1);
    if (mot === "true") return true; if (mot === "false") return false; if (mot === "null") return null;
    return { op: mot };
  }
  litterale(): string {
    const s = this.s; let p = 1, out = ""; this.i++;
    while (this.i < s.length && p > 0) {
      const c = s[this.i++];
      if (c === "\\") {
        const n = s[this.i++];
        const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "\b", f: "\f", "(": "(", ")": ")", "\\": "\\" };
        if (n in map) out += map[n];
        else if (/[0-7]/.test(n)) { let o = n; while (o.length < 3 && /[0-7]/.test(s[this.i])) o += s[this.i++]; out += String.fromCharCode(parseInt(o, 8) & 255); }
        else if (n === "\r") { if (s[this.i] === "\n") this.i++; } else if (n !== "\n") out += n;
      } else if (c === "(") { p++; out += c; } else if (c === ")") { p--; if (p) out += c; } else out += c;
    }
    return out;
  }
}
function hexVersOctets(h: string) { if (h.length % 2) h += "0"; let o = ""; for (let k = 0; k < h.length; k += 2) o += String.fromCharCode(parseInt(h.slice(k, k + 2), 16)); return o; }

// ── Table WinAnsi (octets 128-159) ; le reste ≈ Latin-1.
const WIN: Record<number, string> = { 128: "€", 130: "‚", 131: "ƒ", 132: "„", 133: "…", 134: "†", 135: "‡", 136: "ˆ", 137: "‰", 138: "Š", 139: "‹", 140: "Œ", 142: "Ž", 145: "‘", 146: "’", 147: "“", 148: "”", 149: "•", 150: "–", 151: "—", 152: "˜", 153: "™", 154: "š", 155: "›", 156: "œ", 158: "ž", 159: "Ÿ" };
const GLYPHES: Record<string, string> = { space: " ", quoteright: "’", quotesingle: "'", eacute: "é", egrave: "è", ecircumflex: "ê", edieresis: "ë", agrave: "à", acircumflex: "â", ccedilla: "ç", ugrave: "ù", ucircumflex: "û", icircumflex: "î", idieresis: "ï", ocircumflex: "ô", oe: "œ", OE: "Œ", Eacute: "É", Egrave: "È", Agrave: "À", Ccedilla: "Ç", degree: "°", endash: "–", emdash: "—", bullet: "•", ellipsis: "…", guillemotleft: "«", guillemotright: "»", fi: "fi", fl: "fl", Euro: "€", hyphen: "-", periodcentered: "·", quotedblleft: "“", quotedblright: "”" };

export function extraireTextePdf(octets: Buffer | Uint8Array, maxPages = 40): { texte: string; pages: number } {
  const brut = Buffer.from(octets).toString("latin1");
  const objets = new Map<number, { dict: Obj; flux?: string; corps?: Obj }>();

  // 1. Objets directs
  const re = /(\d+)\s+(\d+)\s+obj\b/g; let m: RegExpExecArray | null;
  while ((m = re.exec(brut))) {
    const num = Number(m[1]); const deb = m.index + m[0].length;
    const L = new Lecteur(brut); L.i = deb; let corps: Obj;
    try { corps = L.valeur(); } catch { continue; }
    L.blanc(); let flux: string | undefined;
    if (brut.startsWith("stream", L.i)) {
      let d = L.i + 6; if (brut[d] === "\r") d++; if (brut[d] === "\n") d++;
      const lg = typeof corps?.Length === "number" ? corps.Length : -1;
      let f = lg > 0 && brut.startsWith("endstream", skipBlanc(brut, d + lg)) ? d + lg : brut.indexOf("endstream", d);
      if (f < 0) f = brut.length;
      flux = brut.slice(d, f);
      re.lastIndex = f;
    }
    objets.set(num, { dict: corps, flux, corps });
  }
  const decoder = (o: { dict: Obj; flux?: string }): string => {
    if (o.flux == null) return "";
    const f = o.dict?.Filter; const filtres = (Array.isArray(f) ? f : f ? [f] : []).map((x: any) => x?.nom);
    let b = Buffer.from(o.flux, "latin1");
    for (const nom of filtres) {
      if (nom === "FlateDecode") { try { b = inflateSync(b); } catch { try { b = inflateSync(b, { finishFlush: 2 } as any); } catch { return ""; } } }
      else return ""; // filtres image (DCT, JBIG2…) : pas de texte
    }
    return b.toString("latin1");
  };
  // 2. Flux d'objets (ObjStm)
  for (const o of Array.from(objets.values())) {
    if (o.dict?.Type?.nom !== "ObjStm") continue;
    const d = decoder(o); const n = Number(o.dict.N) || 0; const premier = Number(o.dict.First) || 0;
    const ent = d.slice(0, premier).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) {
      const num = ent[2 * k], off = ent[2 * k + 1]; if (objets.has(num) && objets.get(num)!.dict?.Type?.nom !== "ObjStm" && !objets.get(num)!.flux && objets.get(num)!.dict != null) continue;
      const L = new Lecteur(d); L.i = premier + off;
      try { const v = L.valeur(); objets.set(num, { dict: v, corps: v }); } catch { /* ignoré */ }
    }
  }
  const res = (v: Obj): Obj => { let g = 0; while (estRef(v) && g++ < 20) v = objets.get(v.ref[0])?.dict; return v; };
  const fluxDe = (v: Obj): string => { if (estRef(v)) { const o = objets.get(v.ref[0]); return o ? decoder(o) : ""; } return ""; };

  // 3. Polices : tables de correspondance
  const cacheFonte = new Map<string, { deux: boolean; carte: Map<string, string>; diff: Record<number, string> }>();
  const fonte = (refOuDict: Obj) => {
    const cle = estRef(refOuDict) ? `r${refOuDict.ref[0]}` : JSON.stringify(refOuDict).slice(0, 200);
    if (cacheFonte.has(cle)) return cacheFonte.get(cle)!;
    const f = res(refOuDict) || {}; const carte = new Map<string, string>(); const diff: Record<number, string> = {};
    const deux = f.Subtype?.nom === "Type0";
    const cm = fluxDe(f.ToUnicode);
    if (cm) {
      for (const bloc of cm.split("beginbfchar").slice(1)) {
        const corps = bloc.split("endbfchar")[0];
        for (const x of corps.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>/g)) carte.set(hexVersOctets(x[1]), utf16(x[2]));
      }
      for (const bloc of cm.split("beginbfrange").slice(1)) {
        const corps = bloc.split("endbfrange")[0];
        for (const x of corps.matchAll(/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<([0-9a-fA-F]+)>|\[([^\]]*)\])/g)) {
          const a = parseInt(x[1], 16), b = parseInt(x[2], 16), w = x[1].length;
          if (b - a > 5000) continue;
          const liste = x[5] ? Array.from(x[5].matchAll(/<([0-9a-fA-F]+)>/g)).map(y => y[1]) : null;
          for (let c = a; c <= b; c++) {
            const src = hexVersOctets(c.toString(16).padStart(w, "0"));
            if (liste) { if (liste[c - a]) carte.set(src, utf16(liste[c - a])); }
            else { const base = parseInt(x[4], 16) + (c - a); carte.set(src, utf16(base.toString(16).padStart(x[4].length, "0"))); }
          }
        }
      }
    }
    const enc = res(f.Encoding);
    if (enc && Array.isArray(enc.Differences)) { let c = 0; for (const v of enc.Differences) { if (typeof v === "number") c = v; else if (v?.nom) diff[c++] = GLYPHES[v.nom] ?? (v.nom.length === 1 ? v.nom : (/^uni([0-9A-F]{4})$/.exec(v.nom) ? String.fromCharCode(parseInt(v.nom.slice(3), 16)) : "")); } }
    const r = { deux, carte, diff }; cacheFonte.set(cle, r); return r;
  };
  const decoderChaine = (s: string, f: ReturnType<typeof fonte> | null) => {
    if (!f) return Array.from(s).map(c => WIN[c.charCodeAt(0)] ?? c).join("");
    let out = "";
    if (f.deux) { for (let k = 0; k + 1 < s.length; k += 2) { const g = s.slice(k, k + 2); out += f.carte.get(g) ?? ""; } return out; }
    for (const c of s) { const code = c.charCodeAt(0); out += f.carte.get(c) ?? f.diff[code] ?? WIN[code] ?? c; }
    return out;
  };

  // 4. Pages (ordre de l'arbre)
  const pages: Obj[] = [];
  const racine = (() => { for (const o of Array.from(objets.values())) if (o.dict?.Type?.nom === "Catalog") return res(o.dict.Pages); return null; })();
  const parcourir = (n: Obj, heritees: Obj, prof = 0) => {
    n = res(n); if (!n || prof > 30 || pages.length >= maxPages) return;
    const resources = n.Resources ? res(n.Resources) : heritees;
    if (n.Type?.nom === "Pages" || Array.isArray(n.Kids)) { for (const k of (n.Kids || [])) parcourir(k, resources, prof + 1); }
    else pages.push({ ...n, _res: resources });
  };
  if (racine) parcourir(racine, null);
  if (!pages.length) for (const o of Array.from(objets.values())) if (o.dict?.Type?.nom === "Page" && pages.length < maxPages) pages.push({ ...o.dict, _res: res(o.dict.Resources) });

  // 5. Contenu : opérateurs texte
  const lignes: string[] = [];
  const lireContenu = (contenu: string, ressources: Obj, prof = 0) => {
    if (prof > 4) return;
    const polices = res(ressources?.Font) || {}; const xobj = res(ressources?.XObject) || {};
    const L = new Lecteur(contenu); const pile: Obj[] = [];
    let f: ReturnType<typeof fonte> | null = null; let ligne = ""; let yPrec: number | null = null; let tl = 0;
    const saut = () => { if (ligne.trim()) lignes.push(ligne.replace(/\s+/g, " ").trim()); ligne = ""; };
    const changerY = (y: number) => { if (yPrec != null && Math.abs(y - yPrec) > 1.5) saut(); yPrec = y; };
    let yCour = 0; let taille = 10;
    while (L.i < contenu.length) {
      let v: Obj; const avant = L.i;
      try { v = L.valeur(); } catch { break; }
      if (L.i === avant) L.i++;
      if (!(v && typeof v === "object" && "op" in v)) { pile.push(v); continue; }
      const op = v.op;
      if (op === "BI") { const fin = contenu.indexOf("EI", L.i); L.i = fin < 0 ? contenu.length : fin + 2; pile.length = 0; continue; }
      switch (op) {
        case "Tf": { taille = Math.abs(Number(pile[pile.length - 1])) || taille; const n = pile[pile.length - 2]; f = n?.nom && polices[n.nom] ? fonte(polices[n.nom]) : null; break; }
        case "TL": tl = Number(pile[pile.length - 1]) || 0; break;
        case "Td": case "TD": { const ty = Number(pile[pile.length - 1]) || 0; const tx = Number(pile[pile.length - 2]) || 0; if (op === "TD") tl = -ty; yCour += ty; if (Math.abs(ty) > 1.5) changerY(yCour); break; }
        case "Tm": { yCour = Number(pile[pile.length - 1]) || 0; changerY(yCour); break; }
        case "T*": yCour -= tl; saut(); yPrec = yCour; break;
        case "BT": break;
        case "ET": break;
        case "Tj": { const s = pile[pile.length - 1]; if (s?.chaine != null) ligne += decoderChaine(s.chaine, f); break; }
        case "'": case '"': { saut(); const s = pile[pile.length - 1]; if (s?.chaine != null) ligne += decoderChaine(s.chaine, f); break; }
        case "TJ": { const a = pile[pile.length - 1]; if (Array.isArray(a)) for (const e of a) { if (e?.chaine != null) ligne += decoderChaine(e.chaine, f); else if (typeof e === "number" && e < -180 && !ligne.endsWith(" ")) ligne += " "; } break; }
        case "Do": { const n = pile[pile.length - 1]; const xr = n?.nom ? xobj[n.nom] : null; const xo = estRef(xr) ? objets.get(xr.ref[0]) : null;
          if (xo && xo.dict?.Subtype?.nom === "Form") { saut(); lireContenu(decoder(xo), res(xo.dict.Resources) || ressources, prof + 1); saut(); } break; }
      }
      pile.length = 0;
    }
    saut();
  };
  for (const p of pages) {
    const c = res(p.Contents) ?? p.Contents; const liste = Array.isArray(c) ? c : [p.Contents];
    const contenu = liste.map((x: Obj) => fluxDe(x)).join("\n");
    lireContenu(contenu, p._res);
    lignes.push("");
  }
  const texte = lignes.join("\n").replace(/\u0000/g, "").replace(/\n{3,}/g, "\n\n").trim();
  return { texte, pages: pages.length };
}
function utf16(h: string) { let s = ""; for (let k = 0; k + 3 < h.length + 0; k += 4) s += String.fromCharCode(parseInt(h.slice(k, k + 4), 16)); if (h.length === 2) s = String.fromCharCode(parseInt(h, 16)); return s; }
function skipBlanc(s: string, i: number) { while (i < s.length && /\s/.test(s[i])) i++; return i; }

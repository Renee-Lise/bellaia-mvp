// ═══════════════════════════════════════════════════════════
// Bella'Event — boîte à outils commune (Préparation, Médiathèque,
// Atelier papeterie). Aucune dépendance externe :
//  • REST Supabase + upload storage (jeton via window.getTokenAsync)
//  • compression d'images côté navigateur (transparence PNG conservée)
//  • rendu d'une création papeterie sur <canvas> (PNG 300 dpi)
//  • écriture d'un vrai fichier PDF au format exact (JPEG embarqué)
//  • partage direct (feuille de partage du téléphone) ou téléchargement
// ═══════════════════════════════════════════════════════════

export const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const BUCKET_MEDIAS = "events-medias";

export async function jeton(): Promise<string> {
  if (typeof window !== "undefined" && (window as any).getTokenAsync) {
    try { return await (window as any).getTokenAsync(); } catch {}
  }
  return SB_KEY;
}

async function entetes(extra: Record<string, string> = {}) {
  const t = await jeton();
  return { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": "application/json", ...extra };
}

async function lireErreur(r: Response) {
  const txt = await r.text().catch(() => "");
  try { const j = JSON.parse(txt); return j.message || j.error || txt; } catch { return txt || `HTTP ${r.status}`; }
}

export async function sbSelect<T = any>(table: string, query: string): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?${query}`, { headers: await entetes() });
  if (!r.ok) throw new Error(await lireErreur(r));
  return r.json();
}

export async function sbInsert<T = any>(table: string, rows: any | any[], prefer = "return=representation"): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}`, { method: "POST", headers: await entetes({ Prefer: prefer }), body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(await lireErreur(r));
  return prefer.includes("representation") ? r.json() : [];
}

export async function sbUpdate<T = any>(table: string, id: string, patch: any): Promise<T[]> {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "PATCH", headers: await entetes({ Prefer: "return=representation" }), body: JSON.stringify(patch) });
  if (!r.ok) throw new Error(await lireErreur(r));
  return r.json();
}

export async function sbRpc<T = any>(fn: string, args: any): Promise<T> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, { method: "POST", headers: await entetes(), body: JSON.stringify(args) });
  if (!r.ok) throw new Error(await lireErreur(r));
  return r.json();
}

export async function sbDelete(table: string, id: string) {
  const r = await fetch(`${SB_URL}/rest/v1/${table}?id=eq.${id}`, { method: "DELETE", headers: await entetes() });
  if (!r.ok) throw new Error(await lireErreur(r));
}

export async function uploadStorage(chemin: string, blob: Blob, contentType: string, bucket: string = BUCKET_MEDIAS) {
  const t = await jeton();
  const r = await fetch(`${SB_URL}/storage/v1/object/${bucket}/${chemin}`, {
    method: "POST",
    headers: { apikey: SB_KEY, Authorization: `Bearer ${t}`, "Content-Type": contentType, "x-upsert": "true" },
    body: blob,
  });
  if (!r.ok) throw new Error(await lireErreur(r));
  return `${SB_URL}/storage/v1/object/public/${bucket}/${chemin}`;
}

export async function supprimerStorage(chemin: string, bucket: string = BUCKET_MEDIAS) {
  const t = await jeton();
  await fetch(`${SB_URL}/storage/v1/object/${bucket}/${chemin}`, { method: "DELETE", headers: { apikey: SB_KEY, Authorization: `Bearer ${t}` } });
}

export function slug(s: string) {
  return (s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 80) || "fichier";
}

export const fmtEur = (n: number) => (Math.round((n || 0) * 100) / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
export const fmtOctets = (n: number) => n > 1e9 ? (n / 1e9).toFixed(2) + " Go" : n > 1e6 ? (n / 1e6).toFixed(1) + " Mo" : Math.round(n / 1e3) + " Ko";

// ── Compression d'images ─────────────────────────────────────
// Images > 2400 px ou > 450 Ko : redimensionnées (2400 px max).
// Transparence détectée → PNG (ou WebP si le navigateur sait l'encoder),
// sinon JPEG 85 %. SVG, GIF et PDF sont envoyés tels quels.
const BORD_MAX = 2400;

function chargerImage(src: string, crossOrigin = false): Promise<HTMLImageElement> {
  return new Promise((ok, ko) => {
    const img = new Image();
    if (crossOrigin) img.crossOrigin = "anonymous";
    img.onload = () => ok(img);
    img.onerror = () => ko(new Error("Image illisible"));
    img.src = src;
  });
}

function versBlob(c: HTMLCanvasElement, type: string, q?: number): Promise<Blob | null> {
  return new Promise(ok => c.toBlob(b => ok(b), type, q));
}

export async function compresserImage(f: File): Promise<{ blob: Blob; type: string; ext: string; largeur?: number; hauteur?: number }> {
  const ext0 = (f.name.split(".").pop() || "").toLowerCase();
  const brut = { blob: f as Blob, type: f.type || "application/octet-stream", ext: ext0 || "bin" };
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(f.type) && !["jpg", "jpeg", "png", "webp"].includes(ext0)) return brut;
  const url = URL.createObjectURL(f);
  try {
    const img = await chargerImage(url);
    const L = img.naturalWidth, H = img.naturalHeight;
    const echelle = Math.min(1, BORD_MAX / Math.max(L, H));
    if (echelle === 1 && f.size <= 450_000 && f.type !== "image/heic") return { ...brut, largeur: L, hauteur: H };
    const c = document.createElement("canvas");
    c.width = Math.round(L * echelle); c.height = Math.round(H * echelle);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    let transparent = false;
    if (f.type === "image/png" || f.type === "image/webp" || ext0 === "png") {
      const pas = Math.max(1, Math.floor(Math.max(c.width, c.height) / 200));
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      for (let y = 0; y < c.height && !transparent; y += pas)
        for (let x = 0; x < c.width; x += pas) if (d[(y * c.width + x) * 4 + 3] < 250) { transparent = true; break; }
    }
    let blob: Blob | null = null; let type = "", ext = "";
    if (transparent) {
      const w = await versBlob(c, "image/webp", 0.88);
      if (w && w.type === "image/webp") { blob = w; type = "image/webp"; ext = "webp"; }
      else { blob = await versBlob(c, "image/png"); type = "image/png"; ext = "png"; }
    } else { blob = await versBlob(c, "image/jpeg", 0.85); type = "image/jpeg"; ext = "jpg"; }
    if (!blob || blob.size >= f.size && echelle === 1) return { ...brut, largeur: L, hauteur: H };
    return { blob, type, ext, largeur: c.width, hauteur: c.height };
  } catch {
    return brut;
  } finally { URL.revokeObjectURL(url); }
}

// ── Modèle de document papeterie ────────────────────────────
export type Calque = {
  id: string; type: "texte" | "image" | "forme"; zone?: string | null;
  x: number; y: number; w: number; h: number; rotation?: number; verrou?: boolean; opacite?: number;
  texte?: { contenu: string; taille: number; couleur: string; police: string; gras?: boolean; italique?: boolean; align?: "left" | "center" | "right"; interligne?: number };
  image?: { url: string; ajustement?: "cover" | "contain" };
  forme?: { forme: "rect" | "ellipse" | "triangle" | "triangle_bas" | "ligne"; remplissage: string; contour?: string; epaisseur?: number; rayon?: number };
};
export type ContenuPapeterie = { fond: string; calques: Calque[]; reperes?: { zone_sure_mm?: number; pliage?: { orientation: "h" | "v"; position_mm: number }[] } };

export const POLICES = [
  "Georgia", "Inter", "Playfair Display", "Cormorant Garamond", "Poppins", "Fredoka", "Pacifico", "Dancing Script", "Great Vibes", "Amatic SC", "Arial", "Courier New",
];
const POLICES_GOOGLE = ["Playfair Display:ital,wght@0,400;0,700;1,400", "Cormorant Garamond:ital,wght@0,400;0,700;1,400", "Poppins:wght@400;700", "Fredoka:wght@400;700", "Pacifico", "Dancing Script:wght@400;700", "Great Vibes", "Amatic SC:wght@400;700", "Inter:wght@400;700"];
export const LIEN_POLICES = "https://fonts.googleapis.com/css2?" + POLICES_GOOGLE.map(p => "family=" + p.replace(/ /g, "+")).join("&") + "&display=swap";

export function chargerPolices() {
  if (typeof document === "undefined" || document.getElementById("bellaia-polices-atelier")) return;
  const l = document.createElement("link");
  l.id = "bellaia-polices-atelier"; l.rel = "stylesheet"; l.href = LIEN_POLICES;
  document.head.appendChild(l);
}

// Rendu d'une création sur un canvas (unités : mm × pxParMm)
export async function rendreSurCanvas(doc: ContenuPapeterie, L: number, H: number, pxParMm: number, ctxCible?: CanvasRenderingContext2D, ox = 0, oy = 0) {
  const c = ctxCible ? null : document.createElement("canvas");
  if (c) { c.width = Math.round(L * pxParMm); c.height = Math.round(H * pxParMm); }
  const ctx = ctxCible || c!.getContext("2d")!;
  try { await (document as any).fonts?.ready; } catch {}
  ctx.save();
  ctx.translate(ox, oy);
  ctx.scale(pxParMm, pxParMm);
  ctx.beginPath(); ctx.rect(0, 0, L, H); ctx.clip();
  ctx.fillStyle = doc.fond || "#ffffff"; ctx.fillRect(0, 0, L, H);
  for (const k of doc.calques || []) {
    ctx.save();
    ctx.globalAlpha = k.opacite ?? 1;
    const cx = k.x + k.w / 2, cy = k.y + k.h / 2;
    if (k.rotation) { ctx.translate(cx, cy); ctx.rotate((k.rotation * Math.PI) / 180); ctx.translate(-cx, -cy); }
    if (k.type === "forme" && k.forme) {
      const f = k.forme;
      ctx.beginPath();
      if (f.forme === "ellipse") ctx.ellipse(cx, cy, k.w / 2, k.h / 2, 0, 0, Math.PI * 2);
      else if (f.forme === "triangle") { ctx.moveTo(cx, k.y); ctx.lineTo(k.x + k.w, k.y + k.h); ctx.lineTo(k.x, k.y + k.h); ctx.closePath(); }
      else if (f.forme === "triangle_bas") { ctx.moveTo(k.x, k.y); ctx.lineTo(k.x + k.w, k.y); ctx.lineTo(cx, k.y + k.h); ctx.closePath(); }
      else if (f.forme === "ligne") { ctx.moveTo(k.x, cy); ctx.lineTo(k.x + k.w, cy); }
      else { const r = Math.min(f.rayon || 0, k.w / 2, k.h / 2); (ctx as any).roundRect ? (ctx as any).roundRect(k.x, k.y, k.w, k.h, r) : ctx.rect(k.x, k.y, k.w, k.h); }
      if (f.remplissage && f.forme !== "ligne") { ctx.fillStyle = f.remplissage; ctx.fill(); }
      if (f.contour && (f.epaisseur || 0) > 0) { ctx.strokeStyle = f.contour; ctx.lineWidth = f.epaisseur!; ctx.stroke(); }
    } else if (k.type === "image" && k.image?.url) {
      try {
        const img = await chargerImage(k.image.url, true);
        const ri = img.naturalWidth / img.naturalHeight, rb = k.w / k.h;
        let dw = k.w, dh = k.h;
        const cover = (k.image.ajustement || "cover") === "cover";
        if (cover ? ri > rb : ri < rb) { dh = k.h; dw = k.h * ri; } else { dw = k.w; dh = k.w / ri; }
        ctx.beginPath(); ctx.rect(k.x, k.y, k.w, k.h); ctx.clip();
        ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
      } catch {}
    } else if (k.type === "texte" && k.texte) {
      const t = k.texte;
      ctx.fillStyle = t.couleur || "#000";
      ctx.font = `${t.italique ? "italic " : ""}${t.gras ? "700 " : "400 "}${t.taille}px "${t.police}"`;
      ctx.textBaseline = "middle";
      ctx.textAlign = (t.align || "center") as CanvasTextAlign;
      const lignes = (t.contenu || "").split("\n");
      const lh = t.taille * (t.interligne || 1.2);
      const x = t.align === "left" ? k.x : t.align === "right" ? k.x + k.w : cx;
      lignes.forEach((ln, i) => ctx.fillText(ln, x, cy + (i - (lignes.length - 1) / 2) * lh));
    }
    ctx.restore();
  }
  ctx.restore();
  return c;
}

// ── PDF minimal (une ou plusieurs pages JPEG) — pas de librairie ─
function octetsAscii(s: string) { const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff; return u; }

export async function canvasVersPdf(pages: { canvas: HTMLCanvasElement; largeurMm: number; hauteurMm: number }[]): Promise<Blob> {
  const parts: Uint8Array[] = []; const offsets: number[] = []; let pos = 0;
  const push = (u: Uint8Array) => { parts.push(u); pos += u.length; };
  const obj = (n: number, corps: string) => { offsets[n] = pos; push(octetsAscii(`${n} 0 obj\n${corps}\nendobj\n`)); };
  push(octetsAscii("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n"));
  const nb = pages.length;
  // 1 catalog, 2 pages, puis par page : page, contenu, image
  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(" ");
  obj(1, "<< /Type /Catalog /Pages 2 0 R >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${nb} >>`);
  for (let i = 0; i < nb; i++) {
    const p = pages[i];
    const w = (p.largeurMm * 72) / 25.4, h = (p.hauteurMm * 72) / 25.4;
    const nPage = 3 + i * 3, nCont = nPage + 1, nImg = nPage + 2;
    const jpg = await versBlob(p.canvas, "image/jpeg", 0.95);
    const data = new Uint8Array(await jpg!.arrayBuffer());
    obj(nPage, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(2)} ${h.toFixed(2)}] /Resources << /XObject << /Im${i} ${nImg} 0 R >> >> /Contents ${nCont} 0 R >>`);
    const flux = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} 0 0 cm /Im${i} Do Q`;
    obj(nCont, `<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`);
    offsets[nImg] = pos;
    push(octetsAscii(`${nImg} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${p.canvas.width} /Height ${p.canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${data.length} >>\nstream\n`));
    push(data);
    push(octetsAscii("\nendstream\nendobj\n"));
  }
  const total = 3 + nb * 3;
  const xref = pos;
  let x = `xref\n0 ${total}\n0000000000 65535 f \n`;
  for (let n = 1; n < total; n++) x += String(offsets[n]).padStart(10, "0") + " 00000 n \n";
  push(octetsAscii(x + `trailer\n<< /Size ${total} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
  return new Blob(parts as BlobPart[], { type: "application/pdf" });
}

// Résolution d'export : 300 dpi, plafonnée à ~16 M pixels (limite iPhone)
export function pxParMmExport(L: number, H: number) {
  const ideal = 300 / 25.4;
  const max = Math.sqrt(16_000_000 / (L * H));
  return Math.min(ideal, max);
}

// Imposition : autant d'exemplaires que possible sur A4, avec traits de coupe
export async function rendreImpositionA4(doc: ContenuPapeterie, L: number, H: number) {
  const marge = 8, ecart = 4;
  const essais = [{ W: 210, Hp: 297 }, { W: 297, Hp: 210 }].map(f => {
    const nx = Math.max(0, Math.floor((f.W - 2 * marge + ecart) / (L + ecart))), ny = Math.max(0, Math.floor((f.Hp - 2 * marge + ecart) / (H + ecart)));
    return { ...f, nx, ny, n: nx * ny };
  }).sort((a, b) => b.n - a.n);
  const f = essais[0];
  if (f.n < 1) return null;
  const k = pxParMmExport(f.W, f.Hp);
  const c = document.createElement("canvas");
  c.width = Math.round(f.W * k); c.height = Math.round(f.Hp * k);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
  const x0 = (f.W - (f.nx * L + (f.nx - 1) * ecart)) / 2, y0 = (f.Hp - (f.ny * H + (f.ny - 1) * ecart)) / 2;
  for (let j = 0; j < f.ny; j++) for (let i = 0; i < f.nx; i++) {
    const x = x0 + i * (L + ecart), y = y0 + j * (H + ecart);
    await rendreSurCanvas(doc, L, H, k, ctx, x * k, y * k);
    ctx.save(); ctx.strokeStyle = "#999"; ctx.lineWidth = 0.2 * k;
    const m = 2.5 * k; const X = x * k, Y = y * k, XW = (x + L) * k, YH = (y + H) * k;
    // Traits de coupe aux 4 coins, à l'extérieur du support
    [[X, Y, -1, -1], [XW, Y, 1, -1], [X, YH, -1, 1], [XW, YH, 1, 1]].forEach(([px, py, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(px + sx * m * 0.25, py); ctx.lineTo(px + sx * m, py);
      ctx.moveTo(px, py + sy * m * 0.25); ctx.lineTo(px, py + sy * m);
      ctx.stroke();
    });
    ctx.restore();
  }
  return { canvas: c, largeurMm: f.W, hauteurMm: f.Hp, exemplaires: f.n };
}

// ── Partage : feuille de partage native, sinon téléchargement ──
export function telecharger(blob: Blob, nom: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = u; a.download = nom; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 4000);
}

export async function partagerFichier(blob: Blob, nom: string, titre: string): Promise<"partage" | "telecharge" | "annule"> {
  const fichier = new File([blob], nom, { type: blob.type });
  const nav: any = typeof navigator !== "undefined" ? navigator : null;
  if (nav?.canShare && nav.canShare({ files: [fichier] })) {
    try { await nav.share({ files: [fichier], title: titre }); return "partage"; }
    catch (e: any) { if (e?.name === "AbortError") return "annule"; }
  }
  telecharger(blob, nom);
  return "telecharge";
}

// ── IA Bellaïa (route /api/chat existante) ───────────────────
export async function demanderIA(system: string, question: string): Promise<string> {
  const r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ system, messages: [{ role: "user", content: question }] }) });
  const j = await r.json().catch(() => null);
  const txt = j?.content?.map((c: any) => c.text || "").join("") || "";
  if (!r.ok) throw new Error(txt.replace(/^⚠️\s*/, "") || `Erreur IA (${r.status})`);
  return txt;
}

export function extraireJson(txt: string): any {
  const m = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
  const brut = (m ? m[1] : txt).trim();
  const debut = brut.search(/[\[{]/);
  return JSON.parse(debut >= 0 ? brut.slice(debut) : brut);
}

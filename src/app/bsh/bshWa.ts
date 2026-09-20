// ═══════════════════════════════════════════════════════════
// Lien WhatsApp partagé — src/app/bsh/bshWa.ts
// Même variable d'environnement que le reste de l'app
// (NEXT_PUBLIC_WA_NUMBER, cf. README). Un lien <a href> suffit,
// pas besoin de composant client ni de window.open.
// ═══════════════════════════════════════════════════════════
export function bshWaLink(message: string): string {
  const numero = process.env.NEXT_PUBLIC_WA_NUMBER || "";
  const base = `https://wa.me/${numero}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

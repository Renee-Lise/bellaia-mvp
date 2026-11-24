// Journal de diagnostic côté client (anomalie P0 du 24/11) : incidents de navigation et de chargement.
// Reçoit UNIQUEMENT des champs techniques sur liste blanche (type, module, version, écran, appareil
// résumé) ; tout le reste est ignoré. Rien n'est stocké en base : une ligne est écrite dans les journaux
// du serveur (Vercel), préfixée [diagnostic-client], pour recouper un incident signalé sur iPhone.
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const TYPES = new Set(["module_version_obsolete", "module_erreur", "ecran_erreur", "nouvelle_version_detectee", "mise_a_jour_acceptee", "ecran_restaure"]);
const court = (v: unknown, n = 120) => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[courriel]").replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, "[jeton]").slice(0, n) : undefined);

export async function POST(req: NextRequest) {
  let corps: any = null;
  try { const t = await req.text(); if (t.length > 4000) return new NextResponse(null, { status: 413 }); corps = JSON.parse(t); } catch { return new NextResponse(null, { status: 400 }); }
  if (!corps || !TYPES.has(corps.type)) return new NextResponse(null, { status: 400 });
  const ligne = {
    type: corps.type,
    module: court(corps.module, 60),
    detail: court(corps.detail, 240),
    version_client: court(corps.version, 20),
    version_serveur: process.env.NEXT_PUBLIC_VERSION_APP || "locale",
    ecran: court(corps.ecran, 60),
    appareil: court(corps.appareil, 60),
  };
  console.log("[diagnostic-client]", JSON.stringify(ligne));
  return new NextResponse(null, { status: 204 });
}

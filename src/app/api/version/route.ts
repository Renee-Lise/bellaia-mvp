// Version actuellement en ligne : comparée par l'application à sa propre version pour proposer
// une mise à jour AVANT qu'un module de l'ancienne version ne soit introuvable (anomalie P0 du 24/11).
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { version: process.env.NEXT_PUBLIC_VERSION_APP || "locale", date: process.env.NEXT_PUBLIC_VERSION_DATE || null },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}

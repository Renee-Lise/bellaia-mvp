// src/app/api/bsh/parties/join/route.ts
// Rejoindre une partie existante via son code d'invitation.
import { NextRequest, NextResponse } from "next/server";
import { getSbService } from "@/lib/bshParties";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide." }, { status: 400 }); }

  const codeNettoye = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const pseudoNettoye = typeof body.pseudo === "string" ? body.pseudo.trim().slice(0, 40) : "";
  const { clientId } = body;
  if (!codeNettoye) return NextResponse.json({ error: "Code de partie manquant." }, { status: 400 });
  if (!clientId && !pseudoNettoye) return NextResponse.json({ error: "Pseudo ou compte requis." }, { status: 400 });

  const sb = getSbService();
  const { data: partie, error: errPartie } = await sb.from("bsh_parties")
    .select("id,jeu_id,statut,code").eq("code", codeNettoye).maybeSingle();
  if (errPartie) return NextResponse.json({ error: errPartie.message }, { status: 500 });
  if (!partie) return NextResponse.json({ error: "Code de partie introuvable." }, { status: 404 });
  if (partie.statut !== "en_cours") return NextResponse.json({ error: "Cette partie est terminée." }, { status: 410 });

  const { data: participant, error: errP } = await sb.from("bsh_parties_participants").insert({
    partie_id: partie.id,
    client_id: clientId || null,
    pseudo: clientId ? null : pseudoNettoye,
  }).select("id").single();
  if (errP) return NextResponse.json({ error: errP.message }, { status: 500 });

  return NextResponse.json({ ok: true, partieId: partie.id, jeuId: partie.jeu_id, code: partie.code, participantId: participant.id });
}

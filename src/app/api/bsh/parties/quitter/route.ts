// src/app/api/bsh/parties/quitter/route.ts
// Quitter une partie : retire SA propre place (participantId = jeton de session
// léger remis à l'entrée). Les tirages passés sont conservés (référence mise à vide).
import { NextRequest, NextResponse } from "next/server";
import { getSbService } from "@/lib/bshParties";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Payload invalide." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const participantId = typeof body.participantId === "string" ? body.participantId.trim() : "";
  if (!code || !/^[0-9a-f-]{36}$/i.test(participantId)) return NextResponse.json({ error: "Code et participant requis." }, { status: 400 });
  const sb = getSbService();
  const { data: partie } = await sb.from("bsh_parties").select("id").eq("code", code).maybeSingle();
  if (!partie) return NextResponse.json({ ok: true, deja: true });
  const { error } = await sb.from("bsh_parties_participants").delete().eq("id", participantId).eq("partie_id", partie.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

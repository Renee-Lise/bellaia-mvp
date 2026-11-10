// src/app/api/bsh/parties/create/route.ts
//
// Crée une nouvelle partie BSH Secret Games / Secret Duo (migration
// 0082) — accès par compte Bellaïa (clientId) OU par pseudo, les deux
// étant acceptés (demande explicite de Renée-Lise). Retourne un code
// d'invitation à 6 caractères + un participantId qui sert de "jeton"
// de session léger côté client (stocké en localStorage) pour les
// appels suivants (état, tirer) — pas d'authentification complète,
// cohérent avec une première démo en tour par tour.
import { NextRequest, NextResponse } from "next/server";
import { getSbService, genererCodePartie } from "@/lib/bshParties";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide." }, { status: 400 }); }

  const { jeuId, pseudo, clientId } = body;
  const pseudoNettoye = typeof pseudo === "string" ? pseudo.trim().slice(0, 40) : "";
  if (!jeuId) return NextResponse.json({ error: "Jeu manquant." }, { status: 400 });
  if (!clientId && !pseudoNettoye) return NextResponse.json({ error: "Pseudo ou compte requis." }, { status: 400 });

  const sb = getSbService();

  // Code unique — tentatives bornées plutôt qu'une boucle infinie en cas
  // de malchance statistique répétée.
  let code = "";
  let partie: any = null;
  for (let tentative = 0; tentative < 5 && !partie; tentative++) {
    code = genererCodePartie();
    const { data, error } = await sb.from("bsh_parties").insert({
      jeu_id: jeuId,
      code,
      cree_par_client_id: clientId || null,
      cree_par_pseudo: clientId ? null : pseudoNettoye,
    }).select("id,code").single();
    if (!error) partie = data;
    else if (error.code !== "23505") { // pas un conflit de code unique → erreur réelle
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }
  if (!partie) return NextResponse.json({ error: "Impossible de générer un code de partie — réessayez." }, { status: 500 });

  const { data: participant, error: errP } = await sb.from("bsh_parties_participants").insert({
    partie_id: partie.id,
    client_id: clientId || null,
    pseudo: clientId ? null : pseudoNettoye,
  }).select("id").single();
  if (errP) return NextResponse.json({ error: errP.message }, { status: 500 });

  return NextResponse.json({ ok: true, partieId: partie.id, code: partie.code, participantId: participant.id });
}

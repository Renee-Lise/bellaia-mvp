// src/app/api/bsh/parties/etat/route.ts
//
// État courant d'une partie pour un·e participant·e déjà identifié·e
// (code + participantId reçus au create/join). Tour par tour : pas de
// websocket, le client rafraîchit cette route (bouton ou minuteur
// léger) pour voir si quelqu'un d'autre a tiré une carte. L'accès au
// contenu (bsh_parties_tirages) n'est accordé qu'après vérification
// que participantId appartient bien à la partie désignée par code —
// jamais par simple connaissance du partieId.
import { NextRequest, NextResponse } from "next/server";
import { getSbService } from "@/lib/bshParties";

export async function GET(req: NextRequest) {
  const code = (req.nextUrl.searchParams.get("code") || "").trim().toUpperCase();
  const participantId = req.nextUrl.searchParams.get("participantId") || "";
  if (!code || !participantId) return NextResponse.json({ error: "Code et participantId requis." }, { status: 400 });

  const sb = getSbService();
  const { data: partie, error: errPartie } = await sb.from("bsh_parties")
    .select("id,jeu_id,statut,tour_actuel,code").eq("code", code).maybeSingle();
  if (errPartie) return NextResponse.json({ error: errPartie.message }, { status: 500 });
  if (!partie) return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });

  const { data: moi } = await sb.from("bsh_parties_participants")
    .select("id").eq("id", participantId).eq("partie_id", partie.id).maybeSingle();
  if (!moi) return NextResponse.json({ error: "Vous ne faites pas partie de cette partie." }, { status: 403 });

  const { data: participants } = await sb.from("bsh_parties_participants")
    .select("id,pseudo,client_id,rejoint_le").eq("partie_id", partie.id).order("rejoint_le", { ascending: true });

  const { data: dernierTirage } = await sb.from("bsh_parties_tirages")
    .select("tour,carte_id,tire_par_participant_id,created_at")
    .eq("partie_id", partie.id).order("tour", { ascending: false }).limit(1).maybeSingle();

  let carte: any = null;
  if (dernierTirage?.carte_id) {
    const { data } = await sb.from("bsh_jeux_cartes").select("id,emoji,nom,question").eq("id", dernierTirage.carte_id).maybeSingle();
    carte = data || null;
  }

  return NextResponse.json({
    ok: true,
    partie: { id: partie.id, code: partie.code, statut: partie.statut, tourActuel: partie.tour_actuel, jeuId: partie.jeu_id },
    participants: (participants || []).map(p => ({
      id: p.id,
      nom: p.pseudo || (p.client_id ? "Membre connectée" : "Invitée"),
      estMoi: p.id === participantId,
    })),
    dernierTirage: dernierTirage ? {
      tour: dernierTirage.tour,
      carte,
      parMoi: dernierTirage.tire_par_participant_id === participantId,
    } : null,
  });
}

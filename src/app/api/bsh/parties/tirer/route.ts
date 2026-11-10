// src/app/api/bsh/parties/tirer/route.ts
//
// Tire une carte pour la partie (tour par tour : n'importe quel·le
// participant·e peut déclencher le tour suivant, qui devient visible
// à tout le monde au prochain rafraîchissement de /etat). categorie
// optionnelle — mêmes jeux "à choix" (ex. Action ou Vérité) que la
// version solo existante (bsh_jeux_cartes.nom comme catégorie).
import { NextRequest, NextResponse } from "next/server";
import { getSbService } from "@/lib/bshParties";

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Payload invalide." }, { status: 400 }); }

  const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  const { participantId, categorie } = body;
  if (!code || !participantId) return NextResponse.json({ error: "Code et participantId requis." }, { status: 400 });

  const sb = getSbService();
  const { data: partie, error: errPartie } = await sb.from("bsh_parties")
    .select("id,jeu_id,statut,tour_actuel").eq("code", code).maybeSingle();
  if (errPartie) return NextResponse.json({ error: errPartie.message }, { status: 500 });
  if (!partie) return NextResponse.json({ error: "Partie introuvable." }, { status: 404 });
  if (partie.statut !== "en_cours") return NextResponse.json({ error: "Cette partie est terminée." }, { status: 410 });

  const { data: moi } = await sb.from("bsh_parties_participants")
    .select("id").eq("id", participantId).eq("partie_id", partie.id).maybeSingle();
  if (!moi) return NextResponse.json({ error: "Vous ne faites pas partie de cette partie." }, { status: 403 });

  let requeteCartes = sb.from("bsh_jeux_cartes").select("id,emoji,nom,question")
    .eq("jeu_id", partie.jeu_id).eq("statut", "active");
  if (typeof categorie === "string" && categorie.trim()) requeteCartes = requeteCartes.eq("nom", categorie.trim());
  const { data: cartes, error: errCartes } = await requeteCartes;
  if (errCartes) return NextResponse.json({ error: errCartes.message }, { status: 500 });
  if (!cartes || cartes.length === 0) return NextResponse.json({ error: "Aucune carte disponible pour ce jeu." }, { status: 404 });

  const carte = cartes[Math.floor(Math.random() * cartes.length)];
  const nouveauTour = (partie.tour_actuel || 0) + 1;

  const { error: errInsert } = await sb.from("bsh_parties_tirages").insert({
    partie_id: partie.id, carte_id: carte.id, tour: nouveauTour, tire_par_participant_id: participantId,
  });
  if (errInsert) return NextResponse.json({ error: errInsert.message }, { status: 500 });

  await sb.from("bsh_parties").update({ tour_actuel: nouveauTour, updated_at: new Date().toISOString() }).eq("id", partie.id);

  return NextResponse.json({ ok: true, tour: nouveauTour, carte });
}

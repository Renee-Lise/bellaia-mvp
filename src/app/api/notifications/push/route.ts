import { NextRequest, NextResponse } from "next/server";
import { envoyerPushFondatrice } from "@/lib/pushSend";

// ══════════════════════════════════════════════════════════
// RELAIS PUSH FONDATRICE — src/app/api/notifications/push/route.ts
//
// envoyerPushFondatrice() a besoin de la clé privée VAPID et de la
// clé service-role : impossible à appeler depuis le navigateur
// (ClientOdyssee, ClientVilo, ClientBSH, etc. — clé anonyme
// uniquement). Cette route sert de relais serveur minimal : le
// client crée déjà la ligne dans `notifications` via creerNotification()
// (badge interne), puis appelle cette route en complément pour
// déclencher une vraie notification push — même mécanisme que
// /api/food/commandes/create, désormais partagé par tous les pôles
// au lieu d'être réservé à Bella'Food.
// Jamais bloquant : erreur silencieuse si VAPID non configuré ou si
// l'appel échoue (le badge interne reste la source de vérité).
// ══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const { titre, message, url, tag } = body || {};
  if (!titre || !message) return NextResponse.json({ ok: false }, { status: 400 });

  envoyerPushFondatrice({ titre, message, url, tag }).catch(() => {});
  return NextResponse.json({ ok: true });
}

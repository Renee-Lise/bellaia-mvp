import { NextRequest, NextResponse } from "next/server";

// ══════════════════════════════════════════════════════════
// ABONNEMENT PUSH — src/app/api/push/subscribe/route.ts
// Enregistre la souscription Web Push de l'appareil courant pour le
// compte connecté (migration 0077, bellaia_push_subscriptions).
// user_id vient toujours du token vérifié côté serveur, jamais du
// corps envoyé par le client.
// ══════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  const { createClient } = await import("@supabase/supabase-js");
  const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const auth = req.headers.get("authorization") || "";
  const token = auth.replace("Bearer ", "").trim();
  if (!token) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const sbAuth = createClient(SB_URL, SB_KEY, { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: { user }, error: authErr } = await sbAuth.auth.getUser();
  if (authErr || !user) return NextResponse.json({ error: "Session invalide." }, { status: 401 });

  let body: any;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Body JSON invalide." }, { status: 400 }); }

  const endpoint = body?.endpoint;
  const p256dh = body?.keys?.p256dh;
  const authKey = body?.keys?.auth;
  if (!endpoint || !p256dh || !authKey) {
    return NextResponse.json({ error: "Souscription invalide." }, { status: 400 });
  }

  const SB = createClient(SB_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || SB_KEY);
  const { error } = await SB.from("bellaia_push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh,
      auth: authKey,
      user_agent: req.headers.get("user-agent") || null,
    },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: "Échec de l'enregistrement." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

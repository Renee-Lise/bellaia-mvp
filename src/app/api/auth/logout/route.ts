import { NextRequest, NextResponse } from "next/server";

// Déconnexion : révoque la session côté serveur d'authentification avec le jeton de la personne connectée
// (le jeton de rafraîchissement de cette session devient inutilisable). Sans jeton : rien à révoquer.
export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  if (!/^Bearer\s+\S+$/.test(auth)) return NextResponse.json({ ok: true, revoque: false });
  try {
    const r = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`, {
      method: "POST",
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, Authorization: auth },
    });
    // 401/403 : session déjà expirée ou révoquée — l'objectif est atteint.
    return NextResponse.json({ ok: true, revoque: r.ok || r.status === 204 || r.status === 401 || r.status === 403 });
  } catch (e: any) {
    console.error("[logout] révocation impossible:", e?.message || e);
    return NextResponse.json({ ok: false, revoque: false }, { status: 502 });
  }
}

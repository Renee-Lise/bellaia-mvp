import { NextRequest, NextResponse } from "next/server";

// PINs définis côté serveur uniquement — jamais exposés au client
// Variables Vercel à configurer :
// PIN_FONDATRICE   (ex: 123456)
// PIN_HOTE         (ex: 4321)
// PIN_PARTENAIRE   (ex: 8765)

export async function POST(req: NextRequest) {
  try {
    const { mode, pin } = await req.json();

    if (!mode || !pin) {
      return NextResponse.json({ ok: false, error: "Paramètres manquants" }, { status: 400 });
    }

    const PINS: Record<string, string | undefined> = {
      fondatrice:  process.env.PIN_FONDATRICE,
      hote:        process.env.PIN_HOTE,
      partenaire:  process.env.PIN_PARTENAIRE,
    };

    const expected = PINS[mode];

    // Si variable non configurée sur Vercel
    if (!expected) {
      return NextResponse.json(
        { ok: false, error: `PIN_${mode.toUpperCase()} non configuré dans Vercel` },
        { status: 500 }
      );
    }

    const ok = pin === expected;

    return NextResponse.json({ ok }, { status: ok ? 200 : 401 });

  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

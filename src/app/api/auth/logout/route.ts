import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[logout] erreur inattendue:", e?.message || e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

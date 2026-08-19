// src/app/api/ia/chat/route.ts — sécurisée + modèle correct
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SB_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function POST(req: NextRequest) {
  // 1. Vérifier la session Supabase côté serveur
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const sb = createClient(SB_URL, SB_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: { user }, error: authErr } = await sb.auth.getUser();
  if (authErr || !user) {
    return NextResponse.json({ error: "Session invalide" }, { status: 401 });
  }

  // 2. Vérifier le rôle
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  // Seuls fondatrice, hote, client peuvent utiliser l'IA
  const rolesAutorises = ["fondatrice", "hote", "client", "partenaire"];
  if (!profile || !rolesAutorises.includes(profile.role)) {
    return NextResponse.json({ error: "Accès non autorisé" }, { status: 403 });
  }

  // 3. Valider le payload
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Payload invalide" }, { status: 400 });
  }

  const { systemPrompt, messages, sessionId, contexte } = body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "Messages requis" }, { status: 400 });
  }

  // Limiter la taille
  if (messages.length > 50) {
    return NextResponse.json({ error: "Trop de messages (max 50)" }, { status: 400 });
  }

  // 4. Vérifier la clé Anthropic
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée dans Vercel → Settings → Environment Variables" },
      { status: 500 }
    );
  }

  // 5. Appel Anthropic avec le bon modèle et format
  try {
    const payload: any = {
      model:      "claude-sonnet-4-6",
      max_tokens: 2048,
      messages:   messages.map((m: any) => ({
        role:    m.role === "assistant" ? "assistant" : "user",
        content: String(m.content || m.contenu || ""),
      })),
    };

    // system doit être une string non vide
    if (systemPrompt && typeof systemPrompt === "string" && systemPrompt.trim()) {
      payload.system = systemPrompt.trim();
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method:  "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg  = errData.error?.message || `Erreur Anthropic ${response.status}`;
      console.error("[ia/chat] Anthropic error:", errMsg);
      return NextResponse.json({ error: errMsg }, { status: response.status });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "";

    // Logger dans ia_journal
    try {
      await sb.from("ia_journal").insert({
        conversation_id: sessionId || null,
        user_id:         user.id,
        type:            "appel_api",
        message:         `Réponse générée (${data.usage?.output_tokens||0} tokens)`,
        metadata:        { model: data.model, usage: data.usage, contexte },
      });
    } catch { /* non bloquant */ }

    return NextResponse.json({
      content,
      model:   data.model,
      usage:   data.usage,
      role:    profile.role,
    });
  } catch (e: any) {
    console.error("[ia/chat] erreur:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

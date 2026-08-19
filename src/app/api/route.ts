// src/app/api/ia/chat/route.ts
// Route API pour Bellaïa IA — appel Claude
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { systemPrompt, messages, sessionId, userId, contexte } = await req.json();

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY non configurée dans les variables Vercel" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":         "application/json",
        "x-api-key":            apiKey,
        "anthropic-version":    "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-sonnet-4-6",
        max_tokens: 2048,
        system:     systemPrompt,
        messages:   messages,
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || `Erreur Anthropic ${response.status}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return NextResponse.json({
      content,
      model:  data.model,
      usage:  data.usage,
    });
  } catch (e: any) {
    console.error("[ia/chat] erreur:", e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

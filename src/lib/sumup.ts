// ═══════════════════════════════════════════════════════════
// LIB SUMUP — src/lib/sumup.ts
//
// Logique d'authentification SumUp partagée, extraite des 3 routes
// qui la dupliquaient à l'identique (create-checkout paiements,
// create-checkout billets BSH Experiences, verify-status) — un seul
// endroit à faire évoluer si SumUp change son API, et les deux modes
// d'authentification (token statique OU OAuth Client Credentials)
// sont désormais supportés partout, y compris pour la vérification
// de statut (verify-status ne gérait auparavant que le token
// statique : avec les identifiants OAuth seuls, elle n'aurait jamais
// pu interroger SumUp en direct).
// ═══════════════════════════════════════════════════════════

export const SUMUP_MERCHANT_CODE = process.env.SUMUP_MERCHANT_CODE || "MEYH9QZU";
export const SUMUP_API_URL = process.env.SUMUP_API_URL || "https://api.sumup.com";

// ── Obtenir un Bearer token SumUp.
// Priorité : SUMUP_ACCESS_TOKEN statique (MODE A, simple) > OAuth
// Client Credentials via SUMUP_CLIENT_ID + SUMUP_CLIENT_SECRET
// (MODE B). Aucune des deux configurée → null (non configuré,
// jamais une erreur bloquante pour l'appelant).
export async function getSumupToken(): Promise<string | null> {
  if (process.env.SUMUP_ACCESS_TOKEN) {
    return process.env.SUMUP_ACCESS_TOKEN;
  }

  const clientId = process.env.SUMUP_CLIENT_ID;
  const clientSecret = process.env.SUMUP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[sumup] Aucune variable d'authentification : ni SUMUP_ACCESS_TOKEN ni SUMUP_CLIENT_ID+SUMUP_CLIENT_SECRET");
    return null;
  }

  try {
    const r = await fetch(`${SUMUP_API_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error("[sumup] OAuth token error:", r.status, txt.slice(0, 200));
      return null;
    }
    const data = await r.json();
    return data.access_token || null;
  } catch (err: any) {
    console.error("[sumup] OAuth fetch error:", err.message);
    return null;
  }
}

export function getSumupUrls(ref: string) {
  const base = process.env.NEXT_PUBLIC_APP_URL || "";
  return {
    success: process.env.SUMUP_SUCCESS_URL || `${base}/paiement/retour?ref=${ref}&statut=succes`,
    cancel: process.env.SUMUP_CANCEL_URL || `${base}/paiement/retour?ref=${ref}&statut=annule`,
    callback: process.env.SUMUP_CALLBACK_URL || `${base}/api/payments/sumup/webhook`,
  };
}

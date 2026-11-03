// ═══════════════════════════════════════════════════════════
// Envoi de notifications push — src/lib/pushSend.ts
// Serveur uniquement (clé privée VAPID). Envoie à tous les appareils
// abonnés d'un rôle donné (fondatrice/assistante — jamais aux
// clientes, aucune souscription cliente n'existe par design :
// l'activation n'est proposée que côté espace fondatrice).
// Best-effort : une souscription expirée/invalide est supprimée
// silencieusement (410/404 renvoyés par le navigateur), jamais
// remontée comme erreur bloquante pour l'appelant.
// ═══════════════════════════════════════════════════════════

export async function envoyerPushFondatrice(params: { titre: string; message: string; url?: string; tag?: string }) {
  try {
    const webpush = await import("web-push");
    const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
    if (!vapidPublic || !vapidPrivate) return; // Non configuré — silencieux, le badge interne reste la source de vérité.

    webpush.setVapidDetails("mailto:contact@bellaia.app", vapidPublic, vapidPrivate);

    const { createClient } = await import("@supabase/supabase-js");
    const SB = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: profils } = await SB.from("profiles").select("id").in("role", ["fondatrice", "assistante"]);
    const ids = (profils || []).map((p: any) => p.id);
    if (ids.length === 0) return;

    const { data: subs } = await SB.from("bellaia_push_subscriptions").select("id, endpoint, p256dh, auth").in("user_id", ids);
    if (!subs || subs.length === 0) return;

    const payload = JSON.stringify({ titre: params.titre, message: params.message, url: params.url || "/", tag: params.tag });

    await Promise.all(
      subs.map(async (s: any) => {
        try {
          await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload);
        } catch (e: any) {
          if (e?.statusCode === 404 || e?.statusCode === 410) {
            await SB.from("bellaia_push_subscriptions").delete().eq("id", s.id);
          }
        }
      })
    );
  } catch {
    // Jamais bloquant pour l'appelant (ex. création de commande).
  }
}

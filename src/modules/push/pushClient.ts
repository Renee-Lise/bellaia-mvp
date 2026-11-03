// ═══════════════════════════════════════════════════════════
// Notifications push — activation côté navigateur
// src/modules/push/pushClient.ts
//
// Jamais appelé automatiquement au chargement — toujours en réponse
// à un clic explicite (bouton "Activer les notifications"), pour
// éviter une demande de permission surprise que le navigateur peut
// bloquer ou que la fondatrice refuserait par réflexe.
// ═══════════════════════════════════════════════════════════

function urlB64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function pushSupporte(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export async function statutPermissionPush(): Promise<NotificationPermission | "non_supporte"> {
  if (!pushSupporte()) return "non_supporte";
  return Notification.permission;
}

export async function activerNotificationsPush(token: string): Promise<{ ok: boolean; error?: string }> {
  if (!pushSupporte()) return { ok: false, error: "Les notifications push ne sont pas prises en charge sur cet appareil/navigateur." };

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapidKey) return { ok: false, error: "Clé VAPID non configurée côté serveur." };

  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, error: "Permission refusée." };

    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(vapidKey) as unknown as BufferSource,
      });
    }

    const r = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(subscription.toJSON()),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => null);
      return { ok: false, error: d?.error || "Échec de l'enregistrement de l'abonnement." };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Échec de l'activation des notifications." };
  }
}

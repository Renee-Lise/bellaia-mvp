// ═══════════════════════════════════════════════════════════
// Service worker — notifications push Bellaïa (Web Push, VAPID)
// public/sw.js
//
// Rôle unique : recevoir un push et afficher une notification
// système, puis rouvrir/activer l'app au clic. Ne fait aucun cache
// offline — pas le périmètre demandé, et ça évite de servir une
// version figée de l'app par erreur.
// ═══════════════════════════════════════════════════════════

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}

  const titre = data.titre || "Bellaïa";
  const options = {
    body: data.message || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/" },
    tag: data.tag || undefined,
  };

  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const { title, body, url } = event.data.json();
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: "/apple-icon.png",
      badge: "/apple-icon.png",
      data: { url: url || "/" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            // postMessage is the primary signal — navigate() not supported on iOS Safari.
            client.postMessage({ type: "OPEN_NOTIFICATIONS" });
            try { client.navigate(target); } catch (_) { /* unsupported on iOS */ }
            return client.focus();
          }
        }
        if (clients.openWindow) return clients.openWindow(target);
      })
  );
});

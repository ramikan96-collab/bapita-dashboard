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
  const target = event.notification.data?.url || "/calendar";
  event.waitUntil(
    (async () => {
      // BroadcastChannel is more reliable than client.postMessage on iOS
      // (works even when page was frozen in background).
      try {
        const bc = new BroadcastChannel("bapita_push");
        bc.postMessage({ type: "OPEN_NOTIFICATIONS" });
        bc.close();
      } catch {}

      const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      const appClient = windowClients.find((c) => c.url.includes(self.location.origin));
      if (appClient) {
        return appClient.focus();
      }
      // App not open — launch it at the target URL so ?notifications=1 is read on mount.
      if (clients.openWindow) return clients.openWindow(target);
    })()
  );
});

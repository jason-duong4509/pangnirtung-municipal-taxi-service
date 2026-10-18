self.addEventListener("push", (event) => {
  if (!event.data) {
    return;
  }

  const data = event.data.json();

  const options = {
    body: data.body,
    icon: data.icon || "/icons/Pangnirtung-192.png",
    badge: data.badge || "/icons/Pangnirtung-192.png",
    data: {
      url: data.url || "/",
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = "/"; //only need to navigate to home for this project

  event.waitUntil(clients.openWindow(url));
});

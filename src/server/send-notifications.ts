import "server-only";

import webpush from "web-push";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

export async function sendPushNotification({
  endpoint,
  p256dh,
  auth,
  payload,
}: {
  endpoint: string;
  p256dh: string;
  auth: string;
  payload: {
    title: string;
    body: string;
    url?: string;
  };
}) {
  return webpush.sendNotification(
    {
      endpoint,
      keys: {
        p256dh,
        auth,
      },
    },
    JSON.stringify(payload),
  );
}

import "server-only";
import * as Ably from "ably";

const ably = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function notifyDriver(event: { bookingId: number }) {
  await ably.channels.get("driver-events").publish("notification", event);
}

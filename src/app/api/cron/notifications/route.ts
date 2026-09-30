import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "~/server/db";
import { bookings, enabledPushNotifications } from "~/server/db/schema";
import { sendPushNotification } from "~/server/send-notifications";
import { IANA_TIME_ZONE } from "~/types/constants";

//--Add UTC and timezone conversion features for dayjs--
dayjs.extend(utc);
dayjs.extend(timezone);
//------------------------------------------------------

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse("Unauthorized", {
      status: 401,
    });
  }

  const upcomingBookings = await db.query.bookings.findMany({
    where: (bookings, { lte, and, eq }) =>
      and(
        lte(
          bookings.pickupTime,
          dayjs().tz(IANA_TIME_ZONE).add(30, "minutes").toDate(),
        ), //within 30 mins
        eq(bookings.reminders, true),
        eq(bookings.sentReminder, false),
      ),
    with: {
      user: {
        with: {
          enabledPushNotifications: true,
        },
      },
    },
  });

  for (const booking of upcomingBookings) {
    try {
      //for each booking, try to send a notification to all registered devices with notifications enabled
      if (booking.user?.enabledPushNotifications) {
        for (const notificationSubscription of booking.user
          .enabledPushNotifications) {
          try {
            const timeDifference = dayjs(booking.pickupTime)
              .tz(IANA_TIME_ZONE)
              .diff(dayjs().tz(IANA_TIME_ZONE), "minute");
            let timeLeftText = "starts soon" as string;
            if (timeDifference < 0) {
              timeLeftText = `started ${timeDifference * -1} minutes ago`;
            } else if (timeDifference > 0) {
              timeLeftText = `starts in ${timeDifference} minutes`;
            } else if (timeDifference === 0) {
              timeLeftText = "starts now";
            }
            await sendPushNotification({
              endpoint: notificationSubscription.deviceEndpoint,
              p256dh: notificationSubscription.p256dh,
              auth: notificationSubscription.auth,
              payload: {
                title: "Upcoming booking",
                body: `Your trip to ${booking.destAddr} ${timeLeftText}`,
                url: "/",
              },
            });
          } catch (error: any) {
            console.error(
              `Notification sent to ${notificationSubscription.deviceEndpoint} failed with error: ${error}`,
            );
            if (error?.statusCode === 404 || error?.statusCode === 410) {
              //subscription is no longer valid
              await db
                .delete(enabledPushNotifications)
                .where(
                  eq(enabledPushNotifications.id, notificationSubscription.id),
                );
            }
          }

          await db
            .update(bookings)
            .set({
              sentReminder: true,
              updatedAt: new Date(),
            })
            .where(eq(bookings.id, booking.id));
        }
      }
    } catch (error) {
      console.error(
        `An error occurred while sending notifications to user ${booking.created_by} for booking ${booking.id}: ${error}`,
      );
    }
  }

  return Response.json({
    //return a success to the get request
    success: true,
  });
}

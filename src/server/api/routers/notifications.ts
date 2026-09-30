import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { enabledPushNotifications } from "~/server/db/schema";

export const notificationsRouter = createTRPCRouter({
  subscribeToNotifications: protectedProcedure
    .input(
      z.object({
        endpoint: z.string().url(),
        keys: z.object({
          p256dh: z.string(),
          auth: z.string(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [deviceSubscription] = await db
        .select({ id: enabledPushNotifications.id })
        .from(enabledPushNotifications)
        .where(eq(enabledPushNotifications.deviceEndpoint, input.endpoint));

      if (deviceSubscription) {
        //One already exists
        try {
          const [updatedSubscription] = await db
            .update(enabledPushNotifications)
            .set({
              p256dh: input.keys.p256dh,
              auth: input.keys.auth,
              belongsTo: ctx.session.user.id,
              updatedAt: new Date(),
            })
            .where(eq(enabledPushNotifications.deviceEndpoint, input.endpoint))
            .returning();

          if (!updatedSubscription) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update subscription",
            });
          }
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "An unknown error occurred while updating user subscription",
            cause: error,
          });
        }
      } else {
        try {
          const [insertedSubscription] = await db
            .insert(enabledPushNotifications)
            .values({
              deviceEndpoint: input.endpoint,
              p256dh: input.keys.p256dh,
              auth: input.keys.auth,
              belongsTo: ctx.session.user.id,
            })
            .returning();

          if (!insertedSubscription) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create push notification subscription",
            });
          }

          return insertedSubscription;
        } catch (error) {
          if (error instanceof TRPCError) {
            throw error;
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "An unknown error occurred while creating a notification subscription",
            cause: error,
          });
        }
      }
    }),
});

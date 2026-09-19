import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "~/server/db";
import { bookings, profile } from "~/server/db/schema";
import { UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const profileRouter = createTRPCRouter({
  verifyResident: protectedProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.ADMIN &&
        ctx.session.user.role !== UserRoles.DRIVER
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to verify an account's residency",
        });
      }

      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }

      try {
        await db.transaction(async (tx) => {
          const userIds = await tx
            .select({ id: bookings.created_by, bookingId: bookings.id })
            .from(bookings)
            .where(
              and(
                inArray(bookings.id, input.bookingIds),
                eq(bookings.requestVerification, true),
              ),
            );

          if (userIds.length !== input.bookingIds.length) {
            const bookingIdsList = userIds.map((obj) => obj.bookingId);
            const missingIdsList = input.bookingIds.filter(
              (id) => !bookingIdsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found or did not request verification: ${missingIdsList}`,
            });
          }

          const userIdList = userIds.map((obj) => obj.id);

          const updatedUsers = await db
            .update(profile)
            .set({
              isResident: true,
            })
            .where(inArray(profile.belongsTo, userIdList))
            .returning();
          if (updatedUsers.length !== userIdList.length) {
            const updatedUsersList = updatedUsers.map((obj) => obj.belongsTo);
            const missingIdsList = userIdList.filter(
              (id) => !updatedUsersList.includes(id),
            );

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Unable to verify residency for users: ${missingIdsList}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify residency",
          cause: error,
        });
      }
    }),
});

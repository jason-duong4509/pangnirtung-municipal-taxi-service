import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "~/server/db";
import { bookings } from "~/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const bookingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    try {
      const result = await db.select().from(bookings);

      return result;
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get bookings",
      });
    }
  }),
  create: publicProcedure
    .input(
      z.object({
        pickupTime: z.string(),
        pickupAddr: z.string(),
        destAddr: z.string(),
        name: z.string(),
        tripReason: z.string(),
        payment: z.string(),
        reminders: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      /*
        if (!ctx.session){
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authorized to make a booking",
          });
        }
          */
      try {
        const [insertedBooking] = await db
          .insert(bookings)
          .values({
            pickupAddr: input.pickupAddr,
            destAddr: input.destAddr,
            name: input.name,
            pickupTime: input.pickupTime,
            tripReason: input.tripReason,
            payment: input.payment,
            reminders: input.reminders,
            userId: ctx.session?.user.id ?? "eoirjg", //TODO: change this properly once auth is done and make schema a fk
          })
          .returning();

        return insertedBooking;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }
    }),
});

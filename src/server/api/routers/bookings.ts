import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { checkPickUpTime } from "~/lib/input-checkers";
import { db } from "~/server/db";
import { bookings } from "~/server/db/schema";
import { BookingStatus, PaymentMethods } from "~/types/types";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const bookingsRouter = createTRPCRouter({
  get: publicProcedure.query(async ({ ctx }) => {
    //TODO: add proper auth
    try {
      const result = await db.select().from(bookings);

      return result;
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get bookings",
      });
    }
  }),
  create: publicProcedure
    .input(
      z.object({
        pickupTime: z.string().nullable(),
        pickupAddr: z.string(),
        destAddr: z.string(),
        name: z.string(),
        tripReason: z.string(),
        payment: z.nativeEnum(PaymentMethods),
        reminders: z.boolean(),
        requestVerification: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth
      //todo: add rate limiting?

      //--Input checking--
      //todo finish
      const pickupTimeCheck = checkPickUpTime(input.pickupTime);
      let pickupTime = undefined as undefined | Date;
      if (pickupTimeCheck.isProper) {
        pickupTime = pickupTimeCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pickupTimeCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [insertedBooking] = await db
          .insert(bookings)
          .values({
            pickupAddr: input.pickupAddr,
            destAddr: input.destAddr,
            name: input.name,
            pickupTime: pickupTime,
            tripReason: input.tripReason,
            payment: input.payment,
            reminders: input.reminders,
            created_by: ctx.session?.user.id ?? "eoirjg", //TODO: change this properly once auth is done and make schema a fk
            requestVerification: input.requestVerification, //TODO: if user is already a resident, put false for this value
          })
          .returning();

        return insertedBooking;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
        });
      }
    }),
  update: publicProcedure
    .input(
      z.object({
        bookingId: z.number(),
        pickupTime: z.string().nullable(),
        pickupAddr: z.string(),
        destAddr: z.string(),
        name: z.string(),
        tripReason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth

      //--Input checking--
      //todo finish
      const pickupTimeCheck = checkPickUpTime(input.pickupTime);
      let pickupTime = undefined as undefined | Date;
      if (pickupTimeCheck.isProper) {
        pickupTime = pickupTimeCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pickupTimeCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [result] = await db
          .update(bookings)
          .set({
            pickupAddr: input.pickupAddr,
            pickupTime: pickupTime,
            destAddr: input.destAddr,
            name: input.name,
            tripReason: input.tripReason,
            updatedAt: new Date(),
          })
          .where(eq(bookings.id, input.bookingId))
          .returning();

        if (!result) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No bookings found to update",
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
          cause: error,
        });
      }
    }),
  cancel: publicProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }
      //TODO: add proper auth
      //add refund?
      try {
        await db.transaction(async (tx) => {
          const cancelledBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.CANCELLED,
              updatedAt: new Date(),
            })
            .where(inArray(bookings.id, input.bookingIds))
            .returning({ id: bookings.id });

          if (cancelledBookingIds.length !== input.bookingIds.length) {
            const cancelledBookingsList = cancelledBookingIds.map(
              (obj) => obj.id,
            );
            const missingBookingIds = input.bookingIds.filter(
              (id) => !cancelledBookingsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found: ${missingBookingIds}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
          cause: error,
        });
      }
    }),
  accept: publicProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth
      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }
      try {
        await db.transaction(async (tx) => {
          const updatedBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.IN_PROGRESS,
              updatedAt: new Date(),
            })
            .where(
              and(
                inArray(bookings.id, input.bookingIds),
                eq(bookings.status, BookingStatus.PENDING),
              ),
            )
            .returning({ id: bookings.id });

          if (updatedBookingIds.length !== input.bookingIds.length) {
            const updatedBookingsList = updatedBookingIds.map((obj) => obj.id);
            const missingBookingIds = input.bookingIds.filter(
              (id) => !updatedBookingsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found or not pending: ${missingBookingIds}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
          cause: error,
        });
      }
    }),
  complete: publicProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth
      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }

      try {
        const updatedUsers = await db.transaction(async (tx) => {
          const updatedBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.COMPLETED,
              updatedAt: new Date(),
            })
            .where(
              and(
                inArray(bookings.id, input.bookingIds),
                eq(bookings.status, BookingStatus.IN_PROGRESS),
              ),
            )
            .returning();

          if (updatedBookingIds.length !== input.bookingIds.length) {
            const updatedBookingsList = updatedBookingIds.map((obj) => obj.id);
            const missingBookingIds = input.bookingIds.filter(
              (id) => !updatedBookingsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found or not in progress: ${missingBookingIds}`,
            });
          }
          return updatedBookingIds;
        });

        const requestedVerification = updatedUsers.filter(
          (user) => user.requestVerification === true,
        );
        return requestedVerification;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update booking",
          cause: error,
        });
      }
    }),
});

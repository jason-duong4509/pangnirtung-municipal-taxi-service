import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";
import { z } from "zod";
import {
  checkAddress,
  checkName,
  checkPickUpTime,
  checkTripReason,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import { bookings } from "~/server/db/schema";
import { BookingStatus, PaymentMethods, UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const bookingsRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    try {
      if (ctx.session.user.role === UserRoles.ADMIN) {
        const result = await db.select().from(bookings);

        return result;
      } else if (ctx.session.user.role === UserRoles.DRIVER) {
        const result = await db
          .select()
          .from(bookings)
          .where(
            or(
              eq(bookings.status, BookingStatus.PENDING),
              eq(bookings.status, BookingStatus.IN_PROGRESS),
            ),
          );

        return result;
      } else {
        const result = await db
          .select()
          .from(bookings)
          .where(eq(bookings.created_by, ctx.session.user.id));

        return result;
      }
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get bookings",
      });
    }
  }),
  create: protectedProcedure
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
      if (ctx.session.user.role === UserRoles.DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Drivers are not allowed to create trips",
        });
      }

      //--Input checking--
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
      const pickupAddrCheck = checkAddress(input.pickupAddr);
      let pickupAddr = "" as string;
      if (pickupAddrCheck.isProper) {
        pickupAddr = pickupAddrCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pickupAddrCheck.errorMessage,
        });
      }
      const destAddrCheck = checkAddress(input.destAddr);
      let destAddr = "" as string;
      if (destAddrCheck.isProper) {
        destAddr = destAddrCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: destAddrCheck.errorMessage,
        });
      }
      const nameCheck = checkName(input.name);
      let name = "" as string;
      if (nameCheck.isProper) {
        name = nameCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: nameCheck.errorMessage,
        });
      }
      const tripReasonCheck = checkTripReason(input.tripReason);
      let tripReason = "" as string;
      if (tripReasonCheck.isProper) {
        tripReason = tripReasonCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tripReasonCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [insertedBooking] = await db
          .insert(bookings)
          .values({
            pickupAddr: pickupAddr,
            destAddr: destAddr,
            name: name,
            pickupTime: pickupTime,
            tripReason: tripReason,
            payment: input.payment,
            reminders: input.reminders,
            created_by: ctx.session.user.id,
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
  update: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
        pickupTime: z.string().nullable(),
        pickupAddr: z.string(),
        destAddr: z.string(),
        name: z.string(),
        tripReason: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role === UserRoles.DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Drivers cannot update booking fields",
        });
      }

      const [bookingToUpdate] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.id, input.bookingId));

      if (!bookingToUpdate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Booking ID ${input.bookingId} not found`,
        });
      } else if (
        ctx.session.user.role !== UserRoles.ADMIN &&
        bookingToUpdate.created_by !== ctx.session.user.id
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can edit bookings from other users",
        });
      } else if (
        ctx.session.user.role === UserRoles.MEMBER &&
        bookingToUpdate.status !== BookingStatus.PENDING
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot edit a non-pending trip",
        });
      }

      //--Input checking--
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
      const pickupAddrCheck = checkAddress(input.pickupAddr);
      let pickupAddr = "" as string;
      if (pickupAddrCheck.isProper) {
        pickupAddr = pickupAddrCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pickupAddrCheck.errorMessage,
        });
      }
      const destAddrCheck = checkAddress(input.destAddr);
      let destAddr = "" as string;
      if (destAddrCheck.isProper) {
        destAddr = destAddrCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: destAddrCheck.errorMessage,
        });
      }
      const nameCheck = checkName(input.name);
      let name = "" as string;
      if (nameCheck.isProper) {
        name = nameCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: nameCheck.errorMessage,
        });
      }
      const tripReasonCheck = checkTripReason(input.tripReason);
      let tripReason = "" as string;
      if (tripReasonCheck.isProper) {
        tripReason = tripReasonCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tripReasonCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [result] = await db
          .update(bookings)
          .set({
            pickupAddr: pickupAddr,
            pickupTime: pickupTime,
            destAddr: destAddr,
            name: name,
            tripReason: tripReason,
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
  cancel: protectedProcedure
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
      //TODO: add refund?
      try {
        await db.transaction(async (tx) => {
          const whereClause =
            ctx.session.user.role === UserRoles.MEMBER
              ? and(
                  eq(bookings.created_by, ctx.session.user.id),
                  inArray(bookings.id, input.bookingIds),
                  eq(bookings.status, BookingStatus.PENDING),
                )
              : ctx.session.user.role === UserRoles.DRIVER
                ? and(
                    inArray(bookings.id, input.bookingIds),
                    eq(bookings.status, BookingStatus.IN_PROGRESS),
                  )
                : inArray(bookings.id, input.bookingIds);

          const cancelledBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.CANCELLED,
              updatedAt: new Date(),
            })
            .where(whereClause)
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
              message: `Booking IDs not found${ctx.session.user.role !== UserRoles.ADMIN ? " or cannot be cancelled" : ""}: ${missingBookingIds}`,
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
  accept: protectedProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.DRIVER &&
        ctx.session.user.role !== UserRoles.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to accept trips and mark in progress",
        });
      } else if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }

      try {
        await db.transaction(async (tx) => {
          const whereClause =
            ctx.session.user.role === UserRoles.DRIVER
              ? and(
                  inArray(bookings.id, input.bookingIds),
                  eq(bookings.status, BookingStatus.PENDING),
                )
              : inArray(bookings.id, input.bookingIds);

          const updatedBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.IN_PROGRESS,
              updatedAt: new Date(),
            })
            .where(whereClause)
            .returning({ id: bookings.id });

          if (updatedBookingIds.length !== input.bookingIds.length) {
            const updatedBookingsList = updatedBookingIds.map((obj) => obj.id);
            const missingBookingIds = input.bookingIds.filter(
              (id) => !updatedBookingsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found${ctx.session.user.role === UserRoles.DRIVER ? " or not pending" : ""}: ${missingBookingIds}`,
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
  complete: protectedProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.DRIVER &&
        ctx.session.user.role !== UserRoles.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to complete trips",
        });
      } else if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }

      try {
        const updatedUsers = await db.transaction(async (tx) => {
          const whereClause =
            ctx.session.user.role === UserRoles.DRIVER
              ? and(
                  inArray(bookings.id, input.bookingIds),
                  eq(bookings.status, BookingStatus.IN_PROGRESS),
                )
              : inArray(bookings.id, input.bookingIds);

          const updatedBookingIds = await tx
            .update(bookings)
            .set({
              status: BookingStatus.COMPLETED,
              updatedAt: new Date(),
            })
            .where(whereClause)
            .returning();

          if (updatedBookingIds.length !== input.bookingIds.length) {
            const updatedBookingsList = updatedBookingIds.map((obj) => obj.id);
            const missingBookingIds = input.bookingIds.filter(
              (id) => !updatedBookingsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found${ctx.session.user.role === UserRoles.DRIVER ? " or not in progress" : ""}: ${missingBookingIds}`,
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

import { TRPCError } from "@trpc/server";
import { and, eq, inArray, or } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import {
  checkAddress,
  checkBookingType,
  checkBookingTypeAndPaymentMethod,
  checkEmail,
  checkName,
  checkPaymentMethodType,
  checkPhoneNumber,
  checkPickUpTime,
  checkRedeemCode,
  checkRedeemedCode,
  checkTripReason,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import {
  bookings,
  profile,
  rideCodes,
  user,
  userUsedRideCode,
} from "~/server/db/schema";
import {
  BOOKING_COSTS,
  BookingStatus,
  BookingValueTypes,
  PaymentMethods,
  UserRoles,
} from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});

export const bookingsRouter = createTRPCRouter({
  getOne: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.MEMBER &&
        ctx.session.user.role !== UserRoles.DRIVER
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed",
        });
      }

      try {
        const whereCondition =
          ctx.session.user.role === UserRoles.MEMBER
            ? and(
                eq(bookings.id, input.bookingId),
                eq(bookings.created_by, ctx.session.user.id),
              )
            : eq(bookings.id, input.bookingId);
        const [result] = await db.select().from(bookings).where(whereCondition);

        if (!result) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Booking does not exist",
          });
        }
        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get booking",
          cause: error,
        });
      }
    }),
  getConfirmationBooking: protectedProcedure
    .input(
      z.object({
        bookingId: z.number(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.MEMBER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Query is only available to members",
        });
      }

      try {
        const [result] = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.id, input.bookingId),
              eq(bookings.created_by, ctx.session.user.id),
              eq(bookings.requiresAdjustment, true),
              eq(bookings.status, BookingStatus.PENDING),
            ),
          );

        if (!result) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Booking does not exist",
          });
        }
        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get booking",
          cause: error,
        });
      }
    }),
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
        paymentMethod: z.string(),
        reminders: z.boolean(),
        requestVerification: z.boolean(),
        contactEmail: z.string(),
        contactPhone: z.string(),
        bookingType: z.string(),
        redeemCode: z.string().nullable(),
        paymentMethodId: z.string().nullable(),
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
      let email = "" as string;
      if (input.contactEmail !== "") {
        const emailCheck = checkEmail(input.contactEmail);
        if (emailCheck.isProper) {
          email = emailCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: emailCheck.errorMessage,
          });
        }
      }
      const phoneNumberCheck = checkPhoneNumber(input.contactPhone);
      let phoneNumber = "" as string;
      if (phoneNumberCheck.isProper) {
        phoneNumber = phoneNumberCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: phoneNumberCheck.errorMessage,
        });
      }
      const bookingTypeCheck = checkBookingType(input.bookingType);
      let bookingType = undefined as BookingValueTypes | undefined;
      if (bookingTypeCheck.isProper) {
        bookingType = bookingTypeCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: bookingTypeCheck.errorMessage,
        });
      }
      const paymentMethodTypeCheck = checkPaymentMethodType(
        input.paymentMethod,
      );
      let paymentMethod = undefined as PaymentMethods | undefined;
      if (paymentMethodTypeCheck.isProper) {
        paymentMethod = paymentMethodTypeCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: paymentMethodTypeCheck.errorMessage,
        });
      }
      let rideCode = null as null | string;
      if (input.redeemCode) {
        const redeemCodeCheck = checkRedeemCode(input.redeemCode);
        if (redeemCodeCheck.isProper) {
          rideCode = redeemCodeCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: redeemCodeCheck.errorMessage,
          });
        }
      }
      const bookingTypeAndPaymentCheck = checkBookingTypeAndPaymentMethod(
        input.bookingType,
        input.paymentMethod,
      );
      if (!bookingTypeAndPaymentCheck.isProper) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: bookingTypeAndPaymentCheck.errorMessage,
        });
      }
      //------------------

      if (rideCode) {
        const [code] = await db
          .select({ rideCode: rideCodes.code })
          .from(rideCodes)
          .where(eq(rideCodes.code, rideCode));

        if (!code) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No code found",
          });
        }
      }

      try {
        const [userProfile] = await db
          .select({
            isResident: profile.isResident,
            numberOfRides: profile.numberOfRides,
          })
          .from(profile)
          .where(eq(profile.belongsTo, ctx.session.user.id));
        if (!userProfile) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not retrieve profile data",
          });
        }

        const [userData] = await db
          .select({ stripeCustomerId: user.stripeCustomerId })
          .from(user)
          .where(eq(user.id, ctx.session.user.id));
        if (!userData) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not retrieve user data",
          });
        }

        if (
          userProfile.numberOfRides === 0 &&
          paymentMethod === PaymentMethods.RIDES
        ) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Insufficient ride credits to cover this booking cost",
          });
        }

        if (input.paymentMethodId) {
          const stripePaymentMethod = await stripe.paymentMethods.retrieve(
            input.paymentMethodId,
          );

          if (stripePaymentMethod.customer !== userData.stripeCustomerId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "Payment method does not belong to user",
            });
          }
        }

        if (
          (paymentMethod === PaymentMethods.CREDIT_CARD &&
            !input.paymentMethodId) ||
          (paymentMethod !== PaymentMethods.CREDIT_CARD &&
            input.paymentMethodId)
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Missing payment data when paying with a credit card",
          });
        }

        if (
          bookingType === BookingValueTypes.OUT_OF_TOWN &&
          paymentMethod === PaymentMethods.RIDES
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Cannot use ride credits to cover out of town trips",
          });
        }

        if (rideCode && paymentMethod === PaymentMethods.RIDES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Ride codes are not usable on ride credits",
          });
        }

        if (rideCode) {
          const [alreadyUsedCode] = await db
            .select()
            .from(userUsedRideCode)
            .where(
              and(
                eq(userUsedRideCode.rideCode, rideCode),
                eq(userUsedRideCode.userId, ctx.session.user.id),
              ),
            );

          if (alreadyUsedCode) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Ride codes already redeemed",
            });
          }
          await db.insert(userUsedRideCode).values({
            rideCode: rideCode,
            userId: ctx.session.user.id,
          });
        }

        const [insertedBooking] = await db
          .insert(bookings)
          .values({
            pickupAddr: pickupAddr,
            destAddr: destAddr,
            name: name,
            pickupTime: pickupTime,
            tripReason: tripReason,
            paymentMethod: paymentMethod,
            reminders: input.reminders,
            created_by: ctx.session.user.id,
            requestVerification: userProfile.isResident
              ? false
              : input.requestVerification,
            contactEmail: email === "" ? null : email,
            contactPhone: phoneNumber,
            bookingType: bookingType,
            rideCode: rideCode,
            stripePaymentMethodId: input.paymentMethodId,
          })
          .returning();

        if (!insertedBooking) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Unable to create booking",
          });
        }

        return insertedBooking;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create booking",
          cause: error,
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
        contactPhone: z.string(),
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
      const phoneNumberCheck = checkPhoneNumber(input.contactPhone);
      let phoneNumber = "" as string;
      if (phoneNumberCheck.isProper) {
        phoneNumber = phoneNumberCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: phoneNumberCheck.errorMessage,
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
            contactPhone: phoneNumber,
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
      try {
        await db.transaction(async (tx) => {
          for (const bookingId of input.bookingIds) {
            const whereClause =
              ctx.session.user.role === UserRoles.MEMBER
                ? and(
                    eq(bookings.created_by, ctx.session.user.id),
                    eq(bookings.id, bookingId),
                    eq(bookings.status, BookingStatus.PENDING),
                  )
                : ctx.session.user.role === UserRoles.DRIVER
                  ? and(
                      eq(bookings.id, bookingId),
                      eq(bookings.status, BookingStatus.IN_PROGRESS),
                    )
                  : eq(bookings.id, bookingId);

            const [cancelledBookingId] = await tx
              .update(bookings)
              .set({
                status: BookingStatus.CANCELLED,
                updatedAt: new Date(),
              })
              .where(whereClause)
              .returning({ id: bookings.id, usedRideCode: bookings.rideCode });

            if (!cancelledBookingId) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Booking ID not found${ctx.session.user.role !== UserRoles.ADMIN ? " or cannot be cancelled" : ""}: ${bookingId}`,
              });
            }

            if (cancelledBookingId.usedRideCode) {
              await tx
                .delete(userUsedRideCode)
                .where(
                  and(
                    eq(
                      userUsedRideCode.rideCode,
                      cancelledBookingId.usedRideCode,
                    ),
                    eq(userUsedRideCode.userId, ctx.session.user.id),
                  ),
                );
            }
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
        newRideCode: z.string().optional(),
        newPaymentMethod: z.string().optional(),
        newStripePaymentId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      } else if (
        input.bookingIds.length !== 1 &&
        ctx.session.user.role === UserRoles.MEMBER
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not allowed to bulk cancel trips",
        });
      }

      //--Input check on optional fields--
      let newRideCode = "" as string;
      if (input.newRideCode) {
        const rideCodeCheck = checkRedeemedCode(input.newRideCode);
        if (rideCodeCheck.isProper) {
          newRideCode = rideCodeCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: rideCodeCheck.errorMessage,
          });
        }
      }
      let newPaymentMethod = undefined as undefined | PaymentMethods;
      if (input.newPaymentMethod) {
        const paymentMethodCheck = checkPaymentMethodType(
          input.newPaymentMethod,
        );
        if (paymentMethodCheck.isProper) {
          newPaymentMethod = paymentMethodCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: paymentMethodCheck.errorMessage,
          });
        }
      }
      //--Input check on optional fields--

      try {
        await db.transaction(async (tx) => {
          //--members: Update payment information in booking form before accepting--
          if (ctx.session.user.role === UserRoles.MEMBER) {
            //--Input checks on optional fields--
            if (!input.newPaymentMethod) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Payment method required",
              });
            }
            const [returnedBooking] = await tx
              .select()
              .from(bookings)
              .where(
                and(
                  eq(bookings.id, input.bookingIds[0] as number),
                  eq(bookings.created_by, ctx.session.user.id),
                ),
              );
            if (!returnedBooking) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "No booking found",
              });
            } else if (
              returnedBooking.bookingType === BookingValueTypes.OUT_OF_TOWN &&
              newPaymentMethod === PaymentMethods.RIDES
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message:
                  "Ride credits cannot be used to cover out of town trips",
              });
            } else if (
              newPaymentMethod === PaymentMethods.CREDIT_CARD &&
              !input.newStripePaymentId
            ) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: "Missing stripe payment ID",
              });
            }

            if (returnedBooking.rideCode) {
              //--Free up ride code used in the booking to accept--
              await tx
                .delete(userUsedRideCode)
                .where(
                  and(
                    eq(userUsedRideCode.rideCode, returnedBooking.rideCode),
                    eq(userUsedRideCode.userId, ctx.session.user.id),
                  ),
                );
              //--Free up ride code used in the booking to accept--
            }

            if (input.newRideCode) {
              const [retrievedCode] = await tx
                .select({ code: rideCodes.code, discount: rideCodes.discount })
                .from(rideCodes)
                .where(eq(rideCodes.code, newRideCode));

              if (!retrievedCode) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Code does not exist",
                });
              }

              const [userUsedCode] = await tx
                .select()
                .from(userUsedRideCode)
                .where(
                  and(
                    eq(userUsedRideCode.rideCode, newRideCode),
                    eq(userUsedRideCode.userId, ctx.session.user.id),
                  ),
                );

              if (userUsedCode) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: "Code already redeemed",
                });
              }

              await tx.insert(userUsedRideCode).values({
                rideCode: newRideCode,
                userId: ctx.session.user.id,
              });
            }
            //--Input checks on optional fields--

            await tx
              .update(bookings)
              .set({
                paymentMethod: newPaymentMethod,
                ...(newPaymentMethod === PaymentMethods.CREDIT_CARD
                  ? { stripePaymentMethodId: input.newStripePaymentId }
                  : { stripePaymentMethodId: null }),
                ...(input.newRideCode &&
                newPaymentMethod !== PaymentMethods.RIDES
                  ? { rideCode: newRideCode }
                  : { rideCode: null }),
              })
              .where(eq(bookings.id, input.bookingIds[0] as number));
          }
          //--members: Update payment information in booking form before accepting--

          for (const bookingId of input.bookingIds) {
            const whereClause =
              ctx.session.user.role === UserRoles.DRIVER
                ? and(
                    eq(bookings.id, bookingId),
                    eq(bookings.status, BookingStatus.PENDING),
                  )
                : ctx.session.user.role === UserRoles.MEMBER
                  ? and(
                      eq(bookings.id, bookingId),
                      eq(bookings.status, BookingStatus.PENDING),
                      eq(bookings.created_by, ctx.session.user.id),
                    )
                  : eq(bookings.id, bookingId);

            const [result] = await tx
              .select()
              .from(bookings)
              .where(whereClause)
              .innerJoin(user, eq(bookings.created_by, user.id))
              .innerJoin(profile, eq(bookings.created_by, profile.belongsTo));

            if (!result) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Booking ID ${bookingId} not found`,
              });
            }

            let rideCodeDiscount = 0;
            if (result.bookings.rideCode) {
              //User used a ride code
              //--Get ride code discount--
              const [redeemedCode] = await tx
                .select()
                .from(rideCodes)
                .where(eq(rideCodes.code, result.bookings.rideCode));
              if (!redeemedCode) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Failed to find the discount rate for ride code ${result.bookings.rideCode}`,
                });
              } else {
                rideCodeDiscount = redeemedCode.discount / 100;
              }
              //--------------------------
            }

            //--Charge by payment method--
            if (result.bookings.paymentMethod === PaymentMethods.CREDIT_CARD) {
              if (!result.bookings.stripePaymentMethodId) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Booking ID ${bookingId} missing stripe payment ID`,
                });
              }

              const paymentMethod = await stripe.paymentMethods.retrieve(
                result.bookings.stripePaymentMethodId,
              );
              if (paymentMethod.customer !== result.user.stripeCustomerId) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: "Payment method ID does not belong to user",
                });
              }

              try {
                const discount =
                  BOOKING_COSTS[result.bookings.bookingType] *
                  100 *
                  rideCodeDiscount;
                await stripe.paymentIntents.create({
                  //charge the user's credit card
                  amount:
                    BOOKING_COSTS[result.bookings.bookingType] * 100 - discount,
                  currency: "cad",
                  customer: result.user.stripeCustomerId!,
                  payment_method: result.bookings.stripePaymentMethodId,
                  off_session: true,
                  confirm: true,
                });
              } catch (error) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Stripe payment encountered an error on booking ID ${result.bookings.id}`,
                });
              }
            } else if (result.bookings.paymentMethod === PaymentMethods.RIDES) {
              if (result.profile.numberOfRides === 0) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Booking ID ${bookingId} does not have enough ride credits to cover the trip`,
                });
              }

              const [updatedUser] = await tx
                .update(profile)
                .set({
                  numberOfRides: result.profile.numberOfRides - 1,
                })
                .where(eq(profile.belongsTo, result.user.id))
                .returning();

              if (!updatedUser) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Failed to update ride credits for user ${result.user.id}`,
                });
              }
            }
            //--Charge by payment method--

            await tx
              .update(bookings)
              .set({
                ...(result.bookings.paymentMethod === PaymentMethods.CREDIT_CARD
                  ? { paid: true }
                  : {}),
                ...(result.bookings.paymentMethod === PaymentMethods.RIDES
                  ? { paid: true }
                  : {}),
                ...(result.bookings.paymentMethod === PaymentMethods.CASH
                  ? { paid: false }
                  : {}),
                status: BookingStatus.IN_PROGRESS,
                updatedAt: new Date(),
              })
              .where(whereClause)
              .returning({ id: bookings.id });
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
          (booking) => booking.requestVerification === true,
        );
        const paidWithCash = updatedUsers.filter(
          (booking) => booking.paymentMethod === PaymentMethods.CASH,
        );
        return {
          requestedVerification: requestedVerification,
          paidWithCash: paidWithCash,
        };
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
  requestBookingDetailAdjustment: protectedProcedure
    .input(
      z.object({
        bookingType: z.string(),
        bookingId: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.DRIVER &&
        ctx.session.user.role !== UserRoles.ADMIN
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to perform this action",
        });
      }

      const [bookingToUpdate] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.id, input.bookingId),
            eq(bookings.created_by, ctx.session.user.id),
          ),
        );

      if (!bookingToUpdate) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Booking ID ${input.bookingId} not found`,
        });
      } else if (bookingToUpdate.status !== BookingStatus.PENDING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot make changes to an non-pending trip",
        });
      } else if (bookingToUpdate.bookingType === input.bookingType) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Booking already of this type",
        });
      }

      //--Input checking--
      const bookingTypecheck = checkBookingType(input.bookingType);
      let bookingType = undefined as undefined | BookingValueTypes;
      if (bookingTypecheck.isProper) {
        bookingType = bookingTypecheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: bookingTypecheck.errorMessage,
        });
      }
      //------------------

      try {
        const [result] = await db
          .update(bookings)
          .set({
            bookingType: bookingType,
            requiresAdjustment: true,
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
  getAdjustmentRequestedBooking: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== UserRoles.MEMBER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Query is only available to members",
      });
    }

    try {
      const [adjustmentRequestedBooking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.created_by, ctx.session.user.id),
            eq(bookings.requiresAdjustment, true),
            eq(bookings.status, BookingStatus.PENDING),
          ),
        )
        .limit(1);

      if (!adjustmentRequestedBooking) {
        return null;
      }
      return `/confirm-booking/${adjustmentRequestedBooking.id}`;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get adjustment requested bookings",
        cause: error,
      });
    }
  }),
});

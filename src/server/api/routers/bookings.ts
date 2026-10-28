import { TRPCError } from "@trpc/server";
import { and, eq, exists, gt, inArray, ne, or, sql } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { dbTimeToPrettyString, formatString } from "~/lib/helpers";
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
  checkTripReason,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import {
  bookings,
  enabledPushNotifications,
  profile,
  rideCodes,
  session,
  user,
  userUsedRideCode,
} from "~/server/db/schema";
import { notifyDriver } from "~/server/push-driver-notifications";
import { sendEmail } from "~/server/send-email";
import { sendPushNotification } from "~/server/send-notifications";
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
        const result = await db
          .select()
          .from(bookings)
          .where(eq(bookings.requiresAdjustment, false));

        return result;
      } else if (ctx.session.user.role === UserRoles.DRIVER) {
        const result = await db
          .select()
          .from(bookings)
          .where(
            and(
              or(
                eq(bookings.status, BookingStatus.PENDING),
                eq(bookings.status, BookingStatus.IN_PROGRESS),
              ),
              eq(bookings.requiresAdjustment, false),
            ),
          );

        return result;
      } else {
        const result = await db
          .select()
          .from(bookings)
          .where(
            and(
              eq(bookings.created_by, ctx.session.user.id),
              eq(bookings.requiresAdjustment, false),
            ),
          );

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
        const result = await db.transaction(async (tx) => {
          const [userProfile] = await tx
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

          const [userData] = await tx
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
            const [alreadyUsedCode] = await tx
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
            await tx.insert(userUsedRideCode).values({
              rideCode: rideCode,
              userId: ctx.session.user.id,
            });
          }

          const [insertedBooking] = await tx
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

          //--Send a notification to the driver--
          await notifyDriver({
            bookingId: insertedBooking.id,
          });
          //-------------------------------------

          return insertedBooking;
        });

        //--Check and send a receipt--
        if (input.contactEmail !== "") {
          let totalCost = BOOKING_COSTS[result.bookingType];
          if (result.rideCode) {
            const [discount] = await db
              .select({ amount: rideCodes.discount })
              .from(rideCodes)
              .where(eq(rideCodes.code, result.rideCode));
            if (discount) {
              totalCost =
                totalCost -
                (discount.amount / 100) * BOOKING_COSTS[result.bookingType];
            }
          }

          sendEmail({
            emailAddress: email,
            emailSubject:
              "Booking Receipt - Pangnirtung Municipal Taxi Service",
            messageBody: `
            
            <div style="max-width: 600px; margin: 30px auto; padding: 24px; background-color: #ffffff; border-radius: 8px;">
              <h1 style="font-size: 24px; margin: 0 0 12px; color: #222222;">
                Thanks for booking!
              </h1>
              
              <p style="font-size: 16px; margin: 0 0 24px; color: #555555;">
                Here are your booking details:
              </p>
              
              <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Name
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${result.name}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Contact Phone Number
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${result.contactPhone}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Booking Type
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${formatString(result.bookingType)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold;">
                    Pick-up Time
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${dbTimeToPrettyString(result.pickupTime)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Pick-up Address
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${result.pickupAddr}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Destination Address
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${result.destAddr}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Payment Method
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    ${formatString(result.paymentMethod)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #dddddd; background-color: #f8f8f8; font-weight: bold; width: 40%;">
                    Cost
                  </td>
                  <td style="padding: 12px; border: 1px solid #dddddd;">
                    $${totalCost}
                  </td>
                </tr>
              </table>
              
              <p style="font-size: 14px; margin: 24px 0 0; color: #777777;">
                We look forward to seeing you!
              </p>

              <p style="font-size: 12px; margin: 24px 0 0; color: #777777;">
                Please note that booking details are not final until it has been accepted by a driver. Costs shown are not final and are subject to change based on the driver's discretion. If any changes are made, you will be notified and given the opportunity to accept or decline the changes.
              </p>
            </div>
            `,
          });
        }
        //----------------------------

        return result;
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
  createForAnother: protectedProcedure
    .input(
      z.object({
        pickupTime: z.string().nullable(),
        pickupAddr: z.string(),
        destAddr: z.string(),
        name: z.string(),
        tripReason: z.string(),
        reminders: z.boolean(),
        contactPhone: z.string(),
        bookingType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to perform this action",
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
      //------------------

      try {
        const result = await db.transaction(async (tx) => {
          const [userRecord] = await tx
            .select({
              id: user.id,
              role: user.role,
            })
            .from(user)
            .where(eq(user.phoneNumber, phoneNumber));
          if (!userRecord) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `No user has primary number ${phoneNumber}`,
            });
          } else if (userRecord.role !== UserRoles.MEMBER) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message:
                "A trip cannot be made for this user as they are not a member",
            });
          }

          const [insertedBooking] = await tx
            .insert(bookings)
            .values({
              pickupAddr: pickupAddr,
              destAddr: destAddr,
              name: name,
              pickupTime: pickupTime,
              tripReason: tripReason,
              paymentMethod: PaymentMethods.CASH,
              reminders: input.reminders,
              created_by: userRecord.id,
              requestVerification: false,
              contactEmail: null,
              contactPhone: phoneNumber,
              bookingType: bookingType,
            })
            .returning();

          if (!insertedBooking) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to create booking",
            });
          }

          return insertedBooking;
        });
        return result;
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
        let unfinishedBookings = [...input.bookingIds] as number[];
        for (const bookingId of input.bookingIds) {
          await db.transaction(async (tx) => {
            const whereClause =
              ctx.session.user.role === UserRoles.MEMBER
                ? and(
                    eq(bookings.created_by, ctx.session.user.id),
                    eq(bookings.id, bookingId),
                    eq(bookings.status, BookingStatus.PENDING),
                  )
                : and(
                    eq(bookings.id, bookingId),
                    eq(bookings.status, BookingStatus.IN_PROGRESS),
                  );

            const [originalBooking] = await tx
              .select({
                status: bookings.status,
                rideCode: bookings.rideCode,
                type: bookings.bookingType,
                paymentMethod: bookings.paymentMethod,
                paymentIntentId: bookings.stripePaymentIntentId,
              })
              .from(bookings)
              .where(whereClause);

            if (!originalBooking) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Booking ID not found or cannot be cancelled: ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
              });
            }

            const [cancelledBookingId] = await tx
              .update(bookings)
              .set({
                status: BookingStatus.CANCELLED,
                updatedAt: new Date(),
              })
              .where(whereClause)
              .returning({
                id: bookings.id,
                usedRideCode: bookings.rideCode,
                createdBy: bookings.created_by,
              });

            if (!cancelledBookingId) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Booking ID not found${ctx.session.user.role !== UserRoles.ADMIN ? " or cannot be cancelled" : ""}: ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
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
                    eq(userUsedRideCode.userId, cancelledBookingId.createdBy),
                  ),
                );
            }

            //--Initiate refund--
            if (
              (ctx.session.user.role === UserRoles.ADMIN &&
                originalBooking.status !== BookingStatus.PENDING &&
                originalBooking.status !== BookingStatus.CANCELLED) ||
              ctx.session.user.role === UserRoles.DRIVER
            ) {
              if (
                originalBooking.paymentMethod === PaymentMethods.CREDIT_CARD
              ) {
                let rideCodeDiscount = 0;
                if (originalBooking.rideCode) {
                  const [rideCodeResult] = await tx
                    .select({
                      discount: rideCodes.discount,
                    })
                    .from(rideCodes)
                    .where(eq(rideCodes.code, originalBooking.rideCode));
                  if (!rideCodeResult) {
                    throw new TRPCError({
                      code: "BAD_REQUEST",
                      message: `Found unknown ride code on booking ID: ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                    });
                  }
                  rideCodeDiscount = rideCodeResult.discount / 100;
                }

                const discount =
                  BOOKING_COSTS[originalBooking.type] * 100 * rideCodeDiscount;
                const cost =
                  BOOKING_COSTS[originalBooking.type] * 100 - discount;
                const roundedCost = Math.round(cost);
                if (roundedCost >= 50) {
                  //At least $0.50 was charged
                  if (!originalBooking.paymentIntentId) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: `Payment intent missing when initiating a stripe refund for booking ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                    });
                  }

                  const stripeRefundResult = await stripe.refunds.create(
                    {
                      payment_intent: originalBooking.paymentIntentId,
                      reason: `requested_by_customer`,
                    },
                    {
                      idempotencyKey: `refund-booking-${bookingId}`,
                    },
                  );

                  const [insertedRefundResult] = await tx
                    .update(bookings)
                    .set({
                      stripeRefundId: stripeRefundResult.id,
                    })
                    .where(eq(bookings.id, bookingId))
                    .returning();
                  if (!insertedRefundResult) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: `Attaching stripe refund ID failed on booking ID: ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                    });
                  }
                }
              } else if (
                originalBooking.paymentMethod === PaymentMethods.RIDES &&
                originalBooking.type === BookingValueTypes.IN_TOWN
              ) {
                const [updatedProfileRow] = await tx
                  .update(profile)
                  .set({
                    numberOfRides: sql`${profile.numberOfRides} + 1`,
                  })
                  .where(eq(profile.belongsTo, cancelledBookingId.createdBy))
                  .returning();

                if (!updatedProfileRow) {
                  throw new TRPCError({
                    code: "INTERNAL_SERVER_ERROR",
                    message: `Could not refund ride credits for booking ID: ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                  });
                }
              }
            }
            //--Initiate refund--
          });
          unfinishedBookings = unfinishedBookings.filter(
            (id) => id !== bookingId,
          );
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
          message: "Not allowed to bulk accept trips",
        });
      }

      //--Input check on optional fields--
      let newRideCode = "" as string;
      if (input.newRideCode) {
        const rideCodeCheck = checkRedeemCode(input.newRideCode);
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

      let unfinishedBookings = [...input.bookingIds] as number[];
      try {
        for (const bookingId of input.bookingIds) {
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
                    eq(bookings.requiresAdjustment, true),
                    eq(bookings.status, BookingStatus.PENDING),
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

              if (
                input.newRideCode &&
                newPaymentMethod !== PaymentMethods.RIDES
              ) {
                const [retrievedCode] = await tx
                  .select({
                    code: rideCodes.code,
                    discount: rideCodes.discount,
                  })
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

            const whereClause =
              ctx.session.user.role === UserRoles.MEMBER
                ? and(
                    eq(bookings.id, bookingId),
                    eq(bookings.status, BookingStatus.PENDING),
                    eq(bookings.created_by, ctx.session.user.id),
                    eq(bookings.requiresAdjustment, true),
                  )
                : and(
                    eq(bookings.id, bookingId),
                    eq(bookings.requiresAdjustment, false),
                    eq(bookings.status, BookingStatus.PENDING),
                  );

            const [result] = await tx
              .select()
              .from(bookings)
              .where(whereClause)
              .innerJoin(user, eq(bookings.created_by, user.id))
              .innerJoin(profile, eq(bookings.created_by, profile.belongsTo));

            if (!result) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Booking ID ${bookingId} not found. Skipped bookings: ${unfinishedBookings}`,
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
                  message: `Failed to find the discount rate for ride code ${result.bookings.rideCode} on booking ID ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                });
              } else {
                rideCodeDiscount = redeemedCode.discount / 100;
              }
              //--------------------------
            }

            const [updatedBooking] = await tx
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
                requiresAdjustment: false,
                status: BookingStatus.IN_PROGRESS,
                updatedAt: new Date(),
              })
              .where(whereClause)
              .returning({ id: bookings.id });
            if (!updatedBooking) {
              throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: `Booking ID ${bookingId} pay status was not successfully updated. Skipped bookings: ${unfinishedBookings}`,
              });
            }

            //--Charge by payment method--
            if (result.bookings.paymentMethod === PaymentMethods.CREDIT_CARD) {
              if (!result.bookings.stripePaymentMethodId) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Booking ID ${bookingId} missing stripe payment ID. Skipped bookings: ${unfinishedBookings}`,
                });
              }

              const paymentMethod = await stripe.paymentMethods.retrieve(
                result.bookings.stripePaymentMethodId,
              );
              if (paymentMethod.customer !== result.user.stripeCustomerId) {
                throw new TRPCError({
                  code: "FORBIDDEN",
                  message: `Payment method ID does not belong to user on booking ID ${bookingId}. Skipped bookings: ${unfinishedBookings}`,
                });
              }

              try {
                const discount =
                  BOOKING_COSTS[result.bookings.bookingType] *
                  100 *
                  rideCodeDiscount;
                const cost =
                  BOOKING_COSTS[result.bookings.bookingType] * 100 - discount;
                const roundedCost = Math.round(cost);
                if (roundedCost >= 50) {
                  //at least $0.50, since that's the minimum amount stripe accepts
                  const paymentIntent = await stripe.paymentIntents.create(
                    {
                      //charge the user's credit card
                      amount: roundedCost,
                      currency: "cad",
                      customer: result.user.stripeCustomerId!,
                      payment_method: result.bookings.stripePaymentMethodId,
                      off_session: true,
                      confirm: true,
                    },
                    {
                      idempotencyKey: `booking-order-${bookingId}-${result.bookings.stripePaymentMethodId}-${roundedCost}`,
                    },
                  );

                  const [insertStripePaymentId] = await tx
                    .update(bookings)
                    .set({
                      stripePaymentIntentId: paymentIntent.id,
                    })
                    .where(eq(bookings.id, bookingId))
                    .returning();
                  if (!insertStripePaymentId) {
                    throw new TRPCError({
                      code: "INTERNAL_SERVER_ERROR",
                      message: `Could not append payment intent ID to booking ${result.bookings.id}. Skipped bookings: ${unfinishedBookings}`,
                    });
                  }
                }
              } catch (error) {
                if (error instanceof TRPCError) {
                  throw error;
                }
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Stripe payment encountered an error on booking ID ${result.bookings.id}. Skipped bookings: ${unfinishedBookings}`,
                });
              }
            } else if (result.bookings.paymentMethod === PaymentMethods.RIDES) {
              if (result.profile.numberOfRides === 0) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Booking ID ${bookingId} does not have enough ride credits to cover the trip. Skipped bookings: ${unfinishedBookings}`,
                });
              }

              const [updatedUser] = await tx
                .update(profile)
                .set({
                  numberOfRides: result.profile.numberOfRides - 1,
                })
                .where(
                  and(
                    eq(profile.belongsTo, result.user.id),
                    gt(profile.numberOfRides, 0),
                  ),
                )
                .returning();

              if (!updatedUser) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Failed to decrement ride credits for user ${result.user.id}. Skipped bookings: ${unfinishedBookings}`,
                });
              }
            }
            //--Charge by payment method--
          });
          unfinishedBookings = unfinishedBookings.filter(
            (id) => id !== bookingId,
          );
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
          const whereClause = and(
            inArray(bookings.id, input.bookingIds),
            eq(bookings.status, BookingStatus.IN_PROGRESS),
          );

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
              message: `Booking IDs not found or not in progress: ${missingBookingIds}`,
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
        .where(eq(bookings.id, input.bookingId));

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
      } else if (bookingToUpdate.requiresAdjustment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already requested adjustment on this booking",
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

        const userSubscriptionInfo = await db
          .select({
            auth: enabledPushNotifications.auth,
            p256dh: enabledPushNotifications.p256dh,
            endpoint: enabledPushNotifications.deviceEndpoint,
          })
          .from(enabledPushNotifications)
          .where(
            and(
              eq(enabledPushNotifications.belongsTo, result.created_by),
              exists(
                //checks if the session id on the enabled push notif record is still valid
                db
                  .select()
                  .from(session)
                  .where(eq(session.id, enabledPushNotifications.sessionId)),
              ),
            ),
          );

        for (const subscription of userSubscriptionInfo) {
          //send a notification to each registered device
          await sendPushNotification({
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
            payload: {
              title: "Requested changes",
              body: "A driver has requested changes to a recently made booking. Open the app to review the changes.",
              url: "/",
            },
          });
        }

        if (result.contactEmail) {
          sendEmail({
            emailAddress: result.contactEmail,
            emailSubject:
              "Booking Changes - Pangnirtung Municipal Taxi Service",
            messageBody: `
            
            <div style="max-width: 600px; margin: 30px auto; padding: 24px; background-color: #ffffff; border-radius: 8px;">
              <h1 style="font-size: 24px; margin: 0 0 12px; color: #222222;">
                A Driver has Requested Changes to Your Booking
              </h1>
              
              <p style="font-size: 16px; margin: 0 0 24px; color: #555555;">
                Please review the requested changes online or in the app. Accept or decline them as needed. 
              </p>
            </div>
            `,
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

import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "~/server/db";
import { rideCodes, user, userUsedRideCode } from "~/server/db/schema";
import {
  MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE,
  RIDE_CREDIT_COST,
} from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});

export const paymentRouter = createTRPCRouter({
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        numberOfRides: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [returnedUser] = await db
        .select({ stripeCustomerId: user.stripeCustomerId })
        .from(user)
        .where(eq(user.id, ctx.session.user.id));

      if (!returnedUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist",
        });
      }

      if (
        input.numberOfRides < 1 ||
        input.numberOfRides > MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Not allowed to purchase ${input.numberOfRides} ride credits`,
        });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: RIDE_CREDIT_COST * input.numberOfRides * 100,
        currency: "cad",
        customer:
          returnedUser.stripeCustomerId === null
            ? undefined
            : returnedUser.stripeCustomerId,
        payment_method_types: ["card"],
        setup_future_usage: "off_session",
        metadata: {
          userId: ctx.session.user.id,
          quantity: input.numberOfRides,
        },
      });
      if (!paymentIntent.client_secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to retrieve client secret",
        });
      }

      const customerSession = await stripe.customerSessions.create({
        customer:
          returnedUser.stripeCustomerId === null
            ? undefined
            : returnedUser.stripeCustomerId,
        components: {
          payment_element: {
            enabled: true,

            features: {
              payment_method_redisplay: "enabled", //display previously saved credit cards during checkout
              payment_method_allow_redisplay_filters: [
                //display previously saved credit cards of all types
                "always",
                "limited",
                "unspecified",
              ],
              payment_method_save: "enabled", //allows users to save new cards during checkout
              payment_method_remove: "enabled", //allows users to remove saved cards during checkout
            },
          },
        },
      });
      if (!customerSession.client_secret) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unable to retrieve client session secret",
        });
      }

      return {
        clientSecret: paymentIntent.client_secret,
        clientSessionSecret: customerSession.client_secret,
      };
    }),
  createSetupIntent: protectedProcedure.mutation(async ({ ctx }) => {
    const [returnedUser] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, ctx.session.user.id));

    if (!returnedUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not exist",
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer:
        returnedUser.stripeCustomerId === null
          ? undefined
          : returnedUser.stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    if (!setupIntent.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to retrieve client secret",
      });
    }

    const customerSession = await stripe.customerSessions.create({
      customer:
        returnedUser.stripeCustomerId === null
          ? undefined
          : returnedUser.stripeCustomerId,
      components: {
        payment_element: {
          enabled: true,

          features: {
            payment_method_redisplay: "enabled", //display previously saved credit cards
            payment_method_allow_redisplay_filters: [
              //display previously saved credit cards of all types
              "always",
              "limited",
              "unspecified",
            ],
            payment_method_remove: "enabled", //allows users to remove saved cards
          },
        },
      },
    });
    if (!customerSession.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to retrieve client session secret",
      });
    }

    return {
      clientSecret: setupIntent.client_secret,
      clientSessionSecret: customerSession.client_secret,
    };
  }),
  createSetupIntentBooking: protectedProcedure.mutation(async ({ ctx }) => {
    const [returnedUser] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, ctx.session.user.id));

    if (!returnedUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not exist",
      });
    }

    const setupIntent = await stripe.setupIntents.create({
      customer:
        returnedUser.stripeCustomerId === null
          ? undefined
          : returnedUser.stripeCustomerId,
      payment_method_types: ["card"],
      usage: "off_session",
    });

    if (!setupIntent.client_secret) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Unable to retrieve client secret",
      });
    }

    return {
      clientSecret: setupIntent.client_secret,
    };
  }),
  getPaymentMethods: protectedProcedure.query(async ({ ctx }) => {
    const [returnedUser] = await db
      .select({ stripeCustomerId: user.stripeCustomerId })
      .from(user)
      .where(eq(user.id, ctx.session.user.id));

    if (!returnedUser) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "User does not exist",
      });
    }

    const paymentMethods = await stripe.paymentMethods.list({
      customer:
        returnedUser.stripeCustomerId === null
          ? undefined
          : returnedUser.stripeCustomerId,
      type: "card",
    });

    return paymentMethods.data.map((paymentMethod) => ({
      id: paymentMethod.id,
      brand: paymentMethod.card?.brand,
      last4: paymentMethod.card?.last4,
      expiry: paymentMethod.card
        ? `${paymentMethod.card.exp_month}/${paymentMethod.card.exp_year} (mm/yyyy)`
        : "",
    }));
  }),
  deletePaymentMethod: protectedProcedure
    .input(
      z.object({
        payment_id: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [returnedUser] = await db
        .select({ stripeCustomerId: user.stripeCustomerId })
        .from(user)
        .where(eq(user.id, ctx.session.user.id));
      if (!returnedUser) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "User does not exist",
        });
      }

      const paymentMethod = await stripe.paymentMethods.retrieve(
        input.payment_id,
      );
      if (paymentMethod.customer !== returnedUser.stripeCustomerId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Payment method ID does not belong to user",
        });
      }

      await stripe.paymentMethods.detach(input.payment_id);
    }),
  getCodeDiscount: protectedProcedure
    .input(
      z.object({
        code: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [retrievedCode] = await db
        .select({ code: rideCodes.code, discount: rideCodes.discount })
        .from(rideCodes)
        .where(eq(rideCodes.code, input.code));

      if (!retrievedCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Code does not exist",
        });
      }

      const [userUsedCode] = await db
        .select()
        .from(userUsedRideCode)
        .where(
          and(
            eq(userUsedRideCode.rideCode, input.code),
            eq(userUsedRideCode.userId, ctx.session.user.id),
          ),
        );

      if (userUsedCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Code already redeemed",
        });
      }

      return {
        code: retrievedCode.code,
        discount: retrievedCode.discount,
      };
    }),
});

import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import Stripe from "stripe";
import { z } from "zod";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});

export const paymentRouter = createTRPCRouter({
  createPaymentIntent: protectedProcedure //todo: implement payment costs
    .input(
      z.object({
        pack: z.enum(["100", "500", "1000"]),
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

      const packs = {
        "100": {
          amount: 100,
          credits: 100,
        },
        "500": {
          amount: 500,
          credits: 500,
        },
        "1000": {
          amount: 1000,
          credits: 1000,
        },
      };

      const pack = packs[input.pack];

      const paymentIntent = await stripe.paymentIntents.create({
        amount: pack.amount,
        currency: "cad",
        customer:
          returnedUser.stripeCustomerId === null
            ? undefined
            : returnedUser.stripeCustomerId,
        payment_method_types: ["card"],
        setup_future_usage: "off_session",
        metadata: {
          userId: ctx.session.user.id,
          purchaseType: "booking", //TODO: make it "ride" if ride
          quantity: 1, //TODO: make it not 1 if ride, unless purchased 1 ride
          cost: 10, //TODO: implement properly
          ridesUsed: 0, //TODO: implement properly (if buying rides, N/A or 0)
        },
        //when doing webhook:
        //grab from the db the newest entry that matches the metadata fields
        //if none exist, we assume then that the booking was not successful but payment was, we initiate a refund based on intentid
        //if we find the row, we add an intent id and change the status to PAID
        //purchases were theres no intent id nor paid status cannot be refunded, maybe tell the user to file a complaint when that happens
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
        console.log("todo: figure out why this could be null");
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
});

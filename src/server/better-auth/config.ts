import { stripe } from "@better-auth/stripe";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import Stripe from "stripe";

import { env } from "~/env";
import { db } from "~/server/db";
import { profile } from "../db/schema";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2026-08-26.dahlia",
});

export const auth = betterAuth({
  appName: "Pangnirtung Municipal Taxi App",
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    phoneNumber({
      sendOTP: async ({ phoneNumber, code }) => {
        console.log(`sending ${code} to ${phoneNumber}`);
      },
      signUpOnVerification: {
        getTempEmail: (phoneNumber) => `${phoneNumber}@no-email-given.pang`,

        getTempName: () => "no-name-given.pang",
      },
    }),
    stripe({
      stripeClient,
      stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
      createCustomerOnSignUp: true,
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          await db.insert(profile).values({
            belongsTo: user.id,
          });
        },
      },
    },
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: "http://localhost:3000/api/auth/callback/github",
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

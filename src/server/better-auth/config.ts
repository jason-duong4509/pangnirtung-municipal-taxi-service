import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { phoneNumber } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { Stripe } from "stripe";
import { env } from "~/env";
import { db } from "~/server/db";
import { profile, user as userTable } from "../db/schema";

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
  ],
  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          try {
            await db.transaction(async (tx) => {
              await tx.insert(profile).values({
                belongsTo: user.id,
              });

              const stripeCustomer = await stripeClient.customers.create();

              await tx
                .update(userTable)
                .set({ stripeCustomerId: stripeCustomer.id })
                .where(eq(userTable.id, user.id));
            });
          } catch (error) {
            try {
              await db.delete(userTable).where(eq(userTable.id, user.id));
            } catch (deleteError) {
              throw new NextResponse(
                "Could not perform failed user creation cleanup. Please contact an admin for assistance",
                {
                  status: 500,
                },
              );
            }
            throw new NextResponse("User creation failed. Please try again", {
              status: 500,
            });
          }
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

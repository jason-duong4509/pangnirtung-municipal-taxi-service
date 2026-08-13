import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { twoFactor, username } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { parsePhoneNumberWithError } from "libphonenumber-js";
import { env } from "~/env";
import { db } from "~/server/db";
import { emailRegex, usernameRegex } from "~/types/validation";
import { profile, user } from "../db/schema";

export const auth = betterAuth({
  appName: "Pangnirtung Municipal Taxi App",
  database: drizzleAdapter(db, {
    provider: "pg", // or "pg" or "mysql"
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: env.BETTER_AUTH_GITHUB_CLIENT_ID,
      clientSecret: env.BETTER_AUTH_GITHUB_CLIENT_SECRET,
      redirectURI: "http://localhost:3000/api/auth/callback/github",
    },
  },
  plugins: [
    username({
      minUsernameLength: 6,
      maxUsernameLength: 20,
      usernameValidator: (username) => usernameRegex.test(username),
    }),
    twoFactor({
      otpOptions: {
        async sendOTP({ user, otp }, ctx) {
          console.log(`otp ${otp} to ${user.email}`); //temp
        },
      },
    }),
  ],
  databaseHooks: {
    user: {
      create: {
        before: async (user, _) => {
          return {
            //Before a user is created, set their 2FA flag to true automatically to enforce 2FA for all users
            data: {
              ...user,
              twoFactorEnabled: true,
            },
          };
        },
        after: async (user) => {
          await db.insert(profile).values({
            userId: user.id,
            isResident: false,
            preferredCommunication: user.email.includes("@no-email-given.pang")
              ? "phone"
              : "email",
          });
        },
      },
    },
  },
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/two-factor/verify-otp") {
        if (
          !(ctx.context.returned instanceof APIError) &&
          ctx.context.newSession
        ) {
          //Better auth didn't throw an error
          const id = ctx.context.newSession.user.id; //id derived from the new session data better auth made for the user
          const [result] = await db
            .select({ preferredCommunication: profile.preferredCommunication })
            .from(profile)
            .where(eq(profile.userId, id))
            .limit(1);

          if (result) {
            let updatedUsers = [];
            if (result.preferredCommunication === "email") {
              //OTP was verified via email
              updatedUsers = await db
                .update(user)
                .set({
                  emailVerified: true,
                })
                .where(eq(user.id, id))
                .returning();
            } else if (result.preferredCommunication === "phone") {
              //OTP was verified via phone
              updatedUsers = await db
                .update(user)
                .set({
                  phoneVerified: true,
                })
                .where(eq(user.id, id))
                .returning();
            }

            if (updatedUsers.length !== 1) {
              throw new APIError("INTERNAL_SERVER_ERROR", {
                message:
                  "Unable to finish verifying preferred method of communication",
              });
            }
          } else {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "User is missing profile data",
            });
          }
        }
      }
    }),
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path === "/sign-up/email") {
        //Endpoint to register an acc was used
        ctx.body.name = ""; //Use a blank name by default since sign-up UI does not have a name field
        ctx.body.displayUsername = ""; //Use a blank value by default since the sign-up UI doesn't use this

        //--Input checks--
        if (ctx.body.username.length < 6) {
          throw new APIError("BAD_REQUEST", {
            message: "Username too short",
          });
        } else if (ctx.body.username.length > 20) {
          throw new APIError("BAD_REQUEST", {
            message: "Username too long",
          });
        } else if (!usernameRegex.test(ctx.body.username)) {
          throw new APIError("BAD_REQUEST", {
            message: "Username is invalid",
          });
        } else if (ctx.body.password.length < 9) {
          throw new APIError("BAD_REQUEST", {
            message: "Password too short",
          });
        } else if (ctx.body.email === "" && ctx.body.phone === "") {
          //Neither email nor phone was given
          throw new APIError("BAD_REQUEST", {
            message: "Email or phone number must be provided",
          });
        } else if (ctx.body.email !== "" && !emailRegex.test(ctx.body.email)) {
          //Email was given and does not match required format
          throw new APIError("BAD_REQUEST", {
            message: "Invalid email",
          });
        } else if (ctx.body.phone !== "") {
          //Phone number was given
          try {
            const phoneNumber = parsePhoneNumberWithError(ctx.body.phone, "CA");
            if (!phoneNumber.isValid()) {
              throw new Error();
            }
          } catch (error) {
            if (error instanceof Error) {
              throw new APIError("BAD_REQUEST", {
                message: "Invalid phone number",
              });
            } else {
              throw new APIError("INTERNAL_SERVER_ERROR", {
                message: `An unexpected error occurred while validating the phone number: ${error}`,
              });
            }
          }
        }
        //----------------

        if (ctx.body.email === "") {
          //No email was given
          ctx.body.email = `${ctx.body.username}@no-email-given.pang`; //Use an invalid email format to represent a null entry
        }

        const result = await db
          .select()
          .from(user)
          .where(eq(user.username, ctx.body.username));

        if (result.length !== 0) {
          //DB query found another user with the same username
          throw new APIError("FORBIDDEN", {
            message: "Username is already taken",
          });
        }
      }
    }),
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        input: true,
        returned: false,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
        returned: false,
      },
    },
  },
});

export type Session = typeof auth.$Infer.Session;

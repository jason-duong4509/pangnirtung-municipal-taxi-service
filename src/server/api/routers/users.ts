import { TRPCError } from "@trpc/server";
import { APIError, generateId } from "better-auth";
import dayjs from "dayjs";
import { desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  checkEmail,
  checkName,
  checkOTP,
  checkPhoneNumber,
} from "~/lib/input-checkers";
import { auth } from "~/server/better-auth";
import { db } from "~/server/db";
import { user, verification } from "~/server/db/schema";
import { UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const usersRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== UserRoles.ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can get user data",
      });
    }

    try {
      const result = await db.select().from(user);

      return result;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get user data",
        cause: error,
      });
    }
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
        phoneNumber: z.string(),
        role: z.nativeEnum(UserRoles),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can change user information",
        });
      }

      //--Input checking--
      let name = "no-name-given.pang" as string;
      if (input.name !== "") {
        const nameCheck = checkName(input.name);
        if (nameCheck.isProper) {
          name = nameCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: nameCheck.errorMessage,
          });
        }
      }
      const phoneNumberCheck = checkPhoneNumber(input.phoneNumber);
      let phoneNumber = "" as string;
      if (phoneNumberCheck.isProper) {
        phoneNumber = phoneNumberCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: phoneNumberCheck.errorMessage,
        });
      }
      let email = `${phoneNumber}@no-email-given.pang` as string;
      if (input.email !== "") {
        const emailCheck = checkEmail(input.email);
        if (emailCheck.isProper) {
          email = emailCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: emailCheck.errorMessage,
          });
        }
      }
      //------------------

      try {
        await db.transaction(async (tx) => {
          const [updatedUserId] = await tx
            .update(user)
            .set({
              name: name,
              email: email,
              phoneNumber: phoneNumber,
              role: input.role,
              updatedAt: new Date(),
            })
            .where(eq(user.id, input.id))
            .returning({ id: user.id });

          if (!updatedUserId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Could not update user ${input.id}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user",
          cause: error,
        });
      }
    }),
  delete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.ids.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No users selected",
        });
      } else if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete users",
        });
      }

      try {
        await db.transaction(async (tx) => {
          const deletedUserIds = await tx
            .delete(user)
            .where(inArray(user.id, input.ids))
            .returning({ id: user.id });

          if (deletedUserIds.length !== input.ids.length) {
            const deletedUsersList = deletedUserIds.map((obj) => obj.id);
            const missingUsersList = input.ids.filter(
              (id) => !deletedUsersList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Users IDs not found: ${missingUsersList}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete users",
          cause: error,
        });
      }
    }),
  add: protectedProcedure
    .input(
      z.object({
        phoneNumber: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can add users",
        });
      }

      //--Input checking--
      const phoneNumberCheck = checkPhoneNumber(input.phoneNumber);
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
        const [insertedUser] = await db
          .insert(user)
          .values({
            id: generateId(),
            name: "no-name-given.pang",
            email: `${phoneNumber}@no-email-given.pang`,
            emailVerified: false,
            image: null,
            createdAt: new Date(),
            updatedAt: new Date(),
            phoneNumber: phoneNumber,
            phoneNumberVerified: true,
            role: UserRoles.MEMBER,
          })
          .returning();

        if (!insertedUser) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database unable to create user",
          });
        }
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user entry",
          cause: error,
        });
      }
    }),
  getSelf: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await db
        .select()
        .from(user)
        .where(eq(user.id, ctx.session.user.id));

      return result;
    } catch (error) {
      if (error instanceof TRPCError) {
        throw error;
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get user data",
        cause: error,
      });
    }
  }),
  updateSelf: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        email: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //--Input checking--
      const [phoneNumberJSON] = await db
        .select({ phoneNumber: user.phoneNumber })
        .from(user)
        .where(eq(user.id, ctx.session.user.id));
      if (!phoneNumberJSON?.phoneNumber) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `User ${ctx.session.user.id} does not have a phone number`,
        });
      }
      let name = "no-name-given.pang" as string;
      if (input.name !== "") {
        const nameCheck = checkName(input.name);
        if (nameCheck.isProper) {
          name = nameCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: nameCheck.errorMessage,
          });
        }
      }
      let email =
        `${phoneNumberJSON.phoneNumber}@no-email-given.pang` as string;
      if (input.email !== "") {
        const emailCheck = checkEmail(input.email);
        if (emailCheck.isProper) {
          email = emailCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: emailCheck.errorMessage,
          });
        }
      }
      //------------------

      try {
        await db.transaction(async (tx) => {
          const [updatedUserId] = await tx
            .update(user)
            .set({
              name: name,
              email: email,
              updatedAt: new Date(),
            })
            .where(eq(user.id, ctx.session.user.id))
            .returning({ id: user.id });

          if (!updatedUserId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Could not update user information`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update user",
          cause: error,
        });
      }
    }),
  changeSelfPhoneNumber: protectedProcedure
    .input(
      z.object({
        newPhoneNumber: z.string(),
        otp: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //--Input checking--
      let phoneNumber = "" as string;
      const phoneNumberCheck = checkPhoneNumber(input.newPhoneNumber);
      if (phoneNumberCheck.isProper) {
        phoneNumber = phoneNumberCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: phoneNumberCheck.errorMessage,
        });
      }
      let otp = "" as string;
      const otpCheck = checkOTP(input.otp);
      if (otpCheck.isProper) {
        otp = otpCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: otpCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [emailJSON] = await db
          .select({ email: user.email })
          .from(user)
          .where(eq(user.id, ctx.session.user.id));
        if (!emailJSON) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `User ${ctx.session.user.id} does not exist in the database`,
          });
        }

        const [otpValidationRow] = await db
          .select()
          .from(verification)
          .where(eq(verification.identifier, phoneNumber))
          .orderBy(desc(verification.expiresAt));
        if (!otpValidationRow) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Could not fetch OTP from the database",
          });
        }

        if (otpValidationRow.value.split(":").length !== 2) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Malformed OTP fetched from database",
          });
        } else if (dayjs().isAfter(otpValidationRow.expiresAt)) {
          try {
            //Will throw because OTP has expired
            await auth.api.verifyPhoneNumber({
              //Call to let better auth run related background jobs
              body: {
                phoneNumber: phoneNumber,
                code: otp,
              },
            });
          } catch {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "OTP has expired",
            });
          }
        } else if (
          !["0", "1", "2"].includes(otpValidationRow.value.split(":")[1]!)
        ) {
          try {
            //Will throw because maxed attempts have been reached on this OTP
            await auth.api.verifyPhoneNumber({
              //Call to let better auth run related background jobs
              body: {
                phoneNumber: phoneNumber,
                code: otp,
              },
            });
          } catch {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Too many attempts made. Please request a new OTP",
            });
          }
        } else if (otpValidationRow.value.split(":")[0] !== otp) {
          try {
            //Will throw because input doesn't match otp
            await auth.api.verifyPhoneNumber({
              //Call to let better auth run related background jobs
              body: {
                phoneNumber: phoneNumber,
                code: otp,
              },
            });
          } catch {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid OTP",
            });
          }
        }

        const [phoneNumberJSON] = await db
          .select({ phoneNumber: user.phoneNumber })
          .from(user)
          .where(eq(user.phoneNumber, phoneNumber));
        if (phoneNumberJSON) {
          const [deletedOTP] = await db
            .delete(verification)
            .where(eq(verification.identifier, phoneNumber))
            .returning({ id: verification.id });

          if (!deletedOTP) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not complete operation in verification table",
            });
          }

          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Phone number is already registered to another account",
          });
        }

        await db.transaction(async (tx) => {
          const [deletedOTP] = await tx
            .delete(verification)
            .where(eq(verification.identifier, phoneNumber))
            .returning({ id: verification.id });

          if (!deletedOTP) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Could not complete operation in verification table",
            });
          }

          const [updatedUserId] = await tx
            .update(user)
            .set({
              phoneNumber: phoneNumber,
              ...(emailJSON.email.includes("@no-email-given.pang")
                ? { email: `${phoneNumber}@no-email-given.pang` }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(user.id, ctx.session.user.id))
            .returning({ id: user.id });

          if (!updatedUserId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Could not change phone number",
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError || error instanceof APIError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to change phone number",
          cause: error,
        });
      }
    }),
});

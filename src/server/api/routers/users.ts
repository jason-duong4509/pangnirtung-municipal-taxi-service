import { TRPCError } from "@trpc/server";
import { generateId } from "better-auth";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { checkEmail, checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { db } from "~/server/db";
import { user } from "~/server/db/schema";
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
      const result = await db.select().from(user).where(eq(user.id, ctx.session.user.id));

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
        phoneNumber: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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
});

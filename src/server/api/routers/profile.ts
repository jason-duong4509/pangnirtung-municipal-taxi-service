import { TRPCError } from "@trpc/server";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { checkName, checkPhoneNumber } from "~/lib/input-checkers";
import { db } from "~/server/db";
import { altContactInfo, bookings, profile } from "~/server/db/schema";
import { UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const profileRouter = createTRPCRouter({
  verifyResident: protectedProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (
        ctx.session.user.role !== UserRoles.ADMIN &&
        ctx.session.user.role !== UserRoles.DRIVER
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Not allowed to verify an account's residency",
        });
      }

      if (input.bookingIds.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No trips selected",
        });
      }

      try {
        await db.transaction(async (tx) => {
          const userIds = await tx
            .select({ id: bookings.created_by, bookingId: bookings.id })
            .from(bookings)
            .where(
              and(
                inArray(bookings.id, input.bookingIds),
                eq(bookings.requestVerification, true),
              ),
            );

          if (userIds.length !== input.bookingIds.length) {
            const bookingIdsList = userIds.map((obj) => obj.bookingId);
            const missingIdsList = input.bookingIds.filter(
              (id) => !bookingIdsList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Booking IDs not found or did not request verification: ${missingIdsList}`,
            });
          }

          const tempList = userIds.map((obj) => obj.id);
          let userIdList = [] as string[];
          for (const id of tempList) {
            if (!userIdList.includes(id)) {
              userIdList = [...userIdList, id];
            }
          }

          const updatedUsers = await tx
            .update(profile)
            .set({
              isResident: true,
            })
            .where(inArray(profile.belongsTo, userIdList))
            .returning();
          if (updatedUsers.length !== userIdList.length) {
            const updatedUsersList = updatedUsers.map((obj) => obj.belongsTo);
            const missingIdsList = userIdList.filter(
              (id) => !updatedUsersList.includes(id),
            );

            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: `Unable to verify residency for users: ${missingIdsList}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify residency",
          cause: error,
        });
      }
    }),
  getNameNumberPresets: protectedProcedure.query(async ({ ctx }) => {
    try {
      const result = await db
        .select({
          name: altContactInfo.name,
          phoneNumber: altContactInfo.phoneNumber,
        })
        .from(altContactInfo)
        .where(eq(altContactInfo.ownedBy, ctx.session.user.id));

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
  deletePreset: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        phoneNumber: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.MEMBER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Member only mutation",
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

      try {
        await db.transaction(async (tx) => {
          const deletedPreset = await tx
            .delete(altContactInfo)
            .where(
              and(
                eq(altContactInfo.ownedBy, ctx.session.user.id),
                eq(altContactInfo.name, name),
                eq(altContactInfo.phoneNumber, phoneNumber),
              ),
            )
            .returning();

          if (deletedPreset.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Preset does not exist",
            });
          } else if (deletedPreset.length > 1) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to delete preset",
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unknown error occured while deleting a preset",
          cause: error,
        });
      }
    }),
  addPreset: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        phoneNumber: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.MEMBER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Member only mutation",
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

      try {
        await db.transaction(async (tx) => {
          const [duplicatePreset] = await tx
            .select({ id: altContactInfo.id })
            .from(altContactInfo)
            .where(
              and(
                eq(altContactInfo.name, name),
                eq(altContactInfo.phoneNumber, phoneNumber),
                eq(altContactInfo.ownedBy, ctx.session.user.id),
              ),
            );
          if (duplicatePreset) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Preset already exists",
            });
          }

          const insertedPreset = await tx
            .insert(altContactInfo)
            .values({
              name: name,
              phoneNumber: phoneNumber,
              ownedBy: ctx.session.user.id,
            })
            .returning();

          if (insertedPreset.length !== 1) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Unable to add preset",
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Unknown error occured while adding a preset",
          cause: error,
        });
      }
    }),
});

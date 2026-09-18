import { TRPCError } from "@trpc/server";
import { z } from "zod";
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
        //TODO: insert update is_resident in profile table
        console.log(`booking ids ${input.bookingIds}`);
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
});

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const profileRouter = createTRPCRouter({
  verifyResident: publicProcedure
    .input(
      z.object({
        bookingIds: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth
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

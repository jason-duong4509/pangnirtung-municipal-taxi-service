import { TRPCError } from "@trpc/server";
import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import { checkIssueTagColor, checkIssueTagName } from "~/lib/input-checkers";
import { db } from "~/server/db";
import { appIssuesTags } from "~/server/db/schema";
import { UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const issueTagRouter = createTRPCRouter({
  getList: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== UserRoles.ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can get issue tags",
      });
    }

    try {
      const result = await db
        .select()
        .from(appIssuesTags)
        .orderBy(asc(appIssuesTags.name), desc(appIssuesTags.id));
      if (result.length === 0) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No issue tags found",
        });
      }

      return result;
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get issue tags",
      });
    }
  }),
  create: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        color: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //--Input checking--
      const tagNameCheck = checkIssueTagName(input.name);
      let tagName = "" as string;
      if (tagNameCheck.isProper) {
        tagName = tagNameCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tagNameCheck.errorMessage,
        });
      }
      const tagColorCheck = checkIssueTagColor(input.color);
      let tagColor = "" as string;
      if (tagColorCheck.isProper) {
        tagColor = tagColorCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tagColorCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [insertedTag] = await db
          .insert(appIssuesTags)
          .values({
            name: tagName,
            colorHex: tagColor,
          })
          .returning();

        return insertedTag;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create app issue tag",
        });
      }
    }),
});

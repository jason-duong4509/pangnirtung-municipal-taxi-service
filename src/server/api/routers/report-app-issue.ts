import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  checkReportAppComments,
  checkReportAppTitle,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import { appIssues } from "~/server/db/schema";
import { createTRPCRouter, publicProcedure } from "../trpc";

export const reportAppRouter = createTRPCRouter({
  createIssue: publicProcedure
    .input(
      z.object({
        title: z.string(),
        comments: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //TODO: add proper auth
      //todo: add rate limiting?

      //--Input checking--
      const reportAppTitleCheck = checkReportAppTitle(input.title);
      let title = undefined as undefined | string;
      if (reportAppTitleCheck.isProper) {
        title = reportAppTitleCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: reportAppTitleCheck.errorMessage,
        });
      }
      const reportAppCommentsCheck = checkReportAppComments(input.comments);
      let comments = undefined as undefined | string;
      if (reportAppCommentsCheck.isProper) {
        comments = reportAppCommentsCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: reportAppCommentsCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [insertedIssue] = await db
          .insert(appIssues)
          .values({
            title: title,
            comments: comments,
            created_by: ctx.session?.user.id ?? "eoirjg", //TODO: change this properly once auth is done and make schema a fk
          })
          .returning();

        return insertedIssue;
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create app issue entry",
        });
      }
    }),
});

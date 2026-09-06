import { TRPCError } from "@trpc/server";
import { eq, getTableColumns, inArray } from "drizzle-orm";
import { z } from "zod";
import {
  checkReportAppComments,
  checkReportAppPriority,
  checkReportAppTags,
  checkReportAppTitle,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import { appIssues, appIssuesHasTags, appIssuesTags } from "~/server/db/schema";
import { UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "../trpc";

export const reportAppRouter = createTRPCRouter({
  get: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.session.user.role !== UserRoles.ADMIN) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only admins can get app issues",
      });
    }

    try {
      const result = await db.query.appIssues.findMany({
        with: {
          appIssuesHasTags: {
            with: {
              appIssuesTags: true,
            },
          },
        },
      });

      return result;
    } catch {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to get app issues",
      });
    }
  }),
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        title: z.string(),
        priority: z.number(),
        tags: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can change app issues",
        });
      }

      //--Input checking--
      const titleCheck = checkReportAppTitle(input.title);
      let title = "" as string;
      if (titleCheck.isProper) {
        title = titleCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: titleCheck.errorMessage,
        });
      }
      const priorityCheck = checkReportAppPriority(input.priority);
      let priority = 1 as number;
      if (priorityCheck.isProper) {
        priority = priorityCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: priorityCheck.errorMessage,
        });
      }
      const tagsCheck = checkReportAppTags(input.tags);
      let tags = [] as string[];
      if (tagsCheck.isProper) {
        tags = tagsCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: tagsCheck.errorMessage,
        });
      }
      //------------------

      try {
        await db.transaction(async (tx) => {
          const [updatedIssueId] = await tx
            .update(appIssues)
            .set({
              title: title,
              priority: priority,
              updatedAt: new Date(),
            })
            .where(eq(appIssues.id, input.id))
            .returning({ id: appIssues.id });

          if (!updatedIssueId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Could not update issue ID ${input.id}`,
            });
          } else {
            await tx
              .delete(appIssuesHasTags)
              .where(eq(appIssuesHasTags.issueId, input.id));
            for (const tag of tags) {
              const [tagId] = await tx
                .select({ id: appIssuesTags.id })
                .from(appIssuesTags)
                .where(eq(appIssuesTags.name, tag));
              if (!tagId) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Unable to retrieve tag ID for tag name ${tag}`,
                });
              }

              const insertedRows = await tx
                .insert(appIssuesHasTags)
                .values({
                  issueId: input.id,
                  tagId: tagId.id,
                })
                .returning();
              if (insertedRows.length !== 1) {
                throw new TRPCError({
                  code: "INTERNAL_SERVER_ERROR",
                  message: `Unable to insert row into relation with issueID ${input.id} and tagID ${tagId.id}`,
                });
              }
            }
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to update issue",
          cause: error,
        });
      }
    }),
  delete: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.number()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.ids.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No issues selected",
        });
      } else if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can delete app issues",
        });
      }

      try {
        await db.transaction(async (tx) => {
          const deletedIssueIds = await tx
            .delete(appIssues)
            .where(inArray(appIssues.id, input.ids))
            .returning({ id: appIssues.id });

          if (deletedIssueIds.length !== input.ids.length) {
            const deletedIssuesList = deletedIssueIds.map((obj) => obj.id);
            const missingIssuesList = input.ids.filter(
              (id) => !deletedIssuesList.includes(id),
            );

            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Issue IDs not found: ${missingIssuesList}`,
            });
          }
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete issues",
          cause: error,
        });
      }
    }),
  createIssue: publicProcedure
    .input(
      z.object({
        comments: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      //todo: add rate limiting?
      //todo: maybe make this a protected procedure?

      //--Input checking--
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
            comments: comments,
            created_by: ctx.session?.user.id ?? null,
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

import { TRPCError } from "@trpc/server";
import { and, asc, count, desc, eq, ilike } from "drizzle-orm";
import { z } from "zod";
import {
  checkPaginationPageNumber,
  checkRedeemCode,
  checkRideCodeDiscount,
  checkRideCodeTableFilters,
} from "~/lib/input-checkers";
import { db } from "~/server/db";
import { rideCodes } from "~/server/db/schema";
import { RideCodeStatus, UserRoles } from "~/types/types";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const rideCodesRouter = createTRPCRouter({
  getAll: protectedProcedure
    .input(
      z.object({
        filter: z.record(z.string(), z.unknown()).optional(),
        pageNumber: z.number(),
        status: z.nativeEnum(RideCodeStatus),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can get ride codes",
        });
      }
      const pageNumCheck = checkPaginationPageNumber(input.pageNumber);
      let pageNum = 1 as number;
      if (pageNumCheck.isProper) {
        pageNum = pageNumCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: pageNumCheck.errorMessage,
        });
      }
      let filters = undefined as
        | undefined
        | Extract<
            ReturnType<typeof checkRideCodeTableFilters>,
            { isProper: true }
          >["formattedInput"];
      if (input.filter) {
        const filterCheck = checkRideCodeTableFilters(input.filter);
        if (filterCheck.isProper) {
          filters = filterCheck.formattedInput;
        } else {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: filterCheck.errorMessage,
          });
        }
      }

      try {
        const pageSize = 30; //hardcoded limit for this query
        const result = await db
          .select()
          .from(rideCodes)
          .orderBy(
            desc(rideCodes.updatedAt),
            asc(rideCodes.code),
            desc(rideCodes.discount),
          )
          .limit(pageSize)
          .offset((pageNum - 1) * pageSize)
          .where(
            and(
              eq(rideCodes.active, input.status === RideCodeStatus.ACTIVE),
              filters === undefined || filters["filter"] === null
                ? undefined
                : filters["filter"] === "Code" && filters["filterKeyword"]
                  ? ilike(rideCodes.code, `%${filters["filterKeyword"]}%`)
                  : filters["filter"] === "Discount" && filters["filterKeyword"]
                    ? eq(rideCodes.discount, filters["filterKeyword"])
                    : undefined,
            ),
          );

        const numberOfRows = await db
          .select({
            count: count(),
          })
          .from(rideCodes)
          .where(
            and(
              eq(rideCodes.active, input.status === RideCodeStatus.ACTIVE),
              filters === undefined || filters["filter"] === null
                ? undefined
                : filters["filter"] === "Code" && filters["filterKeyword"]
                  ? ilike(rideCodes.code, `%${filters["filterKeyword"]}%`)
                  : filters["filter"] === "Discount" && filters["filterKeyword"]
                    ? eq(rideCodes.discount, filters["filterKeyword"])
                    : undefined,
            ),
          );

        return {
          data: result,
          total: numberOfRows[0]?.count ?? 0,
          pageSize: pageSize,
        };
      } catch {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get ride codes",
        });
      }
    }),
  update: protectedProcedure
    .input(
      z.object({
        codes: z.array(z.string()),
        deactivate: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can change ride codes",
        });
      }

      let updateAllSuccessful = true as boolean;
      let updateWarnings = [] as string[];
      for (const code of input.codes) {
        try {
          const codeCheck = checkRedeemCode(code);
          let newCode = "" as string;
          if (codeCheck.isProper) {
            newCode = codeCheck.formattedInput;
          } else {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: codeCheck.errorMessage,
            });
          }

          await db.transaction(async (tx) => {
            const [result] = await tx
              .update(rideCodes)
              .set({
                active: !input.deactivate,
                updatedAt: new Date(),
              })
              .where(eq(rideCodes.code, newCode))
              .returning({ id: rideCodes.code });

            if (!result) {
              throw new TRPCError({
                code: "BAD_REQUEST",
                message: `Could not update ride code ${code}`,
              });
            }
          });
        } catch (error) {
          updateAllSuccessful = false;
          if (error instanceof TRPCError) {
            updateWarnings = [...updateWarnings, error.message];
          } else {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update ride codes",
              cause: error,
            });
          }
        }
      }

      if (updateWarnings.length === input.codes.length) {
        //all failed
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Failed to update ride codes with error: ${updateWarnings}`,
        });
      } else if (!updateAllSuccessful) {
        return {
          warning: `Update partially successful but failed on errors: ${updateWarnings}`,
        };
      }
    }),
  create: protectedProcedure
    .input(
      z.object({
        code: z.string(),
        discount: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.session.user.role !== UserRoles.ADMIN) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can create ride codes",
        });
      }

      //--Input checking--
      const codeCheck = checkRedeemCode(input.code);
      let code = "" as string;
      if (codeCheck.isProper) {
        code = codeCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: codeCheck.errorMessage,
        });
      }
      const discountCheck = checkRideCodeDiscount(input.discount);
      let discount = 1 as number;
      if (discountCheck.isProper) {
        discount = discountCheck.formattedInput;
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: discountCheck.errorMessage,
        });
      }
      //------------------

      try {
        const [duplicateCode] = await db
          .select()
          .from(rideCodes)
          .where(eq(rideCodes.code, code));
        if (duplicateCode) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Code already exists",
          });
        }

        const [result] = await db
          .insert(rideCodes)
          .values({
            code: code,
            discount: discount,
          })
          .returning();

        return result;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create ride code",
          cause: error,
        });
      }
    }),
});

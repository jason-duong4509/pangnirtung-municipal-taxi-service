import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { db } from "~/server/db";
import { profile, rideCreditTransactions } from "~/server/db/schema";
import { MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE } from "~/types/types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  //Runs when a post request is made at this endpoint (/api/stripe/webhook)
  const body = await request.text();

  const signature = request.headers.get("stripe-signature"); //get the stripe header
  if (!signature) {
    return new NextResponse("Missing stripe-signature", {
      status: 400,
    });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      //Verify that the signature in the request body is signed by stripe
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (error) {
    //Signature is not stripe's
    return new NextResponse("Invalid signature", {
      status: 400,
    });
  }

  if (
    event.type === "payment_intent.succeeded" &&
    event.data.object.metadata.quantity
  ) {
    //If stripe responded with a payment succeeded event
    const paymentIntent = event.data.object;
    const userId = paymentIntent.metadata.userId;
    const rideQuantity = Number(paymentIntent.metadata.quantity);

    const invalidRideQuantity =
      isNaN(rideQuantity) ||
      rideQuantity < 1 ||
      rideQuantity > MAX_NUMBER_OF_RIDES_BOUGHT_PER_PURCHASE;
    if (invalidRideQuantity || !userId) {
      return new NextResponse("Invalid ride quantity or missing user ID", {
        status: 400,
      });
    }

    const [paymentTransaction] = await db
      .select({
        id: rideCreditTransactions.id,
      })
      .from(rideCreditTransactions)
      .where(
        and(
          eq(rideCreditTransactions.userId, userId),
          eq(rideCreditTransactions.numberOfRides, rideQuantity),
          eq(rideCreditTransactions.stripePaymentIntentId, paymentIntent.id),
          eq(rideCreditTransactions.claimed, false),
        ),
      );
    if (!paymentTransaction) {
      //Did not find an available transaction
      return new NextResponse("ok", {
        status: 200,
      });
    }

    try {
      await db.transaction(async (tx) => {
        const [updatedRow] = await tx
          .update(rideCreditTransactions)
          .set({
            claimed: true,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(rideCreditTransactions.id, paymentTransaction.id),
              eq(rideCreditTransactions.claimed, false),
            ),
          )
          .returning();

        if (!updatedRow) {
          throw new Error(
            "Encountered unknown error when updating transaction row",
          );
        }

        const [updatedProfileRow] = await tx
          .update(profile)
          .set({
            numberOfRides: sql`${profile.numberOfRides} + ${rideQuantity}`,
          })
          .where(eq(profile.belongsTo, userId))
          .returning();

        if (!updatedProfileRow) {
          throw new Error(
            "Encountered unknown error when adding ride credits to user",
          );
        }
      });
    } catch (error) {
      if (error instanceof Error) {
        return new NextResponse(error.message, {
          status: 500,
        });
      }
      return new NextResponse(
        "An unknown error occurred while processing a stripe ride code request",
        {
          status: 500,
        },
      );
    }
  }

  return new NextResponse("ok", {
    status: 200,
  });
}

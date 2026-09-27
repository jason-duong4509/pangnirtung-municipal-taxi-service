import { NextResponse } from "next/server";
import Stripe from "stripe";

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

  if (event.type === "payment_intent.succeeded") {
    //If stripe responded with a payment succeeded event
    const paymentIntent = event.data.object;
    const orderId = paymentIntent.metadata.orderId;
    //TODO: insert db update call
    //TODO: upon clicking confrim and pay on frontend, have that call the create booking endpoint
    //then, the endpoint will make a booking with a new column PAID? and mark it as unpaid
    //let stripe handle the rest, on success for the stripe form, close and go to the end ui for the booking form
    // when this webhook fires, insert db update call for the corresponding booking and set paid to true
    //after all of this, add refunding via canceling trips and then managing saved credit cards
  }

  return new NextResponse("ok", {
    status: 200,
  });
}

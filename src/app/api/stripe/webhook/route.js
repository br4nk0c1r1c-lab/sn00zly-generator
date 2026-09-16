import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckout, revokeForRefund } from "@/lib/fulfillment";

// Stripe → Developers → Webhooks, endpoint https://schedule.sn00zly.com/api/stripe/webhook
// Events: checkout.session.completed, checkout.session.async_payment_succeeded,
// charge.refunded. Any non-2xx makes Stripe retry.

export async function POST(request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) {
    return NextResponse.json({ error: "Not configured" }, { status: 400 });
  }

  const raw = await request.text();
  let event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("webhook signature check failed:", err.message);
    return NextResponse.json({ error: "Bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const session = event.data.object;
        if (session.mode === "payment") await fulfillCheckout(session.id);
        break;
      }
      case "charge.refunded":
        await revokeForRefund(event.data.object);
        break;
      default:
        break;
    }
  } catch (err) {
    console.error(`webhook ${event.type} failed:`, err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

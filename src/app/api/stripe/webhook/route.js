import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfillCheckout, recordSubscriptionChange } from "@/lib/fulfillment";

// Stripe → Settings → Webhooks, endpoint https://schedule.sn00zly.com/api/stripe/webhook
// Events: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted. Any non-2xx makes Stripe retry.

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
      case "checkout.session.completed": {
        const session = event.data.object;
        if (session.mode === "subscription") await fulfillCheckout(session.id);
        break;
      }
      case "customer.subscription.updated":
        await recordSubscriptionChange(event.data.object, "updated");
        break;
      case "customer.subscription.deleted":
        await recordSubscriptionChange(event.data.object, "deleted");
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

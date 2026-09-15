import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { SITE_URL, PLANNER_PRICE } from "@/lib/site";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

function clip(v, n = 200) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, n) : undefined;
}

export async function POST(request) {
  let payload = {};
  try {
    payload = await request.json();
  } catch {
    // Body is optional.
  }

  const priceId = process.env.STRIPE_PRICE_ID;
  if (!priceId) {
    console.error("checkout: STRIPE_PRICE_ID is not set");
    return NextResponse.json({ error: "Checkout is not available right now" }, { status: 503 });
  }

  // Stripe metadata values are strings up to 500 chars; keep only what the
  // webhook needs for attribution (Klaviyo) and ad matching (Meta CAPI).
  const metadata = { product: "daily_sleep_planner" };
  const utm = payload.utm && typeof payload.utm === "object" ? payload.utm : {};
  for (const key of UTM_KEYS) {
    const v = clip(utm[key]);
    if (v) metadata[key] = v;
  }
  const fbp = clip(request.cookies.get("_fbp")?.value, 300);
  const fbc = clip(request.cookies.get("_fbc")?.value, 300) || clip(payload.fbc, 300);
  if (fbp) metadata.fbp = fbp;
  if (fbc) metadata.fbc = fbc;
  const ip = clip(request.headers.get("x-forwarded-for")?.split(",")[0], 60);
  if (ip) metadata.ip = ip;
  const ua = clip(request.headers.get("user-agent"), 400);
  if (ua) metadata.ua = ua;

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${SITE_URL}/api/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/?checkout=canceled`,
      billing_address_collection: "auto",
      allow_promotion_codes: false,
      metadata,
      subscription_data: { metadata: { product: "daily_sleep_planner" } },
      custom_text: {
        submit: {
          message: `$${PLANNER_PRICE} is charged today and every month after that until you cancel. Cancel anytime from the planner in two clicks.`,
        },
      },
    });
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("checkout create failed:", err);
    return NextResponse.json({ error: "Could not start checkout. Please try again." }, { status: 502 });
  }
}

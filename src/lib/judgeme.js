function formatDate(date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export async function scheduleJudgeMeReview({
  name,
  email,
  delayDays = 7,
}) {
  if (!email) return;

  const fulfilledDate = new Date();

  const sendDate = new Date();
  sendDate.setUTCDate(sendDate.getUTCDate() + delayDays);

  const body = new URLSearchParams({
    api_token: process.env.JUDGEME_API_TOKEN,
    shop_domain: process.env.JUDGEME_SHOP_DOMAIN,
    reviewer_name: name || "Sn00zly Customer",
    reviewer_email: email,
    shopify_product_id: process.env.JUDGEME_PLANNER_PRODUCT_ID,
    product_handle: process.env.JUDGEME_PLANNER_HANDLE,
    fulfilled_at: formatDate(fulfilledDate),
    quantity: "1",
    processed_at: formatDate(sendDate),
  });

  const response = await fetch(
    "https://judge.me/api/orders/send_manual_review_request",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Judge.me review request failed: ${text}`);
  }

  return response.json();
}

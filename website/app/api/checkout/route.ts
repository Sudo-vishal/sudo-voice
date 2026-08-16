import { NextRequest, NextResponse } from "next/server";

// Razorpay order creation. Dormant until RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET
// are set in the Vercel environment — until then every request gets a clean
// 503 the frontend renders as "payments launching soon".
//
// INR amounts in paise, matching the $12 / $99 / $249 site pricing.
const PLANS: Record<string, { amount: number; description: string }> = {
  "pro-monthly": { amount: 99900, description: "SudoVoice Pro — monthly" },
  "pro-annual": { amount: 819900, description: "SudoVoice Pro — annual" },
  lifetime: { amount: 2069900, description: "SudoVoice Lifetime" },
};

export async function POST(req: NextRequest) {
  try {
    const { plan, user_id, email } = await req.json();

    const tier = PLANS[plan as string];
    if (!tier) return NextResponse.json({ error: "unknown plan" }, { status: 400 });
    if (!user_id || !email) {
      // The Razorpay webhook maps payment→account through notes.user_id;
      // checkout without a signed-in user could never activate Pro.
      return NextResponse.json({ error: "sign-in required" }, { status: 401 });
    }

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
      return NextResponse.json({ reason: "payments_not_live" }, { status: 503 });
    }

    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic " + Buffer.from(`${keyId}:${keySecret}`).toString("base64"),
      },
      body: JSON.stringify({
        amount: tier.amount,
        currency: "INR",
        notes: { user_id, email, plan },
      }),
    });
    if (!res.ok) {
      console.error("razorpay order failed:", await res.text());
      return NextResponse.json({ error: "order creation failed" }, { status: 502 });
    }
    const order = await res.json();

    return NextResponse.json({
      key: keyId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      name: "SudoVoice",
      description: tier.description,
      prefillEmail: email,
    });
  } catch (err) {
    console.error("checkout error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}

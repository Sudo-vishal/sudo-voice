// Client-side checkout starter: session check → order from /api/checkout →
// Razorpay modal. Returns a status the pricing UI renders.
import { getSession } from "./supabase-browser";

export type CheckoutResult =
  | { state: "needs-signin" }
  | { state: "soon" }
  | { state: "opened" }
  | { state: "paid" }
  | { state: "error"; message: string };

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export async function startCheckout(
  plan: "pro-monthly" | "pro-annual" | "lifetime",
  onPaid: () => void
): Promise<CheckoutResult> {
  const session = await getSession();
  if (!session) return { state: "needs-signin" };

  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, user_id: session.user.id, email: session.user.email }),
  });
  if (res.status === 503) return { state: "soon" };
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    return { state: "error", message: data.error || `HTTP ${res.status}` };
  }
  const order = await res.json();

  if (!(await loadRazorpayScript()) || !window.Razorpay) {
    return { state: "error", message: "couldn't load payment window" };
  }
  new window.Razorpay({
    key: order.key,
    order_id: order.orderId,
    amount: order.amount,
    currency: order.currency,
    name: order.name,
    description: order.description,
    prefill: { email: order.prefillEmail },
    theme: { color: "#00E676" },
    handler: () => onPaid(), // webhook flips the license; UI just reflects it
  }).open();
  return { state: "opened" };
}

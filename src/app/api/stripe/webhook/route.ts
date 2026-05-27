import { handleStripeWebhook } from "@/lib/stripe-billing";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const result = await handleStripeWebhook(await request.text(), request.headers.get("stripe-signature"));
    return Response.json(result);
  } catch (error) {
    console.error(error);
    return Response.json({ error: error instanceof Error ? error.message : "Stripe webhook failed." }, { status: 400 });
  }
}

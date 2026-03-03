import { NextRequest, NextResponse } from "next/server";
import { dispatchWebhookDeliveries } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handleDispatch(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const batchSizeParam = request.nextUrl.searchParams.get("batch");
  const batchSize = Number.parseInt(batchSizeParam || "", 10);

  const result = await dispatchWebhookDeliveries({
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? Math.min(batchSize, 25)
        : undefined,
  });

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  try {
    return await handleDispatch(request);
  } catch (error) {
    console.error("Webhook dispatcher error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch webhooks." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleDispatch(request);
  } catch (error) {
    console.error("Webhook dispatcher error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch webhooks." },
      { status: 500 }
    );
  }
}


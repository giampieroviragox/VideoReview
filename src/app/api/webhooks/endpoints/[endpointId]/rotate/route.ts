import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWebhookSecret } from "@/lib/webhooks/utils";

export const dynamic = "force-dynamic";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { endpointId } = await params;
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, ownerUserId: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    const signingSecret = generateWebhookSecret();

    await prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: { signingSecret },
    });

    return NextResponse.json({ signingSecret });
  } catch (error) {
    console.error("Webhook endpoint rotate error:", error);
    return NextResponse.json(
      { error: "Failed to rotate webhook secret." },
      { status: 500 }
    );
  }
}


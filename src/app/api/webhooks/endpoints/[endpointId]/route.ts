import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { parseWebhookEvents, validateWebhookUrl } from "@/lib/webhooks/utils";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ endpointId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { endpointId } = await params;
    const body = await request.json();
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, ownerUserId: userId },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    const updated = await prisma.webhookEndpoint.update({
      where: { id: endpointId },
      data: {
        ...(body.url !== undefined ? { url: validateWebhookUrl(body.url) } : {}),
        ...(body.description !== undefined
          ? {
              description:
                typeof body.description === "string" && body.description.trim().length > 0
                  ? body.description.trim()
                  : null,
            }
          : {}),
        ...(body.subscribedEvents !== undefined
          ? { subscribedEvents: parseWebhookEvents(body.subscribedEvents) }
          : {}),
        ...(body.isActive !== undefined ? { isActive: Boolean(body.isActive) } : {}),
      },
      select: {
        id: true,
        url: true,
        description: true,
        subscribedEvents: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({
      endpoint: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update webhook endpoint.";

    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
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

    await prisma.webhookEndpoint.delete({
      where: { id: endpointId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook endpoint delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete webhook endpoint." },
      { status: 500 }
    );
  }
}


import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  WebhookResolutionError,
  WebhookValidationError,
  parseWebhookEvents,
  validateWebhookUrl,
} from "@/lib/webhooks/utils";

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
    const nextUrl =
      body.url !== undefined ? await validateWebhookUrl(body.url) : undefined;
    const existing = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, ownerUserId: userId, campaignId: null },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    if (nextUrl) {
      const duplicate = await prisma.webhookEndpoint.findFirst({
        where: {
          ownerUserId: userId,
          url: nextUrl,
          id: { not: endpointId },
        },
        select: { id: true },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: "This webhook URL is already configured for your account." },
          { status: 409 }
        );
      }
    }

    let updated;

    try {
      updated = await prisma.webhookEndpoint.update({
        where: { id: endpointId },
        data: {
          ...(nextUrl ? { url: nextUrl } : {}),
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "This webhook URL is already configured for your account." },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json({
      endpoint: {
        ...updated,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    if (
      error instanceof WebhookValidationError ||
      error instanceof WebhookResolutionError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to update webhook endpoint.";

    return NextResponse.json({ error: message }, { status: 500 });
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
      where: { id: endpointId, ownerUserId: userId, campaignId: null },
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

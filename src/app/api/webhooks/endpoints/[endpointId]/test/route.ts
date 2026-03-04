import type { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchWebhookDeliveries } from "@/lib/webhooks/dispatch";
import { queueWebhookEvent } from "@/lib/webhooks/emit";
import { WEBHOOK_SCHEMA_VERSION } from "@/lib/webhooks/types";

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
    const endpoint = await prisma.webhookEndpoint.findFirst({
      where: { id: endpointId, ownerUserId: userId, campaignId: null },
      select: {
        id: true,
        url: true,
      },
    });

    if (!endpoint) {
      return NextResponse.json({ error: "Webhook endpoint not found." }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const eventId = crypto.randomUUID();
      const payload = {
        id: eventId,
        type: "webhook.test",
        schemaVersion: WEBHOOK_SCHEMA_VERSION,
        createdAt: new Date().toISOString(),
        data: {
          endpoint: {
            id: endpoint.id,
            url: endpoint.url,
          },
          message: "Tellr webhook test event",
        },
      } satisfies Prisma.InputJsonObject;

      const queued = await queueWebhookEvent({
        tx,
        ownerUserId: userId,
        eventId,
        type: "webhook.test",
        payload,
        endpointIds: [endpoint.id],
      });

      if (!queued.event) {
        return { deliveryIds: [] };
      }

      return { deliveryIds: queued.deliveryIds };
    });

    const dispatch = await dispatchWebhookDeliveries({
      deliveryIds: result.deliveryIds,
      batchSize: result.deliveryIds.length || 1,
    });

    return NextResponse.json({ dispatch });
  } catch (error) {
    console.error("Webhook test error:", error);
    return NextResponse.json(
      { error: "Failed to send webhook test event." },
      { status: 500 }
    );
  }
}

import type { Prisma } from "@prisma/client";
import {
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOK_SCHEMA_VERSION,
  type WebhookEventType,
} from "@/lib/webhooks/types";

type QueueWebhookEventInput = {
  tx: Prisma.TransactionClient;
  ownerUserId: string;
  campaignId?: string | null;
  eventId?: string;
  type: WebhookEventType | "webhook.test";
  payload: Prisma.InputJsonValue;
  endpointIds?: string[];
};

export async function queueWebhookEvent({
  tx,
  ownerUserId,
  campaignId,
  eventId,
  type,
  payload,
  endpointIds,
}: QueueWebhookEventInput) {
  let endpoints: Array<{ id: string }> = [];

  if (Array.isArray(endpointIds) && endpointIds.length > 0) {
    endpoints = await tx.webhookEndpoint.findMany({
      where: {
        ownerUserId,
        id: { in: endpointIds },
      },
      select: { id: true },
    });
  } else if (type === "webhook.test") {
    endpoints = await tx.webhookEndpoint.findMany({
      where: {
        ownerUserId,
        campaignId: null,
        isActive: true,
      },
      select: { id: true },
    });
  } else {
    if (campaignId) {
      const campaignScopedEndpoints = await tx.webhookEndpoint.findMany({
        where: {
          ownerUserId,
          campaignId,
          isActive: true,
          subscribedEvents: { has: type },
        },
        select: { id: true },
      });

      if (campaignScopedEndpoints.length > 0) {
        endpoints = campaignScopedEndpoints;
      }
    }

    if (endpoints.length === 0) {
      endpoints = await tx.webhookEndpoint.findMany({
        where: {
          ownerUserId,
          campaignId: null,
          isActive: true,
          subscribedEvents: { has: type },
        },
        select: { id: true },
      });
    }
  }

  if (endpoints.length === 0) {
    return { event: null, deliveriesCreated: 0, deliveryIds: [] };
  }

  const event = await tx.webhookEvent.create({
    data: {
      ...(eventId ? { id: eventId } : {}),
      ownerUserId,
      type,
      schemaVersion: WEBHOOK_SCHEMA_VERSION,
      payload,
    },
    select: { id: true },
  });

  const deliveries = await Promise.all(
    endpoints.map((endpoint) =>
      tx.webhookDelivery.create({
        data: {
          eventId: event.id,
          endpointId: endpoint.id,
          status: WEBHOOK_DELIVERY_STATUSES.pending,
          nextAttemptAt: new Date(),
        },
        select: { id: true },
      })
    )
  );

  return {
    event,
    deliveriesCreated: deliveries.length,
    deliveryIds: deliveries.map((delivery) => delivery.id),
  };
}

import type { Prisma } from "@prisma/client";
import {
  WEBHOOK_DELIVERY_STATUSES,
  WEBHOOK_SCHEMA_VERSION,
  type WebhookEventType,
} from "@/lib/webhooks/types";

type QueueWebhookEventInput = {
  tx: Prisma.TransactionClient;
  ownerUserId: string | null | undefined;
  eventId?: string;
  type: WebhookEventType | "webhook.test";
  payload: Prisma.InputJsonValue;
  endpointIds?: string[];
};

export async function queueWebhookEvent({
  tx,
  ownerUserId,
  eventId,
  type,
  payload,
  endpointIds,
}: QueueWebhookEventInput) {
  if (!ownerUserId) {
    return { event: null, deliveriesCreated: 0 };
  }

  const endpoints = await tx.webhookEndpoint.findMany({
    where: {
      ownerUserId,
      ...(Array.isArray(endpointIds) && endpointIds.length > 0
        ? { id: { in: endpointIds } }
        : type === "webhook.test"
          ? { isActive: true }
          : {
              isActive: true,
              subscribedEvents: { has: type },
            }),
    },
    select: { id: true },
  });

  if (endpoints.length === 0) {
    return { event: null, deliveriesCreated: 0 };
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

  await tx.webhookDelivery.createMany({
    data: endpoints.map((endpoint) => ({
      eventId: event.id,
      endpointId: endpoint.id,
      status: WEBHOOK_DELIVERY_STATUSES.pending,
      nextAttemptAt: new Date(),
    })),
  });

  return { event, deliveriesCreated: endpoints.length };
}

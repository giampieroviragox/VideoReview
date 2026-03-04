import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/db";
import { signWebhookPayload } from "@/lib/webhooks/sign";
import { WEBHOOK_DELIVERY_STATUSES } from "@/lib/webhooks/types";
import {
  WebhookValidationError,
  validateWebhookUrl,
} from "@/lib/webhooks/utils";

const DELIVERY_BATCH_SIZE = 10;
const LOCK_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 8 * 1000;
const RETRY_DELAYS_MS = [
  60 * 1000,
  5 * 60 * 1000,
  30 * 60 * 1000,
  2 * 60 * 60 * 1000,
];

type DispatchWebhookDeliveriesOptions = {
  batchSize?: number;
  deliveryIds?: string[];
  workerId?: string;
};

function truncateError(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.length > 400 ? `${value.slice(0, 397)}...` : value;
}

async function claimWebhookDeliveries({
  batchSize,
  deliveryIds,
  workerId,
}: Required<DispatchWebhookDeliveriesOptions>) {
  const now = new Date();
  const staleLock = new Date(now.getTime() - LOCK_TTL_MS);

  const candidates = await prisma.webhookDelivery.findMany({
    where: {
      ...(deliveryIds.length > 0 ? { id: { in: deliveryIds } } : {}),
      nextAttemptAt: { lte: now },
      OR: [
        {
          status: {
            in: [
              WEBHOOK_DELIVERY_STATUSES.pending,
              WEBHOOK_DELIVERY_STATUSES.failed,
            ],
          },
          lockedAt: null,
        },
        {
          status: WEBHOOK_DELIVERY_STATUSES.processing,
          lockedAt: { lt: staleLock },
        },
      ],
    },
    orderBy: { createdAt: "asc" },
    take: batchSize,
    select: { id: true },
  });

  if (candidates.length === 0) {
    return [];
  }

  const candidateIds = candidates.map((delivery) => delivery.id);

  await prisma.webhookDelivery.updateMany({
    where: {
      id: { in: candidateIds },
      OR: [
        {
          status: {
            in: [
              WEBHOOK_DELIVERY_STATUSES.pending,
              WEBHOOK_DELIVERY_STATUSES.failed,
            ],
          },
          lockedAt: null,
        },
        {
          status: WEBHOOK_DELIVERY_STATUSES.processing,
          lockedAt: { lt: staleLock },
        },
      ],
    },
    data: {
      status: WEBHOOK_DELIVERY_STATUSES.processing,
      lockedAt: now,
      lockedBy: workerId,
    },
  });

  return prisma.webhookDelivery.findMany({
    where: {
      id: { in: candidateIds },
      lockedBy: workerId,
    },
    include: {
      endpoint: true,
      event: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

function getNextRetryTime(attemptCount: number) {
  const delay = RETRY_DELAYS_MS[attemptCount - 1];

  if (!delay) {
    return null;
  }

  return new Date(Date.now() + delay);
}

async function markWebhookDeliverySuccess(
  deliveryId: string,
  responseStatus: number
) {
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: WEBHOOK_DELIVERY_STATUSES.success,
      attemptCount: { increment: 1 },
      responseStatus,
      lastError: null,
      lastAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function markWebhookDeliveryFailure(
  deliveryId: string,
  currentAttemptCount: number,
  responseStatus: number | null,
  errorMessage: string
) {
  const nextAttemptCount = currentAttemptCount + 1;
  const nextAttemptAt = getNextRetryTime(nextAttemptCount);

  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: nextAttemptAt
        ? WEBHOOK_DELIVERY_STATUSES.failed
        : WEBHOOK_DELIVERY_STATUSES.dead,
      attemptCount: nextAttemptCount,
      responseStatus,
      lastError: truncateError(errorMessage),
      nextAttemptAt: nextAttemptAt ?? new Date(),
      lastAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function markWebhookDeliveryDead(
  deliveryId: string,
  currentAttemptCount: number,
  errorMessage: string
) {
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: {
      status: WEBHOOK_DELIVERY_STATUSES.dead,
      attemptCount: currentAttemptCount + 1,
      responseStatus: null,
      lastError: truncateError(errorMessage),
      nextAttemptAt: new Date(),
      lastAttemptAt: new Date(),
      lockedAt: null,
      lockedBy: null,
    },
  });
}

async function deliverWebhook(delivery: Awaited<ReturnType<typeof claimWebhookDeliveries>>[number]) {
  if (!delivery.endpoint.isActive) {
    await markWebhookDeliveryDead(
      delivery.id,
      delivery.attemptCount,
      "Endpoint is disabled."
    );
    return {
      id: delivery.id,
      status: WEBHOOK_DELIVERY_STATUSES.dead,
      responseStatus: null,
    };
  }

  const body = JSON.stringify(delivery.event.payload);
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = signWebhookPayload(body, delivery.endpoint.signingSecret, timestamp);

  try {
    const targetUrl = await validateWebhookUrl(delivery.endpoint.url);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Tellr-Webhooks/1.0",
        "X-Tellr-Event": delivery.event.type,
        "X-Tellr-Event-Id": delivery.event.id,
        "X-Tellr-Delivery-Id": delivery.id,
        "X-Tellr-Attempt": String(delivery.attemptCount + 1),
        "X-Tellr-Timestamp": String(timestamp),
        "X-Tellr-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.ok) {
      await markWebhookDeliverySuccess(delivery.id, response.status);
      return {
        id: delivery.id,
        status: WEBHOOK_DELIVERY_STATUSES.success,
        responseStatus: response.status,
      };
    }

    const responseText = truncateError(await response.text());

    await markWebhookDeliveryFailure(
      delivery.id,
      delivery.attemptCount,
      response.status,
      responseText || `Endpoint responded with HTTP ${response.status}.`
    );

    return {
      id: delivery.id,
      status: WEBHOOK_DELIVERY_STATUSES.failed,
      responseStatus: response.status,
    };
  } catch (error) {
    if (error instanceof WebhookValidationError) {
      await markWebhookDeliveryDead(
        delivery.id,
        delivery.attemptCount,
        error.message
      );

      return {
        id: delivery.id,
        status: WEBHOOK_DELIVERY_STATUSES.dead,
        responseStatus: null,
      };
    }

    const message =
      error instanceof Error ? error.message : "Webhook delivery request failed.";

    await markWebhookDeliveryFailure(
      delivery.id,
      delivery.attemptCount,
      null,
      message
    );

    return {
      id: delivery.id,
      status: WEBHOOK_DELIVERY_STATUSES.failed,
      responseStatus: null,
    };
  }
}

export async function dispatchWebhookDeliveries(
  options: DispatchWebhookDeliveriesOptions = {}
) {
  const workerId = options.workerId ?? randomUUID();
  const claimed = await claimWebhookDeliveries({
    batchSize: options.batchSize ?? DELIVERY_BATCH_SIZE,
    deliveryIds: options.deliveryIds ?? [],
    workerId,
  });

  const results = [];

  for (const delivery of claimed) {
    results.push(await deliverWebhook(delivery));
  }

  return {
    workerId,
    claimedCount: claimed.length,
    processedCount: results.length,
    results,
  };
}

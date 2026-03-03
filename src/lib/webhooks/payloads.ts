import type { Prisma } from "@prisma/client";
import { WEBHOOK_SCHEMA_VERSION, type WebhookEventType } from "@/lib/webhooks/types";

type BuildSubmissionWebhookPayloadInput = {
  eventId?: string;
  type: WebhookEventType;
  campaign: {
    id: string;
    name: string;
  };
  submission: {
    id: string;
    reviewerName: string;
    reviewerEmail: string;
    reviewerRating: number | null;
    status: string;
    videoKey: string;
    durationSeconds: number | null;
    answers: unknown;
    createdAt: Date;
  };
};

export function buildSubmissionWebhookPayload({
  eventId,
  type,
  campaign,
  submission,
}: BuildSubmissionWebhookPayloadInput) {
  const payload = {
    id: eventId ?? crypto.randomUUID(),
    type,
    schemaVersion: WEBHOOK_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    data: {
      campaign,
      submission: {
        id: submission.id,
        reviewerName: submission.reviewerName,
        reviewerEmail: submission.reviewerEmail,
        reviewerRating: submission.reviewerRating,
        status: submission.status,
        videoKey: submission.videoKey,
        durationSeconds: submission.durationSeconds,
        answers: submission.answers as Prisma.InputJsonValue,
        createdAt: submission.createdAt.toISOString(),
      },
    },
  };

  return payload as Prisma.InputJsonObject;
}

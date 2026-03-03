export const WEBHOOK_EVENT_TYPES = [
  "submission.created",
  "submission.approved",
] as const;

export const WEBHOOK_DELIVERY_STATUSES = {
  pending: "PENDING",
  processing: "PROCESSING",
  success: "SUCCESS",
  failed: "FAILED",
  dead: "DEAD",
} as const;

export const WEBHOOK_SCHEMA_VERSION = 1;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

export type SubmissionWebhookPayload = {
  id: string;
  type: WebhookEventType | "webhook.test";
  schemaVersion: number;
  createdAt: string;
  data: {
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
      createdAt: string;
    };
  };
};

export type WebhookTestPayload = {
  id: string;
  type: "webhook.test";
  schemaVersion: number;
  createdAt: string;
  data: {
    endpoint: {
      id: string;
      url: string;
    };
    message: string;
  };
};

export function isWebhookEventType(value: string): value is WebhookEventType {
  return WEBHOOK_EVENT_TYPES.includes(value as WebhookEventType);
}


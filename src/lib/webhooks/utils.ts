import { randomBytes } from "node:crypto";
import net from "node:net";
import {
  WEBHOOK_EVENT_TYPES,
  type WebhookEventType,
} from "@/lib/webhooks/types";

const DEFAULT_WEBHOOK_EVENTS = [...WEBHOOK_EVENT_TYPES];
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "0.0.0.0",
  "127.0.0.1",
  "::1",
]);

function isPrivateIpv4(value: string) {
  const octets = value.split(".").map((part) => Number(part));

  if (octets.length !== 4 || octets.some((part) => Number.isNaN(part))) {
    return false;
  }

  const [first, second] = octets;

  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

function isBlockedIpAddress(value: string) {
  if (net.isIP(value) === 4) {
    return isPrivateIpv4(value);
  }

  if (net.isIP(value) === 6) {
    const normalized = value.toLowerCase();
    return normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd");
  }

  return false;
}

export function generateWebhookSecret() {
  return `whsec_${randomBytes(24).toString("hex")}`;
}

export function parseWebhookEvents(value: unknown): WebhookEventType[] {
  if (!Array.isArray(value)) {
    return DEFAULT_WEBHOOK_EVENTS;
  }

  const normalized = value
    .flatMap((entry) => (typeof entry === "string" ? [entry] : []))
    .filter((entry): entry is WebhookEventType =>
      WEBHOOK_EVENT_TYPES.includes(entry as WebhookEventType)
    );

  return normalized.length > 0 ? Array.from(new Set(normalized)) : DEFAULT_WEBHOOK_EVENTS;
}

export function validateWebhookUrl(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Webhook URL is required.");
  }

  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Webhook URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Webhook URL must use HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Webhook URL cannot include embedded credentials.");
  }

  const hostname = parsed.hostname.toLowerCase();

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Webhook URL hostname is not allowed.");
  }

  if (isBlockedIpAddress(hostname)) {
    throw new Error("Webhook URL must not target private network addresses.");
  }

  parsed.hash = "";

  return parsed.toString();
}


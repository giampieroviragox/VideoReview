import { randomBytes } from "node:crypto";
import dns from "node:dns/promises";
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

export class WebhookValidationError extends Error {}

export class WebhookResolutionError extends Error {}

function normalizeHostname(value: string) {
  return value.trim().toLowerCase().replace(/\.+$/, "");
}

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
  const normalizedValue = value.toLowerCase();

  if (net.isIP(value) === 4) {
    return isPrivateIpv4(value);
  }

  if (net.isIP(value) === 6) {
    if (
      normalizedValue === "::" ||
      normalizedValue === "::1" ||
      normalizedValue.startsWith("fc") ||
      normalizedValue.startsWith("fd") ||
      normalizedValue.startsWith("fe8") ||
      normalizedValue.startsWith("fe9") ||
      normalizedValue.startsWith("fea") ||
      normalizedValue.startsWith("feb")
    ) {
      return true;
    }

    if (normalizedValue.startsWith("::ffff:")) {
      return isPrivateIpv4(normalizedValue.slice("::ffff:".length));
    }
  }

  return false;
}

async function resolvePublicIpAddresses(hostname: string) {
  try {
    const resolved = await dns.lookup(hostname, {
      all: true,
      verbatim: true,
    });

    if (resolved.length === 0) {
      throw new WebhookResolutionError("Webhook URL hostname could not be resolved.");
    }

    return resolved.map((entry) => entry.address);
  } catch (error) {
    if (error instanceof WebhookResolutionError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new WebhookResolutionError(
        `Webhook URL hostname could not be resolved: ${error.message}`
      );
    }

    throw new WebhookResolutionError("Webhook URL hostname could not be resolved.");
  }
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

export async function validateWebhookUrl(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new WebhookValidationError("Webhook URL is required.");
  }

  let parsed: URL;

  try {
    parsed = new URL(value.trim());
  } catch {
    throw new WebhookValidationError("Webhook URL must be a valid absolute URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new WebhookValidationError("Webhook URL must use HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new WebhookValidationError("Webhook URL cannot include embedded credentials.");
  }

  const hostname = normalizeHostname(parsed.hostname);

  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new WebhookValidationError("Webhook URL hostname is not allowed.");
  }

  if (isBlockedIpAddress(hostname)) {
    throw new WebhookValidationError(
      "Webhook URL must not target private network addresses."
    );
  }

  const resolvedAddresses = await resolvePublicIpAddresses(hostname);

  if (resolvedAddresses.some((address) => isBlockedIpAddress(address))) {
    throw new WebhookValidationError(
      "Webhook URL must not resolve to private network addresses."
    );
  }

  parsed.hostname = hostname;
  parsed.hash = "";

  return parsed.toString();
}

import { createHmac } from "node:crypto";

export function signWebhookPayload(
  payload: string,
  secret: string,
  timestamp: number
) {
  const signedContent = `${timestamp}.${payload}`;
  const signature = createHmac("sha256", secret).update(signedContent).digest("hex");

  return `sha256=${signature}`;
}


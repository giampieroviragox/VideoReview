import { after } from "next/server";
import { dispatchWebhookDeliveries } from "@/lib/webhooks/dispatch";

export function triggerWebhookDispatchAfterResponse(deliveryIds: string[]) {
  if (deliveryIds.length === 0) {
    return;
  }

  after(async () => {
    try {
      await dispatchWebhookDeliveries({
        deliveryIds,
        batchSize: deliveryIds.length,
      });
    } catch (error) {
      console.error("Webhook post-response dispatch failed:", error);
    }
  });
}

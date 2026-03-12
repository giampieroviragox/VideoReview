import { after } from "next/server";
import { processSubmissionAiEnrichment } from "@/lib/ai/submissions";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";

export function triggerSubmissionAiAfterResponse(submissionId: string) {
  if (!submissionId || !isOpenRouterConfigured()) {
    return;
  }

  after(async () => {
    try {
      await processSubmissionAiEnrichment({ submissionId });
    } catch (error) {
      console.error("AI post-response processing failed:", error);
    }
  });
}

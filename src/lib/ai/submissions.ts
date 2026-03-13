import type { SubmissionAiStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { generateDownloadUrl } from "@/lib/s3";
import {
  extractSubmissionInsightsFromAudio,
  hasOpenRouterApiKey,
  isOpenRouterConfigured,
} from "@/lib/ai/openrouter";
import { extractAudioFromVideoUrl } from "@/lib/ai/audio";

const PROCESSABLE_AI_STATUSES: SubmissionAiStatus[] = ["PENDING", "FAILED"];
const PENDING_AI_STATUS: SubmissionAiStatus[] = ["PENDING"];

type SubmissionAiProcessResult = {
  submissionId: string;
  status: "processed" | "failed" | "skipped";
  reason?: string;
};

function compactErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message.slice(0, 500);
  }

  if (typeof error === "string" && error.trim().length > 0) {
    return error.trim().slice(0, 500);
  }

  return "Unknown AI processing error.";
}

export async function processSubmissionAiEnrichment({
  submissionId,
  force = false,
  ignoreFeatureFlag = false,
}: {
  submissionId: string;
  force?: boolean;
  ignoreFeatureFlag?: boolean;
}): Promise<SubmissionAiProcessResult> {
  const aiReady = ignoreFeatureFlag
    ? hasOpenRouterApiKey()
    : isOpenRouterConfigured();

  if (!aiReady) {
    return {
      submissionId,
      status: "skipped",
      reason: ignoreFeatureFlag
        ? "OPENROUTER_API_KEY is not configured."
        : "AI feature is disabled.",
    };
  }

  const claimed = await prisma.submission.updateMany({
    where: force
      ? {
          id: submissionId,
          aiStatus: {
            not: "PROCESSING",
          },
        }
      : {
          id: submissionId,
          aiStatus: {
            in: PROCESSABLE_AI_STATUSES,
          },
        },
    data: {
      aiStatus: "PROCESSING",
      aiError: null,
    },
  });

  if (claimed.count === 0) {
    return {
      submissionId,
      status: "skipped",
      reason: "Submission is not eligible for AI processing.",
    };
  }

  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true,
      videoKey: true,
    },
  });

  if (!submission) {
    return {
      submissionId,
      status: "skipped",
      reason: "Submission not found.",
    };
  }

  try {
    const videoUrl = await generateDownloadUrl(submission.videoKey);
    const extractedAudio = await extractAudioFromVideoUrl(videoUrl);
    const extracted = await extractSubmissionInsightsFromAudio({
      audioBase64: extractedAudio.audioBase64,
      format: extractedAudio.format,
    });

    if (!extracted.transcript && !extracted.generatedReview) {
      throw new Error("AI extraction returned no transcript and no review.");
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiStatus: "COMPLETED",
        aiTranscript: extracted.transcript,
        aiGeneratedReview: extracted.generatedReview,
        aiKeyPhrase: extracted.keyPhrase,
        aiModel: extracted.model,
        aiError: null,
        aiProcessedAt: new Date(),
      },
    });

    return {
      submissionId,
      status: "processed",
    };
  } catch (error) {
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiStatus: "FAILED",
        aiError: compactErrorMessage(error),
      },
    });

    return {
      submissionId,
      status: "failed",
      reason: compactErrorMessage(error),
    };
  }
}

export async function processPendingSubmissionAiBatch({
  batchSize = 5,
  includeFailed = true,
  includeNotRequested = false,
  ignoreFeatureFlag = false,
  submissionId,
}: {
  batchSize?: number;
  includeFailed?: boolean;
  includeNotRequested?: boolean;
  ignoreFeatureFlag?: boolean;
  submissionId?: string;
} = {}) {
  const aiReady = ignoreFeatureFlag
    ? hasOpenRouterApiKey()
    : isOpenRouterConfigured();

  if (!aiReady) {
    return {
      configured: false,
      candidates: 0,
      results: [] as SubmissionAiProcessResult[],
    };
  }

  if (submissionId) {
    const result = await processSubmissionAiEnrichment({
      submissionId,
      force: true,
      ignoreFeatureFlag,
    });

    return {
      configured: true,
      candidates: 1,
      results: [result],
    };
  }

  const statuses: SubmissionAiStatus[] = [
    ...PENDING_AI_STATUS,
    ...(includeFailed ? (["FAILED"] as SubmissionAiStatus[]) : []),
    ...(includeNotRequested ? (["NOT_REQUESTED"] as SubmissionAiStatus[]) : []),
  ];

  const submissions = await prisma.submission.findMany({
    where: {
      aiStatus: {
        in: statuses,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
    take: Math.max(1, Math.min(batchSize, 20)),
    select: {
      id: true,
    },
  });

  const results: SubmissionAiProcessResult[] = [];
  for (const submission of submissions) {
    const result = await processSubmissionAiEnrichment({
      submissionId: submission.id,
      force: includeNotRequested,
      ignoreFeatureFlag,
    });
    results.push(result);
  }

  return {
    configured: true,
    candidates: submissions.length,
    results,
  };
}

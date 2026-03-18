import { auth, currentUser } from "@clerk/nextjs/server";
import { getCampaignDelegate, prisma } from "@/lib/db";
import { buildCampaignPublicPath } from "@/lib/campaigns";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

type RuntimeCampaign = {
  id: string;
  name: string;
  description: string | null;
  rewardText: string;
  rewardValue: string | null;
  hasNoEndDate: boolean;
  endsAt: Date | null;
  questions: Array<{
    id: string;
    text: string;
    required: boolean;
    sortOrder: number;
  }>;
  webhookEndpoint: {
    id: string;
    url: string;
    description: string | null;
    subscribedEvents: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  } | null;
  submissions: Array<{
    id: string;
    reviewerName: string;
    reviewerEmail: string;
    reviewerRating: number | null;
    status: string;
    videoKey: string;
    durationSeconds: number | null;
    aiStatus: string;
    aiError: string | null;
    aiGeneratedReview: string | null;
    aiKeyPhrase: string | null;
    aiTranscript: string | null;
    aiProcessedAt: Date | null;
    answers: unknown;
    createdAt: Date;
  }>;
};

type CampaignDashboardRuntimeDelegate = {
  findMany: (args: unknown) => Promise<RuntimeCampaign[]>;
};

function parseSubmissionAnswers(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry, index) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }

    const candidate = entry as Record<string, unknown>;

    return [
      {
        questionId:
          typeof candidate.questionId === "string" ? candidate.questionId : `answer-${index}`,
        questionText:
          typeof candidate.questionText === "string" ? candidate.questionText : "Question",
        answer: typeof candidate.answer === "string" ? candidate.answer : "",
        required: Boolean(candidate.required),
      },
    ];
  });
}

export default async function DashboardPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const user = await currentUser();
  const viewerName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress ||
    "Account";

  const campaignDelegate = getCampaignDelegate() as unknown as
    | CampaignDashboardRuntimeDelegate
    | undefined;

  let workspaceName = DEFAULT_WORKSPACE.brandName;
  try {
    const profile = await prisma.brandProfile.findUnique({
      where: { ownerUserId: userId },
      select: { brandName: true },
    });
    if (profile?.brandName) {
      workspaceName = profile.brandName;
    }
  } catch (error) {
    console.error("Dashboard brand profile query failed:", error);
  }

  let campaignQueryFailed = false;
  let campaigns: RuntimeCampaign[] = [];

  if (campaignDelegate) {
    try {
      campaigns = await campaignDelegate.findMany({
        where: { ownerUserId: userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          description: true,
          rewardText: true,
          rewardValue: true,
          hasNoEndDate: true,
          endsAt: true,
          questions: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true,
              text: true,
              required: true,
              sortOrder: true,
            },
          },
          webhookEndpoint: {
            select: {
              id: true,
              url: true,
              description: true,
              subscribedEvents: true,
              isActive: true,
              createdAt: true,
              updatedAt: true,
            },
          },
          submissions: {
            orderBy: { createdAt: "desc" },
            select: {
              id: true,
              reviewerName: true,
              reviewerEmail: true,
              reviewerRating: true,
              status: true,
              videoKey: true,
              durationSeconds: true,
              aiStatus: true,
              aiError: true,
              aiGeneratedReview: true,
              aiKeyPhrase: true,
              aiTranscript: true,
              aiProcessedAt: true,
              answers: true,
              createdAt: true,
            },
          },
        },
      });
    } catch (error) {
      campaignQueryFailed = true;
      console.error("Dashboard campaign query failed:", error);
    }
  }

  const campaignRows = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    rewardText: campaign.rewardText,
    rewardValue: campaign.rewardValue,
    hasNoEndDate: campaign.hasNoEndDate,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    questions: campaign.questions.map((question) => ({
      id: question.id,
      text: question.text,
      required: question.required,
      sortOrder: question.sortOrder,
    })),
    publicPath: buildCampaignPublicPath(campaign.id),
    webhookEndpoint: campaign.webhookEndpoint
      ? {
          id: campaign.webhookEndpoint.id,
          url: campaign.webhookEndpoint.url,
          description: campaign.webhookEndpoint.description,
          subscribedEvents: campaign.webhookEndpoint.subscribedEvents,
          isActive: campaign.webhookEndpoint.isActive,
          createdAt: campaign.webhookEndpoint.createdAt.toISOString(),
          updatedAt: campaign.webhookEndpoint.updatedAt.toISOString(),
        }
      : null,
    submissions: campaign.submissions.map((submission) => ({
      id: submission.id,
      reviewerName: submission.reviewerName,
      reviewerEmail: submission.reviewerEmail,
      reviewerRating: submission.reviewerRating,
      status: submission.status,
      videoKey: submission.videoKey,
      durationSeconds: submission.durationSeconds,
      aiStatus: submission.aiStatus,
      aiError: submission.aiError,
      aiGeneratedReview: submission.aiGeneratedReview,
      aiKeyPhrase: submission.aiKeyPhrase,
      aiTranscript: submission.aiTranscript,
      aiProcessedAt: submission.aiProcessedAt
        ? submission.aiProcessedAt.toISOString()
        : null,
      answers: parseSubmissionAnswers(submission.answers),
      createdAt: submission.createdAt.toISOString(),
    })),
  }));

  return (
    <DashboardShell
      viewerName={viewerName}
      workspaceName={workspaceName}
      campaignRuntimeReady={Boolean(campaignDelegate) && !campaignQueryFailed}
      campaigns={campaignRows}
    />
  );
}

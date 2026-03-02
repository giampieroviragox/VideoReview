import { getCampaignDelegate } from "@/lib/db";
import { buildCampaignPublicPath } from "@/lib/campaigns";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";
import DashboardShell from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

type RuntimeCampaign = {
  id: string;
  name: string;
  hasNoEndDate: boolean;
  endsAt: Date | null;
  submissions: Array<{
    id: string;
    reviewerName: string;
    reviewerEmail: string;
    reviewerRating: number | null;
    status: string;
    videoKey: string;
    durationSeconds: number | null;
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
  const campaignDelegate = getCampaignDelegate() as unknown as
    | CampaignDashboardRuntimeDelegate
    | undefined;

  let campaignQueryFailed = false;
  let campaigns: RuntimeCampaign[] = [];

  if (campaignDelegate) {
    try {
      campaigns = await campaignDelegate.findMany({
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          hasNoEndDate: true,
          endsAt: true,
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
    hasNoEndDate: campaign.hasNoEndDate,
    endsAt: campaign.endsAt ? campaign.endsAt.toISOString() : null,
    publicPath: buildCampaignPublicPath(campaign.id),
    submissions: campaign.submissions.map((submission) => ({
      id: submission.id,
      reviewerName: submission.reviewerName,
      reviewerEmail: submission.reviewerEmail,
      reviewerRating: submission.reviewerRating,
      status: submission.status,
      videoKey: submission.videoKey,
      durationSeconds: submission.durationSeconds,
      answers: parseSubmissionAnswers(submission.answers),
      createdAt: submission.createdAt.toISOString(),
    })),
  }));

  return (
    <DashboardShell
      workspaceName={DEFAULT_WORKSPACE.brandName}
      campaignRuntimeReady={Boolean(campaignDelegate) && !campaignQueryFailed}
      campaigns={campaignRows}
    />
  );
}

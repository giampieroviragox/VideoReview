import { getCampaignDelegate, prisma } from "@/lib/db";
import { buildCampaignPublicPath } from "@/lib/campaigns";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";
import { unstable_cache } from "next/cache";

type RuntimeCampaign = {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  inviteMessage: string;
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
  submissions?: Array<{
    id: string;
    reviewerRating: number | null;
    status: string;
    createdAt: Date;
  }>;
};

type CampaignDashboardRuntimeDelegate = {
  findMany: (args: unknown) => Promise<RuntimeCampaign[]>;
  findFirst: (args: unknown) => Promise<
    | {
        id: string;
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
      }
    | null
  >;
};

export type DashboardCampaignRow = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  inviteMessage: string;
  rewardText: string;
  rewardValue: string | null;
  hasNoEndDate: boolean;
  endsAt: string | null;
  questions: Array<{
    id: string;
    text: string;
    required: boolean;
    sortOrder: number;
  }>;
  publicPath: string;
  webhookEndpoint: {
    id: string;
    url: string;
    description: string | null;
    subscribedEvents: string[];
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  } | null;
  submissionSummary: {
    total: number;
    approved: number;
    avgRating: number;
    thisWeek: number;
  };
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
    aiProcessedAt: string | null;
    answers: Array<{
      questionId: string;
      questionText: string;
      answer: string;
      required: boolean;
    }>;
    createdAt: string;
  }>;
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

async function getDashboardDataForUserUncached(
  userId: string,
  options?: { detailCampaignId?: string; light?: boolean }
) {
  const includeSubmissions = !options?.light;
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
      const campaignSelect: Record<string, unknown> = {
        id: true,
        name: true,
        description: true,
        createdAt: true,
        inviteMessage: true,
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
      };

      if (includeSubmissions) {
        campaignSelect.submissions = {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            reviewerRating: true,
            status: true,
            createdAt: true,
          },
        };
      }

      campaigns = await campaignDelegate.findMany({
        where: { ownerUserId: userId },
        orderBy: { createdAt: "desc" },
        select: campaignSelect,
      });
    } catch (error) {
      campaignQueryFailed = true;
      console.error("Dashboard campaign query failed:", error);
    }
  }

  const campaignIds = campaigns.map((campaign) => campaign.id);
  const submissionSummaryMap = new Map<
    string,
    { total: number; approved: number; avgRating: number; thisWeek: number }
  >();

  if (campaignIds.length > 0) {
    try {
      const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [totals, approved, thisWeek] = await Promise.all([
        prisma.submission.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: {
              in: campaignIds,
            },
          },
          _count: {
            _all: true,
          },
          _avg: {
            reviewerRating: true,
          },
        }),
        prisma.submission.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: {
              in: campaignIds,
            },
            status: "APPROVED",
          },
          _count: {
            _all: true,
          },
        }),
        prisma.submission.groupBy({
          by: ["campaignId"],
          where: {
            campaignId: {
              in: campaignIds,
            },
            createdAt: {
              gte: weekStart,
            },
          },
          _count: {
            _all: true,
          },
        }),
      ]);

      for (const row of totals) {
        if (!row.campaignId) {
          continue;
        }
        submissionSummaryMap.set(row.campaignId, {
          total: row._count._all,
          approved: 0,
          avgRating:
            typeof row._avg.reviewerRating === "number" ? row._avg.reviewerRating : 0,
          thisWeek: 0,
        });
      }

      for (const row of approved) {
        if (!row.campaignId) {
          continue;
        }
        const current = submissionSummaryMap.get(row.campaignId) || {
          total: 0,
          approved: 0,
          avgRating: 0,
          thisWeek: 0,
        };
        submissionSummaryMap.set(row.campaignId, {
          ...current,
          approved: row._count._all,
        });
      }

      for (const row of thisWeek) {
        if (!row.campaignId) {
          continue;
        }
        const current = submissionSummaryMap.get(row.campaignId) || {
          total: 0,
          approved: 0,
          avgRating: 0,
          thisWeek: 0,
        };
        submissionSummaryMap.set(row.campaignId, {
          ...current,
          thisWeek: row._count._all,
        });
      }
    } catch (error) {
      console.error("Dashboard submission summary query failed:", error);
    }
  }

  const campaignRows: DashboardCampaignRow[] = campaigns.map((campaign) => ({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    createdAt: campaign.createdAt.toISOString(),
    inviteMessage: campaign.inviteMessage,
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
    submissionSummary: submissionSummaryMap.get(campaign.id) || {
      total: campaign.submissions?.length || 0,
      approved:
        campaign.submissions?.filter((submission) => submission.status.toUpperCase() === "APPROVED")
          .length || 0,
      avgRating: (() => {
        const rated = (campaign.submissions || []).filter(
          (submission) => typeof submission.reviewerRating === "number"
        );
        if (rated.length === 0) {
          return 0;
        }
        return (
          rated.reduce((sum, submission) => sum + (submission.reviewerRating || 0), 0) /
          rated.length
        );
      })(),
      thisWeek: (campaign.submissions || []).filter((submission) => {
        const createdAt = submission.createdAt.getTime();
        return Number.isFinite(createdAt) && Date.now() - createdAt <= 7 * 24 * 60 * 60 * 1000;
      }).length,
    },
    submissions: (campaign.submissions || []).map((submission) => ({
      id: submission.id,
      reviewerName: "",
      reviewerEmail: "",
      reviewerRating: submission.reviewerRating,
      status: submission.status,
      videoKey: "",
      durationSeconds: null,
      aiStatus: "PENDING",
      aiError: null,
      aiGeneratedReview: null,
      aiKeyPhrase: null,
      aiTranscript: null,
      aiProcessedAt: null,
      answers: [],
      createdAt: submission.createdAt.toISOString(),
    })),
  }));

  const detailCampaignId = options?.detailCampaignId;
  if (campaignDelegate && detailCampaignId) {
    try {
      const detailedCampaign = await campaignDelegate.findFirst({
        where: { ownerUserId: userId, id: detailCampaignId },
        select: {
          id: true,
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

      if (detailedCampaign) {
        const detailedSubmissions = detailedCampaign.submissions.map((submission) => ({
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
        }));

        const idx = campaignRows.findIndex((entry) => entry.id === detailCampaignId);
        if (idx >= 0) {
          campaignRows[idx] = {
            ...campaignRows[idx],
            submissions: detailedSubmissions,
          };
        }
      }
    } catch (error) {
      console.error("Dashboard detail campaign query failed:", error);
    }
  }

  let totalReviewsCount = campaignRows.reduce(
    (sum, campaign) => sum + campaign.submissionSummary.total,
    0
  );

  if (!includeSubmissions) {
    try {
      totalReviewsCount = await prisma.submission.count({
        where: {
          campaign: {
            ownerUserId: userId,
          },
        },
      });
    } catch (error) {
      console.error("Dashboard total reviews query failed:", error);
    }
  }

  return {
    workspaceName,
    campaignRuntimeReady: Boolean(campaignDelegate) && !campaignQueryFailed,
    campaigns: campaignRows,
    totalReviewsCount,
  };
}

const getDashboardDataCached = unstable_cache(
  async (userId: string, detailCampaignId?: string, light?: boolean) =>
    getDashboardDataForUserUncached(userId, { detailCampaignId, light }),
  ["dashboard-data-v1"],
  { revalidate: 5 }
);

export async function getDashboardDataForUser(
  userId: string,
  options?: { detailCampaignId?: string; light?: boolean }
) {
  return getDashboardDataCached(
    userId,
    options?.detailCampaignId,
    options?.light ? true : undefined
  );
}

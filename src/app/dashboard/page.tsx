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
    createdAt: Date;
  }>;
};

type CampaignDashboardRuntimeDelegate = {
  findMany: (args: unknown) => Promise<RuntimeCampaign[]>;
};

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

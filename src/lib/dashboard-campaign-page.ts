import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

export async function getCampaignDashboardShellBase(userId: string, campaignId: string) {
  const base = await getDashboardShellBase(userId, { detailCampaignId: campaignId });
  const campaignExists = base.campaigns.some((campaign) => campaign.id === campaignId);

  return {
    ...base,
    campaignExists,
  };
}

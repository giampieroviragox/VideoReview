import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

export async function getCampaignDashboardShellBase(
  userId: string,
  campaignId: string,
  options?: { includeSubmissions?: boolean }
) {
  const base = await getDashboardShellBase(userId, {
    detailCampaignId: options?.includeSubmissions ? campaignId : undefined,
    light: true,
  });
  const campaignExists = base.campaigns.some((campaign) => campaign.id === campaignId);

  return {
    ...base,
    campaignExists,
  };
}

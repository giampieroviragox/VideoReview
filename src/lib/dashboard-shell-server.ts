import { currentUser } from "@clerk/nextjs/server";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export async function getDashboardShellBase(
  userId: string,
  options?: { detailCampaignId?: string }
) {
  const user = await currentUser();
  const viewerName =
    user?.firstName ||
    user?.username ||
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress ||
    "Account";
  const viewerEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress ||
    "";

  const dashboardData = await getDashboardDataForUser(userId, options);

  return {
    viewerName,
    viewerEmail,
    workspaceName: dashboardData.workspaceName,
    campaignRuntimeReady: dashboardData.campaignRuntimeReady,
    campaigns: dashboardData.campaigns,
  };
}

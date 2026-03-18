import { auth } from "@clerk/nextjs/server";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export async function getDashboardShellBase(
  userId: string,
  options?: { detailCampaignId?: string; light?: boolean }
) {
  const { sessionClaims } = await auth();
  const claims =
    sessionClaims && typeof sessionClaims === "object"
      ? (sessionClaims as Record<string, unknown>)
      : null;

  const firstName =
    claims && typeof claims.first_name === "string" ? claims.first_name : "";
  const lastName =
    claims && typeof claims.last_name === "string" ? claims.last_name : "";
  const fullName =
    claims && typeof claims.full_name === "string" ? claims.full_name : "";
  const username =
    claims && typeof claims.username === "string" ? claims.username : "";
  const email =
    claims && typeof claims.email === "string"
      ? claims.email
      : claims && typeof claims.email_address === "string"
        ? claims.email_address
        : "";

  const composedName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const viewerName = composedName || fullName || username || email || "Account";
  const viewerEmail = email;

  const dashboardData = await getDashboardDataForUser(userId, options);

  return {
    viewerName,
    viewerEmail,
    workspaceName: dashboardData.workspaceName,
    campaignRuntimeReady: dashboardData.campaignRuntimeReady,
    campaigns: dashboardData.campaigns,
    totalReviewsCount: dashboardData.totalReviewsCount,
  };
}

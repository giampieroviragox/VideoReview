import { auth, currentUser } from "@clerk/nextjs/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default async function DashboardCampaignsPage() {
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
  const viewerEmail =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses[0]?.emailAddress ||
    "";

  const dashboardData = await getDashboardDataForUser(userId);

  return (
    <DashboardShell
      viewerName={viewerName}
      viewerEmail={viewerEmail}
      workspaceName={dashboardData.workspaceName}
      campaignRuntimeReady={dashboardData.campaignRuntimeReady}
      campaigns={dashboardData.campaigns}
      initialSection="campaigns"
    />
  );
}

import { auth } from "@clerk/nextjs/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

export default async function DashboardCampaignNewPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const base = await getDashboardShellBase(userId, { light: true });

  return (
    <DashboardShell
      viewerName={base.viewerName}
      viewerEmail={base.viewerEmail}
      workspaceName={base.workspaceName}
      campaignRuntimeReady={base.campaignRuntimeReady}
      campaigns={base.campaigns}
      initialTotalReviewsCount={base.totalReviewsCount}
      initialSection="campaigns"
      initialShowBuilder
      embedded
    />
  );
}

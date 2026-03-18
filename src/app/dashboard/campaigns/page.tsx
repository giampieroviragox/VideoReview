import { auth } from "@clerk/nextjs/server";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

export const dynamic = "force-dynamic";

export default async function DashboardCampaignsPage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const base = await getDashboardShellBase(userId);

  return (
    <DashboardShell
      viewerName={base.viewerName}
      viewerEmail={base.viewerEmail}
      workspaceName={base.workspaceName}
      campaignRuntimeReady={base.campaignRuntimeReady}
      campaigns={base.campaigns}
      initialSection="campaigns"
      embedded
    />
  );
}

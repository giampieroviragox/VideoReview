import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function DashboardCampaignEditPage({ params }: PageProps) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { campaignId } = await params;
  const base = await getDashboardShellBase(userId);

  const campaignExists = base.campaigns.some((campaign) => campaign.id === campaignId);
  if (!campaignExists) {
    redirect("/dashboard/campaigns");
  }

  return (
    <DashboardShell
      viewerName={base.viewerName}
      viewerEmail={base.viewerEmail}
      workspaceName={base.workspaceName}
      campaignRuntimeReady={base.campaignRuntimeReady}
      campaigns={base.campaigns}
      initialSection="campaigns"
      initialShowBuilder
      initialEditingCampaignId={campaignId}
      embedded
    />
  );
}

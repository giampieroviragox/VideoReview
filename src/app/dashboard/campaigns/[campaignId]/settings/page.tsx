import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import { getCampaignDashboardShellBase } from "@/lib/dashboard-campaign-page";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ campaignId: string }>;
};

export default async function DashboardCampaignSettingsPage({ params }: PageProps) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const { campaignId } = await params;
  const base = await getCampaignDashboardShellBase(userId, campaignId);

  if (!base.campaignExists) {
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
      initialSelectedCampaignId={campaignId}
      initialCampaignDetailTab="settings"
      embedded
    />
  );
}

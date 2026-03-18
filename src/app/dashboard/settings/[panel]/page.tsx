import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { SettingsPanelId } from "@/components/dashboard/DashboardSettings";
import { getDashboardShellBase } from "@/lib/dashboard-shell-server";

const SETTINGS_PANELS: SettingsPanelId[] = [
  "general",
  "profile",
  "brand",
  "notifications",
  "moderation",
  "rewards",
  "team",
  "integrations",
  "billing",
  "api",
  "danger",
];

type PageProps = {
  params: Promise<{
    panel: string;
  }>;
};

export default async function DashboardSettingsPanelPage({ params }: PageProps) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const resolvedParams = await params;
  const panel = resolvedParams.panel as SettingsPanelId;

  if (!SETTINGS_PANELS.includes(panel)) {
    redirect("/dashboard/settings/general");
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
      initialSection="settings"
      initialSettingsPanel={panel}
      embedded
    />
  );
}

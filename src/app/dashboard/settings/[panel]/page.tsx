import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard/DashboardShell";
import type { SettingsPanelId } from "@/components/dashboard/DashboardSettings";
import { getDashboardDataForUser } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

const SETTINGS_PANELS: SettingsPanelId[] = [
  "general",
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
      initialSection="settings"
      initialSettingsPanel={panel}
    />
  );
}

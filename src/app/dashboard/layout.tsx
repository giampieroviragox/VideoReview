import { auth, currentUser } from "@clerk/nextjs/server";
import DashboardPersistentSidebar from "@/components/dashboard/DashboardPersistentSidebar";
import { getDashboardSidebarData } from "@/lib/dashboard-sidebar-data";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const [user, sidebarData] = await Promise.all([currentUser(), getDashboardSidebarData(userId)]);

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

  return (
    <>
      <DashboardPersistentSidebar
        viewerName={viewerName}
        viewerEmail={viewerEmail}
        workspaceName={sidebarData.workspaceName}
        campaignsCount={sidebarData.campaignsCount}
      />
      {children}
    </>
  );
}

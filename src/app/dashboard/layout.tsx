import { auth } from "@clerk/nextjs/server";
import DashboardPersistentSidebar from "@/components/dashboard/DashboardPersistentSidebar";
import { getDashboardSidebarData } from "@/lib/dashboard-sidebar-data";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn, sessionClaims } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const sidebarData = await getDashboardSidebarData(userId);
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

import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";

export async function getDashboardSidebarData(userId: string) {
  let workspaceName = DEFAULT_WORKSPACE.brandName;
  let campaignsCount = 0;

  try {
    const [profile, count] = await Promise.all([
      prisma.brandProfile.findUnique({
        where: { ownerUserId: userId },
        select: { brandName: true },
      }),
      prisma.campaign.count({
        where: { ownerUserId: userId },
      }),
    ]);

    if (profile?.brandName) {
      workspaceName = profile.brandName;
    }

    campaignsCount = count;
  } catch (error) {
    console.error("Dashboard sidebar query failed:", error);
  }

  return {
    workspaceName,
    campaignsCount,
  };
}

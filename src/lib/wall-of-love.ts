import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function buildRandomSlug() {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 10);
  return `wall-${token}`;
}

export async function ensureWallOfLove(ownerUserId: string) {
  const existing = await prisma.wallOfLove.findUnique({
    where: { ownerUserId },
  });

  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    try {
      return await prisma.wallOfLove.create({
        data: {
          ownerUserId,
          slug: buildRandomSlug(),
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to generate a unique wall slug.");
}

export function normalizeWallOfLoveConfig(
  wall: Awaited<ReturnType<typeof ensureWallOfLove>>
) {
  return {
    id: wall.id,
    ownerUserId: wall.ownerUserId,
    slug: wall.slug,
    title: wall.title,
    subtitle: wall.subtitle,
    isPublished: wall.isPublished,
    includeAllCampaigns: wall.includeAllCampaigns,
    selectedCampaignIds: wall.selectedCampaignIds,
    includeAllApprovedSubmissions: wall.includeAllApprovedSubmissions,
    selectedSubmissionIds: wall.selectedSubmissionIds,
    createdAt: wall.createdAt.toISOString(),
    updatedAt: wall.updatedAt.toISOString(),
  };
}

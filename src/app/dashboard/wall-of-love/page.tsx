import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { ensureWallOfLove, normalizeWallOfLoveConfig } from "@/lib/wall-of-love";
import WallOfLoveDashboard from "@/components/dashboard/WallOfLoveDashboard";

function getSubmissionQuote(value: unknown) {
  if (!Array.isArray(value)) {
    return null;
  }

  for (const entry of value) {
    if (!entry || typeof entry !== "object") {
      continue;
    }

    const candidate = entry as Record<string, unknown>;
    if (typeof candidate.answer === "string" && candidate.answer.trim().length > 0) {
      return candidate.answer.trim();
    }
  }

  return null;
}

export default async function DashboardWallOfLovePage() {
  const { userId, redirectToSignIn } = await auth();

  if (!userId) {
    return redirectToSignIn();
  }

  const wall = await ensureWallOfLove(userId);
  const wallConfig = normalizeWallOfLoveConfig(wall);

  const campaigns = await prisma.campaign.findMany({
    where: {
      ownerUserId: userId,
    },
    select: {
      id: true,
      name: true,
      submissions: {
        where: {
          OR: [{ status: "APPROVED" }, { status: "approved" }],
        },
        select: {
          id: true,
          reviewerName: true,
          reviewerEmail: true,
          reviewerRating: true,
          aiKeyPhrase: true,
          aiGeneratedReview: true,
          answers: true,
          durationSeconds: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews = campaigns
    .flatMap((campaign) =>
      campaign.submissions.map((submission) => ({
        id: submission.id,
        campaignId: campaign.id,
        campaignName: campaign.name,
        reviewerName: submission.reviewerName,
        reviewerEmail: submission.reviewerEmail,
        rating:
          typeof submission.reviewerRating === "number" &&
          submission.reviewerRating >= 1 &&
          submission.reviewerRating <= 5
            ? submission.reviewerRating
            : 5,
        quote:
          (typeof submission.aiKeyPhrase === "string" &&
          submission.aiKeyPhrase.trim().length > 0
            ? submission.aiKeyPhrase.trim()
            : null) ||
          (typeof submission.aiGeneratedReview === "string" &&
          submission.aiGeneratedReview.trim().length > 0
            ? submission.aiGeneratedReview.trim()
            : null) ||
          getSubmissionQuote(submission.answers) ||
          `Review collected from ${campaign.name}.`,
        durationSeconds: submission.durationSeconds,
        createdAt: submission.createdAt.toISOString(),
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <WallOfLoveDashboard
      wall={wallConfig}
      reviews={reviews}
      campaigns={campaigns.map((campaign) => ({
        id: campaign.id,
        name: campaign.name,
        approvedCount: campaign.submissions.length,
      }))}
      publicPath={`/wall/${wall.slug}`}
    />
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import WallOfLovePage from "@/components/wall/WallOfLovePage";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;

  const wall = await prisma.wallOfLove.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      title: true,
      subtitle: true,
    },
  });

  if (!wall) {
    return {
      title: "Wall not found",
    };
  }

  return {
    title: `Tellr — ${wall.title}`,
    description: wall.subtitle || "Video testimonials collected with Tellr.",
  };
}

export default async function WallRoute({ params }: PageProps) {
  const { slug } = await params;

  const wall = await prisma.wallOfLove.findFirst({
    where: {
      slug,
      isPublished: true,
    },
    select: {
      slug: true,
      ownerUserId: true,
      title: true,
      subtitle: true,
      includeAllCampaigns: true,
      selectedCampaignIds: true,
      includeAllApprovedSubmissions: true,
      selectedSubmissionIds: true,
    },
  });

  if (!wall) {
    notFound();
  }

  const campaignFilter =
    wall.includeAllCampaigns
      ? {}
      : {
          id: { in: wall.selectedCampaignIds },
        };

  const submissionsFilter =
    wall.includeAllApprovedSubmissions
      ? {}
      : {
          id: { in: wall.selectedSubmissionIds },
        };

  const campaigns = await prisma.campaign.findMany({
    where: {
      ownerUserId: wall.ownerUserId,
      ...campaignFilter,
    },
    select: {
      id: true,
      name: true,
      submissions: {
        where: {
          OR: [{ status: "APPROVED" }, { status: "approved" }],
          ...submissionsFilter,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          reviewerName: true,
          reviewerEmail: true,
          reviewerRating: true,
          answers: true,
          durationSeconds: true,
          createdAt: true,
        },
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
          getSubmissionQuote(submission.answers) ||
          `Tellr helped us collect better social proof for ${campaign.name}.`,
        durationSeconds: submission.durationSeconds,
        createdAt: submission.createdAt.toISOString(),
      }))
    )
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((review, index) => ({
      ...review,
      isFeatured: review.rating >= 5 && index < 2,
      videoPath: `/api/wall-of-love/${wall.slug}/submissions/${review.id}/view`,
    }));

  return (
    <WallOfLovePage
      wall={{
        slug: wall.slug,
        title: wall.title,
        subtitle: wall.subtitle,
      }}
      reviews={reviews}
    />
  );
}

import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaignDelegate } from "@/lib/db";
import CampaignSubmissionForm from "@/components/CampaignSubmissionForm";

type CampaignMetadataRuntimeDelegate = {
  findFirst: (args: unknown) => Promise<{
    brandName: string;
    name: string;
    description: string | null;
  } | null>;
};

type CampaignPublicRuntimeDelegate = {
  findFirst: (args: unknown) => Promise<{
    id: string;
    ownerUserId: string;
    hasNoEndDate: boolean;
    endsAt: Date | null;
    brandName: string;
    brandLogoUrl: string | null;
    name: string;
    description: string | null;
    rewardText: string;
    rewardValue: string | null;
    questionDisplayMode: string;
    questions: Array<{
      id: string;
      text: string;
      required: boolean;
      sortOrder: number;
    }>;
  } | null>;
};

interface PageProps {
  params: Promise<{ brandSlug: string; campaignId: string }>;
  searchParams?: Promise<{ embed?: string | string[] }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { brandSlug, campaignId } = await params;
  const campaignDelegate = getCampaignDelegate() as unknown as
    | CampaignMetadataRuntimeDelegate
    | undefined;

  if (!campaignDelegate) {
    return { title: "Campaigns unavailable" };
  }

  const campaign = await campaignDelegate.findFirst({
    where: {
      id: campaignId,
      brandSlug,
    },
    select: {
      brandName: true,
      name: true,
      description: true,
    },
  });

  if (!campaign) {
    return { title: "Campaign not found" };
  }

  return {
    title: `${campaign.name} — ${campaign.brandName}`,
    description: campaign.description || `Leave a video review for ${campaign.brandName}`,
  };
}

export default async function CampaignPublicPage({ params, searchParams }: PageProps) {
  const { brandSlug, campaignId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const embedParam = Array.isArray(resolvedSearchParams.embed)
    ? resolvedSearchParams.embed[0]
    : resolvedSearchParams.embed;
  const embedMode = embedParam === "1" || embedParam === "true";
  const campaignDelegate = getCampaignDelegate() as unknown as
    | CampaignPublicRuntimeDelegate
    | undefined;

  if (!campaignDelegate) {
    notFound();
  }

  const campaign = await campaignDelegate.findFirst({
    where: {
      id: campaignId,
      brandSlug,
    },
    select: {
      id: true,
      ownerUserId: true,
      hasNoEndDate: true,
      endsAt: true,
      brandName: true,
      brandLogoUrl: true,
      name: true,
      description: true,
      rewardText: true,
      rewardValue: true,
      questionDisplayMode: true,
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  const isPublished = campaign.hasNoEndDate || !campaign.endsAt;

  if (!isPublished) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: embedMode ? "auto" : "100vh",
        background: embedMode ? "transparent" : "#ffffff",
      }}
    >
      <CampaignSubmissionForm
        embedMode={embedMode}
        campaign={{
          id: campaign.id,
          brandName: campaign.brandName,
          brandLogoUrl: campaign.brandLogoUrl,
          name: campaign.name,
          description: campaign.description,
          rewardText: campaign.rewardText,
          rewardValue: campaign.rewardValue,
          questionDisplayMode: campaign.questionDisplayMode,
          questions: campaign.questions,
        }}
      />
    </main>
  );
}

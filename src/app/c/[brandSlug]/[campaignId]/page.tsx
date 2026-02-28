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

export default async function CampaignPublicPage({ params }: PageProps) {
  const { brandSlug, campaignId } = await params;
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
    include: {
      questions: {
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top left, rgba(255,95,61,.12), transparent 28%), radial-gradient(circle at top right, rgba(123,79,255,.08), transparent 24%), var(--ink)",
        padding: "32px 0 48px",
      }}
    >
      <div className="wrap">
        <CampaignSubmissionForm
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
      </div>
    </main>
  );
}

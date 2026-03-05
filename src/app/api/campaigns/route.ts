import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getCampaignDelegate, prisma } from "@/lib/db";
import {
  buildCampaignInviteMessage,
  buildCampaignPublicPath,
  normalizeCampaignQuestions,
} from "@/lib/campaigns";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";

type CampaignCreateRuntimeDelegate = {
  create: (args: unknown) => Promise<{ id: string; name: string }>;
  update: (args: unknown) => Promise<unknown>;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const campaignDelegate = getCampaignDelegate() as unknown as
      | CampaignCreateRuntimeDelegate
      | undefined;

    if (!campaignDelegate) {
      return NextResponse.json(
        { error: "Campaign model is not loaded in the current server runtime. Restart the dev server and try again." },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      hasReward,
      rewardText,
      rewardValue,
      hasQuestion,
      questionText,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Campaign name is required." }, { status: 400 });
    }

    if (description && typeof description === "string" && description.trim().length > 200) {
      return NextResponse.json(
        { error: "Description must be 200 characters or fewer." },
        { status: 400 }
      );
    }

    const rewardEnabled = Boolean(hasReward);
    const questionEnabled = Boolean(hasQuestion);

    if (rewardEnabled && (!rewardText || typeof rewardText !== "string" || !rewardText.trim())) {
      return NextResponse.json({ error: "Reward name is required." }, { status: 400 });
    }

    if (rewardEnabled && (!rewardValue || typeof rewardValue !== "string" || !rewardValue.trim())) {
      return NextResponse.json({ error: "Reward description is required." }, { status: 400 });
    }

    if (questionEnabled && (!questionText || typeof questionText !== "string" || !questionText.trim())) {
      return NextResponse.json({ error: "Question text is required." }, { status: 400 });
    }

    const normalizedQuestions = normalizeCampaignQuestions(
      questionEnabled
        ? [{ text: String(questionText), required: false, sortOrder: 1 }]
        : []
    );

    const brandProfile = await prisma.brandProfile.findUnique({
      where: { ownerUserId: userId },
      select: {
        brandName: true,
        logoUrl: true,
      },
    });

    const campaign = await campaignDelegate.create({
      data: {
        ownerUserId: userId,
        brandName: brandProfile?.brandName || DEFAULT_WORKSPACE.brandName,
        brandSlug: DEFAULT_WORKSPACE.brandSlug,
        brandLogoUrl:
          typeof brandProfile?.logoUrl === "string" ? brandProfile.logoUrl : DEFAULT_WORKSPACE.brandLogoUrl,
        name: name.trim(),
        description: description?.trim() || null,
        rewardText: rewardEnabled ? rewardText.trim() : "",
        rewardValue: rewardEnabled ? rewardValue.trim() : null,
        hasNoEndDate: true,
        endsAt: null,
        questionDisplayMode: "ALL_AT_ONCE",
        inviteMessage: "",
        questions: {
          create: normalizedQuestions,
        },
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    const publicPath = buildCampaignPublicPath(campaign.id);
    const inviteMessage = buildCampaignInviteMessage(campaign.name, publicPath);

    const updatedCampaign = await campaignDelegate.update({
      where: { id: campaign.id },
      data: { inviteMessage },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json(
      {
        campaign: updatedCampaign,
        publicPath,
        inviteMessage,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Campaign creation error:", error);
    return NextResponse.json(
      { error: "Failed to create campaign." },
      { status: 500 }
    );
  }
}

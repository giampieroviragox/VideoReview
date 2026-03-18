import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { getCampaignDelegate } from "@/lib/db";
import {
  buildCampaignInviteMessage,
  buildCampaignPublicPath,
  normalizeCampaignQuestions,
} from "@/lib/campaigns";

type CampaignUpdateRuntimeDelegate = {
  findFirst: (args: unknown) => Promise<{
    id: string;
    ownerUserId: string;
    name: string;
    hasNoEndDate: boolean;
    endsAt: Date | null;
  } | null>;
  update: (args: unknown) => Promise<unknown>;
};

async function resolveOwnedCampaign(
  userId: string,
  campaignId: string,
  campaignDelegate: CampaignUpdateRuntimeDelegate
) {
  return campaignDelegate.findFirst({
    where: { id: campaignId, ownerUserId: userId },
    select: {
      id: true,
      ownerUserId: true,
      name: true,
      hasNoEndDate: true,
      endsAt: true,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { campaignId } = await context.params;
    const campaignDelegate = getCampaignDelegate() as unknown as
      | CampaignUpdateRuntimeDelegate
      | undefined;

    if (!campaignDelegate) {
      return NextResponse.json(
        {
          error:
            "Campaign model is not loaded in the current server runtime. Restart the dev server and try again.",
        },
        { status: 503 }
      );
    }

    const existingCampaign = await resolveOwnedCampaign(userId, campaignId, campaignDelegate);

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const body = await request.json();
    const action = typeof body.action === "string" ? body.action : "";

    if (action !== "unpublish" && action !== "publish") {
      return NextResponse.json({ error: "Unsupported campaign action." }, { status: 400 });
    }

    const updatedCampaign = await campaignDelegate.update({
      where: { id: campaignId },
      data:
        action === "unpublish"
          ? {
              hasNoEndDate: false,
              endsAt: new Date(),
            }
          : {
              hasNoEndDate: true,
              endsAt: null,
            },
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      status: action === "unpublish" ? "Inactive" : "Active",
    });
  } catch (error) {
    console.error("Campaign publish state error:", error);
    return NextResponse.json(
      { error: "Failed to update campaign publish state." },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { campaignId } = await context.params;
    const campaignDelegate = getCampaignDelegate() as unknown as
      | CampaignUpdateRuntimeDelegate
      | undefined;

    if (!campaignDelegate) {
      return NextResponse.json(
        {
          error:
            "Campaign model is not loaded in the current server runtime. Restart the dev server and try again.",
        },
        { status: 503 }
      );
    }

    const existingCampaign = await resolveOwnedCampaign(userId, campaignId, campaignDelegate);

    if (!existingCampaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, hasReward, rewardText, rewardValue, hasQuestion, questionText } = body;

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

    const trimmedName = name.trim();
    const publicPath = buildCampaignPublicPath(campaignId);
    const inviteMessage = buildCampaignInviteMessage(trimmedName, publicPath);

    const updatedCampaign = await campaignDelegate.update({
      where: { id: campaignId },
      data: {
        name: trimmedName,
        description: description?.trim() || null,
        rewardText: rewardEnabled ? rewardText.trim() : "",
        rewardValue: rewardEnabled ? rewardValue.trim() : null,
        inviteMessage,
        questions: {
          deleteMany: {},
          create: normalizedQuestions,
        },
      },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      publicPath,
      inviteMessage,
    });
  } catch (error) {
    console.error("Campaign update error:", error);
    return NextResponse.json({ error: "Failed to update campaign." }, { status: 500 });
  }
}

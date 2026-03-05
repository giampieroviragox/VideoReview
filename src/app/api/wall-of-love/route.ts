import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { ensureWallOfLove, normalizeWallOfLoveConfig } from "@/lib/wall-of-love";

export const dynamic = "force-dynamic";

function parseStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set<string>();

  for (const entry of value) {
    if (typeof entry !== "string") {
      continue;
    }

    const trimmed = entry.trim();
    if (trimmed.length > 0) {
      unique.add(trimmed);
    }
  }

  return Array.from(unique);
}

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const wall = await ensureWallOfLove(userId);

    return NextResponse.json({
      wall: normalizeWallOfLoveConfig(wall),
      publicPath: `/wall/${wall.slug}`,
    });
  } catch (error) {
    console.error("Wall of Love fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load Wall of Love settings." },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const wall = await ensureWallOfLove(userId);
    const body = await request.json();

    const isPublished = body.isPublished === true;
    const includeAllCampaigns = body.includeAllCampaigns !== false;
    const includeAllApprovedSubmissions = body.includeAllApprovedSubmissions !== false;
    const selectedCampaignIdsRaw = parseStringArray(body.selectedCampaignIds);
    const selectedSubmissionIdsRaw = parseStringArray(body.selectedSubmissionIds);

    const campaigns = await prisma.campaign.findMany({
      where: {
        ownerUserId: userId,
      },
      select: {
        id: true,
        submissions: {
          where: {
            OR: [{ status: "APPROVED" }, { status: "approved" }],
          },
          select: {
            id: true,
          },
        },
      },
    });

    const ownedCampaignIds = new Set(campaigns.map((campaign) => campaign.id));
    const ownedSubmissionIds = new Set(
      campaigns.flatMap((campaign) => campaign.submissions.map((submission) => submission.id))
    );

    const selectedCampaignIds = selectedCampaignIdsRaw.filter((id) => ownedCampaignIds.has(id));
    const selectedSubmissionIds = selectedSubmissionIdsRaw.filter((id) =>
      ownedSubmissionIds.has(id)
    );

    const title =
      typeof body.title === "string" && body.title.trim().length > 0
        ? body.title.trim().slice(0, 120)
        : "Real people. Real results.";

    const subtitle =
      typeof body.subtitle === "string" && body.subtitle.trim().length > 0
        ? body.subtitle.trim().slice(0, 240)
        : null;

    const updated = await prisma.wallOfLove.update({
      where: { id: wall.id },
      data: {
        isPublished,
        title,
        subtitle,
        includeAllCampaigns,
        selectedCampaignIds,
        includeAllApprovedSubmissions,
        selectedSubmissionIds,
      },
    });

    return NextResponse.json({
      wall: normalizeWallOfLoveConfig(updated),
      publicPath: `/wall/${updated.slug}`,
    });
  } catch (error) {
    console.error("Wall of Love update error:", error);
    return NextResponse.json(
      { error: "Failed to save Wall of Love settings." },
      { status: 500 }
    );
  }
}

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string; submissionId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const { campaignId, submissionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const existing = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        ownerUserId: userId,
        submissions: {
          some: {
            id: submissionId,
          },
        },
      },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        rewardPending: status === "APPROVED",
      },
    });

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Submission moderation error:", error);
    return NextResponse.json(
      { error: "Failed to update submission." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string; submissionId: string }> }
) {
  try {
    const { campaignId, submissionId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!["APPROVED", "REJECTED", "PENDING"].includes(status)) {
      return NextResponse.json({ error: "Invalid status." }, { status: 400 });
    }

    const existing = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        campaignId,
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

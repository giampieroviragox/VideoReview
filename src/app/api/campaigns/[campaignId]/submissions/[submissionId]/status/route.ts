import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { queueWebhookEvent } from "@/lib/webhooks/emit";
import { buildSubmissionWebhookPayload } from "@/lib/webhooks/payloads";

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
      select: {
        id: true,
        name: true,
        ownerUserId: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const currentSubmission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        campaignId,
      },
    });

    if (!currentSubmission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const submission = await prisma.$transaction(async (tx) => {
      const updatedSubmission = await tx.submission.update({
        where: { id: submissionId },
        data: {
          status,
          rewardPending: status === "APPROVED",
        },
      });

      if (status === "APPROVED" && currentSubmission.status !== "APPROVED") {
        const eventId = crypto.randomUUID();
        await queueWebhookEvent({
          tx,
          ownerUserId: existing.ownerUserId,
          eventId,
          type: "submission.approved",
          payload: buildSubmissionWebhookPayload({
            eventId,
            type: "submission.approved",
            campaign: {
              id: existing.id,
              name: existing.name,
            },
            submission: updatedSubmission,
          }),
        });
      }

      return updatedSubmission;
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

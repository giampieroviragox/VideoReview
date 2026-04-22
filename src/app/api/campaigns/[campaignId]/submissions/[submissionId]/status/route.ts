import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/db";
import { queueWebhookEvent } from "@/lib/webhooks/emit";
import { buildSubmissionWebhookPayload } from "@/lib/webhooks/payloads";
import { triggerWebhookDispatchAfterResponse } from "@/lib/webhooks/trigger";

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

    const submission = await prisma.submission.update({
      where: { id: submissionId },
      data: {
        status,
        rewardPending: status === "APPROVED",
      },
    });

    if (status === "APPROVED" && currentSubmission.status !== "APPROVED") {
      try {
        const eventId = crypto.randomUUID();
        let deliveryIds: string[] = [];

        await prisma.$transaction(async (tx) => {
          const queued = await queueWebhookEvent({
            tx,
            ownerUserId: existing.ownerUserId,
            campaignId: existing.id,
            eventId,
            type: "submission.approved",
            payload: buildSubmissionWebhookPayload({
              eventId,
              type: "submission.approved",
              campaign: {
                id: existing.id,
                name: existing.name,
              },
              submission,
            }),
          });

          deliveryIds = queued.deliveryIds;
        });

        triggerWebhookDispatchAfterResponse(deliveryIds);
      } catch (error) {
        console.error("Webhook enqueue failed for submission.approved:", error);
      }
    }

    revalidateTag("dashboard-data");
    revalidatePath("/dashboard/campaigns");
    revalidatePath(`/dashboard/campaigns/${campaignId}/submissions`);
    revalidatePath(`/dashboard/campaigns/${campaignId}/submission/${submissionId}`);

    return NextResponse.json({ submission });
  } catch (error) {
    console.error("Submission moderation error:", error);
    return NextResponse.json(
      { error: "Failed to update submission." },
      { status: 500 }
    );
  }
}

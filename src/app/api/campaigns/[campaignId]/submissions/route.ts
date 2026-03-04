import { NextRequest, NextResponse } from "next/server";
import { getCampaignDelegate, prisma } from "@/lib/db";
import { objectExists } from "@/lib/s3";
import { queueWebhookEvent } from "@/lib/webhooks/emit";
import { buildSubmissionWebhookPayload } from "@/lib/webhooks/payloads";
import { triggerWebhookDispatchAfterResponse } from "@/lib/webhooks/trigger";

export const dynamic = "force-dynamic";

type IncomingAnswer = {
  questionId: string;
  questionText: string;
  answer: string;
  required: boolean;
};

type CampaignSubmissionRuntimeDelegate = {
  findUnique: (args: unknown) => Promise<{
    id: string;
    ownerUserId: string | null;
    name: string;
    questions: Array<{ id: string; text: string; required: boolean }>;
  } | null>;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const campaignDelegate = getCampaignDelegate() as unknown as
      | CampaignSubmissionRuntimeDelegate
      | undefined;

    if (!campaignDelegate) {
      return NextResponse.json(
        { error: "Campaign model is not loaded in the current server runtime. Restart the dev server and try again." },
        { status: 503 }
      );
    }

    const { campaignId } = await params;
    const body = await request.json();
    const {
      reviewerName,
      reviewerEmail,
      reviewerRating,
      videoKey,
      durationSeconds,
      answers,
    } = body;

    if (!reviewerName || !reviewerEmail || !videoKey) {
      return NextResponse.json(
        { error: "Name, email, and video are required." },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(reviewerEmail)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!reviewerRating || reviewerRating < 1 || reviewerRating > 5) {
      return NextResponse.json({ error: "Rating must be between 1 and 5." }, { status: 400 });
    }

    const campaign = await campaignDelegate.findUnique({
      where: { id: campaignId },
      include: {
        questions: {
          orderBy: { sortOrder: "asc" },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const questionMap = new Map(campaign.questions.map((question) => [question.id, question]));
    const normalizedAnswers = (Array.isArray(answers) ? answers : [])
      .map((entry: IncomingAnswer) => {
        const question = questionMap.get(entry.questionId);
        if (!question) {
          return null;
        }

        return {
          questionId: question.id,
          questionText: question.text,
          required: question.required,
          answer: String(entry.answer || "").trim(),
        };
      })
      .filter(Boolean) as IncomingAnswer[];

    const missingRequired = campaign.questions.some((question) => {
      if (!question.required) {
        return false;
      }

      return !normalizedAnswers.find(
        (answer) => answer.questionId === question.id && answer.answer.trim().length > 0
      );
    });

    if (missingRequired) {
      return NextResponse.json(
        { error: "Please answer all required questions." },
        { status: 400 }
      );
    }

    const exists = await objectExists(videoKey);
    if (!exists) {
      return NextResponse.json(
        { error: "Video not found in storage. Please upload it again." },
        { status: 400 }
      );
    }

    const createdSubmission = await prisma.submission.create({
      data: {
        campaignId: campaign.id,
        reviewerName: reviewerName.trim(),
        reviewerEmail: reviewerEmail.trim().toLowerCase(),
        reviewerRating,
        answers: normalizedAnswers,
        videoKey,
        durationSeconds: durationSeconds ? Math.round(durationSeconds) : null,
        status: "PENDING",
        rewardPending: false,
      },
    });

    try {
      const eventId = crypto.randomUUID();
      let deliveryIds: string[] = [];

      await prisma.$transaction(async (tx) => {
        const queued = await queueWebhookEvent({
          tx,
          ownerUserId: campaign.ownerUserId,
          eventId,
          type: "submission.created",
          payload: buildSubmissionWebhookPayload({
            eventId,
            type: "submission.created",
            campaign: {
              id: campaign.id,
              name: campaign.name,
            },
            submission: createdSubmission,
          }),
        });

        deliveryIds = queued.deliveryIds;
      });

      triggerWebhookDispatchAfterResponse(deliveryIds);
    } catch (error) {
      console.error("Webhook enqueue failed for submission.created:", error);
    }

    return NextResponse.json({ submission: createdSubmission }, { status: 201 });
  } catch (error) {
    console.error("Campaign submission error:", error);
    return NextResponse.json(
      { error: "Failed to save submission." },
      { status: 500 }
    );
  }
}

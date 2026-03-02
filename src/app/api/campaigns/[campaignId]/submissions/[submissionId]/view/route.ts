import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
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

    const campaign = await prisma.campaign.findFirst({
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
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        campaignId: campaign.id,
      },
      select: {
        videoKey: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    const downloadUrl = await generateDownloadUrl(submission.videoKey);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Submission view error:", error);
    return NextResponse.json(
      { error: "Failed to generate video preview." },
      { status: 500 }
    );
  }
}

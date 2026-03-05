import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; submissionId: string }> }
) {
  try {
    const { slug, submissionId } = await params;

    const wall = await prisma.wallOfLove.findFirst({
      where: {
        slug,
        isPublished: true,
      },
      select: {
        ownerUserId: true,
        includeAllCampaigns: true,
        includeAllApprovedSubmissions: true,
        selectedCampaignIds: true,
        selectedSubmissionIds: true,
      },
    });

    if (!wall) {
      return NextResponse.json({ error: "Wall not found." }, { status: 404 });
    }

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        OR: [{ status: "APPROVED" }, { status: "approved" }],
        campaign: {
          ownerUserId: wall.ownerUserId,
        },
      },
      select: {
        id: true,
        campaignId: true,
        videoKey: true,
      },
    });

    if (!submission || !submission.campaignId) {
      return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    }

    if (!wall.includeAllCampaigns && !wall.selectedCampaignIds.includes(submission.campaignId)) {
      return NextResponse.json({ error: "Submission not available." }, { status: 404 });
    }

    if (
      !wall.includeAllApprovedSubmissions &&
      !wall.selectedSubmissionIds.includes(submission.id)
    ) {
      return NextResponse.json({ error: "Submission not available." }, { status: 404 });
    }

    const downloadUrl = await generateDownloadUrl(submission.videoKey);
    return NextResponse.redirect(downloadUrl);
  } catch (error) {
    console.error("Wall submission view error:", error);
    return NextResponse.json(
      { error: "Failed to generate video preview." },
      { status: 500 }
    );
  }
}

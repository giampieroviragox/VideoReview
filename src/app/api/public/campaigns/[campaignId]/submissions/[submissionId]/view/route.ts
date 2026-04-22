import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ campaignId: string; submissionId: string }> }
) {
  try {
    const { campaignId, submissionId } = await params;

    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        campaignId,
        OR: [{ status: "APPROVED" }, { status: "approved" }],
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
    console.error("Public submission view error:", error);
    return NextResponse.json(
      { error: "Failed to generate public video URL." },
      { status: 500 }
    );
  }
}

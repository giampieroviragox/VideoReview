import { NextRequest, NextResponse } from "next/server";
import { getCampaignDelegate } from "@/lib/db";
import { generateUploadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

type CampaignUploadRuntimeDelegate = {
  findUnique: (args: unknown) => Promise<{ id: string } | null>;
};

const ALLOWED_TYPES = ["video/webm", "video/mp4", "video/quicktime"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const campaignDelegate = getCampaignDelegate() as unknown as
      | CampaignUploadRuntimeDelegate
      | undefined;

    if (!campaignDelegate) {
      return NextResponse.json(
        { error: "Campaign model is not loaded in the current server runtime. Restart the dev server and try again." },
        { status: 503 }
      );
    }

    const { campaignId } = await params;
    const body = await request.json();
    const { contentType } = body;

    if (!contentType || !ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const campaign = await campaignDelegate.findUnique({
      where: { id: campaignId },
      select: { id: true },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const extension = contentType === "video/quicktime" ? "mov" : contentType === "video/mp4" ? "mp4" : "webm";
    const videoKey = `campaign-submissions/${campaign.id}/${uuidv4()}.${extension}`;
    const uploadUrl = await generateUploadUrl(videoKey, contentType);

    return NextResponse.json({ uploadUrl, videoKey });
  } catch (error) {
    console.error("Campaign upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to generate upload URL." },
      { status: 500 }
    );
  }
}

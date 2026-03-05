import { NextRequest, NextResponse } from "next/server";
import { generateDownloadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

type AssetParams = {
  key: string[];
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<AssetParams> }
) {
  try {
    const resolved = await params;
    const key = Array.isArray(resolved.key) ? resolved.key.join("/") : "";

    if (!key) {
      return NextResponse.json({ error: "Asset key is required." }, { status: 400 });
    }

    const downloadUrl = await generateDownloadUrl(key);
    return NextResponse.redirect(downloadUrl, { status: 307 });
  } catch (error) {
    console.error("Brand asset fetch error:", error);
    return NextResponse.json({ error: "Failed to load brand asset." }, { status: 500 });
  }
}

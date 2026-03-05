import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { generateUploadUrl } from "@/lib/s3";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/avif"];
const MAX_SIZE_MB = 8;

function extensionFromContentType(contentType: string) {
  if (contentType === "image/png") {
    return "png";
  }
  if (contentType === "image/jpeg") {
    return "jpg";
  }
  if (contentType === "image/webp") {
    return "webp";
  }
  return "avif";
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const contentType = typeof body.contentType === "string" ? body.contentType : "";
    const size = typeof body.size === "number" ? body.size : 0;

    if (!ALLOWED_TYPES.includes(contentType)) {
      return NextResponse.json(
        { error: "Unsupported image type. Use PNG, JPG, WEBP or AVIF." },
        { status: 400 }
      );
    }

    if (size <= 0 || size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Logo must be smaller than ${MAX_SIZE_MB}MB.` },
        { status: 400 }
      );
    }

    const extension = extensionFromContentType(contentType);
    const objectKey = `brand-logos/${userId}/${uuidv4()}.${extension}`;
    const uploadUrl = await generateUploadUrl(objectKey, contentType);
    const logoUrl = `/api/brand-assets/${objectKey}`;

    return NextResponse.json({ uploadUrl, logoUrl });
  } catch (error) {
    console.error("Brand logo upload URL error:", error);
    return NextResponse.json(
      { error: "Failed to prepare logo upload." },
      { status: 500 }
    );
  }
}

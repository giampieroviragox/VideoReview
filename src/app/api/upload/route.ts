import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateUploadUrl } from "@/lib/s3";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["video/webm", "video/mp4"];

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, contentType } = body;

        // Validate required fields
        if (!slug || !contentType) {
            return NextResponse.json(
                { error: "Missing required fields: slug, contentType" },
                { status: 400 }
            );
        }

        // Validate content type
        if (!ALLOWED_TYPES.includes(contentType)) {
            return NextResponse.json(
                { error: `Invalid content type. Allowed: ${ALLOWED_TYPES.join(", ")}` },
                { status: 400 }
            );
        }

        // Verify collection page exists
        const page = await prisma.collectionPage.findUnique({
            where: { slug },
        });

        if (!page) {
            return NextResponse.json(
                { error: "Collection page not found" },
                { status: 404 }
            );
        }

        // Generate unique video key
        const extension = contentType === "video/webm" ? "webm" : "mp4";
        const videoKey = `submissions/${page.id}/${uuidv4()}.${extension}`;

        // Generate presigned upload URL
        const uploadUrl = await generateUploadUrl(videoKey, contentType);

        return NextResponse.json({ uploadUrl, videoKey });
    } catch (error) {
        console.error("Upload URL generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate upload URL" },
            { status: 500 }
        );
    }
}

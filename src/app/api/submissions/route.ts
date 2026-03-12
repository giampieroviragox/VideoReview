import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { objectExists } from "@/lib/s3";
import { isOpenRouterConfigured } from "@/lib/ai/openrouter";
import { triggerSubmissionAiAfterResponse } from "@/lib/ai/trigger";

const MAX_DURATION_SECONDS = 90;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { slug, reviewerName, reviewerEmail, videoKey, durationSeconds } =
            body;

        // Validate required fields
        if (!slug || !reviewerName || !reviewerEmail || !videoKey) {
            return NextResponse.json(
                {
                    error:
                        "Missing required fields: slug, reviewerName, reviewerEmail, videoKey",
                },
                { status: 400 }
            );
        }

        // Validate email format (basic)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(reviewerEmail)) {
            return NextResponse.json(
                { error: "Invalid email format" },
                { status: 400 }
            );
        }

        // Validate duration
        if (durationSeconds && durationSeconds > MAX_DURATION_SECONDS) {
            return NextResponse.json(
                { error: `Video duration exceeds maximum of ${MAX_DURATION_SECONDS}s` },
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

        // Verify video exists on R2
        const exists = await objectExists(videoKey);
        if (!exists) {
            return NextResponse.json(
                { error: "Video not found in storage. Please re-upload." },
                { status: 400 }
            );
        }

        const aiEnabled = isOpenRouterConfigured();

        // Create submission
        const submission = await prisma.submission.create({
            data: {
                collectionPageId: page.id,
                reviewerName: reviewerName.trim(),
                reviewerEmail: reviewerEmail.trim().toLowerCase(),
                videoKey,
                durationSeconds: durationSeconds
                    ? Math.round(durationSeconds)
                    : null,
                status: "pending",
                aiStatus: aiEnabled ? "PENDING" : "NOT_REQUESTED",
            },
        });

        triggerSubmissionAiAfterResponse(submission.id);

        return NextResponse.json({ submission }, { status: 201 });
    } catch (error) {
        console.error("Submission creation error:", error);
        return NextResponse.json(
            { error: "Failed to create submission" },
            { status: 500 }
        );
    }
}

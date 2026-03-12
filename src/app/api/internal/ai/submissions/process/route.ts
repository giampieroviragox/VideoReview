import { NextRequest, NextResponse } from "next/server";
import { processPendingSubmissionAiBatch } from "@/lib/ai/submissions";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    return true;
  }

  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

async function handleRequest(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const batchParam = request.nextUrl.searchParams.get("batch");
  const includeFailedParam = request.nextUrl.searchParams.get("includeFailed");
  const includeNotRequestedParam =
    request.nextUrl.searchParams.get("includeNotRequested");
  const forceParam = request.nextUrl.searchParams.get("force");
  const submissionIdParam = request.nextUrl.searchParams.get("submissionId");
  const batchSize = Number.parseInt(batchParam || "", 10);
  const force = forceParam?.toLowerCase() === "true";

  const result = await processPendingSubmissionAiBatch({
    batchSize:
      Number.isFinite(batchSize) && batchSize > 0
        ? Math.min(batchSize, 20)
        : undefined,
    includeFailed:
      includeFailedParam === null
        ? true
        : includeFailedParam.toLowerCase() !== "false",
    includeNotRequested:
      includeNotRequestedParam?.toLowerCase() === "true",
    ignoreFeatureFlag: force,
    submissionId: submissionIdParam || undefined,
  });

  return NextResponse.json(result);
}

export async function GET(request: NextRequest) {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error("AI batch processing error:", error);
    return NextResponse.json(
      { error: "Failed to process AI submissions." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    return await handleRequest(request);
  } catch (error) {
    console.error("AI batch processing error:", error);
    return NextResponse.json(
      { error: "Failed to process AI submissions." },
      { status: 500 }
    );
  }
}

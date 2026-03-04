import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { dispatchWebhookDeliveries } from "@/lib/webhooks/dispatch";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const candidates = await prisma.webhookDelivery.findMany({
      where: {
        endpoint: {
          ownerUserId: userId,
        },
        nextAttemptAt: {
          lte: new Date(),
        },
        status: {
          in: ["PENDING", "FAILED", "PROCESSING"],
        },
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: { id: true },
    });

    const deliveryIds = candidates.map((candidate) => candidate.id);
    const dispatch =
      deliveryIds.length > 0
        ? await dispatchWebhookDeliveries({
            deliveryIds,
            batchSize: deliveryIds.length,
          })
        : {
            workerId: null,
            claimedCount: 0,
            processedCount: 0,
            results: [],
          };

    return NextResponse.json({ dispatch });
  } catch (error) {
    console.error("User webhook dispatch error:", error);
    return NextResponse.json(
      { error: "Failed to dispatch webhook deliveries." },
      { status: 500 }
    );
  }
}

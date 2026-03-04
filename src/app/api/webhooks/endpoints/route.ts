import { auth } from "@clerk/nextjs/server";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { generateWebhookSecret, parseWebhookEvents, validateWebhookUrl } from "@/lib/webhooks/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const endpoints = await prisma.webhookEndpoint.findMany({
      where: { ownerUserId: userId },
      orderBy: { createdAt: "desc" },
      include: {
        deliveries: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            attemptCount: true,
            responseStatus: true,
            lastError: true,
            createdAt: true,
            event: {
              select: {
                type: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({
      endpoints: endpoints.map((endpoint) => ({
        id: endpoint.id,
        url: endpoint.url,
        description: endpoint.description,
        subscribedEvents: endpoint.subscribedEvents,
        isActive: endpoint.isActive,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
        deliveries: endpoint.deliveries.map((delivery) => ({
          id: delivery.id,
          status: delivery.status,
          attemptCount: delivery.attemptCount,
          responseStatus: delivery.responseStatus,
          lastError: delivery.lastError,
          createdAt: delivery.createdAt.toISOString(),
          eventType: delivery.event.type,
        })),
      })),
    });
  } catch (error) {
    console.error("Webhook endpoints fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load webhook endpoints." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await request.json();
    const url = validateWebhookUrl(body.url);
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;
    const subscribedEvents = parseWebhookEvents(body.subscribedEvents);
    const signingSecret = generateWebhookSecret();

    const existing = await prisma.webhookEndpoint.findFirst({
      where: {
        ownerUserId: userId,
        url,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "This webhook URL is already configured for your account." },
        { status: 409 }
      );
    }

    let endpoint;

    try {
      endpoint = await prisma.webhookEndpoint.create({
        data: {
          ownerUserId: userId,
          url,
          description,
          subscribedEvents,
          signingSecret,
          isActive: body.isActive !== false,
        },
        select: {
          id: true,
          url: true,
          description: true,
          subscribedEvents: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        return NextResponse.json(
          { error: "This webhook URL is already configured for your account." },
          { status: 409 }
        );
      }

      throw error;
    }

    return NextResponse.json(
      {
        endpoint: {
          ...endpoint,
          createdAt: endpoint.createdAt.toISOString(),
          updatedAt: endpoint.updatedAt.toISOString(),
        },
        signingSecret,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create webhook endpoint.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

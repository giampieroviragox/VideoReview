import { Prisma } from "@prisma/client";
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  WebhookResolutionError,
  WebhookValidationError,
  generateWebhookSecret,
  parseWebhookEvents,
  validateWebhookUrl,
} from "@/lib/webhooks/utils";

export const dynamic = "force-dynamic";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { campaignId } = await params;
    const body = await request.json();

    const url = await validateWebhookUrl(body.url);
    const description =
      typeof body.description === "string" && body.description.trim().length > 0
        ? body.description.trim()
        : null;
    const subscribedEvents = parseWebhookEvents(body.subscribedEvents);

    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        ownerUserId: userId,
      },
      select: {
        id: true,
        webhookEndpoint: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    let endpoint;
    let signingSecret: string | null = null;

    try {
      if (campaign.webhookEndpoint?.id) {
        endpoint = await prisma.webhookEndpoint.update({
          where: { id: campaign.webhookEndpoint.id },
          data: {
            url,
            description,
            subscribedEvents,
            isActive: true,
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
      } else {
        signingSecret = generateWebhookSecret();
        endpoint = await prisma.webhookEndpoint.create({
          data: {
            ownerUserId: userId,
            campaignId,
            url,
            description,
            subscribedEvents,
            signingSecret,
            isActive: true,
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
      }
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

    return NextResponse.json({
      endpoint: {
        ...endpoint,
        createdAt: endpoint.createdAt.toISOString(),
        updatedAt: endpoint.updatedAt.toISOString(),
      },
      signingSecret,
    });
  } catch (error) {
    if (
      error instanceof WebhookValidationError ||
      error instanceof WebhookResolutionError
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const message =
      error instanceof Error ? error.message : "Failed to save campaign webhook.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ campaignId: string }> }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const { campaignId } = await params;
    const campaign = await prisma.campaign.findFirst({
      where: {
        id: campaignId,
        ownerUserId: userId,
      },
      select: {
        id: true,
        webhookEndpoint: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    if (!campaign.webhookEndpoint?.id) {
      return NextResponse.json({ success: true });
    }

    await prisma.webhookEndpoint.delete({
      where: { id: campaign.webhookEndpoint.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove campaign webhook.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

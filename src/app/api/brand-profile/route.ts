import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { DEFAULT_WORKSPACE } from "@/lib/workspace";

export const dynamic = "force-dynamic";

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{6})$/;

function normalizeBrandName(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) {
    return DEFAULT_WORKSPACE.brandName;
  }

  return value.trim().slice(0, 80);
}

function normalizeHexColor(value: unknown, fallback: string) {
  if (typeof value !== "string") {
    return fallback;
  }

  const trimmed = value.trim();
  if (!HEX_COLOR_REGEX.test(trimmed)) {
    return fallback;
  }

  return trimmed.toLowerCase();
}

function normalizeUrl(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith("/api/brand-assets/")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

async function ensureBrandProfile(userId: string) {
  const existing = await prisma.brandProfile.findUnique({
    where: { ownerUserId: userId },
  });

  if (existing) {
    return existing;
  }

  return prisma.brandProfile.create({
    data: {
      ownerUserId: userId,
      brandName: DEFAULT_WORKSPACE.brandName,
      primaryColor: "#ff5c35",
      secondaryColor: "#111318",
      logoUrl: DEFAULT_WORKSPACE.brandLogoUrl,
      websiteUrl: null,
    },
  });
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const brand = await ensureBrandProfile(userId);
    return NextResponse.json({ brand });
  } catch (error) {
    console.error("Brand profile fetch error:", error);
    return NextResponse.json({ error: "Failed to load brand settings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const existing = await ensureBrandProfile(userId);
    const body = await request.json();

    const brandName = normalizeBrandName(body.brandName);
    const primaryColor = normalizeHexColor(body.primaryColor, existing.primaryColor);
    const secondaryColor = normalizeHexColor(body.secondaryColor, existing.secondaryColor);

    const logoUrl = body.logoUrl === "" ? null : normalizeUrl(body.logoUrl);
    if (body.logoUrl && !logoUrl) {
      return NextResponse.json(
        { error: "Logo URL must be a valid http(s) URL." },
        { status: 400 }
      );
    }

    const websiteUrl = body.websiteUrl === "" ? null : normalizeUrl(body.websiteUrl);
    if (body.websiteUrl && !websiteUrl) {
      return NextResponse.json(
        { error: "Website URL must be a valid http(s) URL." },
        { status: 400 }
      );
    }

    const updated = await prisma.brandProfile.update({
      where: { ownerUserId: userId },
      data: {
        brandName,
        primaryColor,
        secondaryColor,
        logoUrl,
        websiteUrl,
      },
    });

    await prisma.campaign.updateMany({
      where: { ownerUserId: userId },
      data: {
        brandName: updated.brandName,
        brandLogoUrl: updated.logoUrl,
      },
    });

    return NextResponse.json({ brand: updated });
  } catch (error) {
    console.error("Brand profile update error:", error);
    return NextResponse.json({ error: "Failed to save brand settings." }, { status: 500 });
  }
}

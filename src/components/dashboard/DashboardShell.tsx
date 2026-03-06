"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CampaignBuilder from "@/components/dashboard/CampaignBuilder";

type DashboardShellProps = {
  viewerName: string;
  workspaceName: string;
  campaignRuntimeReady: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    hasNoEndDate: boolean;
    endsAt: string | null;
    publicPath: string;
    webhookEndpoint: {
      id: string;
      url: string;
      description: string | null;
      subscribedEvents: string[];
      isActive: boolean;
      createdAt: string;
      updatedAt: string;
    } | null;
    submissions: Array<{
      id: string;
      reviewerName: string;
      reviewerEmail: string;
      reviewerRating: number | null;
      status: string;
      videoKey: string;
      durationSeconds: number | null;
      answers: Array<{
        questionId: string;
        questionText: string;
        answer: string;
        required: boolean;
      }>;
      createdAt: string;
    }>;
  }>;
};

type CampaignWebhookPayload = {
  id: string;
  url: string;
  description: string | null;
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DashboardWebhookEndpoint = {
  id: string;
  url: string;
  description: string | null;
  subscribedEvents: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  deliveries: Array<{
    id: string;
    status: string;
    attemptCount: number;
    responseStatus: number | null;
    lastError: string | null;
    createdAt: string;
    eventType: string;
  }>;
};

type WallOfLoveConfig = {
  id: string;
  ownerUserId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  isPublished: boolean;
  includeAllCampaigns: boolean;
  selectedCampaignIds: string[];
  includeAllApprovedSubmissions: boolean;
  selectedSubmissionIds: string[];
  createdAt: string;
  updatedAt: string;
};

type WallReviewSelection = {
  id: string;
  campaignId: string;
  campaignName: string;
  reviewerName: string;
  reviewerEmail: string;
  reviewerRating: number | null;
  createdAt: string;
};

type BrandProfile = {
  id: string;
  ownerUserId: string;
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

const WEBHOOK_EVENT_OPTIONS = [
  {
    value: "submission.created",
    label: "New submission",
    helper: "Fire when a customer sends a new review.",
  },
  {
    value: "submission.approved",
    label: "Submission approved",
    helper: "Fire when you approve a submission in the dashboard.",
  },
] as const;

function getCampaignState(hasNoEndDate: boolean, endsAt: string | null) {
  if (hasNoEndDate || !endsAt) {
    return "Active";
  }

  return new Date(endsAt).getTime() >= Date.now() ? "Active" : "Inactive";
}

function normalizeSubmissionStatus(status: string) {
  return status.toUpperCase();
}

function formatSubmissionDuration(durationSeconds: number | null) {
  if (typeof durationSeconds !== "number" || Number.isNaN(durationSeconds) || durationSeconds <= 0) {
    return null;
  }

  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getSubmissionExcerpt(
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string;
    required: boolean;
  }>
) {
  const firstAnswer = answers.find((entry) => entry.answer.trim().length > 0);

  if (!firstAnswer) {
    return null;
  }

  return `"${firstAnswer.answer.trim()}"`;
}

function normalizeHexInput(value: string, fallback: string) {
  const trimmed = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(trimmed)) {
    return trimmed;
  }
  return fallback;
}

function hexToRgb(hex: string) {
  const safe = normalizeHexInput(hex, "#000000").slice(1);
  return {
    r: Number.parseInt(safe.slice(0, 2), 16),
    g: Number.parseInt(safe.slice(2, 4), 16),
    b: Number.parseInt(safe.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number) {
  const toHex = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number) {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;
  const lightness = (max + min) / 2;

  let hue = 0;
  if (delta !== 0) {
    if (max === nr) {
      hue = ((ng - nb) / delta) % 6;
    } else if (max === ng) {
      hue = (nb - nr) / delta + 2;
    } else {
      hue = (nr - ng) / delta + 4;
    }
    hue *= 60;
    if (hue < 0) {
      hue += 360;
    }
  }

  const saturation =
    delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));

  return {
    h: Math.round(hue),
    s: Math.round(saturation * 100),
    l: Math.round(lightness * 100),
  };
}

function hslToRgb(h: number, s: number, l: number) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const lightness = Math.max(0, Math.min(100, l)) / 100;

  if (saturation === 0) {
    const gray = Math.round(lightness * 255);
    return { r: gray, g: gray, b: gray };
  }

  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const x = chroma * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lightness - chroma / 2;

  let r1 = 0;
  let g1 = 0;
  let b1 = 0;

  if (hue < 60) {
    r1 = chroma;
    g1 = x;
  } else if (hue < 120) {
    r1 = x;
    g1 = chroma;
  } else if (hue < 180) {
    g1 = chroma;
    b1 = x;
  } else if (hue < 240) {
    g1 = x;
    b1 = chroma;
  } else if (hue < 300) {
    r1 = x;
    b1 = chroma;
  } else {
    r1 = chroma;
    b1 = x;
  }

  return {
    r: Math.round((r1 + m) * 255),
    g: Math.round((g1 + m) * 255),
    b: Math.round((b1 + m) * 255),
  };
}

function hslToHex(h: number, s: number, l: number) {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export default function DashboardShell({
  viewerName,
  workspaceName,
  campaignRuntimeReady,
  campaigns,
}: DashboardShellProps) {
  const router = useRouter();
  const [campaignsState, setCampaignsState] = useState(campaigns);
  const [activeSection, setActiveSection] = useState<"campaigns" | "wall" | "brand" | "settings">(
    "campaigns"
  );
  const [showBuilder, setShowBuilder] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [submissionActionId, setSubmissionActionId] = useState<string | null>(null);
  const [playingSubmissionId, setPlayingSubmissionId] = useState<string | null>(null);
  const [webhookEndpoints, setWebhookEndpoints] = useState<DashboardWebhookEndpoint[]>([]);
  const [webhookLoaded, setWebhookLoaded] = useState(false);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookError, setWebhookError] = useState<string | null>(null);
  const [webhookActionId, setWebhookActionId] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookDescription, setWebhookDescription] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>([
    "submission.created",
    "submission.approved",
  ]);
  const [webhookFormSaving, setWebhookFormSaving] = useState(false);
  const [latestWebhookSecret, setLatestWebhookSecret] = useState<string | null>(null);
  const [webhookNotice, setWebhookNotice] = useState<string | null>(null);
  const [campaignWebhookUrl, setCampaignWebhookUrl] = useState("");
  const [campaignWebhookDescription, setCampaignWebhookDescription] = useState("");
  const [campaignWebhookEvents, setCampaignWebhookEvents] = useState<string[]>([
    "submission.created",
    "submission.approved",
  ]);
  const [campaignWebhookSaving, setCampaignWebhookSaving] = useState(false);
  const [campaignWebhookError, setCampaignWebhookError] = useState<string | null>(null);
  const [campaignWebhookNotice, setCampaignWebhookNotice] = useState<string | null>(null);
  const [latestCampaignWebhookSecret, setLatestCampaignWebhookSecret] = useState<string | null>(
    null
  );
  const [wallConfig, setWallConfig] = useState<WallOfLoveConfig | null>(null);
  const [wallLoading, setWallLoading] = useState(false);
  const [wallLoaded, setWallLoaded] = useState(false);
  const [wallSaving, setWallSaving] = useState(false);
  const [wallError, setWallError] = useState<string | null>(null);
  const [wallNotice, setWallNotice] = useState<string | null>(null);
  const [wallTitle, setWallTitle] = useState("Real people. Real results.");
  const [wallSubtitle, setWallSubtitle] = useState(
    "These are our customers speaking — unscripted, unedited, unrehearsed."
  );
  const [wallPublished, setWallPublished] = useState(false);
  const [wallIncludeAllCampaigns, setWallIncludeAllCampaigns] = useState(true);
  const [wallSelectedCampaignIds, setWallSelectedCampaignIds] = useState<string[]>([]);
  const [wallIncludeAllSubmissions, setWallIncludeAllSubmissions] = useState(true);
  const [wallSelectedSubmissionIds, setWallSelectedSubmissionIds] = useState<string[]>([]);
  const [brandProfile, setBrandProfile] = useState<BrandProfile | null>(null);
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Tellr.me");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#ff5c35");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#111318");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [brandLogoUploadProgress, setBrandLogoUploadProgress] = useState(0);
  const brandLogoFileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    if (activeSection !== "settings" || webhookLoaded || webhookLoading) {
      return;
    }

    let cancelled = false;

    async function loadWebhooks() {
      setWebhookLoading(true);
      setWebhookError(null);

      try {
        const response = await fetch("/api/webhooks/endpoints", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load webhook endpoints.");
        }

        if (!cancelled) {
          setWebhookEndpoints(data.endpoints || []);
          setWebhookLoaded(true);
        }
      } catch (error) {
        if (!cancelled) {
          setWebhookError(
            error instanceof Error ? error.message : "Failed to load webhook endpoints."
          );
        }
      } finally {
        if (!cancelled) {
          setWebhookLoading(false);
        }
      }
    }

    loadWebhooks();

    return () => {
      cancelled = true;
    };
  }, [activeSection, webhookLoaded, webhookLoading]);

  const selectedCampaign =
    campaignsState.find((campaign) => campaign.id === selectedCampaignId) || null;

  useEffect(() => {
    if (!selectedCampaign) {
      setCampaignWebhookUrl("");
      setCampaignWebhookDescription("");
      setCampaignWebhookEvents(["submission.created", "submission.approved"]);
      setCampaignWebhookError(null);
      setCampaignWebhookNotice(null);
      setLatestCampaignWebhookSecret(null);
      return;
    }

    setCampaignWebhookUrl(selectedCampaign.webhookEndpoint?.url || "");
    setCampaignWebhookDescription(selectedCampaign.webhookEndpoint?.description || "");
    setCampaignWebhookEvents(
      selectedCampaign.webhookEndpoint?.subscribedEvents?.length
        ? selectedCampaign.webhookEndpoint.subscribedEvents
        : ["submission.created", "submission.approved"]
    );
    setCampaignWebhookError(null);
    setCampaignWebhookNotice(null);
    setLatestCampaignWebhookSecret(null);
  }, [selectedCampaignId, selectedCampaign]);

  useEffect(() => {
    if (activeSection !== "wall" || wallLoaded || wallLoading) {
      return;
    }

    let cancelled = false;
    const abortController = new AbortController();
    const timeoutId = window.setTimeout(() => {
      abortController.abort();
    }, 8000);

    async function loadWallConfig() {
      setWallLoading(true);
      setWallError(null);

      try {
        const response = await fetch("/api/wall-of-love", {
          cache: "no-store",
          signal: abortController.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load Wall of Love settings.");
        }

        if (cancelled) {
          return;
        }

        const config = data.wall as WallOfLoveConfig;
        setWallConfig(config);
        setWallTitle(config.title || "Real people. Real results.");
        setWallSubtitle(
          config.subtitle ||
            "These are our customers speaking — unscripted, unedited, unrehearsed."
        );
        setWallPublished(Boolean(config.isPublished));
        setWallIncludeAllCampaigns(config.includeAllCampaigns !== false);
        setWallSelectedCampaignIds(config.selectedCampaignIds || []);
        setWallIncludeAllSubmissions(config.includeAllApprovedSubmissions !== false);
        setWallSelectedSubmissionIds(config.selectedSubmissionIds || []);
        setWallLoaded(true);
      } catch (error) {
        if (!cancelled) {
          const message =
            error instanceof Error && error.name === "AbortError"
              ? "Loading took too long. Showing local draft settings."
              : error instanceof Error
              ? error.message
              : "Failed to load Wall of Love settings.";
          setWallError(
            message
          );
          setWallLoaded(true);
        }
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) {
          setWallLoading(false);
        }
      }
    }

    loadWallConfig();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [activeSection, wallLoaded, wallLoading]);

  useEffect(() => {
    if (activeSection !== "brand" || brandLoaded || brandLoading) {
      return;
    }

    let cancelled = false;

    async function loadBrandProfile() {
      setBrandLoading(true);
      setBrandError(null);

      try {
        const response = await fetch("/api/brand-profile", {
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load brand settings.");
        }

        if (cancelled) {
          return;
        }

        const profile = data.brand as BrandProfile;
        setBrandProfile(profile);
        setBrandName(profile.brandName || "Tellr.me");
        setBrandPrimaryColor(profile.primaryColor || "#ff5c35");
        setBrandSecondaryColor(profile.secondaryColor || "#111318");
        setBrandLogoUrl(profile.logoUrl || "");
        setBrandWebsiteUrl(profile.websiteUrl || "");
        setBrandLoaded(true);
      } catch (error) {
        if (!cancelled) {
          setBrandError(
            error instanceof Error ? error.message : "Failed to load brand settings."
          );
          setBrandLoaded(true);
        }
      } finally {
        if (!cancelled) {
          setBrandLoading(false);
        }
      }
    }

    loadBrandProfile();

    return () => {
      cancelled = true;
    };
  }, [activeSection, brandLoaded, brandLoading]);

  const selectedCampaignStats = useMemo(() => {
    if (!selectedCampaign) {
      return null;
    }

    const total = selectedCampaign.submissions.length;
    const rated = selectedCampaign.submissions.filter(
      (submission) => typeof submission.reviewerRating === "number"
    );
    const avgRating =
      rated.length > 0
        ? rated.reduce((sum, submission) => sum + (submission.reviewerRating || 0), 0) /
          rated.length
        : 0;
    const approvedCount = selectedCampaign.submissions.filter(
      (submission) => normalizeSubmissionStatus(submission.status) === "APPROVED"
    ).length;

    return {
      total,
      avgRating,
      approvedCount,
    };
  }, [selectedCampaign]);

  const approvedSubmissionsForWall = useMemo<WallReviewSelection[]>(() => {
    const selectedCampaignSet = new Set(wallSelectedCampaignIds);

    return campaignsState.flatMap((campaign) => {
      if (!wallIncludeAllCampaigns && !selectedCampaignSet.has(campaign.id)) {
        return [];
      }

      return campaign.submissions
        .filter((submission) => normalizeSubmissionStatus(submission.status) === "APPROVED")
        .map((submission) => ({
          id: submission.id,
          campaignId: campaign.id,
          campaignName: campaign.name,
          reviewerName: submission.reviewerName,
          reviewerEmail: submission.reviewerEmail,
          reviewerRating: submission.reviewerRating,
          createdAt: submission.createdAt,
        }));
    });
  }, [campaignsState, wallIncludeAllCampaigns, wallSelectedCampaignIds]);

  const wallPublicPath = wallConfig ? `/wall/${wallConfig.slug}` : null;

  const primaryColorModel = useMemo(() => {
    const hex = normalizeHexInput(brandPrimaryColor, "#ff5c35");
    const rgb = hexToRgb(hex);
    return { hex, ...rgbToHsl(rgb.r, rgb.g, rgb.b) };
  }, [brandPrimaryColor]);

  const secondaryColorModel = useMemo(() => {
    const hex = normalizeHexInput(brandSecondaryColor, "#111318");
    const rgb = hexToRgb(hex);
    return { hex, ...rgbToHsl(rgb.r, rgb.g, rgb.b) };
  }, [brandSecondaryColor]);

  async function handleSubmissionAction(
    campaignId: string,
    submissionId: string,
    nextStatus: "APPROVED" | "REJECTED"
  ) {
    setSubmissionActionId(`${submissionId}:${nextStatus}`);

    try {
      const response = await fetch(
        `/api/campaigns/${campaignId}/submissions/${submissionId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update submission");
      }

      setCampaignsState((current) =>
        current.map((campaign) =>
          campaign.id !== campaignId
            ? campaign
            : {
                ...campaign,
                submissions: campaign.submissions.map((submission) =>
                  submission.id !== submissionId
                    ? submission
                    : {
                        ...submission,
                        status: nextStatus,
                      }
                ),
              }
        )
      );
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setSubmissionActionId(null);
    }
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  }

  async function toggleSubmissionPlayback(submissionId: string) {
    const target = videoRefs.current[submissionId];
    if (!target) {
      return;
    }

    if (playingSubmissionId && playingSubmissionId !== submissionId) {
      videoRefs.current[playingSubmissionId]?.pause();
    }

    if (!target.paused && !target.ended) {
      target.pause();
      setPlayingSubmissionId(null);
      return;
    }

    try {
      await target.play();
      setPlayingSubmissionId(submissionId);
    } catch (error) {
      console.error("Failed to play submission video:", error);
    }
  }

  function toggleWebhookEventSelection(eventType: string) {
    setWebhookEvents((current) =>
      current.includes(eventType)
        ? current.filter((entry) => entry !== eventType)
        : [...current, eventType]
    );
  }

  async function refreshWebhookEndpoints() {
    setWebhookLoading(true);
    setWebhookError(null);

    try {
      await fetch("/api/webhooks/dispatch", {
        method: "POST",
      });

      const response = await fetch("/api/webhooks/endpoints", {
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to load webhook endpoints.");
      }

      setWebhookEndpoints(data.endpoints || []);
      setWebhookLoaded(true);
    } catch (error) {
      setWebhookError(
        error instanceof Error ? error.message : "Failed to load webhook endpoints."
      );
    } finally {
      setWebhookLoading(false);
    }
  }

  async function handleCreateWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWebhookFormSaving(true);
    setWebhookError(null);
    setWebhookNotice(null);

    try {
      const response = await fetch("/api/webhooks/endpoints", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: webhookUrl,
          description: webhookDescription,
          subscribedEvents: webhookEvents,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create webhook endpoint.");
      }

      setWebhookUrl("");
      setWebhookDescription("");
      setWebhookEvents(["submission.created", "submission.approved"]);
      setLatestWebhookSecret(data.signingSecret || null);
      setWebhookNotice("Webhook endpoint created. Save the signing secret now.");
      await refreshWebhookEndpoints();
    } catch (error) {
      setWebhookError(
        error instanceof Error ? error.message : "Failed to create webhook endpoint."
      );
    } finally {
      setWebhookFormSaving(false);
    }
  }

  async function handleWebhookAction(
    actionId: string,
    run: () => Promise<void>
  ) {
    setWebhookActionId(actionId);
    setWebhookError(null);
    setWebhookNotice(null);

    try {
      await run();
    } catch (error) {
      setWebhookError(
        error instanceof Error ? error.message : "Webhook action failed."
      );
    } finally {
      setWebhookActionId(null);
    }
  }

  async function handleToggleWebhook(endpoint: DashboardWebhookEndpoint) {
    await handleWebhookAction(`toggle:${endpoint.id}`, async () => {
      const response = await fetch(`/api/webhooks/endpoints/${endpoint.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isActive: !endpoint.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update webhook endpoint.");
      }

      setWebhookNotice(
        endpoint.isActive ? "Webhook paused." : "Webhook re-enabled."
      );
      await refreshWebhookEndpoints();
    });
  }

  async function handleRotateWebhookSecret(endpointId: string) {
    await handleWebhookAction(`rotate:${endpointId}`, async () => {
      const response = await fetch(`/api/webhooks/endpoints/${endpointId}/rotate`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to rotate webhook secret.");
      }

      setLatestWebhookSecret(data.signingSecret || null);
      setWebhookNotice("Signing secret rotated. Save the new secret now.");
      await refreshWebhookEndpoints();
    });
  }

  async function handleSendWebhookTest(endpointId: string) {
    await handleWebhookAction(`test:${endpointId}`, async () => {
      const response = await fetch(`/api/webhooks/endpoints/${endpointId}/test`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send webhook test.");
      }

      const result = data.dispatch?.results?.[0];
      setWebhookNotice(
        result?.status === "SUCCESS"
          ? "Test event delivered."
          : "Test event queued. Check delivery status below."
      );
      await refreshWebhookEndpoints();
    });
  }

  async function handleDeleteWebhook(endpointId: string) {
    await handleWebhookAction(`delete:${endpointId}`, async () => {
      const response = await fetch(`/api/webhooks/endpoints/${endpointId}`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete webhook endpoint.");
      }

      setLatestWebhookSecret(null);
      setWebhookNotice("Webhook endpoint deleted.");
      await refreshWebhookEndpoints();
    });
  }

  function toggleCampaignWebhookEventSelection(eventType: string) {
    setCampaignWebhookEvents((current) =>
      current.includes(eventType)
        ? current.filter((entry) => entry !== eventType)
        : [...current, eventType]
    );
  }

  function updateCampaignWebhookState(
    campaignId: string,
    endpoint: CampaignWebhookPayload | null
  ) {
    setCampaignsState((current) =>
      current.map((campaign) =>
        campaign.id === campaignId
          ? {
              ...campaign,
              webhookEndpoint: endpoint,
            }
          : campaign
      )
    );
  }

  async function handleSaveCampaignWebhook(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedCampaign) {
      return;
    }

    setCampaignWebhookSaving(true);
    setCampaignWebhookError(null);
    setCampaignWebhookNotice(null);

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/webhook`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: campaignWebhookUrl,
          description: campaignWebhookDescription,
          subscribedEvents: campaignWebhookEvents,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save campaign webhook.");
      }

      updateCampaignWebhookState(selectedCampaign.id, data.endpoint || null);
      setCampaignWebhookNotice(
        data.signingSecret
          ? "Campaign webhook saved. Save the signing secret now."
          : "Campaign webhook updated."
      );
      setLatestCampaignWebhookSecret(data.signingSecret || null);
    } catch (error) {
      setCampaignWebhookError(
        error instanceof Error ? error.message : "Failed to save campaign webhook."
      );
    } finally {
      setCampaignWebhookSaving(false);
    }
  }

  async function handleRemoveCampaignWebhook() {
    if (!selectedCampaign) {
      return;
    }

    setCampaignWebhookSaving(true);
    setCampaignWebhookError(null);
    setCampaignWebhookNotice(null);

    try {
      const response = await fetch(`/api/campaigns/${selectedCampaign.id}/webhook`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to remove campaign webhook.");
      }

      updateCampaignWebhookState(selectedCampaign.id, null);
      setCampaignWebhookUrl("");
      setCampaignWebhookDescription("");
      setCampaignWebhookEvents(["submission.created", "submission.approved"]);
      setLatestCampaignWebhookSecret(null);
      setCampaignWebhookNotice("Campaign webhook removed. Account-level webhooks will be used.");
    } catch (error) {
      setCampaignWebhookError(
        error instanceof Error ? error.message : "Failed to remove campaign webhook."
      );
    } finally {
      setCampaignWebhookSaving(false);
    }
  }

  function toggleWallCampaignSelection(campaignId: string) {
    setWallSelectedCampaignIds((current) =>
      current.includes(campaignId)
        ? current.filter((entry) => entry !== campaignId)
        : [...current, campaignId]
    );
  }

  function toggleWallSubmissionSelection(submissionId: string) {
    setWallSelectedSubmissionIds((current) =>
      current.includes(submissionId)
        ? current.filter((entry) => entry !== submissionId)
        : [...current, submissionId]
    );
  }

  async function handleSaveWallSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setWallSaving(true);
    setWallError(null);
    setWallNotice(null);

    try {
      const response = await fetch("/api/wall-of-love", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: wallTitle,
          subtitle: wallSubtitle,
          isPublished: wallPublished,
          includeAllCampaigns: wallIncludeAllCampaigns,
          selectedCampaignIds: wallSelectedCampaignIds,
          includeAllApprovedSubmissions: wallIncludeAllSubmissions,
          selectedSubmissionIds: wallSelectedSubmissionIds,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save Wall of Love settings.");
      }

      const nextConfig = data.wall as WallOfLoveConfig;
      setWallConfig(nextConfig);
      setWallTitle(nextConfig.title || "Real people. Real results.");
      setWallSubtitle(
        nextConfig.subtitle ||
          "These are our customers speaking — unscripted, unedited, unrehearsed."
      );
      setWallPublished(Boolean(nextConfig.isPublished));
      setWallIncludeAllCampaigns(nextConfig.includeAllCampaigns !== false);
      setWallSelectedCampaignIds(nextConfig.selectedCampaignIds || []);
      setWallIncludeAllSubmissions(nextConfig.includeAllApprovedSubmissions !== false);
      setWallSelectedSubmissionIds(nextConfig.selectedSubmissionIds || []);
      setWallNotice("Wall of Love settings saved.");
    } catch (error) {
      setWallError(
        error instanceof Error ? error.message : "Failed to save Wall of Love settings."
      );
    } finally {
      setWallSaving(false);
    }
  }

  function updatePrimaryColorFromHsl(next: Partial<{ h: number; s: number; l: number }>) {
    const h = next.h ?? primaryColorModel.h;
    const s = next.s ?? primaryColorModel.s;
    const l = next.l ?? primaryColorModel.l;
    setBrandPrimaryColor(hslToHex(h, s, l));
  }

  function updateSecondaryColorFromHsl(next: Partial<{ h: number; s: number; l: number }>) {
    const h = next.h ?? secondaryColorModel.h;
    const s = next.s ?? secondaryColorModel.s;
    const l = next.l ?? secondaryColorModel.l;
    setBrandSecondaryColor(hslToHex(h, s, l));
  }

  async function handleBrandLogoFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setBrandLogoUploading(true);
    setBrandLogoUploadProgress(0);
    setBrandError(null);
    setBrandNotice(null);

    try {
      const prepareRes = await fetch("/api/brand-profile/logo-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contentType: file.type,
          size: file.size,
        }),
      });
      const prepareData = await prepareRes.json();

      if (!prepareRes.ok) {
        throw new Error(prepareData.error || "Failed to prepare logo upload.");
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener("progress", (progressEvent) => {
          if (progressEvent.lengthComputable) {
            setBrandLogoUploadProgress(
              Math.round((progressEvent.loaded / progressEvent.total) * 100)
            );
          }
        });

        xhr.addEventListener("load", () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
            return;
          }

          reject(new Error("Logo upload failed."));
        });

        xhr.addEventListener("error", () => {
          reject(new Error("Network error during logo upload."));
        });

        xhr.open("PUT", prepareData.uploadUrl, true);
        xhr.setRequestHeader("Content-Type", file.type);
        xhr.send(file);
      });

      setBrandLogoUrl(prepareData.logoUrl as string);
      setBrandNotice("Logo uploaded. Click save to persist brand settings.");
      setBrandLogoUploadProgress(100);
    } catch (error) {
      setBrandError(
        error instanceof Error ? error.message : "Failed to upload brand logo."
      );
    } finally {
      setBrandLogoUploading(false);
      if (brandLogoFileInputRef.current) {
        brandLogoFileInputRef.current.value = "";
      }
    }
  }

  async function handleSaveBrandSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBrandSaving(true);
    setBrandError(null);
    setBrandNotice(null);

    try {
      const response = await fetch("/api/brand-profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          brandName,
          primaryColor: normalizeHexInput(brandPrimaryColor, "#ff5c35"),
          secondaryColor: normalizeHexInput(brandSecondaryColor, "#111318"),
          logoUrl: brandLogoUrl,
          websiteUrl: brandWebsiteUrl,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save brand settings.");
      }

      const profile = data.brand as BrandProfile;
      setBrandProfile(profile);
      setBrandName(profile.brandName || "Tellr.me");
      setBrandPrimaryColor(profile.primaryColor || "#ff5c35");
      setBrandSecondaryColor(profile.secondaryColor || "#111318");
      setBrandLogoUrl(profile.logoUrl || "");
      setBrandWebsiteUrl(profile.websiteUrl || "");
      setBrandNotice("Brand settings saved.");
      router.refresh();
    } catch (error) {
      setBrandError(
        error instanceof Error ? error.message : "Failed to save brand settings."
      );
    } finally {
      setBrandSaving(false);
    }
  }

  function scrollDashboardToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function openCampaignsSection() {
    setActiveSection("campaigns");
    setShowBuilder(false);
    setSelectedCampaignId(null);
    scrollDashboardToTop();
  }

  function openSettingsSection() {
    setActiveSection("settings");
    setShowBuilder(false);
    setSelectedCampaignId(null);
    scrollDashboardToTop();
  }

  function openWallSection() {
    setActiveSection("wall");
    setShowBuilder(false);
    setSelectedCampaignId(null);
    scrollDashboardToTop();
  }

  function openBrandSection() {
    setActiveSection("brand");
    setShowBuilder(false);
    setSelectedCampaignId(null);
    scrollDashboardToTop();
  }

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-top">
          <Link href="/" className="dashboard-brand">
            <Image
              src="/tellr-logo.svg"
              alt="Tellr.me"
              className="dashboard-brand-image"
              width={160}
              height={42}
            />
          </Link>

          <div className="dashboard-profile-card">
            <div className="dashboard-avatar">
              <UserButton afterSignOutUrl="/" />
            </div>
            <div>
              <p className="dashboard-profile-name">{viewerName}</p>
              <p className="dashboard-profile-workspace">{workspaceName}</p>
            </div>
          </div>
        </div>

        <div className="dashboard-sidebar-nav">
          <p className="dashboard-nav-label">Menu</p>

          <button
            type="button"
            className={`dashboard-nav-item ${
              activeSection === "campaigns" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
            }`}
            onClick={openCampaignsSection}
          >
            <span className="dashboard-nav-icon">🎥</span>
            <span>Campaign</span>
            <span className="dashboard-nav-count">{campaignsState.length}</span>
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${
              activeSection === "wall" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
            }`}
            onClick={openWallSection}
          >
            <span className="dashboard-nav-icon">🧱</span>
            <span>Wall of Love</span>
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${
              activeSection === "brand" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
            }`}
            onClick={openBrandSection}
          >
            <span className="dashboard-nav-icon">🎨</span>
            <span>Brand</span>
          </button>

          <button
            type="button"
            className={`dashboard-nav-item ${
              activeSection === "settings" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
            }`}
            onClick={openSettingsSection}
          >
            <span className="dashboard-nav-icon">⚙️</span>
            <span>Settings</span>
          </button>
        </div>
      </aside>

      <section className="dashboard-main">
        <div className="dashboard-topbar">
          <p className="dashboard-topbar-title">
            {activeSection === "settings"
              ? "Settings"
              : activeSection === "brand"
              ? "Brand"
              : activeSection === "wall"
              ? "Wall of Love"
              : showBuilder
              ? "New Campaign"
              : selectedCampaign
                ? `${selectedCampaign.name} — Submissions`
                : "Campaigns"}
          </p>
        </div>

        <div className="dashboard-content">
          {activeSection === "campaigns" && !showBuilder && !selectedCampaign && (
            <div className="dashboard-hero-card">
              <div>
                <p className="dashboard-eyebrow">Campaign</p>
                <h1 className="dashboard-title">Your campaigns</h1>
                <p className="dashboard-subtitle">
                  Create and manage your public video review campaigns from here.
                </p>
              </div>

                <button
                  type="button"
                  className="dashboard-action-btn"
                  onClick={() => setShowBuilder((current) => !current)}
                >
                + New campaign
              </button>
            </div>
          )}

          {activeSection === "campaigns" && !campaignRuntimeReady && (
            <div className="dashboard-alert-card">
              Campaign data is not available in the current server runtime. Restart the dev server if this message appears again.
            </div>
          )}

          {activeSection === "campaigns" && showBuilder && (
            <div className="dashboard-builder-wrap">
              <div className="dashboard-builder-toolbar">
                <button
                  type="button"
                  className="dashboard-secondary-btn"
                  onClick={() => setShowBuilder(false)}
                >
                  Close builder ×
                </button>
              </div>
              <CampaignBuilder />
            </div>
          )}

          {activeSection === "campaigns" && !showBuilder && !selectedCampaign && (
            <div className="dashboard-list-card">
              <div className="dashboard-list-head">
                <h2 className="dashboard-list-title">Active campaigns</h2>
                <span className="dashboard-list-count">{campaignsState.length} campaigns</span>
              </div>

              {campaignsState.length === 0 ? (
                <div className="dashboard-empty-state">No campaigns created yet.</div>
              ) : (
                campaignsState.map((campaign, index) => {
                  const state = getCampaignState(campaign.hasNoEndDate, campaign.endsAt);
                  const submissionCount = campaign.submissions.length;

                  return (
                    <div
                      key={campaign.id}
                      className={`dashboard-campaign-row ${index > 0 ? "with-divider" : ""}`}
                    >
                      <div className="dashboard-campaign-copy">
                        <p className="dashboard-campaign-name">{campaign.name}</p>
                        <p className="dashboard-campaign-path">{campaign.publicPath}</p>
                      </div>

                      <div className="dashboard-campaign-actions">
                        {submissionCount > 0 && (
                          <span className="dashboard-video-count">
                            {submissionCount} {submissionCount === 1 ? "video" : "videos"}
                          </span>
                        )}

                        <span
                          className={`dashboard-status-badge ${
                            state === "Active" ? "is-active" : "is-inactive"
                          }`}
                        >
                          {state}
                        </span>

                        <button
                          type="button"
                          className="dashboard-secondary-btn"
                          onClick={() => setSelectedCampaignId(campaign.id)}
                        >
                          Submissions
                        </button>

                        <a
                          href={campaign.publicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-icon-link"
                          aria-label="Open public campaign page"
                        >
                          ↗
                        </a>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeSection === "campaigns" && selectedCampaign && (
            <div className="dashboard-submissions-card">
              <div className="dashboard-builder-toolbar dashboard-sub-toolbar">
                <button
                  type="button"
                  className="dashboard-secondary-btn dashboard-back-btn"
                  onClick={() => setSelectedCampaignId(null)}
                >
                  ← All campaigns
                </button>
              </div>

              <div className="dashboard-submissions-summary">
                <div>
                  <p className="dashboard-eyebrow">Submissions</p>
                  <h2 className="dashboard-submissions-title">{selectedCampaign.name}</h2>
                  <p className="dashboard-submissions-link">
                    tellr.me{selectedCampaign.publicPath}
                  </p>
                </div>

                <button
                  type="button"
                  className="dashboard-secondary-btn dashboard-copy-btn"
                  onClick={() => copyText(`tellr.me${selectedCampaign.publicPath}`)}
                >
                  📋 Copy link
                </button>
              </div>

              <div className="dashboard-campaign-webhook-card">
                <div className="dashboard-campaign-webhook-head">
                  <div>
                    <p className="dashboard-eyebrow">Automation</p>
                    <h3 className="dashboard-campaign-webhook-title">
                      Campaign webhook override
                    </h3>
                    <p className="dashboard-campaign-webhook-copy">
                      If set, this campaign sends events only to the custom endpoint below.
                      Otherwise events fall back to your account-level webhooks.
                    </p>
                  </div>
                  <span className="dashboard-settings-pill">
                    {selectedCampaign.webhookEndpoint
                      ? "Using campaign webhook"
                      : "Using account webhooks"}
                  </span>
                </div>

                {campaignWebhookError && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-error">
                    {campaignWebhookError}
                  </div>
                )}

                {campaignWebhookNotice && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-success">
                    {campaignWebhookNotice}
                  </div>
                )}

                {latestCampaignWebhookSecret && (
                  <div className="dashboard-secret-card">
                    <div>
                      <p className="dashboard-settings-label">Campaign signing secret</p>
                      <p className="dashboard-secret-value">{latestCampaignWebhookSecret}</p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-action-btn dashboard-secondary-action"
                      onClick={() => {
                        copyText(latestCampaignWebhookSecret);
                      }}
                    >
                      Copy secret
                    </button>
                  </div>
                )}

                <form className="dashboard-webhook-form" onSubmit={handleSaveCampaignWebhook}>
                  <div className="dashboard-webhook-form-grid">
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Endpoint URL</span>
                      <input
                        type="url"
                        className="dashboard-webhook-input"
                        placeholder="https://hooks.zapier.com/..."
                        value={campaignWebhookUrl}
                        onChange={(event) => {
                          setCampaignWebhookUrl(event.target.value);
                        }}
                        required
                      />
                    </label>
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Description</span>
                      <input
                        type="text"
                        className="dashboard-webhook-input"
                        placeholder="Campaign-specific integration"
                        value={campaignWebhookDescription}
                        onChange={(event) => {
                          setCampaignWebhookDescription(event.target.value);
                        }}
                      />
                    </label>
                  </div>

                  <div className="dashboard-webhook-events">
                    {WEBHOOK_EVENT_OPTIONS.map((option) => (
                      <label key={`campaign-${option.value}`} className="dashboard-webhook-event-option">
                        <input
                          type="checkbox"
                          checked={campaignWebhookEvents.includes(option.value)}
                          onChange={() => {
                            toggleCampaignWebhookEventSelection(option.value);
                          }}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.helper}</small>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="dashboard-webhook-actions">
                    <button
                      type="submit"
                      className="dashboard-action-btn"
                      disabled={campaignWebhookSaving || campaignWebhookEvents.length === 0}
                    >
                      {campaignWebhookSaving ? "Saving..." : "Save campaign webhook"}
                    </button>

                    {selectedCampaign.webhookEndpoint && (
                      <button
                        type="button"
                        className="dashboard-action-btn dashboard-secondary-action"
                        disabled={campaignWebhookSaving}
                        onClick={handleRemoveCampaignWebhook}
                      >
                        {campaignWebhookSaving ? "Removing..." : "Remove override"}
                      </button>
                    )}
                  </div>
                </form>
              </div>

              <div className="dashboard-metrics-grid">
                <div className="dashboard-metric-card">
                  <p className="dashboard-metric-label">Total submissions</p>
                  <p className="dashboard-metric-value">{selectedCampaignStats?.total || 0}</p>
                </div>
                <div className="dashboard-metric-card">
                  <p className="dashboard-metric-label">Avg. rating</p>
                  <p className="dashboard-metric-value">
                    {selectedCampaignStats && selectedCampaignStats.total > 0
                      ? `${selectedCampaignStats.avgRating.toFixed(1)}★`
                      : "0.0★"}
                  </p>
                </div>
                <div className="dashboard-metric-card">
                  <p className="dashboard-metric-label">Rewards sent</p>
                  <p className="dashboard-metric-value">
                    {selectedCampaignStats?.approvedCount || 0}
                  </p>
                </div>
              </div>

              <div className="dashboard-reviews-shell">
                <div className="dashboard-reviews-head">
                  <h3 className="dashboard-reviews-title">Video reviews</h3>
                  <span className="dashboard-list-count">
                    {selectedCampaign.submissions.length}{" "}
                    {selectedCampaign.submissions.length === 1 ? "review" : "reviews"}
                  </span>
                </div>

                {selectedCampaign.submissions.length === 0 ? (
                  <div className="dashboard-empty-state">No submissions collected yet.</div>
                ) : (
                  <div className="dashboard-review-grid">
                    {selectedCampaign.submissions.map((submission) => {
                      const normalizedStatus = normalizeSubmissionStatus(submission.status);
                      const isApproved = normalizedStatus === "APPROVED";
                      const isPending = normalizedStatus === "PENDING";
                      const durationLabel = formatSubmissionDuration(submission.durationSeconds);
                      const excerpt = getSubmissionExcerpt(submission.answers);
                      const approveActionKey = `${submission.id}:APPROVED`;
                      const rejectActionKey = `${submission.id}:REJECTED`;

                      return (
                        <article key={submission.id} className="dashboard-review-card">
                          <div className="dashboard-review-video">
                            <span
                              className={`dashboard-review-badge ${
                                isApproved
                                  ? "is-approved"
                                  : isPending
                                    ? "is-pending"
                                    : "is-rejected"
                              }`}
                            >
                              {isApproved ? "Published" : isPending ? "Pending" : "Removed"}
                            </span>

                            <video
                              src={`/api/campaigns/${selectedCampaign.id}/submissions/${submission.id}/view`}
                              ref={(node) => {
                                videoRefs.current[submission.id] = node;
                              }}
                              preload="metadata"
                              playsInline
                              onClick={() => toggleSubmissionPlayback(submission.id)}
                              onPlay={() => setPlayingSubmissionId(submission.id)}
                              onPause={() => {
                                setPlayingSubmissionId((current) =>
                                  current === submission.id ? null : current
                                );
                              }}
                              onEnded={() => {
                                setPlayingSubmissionId((current) =>
                                  current === submission.id ? null : current
                                );
                              }}
                            />

                            {playingSubmissionId !== submission.id && (
                              <button
                                type="button"
                                className="dashboard-review-play"
                                onClick={() => toggleSubmissionPlayback(submission.id)}
                                aria-label="Play video"
                              >
                                ▶
                              </button>
                            )}

                            <span className="dashboard-review-time">
                              {durationLabel ||
                                new Date(submission.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          <div className="dashboard-review-body">
                            <p className="dashboard-review-name">{submission.reviewerName}</p>
                            <p className="dashboard-review-email">{submission.reviewerEmail}</p>
                            <p className="dashboard-review-stars">
                              {"★".repeat(submission.reviewerRating || 0)}
                              <span className="dashboard-review-stars-muted">
                                {"★".repeat(Math.max(5 - (submission.reviewerRating || 0), 0))}
                              </span>
                            </p>
                            <p className="dashboard-review-note">
                              {excerpt ||
                                `Submitted on ${new Date(submission.createdAt).toLocaleDateString()}`}
                            </p>
                          </div>

                          <div className="dashboard-review-actions">
                            {isApproved ? (
                              <>
                                <span className="dashboard-status-badge dashboard-review-status is-active">
                                  Published
                                </span>
                                <button
                                  type="button"
                                  className="dashboard-secondary-btn dashboard-inline-action"
                                  onClick={() => {
                                    handleSubmissionAction(
                                      selectedCampaign.id,
                                      submission.id,
                                      "REJECTED"
                                    );
                                  }}
                                  disabled={submissionActionId === rejectActionKey}
                                >
                                  {submissionActionId === rejectActionKey ? "Saving..." : "Remove"}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                className="dashboard-action-btn dashboard-inline-action"
                                onClick={() => {
                                  handleSubmissionAction(
                                    selectedCampaign.id,
                                    submission.id,
                                    "APPROVED"
                                  );
                                }}
                                disabled={submissionActionId === approveActionKey}
                              >
                                {submissionActionId === approveActionKey ? "Saving..." : "Approve"}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeSection === "wall" && (
            <div className="dashboard-settings-shell">
              <div className="dashboard-settings-card">
                <div className="dashboard-settings-head">
                  <div>
                    <p className="dashboard-eyebrow">Wall of Love</p>
                    <h2 className="dashboard-settings-title">Publish social proof wall</h2>
                    <p className="dashboard-settings-copy">
                      Build a public page with your best approved video reviews. Choose which
                      campaigns and submissions are visible.
                    </p>
                  </div>
                  <span className="dashboard-settings-pill">
                    {wallPublished ? "Published" : "Draft"}
                  </span>
                </div>

                {wallError && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-error">
                    {wallError}
                  </div>
                )}

                {wallNotice && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-success">
                    {wallNotice}
                  </div>
                )}

                <form className="dashboard-webhook-form" onSubmit={handleSaveWallSettings}>
                  {wallLoading && (
                    <div className="dashboard-settings-alert dashboard-settings-alert-neutral">
                      {wallConfig
                        ? "Refreshing Wall of Love settings..."
                        : "Loading Wall of Love settings... You can already edit the draft."}
                    </div>
                  )}

                  <div className="dashboard-webhook-form-grid">
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Wall title</span>
                      <input
                        type="text"
                        className="dashboard-webhook-input"
                        value={wallTitle}
                        onChange={(event) => {
                          setWallTitle(event.target.value);
                        }}
                        maxLength={120}
                        required
                      />
                    </label>
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Wall subtitle</span>
                      <input
                        type="text"
                        className="dashboard-webhook-input"
                        value={wallSubtitle}
                        onChange={(event) => {
                          setWallSubtitle(event.target.value);
                        }}
                        maxLength={240}
                      />
                    </label>
                  </div>

                    <div className="dashboard-wall-toggle-grid">
                      <label className="dashboard-webhook-event-option">
                      <input
                        type="checkbox"
                        checked={wallPublished}
                        onChange={(event) => {
                          setWallPublished(event.target.checked);
                        }}
                      />
                        <span>
                          <strong>Publish Wall of Love</strong>
                          <small>
                            {wallPublicPath
                              ? `Make your wall public at tellr.me${wallPublicPath}.`
                              : "Make your wall public at your personal wall URL."}
                          </small>
                        </span>
                      </label>

                    <label className="dashboard-webhook-event-option">
                      <input
                        type="checkbox"
                        checked={wallIncludeAllCampaigns}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setWallIncludeAllCampaigns(checked);
                          if (checked) {
                            setWallSelectedCampaignIds([]);
                          }
                        }}
                      />
                      <span>
                        <strong>Include all campaigns</strong>
                        <small>Disable to select specific campaigns.</small>
                      </span>
                    </label>

                    <label className="dashboard-webhook-event-option">
                      <input
                        type="checkbox"
                        checked={wallIncludeAllSubmissions}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setWallIncludeAllSubmissions(checked);
                          if (checked) {
                            setWallSelectedSubmissionIds([]);
                          }
                        }}
                      />
                      <span>
                        <strong>Include all approved submissions</strong>
                        <small>Disable to manually choose which reviews are visible.</small>
                      </span>
                      </label>
                    </div>

                    {wallPublished && wallPublicPath && (
                      <div className="dashboard-wall-link-card">
                        <div>
                          <p className="dashboard-settings-label">Public wall link</p>
                          <p className="dashboard-wall-link-value">tellr.me{wallPublicPath}</p>
                        </div>
                        <div className="dashboard-webhook-actions">
                          <button
                            type="button"
                            className="dashboard-action-btn dashboard-secondary-action"
                            onClick={() => {
                              copyText(`tellr.me${wallPublicPath}`);
                            }}
                          >
                            Copy link
                          </button>
                          <a
                            href={wallPublicPath}
                            target="_blank"
                            rel="noreferrer"
                            className="dashboard-action-btn dashboard-secondary-action"
                          >
                            Open wall
                          </a>
                        </div>
                      </div>
                    )}

                  <div className="dashboard-wall-selection-card">
                    <p className="dashboard-settings-label">Wall preview data</p>
                    {approvedSubmissionsForWall.length === 0 ? (
                      <p className="dashboard-settings-copy">
                        No approved submissions yet. Once you approve reviews, they will appear here
                        and can be published on your wall.
                      </p>
                    ) : (
                      <div className="dashboard-wall-preview-list">
                        {approvedSubmissionsForWall.slice(0, 3).map((submission) => (
                          <div key={submission.id} className="dashboard-wall-preview-item">
                            <p>{submission.reviewerName}</p>
                            <small>
                              {submission.campaignName} ·{" "}
                              {submission.reviewerRating ? `${submission.reviewerRating}★` : "No rating"}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {!wallIncludeAllCampaigns && (
                    <div className="dashboard-wall-selection-card">
                      <p className="dashboard-settings-label">Visible campaigns</p>
                      {campaignsState.length === 0 ? (
                        <p className="dashboard-settings-copy">No campaigns available.</p>
                      ) : (
                        <div className="dashboard-wall-list">
                          {campaignsState.map((campaign) => (
                            <label key={campaign.id} className="dashboard-webhook-event-option">
                              <input
                                type="checkbox"
                                checked={wallSelectedCampaignIds.includes(campaign.id)}
                                onChange={() => {
                                  toggleWallCampaignSelection(campaign.id);
                                }}
                              />
                              <span>
                                <strong>{campaign.name}</strong>
                                <small>{campaign.submissions.length} submissions</small>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {!wallIncludeAllSubmissions && (
                    <div className="dashboard-wall-selection-card">
                      <p className="dashboard-settings-label">Visible reviews</p>
                      {approvedSubmissionsForWall.length === 0 ? (
                        <p className="dashboard-settings-copy">
                          No approved submissions available for the selected campaigns.
                        </p>
                      ) : (
                        <div className="dashboard-wall-list">
                          {approvedSubmissionsForWall.map((submission) => (
                            <label key={submission.id} className="dashboard-webhook-event-option">
                              <input
                                type="checkbox"
                                checked={wallSelectedSubmissionIds.includes(submission.id)}
                                onChange={() => {
                                  toggleWallSubmissionSelection(submission.id);
                                }}
                              />
                              <span>
                                <strong>{submission.reviewerName}</strong>
                                <small>
                                  {submission.campaignName} ·{" "}
                                  {submission.reviewerRating
                                    ? `${submission.reviewerRating}★`
                                    : "No rating"}
                                </small>
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="dashboard-webhook-actions">
                    <button type="submit" className="dashboard-action-btn" disabled={wallSaving}>
                      {wallSaving ? "Saving..." : "Save Wall settings"}
                    </button>

                    {wallPublicPath && (
                      <>
                        <button
                          type="button"
                          className="dashboard-action-btn dashboard-secondary-action"
                          onClick={() => {
                            copyText(`tellr.me${wallPublicPath}`);
                          }}
                        >
                          Copy wall link
                        </button>
                        <a
                          href={wallPublicPath}
                          target="_blank"
                          rel="noreferrer"
                          className="dashboard-action-btn dashboard-secondary-action"
                        >
                          Open wall
                        </a>
                      </>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === "brand" && (
            <div className="dashboard-settings-shell">
              <div className="dashboard-settings-card">
                <div className="dashboard-settings-head">
                  <div>
                    <p className="dashboard-eyebrow">Brand</p>
                    <h2 className="dashboard-settings-title">Brand identity</h2>
                    <p className="dashboard-settings-copy">
                      Configure your brand details for campaigns and public pages.
                    </p>
                  </div>
                  <span className="dashboard-settings-pill">
                    {brandProfile ? "Configured" : "Draft"}
                  </span>
                </div>

                {brandError && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-error">
                    {brandError}
                  </div>
                )}

                {brandNotice && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-success">
                    {brandNotice}
                  </div>
                )}

                <form className="dashboard-webhook-form" onSubmit={handleSaveBrandSettings}>
                  {brandLoading && (
                    <div className="dashboard-settings-alert dashboard-settings-alert-neutral">
                      Loading brand settings...
                    </div>
                  )}

                  <div className="dashboard-webhook-form-grid">
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Brand name</span>
                      <input
                        type="text"
                        className="dashboard-webhook-input"
                        value={brandName}
                        onChange={(event) => {
                          setBrandName(event.target.value);
                        }}
                        maxLength={80}
                        required
                      />
                    </label>

                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Website URL</span>
                      <input
                        type="url"
                        className="dashboard-webhook-input"
                        value={brandWebsiteUrl}
                        onChange={(event) => {
                          setBrandWebsiteUrl(event.target.value);
                        }}
                        placeholder="https://yourcompany.com"
                      />
                    </label>
                  </div>

                  <div className="dashboard-webhook-form-grid">
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Primary color</span>
                      <div className="dashboard-brand-color-field">
                        <div
                          className="dashboard-brand-color-chip"
                          style={{ background: primaryColorModel.hex }}
                        />
                        <input
                          type="text"
                          className="dashboard-webhook-input"
                          value={brandPrimaryColor}
                          onChange={(event) => {
                            setBrandPrimaryColor(event.target.value);
                          }}
                          onBlur={() => {
                            setBrandPrimaryColor((current) =>
                              normalizeHexInput(current, "#ff5c35")
                            );
                          }}
                          placeholder="#ff5c35"
                        />
                      </div>
                      <div className="dashboard-brand-color-composer">
                        <label className="dashboard-brand-slider-row">
                          <span>Hue</span>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            value={primaryColorModel.h}
                            className="dashboard-brand-slider"
                            style={{
                              background:
                                "linear-gradient(90deg,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)",
                            }}
                            onChange={(event) => {
                              updatePrimaryColorFromHsl({
                                h: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                        <label className="dashboard-brand-slider-row">
                          <span>Saturation</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={primaryColorModel.s}
                            className="dashboard-brand-slider"
                            style={{
                              background: `linear-gradient(90deg, hsl(${primaryColorModel.h} 0% ${primaryColorModel.l}%), hsl(${primaryColorModel.h} 100% ${primaryColorModel.l}%))`,
                            }}
                            onChange={(event) => {
                              updatePrimaryColorFromHsl({
                                s: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                        <label className="dashboard-brand-slider-row">
                          <span>Lightness</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={primaryColorModel.l}
                            className="dashboard-brand-slider"
                            style={{
                              background: `linear-gradient(90deg, #000000 0%, hsl(${primaryColorModel.h} ${primaryColorModel.s}% 50%) 50%, #ffffff 100%)`,
                            }}
                            onChange={(event) => {
                              updatePrimaryColorFromHsl({
                                l: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                      </div>
                    </label>

                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Secondary color</span>
                      <div className="dashboard-brand-color-field">
                        <div
                          className="dashboard-brand-color-chip"
                          style={{ background: secondaryColorModel.hex }}
                        />
                        <input
                          type="text"
                          className="dashboard-webhook-input"
                          value={brandSecondaryColor}
                          onChange={(event) => {
                            setBrandSecondaryColor(event.target.value);
                          }}
                          onBlur={() => {
                            setBrandSecondaryColor((current) =>
                              normalizeHexInput(current, "#111318")
                            );
                          }}
                          placeholder="#111318"
                        />
                      </div>
                      <div className="dashboard-brand-color-composer">
                        <label className="dashboard-brand-slider-row">
                          <span>Hue</span>
                          <input
                            type="range"
                            min={0}
                            max={360}
                            value={secondaryColorModel.h}
                            className="dashboard-brand-slider"
                            style={{
                              background:
                                "linear-gradient(90deg,#ff0000 0%,#ffff00 17%,#00ff00 33%,#00ffff 50%,#0000ff 67%,#ff00ff 83%,#ff0000 100%)",
                            }}
                            onChange={(event) => {
                              updateSecondaryColorFromHsl({
                                h: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                        <label className="dashboard-brand-slider-row">
                          <span>Saturation</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={secondaryColorModel.s}
                            className="dashboard-brand-slider"
                            style={{
                              background: `linear-gradient(90deg, hsl(${secondaryColorModel.h} 0% ${secondaryColorModel.l}%), hsl(${secondaryColorModel.h} 100% ${secondaryColorModel.l}%))`,
                            }}
                            onChange={(event) => {
                              updateSecondaryColorFromHsl({
                                s: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                        <label className="dashboard-brand-slider-row">
                          <span>Lightness</span>
                          <input
                            type="range"
                            min={0}
                            max={100}
                            value={secondaryColorModel.l}
                            className="dashboard-brand-slider"
                            style={{
                              background: `linear-gradient(90deg, #000000 0%, hsl(${secondaryColorModel.h} ${secondaryColorModel.s}% 50%) 50%, #ffffff 100%)`,
                            }}
                            onChange={(event) => {
                              updateSecondaryColorFromHsl({
                                l: Number(event.target.value),
                              });
                            }}
                          />
                        </label>
                      </div>
                    </label>
                  </div>

                  <label className="dashboard-webhook-field">
                    <span className="dashboard-settings-label">Logo (link or upload)</span>
                    <div className="dashboard-brand-logo-row">
                      <input
                        type="url"
                        className="dashboard-webhook-input"
                        value={brandLogoUrl}
                        onChange={(event) => {
                          setBrandLogoUrl(event.target.value);
                        }}
                        placeholder="https://yourcompany.com/logo.png"
                      />
                      <input
                        ref={brandLogoFileInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/avif"
                        className="dashboard-brand-logo-input"
                        onChange={handleBrandLogoFileChange}
                      />
                      <button
                        type="button"
                        className="dashboard-secondary-btn"
                        onClick={() => brandLogoFileInputRef.current?.click()}
                        disabled={brandLogoUploading}
                      >
                        {brandLogoUploading ? "Uploading..." : "Upload image"}
                      </button>
                    </div>
                    {brandLogoUploading && (
                      <div className="dashboard-brand-upload-progress">
                        <div
                          className="dashboard-brand-upload-fill"
                          style={{ width: `${brandLogoUploadProgress}%` }}
                        />
                      </div>
                    )}
                  </label>

                  <div className="dashboard-brand-preview">
                    <div className="dashboard-brand-preview-logo">
                      {brandLogoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={brandLogoUrl} alt={`${brandName || "Brand"} logo`} />
                      ) : (
                        <span>{(brandName || "B").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div>
                      <p className="dashboard-brand-preview-name">{brandName || "Your brand"}</p>
                      <p className="dashboard-brand-preview-url">
                        {brandWebsiteUrl || "No website set"}
                      </p>
                    </div>
                    <div className="dashboard-brand-preview-colors">
                      <span style={{ background: normalizeHexInput(brandPrimaryColor, "#ff5c35") }} />
                      <span style={{ background: normalizeHexInput(brandSecondaryColor, "#111318") }} />
                    </div>
                  </div>

                  <div className="dashboard-webhook-actions">
                    <button type="submit" className="dashboard-action-btn" disabled={brandSaving}>
                      {brandSaving ? "Saving..." : "Save brand settings"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <div className="dashboard-settings-shell">
              <div className="dashboard-settings-card">
                <p className="dashboard-eyebrow">Settings</p>
                <h2 className="dashboard-settings-title">Workspace access</h2>
                <p className="dashboard-settings-copy">
                  This is the private workspace currently linked to your Clerk account.
                </p>

                <div className="dashboard-settings-grid">
                  <div className="dashboard-settings-item">
                    <p className="dashboard-settings-label">Account</p>
                    <p className="dashboard-settings-value">{viewerName}</p>
                  </div>
                  <div className="dashboard-settings-item">
                    <p className="dashboard-settings-label">Workspace</p>
                    <p className="dashboard-settings-value">{workspaceName}</p>
                  </div>
                  <div className="dashboard-settings-item">
                    <p className="dashboard-settings-label">Campaigns</p>
                    <p className="dashboard-settings-value">{campaignsState.length}</p>
                  </div>
                  <div className="dashboard-settings-item">
                    <p className="dashboard-settings-label">Authentication</p>
                    <p className="dashboard-settings-value">Managed by Clerk</p>
                  </div>
                </div>
              </div>

              <div className="dashboard-settings-card">
                <div className="dashboard-settings-head">
                  <div>
                    <p className="dashboard-eyebrow">Automation</p>
                    <h2 className="dashboard-settings-title">Webhook endpoints</h2>
                    <p className="dashboard-settings-copy">
                      Connect Tellr to external tools and receive signed events for new
                      submissions and approvals.
                    </p>
                  </div>
                  <div className="dashboard-settings-pill">
                    Dispatches immediately; retries every 15 min
                  </div>
                </div>

                {webhookError && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-error">
                    {webhookError}
                  </div>
                )}

                {webhookNotice && (
                  <div className="dashboard-settings-alert dashboard-settings-alert-success">
                    {webhookNotice}
                  </div>
                )}

                {latestWebhookSecret && (
                  <div className="dashboard-secret-card">
                    <div>
                      <p className="dashboard-settings-label">Signing secret</p>
                      <p className="dashboard-secret-value">{latestWebhookSecret}</p>
                    </div>
                    <button
                      type="button"
                      className="dashboard-action-btn dashboard-secondary-action"
                      onClick={() => {
                        copyText(latestWebhookSecret);
                      }}
                    >
                      Copy secret
                    </button>
                  </div>
                )}

                <form className="dashboard-webhook-form" onSubmit={handleCreateWebhook}>
                  <div className="dashboard-webhook-form-grid">
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Endpoint URL</span>
                      <input
                        type="url"
                        className="dashboard-webhook-input"
                        placeholder="https://hooks.zapier.com/..."
                        value={webhookUrl}
                        onChange={(event) => {
                          setWebhookUrl(event.target.value);
                        }}
                        required
                      />
                    </label>
                    <label className="dashboard-webhook-field">
                      <span className="dashboard-settings-label">Description</span>
                      <input
                        type="text"
                        className="dashboard-webhook-input"
                        placeholder="Zapier, Make, n8n, custom API..."
                        value={webhookDescription}
                        onChange={(event) => {
                          setWebhookDescription(event.target.value);
                        }}
                      />
                    </label>
                  </div>

                  <div className="dashboard-webhook-events">
                    {WEBHOOK_EVENT_OPTIONS.map((option) => (
                      <label key={option.value} className="dashboard-webhook-event-option">
                        <input
                          type="checkbox"
                          checked={webhookEvents.includes(option.value)}
                          onChange={() => {
                            toggleWebhookEventSelection(option.value);
                          }}
                        />
                        <span>
                          <strong>{option.label}</strong>
                          <small>{option.helper}</small>
                        </span>
                      </label>
                    ))}
                  </div>

                  <div className="dashboard-webhook-actions">
                    <button
                      type="submit"
                      className="dashboard-action-btn"
                      disabled={webhookFormSaving || webhookEvents.length === 0}
                    >
                      {webhookFormSaving ? "Saving..." : "Add endpoint"}
                    </button>
                    <button
                      type="button"
                      className="dashboard-action-btn dashboard-secondary-action"
                      onClick={() => {
                        refreshWebhookEndpoints();
                      }}
                      disabled={webhookLoading}
                    >
                      {webhookLoading ? "Refreshing..." : "Refresh status"}
                    </button>
                  </div>
                </form>

                <div className="dashboard-signature-card">
                  <p className="dashboard-settings-label">Signature contract</p>
                  <p className="dashboard-settings-copy dashboard-signature-copy">
                    Verify requests with <code>X-Tellr-Signature</code> by computing an
                    HMAC SHA-256 of <code>X-Tellr-Timestamp + {'.'} + rawBody</code> using
                    the signing secret. Every delivery also includes
                    <code> X-Tellr-Event</code>, <code>X-Tellr-Event-Id</code> and
                    <code> X-Tellr-Delivery-Id</code> for idempotency and tracing.
                  </p>
                </div>

                <div className="dashboard-webhook-list">
                  {webhookEndpoints.length === 0 ? (
                    <div className="dashboard-empty-state">
                      {webhookLoading
                        ? "Loading webhook endpoints..."
                        : "No webhook endpoints yet. Add one to start sending events."}
                    </div>
                  ) : (
                    webhookEndpoints.map((endpoint) => (
                      <div key={endpoint.id} className="dashboard-webhook-card">
                        <div className="dashboard-webhook-card-head">
                          <div>
                            <p className="dashboard-webhook-url">{endpoint.url}</p>
                            <p className="dashboard-webhook-meta">
                              {endpoint.description || "No description"} ·{" "}
                              {endpoint.isActive ? "Active" : "Paused"}
                            </p>
                          </div>
                          <div className="dashboard-webhook-card-actions">
                            <button
                              type="button"
                              className="dashboard-action-btn dashboard-secondary-action dashboard-inline-action"
                              onClick={() => {
                                handleSendWebhookTest(endpoint.id);
                              }}
                              disabled={webhookActionId === `test:${endpoint.id}`}
                            >
                              {webhookActionId === `test:${endpoint.id}` ? "Sending..." : "Send test"}
                            </button>
                            <button
                              type="button"
                              className="dashboard-action-btn dashboard-secondary-action dashboard-inline-action"
                              onClick={() => {
                                handleRotateWebhookSecret(endpoint.id);
                              }}
                              disabled={webhookActionId === `rotate:${endpoint.id}`}
                            >
                              {webhookActionId === `rotate:${endpoint.id}` ? "Rotating..." : "Rotate secret"}
                            </button>
                            <button
                              type="button"
                              className="dashboard-action-btn dashboard-secondary-action dashboard-inline-action"
                              onClick={() => {
                                handleToggleWebhook(endpoint);
                              }}
                              disabled={webhookActionId === `toggle:${endpoint.id}`}
                            >
                              {webhookActionId === `toggle:${endpoint.id}`
                                ? "Saving..."
                                : endpoint.isActive
                                  ? "Pause"
                                  : "Enable"}
                            </button>
                            <button
                              type="button"
                              className="dashboard-action-btn dashboard-inline-action"
                              onClick={() => {
                                handleDeleteWebhook(endpoint.id);
                              }}
                              disabled={webhookActionId === `delete:${endpoint.id}`}
                            >
                              {webhookActionId === `delete:${endpoint.id}` ? "Deleting..." : "Delete"}
                            </button>
                          </div>
                        </div>

                        <div className="dashboard-webhook-tag-row">
                          {endpoint.subscribedEvents.map((eventType) => (
                            <span key={eventType} className="dashboard-webhook-tag">
                              {eventType}
                            </span>
                          ))}
                        </div>

                        <div className="dashboard-webhook-deliveries">
                          <p className="dashboard-settings-label">Recent deliveries</p>
                          {endpoint.deliveries.length === 0 ? (
                            <p className="dashboard-webhook-meta">No deliveries yet.</p>
                          ) : (
                            endpoint.deliveries.map((delivery) => (
                              <div key={delivery.id} className="dashboard-webhook-delivery-row">
                                <span>{delivery.eventType}</span>
                                <span>{delivery.status}</span>
                                <span>
                                  {delivery.responseStatus
                                    ? `HTTP ${delivery.responseStatus}`
                                    : `Attempt ${delivery.attemptCount}`}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <style>{dashboardShellStyles}</style>
    </div>
  );
}

const dashboardShellStyles = `
  .dashboard-shell {
    min-height: 100vh;
  }

  .dashboard-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 232px;
    background: #ffffff;
    border-right: 1px solid rgba(24, 24, 32, 0.08);
    display: flex;
    flex-direction: column;
    z-index: 20;
  }

  .dashboard-sidebar-top {
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-brand {
    display: flex;
    align-items: center;
    padding: 14px 16px;
    text-decoration: none;
    color: #14141b;
  }

  .dashboard-brand-image {
    display: block;
    height: 42px;
    width: auto;
    max-width: 160px;
  }

  .dashboard-profile-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 16px 16px;
  }

  .dashboard-avatar {
    width: 46px;
    height: 46px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }

  .dashboard-avatar :where(.cl-userButtonBox, .cl-userButtonTrigger, .cl-avatarBox) {
    width: 46px;
    height: 46px;
    border-radius: 14px;
  }

  .dashboard-profile-name {
    font-size: 16px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.02em;
  }

  .dashboard-profile-workspace {
    font-size: 13px;
    color: rgba(24, 24, 32, 0.42);
  }

  .dashboard-sidebar-nav {
    padding: 16px 12px;
    display: grid;
    gap: 8px;
  }

  .dashboard-nav-label {
    font-size: 12px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 800;
    color: rgba(24, 24, 32, 0.22);
    margin: 14px 8px 8px;
  }

  .dashboard-nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 14px;
    border-radius: 16px;
    border: 1px solid transparent;
    background: transparent;
    color: rgba(24, 24, 32, 0.66);
    font-family: "Figtree", sans-serif;
    font-size: 14px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }

  .dashboard-nav-item-active {
    border-color: rgba(255, 92, 53, 0.22);
    background: #fff5f1;
    color: var(--brand);
    box-shadow: inset 0 0 0 1px rgba(255, 92, 53, 0.06);
  }

  .dashboard-nav-item-muted:hover {
    background: #f7f6f4;
    color: #14141b;
  }

  .dashboard-nav-icon {
    width: 20px;
    text-align: center;
    font-size: 16px;
    flex-shrink: 0;
  }

  .dashboard-nav-count {
    margin-left: auto;
    min-width: 24px;
    height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--brand);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-main {
    margin-left: 232px;
    min-height: 100vh;
    background: #f7f6f4;
  }

  .dashboard-topbar {
    position: sticky;
    top: 0;
    z-index: 10;
    height: 62px;
    display: flex;
    align-items: center;
    padding: 0 22px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.84);
    backdrop-filter: blur(10px);
  }

  .dashboard-topbar-title {
    font-size: 16px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.02em;
  }

  .dashboard-content {
    display: grid;
    gap: 22px;
    padding: 22px;
    width: 100%;
  }

  .dashboard-hero-card,
  .dashboard-list-card,
  .dashboard-submissions-card,
  .dashboard-alert-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04), 0 12px 28px rgba(0, 0, 0, 0.03);
  }

  .dashboard-hero-card {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 18px;
    padding: 28px 34px;
  }

  .dashboard-eyebrow {
    font-size: 11px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--brand);
    margin-bottom: 6px;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-title {
    font-size: clamp(28px, 3.2vw, 44px);
    line-height: 0.96;
    letter-spacing: -0.05em;
    color: #121218;
    margin: 0 0 8px;
  }

  .dashboard-subtitle {
    max-width: 720px;
    font-size: 14px;
    color: rgba(24, 24, 32, 0.54);
  }

  .dashboard-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
    padding: 0 22px;
    border-radius: 999px;
    border: none;
    background: var(--brand);
    color: #fff;
    font-family: "Figtree", sans-serif;
    font-size: 16px;
    font-weight: 800;
    text-decoration: none;
    box-shadow: 0 10px 24px rgba(255, 92, 53, 0.2);
    cursor: pointer;
  }

  .dashboard-builder-wrap {
    display: grid;
    gap: 12px;
  }

  .dashboard-builder-toolbar {
    display: flex;
    justify-content: flex-end;
  }

  .dashboard-sub-toolbar {
    justify-content: flex-start;
    margin-bottom: -6px;
  }

  .dashboard-alert-card {
    padding: 14px 18px;
    color: #925c00;
    background: #fff8e8;
    border-color: rgba(217, 119, 6, 0.16);
  }

  .dashboard-list-card {
    overflow: hidden;
  }

  .dashboard-list-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 18px 28px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-list-title {
    font-size: 18px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.03em;
  }

  .dashboard-list-count {
    font-size: 13px;
    font-weight: 700;
    color: rgba(24, 24, 32, 0.34);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-campaign-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 14px;
    padding: 18px 28px;
  }

  .dashboard-campaign-row.with-divider {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-campaign-copy {
    min-width: 0;
  }

  .dashboard-campaign-name {
    font-size: 16px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.03em;
    margin: 0 0 3px;
  }

  .dashboard-campaign-path {
    font-size: 13px;
    color: rgba(24, 24, 32, 0.34);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-campaign-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dashboard-video-count {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 999px;
    background: #fff1eb;
    color: var(--brand);
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    min-height: 34px;
    padding: 0 13px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
  }

  .dashboard-status-badge::before {
    content: "";
    width: 8px;
    height: 8px;
    border-radius: 999px;
    display: inline-block;
  }

  .dashboard-status-badge.is-active {
    background: #eefbf2;
    color: #1c9c46;
  }

  .dashboard-status-badge.is-active::before {
    background: #16a34a;
  }

  .dashboard-status-badge.is-inactive {
    background: #f5f5f5;
    color: rgba(24, 24, 32, 0.54);
  }

  .dashboard-status-badge.is-inactive::before {
    background: rgba(24, 24, 32, 0.24);
  }

  .dashboard-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    padding: 0 18px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.14);
    background: #fff;
    color: #14141b;
    font-size: 14px;
    font-weight: 800;
    text-decoration: none;
    cursor: pointer;
  }

  .dashboard-secondary-btn:hover {
    border-color: rgba(24, 24, 32, 0.2);
    background: #faf8f6;
  }

  .dashboard-icon-link {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: #fff;
    color: rgba(24, 24, 32, 0.5);
    text-decoration: none;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  }

  .dashboard-action-btn:disabled,
  .dashboard-secondary-btn:disabled {
    cursor: not-allowed;
  }

  .dashboard-icon-link:hover {
    color: #14141b;
    background: #faf8f6;
  }

  .dashboard-submissions-card {
    display: grid;
    gap: 18px;
    padding: 0;
    width: 100%;
    max-width: none;
    border: none;
    background: transparent;
    box-shadow: none;
  }

  .dashboard-campaign-webhook-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04), 0 12px 28px rgba(0, 0, 0, 0.03);
    padding: 22px;
    display: grid;
    gap: 14px;
  }

  .dashboard-campaign-webhook-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .dashboard-campaign-webhook-title {
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.03em;
    color: #121218;
    margin: 0 0 8px;
  }

  .dashboard-campaign-webhook-copy {
    font-size: 13px;
    line-height: 1.5;
    color: rgba(24, 24, 32, 0.54);
    margin: 0;
    max-width: 620px;
  }

  .dashboard-settings-shell {
    width: 100%;
    max-width: 1040px;
    display: grid;
    gap: 18px;
  }

  .dashboard-settings-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04), 0 12px 28px rgba(0, 0, 0, 0.03);
    padding: 28px;
  }

  .dashboard-settings-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
  }

  .dashboard-settings-title {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #121218;
    margin: 0 0 10px;
  }

  .dashboard-settings-copy {
    font-size: 14px;
    line-height: 1.6;
    color: rgba(24, 24, 32, 0.54);
    margin: 0 0 22px;
    max-width: 560px;
  }

  .dashboard-settings-pill {
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: #faf8f6;
    color: rgba(24, 24, 32, 0.56);
    padding: 8px 12px;
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
  }

  .dashboard-settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .dashboard-settings-item {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 16px 18px;
  }

  .dashboard-settings-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(24, 24, 32, 0.34);
    margin: 0 0 8px;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-settings-value {
    font-size: 16px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .dashboard-settings-alert {
    border-radius: 16px;
    padding: 12px 14px;
    font-size: 13px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  .dashboard-settings-alert-error {
    border: 1px solid rgba(215, 68, 35, 0.18);
    background: rgba(255, 242, 238, 0.95);
    color: #c64d27;
  }

  .dashboard-settings-alert-success {
    border: 1px solid rgba(38, 147, 71, 0.16);
    background: rgba(240, 251, 243, 0.95);
    color: #1e8a42;
  }

  .dashboard-settings-alert-neutral {
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: rgba(255, 255, 255, 0.9);
    color: rgba(24, 24, 32, 0.62);
  }

  .dashboard-secret-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 14px 16px;
    margin-bottom: 18px;
  }

  .dashboard-secret-value {
    margin: 4px 0 0;
    font-size: 13px;
    color: #14141b;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    word-break: break-all;
  }

  .dashboard-webhook-form {
    display: grid;
    gap: 16px;
    margin-bottom: 20px;
  }

  .dashboard-webhook-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
  }

  .dashboard-webhook-field {
    display: grid;
    gap: 8px;
  }

  .dashboard-brand-color-field {
    display: grid;
    grid-template-columns: 48px minmax(0, 1fr);
    gap: 10px;
    align-items: center;
  }

  .dashboard-brand-color-chip {
    width: 48px;
    height: 48px;
    border: 1.5px solid rgba(24, 24, 32, 0.14);
    border-radius: 12px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  .dashboard-brand-color-composer {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 14px;
    background: #faf8f6;
    padding: 10px;
    display: grid;
    gap: 8px;
  }

  .dashboard-brand-slider-row {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    align-items: center;
    gap: 10px;
  }

  .dashboard-brand-slider-row span {
    font-size: 11px;
    font-weight: 700;
    color: rgba(24, 24, 32, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-brand-slider {
    appearance: none;
    width: 100%;
    height: 10px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    outline: none;
  }

  .dashboard-brand-slider::-webkit-slider-thumb {
    appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    background: #14141b;
    cursor: pointer;
  }

  .dashboard-brand-slider::-moz-range-thumb {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    background: #14141b;
    cursor: pointer;
  }

  .dashboard-brand-slider::-moz-range-track {
    height: 10px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.12);
  }

  .dashboard-brand-logo-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
    align-items: center;
  }

  .dashboard-brand-logo-input {
    display: none;
  }

  .dashboard-brand-upload-progress {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(24, 24, 32, 0.08);
    overflow: hidden;
    border: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-brand-upload-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff5c35, #ff8b52);
    transition: width 0.2s ease;
  }

  .dashboard-brand-preview {
    display: flex;
    align-items: center;
    gap: 14px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 12px 14px;
  }

  .dashboard-brand-preview-logo {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    background: #f6f4ef;
    display: grid;
    place-items: center;
    overflow: hidden;
    flex-shrink: 0;
  }

  .dashboard-brand-preview-logo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .dashboard-brand-preview-logo span {
    font-size: 14px;
    font-weight: 800;
    color: rgba(24, 24, 32, 0.6);
  }

  .dashboard-brand-preview-name {
    margin: 0;
    font-size: 14px;
    font-weight: 800;
    color: #14141b;
  }

  .dashboard-brand-preview-url {
    margin: 4px 0 0;
    font-size: 12px;
    color: rgba(24, 24, 32, 0.5);
    word-break: break-word;
  }

  .dashboard-brand-preview-colors {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .dashboard-brand-preview-colors span {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.1);
  }

  .dashboard-webhook-input {
    width: 100%;
    min-height: 48px;
    border-radius: 14px;
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: #ffffff;
    padding: 0 14px;
    font-size: 14px;
    color: #14141b;
    outline: none;
  }

  .dashboard-webhook-input:focus {
    border-color: rgba(255, 102, 51, 0.4);
    box-shadow: 0 0 0 4px rgba(255, 102, 51, 0.08);
  }

  .dashboard-webhook-events {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-wall-toggle-grid {
    display: grid;
    gap: 12px;
  }

  .dashboard-wall-selection-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 14px;
    display: grid;
    gap: 12px;
  }

  .dashboard-wall-link-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    flex-wrap: wrap;
  }

  .dashboard-wall-link-value {
    margin: 0;
    font-size: 13px;
    color: rgba(24, 24, 32, 0.6);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    word-break: break-all;
  }

  .dashboard-wall-list {
    display: grid;
    gap: 10px;
    max-height: 280px;
    overflow: auto;
    padding-right: 4px;
  }

  .dashboard-wall-preview-list {
    display: grid;
    gap: 10px;
  }

  .dashboard-wall-preview-item {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 14px;
    background: #faf8f6;
    padding: 10px 12px;
  }

  .dashboard-wall-preview-item p {
    margin: 0;
    font-size: 13px;
    font-weight: 700;
    color: #14141b;
  }

  .dashboard-wall-preview-item small {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: rgba(24, 24, 32, 0.5);
  }

  .dashboard-webhook-event-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 16px;
    background: #ffffff;
    padding: 12px 14px;
    cursor: pointer;
  }

  .dashboard-webhook-event-option input {
    margin-top: 4px;
  }

  .dashboard-webhook-event-option span {
    display: grid;
    gap: 4px;
  }

  .dashboard-webhook-event-option strong {
    font-size: 14px;
    color: #14141b;
  }

  .dashboard-webhook-event-option small {
    font-size: 12px;
    line-height: 1.5;
    color: rgba(24, 24, 32, 0.5);
  }

  .dashboard-webhook-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dashboard-secondary-action {
    background: #ffffff;
    border: 1px solid rgba(24, 24, 32, 0.12);
    color: #14141b;
    box-shadow: none;
  }

  .dashboard-secondary-action:hover:not(:disabled) {
    background: #faf8f6;
  }

  .dashboard-webhook-list {
    display: grid;
    gap: 14px;
  }

  .dashboard-signature-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 18px;
    background: #ffffff;
    padding: 14px 16px;
    margin-bottom: 20px;
  }

  .dashboard-signature-copy {
    max-width: none;
    margin-bottom: 0;
  }

  .dashboard-signature-copy code {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #faf8f6;
    color: #14141b;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-empty-state {
    border: 1px dashed rgba(24, 24, 32, 0.16);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.72);
    padding: 18px;
    color: rgba(24, 24, 32, 0.5);
    font-size: 14px;
  }

  .dashboard-webhook-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 20px;
    background: #ffffff;
    padding: 18px;
    display: grid;
    gap: 14px;
  }

  .dashboard-webhook-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .dashboard-webhook-card-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .dashboard-webhook-url {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #14141b;
    word-break: break-all;
  }

  .dashboard-webhook-meta {
    margin: 6px 0 0;
    font-size: 13px;
    color: rgba(24, 24, 32, 0.48);
  }

  .dashboard-webhook-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .dashboard-webhook-tag {
    border-radius: 999px;
    background: #faf8f6;
    color: rgba(24, 24, 32, 0.64);
    padding: 7px 10px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-webhook-deliveries {
    display: grid;
    gap: 8px;
  }

  .dashboard-webhook-delivery-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) 110px 110px;
    gap: 12px;
    font-size: 12px;
    color: rgba(24, 24, 32, 0.62);
    padding-top: 8px;
    border-top: 1px solid rgba(24, 24, 32, 0.06);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-submissions-summary {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 26px;
    border: 1.5px solid rgba(24, 24, 32, 0.08);
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .dashboard-submissions-title {
    font-size: 24px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #121218;
    margin: 0 0 8px;
  }

  .dashboard-submissions-link {
    font-size: 12px;
    color: rgba(24, 24, 32, 0.34);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-back-btn {
    min-height: 34px;
    padding: 0 10px;
    border: none;
    background: transparent;
    color: rgba(24, 24, 32, 0.42);
    font-size: 13px;
    font-weight: 700;
  }

  .dashboard-back-btn:hover {
    background: #efede9;
    color: #14141b;
  }

  .dashboard-copy-btn {
    min-height: 36px;
    padding: 0 14px;
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-count-badge {
    display: inline-flex;
    align-items: center;
    min-height: 32px;
    padding: 0 12px;
    border-radius: 999px;
    background: rgba(255, 92, 53, 0.08);
    color: var(--brand);
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .dashboard-metric-card {
    padding: 16px;
    border: 1.5px solid rgba(24, 24, 32, 0.08);
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  }

  .dashboard-metric-label {
    font-size: 12px;
    font-weight: 600;
    color: rgba(24, 24, 32, 0.36);
    margin-bottom: 8px;
  }

  .dashboard-metric-value {
    font-size: 28px;
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 900;
    color: #121218;
  }

  .dashboard-reviews-shell {
    overflow: hidden;
    border: 1.5px solid rgba(24, 24, 32, 0.08);
    border-radius: 20px;
    background: #ffffff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
  }

  .dashboard-reviews-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-reviews-title {
    font-size: 15px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.03em;
  }

  .dashboard-review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 220px);
    gap: 14px;
    padding: 16px;
    align-items: start;
    justify-content: start;
  }

  .dashboard-review-card {
    overflow: hidden;
    border: 1.5px solid rgba(24, 24, 32, 0.08);
    border-radius: 20px;
    background: #ffffff;
    display: flex;
    flex-direction: column;
    min-height: 100%;
    transition: box-shadow 0.2s ease, transform 0.2s ease;
  }

  .dashboard-review-card:hover {
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  .dashboard-review-video {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #09090c;
    display: grid;
    place-items: center;
    cursor: pointer;
  }

  .dashboard-review-video video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: #09090c;
  }

  .dashboard-review-badge {
    position: absolute;
    top: 10px;
    left: 10px;
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 700;
  }

  .dashboard-review-badge.is-approved {
    background: #eefbf2;
    color: #1c9c46;
  }

  .dashboard-review-badge.is-pending {
    background: #fff5e8;
    color: #bf6c00;
  }

  .dashboard-review-badge.is-rejected {
    background: #f6f4ef;
    color: rgba(24, 24, 32, 0.56);
  }

  .dashboard-review-play {
    position: absolute;
    width: 40px;
    height: 40px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.14);
    border: 2px solid rgba(255, 255, 255, 0.25);
    color: #ffffff;
    font-size: 16px;
    padding-left: 2px;
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;
  }

  .dashboard-review-play:hover {
    transform: scale(1.04);
    background: rgba(255, 255, 255, 0.12);
  }

  .dashboard-review-time {
    position: absolute;
    right: 8px;
    bottom: 8px;
    min-height: 20px;
    padding: 0 7px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.48);
    color: #ffffff;
    font-size: 9px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-review-body {
    padding: 12px 14px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    flex: 1;
  }

  .dashboard-review-name {
    font-size: 13px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }

  .dashboard-review-email {
    font-size: 11px;
    color: rgba(24, 24, 32, 0.34);
    margin-bottom: 8px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-review-stars {
    font-size: 11px;
    letter-spacing: 0.03em;
    color: var(--brand);
    margin-bottom: 6px;
  }

  .dashboard-review-stars-muted {
    color: rgba(24, 24, 32, 0.14);
  }

  .dashboard-review-note {
    font-size: 12px;
    line-height: 1.45;
    color: rgba(24, 24, 32, 0.58);
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }

  .dashboard-review-actions {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    background: #f7f6f4;
    flex-wrap: wrap;
  }

  .dashboard-inline-action {
    min-height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }

  .dashboard-review-status {
    min-height: 30px;
    padding: 0 12px;
    font-size: 11px;
  }

  .dashboard-inline-action:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .dashboard-empty-state {
    padding: 22px 18px;
    color: rgba(24, 24, 32, 0.48);
    font-size: 13px;
  }

  .dashboard-table-wrap {
    overflow-x: auto;
  }

  .dashboard-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 680px;
  }

  .dashboard-table th,
  .dashboard-table td {
    padding: 10px 8px;
    text-align: left;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    font-size: 13px;
  }

  .dashboard-table th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(24, 24, 32, 0.34);
    font-weight: 700;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .dashboard-table-id {
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    color: rgba(24, 24, 32, 0.42);
    font-size: 11px;
  }

  .dashboard-table-strong {
    font-weight: 700;
    color: #14141b;
  }

  .dashboard-table-rating {
    font-weight: 700;
    color: rgba(24, 24, 32, 0.62);
  }

  .dashboard-video-badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: #f6f4ef;
    color: rgba(24, 24, 32, 0.58);
    font-size: 11px;
    font-weight: 700;
  }

  .dashboard-inline-link {
    min-height: 32px;
    padding: 0 12px;
    font-size: 12px;
  }

  .dashboard-video-modal {
    position: fixed;
    inset: 0;
    z-index: 160;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(18, 18, 24, 0.42);
    backdrop-filter: blur(8px);
  }

  .dashboard-video-modal-card {
    width: min(760px, 100%);
    border-radius: 22px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.98);
    box-shadow: 0 30px 70px rgba(0, 0, 0, 0.18);
    overflow: hidden;
  }

  .dashboard-video-modal-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 16px 18px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-video-modal-title {
    font-size: 15px;
    font-weight: 800;
    letter-spacing: -0.03em;
    color: #14141b;
  }

  .dashboard-video-modal-frame {
    padding: 16px;
    background: #f7f4ef;
  }

  .dashboard-video-modal-frame video {
    display: block;
    width: 100%;
    max-height: min(72vh, 760px);
    border-radius: 18px;
    background: #09090c;
  }

  @media (max-width: 1100px) {
    .dashboard-sidebar {
      position: static;
      width: auto;
      border-right: none;
      border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    }

    .dashboard-main {
      margin-left: 0;
    }

    .dashboard-topbar {
      position: static;
    }

    .dashboard-content {
      padding: 18px;
      gap: 18px;
    }

    .dashboard-hero-card {
      padding: 22px;
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-list-head,
    .dashboard-campaign-row {
      padding-left: 20px;
      padding-right: 20px;
    }

    .dashboard-campaign-row {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-campaign-actions {
      justify-content: flex-start;
    }

    .dashboard-review-grid {
      grid-template-columns: repeat(auto-fill, 220px);
    }

    .dashboard-settings-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-settings-head,
    .dashboard-campaign-webhook-head,
    .dashboard-webhook-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-webhook-form-grid,
    .dashboard-webhook-events {
      grid-template-columns: 1fr;
    }

    .dashboard-brand-logo-row {
      grid-template-columns: 1fr;
    }

    .dashboard-brand-preview {
      align-items: flex-start;
      flex-direction: column;
    }

    .dashboard-brand-preview-colors {
      margin-left: 0;
    }

    .dashboard-webhook-card-actions {
      justify-content: flex-start;
    }

    .dashboard-webhook-delivery-row {
      grid-template-columns: 1fr;
      gap: 4px;
    }
  }

  @media (max-width: 720px) {
    .dashboard-brand,
    .dashboard-profile-card,
    .dashboard-topbar,
    .dashboard-content {
      padding-left: 14px;
      padding-right: 14px;
    }

    .dashboard-brand {
      padding-top: 16px;
      padding-bottom: 14px;
    }

    .dashboard-profile-card {
      padding-top: 8px;
      padding-bottom: 16px;
    }

    .dashboard-title {
      font-size: 32px;
    }

    .dashboard-action-btn {
      width: 100%;
    }

    .dashboard-secondary-action {
      width: 100%;
    }

    .dashboard-list-head,
    .dashboard-campaign-row {
      padding-left: 16px;
      padding-right: 16px;
    }

    .dashboard-submissions-summary {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-campaign-webhook-card {
      padding: 18px;
    }

    .dashboard-metrics-grid,
    .dashboard-review-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-video-modal {
      padding: 14px;
    }

    .dashboard-video-modal-head,
    .dashboard-video-modal-frame {
      padding: 14px;
    }

    .dashboard-review-grid {
      grid-template-columns: 1fr;
      padding: 14px;
    }
  }
`;

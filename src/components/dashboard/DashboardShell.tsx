"use client";

import { UserButton } from "@clerk/nextjs";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import Image from "next/image";
import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useRouter } from "next/navigation";
import type { SettingsPanelId } from "@/components/dashboard/DashboardSettings";

const CampaignBuilder = dynamic(() => import("@/components/dashboard/CampaignBuilder"));
const DashboardSettings = dynamic(() => import("@/components/dashboard/DashboardSettings"));

type DashboardShellProps = {
  viewerName: string;
  viewerEmail?: string;
  workspaceName: string;
  campaignRuntimeReady: boolean;
  initialSection?: "campaigns" | "settings";
  initialSettingsPanel?: SettingsPanelId;
  initialSelectedCampaignId?: string | null;
  initialCampaignDetailTab?: "submissions" | "embed" | "automation" | "settings";
  initialSelectedSubmissionId?: string | null;
  initialShowBuilder?: boolean;
  initialEditingCampaignId?: string | null;
  initialTotalReviewsCount?: number;
  embedded?: boolean;
  campaigns: Array<{
    id: string;
    name: string;
    description: string | null;
    createdAt?: string;
    rewardText: string;
    rewardValue: string | null;
    hasNoEndDate: boolean;
    endsAt: string | null;
    questions: Array<{
      id: string;
      text: string;
      required: boolean;
      sortOrder: number;
    }>;
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
    submissionSummary: {
      total: number;
      approved: number;
      avgRating: number;
      thisWeek: number;
    };
    submissions: Array<{
      id: string;
      reviewerName: string;
      reviewerEmail: string;
      reviewerRating: number | null;
      status: string;
      videoKey: string;
      durationSeconds: number | null;
      aiStatus: string;
      aiError: string | null;
      aiGeneratedReview: string | null;
      aiKeyPhrase: string | null;
      aiTranscript: string | null;
      aiProcessedAt: string | null;
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

function formatShortDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function getReviewerInitials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function getSubmissionState(status: string) {
  const normalized = normalizeSubmissionStatus(status);

  if (normalized === "APPROVED") {
    return {
      label: "Published",
      badgeClassName: "is-active",
    } as const;
  }

  if (normalized === "REJECTED") {
    return {
      label: "Rejected",
      badgeClassName: "is-rejected",
    } as const;
  }

  return {
    label: "Pending",
    badgeClassName: "is-pending",
  } as const;
}

function getSubmissionExcerpt(
  aiKeyPhrase: string | null,
  aiGeneratedReview: string | null,
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string;
    required: boolean;
  }>
) {
  const keyPhrase = typeof aiKeyPhrase === "string" ? aiKeyPhrase.trim() : "";
  if (keyPhrase.length > 0) {
    return `"${keyPhrase}"`;
  }

  const generated = typeof aiGeneratedReview === "string" ? aiGeneratedReview.trim() : "";
  if (generated.length > 0) {
    return `"${generated}"`;
  }

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

function parseBudgetValue(value: string | null) {
  if (!value) {
    return 0;
  }

  const normalized = value.replace(/[^0-9.,-]/g, "").replace(",", ".");
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function DashboardShell({
  viewerName,
  viewerEmail,
  workspaceName,
  campaignRuntimeReady,
  initialSection = "campaigns",
  initialSettingsPanel = "general",
  initialSelectedCampaignId = null,
  initialCampaignDetailTab = "submissions",
  initialSelectedSubmissionId = null,
  initialShowBuilder = false,
  initialEditingCampaignId = null,
  initialTotalReviewsCount,
  embedded = false,
  campaigns,
}: DashboardShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isNavigating = false;
  const [campaignsState, setCampaignsState] = useState(campaigns);
  const activeSection = initialSection;
  const [showBuilder, setShowBuilder] = useState(initialShowBuilder);
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(
    initialEditingCampaignId
  );
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(
    initialSelectedCampaignId
  );
  const [campaignDetailTab, setCampaignDetailTab] = useState<
    "submissions" | "embed" | "automation" | "settings"
  >(initialCampaignDetailTab);
  const [selectedSubmissionRef, setSelectedSubmissionRef] = useState<{
    campaignId: string;
    submissionId: string;
  } | null>(
    initialSelectedCampaignId && initialSelectedSubmissionId
      ? {
          campaignId: initialSelectedCampaignId,
          submissionId: initialSelectedSubmissionId,
        }
      : null
  );
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
  const [brandLoaded, setBrandLoaded] = useState(false);
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandSaving, setBrandSaving] = useState(false);
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [brandName, setBrandName] = useState("Tellr.me");
  const [brandPrimaryColor, setBrandPrimaryColor] = useState("#ff4820");
  const [brandSecondaryColor, setBrandSecondaryColor] = useState("#111318");
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
  const [brandWebsiteUrl, setBrandWebsiteUrl] = useState("");
  const [siteOrigin, setSiteOrigin] = useState("https://tellr.me");
  const [brandLogoUploading, setBrandLogoUploading] = useState(false);
  const [brandLogoUploadProgress, setBrandLogoUploadProgress] = useState(0);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  useEffect(() => {
    setCampaignsState(campaigns);
  }, [campaigns]);

  useEffect(() => {
    router.prefetch("/dashboard/campaigns");
    router.prefetch(`/dashboard/settings/${initialSettingsPanel}`);
    router.prefetch("/dashboard/campaigns/new");
  }, [router, initialSettingsPanel]);

  useEffect(() => {
    const preload = () => {
      void import("@/components/dashboard/CampaignBuilder");
    };
    const timeoutId = globalThis.setTimeout(preload, 200);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

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
  const editingCampaign =
    campaignsState.find((campaign) => campaign.id === editingCampaignId) || null;

  const selectedSubmissionDetail = useMemo(() => {
    if (!selectedSubmissionRef) {
      return null;
    }

    const campaign = campaignsState.find(
      (entry) => entry.id === selectedSubmissionRef.campaignId
    );
    if (!campaign) {
      return null;
    }

    const submission = campaign.submissions.find(
      (entry) => entry.id === selectedSubmissionRef.submissionId
    );
    if (!submission) {
      return null;
    }

    return {
      campaign,
      submission,
    };
  }, [campaignsState, selectedSubmissionRef]);

  const selectedSubmissionStatus = selectedSubmissionDetail
    ? normalizeSubmissionStatus(selectedSubmissionDetail.submission.status)
    : null;
  const selectedSubmissionState = selectedSubmissionDetail
    ? getSubmissionState(selectedSubmissionDetail.submission.status)
    : null;
  const selectedSubmissionApproveActionKey = selectedSubmissionDetail
    ? `${selectedSubmissionDetail.submission.id}:APPROVED`
    : null;
  const selectedSubmissionRejectActionKey = selectedSubmissionDetail
    ? `${selectedSubmissionDetail.submission.id}:REJECTED`
    : null;
  const selectedSubmissionExcerpt = selectedSubmissionDetail
    ? getSubmissionExcerpt(
        selectedSubmissionDetail.submission.aiKeyPhrase,
        selectedSubmissionDetail.submission.aiGeneratedReview,
        selectedSubmissionDetail.submission.answers
      )
    : null;

  useEffect(() => {
    setSiteOrigin(window.location.origin);
  }, []);

  const selectedCampaignPublicUrl = selectedCampaign
    ? `${siteOrigin}${selectedCampaign.publicPath}`
    : "";
  const selectedCampaignEmbedUrl = selectedCampaignPublicUrl
    ? `${selectedCampaignPublicUrl}?embed=1`
    : "";
  const selectedCampaignEmbedSnippet = selectedCampaignEmbedUrl
    ? `<iframe src="${selectedCampaignEmbedUrl}" width="100%" height="900" style="border:0;border-radius:10px;max-width:1040px;" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="camera; microphone; autoplay"></iframe>`
    : "";

  useEffect(() => {
    if (!selectedCampaign) {
      return;
    }

    const base = `/dashboard/campaigns/${selectedCampaign.id}`;
    router.prefetch(`${base}/submissions`);
    router.prefetch(`${base}/embed`);
    router.prefetch(`${base}/automation`);
    router.prefetch(`${base}/settings`);
  }, [router, selectedCampaign]);

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
    if (activeSection !== "campaigns") {
      setSelectedSubmissionRef(null);
    }
  }, [activeSection]);

  useEffect(() => {
    setSelectedCampaignId(initialSelectedCampaignId);
    setCampaignDetailTab(initialCampaignDetailTab);
    setSelectedSubmissionRef(
      initialSelectedCampaignId && initialSelectedSubmissionId
        ? {
            campaignId: initialSelectedCampaignId,
            submissionId: initialSelectedSubmissionId,
          }
        : null
    );
  }, [initialSelectedCampaignId, initialCampaignDetailTab, initialSelectedSubmissionId]);

  useEffect(() => {
    setShowBuilder(initialShowBuilder);
    setEditingCampaignId(initialEditingCampaignId);
  }, [initialShowBuilder, initialEditingCampaignId]);

  useEffect(() => {
    if (activeSection !== "settings" || brandLoaded || brandLoading) {
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
        setBrandName(profile.brandName || "Tellr.me");
        setBrandPrimaryColor(profile.primaryColor || "#ff4820");
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

  const totalReviewsCount = useMemo(
    () =>
      typeof initialTotalReviewsCount === "number"
        ? initialTotalReviewsCount
        : campaignsState.reduce((sum, campaign) => sum + campaign.submissionSummary.total, 0),
    [campaignsState, initialTotalReviewsCount]
  );

  const campaignStats = useMemo(() => {
    const activeCount = campaignsState.filter(
      (campaign) => getCampaignState(campaign.hasNoEndDate, campaign.endsAt) === "Active"
    ).length;
    const totalResponses = campaignsState.reduce(
      (sum, campaign) => sum + campaign.submissionSummary.total,
      0
    );
    const approvedResponses = campaignsState.reduce(
      (sum, campaign) => sum + campaign.submissionSummary.approved,
      0
    );
    const avgCompletion =
      totalResponses > 0 ? Math.round((approvedResponses / totalResponses) * 100) : 0;
    const rewardBudget = campaignsState.reduce(
      (sum, campaign) => sum + parseBudgetValue(campaign.rewardValue),
      0
    );
    const submissionsThisWeek = campaignsState.reduce(
      (sum, campaign) => sum + campaign.submissionSummary.thisWeek,
      0
    );

    return {
      activeCount,
      draftCount: Math.max(campaignsState.length - activeCount, 0),
      totalResponses,
      avgCompletion,
      rewardBudget,
      submissionsThisWeek,
    };
  }, [campaignsState]);

  const siteHost = siteOrigin.replace(/^https?:\/\//, "");
  const viewerInitials = viewerName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
  const isCampaignsWorkspaceView = activeSection === "campaigns";
  const isSettingsView = activeSection === "settings";

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
          primaryColor: normalizeHexInput(brandPrimaryColor, "#ff4820"),
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
      setBrandName(profile.brandName || "Tellr.me");
      setBrandPrimaryColor(profile.primaryColor || "#ff4820");
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
      behavior: "auto",
    });
  }

  function navigateTo(path: string) {
    if (path === pathname) {
      return;
    }
    router.push(path);
  }

  function openCampaignsSection() {
    navigateTo("/dashboard/campaigns");
    scrollDashboardToTop();
  }

  function openSettingsSection() {
    navigateTo(`/dashboard/settings/${initialSettingsPanel}`);
    scrollDashboardToTop();
  }

  function openSubmissionDetails(campaignId: string, submissionId: string) {
    navigateTo(`/dashboard/campaigns/${campaignId}/submission/${submissionId}`);
    scrollDashboardToTop();
  }

  function closeSubmissionDetails() {
    const campaignId = selectedSubmissionRef?.campaignId || selectedCampaignId;
    if (campaignId) {
      navigateTo(`/dashboard/campaigns/${campaignId}/submissions`);
    }
    scrollDashboardToTop();
  }

  return (
    <div className={`dashboard-shell ${embedded ? "is-embedded" : ""}`}>
      {!embedded && (
        <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-top">
          <Link href="/" className="dashboard-brand">
            <Image
              src="/tellr-logo.svg"
              alt="Tellr"
              width={184}
              height={48}
              className="dashboard-brand-logo"
            />
          </Link>
        </div>

        <div className="dashboard-sidebar-nav">
          <div className="dashboard-nav-group">
            <p className="dashboard-nav-label">Workspace</p>

            <button
              type="button"
              className={`dashboard-nav-item ${
                activeSection === "campaigns" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
              }`}
              onClick={openCampaignsSection}
              onMouseEnter={() => router.prefetch("/dashboard/campaigns")}
              disabled={isNavigating}
            >
              <span className="dashboard-nav-icon" aria-hidden="true">
                <svg viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="5.5" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M7.5 4.5v3.2l2.2 2.2"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>Campaigns</span>
              <span className="dashboard-nav-count">{campaignsState.length}</span>
            </button>

          </div>

          <div className="dashboard-nav-group">
            <p className="dashboard-nav-label">Account</p>

            <button
              type="button"
              className={`dashboard-nav-item ${
                activeSection === "settings" ? "dashboard-nav-item-active" : "dashboard-nav-item-muted"
              }`}
              onClick={openSettingsSection}
              onMouseEnter={() => router.prefetch(`/dashboard/settings/${initialSettingsPanel}`)}
              disabled={isNavigating}
            >
              <span className="dashboard-nav-icon" aria-hidden="true">
                <svg viewBox="0 0 15 15" fill="none">
                  <circle cx="7.5" cy="7.5" r="2.2" stroke="currentColor" strokeWidth="1.2" />
                  <path
                    d="M7.5 1.5v1.2M7.5 12.3v1.2M1.5 7.5h1.2M12.3 7.5h1.2M3.3 3.3l.85.85M10.85 10.85l.85.85M3.3 11.7l.85-.85M10.85 4.15l.85-.85"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>Settings</span>
            </button>
          </div>
        </div>

        <div className="dashboard-sidebar-spacer" />

        <div className="dashboard-sidebar-footer">
          <div className="dashboard-profile-card">
            <div className="dashboard-profile-avatar-shell">
              <span className="dashboard-profile-avatar-fallback">{viewerInitials || "T"}</span>
              <div className="dashboard-avatar">
                <UserButton afterSignOutUrl="/" />
              </div>
            </div>
            <div>
              <p className="dashboard-profile-name">{viewerName}</p>
              <p className="dashboard-profile-workspace">{viewerEmail || workspaceName}</p>
            </div>
          </div>
        </div>
        </aside>
      )}

      <section className="dashboard-main">
        {isNavigating && (
          <div className="dashboard-route-loading" role="status" aria-live="polite">
            <span>Loading...</span>
          </div>
        )}
        <div
          className={`dashboard-content ${isCampaignsWorkspaceView ? "is-campaigns-workspace" : ""} ${isSettingsView ? "is-settings-view" : ""}`}
        >
          {activeSection === "campaigns" && !campaignRuntimeReady && (
            <div className="dashboard-alert-card">
              Campaign data is not available in the current server runtime. Restart the dev server if this message appears again.
            </div>
          )}

          {activeSection === "campaigns" && showBuilder && (
            <div className="dashboard-campaign-builder-view">
              <div className="dashboard-section-topbar dashboard-builder-toolbar-shell">
                <span className="dashboard-section-topbar-title">Campaign builder</span>
                <div className="dashboard-section-topbar-spacer" />
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-secondary"
                  onClick={() => {
                    navigateTo("/dashboard/campaigns");
                  }}
                >
                  Close builder
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 11 11"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M2 2l7 7M9 2l-7 7"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
              <div className="dashboard-campaign-builder-content">
                <div className="dashboard-campaign-builder-inner">
                  <CampaignBuilder
                    mode={editingCampaign ? "edit" : "create"}
                    initialValues={
                      editingCampaign
                        ? {
                            id: editingCampaign.id,
                            name: editingCampaign.name,
                            description: editingCampaign.description,
                            rewardText: editingCampaign.rewardText,
                            rewardValue: editingCampaign.rewardValue,
                            isPublished: editingCampaign.hasNoEndDate || !editingCampaign.endsAt,
                            questions: editingCampaign.questions,
                          }
                        : null
                    }
                    onCancel={() => {
                      navigateTo("/dashboard/campaigns");
                    }}
                    onSuccess={() => {
                      if (editingCampaign) {
                        navigateTo("/dashboard/campaigns");
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {activeSection === "campaigns" && !showBuilder && !selectedCampaign && (
            <div className="dashboard-flat-view dashboard-campaigns-view">
              <div className="dashboard-section-topbar">
                <span className="dashboard-section-topbar-title">Campaigns</span>
                <div className="dashboard-section-topbar-spacer" />
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-secondary"
                >
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M1 2.5h10M2.5 6h7M4 9.5h4"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Filter
                </button>
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-primary"
                  onClick={() => {
                    navigateTo("/dashboard/campaigns/new");
                  }}
                >
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 11 11"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M5.5 1v9M1 5.5h9"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                    />
                  </svg>
                  New campaign
                </button>
              </div>

              <div className="dashboard-flat-stats">
                <div className="dashboard-flat-stat-cell">
                  <div className="dashboard-flat-stat-label">Active</div>
                  <div className="dashboard-flat-stat-value">{campaignStats.activeCount}</div>
                  <div className="dashboard-flat-stat-sub">campaigns running</div>
                </div>
                <div className="dashboard-flat-stat-cell">
                  <div className="dashboard-flat-stat-label">Total responses</div>
                  <div className="dashboard-flat-stat-value">{campaignStats.totalResponses}</div>
                  <div className="dashboard-flat-stat-sub is-up">
                    {campaignStats.submissionsThisWeek > 0
                      ? `↑ +${campaignStats.submissionsThisWeek} this week`
                      : "No new submissions this week"}
                  </div>
                </div>
                <div className="dashboard-flat-stat-cell">
                  <div className="dashboard-flat-stat-label">Avg completion</div>
                  <div className="dashboard-flat-stat-value">{campaignStats.avgCompletion}%</div>
                  <div className="dashboard-flat-stat-sub">across campaigns</div>
                </div>
                <div className="dashboard-flat-stat-cell">
                  <div className="dashboard-flat-stat-label">Rewards budget</div>
                  <div className="dashboard-flat-stat-value">
                    {campaignStats.rewardBudget > 0 ? `$${campaignStats.rewardBudget}` : "—"}
                  </div>
                  <div className="dashboard-flat-stat-sub is-down">
                    {campaignStats.rewardBudget > 0 ? "Configured incentives" : "No rewards configured"}
                  </div>
                </div>
              </div>

              <div className="dashboard-flat-section-head dashboard-campaigns-section-head">
                <span className="dashboard-flat-section-label">All campaigns</span>
                <span className="dashboard-flat-section-note">
                  {campaignStats.activeCount} active · {campaignStats.draftCount} draft
                </span>
              </div>

              {campaignsState.length === 0 ? (
                <div className="dashboard-empty-state">No campaigns created yet.</div>
              ) : (
                <div className="dashboard-flat-list">
                  {campaignsState.map((campaign) => {
                    const state = getCampaignState(campaign.hasNoEndDate, campaign.endsAt);
                    const submissionCount = campaign.submissionSummary.total;
                    const approvedCount = campaign.submissionSummary.approved;
                    const avgRating = campaign.submissionSummary.avgRating;
                    const completionRate =
                      submissionCount > 0 ? Math.round((approvedCount / submissionCount) * 100) : 0;
                    const createdAtLabel = formatShortDate(campaign.createdAt);
                    const isDraft = state !== "Active";

                    return (
                      <div
                        key={campaign.id}
                        className="dashboard-campaign-list-row"
                        role="button"
                        tabIndex={isNavigating ? -1 : 0}
                        aria-disabled={isNavigating}
                        onClick={() => {
                          if (isNavigating) {
                            return;
                          }
                          navigateTo(`/dashboard/campaigns/${campaign.id}/submissions`);
                        }}
                        onMouseEnter={() => {
                          router.prefetch(`/dashboard/campaigns/${campaign.id}/submissions`);
                          router.prefetch(`/dashboard/campaigns/${campaign.id}/edit`);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            if (isNavigating) {
                              return;
                            }
                            navigateTo(`/dashboard/campaigns/${campaign.id}/submissions`);
                          }
                        }}
                      >
                        <div
                          className={`dashboard-campaign-list-icon ${
                            isDraft ? "is-draft" : "is-active"
                          }`}
                        >
                          {isDraft ? "✏️" : submissionCount > 20 ? "🚀" : "🎯"}
                        </div>

                        <div className="dashboard-campaign-list-main">
                          <p className="dashboard-campaign-list-name">{campaign.name}</p>
                          <p className="dashboard-campaign-list-sub">
                            {isDraft
                              ? "Draft · Not published yet"
                              : `${siteHost}${campaign.publicPath}${
                                  createdAtLabel ? ` · Created ${createdAtLabel}` : ""
                                }`}
                          </p>
                        </div>

                        <div className="dashboard-campaign-list-metrics">
                          <div className="dashboard-campaign-list-metric">
                            <span>Reviews</span>
                            <strong>{submissionCount}</strong>
                          </div>
                          <div className="dashboard-campaign-list-metric">
                            <span>Rate</span>
                            <strong>{submissionCount > 0 ? `${completionRate}%` : "—"}</strong>
                          </div>
                          <div className="dashboard-campaign-list-metric">
                            <span>Rating</span>
                            <strong className={avgRating > 0 ? "is-rating" : ""}>
                              {avgRating > 0 ? `${avgRating.toFixed(1)}★` : "—"}
                            </strong>
                          </div>
                          <div className="dashboard-campaign-list-progress">
                            <div className="dashboard-campaign-list-progress-meta">
                              <span>
                                {approvedCount}/{submissionCount || 0}
                              </span>
                              <span>{completionRate}%</span>
                            </div>
                            <div className="dashboard-campaign-list-progress-bar">
                              <span style={{ width: `${completionRate}%` }} />
                            </div>
                          </div>
                        </div>

                        <span className={`dashboard-campaign-list-badge ${isDraft ? "is-draft" : "is-active"}`}>
                          {isDraft ? "Draft" : "Active"}
                        </span>

                        <div className="dashboard-campaign-list-actions">
                          {isDraft ? (
                            <button
                              type="button"
                              className="dashboard-secondary-btn dashboard-inline-action"
                              onClick={(event) => {
                                event.stopPropagation();
                                navigateTo(`/dashboard/campaigns/${campaign.id}/edit`);
                              }}
                            >
                              Publish
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="dashboard-campaign-share-btn"
                              onClick={(event) => {
                                event.stopPropagation();
                                copyText(`${siteOrigin}${campaign.publicPath}`);
                              }}
                            >
                              <svg
                                className="dashboard-button-icon"
                                viewBox="0 0 12 12"
                                fill="none"
                                aria-hidden="true"
                              >
                                <path
                                  d="M4.5 6.5L7.8 3.2M7.2 1.2h2.6v2.6M10 7.3v1.5A2.2 2.2 0 0 1 7.8 11H3.2A2.2 2.2 0 0 1 1 8.8V4.2A2.2 2.2 0 0 1 3.2 2h1.5"
                                  stroke="currentColor"
                                  strokeWidth="1.15"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                              </svg>
                              Share
                            </button>
                          )}
                          <button
                            type="button"
                            className="dashboard-campaign-kebab-btn"
                            onClick={(event) => {
                              event.stopPropagation();
                              navigateTo(`/dashboard/campaigns/${campaign.id}/edit`);
                            }}
                            aria-label={`Edit ${campaign.name}`}
                          >
                            <svg
                              className="dashboard-button-icon"
                              viewBox="0 0 12 12"
                              fill="currentColor"
                              aria-hidden="true"
                            >
                              <circle cx="6" cy="2.5" r="0.9" />
                              <circle cx="6" cy="6" r="0.9" />
                              <circle cx="6" cy="9.5" r="0.9" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeSection === "campaigns" && selectedCampaign && !selectedSubmissionDetail && (
            <div className="dashboard-campaign-detail-view">
              <div className="dashboard-section-topbar">
                <span className="dashboard-section-topbar-title">Campaign</span>
                <div className="dashboard-section-topbar-spacer" />
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-secondary"
                  onClick={() => {
                    navigateTo("/dashboard/campaigns");
                  }}
                  disabled={isNavigating}
                >
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 2L4 7l5 5"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  All campaigns
                </button>
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-secondary"
                  onClick={() => copyText(selectedCampaignPublicUrl)}
                >
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <rect
                      x="1"
                      y="4"
                      width="7"
                      height="7"
                      rx="1.2"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                    <path
                      d="M4 4V3a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H8"
                      stroke="currentColor"
                      strokeWidth="1.2"
                    />
                  </svg>
                  Copy link
                </button>
              </div>

              <div className="dashboard-campaign-detail-head">
                <div className="dashboard-campaign-detail-summary">
                  <div>
                    <p className="dashboard-eyebrow">Submissions</p>
                    <h2 className="dashboard-submissions-title">{selectedCampaign.name}</h2>
                    <p className="dashboard-submissions-link">{selectedCampaignPublicUrl}</p>
                  </div>
                  <span
                    className={`dashboard-campaign-list-badge ${
                      getCampaignState(selectedCampaign.hasNoEndDate, selectedCampaign.endsAt) === "Active"
                        ? "is-active"
                        : "is-draft"
                    }`}
                  >
                    {getCampaignState(selectedCampaign.hasNoEndDate, selectedCampaign.endsAt) === "Active"
                      ? "Active"
                      : "Draft"}
                  </span>
                </div>

                <div className="dashboard-campaign-detail-tabs">
                  <button
                    type="button"
                    className={`dashboard-campaign-detail-tab ${
                      campaignDetailTab === "submissions" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/submissions`);
                    }}
                    onMouseEnter={() =>
                      router.prefetch(`/dashboard/campaigns/${selectedCampaign.id}/submissions`)
                    }
                    disabled={isNavigating}
                  >
                    Submissions
                  </button>
                  <button
                    type="button"
                    className={`dashboard-campaign-detail-tab ${
                      campaignDetailTab === "embed" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/embed`);
                    }}
                    onMouseEnter={() =>
                      router.prefetch(`/dashboard/campaigns/${selectedCampaign.id}/embed`)
                    }
                    disabled={isNavigating}
                  >
                    Embed
                  </button>
                  <button
                    type="button"
                    className={`dashboard-campaign-detail-tab ${
                      campaignDetailTab === "automation" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/automation`);
                    }}
                    onMouseEnter={() =>
                      router.prefetch(`/dashboard/campaigns/${selectedCampaign.id}/automation`)
                    }
                    disabled={isNavigating}
                  >
                    Automation
                  </button>
                  <button
                    type="button"
                    className={`dashboard-campaign-detail-tab ${
                      campaignDetailTab === "settings" ? "is-active" : ""
                    }`}
                    onClick={() => {
                      navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/settings`);
                    }}
                    onMouseEnter={() =>
                      router.prefetch(`/dashboard/campaigns/${selectedCampaign.id}/settings`)
                    }
                    disabled={isNavigating}
                  >
                    Settings
                  </button>
                </div>
              </div>

              {campaignDetailTab === "submissions" && (
                <>
                  <div className="dashboard-detail-stats">
                    <div className="dashboard-detail-stat">
                      <p className="dashboard-detail-stat-label">Total submissions</p>
                      <p className="dashboard-detail-stat-value">{selectedCampaignStats?.total || 0}</p>
                    </div>
                    <div className="dashboard-detail-stat">
                      <p className="dashboard-detail-stat-label">Avg. rating</p>
                      <p className="dashboard-detail-stat-value">
                        {selectedCampaignStats && selectedCampaignStats.total > 0
                          ? `${selectedCampaignStats.avgRating.toFixed(1)}★`
                          : "0.0★"}
                      </p>
                    </div>
                    <div className="dashboard-detail-stat">
                      <p className="dashboard-detail-stat-label">Rewards sent</p>
                      <p className="dashboard-detail-stat-value">
                        {selectedCampaignStats?.approvedCount || 0}
                      </p>
                    </div>
                  </div>

                  <div className="dashboard-flat-section-head dashboard-flat-section-head-inline">
                    <span className="dashboard-flat-section-label">Video reviews</span>
                    <span className="dashboard-flat-section-note">
                      {selectedCampaign.submissions.length}{" "}
                      {selectedCampaign.submissions.length === 1 ? "review" : "reviews"}
                    </span>
                  </div>

                  {selectedCampaign.submissions.length === 0 ? (
                    <div className="dashboard-detail-empty-state">
                      <div className="dashboard-detail-empty-icon">▶</div>
                      <h3>No reviews yet</h3>
                      <p>Share your campaign link to start collecting video testimonials.</p>
                      <button
                        type="button"
                        className="dashboard-action-btn"
                        onClick={() => copyText(selectedCampaignPublicUrl)}
                      >
                        Copy campaign link
                      </button>
                    </div>
                  ) : (
                    <div className="dashboard-detail-review-list">
                      {selectedCampaign.submissions.map((submission) => {
                        const normalizedStatus = normalizeSubmissionStatus(submission.status);
                        const isApproved = normalizedStatus === "APPROVED";
                        const submissionState = getSubmissionState(submission.status);
                        const approveActionKey = `${submission.id}:APPROVED`;
                        const rejectActionKey = `${submission.id}:REJECTED`;
                        const excerpt = getSubmissionExcerpt(
                          submission.aiKeyPhrase,
                          submission.aiGeneratedReview,
                          submission.answers
                        );

                        return (
                          <div key={submission.id} className="dashboard-detail-review-row">
                            <div className="dashboard-detail-review-avatar">
                              {getReviewerInitials(submission.reviewerName)}
                            </div>
                            <div className="dashboard-detail-review-thumb">
                              <video
                                src={`/api/campaigns/${selectedCampaign.id}/submissions/${submission.id}/view`}
                                ref={(node) => {
                                  videoRefs.current[submission.id] = node;
                                }}
                                preload="metadata"
                                playsInline
                                onClick={() => toggleSubmissionPlayback(submission.id)}
                              />
                              {playingSubmissionId !== submission.id && (
                                <button
                                  type="button"
                                  className="dashboard-detail-review-play"
                                  onClick={() => toggleSubmissionPlayback(submission.id)}
                                >
                                  ▶
                                </button>
                              )}
                            </div>
                            <div className="dashboard-detail-review-copy">
                              <p className="dashboard-detail-review-name">{submission.reviewerName}</p>
                              <p className="dashboard-detail-review-note">
                                {excerpt || "Video submission"} ·{" "}
                                {formatSubmissionDuration(submission.durationSeconds) ||
                                  formatShortDate(submission.createdAt) ||
                                  "—"}
                              </p>
                            </div>
                            <p className="dashboard-detail-review-stars">
                              {"★".repeat(submission.reviewerRating || 0)}
                              <span>
                                {"★".repeat(Math.max(5 - (submission.reviewerRating || 0), 0))}
                              </span>
                            </p>
                            <span
                              className={`dashboard-campaign-list-badge ${submissionState.badgeClassName}`}
                            >
                              {submissionState.label}
                            </span>
                            <span className="dashboard-detail-review-date">
                              {formatShortDate(submission.createdAt) || "—"}
                            </span>
                            {isApproved ? (
                              <button
                                type="button"
                                className="dashboard-secondary-btn dashboard-inline-action"
                                onClick={() => openSubmissionDetails(selectedCampaign.id, submission.id)}
                                onMouseEnter={() =>
                                  router.prefetch(
                                    `/dashboard/campaigns/${selectedCampaign.id}/submission/${submission.id}`
                                  )
                                }
                                disabled={isNavigating}
                              >
                                View
                              </button>
                            ) : (
                              <div className="dashboard-detail-review-actions">
                                <button
                                  type="button"
                                  className="dashboard-secondary-btn dashboard-inline-action"
                                  onClick={() =>
                                    handleSubmissionAction(
                                      selectedCampaign.id,
                                      submission.id,
                                      "REJECTED"
                                    )
                                  }
                                  disabled={submissionActionId === rejectActionKey}
                                >
                                  {submissionActionId === rejectActionKey ? "Saving..." : "Reject"}
                                </button>
                                <button
                                  type="button"
                                  className="dashboard-action-btn dashboard-inline-action"
                                  onClick={() =>
                                    handleSubmissionAction(
                                      selectedCampaign.id,
                                      submission.id,
                                      "APPROVED"
                                    )
                                  }
                                  disabled={submissionActionId === approveActionKey}
                                >
                                  {submissionActionId === approveActionKey ? "Saving..." : "Approve"}
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {campaignDetailTab === "embed" && (
                <div className="dashboard-detail-sections">
                  <section className="dashboard-detail-section">
                    <p className="dashboard-eyebrow">Embed</p>
                    <h3 className="dashboard-campaign-webhook-title">Embed this campaign</h3>
                    <p className="dashboard-campaign-webhook-copy">
                      Add this campaign directly inside your website with an iframe.
                    </p>
                    <div className="dashboard-embed-block">
                      <p className="dashboard-settings-label">Embed URL</p>
                      <div className="dashboard-inline-code">{selectedCampaignEmbedUrl}</div>
                      <button
                        type="button"
                        className="dashboard-secondary-btn dashboard-copy-btn"
                        onClick={() => copyText(selectedCampaignEmbedUrl)}
                      >
                        Copy URL
                      </button>
                    </div>
                  </section>
                  <section className="dashboard-detail-section">
                    <p className="dashboard-settings-label">Embed snippet</p>
                    <textarea
                      readOnly
                      rows={4}
                      className="dashboard-embed-textarea"
                      value={selectedCampaignEmbedSnippet}
                    />
                    <button
                      type="button"
                      className="dashboard-secondary-btn dashboard-copy-btn"
                      onClick={() => copyText(selectedCampaignEmbedSnippet)}
                    >
                      Copy snippet
                    </button>
                  </section>
                </div>
              )}

              {campaignDetailTab === "automation" && (
                <div className="dashboard-detail-sections">
                  <section className="dashboard-detail-section">
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
                      <button type="button" className="dashboard-secondary-btn dashboard-inline-action">
                        {selectedCampaign.webhookEndpoint
                          ? "Using campaign webhook"
                          : "Using account webhooks"}
                      </button>
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
                          className="dashboard-secondary-btn"
                          onClick={() => copyText(latestCampaignWebhookSecret)}
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
                          <label
                            key={`campaign-${option.value}`}
                            className="dashboard-webhook-event-option"
                          >
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
                            className="dashboard-secondary-btn"
                            disabled={campaignWebhookSaving}
                            onClick={handleRemoveCampaignWebhook}
                          >
                            {campaignWebhookSaving ? "Removing..." : "Remove override"}
                          </button>
                        )}
                      </div>
                    </form>
                  </section>
                </div>
              )}

              {campaignDetailTab === "settings" && (
                <div className="dashboard-detail-sections">
                  <section className="dashboard-detail-section">
                    <p className="dashboard-eyebrow">Settings</p>
                    <h3 className="dashboard-campaign-webhook-title">Campaign settings</h3>
                    <p className="dashboard-campaign-webhook-copy">
                      Configure the current campaign and manage its public availability.
                    </p>

                    <div className="dashboard-detail-option-block">
                      <div className="dashboard-detail-option-row">
                        <div>
                          <p className="dashboard-detail-option-title">Campaign status</p>
                          <p className="dashboard-detail-option-copy">
                            Publish or unpublish this campaign without changing its link.
                          </p>
                        </div>
                        {selectedCampaign.hasNoEndDate || !selectedCampaign.endsAt ? (
                          <button
                            type="button"
                            className="dashboard-secondary-btn"
                            onClick={() => {
                              void fetch(`/api/campaigns/${selectedCampaign.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "unpublish" }),
                              }).then(() => router.refresh());
                            }}
                          >
                            Unpublish
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="dashboard-secondary-btn"
                            onClick={() => {
                              void fetch(`/api/campaigns/${selectedCampaign.id}`, {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ action: "publish" }),
                              }).then(() => router.refresh());
                            }}
                          >
                            Publish
                          </button>
                        )}
                      </div>
                      <div className="dashboard-detail-option-row">
                        <div>
                          <p className="dashboard-detail-option-title">Reward</p>
                          <p className="dashboard-detail-option-copy">
                            {selectedCampaign.rewardText
                              ? `${selectedCampaign.rewardText}${selectedCampaign.rewardValue ? ` · ${selectedCampaign.rewardValue}` : ""}`
                              : "No reward configured."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="dashboard-secondary-btn"
                          onClick={() => {
                            navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/edit`);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                      <div className="dashboard-detail-option-row">
                        <div>
                          <p className="dashboard-detail-option-title">Question</p>
                          <p className="dashboard-detail-option-copy">
                            {selectedCampaign.questions[0]?.text || "No guiding question configured."}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="dashboard-secondary-btn"
                          onClick={() => {
                            navigateTo(`/dashboard/campaigns/${selectedCampaign.id}/edit`);
                          }}
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}

          {activeSection === "campaigns" && selectedCampaign && selectedSubmissionDetail && (
            <div className="dashboard-submission-detail-view">
              <div className="dashboard-section-topbar">
                <span className="dashboard-section-topbar-title">Submission</span>
                <div className="dashboard-section-topbar-spacer" />
                <button
                  type="button"
                  className="dashboard-section-btn dashboard-section-btn-secondary"
                  onClick={closeSubmissionDetails}
                >
                  <svg
                    className="dashboard-button-icon"
                    viewBox="0 0 14 14"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 2L4 7l5 5"
                      stroke="currentColor"
                      strokeWidth="1.35"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Back to submissions
                </button>
                {selectedSubmissionStatus === "PENDING" && (
                  <>
                    <button
                      type="button"
                      className="dashboard-section-btn dashboard-section-btn-secondary"
                      onClick={() =>
                        handleSubmissionAction(
                          selectedSubmissionDetail.campaign.id,
                          selectedSubmissionDetail.submission.id,
                          "REJECTED"
                        )
                      }
                      disabled={submissionActionId === selectedSubmissionRejectActionKey}
                    >
                      {submissionActionId === selectedSubmissionRejectActionKey
                        ? "Saving..."
                        : "Reject"}
                    </button>
                    <button
                      type="button"
                      className="dashboard-section-btn dashboard-section-btn-primary"
                      onClick={() =>
                        handleSubmissionAction(
                          selectedSubmissionDetail.campaign.id,
                          selectedSubmissionDetail.submission.id,
                          "APPROVED"
                        )
                      }
                      disabled={submissionActionId === selectedSubmissionApproveActionKey}
                    >
                      {submissionActionId === selectedSubmissionApproveActionKey
                        ? "Saving..."
                        : "Approve"}
                    </button>
                  </>
                )}
                {selectedSubmissionState && selectedSubmissionStatus !== "PENDING" && (
                  <span
                    className={`dashboard-campaign-list-badge ${selectedSubmissionState.badgeClassName}`}
                  >
                    {selectedSubmissionState.label}
                  </span>
                )}
              </div>

              <div className="dashboard-submission-detail-head">
                <div className="dashboard-submission-detail-head-copy">
                  <p className="dashboard-eyebrow">Submission details</p>
                  <h2 className="dashboard-submissions-title">
                    {selectedSubmissionDetail.submission.reviewerName}
                  </h2>
                  <p className="dashboard-submissions-link">
                    {selectedSubmissionDetail.campaign.name}
                    {formatDateTime(selectedSubmissionDetail.submission.createdAt)
                      ? ` · ${formatDateTime(selectedSubmissionDetail.submission.createdAt)}`
                      : ""}
                  </p>
                </div>
                <div className="dashboard-submission-detail-head-meta">
                  <div className="dashboard-detail-review-stars dashboard-detail-review-stars-static">
                    {"★".repeat(selectedSubmissionDetail.submission.reviewerRating || 0)}
                    <span>
                      {"★".repeat(
                        Math.max(5 - (selectedSubmissionDetail.submission.reviewerRating || 0), 0)
                      )}
                    </span>
                  </div>
                  {selectedSubmissionExcerpt && (
                    <p className="dashboard-submission-detail-head-note">
                      {selectedSubmissionExcerpt}
                    </p>
                  )}
                </div>
              </div>

              <div className="dashboard-detail-sections">
                <section className="dashboard-detail-section">
                  <div className="dashboard-submission-stage">
                    <div className="dashboard-submission-detail-player">
                      <video
                        controls
                        playsInline
                        preload="metadata"
                        src={`/api/campaigns/${selectedSubmissionDetail.campaign.id}/submissions/${selectedSubmissionDetail.submission.id}/view`}
                      />
                    </div>

                    <div className="dashboard-submission-facts">
                      <div className="dashboard-submission-fact-row">
                        <span>Status</span>
                        <strong>{selectedSubmissionState?.label || selectedSubmissionDetail.submission.status}</strong>
                      </div>
                      <div className="dashboard-submission-fact-row">
                        <span>Rating</span>
                        <strong>
                          {typeof selectedSubmissionDetail.submission.reviewerRating === "number"
                            ? `${selectedSubmissionDetail.submission.reviewerRating} / 5`
                            : "N/A"}
                        </strong>
                      </div>
                      <div className="dashboard-submission-fact-row">
                        <span>Email</span>
                        <strong>{selectedSubmissionDetail.submission.reviewerEmail}</strong>
                      </div>
                      <div className="dashboard-submission-fact-row">
                        <span>Campaign</span>
                        <strong>{selectedSubmissionDetail.campaign.name}</strong>
                      </div>
                      <div className="dashboard-submission-fact-row">
                        <span>Duration</span>
                        <strong>
                          {formatSubmissionDuration(
                            selectedSubmissionDetail.submission.durationSeconds
                          ) || "—"}
                        </strong>
                      </div>
                      <div className="dashboard-submission-fact-row">
                        <span>AI status</span>
                        <strong>{selectedSubmissionDetail.submission.aiStatus}</strong>
                      </div>
                    </div>
                  </div>
                </section>

                {selectedSubmissionDetail.submission.aiError && (
                  <section className="dashboard-detail-section">
                    <div className="dashboard-settings-alert dashboard-settings-alert-error">
                      AI processing failed: {selectedSubmissionDetail.submission.aiError}
                    </div>
                  </section>
                )}

                {(selectedSubmissionDetail.submission.aiKeyPhrase ||
                  selectedSubmissionDetail.submission.aiGeneratedReview) && (
                  <section className="dashboard-detail-section">
                    <p className="dashboard-settings-label">Summary</p>
                    <p className="dashboard-submission-ai-copy">
                      {selectedSubmissionDetail.submission.aiKeyPhrase ||
                        selectedSubmissionDetail.submission.aiGeneratedReview}
                    </p>
                  </section>
                )}

                {selectedSubmissionDetail.submission.aiGeneratedReview && (
                  <section className="dashboard-detail-section">
                    <p className="dashboard-settings-label">AI written review</p>
                    <p className="dashboard-submission-ai-copy">
                      {selectedSubmissionDetail.submission.aiGeneratedReview}
                    </p>
                  </section>
                )}

                <section className="dashboard-detail-section">
                  <p className="dashboard-settings-label">Transcript</p>
                  <p className="dashboard-submission-ai-copy">
                    {selectedSubmissionDetail.submission.aiTranscript ||
                      "Transcript not available yet."}
                  </p>
                </section>

                {selectedSubmissionDetail.submission.answers.length > 0 && (
                  <section className="dashboard-detail-section">
                    <p className="dashboard-settings-label">Answers</p>
                    <div className="dashboard-submission-answers">
                      {selectedSubmissionDetail.submission.answers.map((answer) => (
                        <div key={answer.questionId} className="dashboard-submission-answer-row">
                          <p className="dashboard-submission-answer-question">{answer.questionText}</p>
                          <p className="dashboard-submission-answer-copy">{answer.answer}</p>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            </div>
          )}

          {activeSection === "settings" && (
            <DashboardSettings
              viewerName={viewerName}
              viewerEmail={viewerEmail}
              workspaceName={workspaceName}
              siteHost={siteHost}
              websiteUrl={brandWebsiteUrl}
              campaignsCount={campaignsState.length}
              totalReviews={totalReviewsCount}
              webhookEndpoints={webhookEndpoints}
              webhookLoading={webhookLoading}
              webhookError={webhookError}
              webhookActionId={webhookActionId}
              webhookUrl={webhookUrl}
              webhookDescription={webhookDescription}
              webhookEvents={webhookEvents}
              webhookFormSaving={webhookFormSaving}
              latestWebhookSecret={latestWebhookSecret}
              webhookNotice={webhookNotice}
              webhookEventOptions={WEBHOOK_EVENT_OPTIONS}
              onWebhookUrlChange={setWebhookUrl}
              onWebhookDescriptionChange={setWebhookDescription}
              onToggleWebhookEvent={toggleWebhookEventSelection}
              onCreateWebhook={handleCreateWebhook}
              onSendWebhookTest={handleSendWebhookTest}
              onRotateWebhookSecret={handleRotateWebhookSecret}
              onToggleWebhook={handleToggleWebhook}
              onDeleteWebhook={handleDeleteWebhook}
              onCopyText={copyText}
              brandLoading={brandLoading}
              brandSaving={brandSaving}
              brandError={brandError}
              brandNotice={brandNotice}
              brandName={brandName}
              brandWebsiteUrl={brandWebsiteUrl}
              brandLogoUrl={brandLogoUrl}
              brandPrimaryColor={brandPrimaryColor}
              brandSecondaryColor={brandSecondaryColor}
              brandLogoUploading={brandLogoUploading}
              brandLogoUploadProgress={brandLogoUploadProgress}
              onBrandNameChange={setBrandName}
              onBrandWebsiteUrlChange={setBrandWebsiteUrl}
              onBrandLogoUrlChange={setBrandLogoUrl}
              onBrandPrimaryColorChange={setBrandPrimaryColor}
              onBrandSecondaryColorChange={setBrandSecondaryColor}
              onBrandLogoFileChange={handleBrandLogoFileChange}
              onSaveBrandSettings={handleSaveBrandSettings}
              initialPanel={initialSettingsPanel}
            />
          )}
        </div>
      </section>

      <style>{dashboardShellStyles}</style>
    </div>
  );
}

const dashboardShellStyles = `
  .dashboard-shell {
    /* Internal dashboard baseline: flat workspace first, cards only for focused data blocks. */
    min-height: 100vh;
    --brand: #ff4820;
    --dashboard-bg: #ffffff;
    --dashboard-bg-subtle: #f7f7f7;
    --dashboard-bg-raised: #ffffff;
    --dashboard-border: #e8e8e8;
    --dashboard-border-strong: #d0d0d0;
    --dashboard-text: #0a0a0a;
    --dashboard-text-secondary: #5c5c5c;
    --dashboard-text-tertiary: #9a9a9a;
    --dashboard-font: "Geist", "Inter", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-family: var(--dashboard-font);
    color: var(--dashboard-text);
    background: var(--dashboard-bg);
  }

  .dashboard-shell button,
  .dashboard-shell input,
  .dashboard-shell textarea {
    font-family: var(--dashboard-font);
  }

  .dashboard-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 232px;
    background: var(--dashboard-bg-subtle);
    border-right: 1px solid var(--dashboard-border);
    display: flex;
    flex-direction: column;
    z-index: 20;
  }

  .dashboard-sidebar-top {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 9px;
    height: 64px;
    min-height: 64px;
    padding: 0 14px;
  }

  .dashboard-brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--dashboard-text);
    min-width: 0;
  }

  .dashboard-brand-logo {
    width: auto;
    height: 44px;
    max-width: 100%;
  }

  .dashboard-sidebar-spacer {
    flex: 1;
  }

  .dashboard-sidebar-footer {
    border-top: 1px solid var(--dashboard-border);
    padding: 8px;
  }

  .dashboard-profile-card {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
    padding: 7px 9px;
    border-radius: 6px;
  }

  .dashboard-profile-card:hover {
    background: var(--dashboard-bg-muted, #f0f0f0);
  }

  .dashboard-profile-avatar-shell {
    position: relative;
    width: 26px;
    height: 26px;
    flex-shrink: 0;
  }

  .dashboard-profile-avatar-fallback {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #0a0a0a;
    color: #ffffff;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-avatar {
    position: absolute;
    inset: 0;
    display: grid;
    place-items: center;
    opacity: 0;
  }

  .dashboard-avatar :where(.cl-userButtonBox, .cl-userButtonTrigger, .cl-avatarBox) {
    width: 26px;
    height: 26px;
    border-radius: 999px;
  }

  .dashboard-profile-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--dashboard-text);
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-profile-workspace {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-sidebar-nav {
    padding: 8px;
    display: grid;
    gap: 6px;
  }

  .dashboard-nav-group {
    display: grid;
    gap: 2px;
  }

  .dashboard-nav-label {
    font-size: 10px;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--dashboard-text-tertiary);
    margin: 10px 8px 5px;
  }

  .dashboard-nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 9px;
    min-height: 36px;
    padding: 7px 9px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--dashboard-text-secondary);
    font-family: var(--dashboard-font);
    font-size: 13px;
    font-weight: 400;
    text-align: left;
    cursor: pointer;
    transition: all 100ms ease;
  }

  .dashboard-nav-item-active {
    border: 1px solid var(--dashboard-border);
    background: #ffffff;
    color: #111111;
    font-weight: 500;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .dashboard-nav-item-muted:hover {
    background: #f0f0f0;
    color: var(--dashboard-text);
  }

  .dashboard-nav-icon {
    width: 15px;
    height: 15px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    opacity: 0.65;
  }

  .dashboard-nav-icon svg {
    width: 15px;
    height: 15px;
  }

  .dashboard-nav-count {
    margin-left: auto;
    min-width: 24px;
    height: 20px;
    padding: 0 5px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: var(--brand);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    font-family: var(--dashboard-font);
  }

  .dashboard-nav-count.is-muted {
    background: #f0f0f0;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-nav-caret {
    margin-left: auto;
    width: 22px;
    height: 22px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--dashboard-text-tertiary);
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    transition: color 160ms ease;
  }

  .dashboard-nav-caret.is-open {
    color: var(--dashboard-text-secondary);
  }

  .dashboard-subnav {
    display: grid;
    gap: 2px;
    margin: 2px 0 4px 28px;
  }

  .dashboard-subnav-item {
    min-height: 30px;
    padding: 0 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    color: var(--dashboard-text-secondary);
    font-size: 12px;
    font-weight: 700;
    text-align: left;
    cursor: pointer;
  }

  .dashboard-nav-item:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .dashboard-subnav-item:hover {
    color: var(--dashboard-text);
    background: var(--dashboard-bg-subtle);
  }

  .dashboard-subnav-item.is-active {
    color: var(--dashboard-text);
    background: var(--dashboard-bg-subtle);
  }

  .dashboard-main {
    margin-left: 232px;
    min-height: 100vh;
    background: var(--dashboard-bg);
    position: relative;
  }

  .dashboard-shell.is-embedded .dashboard-main {
    margin-left: 232px;
  }

  .dashboard-route-loading {
    position: sticky;
    top: 0;
    z-index: 30;
    height: 3px;
    background: linear-gradient(90deg, var(--brand) 0%, #ff7a5c 45%, var(--brand) 100%);
    background-size: 220% 100%;
    animation: dashboardRouteLoad 900ms linear infinite;
  }

  .dashboard-route-loading span {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @keyframes dashboardRouteLoad {
    from {
      background-position: 0% 50%;
    }
    to {
      background-position: 220% 50%;
    }
  }

  .dashboard-content {
    display: grid;
    gap: 16px;
    padding: 32px 24px 32px;
    width: 100%;
    max-width: none;
  }

  .dashboard-content.is-campaigns-workspace {
    padding: 0;
    gap: 0;
  }

  .dashboard-content.is-settings-view {
    padding: 0;
    gap: 0;
  }

  .dashboard-flat-view {
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
    background: var(--dashboard-bg-raised);
    overflow: hidden;
    display: grid;
    width: 100%;
  }

  .dashboard-flat-topbar {
    height: 48px;
    border-bottom: 1px solid var(--dashboard-border);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    flex-shrink: 0;
  }

  .dashboard-flat-topbar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--dashboard-text);
    letter-spacing: -0.01em;
    white-space: nowrap;
  }

  .dashboard-flat-topbar-divider {
    width: 1px;
    height: 16px;
    background: var(--dashboard-border);
    flex-shrink: 0;
  }

  .dashboard-flat-topbar-note {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    white-space: nowrap;
  }

  .dashboard-flat-topbar-spacer {
    flex: 1;
  }

  .dashboard-section-topbar {
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px;
    border-bottom: 1px solid var(--dashboard-border);
    background: #fff;
  }

  .dashboard-section-topbar-title {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--dashboard-text);
    white-space: nowrap;
  }

  .dashboard-section-topbar-spacer {
    flex: 1;
  }

  .dashboard-section-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid transparent;
    background: transparent;
    color: var(--dashboard-text);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    font-family: var(--dashboard-font);
  }

  .dashboard-section-btn-primary {
    background: #0a0a0a;
    color: #fff;
    border-color: #0a0a0a;
  }

  .dashboard-section-btn-secondary {
    background: #fff;
    color: var(--dashboard-text);
    border-color: var(--dashboard-border);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  .dashboard-section-btn-primary:hover {
    background: #262626;
    border-color: #262626;
  }

  .dashboard-section-btn-secondary:hover {
    background: #f7f7f7;
    border-color: var(--dashboard-border-strong);
  }

  .dashboard-flat-stats {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    border-bottom: 1px solid var(--dashboard-border);
  }

  .dashboard-flat-stat-cell {
    padding: 14px 16px;
    border-right: 1px solid var(--dashboard-border);
    display: grid;
    gap: 4px;
  }

  .dashboard-flat-stat-cell:last-child {
    border-right: none;
  }

  .dashboard-flat-stat-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-flat-stat-value {
    font-size: 22px;
    font-weight: 600;
    letter-spacing: -0.03em;
    color: var(--dashboard-text);
    line-height: 1;
  }

  .dashboard-flat-stat-sub {
    font-size: 11px;
    color: var(--dashboard-text-secondary);
  }

  .dashboard-flat-stat-sub.is-up {
    color: #16a34a;
  }

  .dashboard-flat-stat-sub.is-down {
    color: var(--brand);
  }

  .dashboard-flat-section-head {
    padding: 10px 16px;
    border-bottom: 1px solid var(--dashboard-border);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .dashboard-flat-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--dashboard-text-secondary);
  }

  .dashboard-flat-section-note {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-flat-section-head-inline {
    padding-left: 0;
    padding-right: 0;
    margin-top: 4px;
  }

  .dashboard-flat-inline-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .dashboard-flat-list {
    display: grid;
  }

  .dashboard-flat-workspace {
    display: grid;
    gap: 18px;
    padding: 18px 20px 20px;
  }

  .dashboard-flat-form-stack {
    display: grid;
    gap: 18px;
  }

  .dashboard-flat-form-section {
    display: grid;
    gap: 14px;
    padding-top: 18px;
    border-top: 1px solid var(--dashboard-border);
  }

  .dashboard-flat-form-section:first-child {
    padding-top: 0;
    border-top: none;
  }

  .dashboard-flat-form-section-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .dashboard-flat-form-title {
    margin: 0 0 4px;
    font-size: 18px;
    line-height: 1.05;
    font-weight: 600;
    letter-spacing: -0.04em;
    color: var(--dashboard-text);
  }

  .dashboard-flat-form-copy {
    margin: 0;
    font-size: 13px;
    line-height: 1.55;
    color: var(--dashboard-text-secondary);
    max-width: 620px;
  }

  .dashboard-campaigns-view {
    border: none;
    border-radius: 0;
    background: transparent;
  }

  .dashboard-campaigns-tabs {
    display: flex;
    flex-shrink: 0;
  }

  .dashboard-campaigns-tab {
    height: 48px;
    padding: 0 16px;
    display: inline-flex;
    align-items: center;
    border: none;
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    background: transparent;
    color: var(--dashboard-text-tertiary);
    font-size: 13px;
    font-weight: 500;
    font-family: var(--dashboard-font);
    cursor: default;
  }

  .dashboard-campaigns-tab.is-active {
    color: var(--dashboard-text);
    border-bottom-color: var(--dashboard-text);
  }

  .dashboard-campaigns-section-head {
    padding-top: 12px;
    padding-bottom: 12px;
  }

  .dashboard-campaign-list-row {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) auto auto auto;
    align-items: center;
    gap: 16px;
    padding: 14px 16px;
    border-bottom: 1px solid var(--dashboard-border);
    cursor: pointer;
    transition: background 0.18s ease;
  }

  .dashboard-campaign-list-row:hover {
    background: #fcfcfc;
  }

  .dashboard-campaign-list-row[aria-disabled="true"] {
    opacity: 0.7;
    cursor: wait;
  }

  .dashboard-campaign-list-row:last-child {
    border-bottom: none;
  }

  .dashboard-campaign-list-icon {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: grid;
    place-items: center;
    font-size: 14px;
    font-weight: 700;
    background: #f5f5f5;
    color: var(--dashboard-text-secondary);
  }

  .dashboard-campaign-list-icon.is-active {
    background: #fff3f0;
    color: var(--brand);
  }

  .dashboard-campaign-list-icon.is-draft {
    opacity: 0.55;
  }

  .dashboard-campaign-list-main {
    min-width: 0;
  }

  .dashboard-campaign-list-name {
    margin: 0;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--dashboard-text);
  }

  .dashboard-campaign-list-sub {
    margin: 4px 0 0;
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-campaign-list-metrics {
    display: flex;
    align-items: center;
    gap: 20px;
  }

  .dashboard-campaign-list-metric {
    min-width: 58px;
    text-align: right;
    display: grid;
    gap: 2px;
  }

  .dashboard-campaign-list-metric span {
    font-size: 10px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-campaign-list-metric strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--dashboard-text);
  }

  .dashboard-campaign-list-metric strong.is-rating {
    color: #f59e0b;
  }

  .dashboard-campaign-list-progress {
    width: 132px;
    display: grid;
    gap: 4px;
  }

  .dashboard-campaign-list-progress-meta {
    display: flex;
    justify-content: space-between;
    gap: 8px;
    font-size: 10px;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-campaign-list-progress-bar {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: #f1f1f1;
    overflow: hidden;
  }

  .dashboard-campaign-list-progress-bar span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: #111111;
  }

  .dashboard-campaign-list-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 30px;
    padding: 0 13px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    white-space: nowrap;
  }

  .dashboard-campaign-list-badge.is-active {
    border: 1px solid #b7f0c7;
    background: #f0fdf4;
    color: #16914b;
  }

  .dashboard-campaign-list-badge.is-active::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #22c55e;
    margin-right: 6px;
  }

  .dashboard-campaign-list-badge.is-draft {
    border: 1px solid #e5e7eb;
    background: #f5f5f5;
    color: #666;
  }

  .dashboard-campaign-list-badge.is-pending {
    border: 1px solid #fde68a;
    background: #fffbeb;
    color: #d97706;
  }

  .dashboard-campaign-list-badge.is-rejected {
    border: 1px solid #fecaca;
    background: #fef2f2;
    color: #dc2626;
  }

  .dashboard-campaign-list-actions {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .dashboard-campaign-share-btn,
  .dashboard-campaign-kebab-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: #555;
    min-height: 30px;
    padding: 0 8px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .dashboard-campaign-share-btn:hover,
  .dashboard-campaign-kebab-btn:hover {
    background: #f6f6f6;
    color: #111;
  }

  .dashboard-hero-card,
  .dashboard-list-card,
  .dashboard-submissions-card,
  .dashboard-alert-card {
    border: 1px solid var(--dashboard-border);
    border-radius: 16px;
    background: var(--dashboard-bg-raised);
    box-shadow: none;
  }

  .dashboard-page-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    min-height: 48px;
    padding: 8px 14px;
    border: 1px solid var(--dashboard-border);
    border-radius: 8px;
    background: var(--dashboard-bg-raised);
    box-shadow: none;
  }

  .dashboard-page-header-copy {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dashboard-page-header-actions {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dashboard-eyebrow {
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--brand);
    margin-bottom: 6px;
    font-family: var(--dashboard-font);
  }

  .dashboard-title {
    font-size: 14px;
    line-height: 1;
    letter-spacing: -0.01em;
    font-weight: 600;
    color: var(--dashboard-text);
    margin: 0;
  }

  .dashboard-subtitle {
    display: none;
  }

  .dashboard-action-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: none;
    background: var(--brand);
    color: #fff;
    font-family: var(--dashboard-font);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }

  .dashboard-builder-wrap {
    display: grid;
    gap: 10px;
    border-top: 1px solid var(--dashboard-border);
    padding-top: 14px;
  }

  .dashboard-campaign-builder-view {
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 32px);
    background: var(--dashboard-bg);
  }

  .dashboard-builder-toolbar-shell {
    flex-shrink: 0;
  }

  .dashboard-campaign-builder-content {
    flex: 1;
    overflow-y: auto;
  }

  .dashboard-campaign-builder-inner {
    width: 100%;
    max-width: none;
    padding: 0 28px 18px;
  }

  .dashboard-sub-toolbar {
    justify-content: flex-start;
    margin-bottom: -6px;
  }

  .dashboard-alert-card {
    padding: 12px 14px;
    color: #925c00;
    background: #fff8e8;
    border-color: rgba(217, 119, 6, 0.16);
  }

  .dashboard-campaign-section {
    display: grid;
    gap: 0;
    border-top: 1px solid var(--dashboard-border);
  }

  .dashboard-campaign-section .dashboard-empty-state {
    border: none;
    border-radius: 0;
    background: transparent;
    padding: 18px 0 6px;
  }

  .dashboard-section-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0 10px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .dashboard-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--dashboard-text);
    letter-spacing: -0.03em;
    margin: 0;
  }

  .dashboard-section-copy {
    margin: 6px 0 0;
    font-size: 13px;
    color: var(--dashboard-text-secondary);
  }

  .dashboard-list-count {
    font-size: 11px;
    font-weight: 700;
    color: var(--dashboard-text-secondary);
    font-family: var(--dashboard-font);
    white-space: nowrap;
  }

  .dashboard-campaign-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding: 14px 0;
  }

  .dashboard-campaign-row.with-divider {
    border-top: 1px solid var(--dashboard-border);
  }

  .dashboard-campaign-copy {
    min-width: 0;
    display: grid;
    gap: 4px;
  }

  .dashboard-campaign-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--dashboard-text);
    letter-spacing: -0.01em;
    margin: 0;
  }

  .dashboard-campaign-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .dashboard-campaign-path {
    font-size: 11px;
    color: var(--dashboard-text-secondary);
    font-family: var(--dashboard-font);
    margin: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-campaign-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 10px;
    flex-wrap: wrap;
  }

  .dashboard-status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.02em;
  }

  .dashboard-status-badge::before {
    content: "";
    width: 6px;
    height: 6px;
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
    gap: 6px;
    height: 30px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--dashboard-border);
    background: var(--dashboard-bg-raised);
    color: var(--dashboard-text);
    font-size: 13px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
  }

  .dashboard-button-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  .dashboard-row-link {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: rgba(24, 24, 32, 0.62);
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
    cursor: pointer;
  }

  .dashboard-row-link:hover {
    color: #14141b;
  }

  .dashboard-secondary-btn:hover {
    border-color: var(--dashboard-border-strong);
    background: var(--dashboard-bg-subtle);
  }

  .dashboard-action-btn:disabled,
  .dashboard-secondary-btn:disabled {
    cursor: not-allowed;
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
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 18px 0 0;
    display: grid;
    gap: 12px;
  }

  .dashboard-campaign-embed-card {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 18px 0 0;
    display: grid;
    gap: 12px;
  }

  .dashboard-embed-block {
    display: grid;
    gap: 6px;
  }

  .dashboard-inline-code,
  .dashboard-embed-textarea {
    width: 100%;
    border: 1px solid rgba(24, 24, 32, 0.14);
    border-radius: 12px;
    background: #f8f6f3;
    color: rgba(24, 24, 32, 0.76);
    font-family: var(--dashboard-font);
    font-size: 10px;
    line-height: 1.5;
    padding: 10px 12px;
  }

  .dashboard-inline-code {
    word-break: break-all;
  }

  .dashboard-embed-textarea {
    resize: vertical;
    min-height: 96px;
  }

  .dashboard-campaign-webhook-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .dashboard-campaign-webhook-title {
    font-size: 20px;
    line-height: 1;
    letter-spacing: -0.03em;
    color: #121218;
    margin: 0 0 6px;
  }

  .dashboard-campaign-webhook-copy {
    font-size: 12px;
    line-height: 1.5;
    color: rgba(24, 24, 32, 0.54);
    margin: 0;
    max-width: 620px;
  }

  .dashboard-settings-shell {
    width: 100%;
    display: grid;
    gap: 22px;
  }

  .dashboard-settings-card {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    padding: 18px 0 0;
    width: 100%;
  }

  .dashboard-settings-shell > .dashboard-settings-card:first-child {
    border-top: none;
    padding-top: 0;
  }

  .dashboard-settings-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .dashboard-settings-title {
    font-size: 20px;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: #121218;
    margin: 0 0 4px;
  }

  .dashboard-settings-copy {
    font-size: 13px;
    line-height: 1.6;
    color: rgba(24, 24, 32, 0.54);
    margin: 0 0 14px;
    max-width: 560px;
  }

  .dashboard-settings-pill {
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.72);
    color: rgba(24, 24, 32, 0.56);
    padding: 5px 9px;
    font-size: 11px;
    font-weight: 700;
    white-space: nowrap;
  }

  .dashboard-settings-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dashboard-settings-item {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 11px 12px;
  }

  .dashboard-settings-profile-item {
    grid-column: span 2;
  }

  .dashboard-settings-profile-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .dashboard-settings-label {
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: rgba(24, 24, 32, 0.34);
    margin: 0 0 6px;
    font-family: var(--dashboard-font);
  }

  .dashboard-settings-value {
    font-size: 14px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.02em;
    margin: 0;
  }

  .dashboard-settings-subvalue {
    margin: 4px 0 0;
    font-size: 11px;
    color: rgba(24, 24, 32, 0.42);
  }

  .dashboard-settings-alert {
    border-radius: 14px;
    padding: 10px 12px;
    font-size: 12px;
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
    gap: 10px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 10px 12px;
    margin-bottom: 14px;
  }

  .dashboard-secret-value {
    margin: 4px 0 0;
    font-size: 12px;
    color: #14141b;
    font-family: var(--dashboard-font);
    word-break: break-all;
  }

  .dashboard-webhook-form {
    display: grid;
    gap: 10px;
    margin-bottom: 16px;
  }

  .dashboard-webhook-form-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .dashboard-webhook-field {
    display: grid;
    gap: 6px;
  }

  .dashboard-brand-color-field {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
  }

  .dashboard-brand-color-chip {
    width: 42px;
    height: 42px;
    border: 1.5px solid rgba(24, 24, 32, 0.14);
    border-radius: 10px;
    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.65), 0 6px 16px rgba(0, 0, 0, 0.08);
  }

  .dashboard-brand-color-composer {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 8px;
    display: grid;
    gap: 6px;
  }

  .dashboard-brand-slider-row {
    display: grid;
    grid-template-columns: 68px minmax(0, 1fr);
    align-items: center;
    gap: 8px;
  }

  .dashboard-brand-slider-row span {
    font-size: 11px;
    font-weight: 700;
    color: rgba(24, 24, 32, 0.45);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-family: var(--dashboard-font);
  }

  .dashboard-brand-slider {
    appearance: none;
    width: 100%;
    height: 8px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    outline: none;
  }

  .dashboard-brand-slider::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    background: #14141b;
    cursor: pointer;
  }

  .dashboard-brand-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.28);
    background: #14141b;
    cursor: pointer;
  }

  .dashboard-brand-slider::-moz-range-track {
    height: 8px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.12);
  }

  .dashboard-brand-logo-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .dashboard-brand-logo-input {
    display: none;
  }

  .dashboard-brand-upload-progress {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(24, 24, 32, 0.08);
    overflow: hidden;
    border: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-brand-upload-fill {
    height: 100%;
    background: var(--brand);
    transition: width 0.2s ease;
  }

  .dashboard-brand-preview {
    display: flex;
    align-items: center;
    gap: 10px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 10px 12px;
  }

  .dashboard-brand-preview-logo {
    width: 42px;
    height: 42px;
    border-radius: 10px;
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
    font-size: 13px;
    font-weight: 800;
    color: #14141b;
  }

  .dashboard-brand-preview-url {
    margin: 4px 0 0;
    font-size: 11px;
    color: rgba(24, 24, 32, 0.5);
    word-break: break-word;
  }

  .dashboard-brand-preview-colors {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dashboard-brand-preview-colors span {
    width: 20px;
    height: 20px;
    border-radius: 999px;
    border: 1px solid rgba(24, 24, 32, 0.1);
  }

  .dashboard-webhook-input {
    width: 100%;
    min-height: 42px;
    border-radius: 12px;
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: rgba(255, 255, 255, 0.86);
    padding: 0 12px;
    font-size: 13px;
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
    gap: 10px;
  }

  .dashboard-webhook-event-option {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 10px 12px;
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
    font-size: 13px;
    color: #14141b;
  }

  .dashboard-webhook-event-option small {
    font-size: 11px;
    line-height: 1.5;
    color: rgba(24, 24, 32, 0.5);
  }

  .dashboard-webhook-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .dashboard-secondary-action {
    background: rgba(255, 255, 255, 0.8);
    border: 1px solid rgba(24, 24, 32, 0.12);
    color: #14141b;
    box-shadow: none;
  }

  .dashboard-secondary-action:hover:not(:disabled) {
    background: #faf8f6;
  }

  .dashboard-webhook-list {
    display: grid;
    gap: 10px;
  }

  .dashboard-signature-card {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 12px 14px;
    margin-bottom: 16px;
  }

  .dashboard-signature-copy {
    max-width: none;
    margin-bottom: 0;
  }

  .dashboard-signature-copy code {
    font-size: 11px;
    padding: 2px 6px;
    border-radius: 999px;
    background: #faf8f6;
    color: #14141b;
    font-family: var(--dashboard-font);
  }

  .dashboard-empty-state {
    border: 1px dashed rgba(24, 24, 32, 0.16);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.72);
    padding: 16px;
    color: rgba(24, 24, 32, 0.5);
    font-size: 13px;
  }

  .dashboard-webhook-card {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    padding: 14px 0 0;
    display: grid;
    gap: 10px;
  }

  .dashboard-webhook-card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  }

  .dashboard-webhook-card-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .dashboard-webhook-url {
    margin: 0;
    font-size: 13px;
    font-weight: 800;
    color: #14141b;
    word-break: break-all;
  }

  .dashboard-webhook-meta {
    margin: 6px 0 0;
    font-size: 12px;
    color: rgba(24, 24, 32, 0.48);
  }

  .dashboard-webhook-tag-row {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .dashboard-webhook-tag {
    border-radius: 999px;
    background: #faf8f6;
    color: rgba(24, 24, 32, 0.64);
    padding: 6px 9px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-family: var(--dashboard-font);
  }

  .dashboard-webhook-deliveries {
    display: grid;
    gap: 6px;
  }

  .dashboard-webhook-delivery-row {
    display: grid;
    grid-template-columns: minmax(0, 1.6fr) 110px 110px;
    gap: 10px;
    font-size: 11px;
    color: rgba(24, 24, 32, 0.62);
    padding-top: 6px;
    border-top: 1px solid rgba(24, 24, 32, 0.06);
    font-family: var(--dashboard-font);
  }

  .dashboard-submissions-summary {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 0 0 14px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .dashboard-submissions-title {
    font-size: 20px;
    line-height: 1;
    letter-spacing: -0.04em;
    color: #121218;
    margin: 0 0 6px;
  }

  .dashboard-submissions-link {
    font-size: 11px;
    color: rgba(24, 24, 32, 0.34);
    font-family: var(--dashboard-font);
  }

  .dashboard-back-btn {
    min-height: 30px;
    padding: 0 8px;
    border: none;
    background: transparent;
    color: rgba(24, 24, 32, 0.42);
    font-size: 12px;
    font-weight: 700;
  }

  .dashboard-back-btn:hover {
    background: #efede9;
    color: #14141b;
  }

  .dashboard-copy-btn {
    min-height: 32px;
    padding: 0 12px;
    font-size: 11px;
    font-weight: 700;
  }

  .dashboard-count-badge {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: #fff3f0;
    color: var(--brand);
    font-size: 11px;
    font-weight: 700;
  }

  .dashboard-metrics-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
  }

  .dashboard-metric-card {
    padding: 12px 0 0;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .dashboard-metric-label {
    font-size: 11px;
    font-weight: 600;
    color: rgba(24, 24, 32, 0.36);
    margin-bottom: 6px;
  }

  .dashboard-metric-value {
    font-size: 22px;
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 900;
    color: #121218;
  }

  .dashboard-campaign-detail-view {
    display: grid;
    background: var(--dashboard-bg);
  }

  .dashboard-detail-back {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border: none;
    background: transparent;
    color: var(--dashboard-text-tertiary);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .dashboard-detail-back:hover {
    color: var(--dashboard-text);
  }

  .dashboard-campaign-detail-head {
    padding: 18px 28px 0;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .dashboard-campaign-detail-summary {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
  }

  .dashboard-campaign-detail-tabs {
    display: flex;
    flex-wrap: wrap;
  }

  .dashboard-campaign-detail-tab {
    padding: 0 16px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text-tertiary);
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: all 100ms;
    margin-bottom: -1px;
    background: none;
    border-left: none;
    border-right: none;
    border-top: none;
    font-family: var(--dashboard-font);
    white-space: nowrap;
  }

  .dashboard-campaign-detail-tab:hover {
    color: var(--dashboard-text);
  }

  .dashboard-campaign-detail-tab:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .dashboard-campaign-detail-tab.is-active {
    color: var(--dashboard-text);
    border-bottom-color: var(--dashboard-text);
  }

  .dashboard-detail-stats {
    display: flex;
    border-bottom: 1px solid var(--dashboard-border);
    flex-shrink: 0;
  }

  .dashboard-detail-stat {
    flex: 1;
    padding: 12px 20px;
    border-right: 1px solid var(--dashboard-border);
  }

  .dashboard-detail-stat:last-child {
    border-right: none;
  }

  .dashboard-detail-stat-label {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    margin-bottom: 3px;
  }

  .dashboard-detail-stat-value {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--dashboard-text);
  }

  .dashboard-detail-empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 40px;
    text-align: center;
    gap: 10px;
  }

  .dashboard-detail-empty-icon {
    width: 44px;
    height: 44px;
    background: var(--dashboard-bg-subtle);
    border: 1px solid var(--dashboard-border);
    border-radius: 10px;
    display: grid;
    place-items: center;
    color: var(--dashboard-text-tertiary);
    margin-bottom: 4px;
  }

  .dashboard-detail-empty-state h3 {
    font-size: 14px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: var(--dashboard-text);
    margin: 0;
  }

  .dashboard-detail-empty-state p {
    font-size: 13px;
    color: var(--dashboard-text-secondary);
    max-width: 260px;
    line-height: 1.6;
    margin: 0;
  }

  .dashboard-detail-review-list {
    display: grid;
  }

  .dashboard-detail-review-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 11px 24px;
    border-bottom: 1px solid var(--dashboard-border);
    transition: background 80ms;
  }

  .dashboard-detail-review-row:hover {
    background: var(--dashboard-bg-subtle);
  }

  .dashboard-detail-review-avatar {
    width: 24px;
    height: 24px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 9px;
    font-weight: 600;
    background: #eff6ff;
    color: #2563eb;
    flex-shrink: 0;
  }

  .dashboard-detail-review-thumb {
    width: 56px;
    height: 32px;
    border-radius: 6px;
    flex-shrink: 0;
    background: var(--dashboard-bg-subtle);
    position: relative;
    overflow: hidden;
    display: grid;
    place-items: center;
  }

  .dashboard-detail-review-thumb video {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #111;
  }

  .dashboard-detail-review-play {
    position: relative;
    z-index: 1;
    width: 18px;
    height: 18px;
    background: rgba(255, 255, 255, 0.9);
    border-radius: 999px;
    display: grid;
    place-items: center;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
    border: none;
    cursor: pointer;
    color: #111;
    font-size: 9px;
    padding-left: 1px;
  }

  .dashboard-detail-review-copy {
    flex: 1;
    min-width: 0;
  }

  .dashboard-detail-review-name {
    margin: 0 0 1px;
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text);
  }

  .dashboard-detail-review-note {
    margin: 0;
    font-size: 12px;
    color: var(--dashboard-text-tertiary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-detail-review-stars {
    display: flex;
    gap: 1px;
    color: #f59e0b;
    font-size: 11px;
    flex-shrink: 0;
  }

  .dashboard-detail-review-stars span {
    color: #e8e8e8;
  }

  .dashboard-detail-review-date {
    font-size: 11px;
    color: var(--dashboard-text-tertiary);
    flex-shrink: 0;
  }

  .dashboard-detail-review-actions {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .dashboard-detail-sections {
    display: grid;
  }

  .dashboard-detail-section {
    padding: 24px 28px;
    border-bottom: 1px solid var(--dashboard-border);
    display: grid;
    gap: 14px;
  }

  .dashboard-detail-section:last-child {
    border-bottom: none;
  }

  .dashboard-detail-option-block {
    border: 1px solid var(--dashboard-border);
    border-radius: 10px;
    overflow: hidden;
  }

  .dashboard-detail-option-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 13px 15px;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .dashboard-detail-option-row:last-child {
    border-bottom: none;
  }

  .dashboard-detail-option-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--dashboard-text);
    margin: 0 0 4px;
  }

  .dashboard-detail-option-copy {
    font-size: 12px;
    color: var(--dashboard-text-tertiary);
    margin: 0;
    line-height: 1.45;
  }

  .dashboard-reviews-shell {
    overflow: visible;
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
  }

  .dashboard-reviews-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 0 12px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .dashboard-reviews-title {
    font-size: 14px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.03em;
  }

  .dashboard-review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, 200px);
    gap: 12px;
    padding: 14px 0 0;
    align-items: start;
    justify-content: start;
  }

  .dashboard-review-card {
    overflow: hidden;
    border: 1px solid var(--dashboard-border);
    border-radius: 10px;
    background: var(--dashboard-bg-raised);
    display: flex;
    flex-direction: column;
    min-height: 100%;
    transition: border-color 0.2s ease;
  }

  .dashboard-review-card:hover {
    border-color: var(--dashboard-border-strong);
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
    object-fit: cover;
    background: #09090c;
  }

  .dashboard-review-badge {
    position: absolute;
    top: 8px;
    left: 8px;
    display: inline-flex;
    align-items: center;
    min-height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    font-size: 10px;
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
    width: 36px;
    height: 36px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.14);
    border: 2px solid rgba(255, 255, 255, 0.25);
    color: #ffffff;
    font-size: 14px;
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
    right: 6px;
    bottom: 6px;
    min-height: 18px;
    padding: 0 6px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.48);
    color: #ffffff;
    font-size: 8px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    font-family: var(--dashboard-font);
  }

  .dashboard-review-body {
    padding: 8px 10px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    flex: 1;
  }

  .dashboard-review-name {
    font-size: 12px;
    font-weight: 800;
    color: #14141b;
    letter-spacing: -0.01em;
    margin-bottom: 2px;
  }

  .dashboard-review-email {
    font-size: 10px;
    color: rgba(24, 24, 32, 0.34);
    margin-bottom: 6px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-family: var(--dashboard-font);
  }

  .dashboard-review-stars {
    font-size: 10px;
    letter-spacing: 0.03em;
    color: var(--brand);
    margin-bottom: 4px;
  }

  .dashboard-review-stars-muted {
    color: rgba(24, 24, 32, 0.14);
  }

  .dashboard-review-note {
    font-size: 11px;
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
    gap: 6px;
    padding: 8px 12px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    background: transparent;
    flex-wrap: wrap;
  }

  .dashboard-inline-action {
    min-height: 28px;
    padding: 0 10px;
    font-size: 11px;
  }

  .dashboard-review-status {
    min-height: 26px;
    padding: 0 10px;
    font-size: 10px;
  }

  .dashboard-inline-action:disabled {
    opacity: 0.65;
    cursor: default;
  }

  .dashboard-empty-state {
    border: none;
    background: transparent;
    padding: 16px;
    color: var(--dashboard-text-secondary);
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
    padding: 8px 6px;
    text-align: left;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    font-size: 12px;
  }

  .dashboard-table th {
    font-size: 9px;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: rgba(24, 24, 32, 0.34);
    font-weight: 700;
    font-family: var(--dashboard-font);
  }

  .dashboard-table-id {
    font-family: var(--dashboard-font);
    color: rgba(24, 24, 32, 0.42);
    font-size: 10px;
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
    min-height: 24px;
    padding: 0 8px;
    border-radius: 999px;
    background: #f6f4ef;
    color: rgba(24, 24, 32, 0.58);
    font-size: 10px;
    font-weight: 700;
  }

  .dashboard-inline-link {
    min-height: 28px;
    padding: 0 10px;
    font-size: 11px;
  }

  .dashboard-submission-detail-view {
    display: grid;
    background: var(--dashboard-bg);
  }

  .dashboard-submission-detail-head {
    padding: 18px 28px 16px;
    border-bottom: 1px solid var(--dashboard-border);
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
  }

  .dashboard-submission-detail-head-copy {
    min-width: 0;
  }

  .dashboard-submission-detail-head-meta {
    display: grid;
    justify-items: end;
    gap: 6px;
    min-width: 0;
  }

  .dashboard-detail-review-stars-static {
    flex-wrap: nowrap;
  }

  .dashboard-submission-detail-head-note {
    margin: 0;
    max-width: 360px;
    text-align: right;
    font-size: 12px;
    line-height: 1.5;
    color: var(--dashboard-text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dashboard-submission-stage {
    display: grid;
    grid-template-columns: minmax(0, 440px) minmax(280px, 1fr);
    gap: 28px;
    align-items: start;
  }

  .dashboard-submission-detail-player {
    width: 100%;
    border-radius: 12px;
    overflow: hidden;
    background: #09090c;
    aspect-ratio: 4 / 5;
  }

  .dashboard-submission-detail-player video {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
    background: #09090c;
  }

  .dashboard-submission-facts {
    display: grid;
    border-top: 1px solid var(--dashboard-border);
  }

  .dashboard-submission-fact-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 10px 0;
    border-bottom: 1px solid var(--dashboard-border);
  }

  .dashboard-submission-fact-row span {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dashboard-text-tertiary);
  }

  .dashboard-submission-fact-row strong {
    font-size: 13px;
    font-weight: 600;
    color: var(--dashboard-text);
    text-align: right;
    word-break: break-word;
    max-width: 62%;
  }

  .dashboard-submission-answers {
    display: grid;
    gap: 14px;
  }

  .dashboard-submission-answer-row {
    display: grid;
    gap: 4px;
  }

  .dashboard-submission-answer-question {
    margin: 0;
    font-size: 12px;
    font-weight: 600;
    color: var(--dashboard-text);
  }

  .dashboard-submission-answer-copy,
  .dashboard-submission-ai-copy {
    margin: 0;
    font-size: 12px;
    line-height: 1.65;
    color: rgba(24, 24, 32, 0.76);
    white-space: pre-wrap;
    word-break: break-word;
  }

  @media (max-width: 960px) {
    .dashboard-shell.is-embedded .dashboard-main {
      margin-left: 0;
    }

    .dashboard-sidebar {
      position: static;
      width: auto;
      border-right: none;
      border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    }

    .dashboard-main {
      margin-left: 0;
    }

    .dashboard-content {
      padding: 14px;
      gap: 18px;
    }

    .dashboard-flat-topbar {
      height: auto;
      min-height: 48px;
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .dashboard-section-topbar {
      height: auto;
      min-height: 48px;
      flex-wrap: wrap;
      align-items: flex-start;
    }

    .dashboard-flat-topbar-spacer {
      display: none;
    }

    .dashboard-section-topbar-spacer {
      display: none;
    }

    .dashboard-flat-topbar-note {
      white-space: normal;
      order: 2;
      width: 100%;
    }

    .dashboard-section-btn {
      width: auto;
    }

    .dashboard-flat-stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .dashboard-page-header,
    .dashboard-section-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-flat-form-section-head,
    .dashboard-flat-section-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-campaign-row {
      grid-template-columns: 1fr;
    }

    .dashboard-campaign-row {
      align-items: flex-start;
    }

    .dashboard-campaign-actions {
      justify-content: flex-start;
    }

    .dashboard-campaign-list-row {
      grid-template-columns: 44px minmax(0, 1fr);
      align-items: flex-start;
    }

    .dashboard-campaign-list-metrics,
    .dashboard-campaign-list-actions,
    .dashboard-campaign-list-badge {
      grid-column: 2;
      justify-content: flex-start;
      flex-wrap: wrap;
    }

    .dashboard-campaign-list-metrics {
      gap: 12px;
    }

    .dashboard-campaign-list-progress {
      width: min(200px, 100%);
    }

    .dashboard-review-grid {
      grid-template-columns: repeat(auto-fill, 200px);
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

    .dashboard-campaign-detail-summary,
    .dashboard-submission-detail-head,
    .dashboard-detail-option-row,
    .dashboard-detail-review-row {
      flex-wrap: wrap;
    }

    .dashboard-detail-stats {
      flex-direction: column;
    }

    .dashboard-detail-stat {
      border-right: none;
      border-bottom: 1px solid var(--dashboard-border);
    }

    .dashboard-detail-stat:last-child {
      border-bottom: none;
    }

    .dashboard-submission-stage {
      grid-template-columns: 1fr;
      gap: 18px;
    }

    .dashboard-submission-detail-head-meta {
      justify-items: start;
    }

    .dashboard-submission-detail-head-note {
      max-width: none;
      text-align: left;
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }
  }

  @media (max-width: 720px) {
    .dashboard-brand,
    .dashboard-profile-card,
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

    .dashboard-flat-topbar {
      padding: 10px 12px;
    }

    .dashboard-section-topbar {
      padding: 10px 12px;
    }

    .dashboard-flat-topbar-note {
      width: 100%;
    }

    .dashboard-flat-stats {
      grid-template-columns: 1fr;
    }

    .dashboard-flat-stat-cell {
      border-right: none;
      border-bottom: 1px solid var(--dashboard-border);
    }

    .dashboard-flat-stat-cell:last-child {
      border-bottom: none;
    }

    .dashboard-flat-section-head {
      padding: 10px 12px;
    }

    .dashboard-page-header-actions {
      width: 100%;
    }

    .dashboard-flat-workspace {
      padding: 14px 12px 16px;
    }

    .dashboard-campaign-list-row {
      grid-template-columns: 1fr;
      padding: 12px;
    }

    .dashboard-campaign-list-icon,
    .dashboard-campaign-list-metrics,
    .dashboard-campaign-list-actions,
    .dashboard-campaign-list-badge {
      grid-column: auto;
    }

    .dashboard-campaign-list-icon {
      margin-bottom: -4px;
    }

    .dashboard-campaign-list-metric {
      text-align: left;
    }

    .dashboard-campaign-builder-inner,
    .dashboard-detail-section,
    .dashboard-campaign-detail-head {
      padding-left: 14px;
      padding-right: 14px;
    }

    .dashboard-detail-review-row {
      padding: 12px 14px;
      align-items: flex-start;
    }

    .dashboard-detail-review-actions {
      width: 100%;
    }

    .dashboard-secondary-action {
      width: 100%;
    }

    .dashboard-campaign-row {
      padding-top: 12px;
      padding-bottom: 12px;
    }

    .dashboard-campaign-actions {
      gap: 8px 12px;
    }

    .dashboard-submissions-summary {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-campaign-webhook-card,
    .dashboard-campaign-embed-card {
      padding: 14px;
    }

    .dashboard-metrics-grid,
    .dashboard-review-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-submission-detail-frame {
      padding: 14px;
    }

    .dashboard-submission-detail-grid {
      grid-template-columns: 1fr;
    }

    .dashboard-review-grid {
      grid-template-columns: 1fr;
      padding: 14px;
    }
  }
`;

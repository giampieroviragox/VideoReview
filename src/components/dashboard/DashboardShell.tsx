"use client";

import { UserButton } from "@clerk/nextjs";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
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

export default function DashboardShell({
  viewerName,
  workspaceName,
  campaignRuntimeReady,
  campaigns,
}: DashboardShellProps) {
  const router = useRouter();
  const [campaignsState, setCampaignsState] = useState(campaigns);
  const [activeSection, setActiveSection] = useState<"campaigns" | "settings">("campaigns");
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

  function openCampaignsSection() {
    setActiveSection("campaigns");
    setShowBuilder(false);
    setSelectedCampaignId(null);
  }

  function openSettingsSection() {
    setActiveSection("settings");
    setShowBuilder(false);
    setSelectedCampaignId(null);
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
                    Cron dispatcher runs every minute
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
    min-height: 50px;
    padding: 0 22px;
    border-radius: 999px;
    border: none;
    background: var(--brand);
    color: #fff;
    font-family: "Figtree", sans-serif;
    font-size: 16px;
    font-weight: 800;
    box-shadow: 0 10px 24px rgba(255, 92, 53, 0.2);
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

  .dashboard-webhook-event-option {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 16px;
    background: #ffffff;
    padding: 12px 14px;
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
    object-fit: cover;
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
    .dashboard-webhook-card-head {
      flex-direction: column;
      align-items: flex-start;
    }

    .dashboard-webhook-form-grid,
    .dashboard-webhook-events {
      grid-template-columns: 1fr;
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

"use client";

import { useEffect, useMemo, useState } from "react";

type WallConfig = {
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

type Review = {
  id: string;
  campaignId: string;
  campaignName: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  quote: string;
  durationSeconds: number | null;
  createdAt: string;
};

type CampaignLite = {
  id: string;
  name: string;
  approvedCount: number;
};

type WallOfLoveDashboardProps = {
  wall: WallConfig;
  reviews: Review[];
  campaigns: CampaignLite[];
  publicPath: string;
};

type ToastState = {
  tone: "ok" | "warn";
  text: string;
} | null;

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function sanitizeSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

export default function WallOfLoveDashboard({
  wall,
  reviews,
  campaigns,
  publicPath,
}: WallOfLoveDashboardProps) {
  const allCampaignIds = useMemo(() => campaigns.map((campaign) => campaign.id), [campaigns]);
  const defaultCampaignIds =
    wall.includeAllCampaigns || wall.selectedCampaignIds.length === 0
      ? allCampaignIds
      : allCampaignIds.filter((id) => wall.selectedCampaignIds.includes(id));
  const defaultIncludedIds = wall.includeAllApprovedSubmissions
    ? reviews.map((review) => review.id)
    : reviews
        .map((review) => review.id)
        .filter((id) => wall.selectedSubmissionIds.includes(id));

  const [title, setTitle] = useState(wall.title);
  const [subtitle, setSubtitle] = useState(wall.subtitle || "");
  const [slug, setSlug] = useState(wall.slug);
  const [isPublished, setIsPublished] = useState(wall.isPublished);
  const [manualSelection, setManualSelection] = useState(!wall.includeAllApprovedSubmissions);
  const [selectedCampaignIds, setSelectedCampaignIds] = useState<Set<string>>(
    new Set(defaultCampaignIds)
  );
  const [includedSubmissionIds, setIncludedSubmissionIds] = useState<Set<string>>(
    new Set(defaultIncludedIds)
  );
  const [minStars, setMinStars] = useState(0);
  const [format, setFormat] = useState<"all" | "video" | "text">("all");
  const [sort, setSort] = useState<"newest" | "oldest" | "stars-high" | "stars-low">("newest");
  const [viewMode, setViewMode] = useState<"grid-3" | "grid-2" | "list">("grid-3");
  const [setupSection, setSetupSection] = useState<"general" | "visibility" | "curation">(
    "general"
  );
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const publicUrl = origin ? `${origin}${publicPath}` : publicPath;

  const visibleReviews = useMemo(() => {
    const filtered = reviews.filter((review) => {
      if (!selectedCampaignIds.has(review.campaignId)) return false;
      if (review.rating < minStars) return false;
      if (format !== "all" && format !== "video") return false;
      return true;
    });

    return filtered.sort((a, b) => {
      if (sort === "stars-high") return b.rating - a.rating;
      if (sort === "stars-low") return a.rating - b.rating;
      if (sort === "oldest") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [reviews, selectedCampaignIds, minStars, format, sort]);

  const selectedCampaignReviews = useMemo(
    () => reviews.filter((review) => selectedCampaignIds.has(review.campaignId)),
    [reviews, selectedCampaignIds]
  );

  const includedCount = useMemo(() => {
    if (!manualSelection) {
      return selectedCampaignReviews.length;
    }

    return selectedCampaignReviews.filter((review) => includedSubmissionIds.has(review.id)).length;
  }, [manualSelection, selectedCampaignReviews, includedSubmissionIds]);

  const avgIncludedRating = useMemo(() => {
    const set = manualSelection
      ? selectedCampaignReviews.filter((review) => includedSubmissionIds.has(review.id))
      : selectedCampaignReviews;

    if (set.length === 0) return 0;
    return set.reduce((sum, review) => sum + review.rating, 0) / set.length;
  }, [manualSelection, selectedCampaignReviews, includedSubmissionIds]);

  const notify = (text: string, tone: "ok" | "warn" = "ok") => {
    setToast({ text, tone });
    window.setTimeout(() => setToast(null), 2400);
  };

  const toggleCampaign = (campaignId: string) => {
    setSelectedCampaignIds((prev) => {
      const next = new Set(prev);
      if (next.has(campaignId)) {
        next.delete(campaignId);
      } else {
        next.add(campaignId);
      }
      return next;
    });
  };

  const toggleInclude = (reviewId: string) => {
    if (!manualSelection) {
      notify("Switch to manual mode to choose specific videos.", "warn");
      return;
    }

    setIncludedSubmissionIds((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) {
        next.delete(reviewId);
      } else {
        next.add(reviewId);
      }
      return next;
    });
  };

  const toggleAllVisible = () => {
    if (!manualSelection) {
      notify("Manual mode is required for bulk curation.", "warn");
      return;
    }

    const allIncluded = visibleReviews.every((review) => includedSubmissionIds.has(review.id));
    setIncludedSubmissionIds((prev) => {
      const next = new Set(prev);
      visibleReviews.forEach((review) => {
        if (allIncluded) {
          next.delete(review.id);
        } else {
          next.add(review.id);
        }
      });
      return next;
    });
  };

  const copyPublicLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      notify("Public link copied.");
    } catch {
      notify("Unable to copy link on this browser.", "warn");
    }
  };

  const saveWall = async () => {
    if (selectedCampaignIds.size === 0) {
      notify("Select at least one campaign.", "warn");
      return;
    }

    const cleanSlug = sanitizeSlug(slug);
    if (!cleanSlug) {
      notify("Slug is required.", "warn");
      return;
    }

    setSaving(true);
    try {
      const includeAllCampaigns = selectedCampaignIds.size === allCampaignIds.length;
      const includedForPayload = manualSelection
        ? reviews
            .filter((review) => selectedCampaignIds.has(review.campaignId))
            .filter((review) => includedSubmissionIds.has(review.id))
            .map((review) => review.id)
        : [];

      const response = await fetch("/api/wall-of-love", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          subtitle: subtitle.trim(),
          slug: cleanSlug,
          isPublished,
          includeAllCampaigns,
          selectedCampaignIds: includeAllCampaigns ? [] : Array.from(selectedCampaignIds),
          includeAllApprovedSubmissions: !manualSelection,
          selectedSubmissionIds: includedForPayload,
        }),
      });

      if (!response.ok) {
        throw new Error("save_failed");
      }

      const payload = (await response.json()) as { wall?: { slug?: string } };
      if (payload.wall?.slug) {
        setSlug(payload.wall.slug);
      } else {
        setSlug(cleanSlug);
      }

      notify("Wall of Love saved.");
    } catch {
      notify("Failed to save. Try again.", "warn");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="wold-shell">
      <div className="wold-topbar">
        <span className="dashboard-section-topbar-title">Wall of Love</span>
        <div className="dashboard-section-topbar-spacer" />
        <div className="wold-topbar-actions">
          <button
            type="button"
            className="dashboard-section-btn dashboard-section-btn-secondary"
            onClick={copyPublicLink}
          >
            Copy link
          </button>
          <a
            href={publicPath}
            target="_blank"
            rel="noreferrer"
            className={`dashboard-section-btn ${
              isPublished ? "dashboard-section-btn-secondary" : "dashboard-section-btn-muted"
            }`}
            aria-disabled={!isPublished}
          >
            Open public wall
          </a>
          <button
            type="button"
            className="dashboard-section-btn dashboard-section-btn-primary"
            onClick={saveWall}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save wall"}
          </button>
        </div>
      </div>

      <div className="wold-layout">
        <aside className="wold-setup-nav">
          <button
            type="button"
            className={`wold-setup-nav-item ${setupSection === "general" ? "is-active" : ""}`}
            onClick={() => setSetupSection("general")}
          >
            General
          </button>
          <button
            type="button"
            className={`wold-setup-nav-item ${setupSection === "visibility" ? "is-active" : ""}`}
            onClick={() => setSetupSection("visibility")}
          >
            Visibility
          </button>
          <button
            type="button"
            className={`wold-setup-nav-item ${setupSection === "curation" ? "is-active" : ""}`}
            onClick={() => setSetupSection("curation")}
          >
            Curation
          </button>
        </aside>

        <section className="wold-setup-main">
          {setupSection === "general" && (
            <div className="wold-setup-section">
              <p className="wold-card-title">General settings</p>
              <p className="wold-card-sub">Edit copy and URL slug for your wall.</p>
              <div className="wold-fields">
                <label className="wold-field">
                  <span>Title</span>
                  <input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    maxLength={120}
                  />
                </label>
                <label className="wold-field">
                  <span>Slug</span>
                  <input
                    value={slug}
                    onChange={(event) => setSlug(sanitizeSlug(event.target.value))}
                    maxLength={80}
                  />
                </label>
                <label className="wold-field wold-field-wide">
                  <span>Subtitle</span>
                  <input
                    value={subtitle}
                    onChange={(event) => setSubtitle(event.target.value)}
                    maxLength={240}
                  />
                </label>
              </div>
            </div>
          )}

          {setupSection === "visibility" && (
            <div className="wold-setup-section">
              <div className="wold-card-head">
                <div>
                  <p className="wold-card-title">Visibility</p>
                  <p className="wold-card-sub">Publish or keep your wall as draft.</p>
                </div>
                <button
                  type="button"
                  className={`wold-switch ${isPublished ? "is-on" : ""}`}
                  onClick={() => setIsPublished((prev) => !prev)}
                  aria-label="Toggle publish wall"
                />
              </div>
              <div className="wold-url">{publicUrl}</div>
              <p className="wold-meta">
                Status: <strong>{isPublished ? "Published" : "Draft"}</strong>
              </p>
              <p className="wold-meta">
                Included reviews: <strong>{includedCount}</strong>
              </p>
              <p className="wold-meta">
                Avg rating: <strong>{avgIncludedRating.toFixed(1)}★</strong>
              </p>
            </div>
          )}

          {setupSection === "curation" && (
            <div className="wold-curation">
              <div className="wold-curation-head">
                <div>
                  <p className="wold-card-title">Review curation</p>
                  <p className="wold-card-sub">
                    Choose if videos are selected manually or automatically.
                  </p>
                </div>
                <div className="wold-mode-row">
                  <button
                    type="button"
                    className={`wold-mode ${manualSelection ? "is-active" : ""}`}
                    onClick={() => setManualSelection(true)}
                  >
                    Manual selection
                  </button>
                  <button
                    type="button"
                    className={`wold-mode ${!manualSelection ? "is-active" : ""}`}
                    onClick={() => setManualSelection(false)}
                  >
                    Auto include approved
                  </button>
                </div>
              </div>

              <div className="wold-curation-layout">
                <aside className="wold-filters">
                  <div className="wold-filter-section">
                    <p className="wold-filter-title">Campaigns</p>
                    <div className="wold-filter-list">
                      {campaigns.map((campaign) => (
                        <label key={campaign.id} className="wold-check-row">
                          <input
                            type="checkbox"
                            checked={selectedCampaignIds.has(campaign.id)}
                            onChange={() => toggleCampaign(campaign.id)}
                          />
                          <span>{campaign.name}</span>
                          <em>{campaign.approvedCount}</em>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="wold-filter-section">
                    <p className="wold-filter-title">Min stars</p>
                    <div className="wold-stars-row">
                      {[0, 5, 4, 3].map((starValue) => (
                        <button
                          key={starValue}
                          type="button"
                          className={`wold-chip ${minStars === starValue ? "is-on" : ""}`}
                          onClick={() => setMinStars(starValue)}
                        >
                          {starValue === 0 ? "All" : `${starValue}+`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="wold-filter-section">
                    <p className="wold-filter-title">Sort</p>
                    <select
                      value={sort}
                      onChange={(event) =>
                        setSort(
                          event.target.value as "newest" | "oldest" | "stars-high" | "stars-low"
                        )
                      }
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="stars-high">Highest rated</option>
                      <option value="stars-low">Lowest rated</option>
                    </select>
                  </div>
                  <div className="wold-filter-section">
                    <p className="wold-filter-title">Format</p>
                    <div className="wold-stars-row">
                      <button
                        type="button"
                        className={`wold-chip ${format === "all" ? "is-on" : ""}`}
                        onClick={() => setFormat("all")}
                      >
                        All
                      </button>
                      <button
                        type="button"
                        className={`wold-chip ${format === "video" ? "is-on" : ""}`}
                        onClick={() => setFormat("video")}
                      >
                        Video
                      </button>
                      <button
                        type="button"
                        className={`wold-chip ${format === "text" ? "is-on" : ""}`}
                        onClick={() => setFormat("text")}
                      >
                        Text
                      </button>
                    </div>
                  </div>
                </aside>

                <div className="wold-content">
                  <div className="wold-stats">
                    <div className="wold-stat">
                      <span>Showing</span>
                      <strong>{visibleReviews.length}</strong>
                    </div>
                    <div className="wold-stat">
                      <span>Total approved</span>
                      <strong>{reviews.length}</strong>
                    </div>
                    <div className="wold-stat">
                      <span>Included</span>
                      <strong>{includedCount}</strong>
                    </div>
                  </div>

                  <div className="wold-toolbar">
                    <div className="wold-view-toggle">
                      <button
                        type="button"
                        className={viewMode === "grid-3" ? "is-on" : ""}
                        onClick={() => setViewMode("grid-3")}
                      >
                        Grid 3
                      </button>
                      <button
                        type="button"
                        className={viewMode === "grid-2" ? "is-on" : ""}
                        onClick={() => setViewMode("grid-2")}
                      >
                        Grid 2
                      </button>
                      <button
                        type="button"
                        className={viewMode === "list" ? "is-on" : ""}
                        onClick={() => setViewMode("list")}
                      >
                        List
                      </button>
                    </div>
                    <button
                      type="button"
                      className="dashboard-section-btn dashboard-section-btn-secondary"
                      onClick={toggleAllVisible}
                    >
                      Select all visible
                    </button>
                  </div>

                  {visibleReviews.length === 0 ? (
                    <div className="wold-empty">No reviews match the current filters.</div>
                  ) : (
                    <div className={`wold-grid ${viewMode}`}>
                      {visibleReviews.map((review) => {
                        const included = manualSelection ? includedSubmissionIds.has(review.id) : true;
                        return (
                          <article
                            key={review.id}
                            className={`wold-review-card ${included ? "" : "is-excluded"}`}
                          >
                            <div className="wold-review-head">
                              <div className="wold-stars">
                                {Array.from({ length: review.rating }, () => "★")}
                              </div>
                              <button
                                type="button"
                                className={`wold-include-btn ${included ? "is-included" : ""}`}
                                onClick={() => toggleInclude(review.id)}
                              >
                                {included ? "Included" : "Excluded"}
                              </button>
                            </div>
                            <p className="wold-quote">&ldquo;{review.quote}&rdquo;</p>
                            <div className="wold-review-foot">
                              <div className="wold-avatar">{initials(review.reviewerName)}</div>
                              <div>
                                <p className="wold-name">{review.reviewerName}</p>
                                <p className="wold-role">{review.campaignName}</p>
                              </div>
                              <div className="wold-meta-right">
                                <span>
                                  {formatDuration(review.durationSeconds) || formatDate(review.createdAt)}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {toast && <div className={`wold-toast ${toast.tone === "warn" ? "is-warn" : ""}`}>{toast.text}</div>}

      <style>{`
        .wold-shell {
          margin-left: 232px;
          min-height: 100vh;
          background: #fff;
          color: #0a0a0a;
          font-family: "Geist", "Inter", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }

        .wold-topbar {
          height: 48px;
          flex-shrink: 0;
          border-bottom: 1px solid #e8e8e8;
          padding: 0 20px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
        }

        .dashboard-section-topbar-title {
          font-size: 14px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: #0a0a0a;
          white-space: nowrap;
        }

        .dashboard-section-topbar-spacer {
          flex: 1;
        }

        .wold-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
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
          color: #0a0a0a;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          white-space: nowrap;
          text-decoration: none;
        }

        .dashboard-section-btn-primary {
          background: #0a0a0a;
          color: #fff;
          border-color: #0a0a0a;
        }

        .dashboard-section-btn-secondary {
          background: #fff;
          color: #0a0a0a;
          border-color: #e8e8e8;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .dashboard-section-btn-primary:hover {
          background: #262626;
          border-color: #262626;
        }

        .dashboard-section-btn-secondary:hover {
          background: #f7f7f7;
          border-color: #d0d0d0;
        }

        .dashboard-section-btn-muted {
          background: #f0f0f0;
          border-color: #e8e8e8;
          color: #9a9a9a;
          pointer-events: none;
        }

        .dashboard-section-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wold-layout {
          display: grid;
          grid-template-columns: 220px minmax(0, 1fr);
          gap: 0;
          min-height: calc(100vh - 48px);
          background: #fff;
        }

        .wold-setup-nav {
          border-right: 1px solid #e8e8e8;
          background: #f7f7f7;
          padding: 10px 8px;
          display: grid;
          align-content: start;
          gap: 4px;
        }

        .wold-setup-nav-item {
          width: 100%;
          min-height: 34px;
          border: 1px solid transparent;
          border-radius: 8px;
          background: transparent;
          color: #5c5c5c;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          padding: 0 10px;
          cursor: pointer;
        }

        .wold-setup-nav-item.is-active {
          background: #fff;
          color: #0a0a0a;
          border-color: #e8e8e8;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03);
        }

        .wold-setup-main {
          background: #fff;
          padding: 14px 18px;
        }

        .wold-setup-section {
          max-width: 860px;
        }

        .wold-curation {
          display: grid;
          gap: 12px;
        }

        .wold-curation-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
        }

        .wold-curation-layout {
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          overflow: hidden;
          display: grid;
          grid-template-columns: 290px minmax(0, 1fr);
          min-height: 460px;
        }

        .wold-card-head {
          display: flex;
          justify-content: space-between;
          gap: 10px;
          align-items: flex-start;
          margin-bottom: 12px;
        }

        .wold-card-title {
          margin: 0;
          font-size: 13px;
          font-weight: 600;
          color: #0a0a0a;
        }

        .wold-card-sub {
          margin: 4px 0 0;
          font-size: 12px;
          color: #737373;
        }

        .wold-switch {
          width: 40px;
          height: 22px;
          border-radius: 999px;
          border: 1px solid #d0d0d0;
          background: #f0f0f0;
          cursor: pointer;
          position: relative;
        }

        .wold-switch::after {
          content: "";
          width: 16px;
          height: 16px;
          border-radius: 999px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0,0,0,0.12);
          position: absolute;
          left: 2px;
          top: 2px;
          transition: transform 120ms ease;
        }

        .wold-switch.is-on {
          background: #16a34a;
          border-color: #16a34a;
        }

        .wold-switch.is-on::after {
          transform: translateX(18px);
        }

        .wold-fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }

        .wold-field {
          display: grid;
          gap: 4px;
        }

        .wold-field-wide {
          grid-column: 1 / -1;
        }

        .wold-field span {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9a9a9a;
          font-weight: 600;
        }

        .wold-field input,
        .wold-filters select {
          height: 32px;
          border: 1px solid #e8e8e8;
          border-radius: 6px;
          padding: 0 10px;
          font-size: 13px;
          outline: none;
        }

        .wold-mode-row {
          display: flex;
          gap: 6px;
          margin-top: 10px;
        }

        .wold-mode {
          flex: 1;
          height: 30px;
          border-radius: 6px;
          border: 1px solid #e8e8e8;
          background: #fff;
          color: #525252;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
        }

        .wold-mode.is-active {
          border-color: #0a0a0a;
          color: #0a0a0a;
        }

        .wold-url {
          margin-top: 8px;
          background: #f7f7f7;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 10px;
          font-size: 12px;
          color: #404040;
          word-break: break-all;
        }

        .wold-meta {
          margin: 10px 0 0;
          font-size: 12px;
          color: #737373;
        }

        .wold-filters {
          border-right: 1px solid #e8e8e8;
          background: #f7f7f7;
          padding: 12px;
          display: grid;
          gap: 14px;
          align-content: start;
        }

        .wold-filter-section {
          background: #fff;
          border: 1px solid #e8e8e8;
          border-radius: 8px;
          padding: 10px;
        }

        .wold-filter-title {
          margin: 0 0 8px;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: #9a9a9a;
          font-weight: 600;
        }

        .wold-filter-list {
          display: grid;
          gap: 6px;
        }

        .wold-check-row {
          display: grid;
          grid-template-columns: 14px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: #404040;
        }

        .wold-check-row em {
          font-size: 11px;
          font-style: normal;
          color: #9a9a9a;
        }

        .wold-stars-row {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .wold-chip {
          border: 1px solid #e8e8e8;
          background: #fff;
          border-radius: 999px;
          height: 26px;
          padding: 0 10px;
          font-size: 12px;
          color: #5c5c5c;
          cursor: pointer;
        }

        .wold-chip.is-on {
          background: #0a0a0a;
          border-color: #0a0a0a;
          color: #fff;
        }

        .wold-content {
          padding: 12px;
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .wold-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          overflow: hidden;
        }

        .wold-stat {
          padding: 10px 12px;
          background: #fff;
          border-right: 1px solid #e8e8e8;
          display: grid;
          gap: 3px;
        }

        .wold-stat:last-child {
          border-right: none;
        }

        .wold-stat span {
          font-size: 11px;
          color: #9a9a9a;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
        }

        .wold-stat strong {
          font-size: 24px;
          line-height: 1;
          letter-spacing: -0.02em;
        }

        .wold-toolbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
        }

        .wold-view-toggle {
          display: inline-flex;
          border: 1px solid #e8e8e8;
          border-radius: 7px;
          overflow: hidden;
          background: #f7f7f7;
        }

        .wold-view-toggle button {
          height: 30px;
          border: none;
          border-right: 1px solid #e8e8e8;
          padding: 0 10px;
          background: transparent;
          font-size: 12px;
          color: #5c5c5c;
          cursor: pointer;
        }

        .wold-view-toggle button:last-child {
          border-right: none;
        }

        .wold-view-toggle button.is-on {
          background: #fff;
          color: #0a0a0a;
          font-weight: 600;
        }

        .wold-empty {
          border: 1px dashed #d0d0d0;
          border-radius: 10px;
          min-height: 220px;
          display: grid;
          place-items: center;
          color: #737373;
          font-size: 14px;
        }

        .wold-grid {
          display: grid;
          gap: 10px;
        }

        .wold-grid.grid-3 {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .wold-grid.grid-2 {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .wold-grid.list {
          grid-template-columns: 1fr;
        }

        .wold-review-card {
          border: 1px solid #e8e8e8;
          border-radius: 10px;
          background: #fff;
          padding: 10px;
          display: grid;
          gap: 8px;
        }

        .wold-review-card.is-excluded {
          opacity: 0.5;
        }

        .wold-review-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
        }

        .wold-stars {
          color: #f59e0b;
          font-size: 12px;
          letter-spacing: 1px;
        }

        .wold-include-btn {
          border: 1px solid #fecaca;
          background: #fef2f2;
          color: #b91c1c;
          border-radius: 999px;
          height: 24px;
          padding: 0 9px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
        }

        .wold-include-btn.is-included {
          border-color: #bbf7d0;
          background: #f0fdf4;
          color: #15803d;
        }

        .wold-quote {
          margin: 0;
          font-size: 12px;
          line-height: 1.55;
          color: #525252;
          min-height: 56px;
        }

        .wold-review-foot {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) auto;
          align-items: center;
          gap: 8px;
        }

        .wold-avatar {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          background: #eff6ff;
          color: #2563eb;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          font-weight: 700;
        }

        .wold-name {
          margin: 0;
          font-size: 12px;
          font-weight: 600;
          color: #181818;
        }

        .wold-role {
          margin: 2px 0 0;
          font-size: 11px;
          color: #9a9a9a;
        }

        .wold-meta-right {
          font-size: 11px;
          color: #9a9a9a;
        }

        .wold-toast {
          position: fixed;
          right: 16px;
          bottom: 16px;
          padding: 10px 12px;
          border-radius: 8px;
          background: #0a0a0a;
          color: #fff;
          font-size: 12px;
          z-index: 120;
        }

        .wold-toast.is-warn {
          background: #b45309;
        }

        @media (max-width: 1100px) {
          .wold-shell {
            margin-left: 232px;
          }

          .wold-layout {
            grid-template-columns: 1fr;
          }

          .wold-setup-nav {
            border-right: none;
            border-bottom: 1px solid #e8e8e8;
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
          }

          .wold-setup-nav-item {
            width: auto;
          }

          .wold-curation-layout {
            grid-template-columns: 1fr;
          }

          .wold-filters {
            border-right: none;
            border-bottom: 1px solid #e8e8e8;
          }
        }

        @media (max-width: 960px) {
          .wold-shell {
            margin-left: 0;
          }

          .wold-topbar {
            height: auto;
            min-height: 48px;
            flex-wrap: wrap;
            align-items: flex-start;
          }

          .dashboard-section-topbar-spacer {
            display: none;
          }

          .wold-topbar-actions {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }

          .wold-grid.grid-3,
          .wold-grid.grid-2 {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}

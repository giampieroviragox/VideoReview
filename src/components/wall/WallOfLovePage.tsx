"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";

type WallReview = {
  id: string;
  campaignId: string;
  campaignName: string;
  reviewerName: string;
  reviewerEmail: string;
  rating: number;
  quote: string;
  durationSeconds: number | null;
  createdAt: string;
  isFeatured: boolean;
  videoPath: string;
};

type WallOfLovePageProps = {
  wall: {
    slug: string;
    title: string;
    subtitle: string | null;
  };
  reviews: WallReview[];
};

function formatDuration(seconds: number | null) {
  if (!seconds || seconds <= 0) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${remainder.toString().padStart(2, "0")}`;
}

function initials(name: string) {
  const cleaned = name.trim();
  if (!cleaned) {
    return "U";
  }

  return cleaned
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default function WallOfLovePage({ wall, reviews }: WallOfLovePageProps) {
  const [activeFilter, setActiveFilter] = useState<"all" | "5" | "4" | "featured">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filteredReviews = useMemo(() => {
    if (activeFilter === "all") {
      return reviews;
    }

    if (activeFilter === "featured") {
      return reviews.filter((review) => review.isFeatured);
    }

    const rating = Number(activeFilter);
    return reviews.filter((review) => review.rating === rating);
  }, [activeFilter, reviews]);

  const selectedReview = useMemo(
    () => reviews.find((review) => review.id === selectedId) || null,
    [reviews, selectedId]
  );

  const averageRating = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    return (
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
    );
  }, [reviews]);

  const campaignCount = useMemo(() => {
    return new Set(reviews.map((review) => review.campaignId)).size;
  }, [reviews]);

  return (
    <main className="wol-shell">
      <nav className="landing-nav">
        <div className="wrap">
          <div className="landing-nav-inner">
            <Link href="/" className="landing-nav-logo">
              <Image
                src="/tellr-logo.svg"
                alt="Tellr"
                className="landing-nav-logo-image"
                width={132}
                height={34}
              />
            </Link>
            <div className="landing-nav-actions">
              <Link href="/sign-in" className="landing-nav-signup">
                Try Tellr free &rarr;
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <section className="wol-hero">
        <div className="wol-eyebrow">Wall of Love</div>
        <h1 className="wol-title">{wall.title}</h1>
        <p className="wol-subtitle">
          {wall.subtitle ||
            "These are our customers speaking — unscripted, unedited, unrehearsed."}
        </p>

        <div className="wol-metrics">
          <div className="wol-metric">
            <p className="wol-metric-value">{averageRating.toFixed(1)}</p>
            <p className="wol-metric-label">Average rating</p>
          </div>
          <div className="wol-metric-sep" />
          <div className="wol-metric">
            <p className="wol-metric-value">{reviews.length}</p>
            <p className="wol-metric-label">Video reviews</p>
          </div>
          <div className="wol-metric-sep" />
          <div className="wol-metric">
            <p className="wol-metric-value">{campaignCount}</p>
            <p className="wol-metric-label">Campaigns</p>
          </div>
        </div>
      </section>

      <section className="wol-filters">
        <button
          type="button"
          className={`wol-filter ${activeFilter === "all" ? "active" : ""}`}
          onClick={() => setActiveFilter("all")}
        >
          All reviews
        </button>
        <button
          type="button"
          className={`wol-filter ${activeFilter === "5" ? "active" : ""}`}
          onClick={() => setActiveFilter("5")}
        >
          ★★★★★ 5 stars
        </button>
        <button
          type="button"
          className={`wol-filter ${activeFilter === "4" ? "active" : ""}`}
          onClick={() => setActiveFilter("4")}
        >
          ★★★★ 4 stars
        </button>
        <button
          type="button"
          className={`wol-filter ${activeFilter === "featured" ? "active" : ""}`}
          onClick={() => setActiveFilter("featured")}
        >
          Featured
        </button>
      </section>

      <section className="wol-grid">
        {filteredReviews.length === 0 ? (
          <div className="wol-empty">No reviews available for this filter.</div>
        ) : (
          filteredReviews.map((review) => (
            <article
              key={review.id}
              className={`wol-card ${review.isFeatured ? "is-featured" : ""}`}
              onClick={() => setSelectedId(review.id)}
            >
              <div className="wol-card-video">
                <video src={review.videoPath} muted playsInline preload="metadata" />
                <div className="wol-card-overlay" />
                <div className="wol-card-play">▶</div>
                <div className="wol-card-stars">
                  {"★".repeat(review.rating)}
                  <span>{"★".repeat(5 - review.rating)}</span>
                </div>
                {review.isFeatured && <div className="wol-featured-badge">Featured</div>}
                <div className="wol-duration">
                  {formatDuration(review.durationSeconds) ||
                    new Date(review.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="wol-card-body">
                <p className="wol-quote">&quot;{review.quote}&quot;</p>
                <div className="wol-author">
                  <div className="wol-avatar">{initials(review.reviewerName)}</div>
                  <div>
                    <p className="wol-name">{review.reviewerName}</p>
                    <p className="wol-role">{review.campaignName}</p>
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </section>

      <section className="wol-footer">
        <h2>Want this wall for your brand?</h2>
        <p>Collect and showcase authentic video reviews with Tellr.</p>
        <Link href="/sign-in" className="wol-footer-cta">
          Try Tellr free →
        </Link>
      </section>

      <p className="wol-signature">
        Powered by
        <span className="wol-signature-mark">
          <Image src="/tellr-logo.svg" alt="Tellr" width={78} height={16} />
        </span>
      </p>

      {selectedReview && (
        <div className="wol-lightbox" onClick={() => setSelectedId(null)}>
          <button
            type="button"
            className="wol-lightbox-close"
            onClick={() => setSelectedId(null)}
            aria-label="Close review player"
          >
            ×
          </button>
          <div className="wol-lightbox-card" onClick={(event) => event.stopPropagation()}>
            <div className="wol-lightbox-video">
              <video src={selectedReview.videoPath} controls playsInline autoPlay />
            </div>
            <div className="wol-lightbox-copy">
              <p className="wol-lightbox-stars">
                {"★".repeat(selectedReview.rating)}
                <span>{"★".repeat(5 - selectedReview.rating)}</span>
              </p>
              <p className="wol-lightbox-quote">&quot;{selectedReview.quote}&quot;</p>
              <div className="wol-author">
                <div className="wol-avatar">{initials(selectedReview.reviewerName)}</div>
                <div>
                  <p className="wol-name">{selectedReview.reviewerName}</p>
                  <p className="wol-role">{selectedReview.campaignName}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{wallStyles}</style>
    </main>
  );
}

const wallStyles = `
  .wol-shell {
    --brand: #ff4820;
    --wol-bg: #ffffff;
    --wol-bg-subtle: #f7f7f7;
    --wol-border: #e8e8e8;
    --wol-border-strong: #d0d0d0;
    --wol-text: #0a0a0a;
    --wol-text-secondary: #5c5c5c;
    --wol-text-tertiary: #9a9a9a;
    --wol-font: "Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    min-height: 100vh;
    background: var(--wol-bg);
    color: var(--wol-text);
    padding-top: 60px;
    font-family: var(--wol-font);
  }

  .wol-hero {
    max-width: none;
    margin: 0;
    padding: 40px 32px 22px;
    display: grid;
    gap: 10px;
  }

  .wol-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 0;
    border-radius: 999px;
    border: none;
    background: transparent;
    color: var(--brand);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }

  .wol-title {
    max-width: 780px;
    font-size: clamp(34px, 5vw, 52px);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 600;
  }

  .wol-subtitle {
    max-width: 640px;
    font-size: 15px;
    color: var(--wol-text-secondary);
    line-height: 1.65;
  }

  .wol-metrics {
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 6px;
  }

  .wol-metric {
    display: flex;
    align-items: baseline;
    gap: 8px;
    border: 1px solid var(--wol-border);
    border-radius: 8px;
    background: var(--wol-bg-subtle);
    padding: 8px 10px;
  }

  .wol-metric-value {
    font-size: 20px;
    font-weight: 600;
    line-height: 1;
    letter-spacing: -0.02em;
  }

  .wol-metric-label {
    font-size: 11px;
    color: var(--wol-text-secondary);
    font-weight: 500;
  }

  .wol-metric-sep {
    display: none;
  }

  .wol-filters {
    max-width: none;
    margin: 0 0 14px;
    padding: 0 32px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wol-filter {
    border: 1px solid var(--wol-border);
    background: var(--wol-bg);
    color: var(--wol-text-secondary);
    border-radius: 6px;
    min-height: 30px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .wol-filter:hover {
    border-color: var(--wol-border-strong);
    color: var(--wol-text);
    background: var(--wol-bg-subtle);
  }

  .wol-filter.active {
    background: var(--brand);
    color: #fff;
    border-color: var(--brand);
  }

  .wol-grid {
    max-width: none;
    margin: 0;
    padding: 0 32px 56px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 12px;
  }

  .wol-card {
    border-radius: 10px;
    border: 1px solid var(--wol-border);
    background: var(--wol-bg);
    overflow: hidden;
    cursor: pointer;
    transition: border-color 160ms ease;
  }

  .wol-card:hover {
    border-color: var(--wol-border-strong);
  }

  .wol-card-video {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #0a0a0a;
  }

  .wol-card-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .wol-card-overlay {
    position: absolute;
    inset: 0;
    background: linear-gradient(to bottom, transparent 55%, rgba(0,0,0,.62));
  }

  .wol-card-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 38px;
    height: 38px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255,255,255,.2);
    border: 1px solid rgba(255,255,255,.34);
  }

  .wol-card-stars {
    position: absolute;
    top: 8px;
    left: 8px;
    font-size: 12px;
    color: #ffb020;
  }

  .wol-card-stars span {
    color: rgba(255,255,255,.28);
  }

  .wol-featured-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    background: #fff3f0;
    border: 1px solid #ffccc4;
    color: var(--brand);
    font-size: 10px;
    font-weight: 600;
    border-radius: 999px;
    padding: 3px 8px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .wol-duration {
    position: absolute;
    right: 8px;
    bottom: 8px;
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(0,0,0,.58);
    color: #fff;
    font-size: 10px;
    font-weight: 500;
  }

  .wol-card-body {
    padding: 12px;
    display: grid;
    gap: 10px;
  }

  .wol-quote {
    font-size: 13px;
    line-height: 1.55;
    font-weight: 500;
    letter-spacing: -0.01em;
  }

  .wol-author {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .wol-avatar {
    width: 30px;
    height: 30px;
    border-radius: 999px;
    border: 1px solid var(--wol-border);
    background: var(--wol-bg-subtle);
    display: grid;
    place-items: center;
    font-size: 11px;
    font-weight: 600;
  }

  .wol-name {
    font-size: 13px;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .wol-role {
    font-size: 11px;
    color: var(--wol-text-secondary);
  }

  .wol-empty {
    grid-column: 1 / -1;
    padding: 18px;
    text-align: center;
    border: 1px dashed var(--wol-border-strong);
    border-radius: 10px;
    color: var(--wol-text-secondary);
    background: var(--wol-bg-subtle);
  }

  .wol-footer {
    max-width: none;
    margin: 6px 0 0;
    padding: 16px 32px 24px;
    text-align: left;
    display: grid;
    justify-items: flex-start;
    gap: 8px;
    border-top: 1px solid var(--wol-border);
  }

  .wol-footer h2 {
    font-size: clamp(24px, 4vw, 32px);
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1.1;
  }

  .wol-footer p {
    color: var(--wol-text-secondary);
    font-size: 14px;
    max-width: 420px;
  }

  .wol-footer-cta {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 32px;
    border-radius: 6px;
    padding: 0 12px;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    color: #fff;
    background: var(--brand);
  }

  .wol-footer-cta:hover {
    filter: brightness(0.98);
  }

  .wol-signature {
    padding: 0 32px 40px;
    text-align: left;
    font-size: 11px;
    color: var(--wol-text-tertiary);
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: flex-start;
  }

  .wol-signature-mark {
    display: inline-flex;
    align-items: center;
  }

  .wol-lightbox {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(10,10,10,.56);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
  }

  .wol-lightbox-close {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.28);
    background: rgba(255,255,255,.1);
    color: #fff;
    font-size: 22px;
    cursor: pointer;
  }

  .wol-lightbox-card {
    max-width: 920px;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(220px, 360px) minmax(0, 1fr);
    gap: 14px;
  }

  .wol-lightbox-video {
    border-radius: 10px;
    overflow: hidden;
    background: #000;
    border: 1px solid var(--wol-border);
    aspect-ratio: 4 / 5;
  }

  .wol-lightbox-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wol-lightbox-copy {
    border-radius: 10px;
    border: 1px solid var(--wol-border);
    background: var(--wol-bg);
    padding: 14px;
    display: grid;
    gap: 12px;
    align-content: start;
  }

  .wol-lightbox-stars {
    color: #ffb020;
    font-size: 16px;
    line-height: 1;
  }

  .wol-lightbox-stars span {
    color: #d0d0d0;
  }

  .wol-lightbox-quote {
    font-size: 18px;
    line-height: 1.4;
    font-weight: 600;
    letter-spacing: -0.03em;
  }

  @media (max-width: 960px) {
    .wol-hero,
    .wol-filters,
    .wol-grid,
    .wol-footer,
    .wol-signature {
      padding-left: 20px;
      padding-right: 20px;
    }
  }

  @media (max-width: 640px) {
    .wol-hero,
    .wol-filters,
    .wol-grid,
    .wol-footer,
    .wol-signature {
      padding-left: 16px;
      padding-right: 16px;
    }

    .wol-grid {
      grid-template-columns: 1fr;
      padding-bottom: 36px;
    }

    .wol-lightbox {
      padding: 12px;
    }

    .wol-lightbox-card {
      grid-template-columns: 1fr;
    }
  }
`;

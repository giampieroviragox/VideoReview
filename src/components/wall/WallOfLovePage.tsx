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
    min-height: 100vh;
    background: #f7f6f4;
    color: #0f0f0f;
    padding-top: 60px;
  }

  .wol-hero {
    max-width: 1100px;
    margin: 0 auto;
    padding: 64px 24px 32px;
    text-align: center;
    display: grid;
    gap: 12px;
    justify-items: center;
  }

  .wol-eyebrow {
    display: inline-flex;
    align-items: center;
    padding: 5px 14px;
    border-radius: 999px;
    border: 1px solid rgba(255,92,53,.3);
    background: #fff0ec;
    color: var(--brand);
    font-size: 11px;
    font-weight: 800;
    letter-spacing: .12em;
    text-transform: uppercase;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wol-title {
    max-width: 760px;
    font-size: clamp(34px, 6vw, 58px);
    line-height: 1;
    letter-spacing: -0.05em;
    font-weight: 900;
  }

  .wol-subtitle {
    max-width: 620px;
    font-size: 17px;
    color: #6b6b6b;
    line-height: 1.65;
  }

  .wol-metrics {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 22px;
    flex-wrap: wrap;
    margin-top: 4px;
  }

  .wol-metric {
    display: grid;
    justify-items: center;
    gap: 2px;
  }

  .wol-metric-value {
    font-size: 28px;
    font-weight: 900;
    line-height: 1;
    letter-spacing: -0.04em;
  }

  .wol-metric-label {
    font-size: 11px;
    color: #a0a0a0;
    font-weight: 600;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wol-metric-sep {
    width: 1px;
    height: 34px;
    background: rgba(0,0,0,.14);
  }

  .wol-filters {
    max-width: 1100px;
    margin: 0 auto 18px;
    padding: 0 24px;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .wol-filter {
    border: 1px solid rgba(0,0,0,.18);
    background: #fff;
    color: #3a3a3a;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
  }

  .wol-filter.active {
    background: var(--brand);
    color: #fff;
    border-color: var(--brand);
  }

  .wol-grid {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px 64px;
    column-count: 3;
    column-gap: 16px;
  }

  .wol-card {
    break-inside: avoid;
    margin-bottom: 16px;
    border-radius: 26px;
    border: 1px solid rgba(0,0,0,.08);
    background: #fff;
    overflow: hidden;
    box-shadow: 0 1px 4px rgba(0,0,0,.04), 0 8px 22px rgba(0,0,0,.05);
    cursor: pointer;
  }

  .wol-card-video {
    position: relative;
    aspect-ratio: 4 / 5;
    background: #0f0f0f;
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
    background: linear-gradient(to bottom, transparent 35%, rgba(0,0,0,.75));
  }

  .wol-card-play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 52px;
    height: 52px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    color: #fff;
    background: rgba(255,255,255,.14);
    border: 2px solid rgba(255,255,255,.3);
  }

  .wol-card-stars {
    position: absolute;
    top: 10px;
    left: 10px;
    font-size: 13px;
    color: #ffb020;
  }

  .wol-card-stars span {
    color: rgba(255,255,255,.28);
  }

  .wol-featured-badge {
    position: absolute;
    top: 10px;
    right: 10px;
    background: var(--brand);
    color: #fff;
    font-size: 10px;
    font-weight: 800;
    border-radius: 999px;
    padding: 4px 9px;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .wol-duration {
    position: absolute;
    right: 10px;
    bottom: 10px;
    border-radius: 999px;
    padding: 2px 8px;
    background: rgba(0,0,0,.65);
    color: #fff;
    font-size: 10px;
    font-weight: 700;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wol-card-body {
    padding: 16px;
    display: grid;
    gap: 12px;
  }

  .wol-quote {
    font-size: 14px;
    line-height: 1.5;
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  .wol-author {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .wol-avatar {
    width: 34px;
    height: 34px;
    border-radius: 999px;
    border: 1px solid rgba(0,0,0,.14);
    background: #efede9;
    display: grid;
    place-items: center;
    font-size: 12px;
    font-weight: 800;
  }

  .wol-name {
    font-size: 13px;
    font-weight: 800;
    letter-spacing: -0.01em;
  }

  .wol-role {
    font-size: 11px;
    color: #a0a0a0;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wol-empty {
    column-span: all;
    padding: 26px;
    text-align: center;
    border: 1px dashed rgba(0,0,0,.16);
    border-radius: 18px;
    color: #6b6b6b;
    background: rgba(255,255,255,.84);
  }

  .wol-footer {
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px 24px;
    text-align: center;
    display: grid;
    justify-items: center;
    gap: 10px;
  }

  .wol-footer h2 {
    font-size: clamp(24px, 4vw, 38px);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 1.1;
  }

  .wol-footer p {
    color: #6b6b6b;
    font-size: 15px;
    max-width: 420px;
  }

  .wol-footer-cta {
    margin-top: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 50px;
    border-radius: 999px;
    padding: 0 28px;
    text-decoration: none;
    font-size: 16px;
    font-weight: 800;
    color: #fff;
    background: var(--brand);
  }

  .wol-signature {
    padding: 0 24px 52px;
    text-align: center;
    font-size: 11px;
    color: #d0d0d0;
    display: flex;
    gap: 6px;
    align-items: center;
    justify-content: center;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .wol-signature-mark {
    display: inline-flex;
    align-items: center;
  }

  .wol-lightbox {
    position: fixed;
    inset: 0;
    z-index: 90;
    background: rgba(0,0,0,.68);
    backdrop-filter: blur(10px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
  }

  .wol-lightbox-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 42px;
    height: 42px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.32);
    background: rgba(255,255,255,.1);
    color: #fff;
    font-size: 26px;
    cursor: pointer;
  }

  .wol-lightbox-card {
    max-width: 880px;
    width: 100%;
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: 20px;
  }

  .wol-lightbox-video {
    border-radius: 24px;
    overflow: hidden;
    background: #000;
    aspect-ratio: 4 / 5;
  }

  .wol-lightbox-video video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wol-lightbox-copy {
    border-radius: 24px;
    border: 1px solid rgba(0,0,0,.1);
    background: #fff;
    padding: 20px;
    display: grid;
    gap: 16px;
    align-content: start;
  }

  .wol-lightbox-stars {
    color: #ffb020;
    font-size: 20px;
    line-height: 1;
  }

  .wol-lightbox-stars span {
    color: #e5e3de;
  }

  .wol-lightbox-quote {
    font-size: 20px;
    line-height: 1.4;
    font-weight: 900;
    letter-spacing: -0.03em;
  }

  @media (max-width: 960px) {
    .wol-grid {
      column-count: 2;
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
      column-count: 1;
      padding-bottom: 42px;
    }

    .wol-lightbox {
      padding: 12px;
    }

    .wol-lightbox-card {
      grid-template-columns: 1fr;
    }
  }
`;

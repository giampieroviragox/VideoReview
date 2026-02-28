"use client";

import { useMemo, useState, type FormEvent } from "react";
import Image from "next/image";
import VideoRecorder from "@/components/VideoRecorder";

type Question = {
  id: string;
  text: string;
  required: boolean;
  sortOrder: number;
};

type CampaignSubmissionFormProps = {
  campaign: {
    id: string;
    brandName: string;
    brandLogoUrl: string | null;
    name: string;
    description: string | null;
    rewardText: string;
    rewardValue: string | null;
    questionDisplayMode: string;
    questions: Question[];
  };
};

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="public-review-stars" role="radiogroup" aria-label="Review rating">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className="public-review-star"
          data-active={rating <= value ? "true" : "false"}
          onClick={() => onChange(rating)}
          aria-label={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
          aria-pressed={rating === value}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function CampaignSubmissionForm({ campaign }: CampaignSubmissionFormProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const brandQuestion = campaign.questions[0] || null;

  const fullName = useMemo(
    () => `${firstName.trim()} ${lastName.trim()}`.trim(),
    [firstName, lastName]
  );

  const hasRecordedVideo = Boolean(rating > 0 && videoBlob);

  const validate = () => {
    if (!rating) {
      setError("Please choose a rating first.");
      return false;
    }

    if (!videoBlob) {
      setError("Please record a video before submitting.");
      return false;
    }

    if (!firstName.trim()) {
      setError("Please enter your first name.");
      return false;
    }

    if (!lastName.trim()) {
      setError("Please enter your last name.");
      return false;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleRecordingComplete = (blob: Blob, durationSeconds: number) => {
    setVideoBlob(blob);
    setVideoDuration(durationSeconds);
    setError(null);
  };

  const uploadVideo = async (blob: Blob) => {
    const contentType = blob.type || "video/webm";
    const uploadRes = await fetch(`/api/campaigns/${campaign.id}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contentType }),
    });

    const uploadData = await uploadRes.json();
    if (!uploadRes.ok) {
      throw new Error(uploadData.error || "Failed to prepare upload.");
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener("progress", (uploadEvent) => {
        if (uploadEvent.lengthComputable) {
          setUploadProgress(Math.round((uploadEvent.loaded / uploadEvent.total) * 100));
        }
      });

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
          return;
        }

        reject(new Error(`Upload failed (status ${xhr.status}).`));
      });

      xhr.addEventListener("error", () => reject(new Error("Upload failed.")));
      xhr.addEventListener("abort", () => reject(new Error("Upload cancelled.")));
      xhr.open("PUT", uploadData.uploadUrl, true);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.send(blob);
    });

    return uploadData.videoKey as string;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validate() || !videoBlob) {
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(0);
    setError(null);

    try {
      const videoKey = await uploadVideo(videoBlob);

      const response = await fetch(`/api/campaigns/${campaign.id}/submissions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewerName: fullName,
          reviewerEmail: email.trim().toLowerCase(),
          reviewerRating: rating,
          videoKey,
          durationSeconds: videoDuration,
          answers: [],
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit your review.");
      }

      setIsSuccess(true);
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit your review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="public-review-page">
        <div className="public-review-shell public-review-shell-success">
          <section className="public-review-brand-panel public-review-brand-panel-success">
            <div className="public-review-brand-row">
              <div className="public-review-brand-fallback">
                {campaign.brandName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="public-review-brand-name">{campaign.brandName}</p>
                <p className="public-review-brand-sub">review received</p>
              </div>
            </div>
          </section>

          <section className="public-review-card public-review-success-card">
            <p className="public-review-kicker">Thank you</p>
            <h1 className="public-review-success-title">Your video review is on its way.</h1>
            <p className="public-review-muted">
              The company will review it first, then send your reward manually.
            </p>
          </section>
        </div>
        <style>{publicReviewStyles}</style>
      </div>
    );
  }

  return (
    <div className="public-review-page">
      <header className="public-review-topbar">
        <div className="public-review-topbar-inner">
          <div className="public-review-topbar-branding">
            <span className="public-review-topbar-mark">▶</span>
            <span className="public-review-topbar-label">Video Reviews</span>
          </div>
        </div>
      </header>

      <main className="public-review-shell">
        <section className="public-review-brand-panel">
          <div className="public-review-brand-row">
            {campaign.brandLogoUrl ? (
              <Image
                src={campaign.brandLogoUrl}
                alt={`${campaign.brandName} logo`}
                width={52}
                height={52}
                style={{ objectFit: "cover", borderRadius: 16 }}
              />
            ) : (
              <div className="public-review-brand-fallback">
                {campaign.brandName.slice(0, 2).toUpperCase()}
              </div>
            )}

            <div className="public-review-brand-content">
              <p className="public-review-brand-name">{campaign.brandName}</p>
              <p className="public-review-brand-sub">invited you to share your experience</p>
            </div>
          </div>
        </section>

        <form onSubmit={handleSubmit} className="public-review-form">
          <section className="public-review-card public-review-rating-stage">
            <div className="public-review-stage-head">
              <p className="public-review-kicker">Step 1 of 3</p>
              <h1 className="public-review-stage-title">Start with a quick rating</h1>
              <p className="public-review-muted">
                Rate the experience first, then record a short video.
              </p>
            </div>
            <StarRating value={rating} onChange={setRating} />
          </section>

          {rating > 0 && (
            <section className="public-review-recording-flow">
              <section className="public-review-card public-review-recorder-card">
                <div className="public-review-stage-head public-review-stage-head-tight">
                  <p className="public-review-kicker">Step 2 of 3</p>
                  <h2 className="public-review-section-title">Record your video</h2>
                  <p className="public-review-muted">
                    Keep it simple. A short and honest answer is enough.
                  </p>
                </div>

                {(brandQuestion || campaign.rewardText) && (
                  <div className="public-review-recorder-context">
                    {brandQuestion && (
                      <div className="public-review-inline-quote-wrap">
                        <p className="public-review-inline-quote-label">Optional prompt</p>
                        <p className="public-review-inline-quote">“{brandQuestion.text}”</p>
                      </div>
                    )}

                    {campaign.rewardText && (
                      <div className="public-review-inline-reward">
                        <p className="public-review-inline-reward-label">Reward</p>
                        <p className="public-review-inline-reward-title">{campaign.rewardText}</p>
                        {campaign.rewardValue && (
                          <p className="public-review-inline-reward-copy">{campaign.rewardValue}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="public-review-recorder-shell">
                  <VideoRecorder
                    onRecordingComplete={handleRecordingComplete}
                    maxDurationSeconds={null}
                    labels={{
                      idlePrompt: "Tap to enable your camera",
                      enableCamera: "Enable camera",
                      startRecording: "Start recording",
                      stopRecording: "Stop recording",
                      rerecord: "Record again",
                      cameraAccessError:
                        "We could not access your camera. Please check browser permissions.",
                    }}
                  />
                </div>
              </section>
            </section>
          )}

          {hasRecordedVideo && (
            <section className="public-review-card public-review-identity-stage">
              <div className="public-review-stage-head public-review-stage-head-tight">
                <p className="public-review-kicker">Step 3 of 3</p>
                <h2 className="public-review-section-title">One last step</h2>
                <p className="public-review-muted">
                  Add your details so the company can identify your review and send your reward.
                </p>
              </div>

              <div className="public-review-identity-grid">
                <label className="public-review-field">
                  <span className="public-review-field-label">First name</span>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="John"
                    className="public-review-input"
                  />
                </label>

                <label className="public-review-field">
                  <span className="public-review-field-label">Last name</span>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Doe"
                    className="public-review-input"
                  />
                </label>

                <label className="public-review-field public-review-field-wide">
                  <span className="public-review-field-label">Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="john@example.com"
                    className="public-review-input"
                  />
                </label>
              </div>

              <div className="public-review-note">
                We ask for your name and email only so the company can send your reward. They
                will not be used for anything else.
              </div>
            </section>
          )}

          {error && <div className="public-review-feedback public-review-feedback-error">{error}</div>}

          {isSubmitting && (
            <div className="public-review-feedback public-review-feedback-upload">
              <p className="public-review-upload-copy">Uploading your video review...</p>
              <div className="public-review-upload-track">
                <div
                  className="public-review-upload-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {hasRecordedVideo && (
            <button type="submit" disabled={isSubmitting} className="public-review-submit-btn">
              {isSubmitting ? "Submitting..." : "Send video review →"}
            </button>
          )}
        </form>
      </main>

      <style>{publicReviewStyles}</style>
    </div>
  );
}

const publicReviewStyles = `
  .public-review-page {
    min-height: 100vh;
    background:
      radial-gradient(circle at top left, rgba(255, 95, 61, 0.08), transparent 22%),
      radial-gradient(circle at top right, rgba(255, 95, 61, 0.05), transparent 20%),
      #f3efeb;
    color: #17171d;
  }

  .public-review-topbar {
    position: sticky;
    top: 0;
    z-index: 5;
    background: rgba(243, 239, 235, 0.92);
    backdrop-filter: blur(10px);
    border-bottom: 1px solid rgba(23, 23, 29, 0.06);
  }

  .public-review-topbar-inner,
  .public-review-shell {
    width: min(960px, calc(100% - 40px));
    margin: 0 auto;
  }

  .public-review-topbar-inner {
    height: 68px;
    display: flex;
    align-items: center;
  }

  .public-review-topbar-branding {
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }

  .public-review-topbar-mark {
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    border-radius: 14px;
    background: var(--brand);
    color: #fff;
    font-size: 16px;
    box-shadow: 0 10px 18px rgba(255, 95, 61, 0.18);
  }

  .public-review-topbar-label {
    font-family: "Figtree", sans-serif;
    font-size: 19px;
    font-weight: 800;
    color: #17171d;
  }

  .public-review-shell {
    padding: 28px 0 56px;
  }

  .public-review-shell-success {
    padding-top: 56px;
    padding-bottom: 80px;
  }

  .public-review-brand-panel,
  .public-review-card,
  .public-review-feedback {
    border: 1px solid rgba(23, 23, 29, 0.08);
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.86);
    box-shadow:
      0 14px 32px rgba(18, 18, 24, 0.05),
      0 1px 0 rgba(255, 255, 255, 0.84) inset;
  }

  .public-review-brand-panel,
  .public-review-card,
  .public-review-feedback,
  .public-review-submit-btn {
    margin-bottom: 18px;
  }

  .public-review-brand-panel {
    padding: 22px 24px;
  }

  .public-review-brand-panel-success {
    max-width: 680px;
    margin-inline: auto;
  }

  .public-review-brand-row {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .public-review-brand-content {
    min-width: 0;
  }

  .public-review-brand-fallback {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    display: grid;
    place-items: center;
    flex-shrink: 0;
    background: linear-gradient(180deg, #eef1f8, #e2e8f4);
    border: 1px solid rgba(92, 109, 168, 0.12);
    font-family: "Figtree", sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: #3d54bc;
  }

  .public-review-brand-name {
    font-family: "Figtree", sans-serif;
    font-size: clamp(28px, 3.6vw, 42px);
    line-height: 1;
    font-weight: 800;
    color: #17171d;
    margin: 0 0 6px;
  }

  .public-review-brand-sub {
    margin: 0;
    color: rgba(23, 23, 29, 0.46);
    font-size: 14px;
    font-family:
      "DM Mono",
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      monospace;
  }

  .public-review-form {
    display: grid;
    gap: 0;
  }

  .public-review-card {
    padding: 22px 24px;
  }

  .public-review-stage-head {
    text-align: center;
    margin-bottom: 16px;
  }

  .public-review-stage-head-tight {
    margin-bottom: 14px;
  }

  .public-review-kicker,
  .public-review-field-label,
  .public-review-meta-label {
    margin: 0 0 8px;
    font-size: 11px;
    line-height: 1.2;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: rgba(23, 23, 29, 0.36);
  }

  .public-review-meta-label-coral {
    color: var(--brand-2);
  }

  .public-review-stage-title,
  .public-review-section-title,
  .public-review-success-title {
    margin: 0;
    font-family: "Figtree", sans-serif;
    font-weight: 800;
    color: #17171d;
  }

  .public-review-stage-title {
    font-size: clamp(28px, 4vw, 40px);
    line-height: 1.04;
    margin-bottom: 8px;
  }

  .public-review-section-title {
    font-size: clamp(22px, 3vw, 30px);
    line-height: 1.08;
    margin-bottom: 6px;
  }

  .public-review-success-title {
    font-size: clamp(32px, 4.5vw, 52px);
    line-height: 1.02;
    margin-bottom: 10px;
  }

  .public-review-muted,
  .public-review-meta-copy,
  .public-review-upload-copy {
    margin: 0;
    color: rgba(23, 23, 29, 0.56);
    font-size: 15px;
    line-height: 1.6;
  }

  .public-review-stars {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 8px;
  }

  .public-review-star {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    border: 1px solid rgba(23, 23, 29, 0.08);
    background: rgba(255, 255, 255, 0.92);
    color: rgba(23, 23, 29, 0.18);
    font-size: 24px;
    line-height: 1;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition:
      transform 120ms ease,
      border-color 120ms ease,
      background 120ms ease,
      color 120ms ease,
      box-shadow 120ms ease;
  }

  .public-review-star:hover {
    transform: translateY(-1px);
    border-color: rgba(255, 95, 61, 0.2);
  }

  .public-review-star[data-active="true"] {
    background: linear-gradient(180deg, var(--brand), var(--brand-2));
    border-color: transparent;
    color: #fff;
    box-shadow: 0 8px 18px rgba(255, 95, 61, 0.18);
  }

  .public-review-recording-flow {
    display: grid;
    gap: 16px;
  }

  .public-review-recorder-context {
    width: min(460px, 100%);
    margin: 0 auto 14px;
    display: grid;
    gap: 10px;
  }

  .public-review-inline-quote-wrap,
  .public-review-inline-reward {
    border: 1px solid rgba(23, 23, 29, 0.07);
    border-radius: 18px;
    background: rgba(247, 244, 241, 0.9);
    padding: 12px 14px;
    text-align: left;
  }

  .public-review-inline-quote-label,
  .public-review-inline-reward-label {
    margin: 0 0 6px;
    font-size: 10px;
    line-height: 1.2;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .public-review-inline-quote-label {
    color: rgba(23, 23, 29, 0.34);
  }

  .public-review-inline-reward-label {
    color: var(--brand-2);
  }

  .public-review-inline-quote {
    margin: 0;
    padding-left: 12px;
    border-left: 2px solid rgba(255, 95, 61, 0.24);
    color: rgba(23, 23, 29, 0.72);
    font-size: 15px;
    line-height: 1.55;
    font-style: italic;
  }

  .public-review-inline-reward-title {
    margin: 0;
    font-family: "Figtree", sans-serif;
    font-size: clamp(15px, 1.9vw, 18px);
    line-height: 1.3;
    font-weight: 700;
    color: #17171d;
  }

  .public-review-inline-reward-copy {
    margin: 4px 0 0;
    color: rgba(23, 23, 29, 0.56);
    font-size: 13px;
    line-height: 1.5;
  }

  .public-review-recorder-card {
    width: min(760px, 100%);
    margin-inline: auto;
    text-align: center;
  }

  .public-review-recorder-shell {
    width: min(460px, 100%);
    margin: 0 auto;
  }

  .public-review-recorder-shell .video-recorder {
    display: grid;
    gap: 14px;
  }

  .public-review-recorder-shell .video-container {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 24px;
    overflow: hidden;
    background: #101117;
    border: 1px dashed rgba(255, 255, 255, 0.12);
    box-shadow:
      0 1px 0 rgba(255, 255, 255, 0.02) inset,
      0 18px 34px rgba(10, 10, 14, 0.2);
  }

  .public-review-recorder-shell .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .public-review-recorder-shell .video-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    gap: 12px;
    padding: 24px;
    cursor: pointer;
    color: rgba(255, 255, 255, 0.7);
    text-align: center;
    font-size: 15px;
    line-height: 1.5;
  }

  .public-review-recorder-shell .placeholder-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow:
      0 0 0 12px rgba(255, 95, 61, 0.07),
      0 8px 24px rgba(0, 0, 0, 0.22);
    font-size: 26px;
  }

  .public-review-recorder-shell .recording-overlay {
    padding: 12px;
  }

  .public-review-recorder-shell .recording-indicator,
  .public-review-recorder-shell .timer {
    font-size: 12px;
  }

  .public-review-recorder-shell .recorder-error {
    border-radius: 18px;
    padding: 14px 16px;
    border: 1px solid rgba(220, 82, 82, 0.16);
    background: rgba(220, 82, 82, 0.08);
    color: #9f3434;
    font-size: 14px;
  }

  .public-review-recorder-shell .recorder-controls {
    border-radius: 22px;
    border: 1px solid rgba(23, 23, 29, 0.08);
    background: rgba(255, 255, 255, 0.86);
    padding: 14px;
    display: grid;
    gap: 12px;
  }

  .public-review-recorder-shell .recorder-controls .btn {
    min-height: 52px;
    border-radius: 999px;
    font-family: "Figtree", sans-serif;
    font-size: 16px;
    font-weight: 700;
    border: 1px solid transparent;
    cursor: pointer;
  }

  .public-review-recorder-shell .recorder-controls .btn-primary,
  .public-review-recorder-shell .recorder-controls .btn-record,
  .public-review-recorder-shell .recorder-controls .btn-stop {
    background: linear-gradient(180deg, var(--brand), var(--brand-2));
    color: #fff;
    box-shadow: 0 10px 22px rgba(255, 95, 61, 0.14);
  }

  .public-review-recorder-shell .recorder-controls .btn-secondary {
    background: rgba(255, 255, 255, 0.92);
    border-color: rgba(23, 23, 29, 0.1);
    color: #17171d;
  }

  .public-review-recorder-shell .recorder-playback-shell {
    gap: 10px !important;
  }

  .public-review-recorder-shell .recorder-playback-progress {
    height: 6px !important;
    background: rgba(23, 23, 29, 0.08) !important;
  }

  .public-review-recorder-shell .recorder-playback-actions {
    gap: 12px !important;
  }

  .public-review-identity-stage {
    width: min(760px, 100%);
    margin-inline: auto;
  }

  .public-review-identity-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .public-review-field {
    display: grid;
    gap: 8px;
  }

  .public-review-field-wide {
    grid-column: 1 / -1;
  }

  .public-review-input {
    width: 100%;
    height: 54px;
    border-radius: 16px;
    border: 1px solid rgba(23, 23, 29, 0.08);
    background: rgba(255, 255, 255, 0.94);
    padding: 0 16px;
    font-size: 16px;
    color: #17171d;
    outline: none;
    transition:
      border-color 120ms ease,
      box-shadow 120ms ease;
  }

  .public-review-input:focus {
    border-color: rgba(255, 95, 61, 0.28);
    box-shadow: 0 0 0 4px rgba(255, 95, 61, 0.08);
  }

  .public-review-input::placeholder {
    color: rgba(23, 23, 29, 0.32);
  }

  .public-review-note {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    border: 1px solid rgba(23, 23, 29, 0.06);
    background: rgba(247, 244, 241, 0.95);
    font-size: 14px;
    line-height: 1.6;
    color: rgba(23, 23, 29, 0.58);
  }

  .public-review-feedback {
    padding: 16px 18px;
  }

  .public-review-feedback-error {
    color: #9f3434;
    border-color: rgba(220, 82, 82, 0.14);
    background: rgba(220, 82, 82, 0.08);
  }

  .public-review-feedback-upload {
    width: min(760px, 100%);
    margin-inline: auto;
  }

  .public-review-upload-copy {
    margin-bottom: 10px;
  }

  .public-review-upload-track {
    width: 100%;
    height: 8px;
    border-radius: 999px;
    background: rgba(23, 23, 29, 0.08);
    overflow: hidden;
  }

  .public-review-upload-fill {
    height: 100%;
    border-radius: 999px;
    background: linear-gradient(90deg, var(--brand), var(--brand-2));
  }

  .public-review-submit-btn {
    width: min(760px, 100%);
    margin-inline: auto;
    min-height: 58px;
    border: 0;
    border-radius: 999px;
    background: linear-gradient(180deg, var(--brand), var(--brand-2));
    color: #fff;
    font-family: "Figtree", sans-serif;
    font-size: 18px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 14px 28px rgba(255, 95, 61, 0.16);
    transition:
      transform 120ms ease,
      box-shadow 120ms ease,
      opacity 120ms ease;
  }

  .public-review-submit-btn:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 18px 32px rgba(255, 95, 61, 0.2);
  }

  .public-review-submit-btn:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }

  .public-review-success-card {
    max-width: 680px;
    margin-inline: auto;
    text-align: center;
    padding: 32px;
  }

  @media (max-width: 900px) {
    .public-review-topbar-inner,
    .public-review-shell {
      width: min(100%, calc(100% - 28px));
    }

    .public-review-shell {
      padding: 22px 0 44px;
    }

    .public-review-recorder-context {
      width: min(460px, 100%);
    }
  }

  @media (max-width: 720px) {
    .public-review-topbar-inner {
      height: 62px;
    }

    .public-review-topbar-mark {
      width: 38px;
      height: 38px;
      border-radius: 12px;
      font-size: 14px;
    }

    .public-review-topbar-label {
      font-size: 18px;
    }

    .public-review-brand-panel,
    .public-review-card,
    .public-review-feedback {
      border-radius: 20px;
    }

    .public-review-brand-panel,
    .public-review-card {
      padding: 18px;
    }

    .public-review-brand-name {
      font-size: clamp(22px, 8vw, 32px);
    }

    .public-review-stage-title {
      font-size: clamp(24px, 8vw, 34px);
    }

    .public-review-section-title {
      font-size: clamp(20px, 6vw, 26px);
    }

    .public-review-muted,
    .public-review-inline-quote,
    .public-review-inline-reward-copy {
      font-size: 14px;
    }

    .public-review-star {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      font-size: 21px;
    }

    .public-review-recorder-shell {
      width: 100%;
    }

    .public-review-recorder-shell .video-container {
      aspect-ratio: 4 / 5;
      border-radius: 20px;
    }

    .public-review-identity-grid {
      grid-template-columns: minmax(0, 1fr);
    }

    .public-review-field-wide {
      grid-column: auto;
    }

    .public-review-input {
      height: 50px;
      border-radius: 14px;
      font-size: 15px;
    }

    .public-review-submit-btn {
      min-height: 54px;
      font-size: 16px;
    }
  }

  @media (max-width: 520px) {
    .public-review-topbar-inner,
    .public-review-shell {
      width: min(100%, calc(100% - 20px));
    }

    .public-review-brand-panel,
    .public-review-card,
    .public-review-feedback {
      border-radius: 18px;
    }

    .public-review-brand-panel,
    .public-review-card {
      padding: 16px;
    }

    .public-review-brand-row {
      align-items: flex-start;
      gap: 12px;
    }

    .public-review-brand-fallback {
      width: 46px;
      height: 46px;
      border-radius: 14px;
      font-size: 16px;
    }

    .public-review-stage-head {
      text-align: left;
    }

    .public-review-stars {
      justify-content: flex-start;
    }

    .public-review-inline-quote {
      font-size: 13px;
    }

    .public-review-star {
      width: 38px;
      height: 38px;
      border-radius: 10px;
      font-size: 20px;
    }

    .public-review-recorder-shell .video-placeholder {
      font-size: 14px;
      padding: 18px;
    }

    .public-review-recorder-shell .placeholder-icon {
      width: 60px;
      height: 60px;
      box-shadow:
        0 0 0 10px rgba(255, 95, 61, 0.06),
        0 8px 20px rgba(0, 0, 0, 0.22);
      font-size: 22px;
    }

    .public-review-recorder-shell .recorder-controls {
      padding: 12px;
    }

    .public-review-note {
      font-size: 13px;
      padding: 12px 14px;
    }
  }
`;

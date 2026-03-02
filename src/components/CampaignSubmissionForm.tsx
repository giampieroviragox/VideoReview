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

const ratingCopy: Record<number, string> = {
  0: "Choose a rating to continue.",
  1: "Not great. Tell them what should improve.",
  2: "There is potential. A quick honest review helps.",
  3: "Good enough. A short video adds useful context.",
  4: "Great. A quick video makes it much more credible.",
  5: "Amazing. Record a short video and make it count.",
};

function StepProgress({ step }: { step: number }) {
  return (
    <div className="review-step-row">
      <div className="review-step-track" aria-hidden="true">
        {[0, 1, 2, 3].map((index) => (
          <span
            key={index}
            className={`review-step-seg ${index < step ? "done" : ""} ${index === step ? "active" : ""}`}
          />
        ))}
      </div>
      <span className="review-step-label">{step + 1} of 4</span>
    </div>
  );
}

function CompactStarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="review-stars-row" role="radiogroup" aria-label="Review rating">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          className={`review-star-tile ${rating < value ? "lit" : ""} ${rating === value ? "sel" : ""}`}
          onClick={() => onChange(rating)}
          aria-label={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
          aria-pressed={rating === value}
        >
          ⭐
        </button>
      ))}
    </div>
  );
}

export default function CampaignSubmissionForm({ campaign }: CampaignSubmissionFormProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [screen, setScreen] = useState<"review" | "contact" | "success">("review");

  const brandQuestion = campaign.questions[0] || null;
  const hasVideo = Boolean(videoBlob);
  const canOpenContact = Boolean(rating > 0 && hasVideo);
  const initials = useMemo(() => campaign.brandName.slice(0, 2).toUpperCase(), [campaign.brandName]);

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

  const handleReviewContinue = () => {
    if (!rating) {
      setError("Choose a rating to continue.");
      return;
    }

    if (!videoBlob) {
      setError("Record your video to continue.");
      return;
    }

    setError(null);
    setScreen("contact");
  };

  const validateContact = () => {
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return false;
    }

    if (!email.trim()) {
      setError("Please enter your email.");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return false;
    }

    setError(null);
    return true;
  };

  const handleContactSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!validateContact() || !videoBlob) {
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
          reviewerName: fullName.trim(),
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

      setScreen("success");
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error ? submitError.message : "Failed to submit your review."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="invite-review-page">
      <div className="invite-review-stripe" />

      <div className="invite-review-wrap">
        <div className="invite-review-card">
          {screen !== "success" ? (
            <>
              <header className="invite-review-head">
                {campaign.brandLogoUrl ? (
                  <Image
                    src={campaign.brandLogoUrl}
                    alt={`${campaign.brandName} logo`}
                    width={44}
                    height={44}
                    className="invite-review-logo-image"
                    style={{ objectFit: "cover", borderRadius: 12 }}
                  />
                ) : (
                  <div className="invite-review-logo">{initials}</div>
                )}
                <div>
                  <p className="invite-review-eyebrow">You were invited to review them</p>
                  <p className="invite-review-brand">{campaign.brandName}</p>
                  <p className="invite-review-sub">It takes less than 2 minutes</p>
                </div>
              </header>

              {screen === "review" ? (
                <div className="invite-review-body">
                  <StepProgress step={videoBlob ? 2 : rating > 0 ? 1 : 0} />

                  <div className="invite-review-layout">
                    <aside className="invite-review-sidebar">
                      <section>
                        <span className="invite-review-overline">Your rating</span>
                        <CompactStarRating value={rating} onChange={(value) => {
                          setRating(value);
                          setError(null);
                        }} />
                        <p className="invite-review-star-feedback">{ratingCopy[rating]}</p>
                      </section>

                      {brandQuestion && (
                        <section className="invite-question-box">
                          <span className="invite-question-label">
                            {campaign.brandName}&apos;s question
                          </span>
                          <p className="invite-question-text">{brandQuestion.text}</p>
                        </section>
                      )}

                      {campaign.rewardText && (
                        <section>
                          <span className="invite-review-overline">Your reward</span>
                          <div className="invite-reward-card">
                            <div className="invite-reward-icon">🎁</div>
                            <div>
                              <p className="invite-reward-eyebrow">Unlocked for you</p>
                              <p className="invite-reward-title">{campaign.rewardText}</p>
                              <p className="invite-reward-sub">
                                {campaign.rewardValue || "It will be sent right after your review is approved."}
                              </p>
                            </div>
                          </div>
                        </section>
                      )}
                    </aside>

                    <div className="invite-review-main">
                      <section>
                        <span className="invite-review-overline">Your video answer</span>
                        <div className="invite-recorder-shell">
                          <VideoRecorder
                            onRecordingComplete={handleRecordingComplete}
                            maxDurationSeconds={60}
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
                        <div className="invite-review-hint">
                          Speak freely. An honest opinion matters more than a perfect script.
                        </div>
                      </section>

                      <div className="invite-review-continue">
                        <button
                          type="button"
                          className="invite-submit-btn"
                          onClick={handleReviewContinue}
                          disabled={!canOpenContact}
                        >
                          <span>Continue to claim your reward</span>
                          <span className="invite-submit-arrow">→</span>
                        </button>
                        <p className={`invite-submit-hint ${error ? "warn" : ""}`}>
                          {error || (canOpenContact
                            ? "Looks good. Continue with your details."
                            : "Choose a rating and record your video to continue.")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form className="invite-contact-screen" onSubmit={handleContactSubmit}>
                  <button
                    type="button"
                    className="invite-back-btn"
                    onClick={() => {
                      setError(null);
                      setScreen("review");
                    }}
                  >
                    ← Back
                  </button>

                  <div>
                    <h2 className="invite-contact-title">Almost done!</h2>
                    <p className="invite-contact-sub">Tell us where to send your reward.</p>
                  </div>

                  <div className="invite-privacy-box">
                    <div className="invite-privacy-icon">🔒</div>
                    <div>
                      <p className="invite-privacy-title">No spam. Promise.</p>
                      <p className="invite-privacy-body">
                        We use these details only so <strong>{campaign.brandName}</strong> can send your reward.
                        They will never be used for anything else.
                      </p>
                    </div>
                  </div>

                  <div className="invite-contact-fields">
                    <label className="invite-contact-field">
                      <span className="invite-contact-label">Your name</span>
                      <input
                        className={`invite-contact-input ${error === "Please enter your name." ? "err" : ""}`}
                        value={fullName}
                        onChange={(event) => {
                          setFullName(event.target.value);
                          if (error === "Please enter your name.") setError(null);
                        }}
                        placeholder="Marco Rossi"
                        autoComplete="name"
                      />
                    </label>

                    <label className="invite-contact-field">
                      <span className="invite-contact-label">Your email</span>
                      <input
                        className={`invite-contact-input ${
                          error === "Please enter your email." || error === "Please enter a valid email address."
                            ? "err"
                            : ""
                        }`}
                        type="email"
                        value={email}
                        onChange={(event) => {
                          setEmail(event.target.value);
                          if (
                            error === "Please enter your email." ||
                            error === "Please enter a valid email address."
                          ) {
                            setError(null);
                          }
                        }}
                        placeholder="marco@example.com"
                        autoComplete="email"
                      />
                      <span className="invite-contact-hint">Your reward will be sent here</span>
                    </label>
                  </div>

                  {error && <p className="invite-submit-hint warn">{error}</p>}

                  {isSubmitting && (
                    <div className="invite-upload-box">
                      <p className="invite-upload-copy">Uploading your video review...</p>
                      <div className="invite-upload-track">
                        <div className="invite-upload-fill" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  <button type="submit" className="invite-submit-btn" disabled={isSubmitting}>
                    <span>{isSubmitting ? "Submitting..." : "Confirm and receive the reward"}</span>
                    <span className="invite-submit-arrow">→</span>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="invite-success-screen">
              <div className="invite-success-icon">✓</div>
              <h2 className="invite-success-title">Thank you.<br />Submitted.</h2>
              <p className="invite-success-body">
                Your review matters. Your reward is on the way — check your email shortly.
              </p>
              {campaign.rewardText && (
                <div className="invite-reward-card invite-reward-card-success">
                  <div className="invite-reward-icon">🎁</div>
                  <div>
                    <p className="invite-reward-eyebrow">Reward unlocked</p>
                    <p className="invite-reward-title">{campaign.rewardText}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="invite-powered">
          <span>Powered by</span>
          <span className="invite-powered-mark">
            <Image
              src="/tellr-logo.svg"
              alt="Tellr.me"
              className="invite-powered-logo"
              width={84}
              height={16}
            />
          </span>
        </div>
      </div>

      <style>{publicReviewStyles}</style>
    </div>
  );
}

const publicReviewStyles = `
  .invite-review-page {
    min-height: 100svh;
    background: #f7f6f4;
    color: #0f0f0f;
    font-family: "Figtree", sans-serif;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 32px 24px 56px;
  }

  .invite-review-stripe {
    width: min(1040px, 100%);
    height: 5px;
    border-radius: 999px;
    background: var(--brand);
    margin-bottom: 24px;
  }

  .invite-review-wrap {
    width: 100%;
    max-width: 1040px;
  }

  .invite-review-card {
    background: #fff;
    border: 1.5px solid rgba(0,0,0,.08);
    border-radius: 28px;
    box-shadow: 0 24px 64px rgba(0,0,0,.12), 0 4px 16px rgba(0,0,0,.06);
    overflow: hidden;
  }

  .invite-review-head {
    padding: 16px 24px;
    border-bottom: 1px solid rgba(0,0,0,.08);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .invite-review-logo,
  .invite-review-logo-image {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
  }

  .invite-review-logo {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 92, 53, .08);
    border: 1.5px solid rgba(255, 92, 53, .16);
    font-size: 15px;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--brand);
  }

  .invite-review-eyebrow,
  .invite-review-overline,
  .review-step-label,
  .invite-question-label,
  .invite-reward-eyebrow,
  .invite-contact-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .invite-review-eyebrow {
    color: #a0a0a0;
    margin: 0 0 4px;
  }

  .invite-review-brand {
    margin: 0;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #0f0f0f;
  }

  .invite-review-sub {
    margin: 2px 0 0;
    font-size: 11px;
    font-weight: 600;
    color: #a0a0a0;
  }

  .invite-review-body,
  .invite-contact-screen,
  .invite-success-screen {
    padding: 28px;
  }

  .invite-review-body,
  .invite-contact-screen {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }


  .invite-review-layout {
    display: grid;
    gap: 28px;
  }

  .invite-review-sidebar,
  .invite-review-main {
    display: flex;
    flex-direction: column;
    gap: 24px;
  }

  .review-step-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .review-step-track {
    flex: 1;
    display: flex;
    gap: 4px;
  }

  .review-step-seg {
    height: 3px;
    flex: 1;
    border-radius: 999px;
    background: #efede9;
    transition: background 180ms ease, flex 180ms ease;
  }

  .review-step-seg.done {
    background: var(--brand);
    opacity: .3;
  }

  .review-step-seg.active {
    background: var(--brand);
    flex: 2;
  }

  .review-step-label {
    color: #a0a0a0;
    white-space: nowrap;
  }

  .invite-review-overline {
    display: block;
    color: #a0a0a0;
    margin-bottom: 8px;
  }

  .review-stars-row {
    display: flex;
    gap: 8px;
  }

  .review-star-tile {
    flex: 1;
    aspect-ratio: 1;
    border-radius: 16px;
    border: 1.5px solid rgba(0,0,0,.14);
    background: #f7f6f4;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    cursor: pointer;
    transition: transform 180ms ease, background 180ms ease, border-color 180ms ease, box-shadow 180ms ease, filter 180ms ease;
    user-select: none;
    filter: grayscale(1) opacity(.45);
  }

  .review-star-tile:hover,
  .review-star-tile.lit {
    filter: none;
    background: #fffbeb;
    border-color: #fcd34d;
    transform: scale(1.04);
  }

  .review-star-tile.sel {
    filter: none;
    background: #fef3c7;
    border-color: #f59e0b;
    box-shadow: 0 2px 10px rgba(245,158,11,.2);
    transform: scale(1.04);
  }

  .invite-review-star-feedback {
    min-height: 20px;
    margin: 8px 0 0;
    font-size: 13px;
    font-weight: 500;
    color: #6b6b6b;
    letter-spacing: -0.01em;
  }

  .invite-question-box {
    background: #fff0ec;
    border: 1.5px solid #ffd5c8;
    border-radius: 20px;
    padding: 16px;
  }

  .invite-question-label {
    display: block;
    margin-bottom: 6px;
    color: rgba(255,92,53,.65);
  }

  .invite-question-text {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.35;
    letter-spacing: -0.03em;
    color: #0f0f0f;
  }

  .invite-recorder-shell {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .invite-recorder-shell .video-recorder {
    display: grid;
    gap: 12px;
  }

  .invite-recorder-shell .video-container {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 20px;
    overflow: hidden;
    background: #0f0f0f;
    border: 1px solid rgba(255,255,255,.08);
  }

  .invite-recorder-shell .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .invite-recorder-shell .video-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    gap: 12px;
    padding: 24px;
    color: rgba(255,255,255,.72);
    text-align: center;
  }

  .invite-recorder-shell .video-placeholder::before {
    content: "📷";
    width: 60px;
    height: 60px;
    border-radius: 999px;
    display: grid;
    place-items: center;
    font-size: 24px;
    background: rgba(255,255,255,.08);
    border: 1.5px solid rgba(255,255,255,.14);
  }

  .invite-recorder-shell .video-placeholder p {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
  }

  .invite-recorder-shell .control-bar {
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,.08);
    background: #f7f6f4;
    padding: 10px 12px;
  }

  .invite-recorder-shell .control-info {
    font-size: 11px;
    color: #6b6b6b;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .invite-recorder-shell .record-button,
  .invite-recorder-shell .action-button {
    border-radius: 999px;
  }

  .invite-recorder-shell .record-button {
    width: 54px;
    height: 54px;
  }

  .invite-recorder-shell .record-button .record-button-inner {
    width: 24px;
    height: 24px;
  }

  .invite-review-hint {
    margin-top: 12px;
    padding: 10px 12px;
    border-radius: 16px;
    background: #f7f6f4;
    border: 1px solid rgba(0,0,0,.08);
    font-size: 12px;
    line-height: 1.5;
    font-weight: 500;
    color: #6b6b6b;
  }

  .invite-reward-card {
    background: linear-gradient(135deg, #fffbf0 0%, #fff6e8 60%, #fff0ec 100%);
    border: 1.5px solid rgba(245,158,11,.22);
    border-radius: 20px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .invite-reward-card-success {
    width: 100%;
    text-align: left;
  }

  .invite-reward-icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    background: rgba(245,158,11,.1);
    border: 1.5px solid rgba(245,158,11,.22);
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
  }

  .invite-reward-eyebrow {
    margin: 0 0 4px;
    color: rgba(146,64,14,.55);
  }

  .invite-reward-title {
    margin: 0 0 2px;
    font-size: 16px;
    font-weight: 900;
    line-height: 1.2;
    letter-spacing: -0.03em;
    color: #92400e;
  }

  .invite-reward-sub {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    color: rgba(146,64,14,.55);
  }

  .invite-submit-btn {
    width: 100%;
    padding: 15px 24px;
    border-radius: 999px;
    border: none;
    background: var(--brand);
    color: #fff;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: -0.02em;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 180ms ease;
    position: relative;
    overflow: hidden;
  }

  .invite-submit-btn:not(:disabled):hover {
    filter: brightness(1.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(255,92,53,.35);
  }

  .invite-submit-btn:disabled {
    background: #efede9;
    color: #d0d0d0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .invite-submit-arrow {
    transition: transform 180ms ease;
  }

  .invite-submit-btn:not(:disabled):hover .invite-submit-arrow {
    transform: translateX(3px);
  }

  .invite-submit-hint {
    min-height: 18px;
    margin: 8px 0 0;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: #a0a0a0;
  }

  .invite-submit-hint.warn {
    color: #dc2626;
  }

  .invite-back-btn {
    border: none;
    background: none;
    padding: 0;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-size: 13px;
    font-weight: 700;
    color: #a0a0a0;
    cursor: pointer;
    transition: color 180ms ease;
  }

  .invite-back-btn:hover {
    color: #0f0f0f;
  }

  .invite-contact-title {
    margin: 0 0 6px;
    font-size: 22px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: #0f0f0f;
  }

  .invite-contact-sub,
  .invite-privacy-body,
  .invite-contact-hint,
  .invite-upload-copy,
  .invite-success-body {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.55;
    color: #6b6b6b;
  }

  .invite-privacy-box {
    background: #fff0ec;
    border: 1.5px solid #ffd5c8;
    border-radius: 20px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .invite-privacy-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .invite-privacy-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f0f0f;
  }

  .invite-privacy-body strong {
    color: #3a3a3a;
  }

  .invite-contact-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .invite-contact-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .invite-contact-label {
    color: #0f0f0f;
  }

  .invite-contact-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 16px;
    border: 1.5px solid rgba(0,0,0,.14);
    background: #fff;
    color: #0f0f0f;
    font-size: 14px;
    font-family: "Figtree", sans-serif;
    outline: none;
    transition: border-color 180ms ease, box-shadow 180ms ease;
  }

  .invite-contact-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px #fff0ec;
  }

  .invite-contact-input.err {
    border-color: #dc2626;
  }

  .invite-contact-input.err:focus {
    box-shadow: 0 0 0 3px #fef2f2;
  }

  .invite-contact-hint {
    font-size: 12px;
    color: #a0a0a0;
  }

  .invite-upload-box {
    border: 1px solid rgba(0,0,0,.08);
    border-radius: 18px;
    background: rgba(255,255,255,.86);
    padding: 14px;
  }

  .invite-upload-track {
    margin-top: 10px;
    height: 8px;
    border-radius: 999px;
    overflow: hidden;
    background: #efede9;
  }

  .invite-upload-fill {
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--brand), #ff7a57);
    transition: width 140ms ease;
  }

  .invite-success-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    padding: 64px 24px 48px;
  }

  .invite-success-icon {
    width: 72px;
    height: 72px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f0fdf4;
    border: 2px solid rgba(22,163,74,.2);
    font-size: 28px;
    color: #16a34a;
  }

  .invite-success-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: #0f0f0f;
  }

  .invite-powered {
    margin-top: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 500;
    color: #d0d0d0;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    letter-spacing: .04em;
  }

  .invite-powered-mark {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  .invite-powered-logo {
    display: block;
    height: 16px;
    width: auto;
    max-width: 84px;
  }

  @media (min-width: 900px) {
    .invite-review-head {
      padding: 20px 28px;
    }

    .invite-review-brand {
      font-size: 22px;
    }

    .invite-review-sub {
      font-size: 12px;
    }

    .invite-review-layout {
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      align-items: start;
    }

    .invite-review-main .invite-submit-btn,
    .invite-review-main .invite-submit-hint {
      max-width: 560px;
      margin-left: auto;
      margin-right: auto;
    }

    .invite-contact-screen,
    .invite-success-screen {
      max-width: 760px;
      margin: 0 auto;
    }

    .invite-contact-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
  }

  @media (max-width: 480px) {
    .invite-review-page {
      padding: 0 0 48px;
    }

    .invite-review-stripe {
      width: 100%;
      max-width: none;
      border-radius: 0;
      margin-bottom: 0;
    }

    .invite-review-card {
      border-radius: 0;
      border-left: none;
      border-right: none;
      box-shadow: none;
    }

    .invite-review-wrap {
      max-width: none;
    }

    .invite-review-body,
    .invite-contact-screen,
    .invite-success-screen,
    .invite-review-head {
      padding-left: 16px;
      padding-right: 16px;
    }
  }
`;

"use client";

import { useState } from "react";
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
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => onChange(rating)}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 30,
            lineHeight: 1,
            color: rating <= value ? "var(--warn)" : "rgba(255,255,255,.18)",
          }}
          aria-label={`Rate ${rating} star${rating > 1 ? "s" : ""}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function CampaignSubmissionForm({ campaign }: CampaignSubmissionFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [rating, setRating] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const brandQuestion = campaign.questions[0] || null;

  const validate = () => {
    if (!name.trim()) {
      setError("Please enter your name.");
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

    if (!rating) {
      setError("Please leave a rating.");
      return false;
    }

    if (!videoBlob) {
      setError("Please record a video before submitting.");
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

  const handleSubmit = async (event: React.FormEvent) => {
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
          reviewerName: name.trim(),
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
      setError(submitError instanceof Error ? submitError.message : "Failed to submit your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div
        style={{
          width: "min(900px, 100%)",
          margin: "0 auto",
          borderRadius: 28,
          border: "1px solid rgba(61,255,160,.16)",
          background: "rgba(61,255,160,.05)",
          padding: "28px clamp(18px, 4vw, 36px)",
        }}
      >
        <p className="label" style={{ color: "var(--success)", marginBottom: 10 }}>
          Submission received
        </p>
        <h1 className="heading" style={{ fontSize: "clamp(32px, 6vw, 56px)", marginBottom: 12 }}>
          Thank you!
        </h1>
        <p style={{ color: "var(--smoke)", fontSize: "var(--text-lg)" }}>
          Thank you! Your reward will be sent after approval by the company.
        </p>
      </div>
    );
  }

  return (
    <div className="campaign-review-form" style={{ width: "min(960px, 100%)", margin: "0 auto" }}>
      <header
        style={{
          border: "1px solid var(--ink-3)",
          borderRadius: 32,
          padding: "24px clamp(18px, 4vw, 34px)",
          background:
            "linear-gradient(180deg, rgba(17,17,24,.96), rgba(10,10,15,.98))",
          marginBottom: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.06,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(var(--ink-3) 1px, transparent 1px), linear-gradient(90deg, var(--ink-3) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {campaign.brandLogoUrl ? (
            <Image
              src={campaign.brandLogoUrl}
              alt={`${campaign.brandName} logo`}
              width={56}
              height={56}
              style={{ objectFit: "cover", borderRadius: 16 }}
            />
          ) : (
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 16,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,95,61,.1)",
                border: "1px solid rgba(255,95,61,.18)",
                fontFamily: "Syne, sans-serif",
                fontWeight: 800,
                color: "var(--brand-2)",
              }}
            >
              {campaign.brandName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="heading" style={{ fontSize: "clamp(28px, 5vw, 48px)", marginBottom: 6 }}>
              {campaign.brandName}
            </h1>
            <p className="mono" style={{ color: "var(--fog)", fontSize: "clamp(14px, 2.5vw, 18px)" }}>
              invited you to talk about them
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 22 }}>
          <span
            style={{
              width: 42,
              height: 8,
              borderRadius: 999,
              background: "var(--brand)",
            }}
          />
          <span
            style={{
              width: 24,
              height: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,.12)",
            }}
          />
          <span
            style={{
              width: 24,
              height: 8,
              borderRadius: 999,
              background: "rgba(255,255,255,.12)",
            }}
          />
        </div>
      </header>

      <form
        onSubmit={handleSubmit}
        style={{
          border: "1px solid var(--ink-3)",
          borderRadius: 32,
          padding: "24px clamp(18px, 4vw, 34px)",
          background:
            "linear-gradient(180deg, rgba(17,17,24,.96), rgba(10,10,15,.98))",
          display: "grid",
          gap: 20,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.06,
            pointerEvents: "none",
            backgroundImage:
              "linear-gradient(var(--ink-3) 1px, transparent 1px), linear-gradient(90deg, var(--ink-3) 1px, transparent 1px)",
            backgroundSize: "46px 46px",
          }}
        />
        {campaign.rewardText && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 22,
              border: "1px solid rgba(255,95,61,.2)",
              background: "rgba(255,95,61,.08)",
              padding: "18px clamp(16px, 3vw, 24px)",
            }}
          >
            <p className="label" style={{ color: "var(--brand-2)", marginBottom: 8 }}>
              Reward
            </p>
            <p className="heading" style={{ fontSize: "clamp(22px, 4vw, 34px)", marginBottom: 6 }}>
              {campaign.rewardText}
            </p>
            {campaign.rewardValue && <p style={{ color: "var(--smoke)" }}>{campaign.rewardValue}</p>}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16 }}>
          <label style={{ display: "grid", gap: 8 }}>
            <span className="label" style={{ color: "var(--fog)" }}>Name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="John Doe"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid var(--ink-4)",
                background: "rgba(255,255,255,.03)",
                color: "var(--white)",
              }}
            />
          </label>
          <label style={{ display: "grid", gap: 8 }}>
            <span className="label" style={{ color: "var(--fog)" }}>Email</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              placeholder="john@example.com"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                border: "1px solid var(--ink-4)",
                background: "rgba(255,255,255,.03)",
                color: "var(--white)",
              }}
            />
          </label>
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,.06)",
            background: "rgba(255,255,255,.02)",
            padding: 16,
            color: "var(--smoke)",
          }}
        >
          We ask for your name and email only so the company can send your reward. They will not be used for anything else.
        </div>

        <div>
          <p className="label" style={{ color: "var(--fog)", marginBottom: 8 }}>
            Rating
          </p>
          <StarRating value={rating} onChange={setRating} />
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            borderRadius: 22,
            border: "1px solid var(--ink-3)",
            background: "rgba(255,255,255,.015)",
            padding: 18,
            display: "grid",
            gap: 16,
          }}
        >
          {brandQuestion && (
            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(255,255,255,.08)",
                background: "rgba(255,255,255,.02)",
                padding: "18px clamp(16px, 3vw, 24px)",
              }}
            >
              <p className="label" style={{ color: "var(--fog)", marginBottom: 8 }}>
                Question 1 of 1
              </p>
              <p className="heading" style={{ fontSize: "clamp(28px, 4.5vw, 44px)", lineHeight: 1.15 }}>
                {brandQuestion.text}
              </p>
            </div>
          )}

          <div className="campaign-recorder-shell">
            <VideoRecorder
              onRecordingComplete={handleRecordingComplete}
              maxDurationSeconds={null}
              labels={{
                idlePrompt: "Tap to enable your camera",
                enableCamera: "Enable camera",
                startRecording: "Start recording",
                stopRecording: "Stop recording",
                rerecord: "Record again",
                cameraAccessError: "We could not access your camera. Please check browser permissions.",
              }}
            />
          </div>
        </div>

        {error && (
          <div style={{ position: "relative", zIndex: 1, borderRadius: 14, padding: 14, background: "rgba(255,95,61,.08)", border: "1px solid rgba(255,95,61,.18)", color: "var(--brand-2)" }}>
            {error}
          </div>
        )}

        {isSubmitting && (
          <div
            style={{
              position: "relative",
              zIndex: 1,
              borderRadius: 16,
              border: "1px solid var(--ink-3)",
              padding: 16,
              background: "rgba(255,255,255,.02)",
            }}
          >
            <p style={{ marginBottom: 10 }}>Uploading video and saving your review...</p>
            <div style={{ width: "100%", height: 10, borderRadius: 999, background: "var(--ink-3)", overflow: "hidden" }}>
              <div
                style={{
                  width: `${uploadProgress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                }}
              />
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            padding: "18px 24px",
            borderRadius: 999,
            border: "none",
            background: isSubmitting ? "rgba(255,95,61,.5)" : "rgba(255,95,61,.28)",
            color: isSubmitting ? "rgba(240,240,245,.65)" : "rgba(240,240,245,.92)",
            fontFamily: "Syne, sans-serif",
            fontSize: "clamp(20px, 3vw, 28px)",
            fontWeight: 800,
            letterSpacing: "-0.01em",
            cursor: isSubmitting ? "wait" : "pointer",
          }}
        >
          {isSubmitting ? "Submitting..." : "Reply and get your reward →"}
        </button>

        <p
          className="mono"
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            color: "rgba(240,240,245,.24)",
            fontSize: "11px",
          }}
        >
          Powered by VR · Your video will be reviewed before publication
        </p>
      </form>

      <style>{`
        .campaign-review-form .video-recorder {
          display: grid;
          gap: 0;
          width: 100%;
          max-width: 460px;
          margin: 0 auto;
          border-radius: 26px;
          border: 1px dashed rgba(255, 255, 255, 0.14);
          background: linear-gradient(180deg, rgba(2, 3, 12, 0.98), rgba(11, 12, 22, 0.98));
          overflow: hidden;
        }

        .campaign-review-form .video-container {
          position: relative;
          width: 100%;
          max-width: none;
          aspect-ratio: 9 / 16;
          margin: 0 auto;
          border-radius: 0;
          border: none;
          background: transparent;
          overflow: hidden;
        }

        .campaign-review-form .video-element {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          background: #03040b;
        }

        .campaign-review-form .video-placeholder {
          position: absolute;
          inset: 0;
          display: grid;
          place-content: center;
          gap: 16px;
          text-align: center;
          padding: 24px;
          color: rgba(240, 240, 245, 0.42);
          cursor: pointer;
        }

        .campaign-review-form .placeholder-icon {
          width: 78px;
          height: 78px;
          margin: 0 auto;
          border-radius: 999px;
          display: grid;
          place-items: center;
          font-size: 32px;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            0 0 0 6px rgba(255, 255, 255, 0.02);
        }

        .campaign-review-form .recording-overlay {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 16px;
          background: linear-gradient(180deg, rgba(0,0,0,.32), rgba(0,0,0,0) 26%, rgba(0,0,0,.42));
          pointer-events: none;
        }

        .campaign-review-form .recording-indicator,
        .campaign-review-form .timer {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          width: fit-content;
          padding: 6px 10px;
          border-radius: 999px;
          background: rgba(10, 10, 15, 0.68);
          color: rgba(240, 240, 245, 0.88);
          font-size: 12px;
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        }

        .campaign-review-form .rec-dot,
        .campaign-review-form .rec-dot-btn {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: var(--brand);
          display: inline-block;
        }

        .campaign-review-form .progress-bar-container {
          width: 100%;
          height: 6px;
          border-radius: 999px;
          background: rgba(255,255,255,.12);
          overflow: hidden;
        }

        .campaign-review-form .progress-bar-fill.recording-progress {
          height: 100%;
          background: linear-gradient(90deg, var(--brand), var(--brand-2));
        }

        .campaign-review-form .recorder-error {
          border-radius: 14px;
          padding: 14px;
          border: 1px solid rgba(255,95,61,.18);
          background: rgba(255,95,61,.08);
          color: var(--brand-2);
        }

        .campaign-review-form .recorder-controls {
          display: flex;
          justify-content: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 18px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .campaign-review-form .btn-record,
        .campaign-review-form .btn-stop,
        .campaign-review-form .btn-secondary {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 24px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          color: var(--white);
          font-family: "Syne", sans-serif;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .campaign-review-form .btn-record {
          background: rgba(255,95,61,.14);
          border-color: rgba(255,95,61,.24);
          color: var(--brand-2);
        }

        .campaign-review-form .btn-stop {
          background: rgba(255,95,61,.88);
          border-color: rgba(255,95,61,.9);
          color: var(--pure);
        }

        @media (max-width: 760px) {
          .campaign-review-form form > div:nth-child(2) {
            grid-template-columns: 1fr !important;
          }

          .campaign-review-form .video-container {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}

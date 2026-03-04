"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import VideoRecorder from "@/components/VideoRecorder";

interface DemoModalProps {
  onClose: () => void;
}

type TutorialStepKey = "rating" | "question" | "reward" | "camera";

interface TutorialStep {
  key: TutorialStepKey;
  title: string;
  description: string;
}

interface TutorialGeometry {
  spotlight: { left: number; top: number; width: number; height: number; radius: number };
  tooltip: { left: number; top: number };
}

const tutorialSteps: TutorialStep[] = [
  {
    key: "rating",
    title: "Star Rating",
    description: "Users select their rating first. This unlocks the next step in the flow.",
  },
  {
    key: "question",
    title: "Company Question",
    description: "This is the exact prompt users answer with their video submission.",
  },
  {
    key: "reward",
    title: "Reward Preview",
    description: "Users can see what they receive once the submission gets approved.",
  },
  {
    key: "camera",
    title: "Video Recording",
    description: "Users tap here to enable camera access and start recording.",
  },
];

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

export default function DemoModal({ onClose }: DemoModalProps) {
  const modalRef = useRef<HTMLDivElement | null>(null);
  const ratingRef = useRef<HTMLElement | null>(null);
  const questionRef = useRef<HTMLElement | null>(null);
  const rewardRef = useRef<HTMLElement | null>(null);
  const cameraRef = useRef<HTMLDivElement | null>(null);

  const [rating, setRating] = useState(0);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialDismissed, setTutorialDismissed] = useState(false);
  const [tutorialGeometry, setTutorialGeometry] = useState<TutorialGeometry | null>(null);

  const brandName = "Tellr.me";
  const rewardText = "30 free Premium days";
  const rewardValue = "Sent after approval";
  const questionText = "What is the one thing you liked most about the product?";

  const initials = useMemo(() => brandName.slice(0, 2).toUpperCase(), [brandName]);
  const hasVideo = Boolean(videoBlob);
  const canOpenContact = Boolean(hasVideo);
  const stepIndex = hasVideo ? 2 : rating > 0 ? 1 : 0;
  const hasActiveTutorial = !tutorialDismissed && tutorialStep < tutorialSteps.length;
  const currentTutorialStep = hasActiveTutorial ? tutorialSteps[tutorialStep] : null;

  useEffect(() => {
    const scrollY = window.scrollY;
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.documentElement.classList.remove("no-scroll");
      document.body.classList.remove("no-scroll");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollY);
    };
  }, [onClose]);

  const resolveTutorialTarget = useCallback(
    (stepKey: TutorialStepKey): HTMLElement | null => {
      if (stepKey === "rating") {
        const stars = ratingRef.current?.querySelector<HTMLElement>(".review-stars-row");
        return stars ?? ratingRef.current;
      }

      if (stepKey === "question") {
        return questionRef.current;
      }

      if (stepKey === "reward") {
        const rewardCard = rewardRef.current?.querySelector<HTMLElement>(".invite-reward-card");
        return rewardCard ?? rewardRef.current;
      }

      const cameraButton =
        cameraRef.current?.querySelector<HTMLButtonElement>(".video-placeholder .btn.btn-primary");
      const videoContainer = cameraRef.current?.querySelector<HTMLElement>(".video-container");
      return cameraButton ?? videoContainer ?? cameraRef.current;
    },
    [],
  );

  const updateTutorialGeometry = useCallback(() => {
    if (!currentTutorialStep || !modalRef.current) {
      setTutorialGeometry(null);
      return;
    }

    const target = resolveTutorialTarget(currentTutorialStep.key);
    if (!target) {
      setTutorialGeometry(null);
      return;
    }

    const modalRect = modalRef.current.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const paddingByStep: Record<TutorialStepKey, number> = {
      rating: 6,
      question: 6,
      reward: 6,
      camera: 4,
    };
    const padding = paddingByStep[currentTutorialStep.key];
    const left = targetRect.left - modalRect.left - padding;
    const top = targetRect.top - modalRect.top - padding;
    const width = targetRect.width + padding * 2;
    const height = targetRect.height + padding * 2;
    const spotlightRadius =
      currentTutorialStep.key === "camera" && target.tagName === "BUTTON" ? 999 : 20;

    const tooltipWidth = Math.min(320, modalRect.width - 24);
    const tooltipHeight = 176;
    const tooltipGap = 14;

    let tooltipLeft = left + width + tooltipGap;
    let tooltipTop = top;

    if (tooltipLeft + tooltipWidth > modalRect.width - 12) {
      tooltipLeft = left - tooltipWidth - tooltipGap;
    }

    if (tooltipLeft < 12) {
      tooltipLeft = Math.min(Math.max((modalRect.width - tooltipWidth) / 2, 12), modalRect.width - tooltipWidth - 12);
      tooltipTop = top + height + tooltipGap;
    }

    if (tooltipTop + tooltipHeight > modalRect.height - 12) {
      tooltipTop = Math.max(top - tooltipHeight - tooltipGap, 12);
    }

    if (tooltipTop < 12) {
      tooltipTop = 12;
    }

    const maxWidth = modalRect.width - 24;
    const maxHeight = modalRect.height - 24;
    const boundedWidth = Math.min(width, maxWidth);
    const boundedHeight = Math.min(height, maxHeight);
    const boundedLeft = Math.max(12, Math.min(left, modalRect.width - boundedWidth - 12));
    const boundedTop = Math.max(12, Math.min(top, modalRect.height - boundedHeight - 12));

    setTutorialGeometry({
      spotlight: {
        left: boundedLeft,
        top: boundedTop,
        width: boundedWidth,
        height: boundedHeight,
        radius: spotlightRadius,
      },
      tooltip: {
        left: Math.max(12, Math.min(tooltipLeft, modalRect.width - tooltipWidth - 12)),
        top: tooltipTop,
      },
    });
  }, [currentTutorialStep, resolveTutorialTarget]);

  useEffect(() => {
    if (!hasActiveTutorial) {
      return;
    }

    const frame = requestAnimationFrame(updateTutorialGeometry);
    window.addEventListener("resize", updateTutorialGeometry);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateTutorialGeometry);
    };
  }, [hasActiveTutorial, updateTutorialGeometry]);

  useEffect(() => {
    if (!hasActiveTutorial) {
      return;
    }

    const frame = requestAnimationFrame(updateTutorialGeometry);
    return () => cancelAnimationFrame(frame);
  }, [hasActiveTutorial, updateTutorialGeometry, rating, videoBlob]);

  const handleTutorialNext = () => {
    setTutorialStep((current) => {
      if (current >= tutorialSteps.length - 1) {
        setTutorialDismissed(true);
        return current;
      }
      return current + 1;
    });
  };

  const handleTutorialSkip = () => {
    setTutorialDismissed(true);
  };

  const handleRecordingComplete = (blob: Blob) => {
    setVideoBlob(blob);
    setError(null);
  };

  const handleReviewContinue = () => {
    if (!videoBlob) {
      setError("Record your video to continue.");
      return;
    }

    setError(null);
    onClose();
  };

  return (
    <div className="demo-modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div ref={modalRef} className="demo-modal demo-modal-campaign">
        <button className="demo-modal-close" onClick={onClose} aria-label="Close demo modal">
          <span className="demo-modal-close-back">←</span>
          <span className="demo-modal-close-x">✕</span>
        </button>

        <>
          <header className="invite-review-head">
            <div className="invite-review-logo">{initials}</div>
            <div>
              <p className="invite-review-eyebrow">You were invited to review them</p>
              <p className="invite-review-brand">{brandName}</p>
              <p className="invite-review-sub">It takes less than 2 minutes</p>
            </div>
          </header>

          <div className="invite-review-body">
            <StepProgress step={stepIndex} />

            <div className="invite-review-layout">
              <aside className="invite-review-sidebar">
                <section ref={ratingRef}>
                  <span className="invite-review-overline">Your rating</span>
                  <CompactStarRating
                    value={rating}
                    onChange={(value) => {
                      setRating(value);
                      setError(null);
                    }}
                  />
                  <p className="invite-review-star-feedback">{ratingCopy[rating]}</p>
                </section>

                <section ref={questionRef} className="invite-question-box">
                  <span className="invite-question-label">{brandName}&apos;s question</span>
                  <p className="invite-question-text">{questionText}</p>
                </section>

                <section ref={rewardRef}>
                  <span className="invite-review-overline">Your reward</span>
                  <div className="invite-reward-card">
                    <div className="invite-reward-icon">🎁</div>
                    <div>
                      <p className="invite-reward-eyebrow">Unlocked for you</p>
                      <p className="invite-reward-title">{rewardText}</p>
                      <p className="invite-reward-sub">{rewardValue}</p>
                    </div>
                  </div>
                </section>
              </aside>

              <div className="invite-review-main">
                <section>
                  <span className="invite-review-overline">Your video answer</span>
                  <div ref={cameraRef} className="invite-recorder-shell">
                    <VideoRecorder
                      onRecordingComplete={handleRecordingComplete}
                      maxDurationSeconds={60}
                      variant="immersive"
                      labels={{
                        idlePrompt: "Click to enable your camera and start recording",
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
                    {error ||
                      (canOpenContact
                        ? "This is the final step in the demo."
                        : "Record your video to continue.")}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>

        <div className="invite-powered invite-powered-demo">
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

        {hasActiveTutorial && currentTutorialStep && tutorialGeometry && (
          <div className="demo-tour-layer" aria-live="polite">
            <div
              className="demo-tour-spotlight"
              style={{
                left: tutorialGeometry.spotlight.left,
                top: tutorialGeometry.spotlight.top,
                width: tutorialGeometry.spotlight.width,
                height: tutorialGeometry.spotlight.height,
                borderRadius: tutorialGeometry.spotlight.radius,
              }}
            />

            <aside
              className="demo-tour-tooltip"
              style={{
                left: tutorialGeometry.tooltip.left,
                top: tutorialGeometry.tooltip.top,
              }}
            >
              <span className="demo-tour-step">
                Step {tutorialStep + 1} of {tutorialSteps.length}
              </span>
              <h3>{currentTutorialStep.title}</h3>
              <p>{currentTutorialStep.description}</p>

              <div className="demo-tour-actions">
                <button type="button" className="demo-tour-skip" onClick={handleTutorialSkip}>
                  Skip
                </button>
                <button type="button" className="demo-tour-next" onClick={handleTutorialNext}>
                  Next
                </button>
              </div>
            </aside>
          </div>
        )}

      </div>

      <style>{demoCampaignModalStyles}</style>
    </div>
  );
}

const demoCampaignModalStyles = `
  .demo-modal-campaign .invite-review-head {
    padding: 16px 24px;
    border-bottom: 1px solid rgba(0,0,0,.08);
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .demo-modal-campaign .invite-review-logo {
    width: 44px;
    height: 44px;
    flex-shrink: 0;
    border-radius: 12px;
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

  .demo-modal-campaign .invite-review-eyebrow,
  .demo-modal-campaign .invite-review-overline,
  .demo-modal-campaign .review-step-label,
  .demo-modal-campaign .invite-question-label,
  .demo-modal-campaign .invite-reward-eyebrow,
  .demo-modal-campaign .invite-contact-label {
    font-size: 10px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: .1em;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .demo-modal-campaign .invite-review-eyebrow {
    color: #a0a0a0;
    margin: 0 0 4px;
  }

  .demo-modal-campaign .invite-review-brand {
    margin: 0;
    font-size: 18px;
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -0.04em;
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-review-sub {
    margin: 2px 0 0;
    font-size: 11px;
    font-weight: 600;
    color: #a0a0a0;
  }

  .demo-modal-campaign .invite-review-body,
  .demo-modal-campaign .invite-contact-screen,
  .demo-modal-campaign .invite-success-screen {
    padding: 24px;
  }

  .demo-modal-campaign .invite-review-body,
  .demo-modal-campaign .invite-contact-screen {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .demo-modal-campaign .invite-review-layout {
    display: grid;
    gap: 22px;
  }

  .demo-modal-campaign .invite-review-sidebar,
  .demo-modal-campaign .invite-review-main {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .demo-modal-campaign .review-step-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .demo-modal-campaign .review-step-track {
    flex: 1;
    display: flex;
    gap: 4px;
  }

  .demo-modal-campaign .review-step-seg {
    height: 3px;
    flex: 1;
    border-radius: 999px;
    background: #efede9;
  }

  .demo-modal-campaign .review-step-seg.done {
    background: var(--brand);
    opacity: .3;
  }

  .demo-modal-campaign .review-step-seg.active {
    background: var(--brand);
    flex: 2;
  }

  .demo-modal-campaign .review-step-label {
    color: #a0a0a0;
    white-space: nowrap;
  }

  .demo-modal-campaign .invite-review-overline {
    display: block;
    color: #a0a0a0;
    margin-bottom: 8px;
  }

  .demo-modal-campaign .review-stars-row {
    display: flex;
    gap: 8px;
  }

  .demo-modal-campaign .review-star-tile {
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

  .demo-modal-campaign .review-star-tile:hover,
  .demo-modal-campaign .review-star-tile.lit {
    filter: none;
    background: #fffbeb;
    border-color: #fcd34d;
    transform: scale(1.04);
  }

  .demo-modal-campaign .review-star-tile.sel {
    filter: none;
    background: #fef3c7;
    border-color: #f59e0b;
    box-shadow: 0 2px 10px rgba(245,158,11,.2);
    transform: scale(1.04);
  }

  .demo-modal-campaign .invite-review-star-feedback {
    min-height: 20px;
    margin: 8px 0 0;
    font-size: 13px;
    font-weight: 500;
    color: #6b6b6b;
  }

  .demo-modal-campaign .invite-question-box {
    background: #fff0ec;
    border: 1.5px solid #ffd5c8;
    border-radius: 20px;
    padding: 16px;
  }

  .demo-modal-campaign .invite-question-label {
    display: block;
    margin-bottom: 6px;
    color: rgba(255,92,53,.65);
  }

  .demo-modal-campaign .invite-question-text {
    margin: 0;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.35;
    letter-spacing: -0.03em;
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-reward-card {
    background: linear-gradient(135deg, #fffbf0 0%, #fff6e8 60%, #fff0ec 100%);
    border: 1.5px solid rgba(245,158,11,.22);
    border-radius: 20px;
    padding: 16px;
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .demo-modal-campaign .invite-reward-icon {
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

  .demo-modal-campaign .invite-reward-eyebrow {
    margin: 0 0 4px;
    color: rgba(146,64,14,.55);
  }

  .demo-modal-campaign .invite-reward-title {
    margin: 0 0 2px;
    font-size: 16px;
    font-weight: 900;
    line-height: 1.2;
    letter-spacing: -0.03em;
    color: #92400e;
  }

  .demo-modal-campaign .invite-reward-sub {
    margin: 0;
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    color: rgba(146,64,14,.55);
  }

  .demo-modal-campaign .invite-recorder-shell {
    width: 100%;
    max-width: 560px;
    margin: 0 auto;
  }

  .demo-modal-campaign .invite-recorder-shell .video-recorder {
    display: grid;
    gap: 12px;
  }

  .demo-modal-campaign .invite-recorder-shell .video-container {
    width: 100%;
    aspect-ratio: 4 / 5;
    border-radius: 20px;
    overflow: hidden;
    background: #0f0f0f;
    border: 1px solid rgba(255,255,255,.08);
  }

  .demo-modal-campaign .invite-recorder-shell .video-element {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .demo-modal-campaign .invite-recorder-shell .video-placeholder {
    width: 100%;
    height: 100%;
    display: grid;
    place-items: center;
    gap: 12px;
    padding: 24px;
    color: rgba(255,255,255,.72);
    text-align: center;
  }

  .demo-modal-campaign .invite-recorder-shell .video-placeholder::before {
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

  .demo-modal-campaign .invite-recorder-shell .video-placeholder p {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
  }

  .demo-modal-campaign .invite-recorder-shell .control-bar {
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,.08);
    background: #f7f6f4;
    padding: 10px 12px;
  }

  .demo-modal-campaign .invite-recorder-shell .control-info {
    font-size: 11px;
    color: #6b6b6b;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .demo-modal-campaign .invite-recorder-shell .record-button,
  .demo-modal-campaign .invite-recorder-shell .action-button {
    border-radius: 999px;
  }

  .demo-modal-campaign .invite-recorder-shell .record-button {
    width: 54px;
    height: 54px;
  }

  .demo-modal-campaign .invite-recorder-shell .record-button .record-button-inner {
    width: 24px;
    height: 24px;
  }

  .demo-modal-campaign .invite-review-main .invite-submit-btn,
  .demo-modal-campaign .invite-review-main .invite-submit-hint {
    max-width: 560px;
    margin-left: auto;
    margin-right: auto;
  }

  .demo-modal-campaign .invite-submit-btn {
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
    cursor: pointer;
  }

  .demo-modal-campaign .invite-submit-btn:not(:disabled):hover {
    filter: brightness(1.08);
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(255,92,53,.35);
  }

  .demo-modal-campaign .invite-submit-btn:disabled {
    background: #efede9;
    color: #d0d0d0;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }

  .demo-modal-campaign .invite-submit-arrow {
    transition: transform 180ms ease;
  }

  .demo-modal-campaign .invite-submit-btn:not(:disabled):hover .invite-submit-arrow {
    transform: translateX(3px);
  }

  .demo-modal-campaign .invite-submit-hint {
    min-height: 18px;
    margin: 8px 0 0;
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: #a0a0a0;
  }

  .demo-modal-campaign .invite-submit-hint.warn {
    color: #dc2626;
  }

  .demo-modal-campaign .invite-back-btn {
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
  }

  .demo-modal-campaign .invite-back-btn:hover {
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-contact-title {
    margin: 0 0 6px;
    font-size: 22px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-contact-sub,
  .demo-modal-campaign .invite-privacy-body,
  .demo-modal-campaign .invite-contact-hint,
  .demo-modal-campaign .invite-success-body {
    margin: 0;
    font-size: 14px;
    font-weight: 500;
    line-height: 1.55;
    color: #6b6b6b;
  }

  .demo-modal-campaign .invite-privacy-box {
    background: #fff0ec;
    border: 1.5px solid #ffd5c8;
    border-radius: 20px;
    padding: 16px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
  }

  .demo-modal-campaign .invite-privacy-icon {
    font-size: 18px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .demo-modal-campaign .invite-privacy-title {
    margin: 0 0 4px;
    font-size: 14px;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-contact-fields {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .demo-modal-campaign .invite-contact-field {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .demo-modal-campaign .invite-contact-label {
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-contact-input {
    width: 100%;
    padding: 10px 14px;
    border-radius: 16px;
    border: 1.5px solid rgba(0,0,0,.14);
    background: #fff;
    color: #0f0f0f;
    font-size: 14px;
    font-family: "Figtree", sans-serif;
    outline: none;
  }

  .demo-modal-campaign .invite-contact-input:focus {
    border-color: var(--brand);
    box-shadow: 0 0 0 3px #fff0ec;
  }

  .demo-modal-campaign .invite-contact-input.err {
    border-color: #dc2626;
  }

  .demo-modal-campaign .invite-contact-input.err:focus {
    box-shadow: 0 0 0 3px #fef2f2;
  }

  .demo-modal-campaign .invite-contact-hint {
    font-size: 12px;
    color: #a0a0a0;
  }

  .demo-modal-campaign .invite-success-screen {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
    padding: 56px 24px 44px;
  }

  .demo-modal-campaign .invite-success-icon {
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

  .demo-modal-campaign .invite-success-title {
    margin: 0;
    font-size: 28px;
    line-height: 1.1;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: #0f0f0f;
  }

  .demo-modal-campaign .invite-powered {
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

  .demo-modal-campaign .invite-powered-mark {
    display: inline-flex;
    align-items: center;
    line-height: 1;
  }

  .demo-modal-campaign .invite-powered-logo {
    display: block;
    height: 16px;
    width: auto;
    max-width: 84px;
  }

  .demo-modal-campaign .invite-powered-demo {
    margin: 14px 0 16px;
  }

  .demo-modal-campaign .demo-tour-layer {
    position: absolute;
    inset: 0;
    z-index: 40;
    pointer-events: none;
    border-radius: 32px;
    overflow: hidden;
  }

  .demo-modal-campaign .demo-tour-spotlight {
    position: absolute;
    border-radius: 20px;
    border: 2px solid rgba(255, 92, 53, 0.92);
    box-shadow:
      0 0 0 999px rgba(9, 10, 16, 0.56),
      0 0 0 4px rgba(255, 92, 53, 0.18);
    transition: all 220ms ease;
    pointer-events: none;
  }

  .demo-modal-campaign .demo-tour-tooltip {
    position: absolute;
    z-index: 2;
    width: min(320px, calc(100% - 24px));
    border-radius: 18px;
    border: 1px solid rgba(255,255,255,.22);
    background: linear-gradient(160deg, rgba(13, 15, 24, 0.96), rgba(26, 20, 19, 0.96));
    box-shadow: 0 18px 40px rgba(0,0,0,.42);
    color: #f8f8f8;
    padding: 16px 16px 14px;
    pointer-events: auto;
  }

  .demo-modal-campaign .demo-tour-step {
    display: inline-flex;
    margin-bottom: 8px;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: .1em;
    text-transform: uppercase;
    color: rgba(255,255,255,.6);
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .demo-modal-campaign .demo-tour-tooltip h3 {
    margin: 0 0 6px;
    font-size: 18px;
    line-height: 1.15;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #fff;
  }

  .demo-modal-campaign .demo-tour-tooltip p {
    margin: 0;
    font-size: 13px;
    line-height: 1.45;
    color: rgba(255,255,255,.8);
  }

  .demo-modal-campaign .demo-tour-actions {
    margin-top: 14px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .demo-modal-campaign .demo-tour-skip,
  .demo-modal-campaign .demo-tour-next {
    border: none;
    border-radius: 999px;
    padding: 8px 14px;
    font-size: 12px;
    font-weight: 700;
    cursor: pointer;
    transition: transform 160ms ease, filter 160ms ease, background 160ms ease;
  }

  .demo-modal-campaign .demo-tour-skip {
    background: rgba(255,255,255,.12);
    color: rgba(255,255,255,.88);
  }

  .demo-modal-campaign .demo-tour-next {
    background: var(--brand);
    color: #fff;
  }

  .demo-modal-campaign .demo-tour-skip:hover,
  .demo-modal-campaign .demo-tour-next:hover {
    transform: translateY(-1px);
    filter: brightness(1.04);
  }

  @media (min-width: 900px) {
    .demo-modal-campaign .invite-review-layout {
      grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
      align-items: start;
    }

    .demo-modal-campaign .invite-contact-screen,
    .demo-modal-campaign .invite-success-screen {
      max-width: 760px;
      margin: 0 auto;
    }

    .demo-modal-campaign .invite-contact-fields {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
  }

  @media (max-width: 600px) {
    .demo-modal-campaign .demo-modal-close {
      top: calc(env(safe-area-inset-top, 0px) + 10px);
      right: 10px;
      left: auto;
      width: 36px;
      height: 36px;
      font-size: 15px;
    }

    .demo-modal-campaign .demo-modal-close-back {
      display: none;
    }

    .demo-modal-campaign .demo-modal-close-x {
      display: inline;
    }

    .demo-modal-campaign .invite-review-head,
    .demo-modal-campaign .invite-review-body,
    .demo-modal-campaign .invite-contact-screen,
    .demo-modal-campaign .invite-success-screen {
      padding-left: 16px;
      padding-right: 16px;
    }

    .demo-modal-campaign .demo-tour-tooltip {
      width: min(300px, calc(100% - 24px));
    }

  }
`;

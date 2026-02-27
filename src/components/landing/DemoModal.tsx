"use client";

import { useEffect, useRef, useState } from "react";

interface DemoModalProps {
  onClose: () => void;
}

type RecorderState = "idle" | "previewing" | "recording" | "recorded";
type TutorialStep = 0 | 1 | 2;

interface TutorialGeometry {
  spotlight: { left: number; top: number; width: number; height: number };
  card: { left: number; top: number; caret: "caret-top" | "caret-bottom" | "caret-left" };
  arrow: { d: string; color: string };
}

export default function DemoModal({ onClose }: DemoModalProps) {
  const [recorderState, setRecorderState] = useState<RecorderState>("idle");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep>(1);
  const [tutorialGeometry, setTutorialGeometry] = useState<TutorialGeometry | null>(null);

  const modalRef = useRef<HTMLDivElement>(null);
  const rewardRef = useRef<HTMLDivElement>(null);
  const questionRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const scrollYRef = useRef(0);

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    scrollYRef.current = window.scrollY;
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollYRef.current}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      stopTimer();
      stopStream();
      document.documentElement.classList.remove("no-scroll");
      document.body.classList.remove("no-scroll");
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";
      window.scrollTo(0, scrollYRef.current);
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (tutorialStep === 0) {
      return;
    }

    const renderTutorialStep = () => {
      if (!modalRef.current) return;
      const target = tutorialStep === 1 ? rewardRef.current : questionRef.current;
      if (!target) return;

      const modalRect = modalRef.current.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const pad = 6;
      const spotLeft = targetRect.left - modalRect.left - pad;
      const spotTop = targetRect.top - modalRect.top - pad;
      const spotWidth = targetRect.width + pad * 2;
      const spotHeight = targetRect.height + pad * 2;

      const cardW = 248;
      const cardH = 170;
      const gap = 18;
      const modalInnerW = modalRect.width;
      const modalInnerH = modalRect.height;
      let cardLeft = 12;
      let cardTop = 12;
      let caret: "caret-top" | "caret-bottom" | "caret-left" = "caret-bottom";

      if (tutorialStep === 1) {
        cardLeft = Math.max(12, spotLeft);
        cardTop = spotTop - cardH - gap;
        caret = "caret-bottom";
        if (cardTop < 12) {
          cardTop = spotTop + spotHeight + gap;
          caret = "caret-top";
        }
        if (cardLeft + cardW > modalInnerW - 12) {
          cardLeft = modalInnerW - cardW - 12;
        }
      } else {
        cardLeft = modalInnerW - cardW - 14;
        cardTop = spotTop + spotHeight / 2 - cardH / 2;
        caret = "caret-left";
        if (cardLeft < 12) {
          cardLeft = Math.max(12, spotLeft);
          cardTop = spotTop - cardH - gap;
          caret = "caret-bottom";
        }
        cardTop = Math.max(12, Math.min(cardTop, modalInnerH - cardH - 12));
      }

      let sx = 0;
      let sy = 0;
      let ex = 0;
      let ey = 0;

      if (caret === "caret-bottom") {
        sx = cardLeft + 28;
        sy = cardTop + cardH + 4;
        ex = spotLeft + spotWidth * 0.25;
        ey = spotTop - 4;
      } else if (caret === "caret-top") {
        sx = cardLeft + 28;
        sy = cardTop - 4;
        ex = spotLeft + spotWidth * 0.25;
        ey = spotTop + spotHeight + 4;
      } else {
        sx = cardLeft - 4;
        sy = cardTop + cardH / 2;
        ex = spotLeft + spotWidth + 4;
        ey = spotTop + spotHeight / 2;
      }

      const dx = ex - sx;
      const dy = ey - sy;
      const cp1x = sx + dx * 0.1;
      const cp1y = sy + dy * 0.45;
      const cp2x = sx + dx * 0.6;
      const cp2y = ey - dy * 0.15;
      const d = `M ${sx} ${sy} C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${ex} ${ey}`;

      setTutorialGeometry({
        spotlight: { left: spotLeft, top: spotTop, width: spotWidth, height: spotHeight },
        card: { left: cardLeft, top: cardTop, caret },
        arrow: { d, color: tutorialStep === 1 ? "#FF5C35" : "#FFB347" },
      });
    };

    const timer = window.setTimeout(renderTutorialStep, 120);
    window.addEventListener("resize", renderTutorialStep);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("resize", renderTutorialStep);
    };
  }, [tutorialStep]);

  useEffect(() => {
    return () => {
      if (recordedVideoUrl) {
        URL.revokeObjectURL(recordedVideoUrl);
      }
    };
  }, [recordedVideoUrl]);

  const startCamera = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true,
      });

      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      await videoRef.current.play();
      setRecorderState("previewing");
    } catch {
      setError("Impossibile accedere alla fotocamera. Verifica i permessi del browser.");
    }
  };

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    setDurationSeconds(0);
    setError(null);
    setRecorderState("recording");

    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
        ? "video/webm;codecs=vp8,opus"
        : "video/webm";

    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      stopTimer();
      stopStream();

      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordedVideoUrl(url);
      setRecorderState("recorded");

      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = url;
        videoRef.current.controls = true;
        videoRef.current.muted = false;
      }
    };

    recorder.start(250);
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      setDurationSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  };

  const handleRecordToggle = () => {
    if (recorderState === "recording") {
      stopRecording();
      return;
    }
    startRecording();
  };

  const handleRetake = async () => {
    if (recordedVideoUrl) {
      URL.revokeObjectURL(recordedVideoUrl);
    }
    setRecordedVideoUrl(null);
    setRecorderState("idle");
    await startCamera();
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitted(true);
      setIsSubmitting(false);
    }, 700);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const controlsHint =
    recorderState === "recording"
      ? "Registrazione in corso..."
      : recorderState === "recorded"
        ? "Video registrato"
        : "Premi ● per iniziare";

  const tutorialCopy =
    tutorialStep === 1
      ? {
          badge: "Nota per te · 1 di 2",
          text: "Il reward al cliente e` completamente facoltativo — puoi invitarlo senza offrire nulla.",
          next: "Avanti",
          icon: "→",
        }
      : {
          badge: "Nota per te · 2 di 2",
          text: "Fai una domanda al cliente o lascia a lui decidere di cosa parlare.",
          next: "Inizia la demo",
          icon: "✓",
        };
  const tutorialVisible = tutorialStep > 0 && !isSubmitted;

  return (
    <div className="demo-modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="demo-modal" ref={modalRef}>
        <button className="demo-modal-close" onClick={onClose} aria-label="Close demo modal">
          ✕
        </button>

        {isSubmitted && (
          <div className="demo-modal-success">
            <h3>Grazie per la risposta</h3>
            <p>Esperienza completata: questo e` il flusso che vedra` il tuo cliente.</p>
            <button className="btn btn-ghost" onClick={onClose}>Chiudi demo</button>
          </div>
        )}

        <div className="demo-modal-header">
          <div className="demo-modal-brand-logo">AC</div>
          <div>
            <div className="demo-modal-brand-name">ACME Corp</div>
            <div className="demo-modal-brand-sub">ti ha invitato a parlare di loro</div>
          </div>
        </div>

        <div className="demo-modal-steps">
          <div className={`demo-step-dot ${recorderState === "idle" ? "active" : "done"}`}></div>
          <div className={`demo-step-dot ${recorderState === "previewing" || recorderState === "recording" ? "active" : recorderState === "recorded" ? "done" : "next"}`}></div>
          <div className={`demo-step-dot ${recorderState === "recorded" ? "active" : "next"}`}></div>
        </div>

        <div className="demo-reward-hint" ref={rewardRef}>
          <div className="demo-reward-icon">🎁</div>
          <div>
            <div className="demo-reward-title">Rispondi e ricevi 30 giorni Premium gratis</div>
            <div className="demo-reward-sub">Il reward viene inviato subito dopo la pubblicazione del video</div>
          </div>
        </div>

        <div className="demo-modal-question-box" ref={questionRef}>
          <div className="demo-modal-question-label">Domanda 1 di 1</div>
          <div className="demo-modal-question-text">
            Qual e` l&apos;<span className="demo-accent-1">elemento</span> che piu` hai{" "}
            <span className="demo-accent-2">apprezzato</span> del prodotto?
          </div>
        </div>

        <div className="demo-recorder">
          <div className="demo-recorder-video-wrap">
            <video
              ref={videoRef}
              className="demo-recorder-video"
              playsInline
              autoPlay={recorderState !== "recorded"}
            />

            {recorderState === "idle" && (
              <div className="demo-recorder-empty">
                <div className="demo-recorder-avatar">🎙</div>
                <p>
                  Clicca per attivare la fotocamera
                  <br />
                  e iniziare a registrare
                </p>
                <button className="demo-camera-btn" onClick={startCamera}>Attiva fotocamera</button>
              </div>
            )}

            {recorderState === "recording" && (
              <div className="demo-recorder-rec-badge">
                <span className="demo-rec-dot"></span>
                REC {formatTime(durationSeconds)}
              </div>
            )}
          </div>

          <div className="demo-controls-bar">
            <div className="demo-controls-left">
              <button className="demo-ctrl-btn" type="button" aria-label="Microfono">🎙</button>
              <button className="demo-ctrl-btn" type="button" aria-label="Fotocamera">📷</button>
              <span className="demo-controls-hint">{controlsHint}</span>
            </div>
            {(recorderState === "previewing" || recorderState === "recording") && (
              <button className={`demo-record-btn ${recorderState === "recording" ? "recording" : ""}`} onClick={handleRecordToggle}>
                <span className="demo-record-btn-inner"></span>
              </button>
            )}
            {recorderState === "recorded" && (
              <button className="demo-retake-btn" onClick={handleRetake}>Riregistra</button>
            )}
          </div>
          <div className="demo-recorder-actions">
            {error && <p className="demo-recorder-error">{error}</p>}
          </div>
        </div>

        <button
          className="demo-submit-btn"
          onClick={handleSubmit}
          disabled={recorderState !== "recorded" || isSubmitting}
        >
          {isSubmitting ? "Invio in corso..." : "Rispondi e ricevi il tuo reward  →"}
        </button>
        <p className="demo-fine-print">Powered by VR · Il tuo video sara` revisionato prima della pubblicazione</p>

        {tutorialVisible && tutorialGeometry && (
          <div className="demo-tutorial-layer">
            <div
              className="demo-t-spotlight"
              style={{
                left: tutorialGeometry.spotlight.left,
                top: tutorialGeometry.spotlight.top,
                width: tutorialGeometry.spotlight.width,
                height: tutorialGeometry.spotlight.height,
              }}
            ></div>

            <svg className="demo-t-arrow">
              <defs>
                <marker id="demo-t-arrow-head" markerWidth="7" markerHeight="7" refX="3.5" refY="3.5" orient="auto">
                  <path d="M0.5,0.5 L6.5,3.5 L0.5,6.5 Z" fill={tutorialGeometry.arrow.color} opacity=".85" />
                </marker>
              </defs>
              <path
                d={tutorialGeometry.arrow.d}
                stroke={tutorialGeometry.arrow.color}
                strokeWidth="1.6"
                strokeDasharray="5 4"
                fill="none"
                opacity=".8"
                markerEnd="url(#demo-t-arrow-head)"
              />
            </svg>

            <div
              className={`demo-t-card visible ${tutorialGeometry.card.caret}`}
              style={{ left: tutorialGeometry.card.left, top: tutorialGeometry.card.top }}
            >
              <div className="demo-t-card-inner">
                <div className="demo-t-step-badge">{tutorialCopy.badge}</div>
                <div className="demo-t-progress">
                  <div className={`demo-t-prog-dot ${tutorialStep === 1 ? "active" : "done"}`}></div>
                  <div className={`demo-t-prog-dot ${tutorialStep === 2 ? "active" : ""}`}></div>
                </div>
                <div className="demo-t-card-text">{tutorialCopy.text}</div>
                <div className="demo-t-actions">
                  <button className="demo-t-skip" onClick={() => setTutorialStep(0)}>Salta</button>
                  <button className="demo-t-next" onClick={() => setTutorialStep(tutorialStep === 1 ? 2 : 0)}>
                    <span>{tutorialCopy.next}</span>
                    <span className="demo-t-next-icon">{tutorialCopy.icon}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

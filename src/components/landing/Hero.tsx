"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import DemoModal from "@/components/landing/DemoModal";

function formatTime(seconds: number) {
    if (!Number.isFinite(seconds) || seconds <= 0) {
        return "0:00";
    }

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60)
        .toString()
        .padStart(2, "0");

    return `${mins}:${secs}`;
}

export default function Hero() {
    const [demoOpen, setDemoOpen] = useState(false);
    const [founderOpen, setFounderOpen] = useState(false);
    const [founderPlaying, setFounderPlaying] = useState(false);
    const [founderMuted, setFounderMuted] = useState(false);
    const [founderProgress, setFounderProgress] = useState(0);
    const [founderTime, setFounderTime] = useState(0);
    const [founderDuration, setFounderDuration] = useState(0);
    const founderVideoRef = useRef<HTMLVideoElement>(null);

    const closeFounderModal = () => {
        const video = founderVideoRef.current;

        if (video) {
            video.pause();
            video.currentTime = 0;
        }

        setFounderPlaying(false);
        setFounderProgress(0);
        setFounderTime(0);
        setFounderOpen(false);
    };

    const toggleFounderPlayback = () => {
        const video = founderVideoRef.current;

        if (!video) {
            return;
        }

        if (video.paused || video.ended) {
            void video.play();
            return;
        }

        video.pause();
    };

    const toggleFounderMute = () => {
        const video = founderVideoRef.current;

        if (!video) {
            return;
        }

        video.muted = !video.muted;
    };

    const handleFounderScrub = (event: MouseEvent<HTMLDivElement>) => {
        const video = founderVideoRef.current;

        if (!video || !video.duration) {
            return;
        }

        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
        video.currentTime = ratio * video.duration;
    };

    useEffect(() => {
        if (!demoOpen && !founderOpen) {
            return;
        }

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                setDemoOpen(false);
                closeFounderModal();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [demoOpen, founderOpen]);

    useEffect(() => {
        const video = founderVideoRef.current;

        if (!video || !founderOpen) {
            return;
        }

        const syncPlayback = () => {
            const duration = video.duration || 0;

            setFounderPlaying(!video.paused && !video.ended);
            setFounderMuted(video.muted);
            setFounderDuration(duration);
            setFounderTime(video.currentTime || 0);
            setFounderProgress(duration > 0 ? (video.currentTime / duration) * 100 : 0);
        };

        const handleEnded = () => {
            setFounderPlaying(false);
            setFounderProgress(100);
        };

        video.addEventListener("timeupdate", syncPlayback);
        video.addEventListener("loadedmetadata", syncPlayback);
        video.addEventListener("play", syncPlayback);
        video.addEventListener("pause", syncPlayback);
        video.addEventListener("volumechange", syncPlayback);
        video.addEventListener("ended", handleEnded);

        syncPlayback();

        return () => {
            video.removeEventListener("timeupdate", syncPlayback);
            video.removeEventListener("loadedmetadata", syncPlayback);
            video.removeEventListener("play", syncPlayback);
            video.removeEventListener("pause", syncPlayback);
            video.removeEventListener("volumechange", syncPlayback);
            video.removeEventListener("ended", handleEnded);
        };
    }, [founderOpen]);

    return (
        <>
            <section className="landing-hero">
                <button
                    type="button"
                    className="landing-hero-badge landing-hero-badge-button"
                    onClick={() => setFounderOpen(true)}
                >
                    <span className="landing-hero-badge-dot">💬</span>
                    A message from the founder
                </button>

                <h1 className="landing-hero-title">
                    Your customers
                    <br />
                    have a <em>story</em>
                    <br />
                    to tell.
                </h1>

                <p className="landing-hero-sub">
                    Invite them, offer a reward, collect their video. The most
                    convincing social proof you&apos;ll ever have.
                </p>

                <div className="landing-hero-cta">
                    <a href="#cta" className="landing-hero-primary">
                        Join the waitlist <span aria-hidden="true">&rarr;</span>
                    </a>
                    <button
                        type="button"
                        className="landing-hero-secondary"
                        onClick={() => setDemoOpen(true)}
                    >
                        See a demo
                    </button>
                </div>

                <p className="landing-hero-proof">
                    No credit card required · 14-day free trial
                </p>
            </section>

            {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}

            {founderOpen && (
                <div
                    className="hero-founder-modal-overlay"
                    onClick={closeFounderModal}
                    role="presentation"
                >
                    <div
                        className="hero-founder-modal"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="A message from the founder"
                    >
                        <button
                            type="button"
                            className="hero-founder-modal-close"
                            onClick={closeFounderModal}
                            aria-label="Close founder message"
                        >
                            ✕
                        </button>
                        <div className="hero-founder-modal-label">A message from the founder</div>
                        <div className="hero-founder-modal-video-wrap">
                            <video
                                ref={founderVideoRef}
                                className="hero-founder-modal-video"
                                src="/welcome-from-founder.mp4"
                                playsInline
                                preload="metadata"
                                onClick={toggleFounderPlayback}
                            />

                            <div className="hero-founder-modal-player">
                                <button
                                    type="button"
                                    className="hero-founder-modal-control"
                                    onClick={toggleFounderPlayback}
                                    aria-label={founderPlaying ? "Pause founder video" : "Play founder video"}
                                >
                                    {founderPlaying ? "⏸️" : "▶️"}
                                </button>

                                <div
                                    className="hero-founder-modal-progress"
                                    onClick={handleFounderScrub}
                                    role="progressbar"
                                    aria-label="Founder video progress"
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={Math.round(founderProgress)}
                                >
                                    <span
                                        className="hero-founder-modal-progress-fill"
                                        style={{ width: `${founderProgress}%` }}
                                    />
                                </div>

                                <span className="hero-founder-modal-time">
                                    {formatTime(founderTime)} / {formatTime(founderDuration)}
                                </span>

                                <button
                                    type="button"
                                    className="hero-founder-modal-control"
                                    onClick={toggleFounderMute}
                                    aria-label={founderMuted ? "Unmute founder video" : "Mute founder video"}
                                >
                                    {founderMuted ? "🔇" : "🔊"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

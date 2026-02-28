"use client";

import { useEffect, useRef, useState } from "react";
import DemoModal from "@/components/landing/DemoModal";

export default function Hero() {
    const [demoOpen, setDemoOpen] = useState(false);
    const [founderModalOpen, setFounderModalOpen] = useState(false);
    const [founderPlaying, setFounderPlaying] = useState(false);
    const [founderMuted, setFounderMuted] = useState(false);
    const [founderProgress, setFounderProgress] = useState(0);
    const founderVideoRef = useRef<HTMLVideoElement>(null);
    const founderModalVideoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = founderVideoRef.current;
        if (!video) return;

        const syncState = () => {
            const duration = video.duration || 0;
            setFounderPlaying(!video.paused && !video.ended);
            setFounderMuted(video.muted);
            setFounderProgress(duration > 0 ? (video.currentTime / duration) * 100 : 0);
        };

        const handleEnded = () => {
            setFounderPlaying(false);
            setFounderProgress(100);
        };

        video.addEventListener("timeupdate", syncState);
        video.addEventListener("play", syncState);
        video.addEventListener("pause", syncState);
        video.addEventListener("volumechange", syncState);
        video.addEventListener("loadedmetadata", syncState);
        video.addEventListener("ended", handleEnded);

        syncState();

        return () => {
            video.removeEventListener("timeupdate", syncState);
            video.removeEventListener("play", syncState);
            video.removeEventListener("pause", syncState);
            video.removeEventListener("volumechange", syncState);
            video.removeEventListener("loadedmetadata", syncState);
            video.removeEventListener("ended", handleEnded);
        };
    }, []);

    useEffect(() => {
        if (!founderModalOpen) {
            if (founderModalVideoRef.current) {
                founderModalVideoRef.current.pause();
            }
            return;
        }

        document.documentElement.classList.add("no-scroll");
        document.body.classList.add("no-scroll");

        return () => {
            document.documentElement.classList.remove("no-scroll");
            document.body.classList.remove("no-scroll");
        };
    }, [founderModalOpen]);

    const toggleFounderPlayback = async () => {
        const video = founderVideoRef.current;
        if (!video) return;

        if (video.paused || video.ended) {
            if (video.ended) {
                video.currentTime = 0;
            }

            try {
                await video.play();
            } catch {
                // Ignore autoplay/playback rejections from the browser.
            }
            return;
        }

        video.pause();
    };

    const toggleFounderAudio = () => {
        const video = founderVideoRef.current;
        if (!video) return;

        video.muted = !video.muted;
        setFounderMuted(video.muted);
    };

    return (
        <>
        <section className="hero">
            <div className="hero-bg">
                <div className="hero-grid"></div>
                <div className="hero-blob hero-blob-1"></div>
                <div className="hero-blob hero-blob-2"></div>
            </div>

            <div className="wrap" style={{ display: 'flex', alignItems: 'center', gap: 'var(--s8)', position: 'relative' }}>
                <div className="hero-content">
                    <div className="tag hero-tag hero-tag-desktop reveal visible" style={{ transitionDelay: '0.1s' }}>
                        <span className="tag-dot animate-pulse"></span>
                        Video Review Platform
                    </div>
                    <button
                        type="button"
                        className="hero-founder-mobile-trigger reveal visible"
                        onClick={() => setFounderModalOpen(true)}
                    >
                        ▶️ Watch the Welcome from the Founder
                    </button>
                    <h1 className="display hero-title reveal visible" style={{ transitionDelay: '0.2s' }}>
                        Collect <em className="animate-shimmer">video reviews</em><br />
                        and reward your clients
                    </h1>
                    <p className="hero-sub reveal visible" style={{ transitionDelay: '0.3s' }}>
                        Invite your customers, offer a tailored <strong>reward</strong>{" "}
                        and transform their voice into irresistible social proof.
                        No scripts, no fiction &mdash; just truth that converts.
                    </p>
                    <div className="hero-actions reveal visible">
                        <a href="#cta" className="btn btn-primary btn-lg">Join the Waitlist <span style={{ opacity: 0.7 }}>&rarr;</span></a>
                        <button type="button" className="btn btn-ghost btn-lg" onClick={() => setDemoOpen(true)}>
                            View demo
                        </button>
                    </div>
                    <div className="hero-note reveal visible">
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        No credit card required &nbsp;&middot;&nbsp; Unlimited integrations via Webhooks
                    </div>
                </div>

                {/* Hero visual mockup */}
                <div className="hero-visual animate-float">
                    <div style={{ background: 'var(--ink-2)', border: '1px solid var(--ink-3)', borderRadius: 'var(--r4)', padding: '28px 16px 24px', boxShadow: 'var(--shadow-lg)', maxWidth: '420px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '18px', padding: '0 10px' }}>
                            <span className="label" style={{ color: 'var(--fog)', fontSize: '10px' }}>Welcome from the founder</span>
                        </div>
                        <div style={{ width: '100%', maxWidth: '320px', margin: '0 auto 22px' }}>
                            <div style={{ background: '#000', borderRadius: '18px', aspectRatio: '9/16', position: 'relative', overflow: 'hidden' }}>
                                <video
                                    ref={founderVideoRef}
                                    src="/welcome-from-founder.mp4"
                                    playsInline
                                    preload="metadata"
                                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', background: '#000' }}
                                />
                                <div
                                    style={{
                                        position: 'absolute',
                                        left: '0',
                                        right: '0',
                                        bottom: '0',
                                        padding: '10px 12px 12px',
                                        background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,.15) 18%, rgba(0,0,0,.72) 100%)',
                                    }}
                                >
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,.18)', borderRadius: '999px', overflow: 'hidden', marginBottom: '10px' }}>
                                        <div style={{ width: `${founderProgress}%`, height: '100%', background: 'var(--brand)', borderRadius: '999px' }}></div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <button
                                            type="button"
                                            onClick={toggleFounderPlayback}
                                            aria-label={founderPlaying ? 'Pause founder video' : 'Play founder video'}
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(255,95,61,.45)',
                                                background: 'rgba(255,95,61,.18)',
                                                color: '#fff',
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {founderPlaying ? '⏸️' : '▶️'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={toggleFounderAudio}
                                            aria-label={founderMuted ? 'Unmute founder video' : 'Mute founder video'}
                                            style={{
                                                width: '38px',
                                                height: '38px',
                                                borderRadius: '50%',
                                                border: '1px solid rgba(255,95,61,.45)',
                                                background: 'rgba(255,95,61,.18)',
                                                color: '#fff',
                                                display: 'grid',
                                                placeItems: 'center',
                                                fontSize: '16px',
                                                cursor: 'pointer',
                                            }}
                                        >
                                            {founderMuted ? '🔇' : '🔊'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '320px', margin: '0 auto', padding: '0 4px' }}>
                            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--brand),#7B4FFF)', display: 'grid', placeItems: 'center', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '15px', color: '#fff', flexShrink: 0 }}>G</div>
                            <div>
                                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '14px', color: 'var(--white)', lineHeight: 1.2 }}>Giampiero V.</div>
                                <div style={{ fontSize: '11px', color: 'var(--fog)', marginTop: '4px', lineHeight: 1.2 }}>Founder &middot; ★★★★★</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
        {demoOpen && <DemoModal onClose={() => setDemoOpen(false)} />}
        {founderModalOpen && (
            <div className="hero-founder-modal-overlay" onClick={(e) => e.target === e.currentTarget && setFounderModalOpen(false)}>
                <div className="hero-founder-modal">
                    <button
                        type="button"
                        className="hero-founder-modal-close"
                        onClick={() => setFounderModalOpen(false)}
                        aria-label="Close founder video"
                    >
                        ✕
                    </button>
                    <p className="hero-founder-modal-label">Welcome from the founder</p>
                    <div className="hero-founder-modal-video-wrap">
                        <video
                            ref={founderModalVideoRef}
                            src="/welcome-from-founder.mp4"
                            controls
                            playsInline
                            preload="metadata"
                            className="hero-founder-modal-video"
                        />
                    </div>
                </div>
            </div>
        )}
        </>
    );
}

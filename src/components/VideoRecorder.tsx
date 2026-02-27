"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
    maxDurationSeconds?: number;
}

type RecorderState = "idle" | "previewing" | "recording" | "recorded";

export default function VideoRecorder({
    onRecordingComplete,
    maxDurationSeconds = 90,
}: VideoRecorderProps) {
    const [state, setState] = useState<RecorderState>("idle");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(
        null
    );

    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const videoPlaybackRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startTimeRef = useRef<number>(0);
    const recordedBlobRef = useRef<Blob | null>(null);
    const durationRef = useRef<number>(0);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopStream();
            clearTimer();
        };
    }, [stopStream, clearTimer]);

    const startCamera = useCallback(async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: "user",
                    width: { ideal: 1280 },
                    height: { ideal: 720 },
                },
                audio: true,
            });
            streamRef.current = stream;

            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
                videoPreviewRef.current.muted = true;
                await videoPreviewRef.current.play();
            }

            setState("previewing");
        } catch (err) {
            console.error("Camera access error:", err);
            setError(
                "Impossibile accedere alla fotocamera. Verifica i permessi del browser."
            );
        }
    }, []);

    const startRecording = useCallback(() => {
        if (!streamRef.current) return;

        chunksRef.current = [];
        setElapsedSeconds(0);
        setError(null);

        // Determine supported mime type
        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
            ? "video/webm;codecs=vp9,opus"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
                ? "video/webm;codecs=vp8,opus"
                : MediaRecorder.isTypeSupported("video/webm")
                    ? "video/webm"
                    : "video/mp4";

        const recorder = new MediaRecorder(streamRef.current, {
            mimeType,
            videoBitsPerSecond: 2_500_000, // ~2.5 Mbps for good quality within size limits
        });

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            clearTimer();
            const blob = new Blob(chunksRef.current, {
                type: mimeType.split(";")[0],
            });

            // Check size limit (~200MB)
            if (blob.size > 200 * 1024 * 1024) {
                setError(
                    "Il video è troppo grande (max 200MB). Prova a registrare un video più corto."
                );
                setState("previewing");
                return;
            }

            const duration = durationRef.current;
            recordedBlobRef.current = blob;

            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl(url);

            stopStream();
            setState("recorded");
            onRecordingComplete(blob, duration);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(1000); // collect data every second

        startTimeRef.current = Date.now();
        setState("recording");

        // Timer
        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            durationRef.current = elapsed;
            setElapsedSeconds(elapsed);

            if (elapsed >= maxDurationSeconds) {
                recorder.stop();
            }
        }, 1000);
    }, [maxDurationSeconds, onRecordingComplete, clearTimer, stopStream]);

    const stopRecording = useCallback(() => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state === "recording"
        ) {
            durationRef.current = Math.floor(
                (Date.now() - startTimeRef.current) / 1000
            );
            mediaRecorderRef.current.stop();
        }
    }, []);

    const reRecord = useCallback(() => {
        recordedBlobRef.current = null;
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
            setRecordedVideoUrl(null);
        }
        setState("idle");
        startCamera();
    }, [startCamera]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progressPercent = (elapsedSeconds / maxDurationSeconds) * 100;

    return (
        <div className="video-recorder">
            {error && (
                <div className="recorder-error">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {/* Camera preview (during idle/previewing/recording) */}
            {state !== "recorded" && (
                <div className="video-container">
                    <video
                        ref={videoPreviewRef}
                        className="video-element"
                        playsInline
                        muted
                        style={{ display: state === "idle" ? "none" : "block" }}
                    />

                    {state === "idle" && (
                        <div className="video-placeholder" onClick={startCamera}>
                            <div className="placeholder-icon">📹</div>
                            <p>Tocca per attivare la fotocamera</p>
                        </div>
                    )}

                    {state === "recording" && (
                        <div className="recording-overlay">
                            <div className="recording-indicator">
                                <span className="rec-dot" />
                                REC
                            </div>
                            <div className="timer">
                                {formatTime(elapsedSeconds)} / {formatTime(maxDurationSeconds)}
                            </div>
                            <div className="progress-bar-container">
                                <div
                                    className="progress-bar-fill recording-progress"
                                    style={{ width: `${progressPercent}%` }}
                                />
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Playback (after recording) */}
            {state === "recorded" && (
                <div className="video-container">
                    <video
                        ref={videoPlaybackRef}
                        className="video-element"
                        playsInline
                        controls
                        src={recordedVideoUrl || undefined}
                    />
                </div>
            )}

            {/* Controls */}
            <div className="recorder-controls">
                {state === "idle" && (
                    <button className="btn btn-primary btn-large" onClick={startCamera}>
                        📹 Attiva Fotocamera
                    </button>
                )}

                {state === "previewing" && (
                    <button
                        className="btn btn-record btn-large"
                        onClick={startRecording}
                    >
                        <span className="rec-dot-btn" />
                        Inizia Registrazione
                    </button>
                )}

                {state === "recording" && (
                    <button className="btn btn-stop btn-large" onClick={stopRecording}>
                        ⏹ Ferma Registrazione
                    </button>
                )}

                {state === "recorded" && (
                    <button className="btn btn-secondary" onClick={reRecord}>
                        🔄 Registra di nuovo
                    </button>
                )}
            </div>
        </div>
    );
}

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
    maxDurationSeconds?: number | null;
    variant?: "default" | "immersive";
    labels?: {
        idlePrompt?: string;
        enableCamera?: string;
        startRecording?: string;
        stopRecording?: string;
        rerecord?: string;
        cameraAccessError?: string;
    };
}

type RecorderState = "idle" | "previewing" | "recording" | "recorded";

export default function VideoRecorder({
    onRecordingComplete,
    maxDurationSeconds = 90,
    variant = "default",
    labels,
}: VideoRecorderProps) {
    const [state, setState] = useState<RecorderState>("idle");
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(
        null
    );
    const [isPlaybackPlaying, setIsPlaybackPlaying] = useState(false);
    const [isPlaybackMuted, setIsPlaybackMuted] = useState(false);
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [playbackCurrentTime, setPlaybackCurrentTime] = useState(0);
    const [playbackDuration, setPlaybackDuration] = useState(0);

    const videoPreviewRef = useRef<HTMLVideoElement>(null);
    const videoPlaybackRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mirroredStreamRef = useRef<MediaStream | null>(null);
    const mirrorCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const mirrorFrameRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const effectiveMaxDuration = maxDurationSeconds ?? null;
    const isImmersive = variant === "immersive";

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
            streamRef.current = null;
        }
    }, []);

    const stopMirroredStream = useCallback(() => {
        if (mirrorFrameRef.current) {
            cancelAnimationFrame(mirrorFrameRef.current);
            mirrorFrameRef.current = null;
        }

        if (mirroredStreamRef.current) {
            mirroredStreamRef.current.getTracks().forEach((track) => track.stop());
            mirroredStreamRef.current = null;
        }

        mirrorCanvasRef.current = null;
    }, []);

    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            stopStream();
            stopMirroredStream();
            clearTimer();
        };
    }, [stopStream, stopMirroredStream, clearTimer]);

    useEffect(() => {
        return () => {
            if (recordedVideoUrl) {
                URL.revokeObjectURL(recordedVideoUrl);
            }
        };
    }, [recordedVideoUrl]);

    useEffect(() => {
        const video = videoPlaybackRef.current;
        if (!video || state !== "recorded") {
            return;
        }

        const syncState = () => {
            const duration =
                Number.isFinite(video.duration) && video.duration > 0
                    ? video.duration
                    : durationRef.current;
            setIsPlaybackPlaying(!video.paused && !video.ended);
            setIsPlaybackMuted(video.muted);
            setPlaybackCurrentTime(
                Number.isFinite(video.currentTime) ? video.currentTime : 0
            );
            setPlaybackDuration(duration);
            setPlaybackProgress(
                duration > 0 ? (video.currentTime / duration) * 100 : 0
            );
        };

        const handleEnded = () => {
            const duration =
                Number.isFinite(video.duration) && video.duration > 0
                    ? video.duration
                    : durationRef.current;
            setIsPlaybackPlaying(false);
            setPlaybackCurrentTime(duration);
            setPlaybackDuration(duration);
            setPlaybackProgress(100);
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
    }, [state, recordedVideoUrl]);

    const startCamera = useCallback(async () => {
        setError(null);

        if (videoPlaybackRef.current) {
            videoPlaybackRef.current.pause();
            videoPlaybackRef.current.src = "";
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: "user" },
                },
                audio: true,
            });

            streamRef.current = stream;
            const videoTrack = stream.getVideoTracks()[0];
            const capabilities = (
                videoTrack?.getCapabilities?.() as MediaTrackCapabilities & {
                    zoom?: { min?: number; max?: number };
                }
            ) ?? { zoom: undefined };

            if (videoTrack && capabilities.zoom) {
                const minZoom =
                    typeof capabilities.zoom.min === "number"
                        ? capabilities.zoom.min
                        : 1;
                try {
                    await videoTrack.applyConstraints({
                        advanced: [{ zoom: minZoom }],
                    });
                } catch {
                    // Ignore unsupported zoom constraints on some browsers/devices.
                }
            }

            if (videoPreviewRef.current) {
                videoPreviewRef.current.srcObject = stream;
                videoPreviewRef.current.muted = true;
                await videoPreviewRef.current.play();
            }

            setState("previewing");
        } catch (err) {
            console.error("Camera access error:", err);
            setError(
                labels?.cameraAccessError ||
                    "Unable to access the camera. Please check browser permissions."
            );
        }
    }, [labels?.cameraAccessError]);

    const startRecording = useCallback(() => {
        const stream = streamRef.current;
        const previewVideo = videoPreviewRef.current;

        if (!stream || !previewVideo) {
            return;
        }

        chunksRef.current = [];
        setElapsedSeconds(0);
        setError(null);

        const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
            ? "video/webm;codecs=vp9,opus"
            : MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
              ? "video/webm;codecs=vp8,opus"
              : "video/webm";

        stopMirroredStream();

        const sourceTrack = stream.getVideoTracks()[0];
        const settings = sourceTrack?.getSettings();
        const sourceWidth = settings.width ?? previewVideo.videoWidth ?? 720;
        const sourceHeight = settings.height ?? previewVideo.videoHeight ?? 1280;

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(2, sourceWidth);
        canvas.height = Math.max(2, sourceHeight);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("Unable to start recording in this browser.");
            setState("previewing");
            return;
        }

        const drawMirroredFrame = () => {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(
                previewVideo,
                0,
                0,
                canvas.width,
                canvas.height
            );
            ctx.restore();
            mirrorFrameRef.current = requestAnimationFrame(drawMirroredFrame);
        };

        drawMirroredFrame();

        const canvasStream = canvas.captureStream(30);
        const mergedStream = new MediaStream(canvasStream.getVideoTracks());
        stream.getAudioTracks().forEach((track) => {
            mergedStream.addTrack(track.clone());
        });

        mirrorCanvasRef.current = canvas;
        mirroredStreamRef.current = mergedStream;

        const recorder = new MediaRecorder(mergedStream, {
            mimeType,
            videoBitsPerSecond: 2_500_000,
        });

        recorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                chunksRef.current.push(event.data);
            }
        };

        recorder.onstop = () => {
            clearTimer();
            stopMirroredStream();
            stopStream();

            const blob = new Blob(chunksRef.current, {
                type: mimeType.split(";")[0],
            });

            if (blob.size > 200 * 1024 * 1024) {
                setError(
                    "The video is too large (max 200MB). Try a shorter recording."
                );
                setState("idle");
                return;
            }

            const url = URL.createObjectURL(blob);
            setRecordedVideoUrl((currentUrl) => {
                if (currentUrl) {
                    URL.revokeObjectURL(currentUrl);
                }
                return url;
            });
            setState("recorded");
            setPlaybackProgress(0);
            setIsPlaybackPlaying(false);
            setIsPlaybackMuted(false);
            setPlaybackCurrentTime(0);
            setPlaybackDuration(0);
            onRecordingComplete(blob, durationRef.current);
        };

        mediaRecorderRef.current = recorder;
        recorder.start(250);
        startTimeRef.current = Date.now();
        setState("recording");

        timerRef.current = setInterval(() => {
            const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
            durationRef.current = elapsed;
            setElapsedSeconds(elapsed);

            if (effectiveMaxDuration && elapsed >= effectiveMaxDuration) {
                recorder.stop();
            }
        }, 1000);
    }, [
        clearTimer,
        effectiveMaxDuration,
        onRecordingComplete,
        stopMirroredStream,
        stopStream,
    ]);

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

    const reRecord = useCallback(async () => {
        clearTimer();
        stopMirroredStream();
        stopStream();

        if (videoPlaybackRef.current) {
            videoPlaybackRef.current.pause();
            videoPlaybackRef.current.src = "";
        }

        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
            setRecordedVideoUrl(null);
        }

        setPlaybackProgress(0);
        setIsPlaybackPlaying(false);
        setIsPlaybackMuted(false);
        setPlaybackCurrentTime(0);
        setPlaybackDuration(0);
        durationRef.current = 0;
        setState("idle");
        await startCamera();
    }, [clearTimer, recordedVideoUrl, startCamera, stopMirroredStream, stopStream]);

    const togglePlayback = useCallback(async () => {
        const video = videoPlaybackRef.current;
        if (!video) {
            return;
        }

        const duration =
            Number.isFinite(video.duration) && video.duration > 0
                ? video.duration
                : durationRef.current;

        if (video.paused || video.ended) {
            if (video.ended) {
                video.currentTime = 0;
            } else if (duration > 0 && video.currentTime >= duration) {
                video.currentTime = 0;
            }

            try {
                await video.play();
            } catch {
                // Ignore browser playback rejections.
            }
            return;
        }

        video.pause();
    }, []);

    const togglePlaybackAudio = useCallback(() => {
        const video = videoPlaybackRef.current;
        if (!video) {
            return;
        }

        video.muted = !video.muted;
        setIsPlaybackMuted(video.muted);
    }, []);

    const handlePlaybackScrub = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            const video = videoPlaybackRef.current;
            const duration =
                video &&
                Number.isFinite(video.duration) &&
                video.duration > 0
                    ? video.duration
                    : durationRef.current;

            if (!video || !duration) {
                return;
            }

            const rect = event.currentTarget.getBoundingClientRect();
            const ratio = Math.min(
                Math.max((event.clientX - rect.left) / rect.width, 0),
                1
            );

            video.currentTime = ratio * duration;
        },
        []
    );

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    const progressPercent = effectiveMaxDuration
        ? (elapsedSeconds / effectiveMaxDuration) * 100
        : 0;

    return (
        <div className="video-recorder">
            {error && (
                <div className="recorder-error">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {state !== "recorded" && (
                <div
                    style={
                        isImmersive
                            ? {
                                  width: "100%",
                                  border: "1px dashed rgba(17, 17, 17, 0.14)",
                                  borderRadius: "28px",
                                  padding: "10px",
                                  background: "rgba(255,255,255,0.92)",
                              }
                            : undefined
                    }
                >
                    <div
                        className="video-container"
                        style={{
                            position: "relative",
                            width: "100%",
                            ...(isImmersive
                                ? {
                                      aspectRatio: "4 / 5",
                                      borderRadius: "24px 24px 0 0",
                                      overflow: "hidden",
                                      background: "#05060b",
                                  }
                                : {}),
                        }}
                    >
                        <video
                            ref={videoPreviewRef}
                            className="video-element"
                            playsInline
                            muted
                            style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "contain",
                                display: state === "idle" ? "none" : "block",
                                transform: "scaleX(-1)",
                            }}
                        />

                        {state === "idle" && (
                            <div
                                className="video-placeholder"
                                onClick={!isImmersive ? startCamera : undefined}
                                style={
                                    isImmersive
                                        ? {
                                              display: "flex",
                                              flexDirection: "column",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              gap: "18px",
                                              textAlign: "center",
                                              padding: "28px",
                                          }
                                        : undefined
                                }
                            >
                                {!isImmersive && (
                                    <div className="placeholder-icon">📹</div>
                                )}
                                <p>
                                    {labels?.idlePrompt ||
                                        "Tap to enable your camera"}
                                </p>
                                {isImmersive && (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-large"
                                        onClick={startCamera}
                                    >
                                        {labels?.enableCamera || "Enable camera"}
                                    </button>
                                )}
                            </div>
                        )}

                        {state === "recording" && !isImmersive && (
                            <div className="recording-overlay">
                                <div className="recording-indicator">
                                    <span className="rec-dot" />
                                    REC
                                </div>
                                <div className="timer">
                                    {effectiveMaxDuration
                                        ? `${formatTime(elapsedSeconds)} / ${formatTime(
                                              effectiveMaxDuration
                                          )}`
                                        : formatTime(elapsedSeconds)}
                                </div>
                                {effectiveMaxDuration && (
                                    <div className="progress-bar-container">
                                        <div
                                            className="progress-bar-fill recording-progress"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {isImmersive && (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "12px",
                                padding: "14px 18px",
                                borderRadius: "0 0 24px 24px",
                                background: "rgba(244, 239, 239, 0.95)",
                                color: "rgba(17,17,17,.42)",
                                fontFamily:
                                    '"DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: "12px",
                                fontWeight: 500,
                                letterSpacing: "0.08em",
                                textTransform: "uppercase",
                            }}
                        >
                            <span>
                                {state === "recording"
                                    ? effectiveMaxDuration
                                        ? `${formatTime(elapsedSeconds)} / ${formatTime(
                                              effectiveMaxDuration
                                          )}`
                                        : formatTime(elapsedSeconds)
                                    : "Press ● to start"}
                            </span>

                            {state === "previewing" && (
                                <button
                                    type="button"
                                    onClick={startRecording}
                                    aria-label={labels?.startRecording || "Start recording"}
                                    style={{
                                        border: "none",
                                        background: "#ff5c35",
                                        width: "54px",
                                        height: "54px",
                                        borderRadius: "999px",
                                        display: "grid",
                                        placeItems: "center",
                                        cursor: "pointer",
                                        boxShadow: "0 10px 24px rgba(255, 92, 53, 0.26)",
                                        color: "#fff",
                                        fontSize: "20px",
                                    }}
                                >
                                    ●
                                </button>
                            )}

                            {state === "recording" && (
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    aria-label={labels?.stopRecording || "Stop recording"}
                                    style={{
                                        border: "none",
                                        background: "#111111",
                                        width: "54px",
                                        height: "54px",
                                        borderRadius: "999px",
                                        display: "grid",
                                        placeItems: "center",
                                        cursor: "pointer",
                                        color: "#fff",
                                        fontSize: "18px",
                                    }}
                                >
                                    ⏹
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {state === "recorded" && (
                <div
                    className="video-container"
                    style={{ position: "relative", width: "100%" }}
                >
                    <video
                        ref={videoPlaybackRef}
                        className="video-element"
                        playsInline
                        preload="metadata"
                        onClick={togglePlayback}
                        src={recordedVideoUrl || undefined}
                        style={{
                            display: "block",
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                        }}
                    />

                    <div
                        style={{
                            position: "absolute",
                            left: "12px",
                            right: "12px",
                            bottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            padding: "10px 12px",
                            borderRadius: "16px",
                            background:
                                "linear-gradient(180deg, rgba(15,15,15,.18), rgba(15,15,15,.72))",
                            backdropFilter: "blur(8px)",
                        }}
                    >
                        <button
                            type="button"
                            onClick={togglePlayback}
                            aria-label={
                                isPlaybackPlaying
                                    ? "Pause recorded video"
                                    : "Play recorded video"
                            }
                            style={{
                                flexShrink: 0,
                                border: "none",
                                background: "rgba(255,255,255,.14)",
                                width: "40px",
                                height: "40px",
                                borderRadius: "999px",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            {isPlaybackPlaying ? "⏸️" : "▶️"}
                        </button>

                        <div
                            onClick={handlePlaybackScrub}
                            role="progressbar"
                            aria-label="Recorded video progress"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={Math.round(playbackProgress)}
                            style={{
                                flex: 1,
                                height: "6px",
                                borderRadius: "999px",
                                background: "rgba(255,255,255,.26)",
                                cursor: "pointer",
                                overflow: "hidden",
                            }}
                        >
                            <span
                                style={{
                                    display: "block",
                                    width: `${playbackProgress}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background: "var(--brand)",
                                }}
                            />
                        </div>

                        <span
                            style={{
                                flexShrink: 0,
                                minWidth: "72px",
                                textAlign: "right",
                                color: "rgba(255,255,255,.88)",
                                fontFamily:
                                    '"DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                                fontSize: "10px",
                                fontWeight: 500,
                            }}
                        >
                            {formatTime(Math.floor(playbackCurrentTime))} /{" "}
                            {formatTime(Math.floor(playbackDuration))}
                        </span>

                        <button
                            type="button"
                            onClick={togglePlaybackAudio}
                            aria-label={
                                isPlaybackMuted
                                    ? "Unmute recorded video"
                                    : "Mute recorded video"
                            }
                            style={{
                                flexShrink: 0,
                                border: "none",
                                background: "rgba(255,255,255,.14)",
                                width: "40px",
                                height: "40px",
                                borderRadius: "999px",
                                display: "grid",
                                placeItems: "center",
                                cursor: "pointer",
                            }}
                        >
                            {isPlaybackMuted ? "🔇" : "🔊"}
                        </button>
                    </div>
                </div>
            )}

            <div
                className="recorder-controls"
                style={
                    isImmersive && state !== "recorded"
                        ? { display: "none" }
                        : undefined
                }
            >
                {state === "idle" && (
                    <button className="btn btn-primary btn-large" onClick={startCamera}>
                        📹 {labels?.enableCamera || "Enable camera"}
                    </button>
                )}

                {state === "previewing" && (
                    <button
                        className="btn btn-record btn-large"
                        onClick={startRecording}
                    >
                        <span className="rec-dot-btn" />
                        {labels?.startRecording || "Start recording"}
                    </button>
                )}

                {state === "recording" && (
                    <button className="btn btn-stop btn-large" onClick={stopRecording}>
                        ⏹ {labels?.stopRecording || "Stop recording"}
                    </button>
                )}

                {state === "recorded" && (
                    <button className="btn btn-ghost" onClick={reRecord}>
                        🔄 {labels?.rerecord || "Record again"}
                    </button>
                )}
            </div>
        </div>
    );
}

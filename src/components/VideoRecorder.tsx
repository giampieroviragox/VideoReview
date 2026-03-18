"use client";

import { useState, useRef, useCallback, useEffect, type CSSProperties } from "react";

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
    maxDurationSeconds?: number | null;
    variant?: "default" | "immersive";
    immersivePreset?: "classic" | "flat";
    mirrorPreview?: boolean;
    mirrorPlayback?: boolean;
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
    immersivePreset = "classic",
    mirrorPreview = true,
    mirrorPlayback = mirrorPreview,
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
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const startTimeRef = useRef<number>(0);
    const durationRef = useRef<number>(0);
    const effectiveMaxDuration = maxDurationSeconds ?? null;
    const isImmersive = variant === "immersive";
    const useFlatImmersive = isImmersive && immersivePreset === "flat";

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

    useEffect(() => {
        return () => {
            stopStream();
            clearTimer();
        };
    }, [stopStream, clearTimer]);

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
            const cameraAttempts: MediaStreamConstraints[] = [
                {
                    video: {
                        facingMode: { ideal: "user" },
                        width: { ideal: 1080 },
                        height: { ideal: 1350 },
                        aspectRatio: { ideal: 4 / 5 },
                    },
                    audio: true,
                },
                {
                    video: {
                        facingMode: { ideal: "user" },
                        width: { ideal: 960 },
                        height: { ideal: 1280 },
                        aspectRatio: { ideal: 3 / 4 },
                    },
                    audio: true,
                },
                {
                    video: {
                        facingMode: { ideal: "user" },
                    },
                    audio: true,
                },
            ];

            let stream: MediaStream | null = null;
            for (const constraints of cameraAttempts) {
                try {
                    stream =
                        await navigator.mediaDevices.getUserMedia(constraints);
                    break;
                } catch {
                    // Try next constraint profile.
                }
            }

            if (!stream) {
                throw new Error("Unable to open camera stream.");
            }

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
                        advanced: [
                            { zoom: minZoom } as unknown as MediaTrackConstraintSet,
                        ],
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
        if (!stream) {
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

        const recorder = new MediaRecorder(stream, {
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
    }, [clearTimer, recordedVideoUrl, startCamera, stopStream]);

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

    const immersiveFrameStyle: CSSProperties | undefined = isImmersive
        ? useFlatImmersive
            ? {
                  width: "100%",
                  border: "1px solid #e8e8e8",
                  borderRadius: "10px",
                  background: "#ffffff",
                  overflow: "hidden",
              }
            : {
                  width: "100%",
                  border: "1px dashed rgba(17, 17, 17, 0.14)",
                  borderRadius: "28px",
                  padding: "10px",
                  background: "rgba(255,255,255,0.92)",
              }
        : undefined;

    const immersiveVideoContainerStyle: CSSProperties = isImmersive
        ? useFlatImmersive
            ? {
                  aspectRatio: "4 / 5",
                  borderRadius: "10px 10px 0 0",
                  overflow: "hidden",
                  background: "#05060b",
              }
            : {
                  aspectRatio: "4 / 5",
                  borderRadius: "24px 24px 0 0",
                  overflow: "hidden",
                  background: "#05060b",
              }
        : {};

    const immersivePlaceholderStyle: CSSProperties | undefined = isImmersive
        ? useFlatImmersive
            ? {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  textAlign: "center",
                  padding: "24px",
              }
            : {
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "18px",
                  textAlign: "center",
                  padding: "28px",
              }
        : undefined;

    const immersiveControlBarStyle: CSSProperties = useFlatImmersive
        ? {
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              padding: "10px 14px",
              borderTop: "1px solid #e8e8e8",
              background: "#f7f7f7",
              color: "#5c5c5c",
              fontFamily:
                  '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "11px",
              fontWeight: 500,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
          }
        : {
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
          };

    const immersivePrimaryActionStyle: CSSProperties = useFlatImmersive
        ? {
              border: "none",
              background: "#ff4820",
              width: "44px",
              height: "44px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "18px",
          }
        : {
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
          };

    const immersiveStopActionStyle: CSSProperties = useFlatImmersive
        ? {
              border: "none",
              background: "#0a0a0a",
              width: "44px",
              height: "44px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
              color: "#fff",
              fontSize: "16px",
          }
        : {
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
          };

    const recordedContainerStyle: CSSProperties = useFlatImmersive
        ? {
              position: "relative",
              width: "100%",
              border: "1px solid #e8e8e8",
              borderRadius: "10px",
              overflow: "hidden",
              background: "#0a0a0a",
          }
        : { position: "relative", width: "100%" };

    const recordedControlsStyle: CSSProperties = useFlatImmersive
        ? {
              position: "absolute",
              left: "10px",
              right: "10px",
              bottom: "10px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "8px 10px",
              borderRadius: "8px",
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #e8e8e8",
          }
        : {
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
          };

    const recordedControlButtonStyle: CSSProperties = useFlatImmersive
        ? {
              flexShrink: 0,
              border: "1px solid #e8e8e8",
              background: "#ffffff",
              color: "#0a0a0a",
              width: "34px",
              height: "34px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
          }
        : {
              flexShrink: 0,
              border: "none",
              background: "rgba(255,255,255,.14)",
              width: "40px",
              height: "40px",
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
          };

    const recordedProgressTrackStyle: CSSProperties = useFlatImmersive
        ? {
              flex: 1,
              height: "6px",
              borderRadius: "999px",
              background: "#e8e8e8",
              cursor: "pointer",
              overflow: "hidden",
          }
        : {
              flex: 1,
              height: "6px",
              borderRadius: "999px",
              background: "rgba(255,255,255,.26)",
              cursor: "pointer",
              overflow: "hidden",
          };

    const recordedTimeStyle: CSSProperties = useFlatImmersive
        ? {
              flexShrink: 0,
              minWidth: "72px",
              textAlign: "right",
              color: "#5c5c5c",
              fontFamily:
                  '"Geist", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
              fontSize: "10px",
              fontWeight: 500,
          }
        : {
              flexShrink: 0,
              minWidth: "72px",
              textAlign: "right",
              color: "rgba(255,255,255,.88)",
              fontFamily:
                  '"DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
              fontSize: "10px",
              fontWeight: 500,
          };

    return (
        <div className="video-recorder">
            {error && (
                <div className="recorder-error">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {state !== "recorded" && (
                <div style={immersiveFrameStyle}>
                    <div
                        className="video-container"
                        style={{
                            position: "relative",
                            width: "100%",
                            ...immersiveVideoContainerStyle,
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
                                objectFit: isImmersive ? "cover" : "contain",
                                display: state === "idle" ? "none" : "block",
                                transform: mirrorPreview ? "scaleX(-1)" : undefined,
                            }}
                        />

                        {state === "idle" && (
                            <div
                                className="video-placeholder"
                                onClick={!isImmersive ? startCamera : undefined}
                                style={immersivePlaceholderStyle}
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
                        <div style={immersiveControlBarStyle}>
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
                                    style={immersivePrimaryActionStyle}
                                >
                                    ●
                                </button>
                            )}

                            {state === "recording" && (
                                <button
                                    type="button"
                                    onClick={stopRecording}
                                    aria-label={labels?.stopRecording || "Stop recording"}
                                    style={immersiveStopActionStyle}
                                >
                                    ⏹
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {state === "recorded" && (
                <div className="video-container" style={recordedContainerStyle}>
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
                            objectFit: isImmersive ? "cover" : "contain",
                            transform: mirrorPlayback ? "scaleX(-1)" : undefined,
                        }}
                    />

                    <div style={recordedControlsStyle}>
                        <button
                            type="button"
                            onClick={togglePlayback}
                            aria-label={
                                isPlaybackPlaying
                                    ? "Pause recorded video"
                                    : "Play recorded video"
                            }
                            style={recordedControlButtonStyle}
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
                            style={recordedProgressTrackStyle}
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
                            style={recordedTimeStyle}
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
                            style={recordedControlButtonStyle}
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

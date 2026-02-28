"use client";

import { useState, useRef, useCallback, useEffect } from "react";

interface VideoRecorderProps {
    onRecordingComplete: (blob: Blob, durationSeconds: number) => void;
    maxDurationSeconds?: number | null;
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
            const duration = video.duration || 0;
            setIsPlaybackPlaying(!video.paused && !video.ended);
            setIsPlaybackMuted(video.muted);
            setPlaybackProgress(
                duration > 0 ? (video.currentTime / duration) * 100 : 0
            );
        };

        const handleEnded = () => {
            setIsPlaybackPlaying(false);
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
                    facingMode: "user",
                    width: { ideal: 720 },
                    height: { ideal: 1280 },
                    aspectRatio: { ideal: 9 / 16 },
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
        const targetAspect =
            previewVideo.clientWidth > 0 && previewVideo.clientHeight > 0
                ? previewVideo.clientWidth / previewVideo.clientHeight
                : 9 / 16;

        let targetWidth = sourceWidth;
        let targetHeight = Math.round(targetWidth / targetAspect);
        if (targetHeight > sourceHeight) {
            targetHeight = sourceHeight;
            targetWidth = Math.round(targetHeight * targetAspect);
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(2, targetWidth);
        canvas.height = Math.max(2, targetHeight);

        const ctx = canvas.getContext("2d");
        if (!ctx) {
            setError("Unable to start recording in this browser.");
            setState("previewing");
            return;
        }

        const sourceAspect = sourceWidth / sourceHeight;
        const canvasAspect = canvas.width / canvas.height;
        let cropWidth = sourceWidth;
        let cropHeight = sourceHeight;
        let cropX = 0;
        let cropY = 0;

        if (sourceAspect > canvasAspect) {
            cropWidth = sourceHeight * canvasAspect;
            cropX = (sourceWidth - cropWidth) / 2;
        } else if (sourceAspect < canvasAspect) {
            cropHeight = sourceWidth / canvasAspect;
            cropY = (sourceHeight - cropHeight) / 2;
        }

        const drawMirroredFrame = () => {
            ctx.save();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(
                previewVideo,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
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
        durationRef.current = 0;
        setState("idle");
        await startCamera();
    }, [clearTimer, recordedVideoUrl, startCamera, stopMirroredStream, stopStream]);

    const togglePlayback = useCallback(async () => {
        const video = videoPlaybackRef.current;
        if (!video) {
            return;
        }

        if (video.paused || video.ended) {
            if (video.ended) {
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
                <div className="video-container">
                    <video
                        ref={videoPreviewRef}
                        className="video-element"
                        playsInline
                        muted
                        style={{
                            display: state === "idle" ? "none" : "block",
                            transform: "scaleX(-1)",
                        }}
                    />

                    {state === "idle" && (
                        <div className="video-placeholder" onClick={startCamera}>
                            <div className="placeholder-icon">📹</div>
                            <p>{labels?.idlePrompt || "Tap to enable your camera"}</p>
                        </div>
                    )}

                    {state === "recording" && (
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
            )}

            {state === "recorded" && (
                <div className="video-container">
                    <video
                        ref={videoPlaybackRef}
                        className="video-element"
                        playsInline
                        preload="metadata"
                        onClick={togglePlayback}
                        src={recordedVideoUrl || undefined}
                    />
                </div>
            )}

            <div className="recorder-controls">
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
                    <div
                        className="recorder-playback-shell"
                        style={{
                            width: "100%",
                            display: "grid",
                            gap: "12px",
                        }}
                    >
                        <div
                            className="recorder-playback-progress"
                            style={{
                                width: "100%",
                                height: "6px",
                                borderRadius: "999px",
                                background: "rgba(255,255,255,.12)",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    width: `${playbackProgress}%`,
                                    height: "100%",
                                    borderRadius: "999px",
                                    background:
                                        "linear-gradient(90deg, var(--brand), var(--brand-2))",
                                }}
                            />
                        </div>

                        <div
                            className="recorder-playback-actions"
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: "10px",
                                flexWrap: "wrap",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    gap: "10px",
                                    alignItems: "center",
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
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        border: "1px solid rgba(255,95,61,.24)",
                                        background: "rgba(255,95,61,.14)",
                                        color: "var(--white)",
                                        display: "grid",
                                        placeItems: "center",
                                        fontSize: "18px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {isPlaybackPlaying ? "⏸️" : "▶️"}
                                </button>
                                <button
                                    type="button"
                                    onClick={togglePlaybackAudio}
                                    aria-label={
                                        isPlaybackMuted
                                            ? "Unmute recorded video"
                                            : "Mute recorded video"
                                    }
                                    style={{
                                        width: "44px",
                                        height: "44px",
                                        borderRadius: "50%",
                                        border: "1px solid rgba(255,95,61,.24)",
                                        background: "rgba(255,95,61,.14)",
                                        color: "var(--white)",
                                        display: "grid",
                                        placeItems: "center",
                                        fontSize: "18px",
                                        cursor: "pointer",
                                    }}
                                >
                                    {isPlaybackMuted ? "🔇" : "🔊"}
                                </button>
                            </div>

                            <button className="btn btn-secondary" onClick={reRecord}>
                                🔄 {labels?.rerecord || "Record again"}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

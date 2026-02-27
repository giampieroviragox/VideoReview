"use client";

import { useState, useRef, useCallback } from "react";
import VideoRecorder from "./VideoRecorder";

interface SubmissionFormProps {
    slug: string;
    companyName: string;
    title: string;
    description: string | null;
}

type Step = "info" | "record" | "uploading" | "success";

export default function SubmissionForm({
    slug,
    companyName,
    title,
    description,
}: SubmissionFormProps) {
    const [step, setStep] = useState<Step>("info");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
    const [videoDuration, setVideoDuration] = useState<number>(0);

    const validateInfo = useCallback(() => {
        if (!name.trim()) {
            setFormError("Please enter your name");
            return false;
        }
        if (!email.trim()) {
            setFormError("Please enter your email");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            setFormError("Please enter a valid email address");
            return false;
        }
        setFormError(null);
        return true;
    }, [name, email]);

    const handleInfoSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (validateInfo()) {
                setStep("record");
            }
        },
        [validateInfo]
    );

    const handleRecordingComplete = useCallback(
        (blob: Blob, durationSeconds: number) => {
            setVideoBlob(blob);
            setVideoDuration(durationSeconds);
        },
        []
    );

    const handleSubmit = useCallback(async () => {
        if (!videoBlob) return;

        setStep("uploading");
        setUploadError(null);
        setUploadProgress(0);

        try {
            // Step 1: Get presigned upload URL
            const contentType = videoBlob.type || "video/webm";
            const uploadRes = await fetch("/api/upload", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug, contentType }),
            });

            if (!uploadRes.ok) {
                const data = await uploadRes.json();
                throw new Error(data.error || "Errore nella generazione URL di upload");
            }

            const { uploadUrl, videoKey } = await uploadRes.json();

            // Step 2: Upload video directly to R2 with progress tracking
            await new Promise<void>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.addEventListener("progress", (event) => {
                    if (event.lengthComputable) {
                        const percent = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(percent);
                    }
                });

                xhr.addEventListener("load", () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        resolve();
                    } else {
                        reject(new Error(`Upload failed (status ${xhr.status})`));
                    }
                });

                xhr.addEventListener("error", () => {
                    reject(new Error("Network error during upload"));
                });

                xhr.addEventListener("abort", () => {
                    reject(new Error("Upload cancelled"));
                });

                xhr.open("PUT", uploadUrl, true);
                xhr.setRequestHeader("Content-Type", contentType);
                xhr.send(videoBlob);
            });

            setUploadProgress(100);

            // Step 3: Create submission in database
            const submissionRes = await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    slug,
                    reviewerName: name.trim(),
                    reviewerEmail: email.trim().toLowerCase(),
                    videoKey,
                    durationSeconds: videoDuration,
                }),
            });

            if (!submissionRes.ok) {
                const data = await submissionRes.json();
                throw new Error(data.error || "Error saving the review");
            }

            setStep("success");
        } catch (err) {
            console.error("Submission error:", err);
            setUploadError(
                err instanceof Error ? err.message : "Error during submission"
            );
            setStep("record");
        }
    }, [slug, name, email, videoBlob, videoDuration]);

    return (
        <div className="submission-form">
            {/* Header */}
            <div className="form-header">
                <div className="company-badge">{companyName}</div>
                <h1>{title}</h1>
                {description && <p className="form-description">{description}</p>}
            </div>

            {/* Step indicator */}
            {step !== "success" && (
                <div className="step-indicator">
                    <div className={`step-dot ${step === "info" ? "active" : "completed"}`}>
                        <span>1</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-dot ${step === "record" ? "active" : step === "uploading" ? "completed" : ""}`}>
                        <span>2</span>
                    </div>
                    <div className="step-line" />
                    <div className={`step-dot ${step === "uploading" ? "active" : ""}`}>
                        <span>3</span>
                    </div>
                </div>
            )}

            {/* Step 1: Info */}
            {step === "info" && (
                <form className="info-form" onSubmit={handleInfoSubmit}>
                    <div className="form-group">
                        <label htmlFor="reviewer-name">Your name</label>
                        <input
                            id="reviewer-name"
                            type="text"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            autoComplete="name"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="reviewer-email">Your email</label>
                        <input
                            id="reviewer-email"
                            type="email"
                            placeholder="john@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            autoComplete="email"
                            required
                        />
                    </div>
                    {formError && <div className="form-error">{formError}</div>}
                    <button type="submit" className="btn btn-primary btn-large">
                        Continue →
                    </button>
                </form>
            )}

            {/* Step 2: Record */}
            {step === "record" && (
                <div className="record-step">
                    {uploadError && (
                        <div className="form-error upload-retry-error">
                            {uploadError}
                            <br />
                            <small>Try submitting the video again.</small>
                        </div>
                    )}
                    <VideoRecorder
                        onRecordingComplete={handleRecordingComplete}
                        maxDurationSeconds={90}
                    />
                    {videoBlob && (
                        <button
                            className="btn btn-primary btn-large submit-btn"
                            onClick={handleSubmit}
                        >
                            ✅ Submit your review
                        </button>
                    )}
                </div>
            )}

            {/* Step 3: Uploading */}
            {step === "uploading" && (
                <div className="uploading-step">
                    <div className="upload-animation">
                        <div className="spinner" />
                    </div>
                    <h2>Submitting...</h2>
                    <p className="upload-status">
                        {uploadProgress < 100
                            ? "Uploading video..."
                            : "Saving review..."}
                    </p>
                    <div className="progress-bar-container large">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${uploadProgress}%` }}
                        />
                    </div>
                    <span className="progress-text">{uploadProgress}%</span>
                </div>
            )}

            {/* Step 4: Success */}
            {step === "success" && (
                <div className="success-step">
                    <div className="success-icon">🎉</div>
                    <h2>Thank you, {name}!</h2>
                    <p>Your video review has been successfully submitted.</p>
                    <p className="success-subtitle">
                        It will be reviewed by the {companyName} team.
                    </p>
                </div>
            )}
        </div>
    );
}

"use client";

import { useMemo, useState } from "react";

type CampaignQuestion = {
  id: string;
  text: string;
  required: boolean;
  sortOrder: number;
};

type CampaignSubmission = {
  id: string;
  reviewerName: string;
  reviewerEmail: string;
  reviewerRating: number | null;
  status: string;
  rewardPending: boolean;
  createdAt: string;
  videoUrl: string | null;
  answers: Array<{
    questionId: string;
    questionText: string;
    answer: string;
    required: boolean;
  }>;
};

type CampaignCardProps = {
  campaign: {
    id: string;
    brandName: string;
    brandSlug: string;
    name: string;
    description: string | null;
    rewardText: string;
    rewardValue: string | null;
    hasNoEndDate: boolean;
    endsAt: string | null;
    questionDisplayMode: string;
    inviteMessage: string;
    publicPath: string;
    questions: CampaignQuestion[];
    submissions: CampaignSubmission[];
  };
};

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      console.error("Copy failed:", error);
    }
  };

  return (
    <button type="button" className="btn btn-ghost" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  );
}

function renderStars(rating: number | null) {
  if (!rating) {
    return "No rating";
  }

  return `${"★".repeat(rating)}${"☆".repeat(5 - rating)}`;
}

export default function CampaignCard({ campaign }: CampaignCardProps) {
  const [submissions, setSubmissions] = useState(campaign.submissions);
  const [selectedSubmission, setSelectedSubmission] = useState<CampaignSubmission | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const absolutePublicUrl = useMemo(() => {
    if (typeof window === "undefined") {
      return campaign.publicPath;
    }

    return `${window.location.origin}${campaign.publicPath}`;
  }, [campaign.publicPath]);

  const updateSubmissionStatus = async (submissionId: string, status: "APPROVED" | "REJECTED") => {
    setActionLoading(submissionId + status);

    try {
      const response = await fetch(`/api/campaigns/${campaign.id}/submissions/${submissionId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update submission.");
      }

      setSubmissions((current) =>
        current.map((submission) =>
          submission.id === submissionId
            ? {
                ...submission,
                status: data.submission.status,
                rewardPending: data.submission.rewardPending,
              }
            : submission
        )
      );

      setSelectedSubmission((current) =>
        current && current.id === submissionId
          ? {
              ...current,
              status: data.submission.status,
              rewardPending: data.submission.rewardPending,
            }
          : current
      );
    } catch (error) {
      console.error(error);
      window.alert(error instanceof Error ? error.message : "Failed to update submission.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <section
      style={{
        border: "1px solid var(--ink-3)",
        borderRadius: 28,
        padding: "24px clamp(18px, 3vw, 30px)",
        background: "rgba(17,17,24,.9)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap", marginBottom: 16 }}>
        <div>
          <p className="label" style={{ color: "var(--brand-2)", marginBottom: 8 }}>{campaign.brandName}</p>
          <h3 className="heading" style={{ fontSize: "clamp(22px, 3vw, 34px)", marginBottom: 8 }}>{campaign.name}</h3>
          {campaign.description && <p style={{ color: "var(--fog)", maxWidth: 760 }}>{campaign.description}</p>}
        </div>
        <div style={{ display: "grid", gap: 8, minWidth: 260 }}>
          <div style={{ fontSize: "var(--text-sm)", color: "var(--fog)" }}>
            {campaign.hasNoEndDate ? "No expiration date" : `Ends on ${new Date(campaign.endsAt || "").toLocaleDateString()}`}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <CopyButton text={absolutePublicUrl} label="Copy link" />
            <CopyButton text={campaign.inviteMessage} label="Copy invite message" />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr .8fr", gap: 18, marginBottom: 20 }}>
        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--ink-3)",
            padding: 16,
            background: "rgba(255,255,255,.015)",
          }}
        >
          <p className="label" style={{ color: "var(--fog)", marginBottom: 10 }}>Public link</p>
          <div style={{ marginBottom: 12, wordBreak: "break-all", color: "var(--smoke)" }}>{absolutePublicUrl}</div>
          <textarea
            readOnly
            value={campaign.inviteMessage}
            rows={5}
            style={{
              width: "100%",
              padding: "12px 14px",
              borderRadius: 14,
              border: "1px solid var(--ink-3)",
              background: "rgba(10,10,15,.55)",
              color: "var(--smoke)",
              resize: "vertical",
            }}
          />
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--ink-3)",
            padding: 16,
            background: "rgba(255,255,255,.015)",
          }}
        >
          <p className="label" style={{ color: "var(--fog)", marginBottom: 10 }}>Campaign setup</p>
          <div style={{ display: "grid", gap: 10 }}>
            <div>
              <strong>Reward:</strong> {campaign.rewardText}
              {campaign.rewardValue ? ` (${campaign.rewardValue})` : ""}
            </div>
            <div>
              <strong>Question mode:</strong>{" "}
              {campaign.questionDisplayMode === "ONE_AT_A_TIME" ? "One at a time" : "Show all before recording"}
            </div>
            <div>
              <strong>Questions:</strong>
              <ol style={{ paddingLeft: 18, marginTop: 8, color: "var(--smoke)" }}>
                {campaign.questions.map((question) => (
                  <li key={question.id} style={{ marginBottom: 6 }}>
                    {question.text}
                    {question.required ? " (required)" : ""}
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </div>

      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 12 }}>
          <div>
            <p className="label" style={{ color: "var(--brand-2)", marginBottom: 6 }}>Submissions</p>
            <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>Manual moderation only. Rewards are sent outside the platform after approval.</p>
          </div>
          <span className="tag">
            <span className="tag-dot" />
            {submissions.length} total
          </span>
        </div>

        {submissions.length === 0 ? (
          <div
            style={{
              borderRadius: 18,
              border: "1px dashed var(--ink-4)",
              padding: 20,
              color: "var(--fog)",
              background: "rgba(255,255,255,.015)",
            }}
          >
            No submissions yet. Share the public link to start collecting video reviews.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
              <thead>
                <tr style={{ color: "var(--fog)", textAlign: "left", fontSize: "var(--text-xs)", textTransform: "uppercase", letterSpacing: ".08em" }}>
                  <th style={{ padding: "10px 8px" }}>Video</th>
                  <th style={{ padding: "10px 8px" }}>Name</th>
                  <th style={{ padding: "10px 8px" }}>Email</th>
                  <th style={{ padding: "10px 8px" }}>Rating</th>
                  <th style={{ padding: "10px 8px" }}>Date</th>
                  <th style={{ padding: "10px 8px" }}>Status</th>
                  <th style={{ padding: "10px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id} style={{ borderTop: "1px solid var(--ink-3)" }}>
                    <td style={{ padding: "12px 8px" }}>
                      {submission.videoUrl ? (
                        <video
                          src={submission.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          style={{ width: 92, height: 58, borderRadius: 10, objectFit: "cover", background: "var(--ink-2)" }}
                        />
                      ) : (
                        <div style={{ width: 92, height: 58, borderRadius: 10, background: "var(--ink-2)", display: "grid", placeItems: "center", color: "var(--fog)" }}>
                          No preview
                        </div>
                      )}
                    </td>
                    <td style={{ padding: "12px 8px", fontWeight: 600 }}>{submission.reviewerName}</td>
                    <td style={{ padding: "12px 8px", color: "var(--smoke)" }}>{submission.reviewerEmail}</td>
                    <td style={{ padding: "12px 8px", color: "var(--warn)" }}>{renderStars(submission.reviewerRating)}</td>
                    <td style={{ padding: "12px 8px", color: "var(--smoke)" }}>{new Date(submission.createdAt).toLocaleDateString()}</td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "grid", gap: 6 }}>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            width: "fit-content",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: submission.status === "APPROVED" ? "rgba(61,255,160,.08)" : submission.status === "REJECTED" ? "rgba(255,95,61,.08)" : "rgba(255,255,255,.04)",
                            border: submission.status === "APPROVED" ? "1px solid rgba(61,255,160,.14)" : submission.status === "REJECTED" ? "1px solid rgba(255,95,61,.18)" : "1px solid var(--ink-3)",
                            color: submission.status === "APPROVED" ? "var(--success)" : submission.status === "REJECTED" ? "var(--brand-2)" : "var(--smoke)",
                            fontSize: "var(--text-xs)",
                            fontFamily: "Syne, sans-serif",
                          }}
                        >
                          {submission.status}
                        </span>
                        {submission.rewardPending && (
                          <span style={{ color: "var(--brand-2)", fontSize: "var(--text-xs)" }}>
                            Reward to send manually
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "12px 8px" }}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" className="btn btn-ghost" onClick={() => setSelectedSubmission(submission)}>
                          View
                        </button>
                        {submission.videoUrl && (
                          <a href={submission.videoUrl} className="btn btn-ghost" target="_blank" rel="noreferrer" download>
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => updateSubmissionStatus(submission.id, "APPROVED")}
                          disabled={actionLoading === submission.id + "APPROVED"}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          onClick={() => updateSubmissionStatus(submission.id, "REJECTED")}
                          disabled={actionLoading === submission.id + "REJECTED"}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedSubmission && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelectedSubmission(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 80,
            background: "rgba(0,0,0,.7)",
            display: "grid",
            placeItems: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              maxHeight: "90vh",
              overflowY: "auto",
              borderRadius: 24,
              border: "1px solid var(--ink-3)",
              background: "linear-gradient(180deg, rgba(17,17,24,.98), rgba(10,10,15,.98))",
              padding: 22,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
              <div>
                <p className="label" style={{ color: "var(--brand-2)", marginBottom: 8 }}>Submission detail</p>
                <h4 className="heading" style={{ fontSize: "clamp(22px, 3vw, 32px)" }}>{selectedSubmission.reviewerName}</h4>
              </div>
              <button type="button" className="btn btn-ghost" onClick={() => setSelectedSubmission(null)}>
                Close
              </button>
            </div>

            {selectedSubmission.videoUrl && (
              <video
                src={selectedSubmission.videoUrl}
                controls
                playsInline
                style={{ width: "100%", borderRadius: 18, background: "var(--ink)" }}
              />
            )}

            <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid var(--ink-3)" }}>
                  <p className="label" style={{ color: "var(--fog)", marginBottom: 6 }}>Email</p>
                  <p>{selectedSubmission.reviewerEmail}</p>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid var(--ink-3)" }}>
                  <p className="label" style={{ color: "var(--fog)", marginBottom: 6 }}>Rating</p>
                  <p style={{ color: "var(--warn)" }}>{renderStars(selectedSubmission.reviewerRating)}</p>
                </div>
                <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,.02)", border: "1px solid var(--ink-3)" }}>
                  <p className="label" style={{ color: "var(--fog)", marginBottom: 6 }}>Status</p>
                  <p>{selectedSubmission.status}</p>
                </div>
              </div>

              <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,.02)", border: "1px solid var(--ink-3)" }}>
                <p className="label" style={{ color: "var(--fog)", marginBottom: 10 }}>Answers</p>
                {selectedSubmission.answers.length === 0 ? (
                  <p style={{ color: "var(--fog)" }}>No answers saved.</p>
                ) : (
                  <div style={{ display: "grid", gap: 12 }}>
                    {selectedSubmission.answers.map((answer) => (
                      <div key={answer.questionId}>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>{answer.questionText}</p>
                        <p style={{ color: "var(--smoke)" }}>{answer.answer || "No answer"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {selectedSubmission.videoUrl && (
                  <a href={selectedSubmission.videoUrl} className="btn btn-ghost" target="_blank" rel="noreferrer" download>
                    Download video
                  </a>
                )}
                <button type="button" className="btn btn-primary" onClick={() => updateSubmissionStatus(selectedSubmission.id, "APPROVED")}>
                  Approve
                </button>
                <button type="button" className="btn btn-ghost" onClick={() => updateSubmissionStatus(selectedSubmission.id, "REJECTED")}>
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 980px) {
          section > div:nth-of-type(2) {
            grid-template-columns: 1fr !important;
          }
        }

        @media (max-width: 760px) {
          [role="dialog"] video + div > div:first-child {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}

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
    <button type="button" className="campaign-card-secondary-btn" onClick={handleCopy}>
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
    <section className="campaign-card-shell">
      <div className="campaign-card-head">
        <div>
          <p className="campaign-card-eyebrow">{campaign.brandName}</p>
          <h3 className="campaign-card-title">{campaign.name}</h3>
          {campaign.description && <p className="campaign-card-copy">{campaign.description}</p>}
        </div>
        <div className="campaign-card-meta">
          <div className="campaign-card-date">
            {campaign.hasNoEndDate ? "No expiration date" : `Ends on ${new Date(campaign.endsAt || "").toLocaleDateString()}`}
          </div>
          <div className="campaign-card-actions-row">
            <CopyButton text={absolutePublicUrl} label="Copy link" />
            <CopyButton text={campaign.inviteMessage} label="Copy invite message" />
          </div>
        </div>
      </div>

      <div className="campaign-card-grid">
        <div className="campaign-card-panel">
          <p className="campaign-card-label">Public link</p>
          <div className="campaign-card-link">{absolutePublicUrl}</div>
          <textarea readOnly value={campaign.inviteMessage} rows={5} className="campaign-card-textarea" />
        </div>

        <div className="campaign-card-panel">
          <p className="campaign-card-label">Campaign setup</p>
          <div className="campaign-card-stack">
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
              <ol className="campaign-card-list">
                {campaign.questions.map((question) => (
                  <li key={question.id}>
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
        <div className="campaign-card-sub-head">
          <div>
            <p className="campaign-card-eyebrow">Submissions</p>
            <p className="campaign-card-subcopy">
              Manual moderation only. Rewards are sent outside the platform after approval.
            </p>
          </div>
          <span className="campaign-card-total-badge">{submissions.length} total</span>
        </div>

        {submissions.length === 0 ? (
          <div className="campaign-card-empty">
            No submissions yet. Share the public link to start collecting video reviews.
          </div>
        ) : (
          <div className="campaign-card-table-wrap">
            <table className="campaign-card-table">
              <thead>
                <tr>
                  <th>Video</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Rating</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((submission) => (
                  <tr key={submission.id}>
                    <td>
                      {submission.videoUrl ? (
                        <video
                          src={submission.videoUrl}
                          muted
                          playsInline
                          preload="metadata"
                          className="campaign-card-video-thumb"
                        />
                      ) : (
                        <div className="campaign-card-video-empty">No preview</div>
                      )}
                    </td>
                    <td className="campaign-card-strong">{submission.reviewerName}</td>
                    <td>{submission.reviewerEmail}</td>
                    <td className="campaign-card-rating">{renderStars(submission.reviewerRating)}</td>
                    <td>{new Date(submission.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="campaign-card-status-stack">
                        <span
                          className={`campaign-card-status-badge ${
                            submission.status === "APPROVED"
                              ? "is-approved"
                              : submission.status === "REJECTED"
                                ? "is-rejected"
                                : "is-pending"
                          }`}
                        >
                          {submission.status}
                        </span>
                        {submission.rewardPending && (
                          <span className="campaign-card-reward-note">Reward to send manually</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="campaign-card-actions-row">
                        <button
                          type="button"
                          className="campaign-card-secondary-btn"
                          onClick={() => setSelectedSubmission(submission)}
                        >
                          View
                        </button>
                        {submission.videoUrl && (
                          <a
                            href={submission.videoUrl}
                            className="campaign-card-secondary-btn"
                            target="_blank"
                            rel="noreferrer"
                            download
                          >
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          className="campaign-card-primary-btn"
                          onClick={() => updateSubmissionStatus(submission.id, "APPROVED")}
                          disabled={actionLoading === submission.id + "APPROVED"}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          className="campaign-card-secondary-btn"
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
          className="campaign-card-modal-overlay"
        >
          <div onClick={(event) => event.stopPropagation()} className="campaign-card-modal">
            <div className="campaign-card-modal-head">
              <div>
                <p className="campaign-card-eyebrow">Submission detail</p>
                <h4 className="campaign-card-modal-title">{selectedSubmission.reviewerName}</h4>
              </div>
              <button
                type="button"
                className="campaign-card-secondary-btn"
                onClick={() => setSelectedSubmission(null)}
              >
                Close
              </button>
            </div>

            {selectedSubmission.videoUrl && (
              <video src={selectedSubmission.videoUrl} controls playsInline className="campaign-card-modal-video" />
            )}

            <div className="campaign-card-modal-stack">
              <div className="campaign-card-modal-grid">
                <div className="campaign-card-modal-info">
                  <p className="campaign-card-label">Email</p>
                  <p>{selectedSubmission.reviewerEmail}</p>
                </div>
                <div className="campaign-card-modal-info">
                  <p className="campaign-card-label">Rating</p>
                  <p className="campaign-card-rating">{renderStars(selectedSubmission.reviewerRating)}</p>
                </div>
                <div className="campaign-card-modal-info">
                  <p className="campaign-card-label">Status</p>
                  <p>{selectedSubmission.status}</p>
                </div>
              </div>

              <div className="campaign-card-modal-answers">
                <p className="campaign-card-label">Answers</p>
                {selectedSubmission.answers.length === 0 ? (
                  <p className="campaign-card-copy">No answers saved.</p>
                ) : (
                  <div className="campaign-card-stack">
                    {selectedSubmission.answers.map((answer) => (
                      <div key={answer.questionId}>
                        <p className="campaign-card-strong campaign-card-answer-title">{answer.questionText}</p>
                        <p className="campaign-card-copy">{answer.answer || "No answer"}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="campaign-card-actions-row">
                {selectedSubmission.videoUrl && (
                  <a
                    href={selectedSubmission.videoUrl}
                    className="campaign-card-secondary-btn"
                    target="_blank"
                    rel="noreferrer"
                    download
                  >
                    Download video
                  </a>
                )}
                <button
                  type="button"
                  className="campaign-card-primary-btn"
                  onClick={() => updateSubmissionStatus(selectedSubmission.id, "APPROVED")}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="campaign-card-secondary-btn"
                  onClick={() => updateSubmissionStatus(selectedSubmission.id, "REJECTED")}
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{campaignCardStyles}</style>
    </section>
  );
}

const campaignCardStyles = `
  .campaign-card-shell {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 28px;
    padding: 24px clamp(18px, 3vw, 30px);
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 18px 42px rgba(20, 18, 24, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.84) inset;
  }

  .campaign-card-head,
  .campaign-card-sub-head,
  .campaign-card-actions-row,
  .campaign-card-modal-head {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .campaign-card-head {
    margin-bottom: 16px;
  }

  .campaign-card-eyebrow,
  .campaign-card-label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .campaign-card-eyebrow {
    color: var(--brand-2);
    margin-bottom: 8px;
  }

  .campaign-card-label {
    color: rgba(24, 24, 32, 0.38);
    margin-bottom: 10px;
  }

  .campaign-card-title,
  .campaign-card-modal-title {
    color: #121218;
    font-weight: 800;
  }

  .campaign-card-title {
    font-size: clamp(22px, 3vw, 34px);
    margin-bottom: 8px;
  }

  .campaign-card-modal-title {
    font-size: clamp(22px, 3vw, 32px);
  }

  .campaign-card-copy,
  .campaign-card-date,
  .campaign-card-link,
  .campaign-card-subcopy,
  .campaign-card-empty,
  .campaign-card-table td {
    color: rgba(24, 24, 32, 0.5);
  }

  .campaign-card-meta {
    display: grid;
    gap: 8px;
    min-width: 260px;
  }

  .campaign-card-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.8fr;
    gap: 18px;
    margin-bottom: 20px;
  }

  .campaign-card-panel,
  .campaign-card-empty,
  .campaign-card-modal,
  .campaign-card-modal-info,
  .campaign-card-modal-answers {
    border-radius: 18px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.7);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.76) inset;
  }

  .campaign-card-panel {
    padding: 16px;
  }

  .campaign-card-link {
    margin-bottom: 12px;
    word-break: break-all;
  }

  .campaign-card-textarea {
    width: 100%;
    padding: 12px 14px;
    border-radius: 14px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.92);
    color: rgba(24, 24, 32, 0.58);
    resize: vertical;
  }

  .campaign-card-stack {
    display: grid;
    gap: 10px;
    color: rgba(24, 24, 32, 0.58);
  }

  .campaign-card-list {
    padding-left: 18px;
    margin-top: 8px;
  }

  .campaign-card-list li {
    margin-bottom: 6px;
  }

  .campaign-card-sub-head {
    align-items: center;
    margin-bottom: 12px;
  }

  .campaign-card-total-badge,
  .campaign-card-video-badge,
  .campaign-card-status-badge {
    display: inline-flex;
    align-items: center;
    width: fit-content;
    padding: 6px 10px;
    border-radius: 999px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: rgba(255, 255, 255, 0.92);
  }

  .campaign-card-total-badge,
  .campaign-card-video-badge,
  .campaign-card-status-badge.is-pending {
    color: rgba(24, 24, 32, 0.56);
  }

  .campaign-card-status-badge.is-approved {
    color: #2f9964;
    border-color: rgba(47, 153, 100, 0.16);
    background: rgba(47, 153, 100, 0.08);
  }

  .campaign-card-status-badge.is-rejected {
    color: #c94d2e;
    border-color: rgba(255, 92, 53, 0.16);
    background: rgba(255, 92, 53, 0.08);
  }

  .campaign-card-status-stack {
    display: grid;
    gap: 6px;
  }

  .campaign-card-reward-note {
    color: #c94d2e;
    font-size: 12px;
  }

  .campaign-card-empty {
    border-style: dashed;
    padding: 20px;
  }

  .campaign-card-table-wrap {
    overflow-x: auto;
  }

  .campaign-card-table {
    width: 100%;
    border-collapse: collapse;
    min-width: 860px;
  }

  .campaign-card-table thead tr {
    color: rgba(24, 24, 32, 0.38);
    text-align: left;
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .campaign-card-table th {
    padding: 10px 8px;
    font-weight: 700;
  }

  .campaign-card-table tbody tr {
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .campaign-card-table td {
    padding: 12px 8px;
  }

  .campaign-card-video-thumb,
  .campaign-card-video-empty {
    width: 92px;
    height: 58px;
    border-radius: 10px;
    object-fit: contain;
    background: #09090c;
  }

  .campaign-card-video-empty {
    display: grid;
    place-items: center;
    font-size: 12px;
  }

  .campaign-card-strong,
  .campaign-card-answer-title {
    font-weight: 700;
    color: #14141b;
  }

  .campaign-card-rating {
    color: #ffb347;
    font-weight: 700;
  }

  .campaign-card-primary-btn,
  .campaign-card-secondary-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 10px 16px;
    border-radius: 999px;
    font-family: "Figtree", sans-serif;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    text-decoration: none;
  }

  .campaign-card-primary-btn {
    border: none;
    background: var(--brand);
    color: #fff;
    box-shadow: 0 10px 24px rgba(255, 92, 53, 0.18);
  }

  .campaign-card-primary-btn:disabled,
  .campaign-card-secondary-btn:disabled {
    opacity: 0.5;
    cursor: wait;
    box-shadow: none;
  }

  .campaign-card-secondary-btn {
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: rgba(255, 255, 255, 0.92);
    color: #14141b;
  }

  .campaign-card-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 80;
    background: rgba(18, 18, 24, 0.34);
    backdrop-filter: blur(8px);
    display: grid;
    place-items: center;
    padding: 20px;
  }

  .campaign-card-modal {
    width: min(760px, 100%);
    max-height: 90vh;
    overflow-y: auto;
    padding: 22px;
    box-shadow:
      0 24px 56px rgba(20, 18, 24, 0.14),
      0 1px 0 rgba(255, 255, 255, 0.82) inset;
  }

  .campaign-card-modal-video {
    width: 100%;
    border-radius: 18px;
    background: #ece7e2;
  }

  .campaign-card-modal-stack {
    display: grid;
    gap: 12px;
    margin-top: 18px;
  }

  .campaign-card-modal-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
  }

  .campaign-card-modal-info,
  .campaign-card-modal-answers {
    padding: 14px 16px;
  }

  @media (max-width: 980px) {
    .campaign-card-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (max-width: 760px) {
    .campaign-card-shell,
    .campaign-card-modal {
      border-radius: 22px;
      padding: 18px 16px;
    }

    .campaign-card-panel,
    .campaign-card-empty,
    .campaign-card-modal-info,
    .campaign-card-modal-answers {
      border-radius: 16px;
    }

    .campaign-card-modal-grid {
      grid-template-columns: 1fr;
    }
  }
`;

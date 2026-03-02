"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CreatedCampaign = {
  publicPath: string;
  inviteMessage: string;
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
    <button type="button" className="builder-secondary-btn" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  );
}

export default function CampaignBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasReward, setHasReward] = useState(false);
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [hasQuestion, setHasQuestion] = useState(false);
  const [questionText, setQuestionText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null);

  const absolutePublicUrl = useMemo(() => {
    if (!createdCampaign || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}${createdCampaign.publicPath}`;
  }, [createdCampaign]);

  const resetForm = () => {
    setName("");
    setDescription("");
    setHasReward(false);
    setRewardName("");
    setRewardDescription("");
    setHasQuestion(false);
    setQuestionText("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          hasReward,
          rewardText: rewardName,
          rewardValue: rewardDescription,
          hasQuestion,
          questionText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create campaign.");
      }

      setCreatedCampaign({
        publicPath: data.publicPath,
        inviteMessage: data.inviteMessage,
      });
      resetForm();
      router.refresh();
    } catch (submitError) {
      console.error(submitError);
      setError(submitError instanceof Error ? submitError.message : "Failed to create campaign.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="builder-shell">
      <div className="builder-head">
        <p className="builder-eyebrow">Campaign builder</p>
        <h2 className="builder-title">Create a campaign</h2>
        <p className="builder-copy">
          Set the campaign name, choose whether to show a reward, and optionally add one question.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="builder-form">
        <div className="builder-form-body">
          <label className="builder-field">
            <span className="builder-label">Campaign name <span>*</span></span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder="Post-purchase product review"
              className="builder-input"
            />
          </label>

          <label className="builder-field">
            <span className="builder-label">Optional description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 200))}
              placeholder="Add a short note about the campaign."
              rows={3}
              className="builder-input builder-textarea"
            />
          </label>

          <div className={hasReward ? "builder-section-card is-expanded is-reward" : "builder-section-card"}>
            <div className="builder-section-head">
              <div>
                <p className="builder-label builder-section-label">Reward</p>
                <p className="builder-section-copy">
                  Decide whether this campaign includes a reward.
                </p>
              </div>
              <div className="builder-toggle-group">
                <button
                  type="button"
                  className={hasReward ? "builder-toggle is-yes-active" : "builder-toggle"}
                  onClick={() => setHasReward(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={!hasReward ? "builder-toggle is-no-active" : "builder-toggle"}
                  onClick={() => setHasReward(false)}
                >
                  No
                </button>
              </div>
            </div>

            {hasReward && (
              <div className="builder-section-fields">
                <label className="builder-field">
                  <span className="builder-label">Reward name <span>*</span></span>
                  <input
                    value={rewardName}
                    onChange={(event) => setRewardName(event.target.value)}
                    required={hasReward}
                    placeholder="30-day premium access"
                    className="builder-input"
                  />
                </label>

                <label className="builder-field">
                  <span className="builder-label">Reward description <span>*</span></span>
                  <textarea
                    value={rewardDescription}
                    onChange={(event) => setRewardDescription(event.target.value)}
                    required={hasReward}
                    placeholder="Describe what the customer receives after approval."
                    rows={3}
                    className="builder-input builder-textarea"
                  />
                </label>
              </div>
            )}
          </div>

          <div className={hasQuestion ? "builder-section-card is-expanded" : "builder-section-card"}>
            <div className="builder-section-head">
              <div>
                <p className="builder-label builder-section-label">Question</p>
                <p className="builder-section-copy">
                  Add a single prompt if you want to guide the customer.
                </p>
              </div>
              <div className="builder-toggle-group">
                <button
                  type="button"
                  className={hasQuestion ? "builder-toggle is-yes-active" : "builder-toggle"}
                  onClick={() => setHasQuestion(true)}
                >
                  Yes
                </button>
                <button
                  type="button"
                  className={!hasQuestion ? "builder-toggle is-no-active" : "builder-toggle"}
                  onClick={() => setHasQuestion(false)}
                >
                  No
                </button>
              </div>
            </div>

            {hasQuestion && (
              <div className="builder-section-fields">
                <label className="builder-field">
                  <span className="builder-label">Question</span>
                  <textarea
                    value={questionText}
                    onChange={(event) => setQuestionText(event.target.value)}
                    placeholder="What did you like most about the product?"
                    rows={3}
                    className="builder-input builder-textarea"
                  />
                </label>
              </div>
            )}
          </div>

          {error && <div className="builder-error-card">{error}</div>}
        </div>

        <div className="builder-footer-row">
          <p className="builder-footer-copy">
            After creation, you will get the public campaign link and a suggested invite message you can copy.
          </p>
          <button type="submit" className="builder-primary-btn" disabled={loading}>
            {loading ? "Creating..." : "Create campaign"}
          </button>
        </div>
      </form>

      {createdCampaign && (
        <div className="builder-success-card">
          <p className="builder-success-label">Campaign created</p>
          <div className="builder-success-grid">
            <div className="builder-link-box">{absolutePublicUrl || createdCampaign.publicPath}</div>
            <div className="builder-actions-row">
              <CopyButton text={absolutePublicUrl || createdCampaign.publicPath} label="Copy link" />
              <CopyButton text={createdCampaign.inviteMessage} label="Copy invite message" />
            </div>
          </div>
        </div>
      )}

      <style>{builderStyles}</style>
    </div>
  );
}

const builderStyles = `
  .builder-shell {
    border: 1px solid rgba(24, 24, 32, 0.08);
    border-radius: 24px;
    background: #fff;
    box-shadow:
      0 1px 4px rgba(0, 0, 0, 0.04),
      0 12px 28px rgba(0, 0, 0, 0.03);
    overflow: hidden;
  }

  .builder-head {
    padding: 22px 26px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .builder-eyebrow,
  .builder-label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .builder-eyebrow {
    color: var(--brand);
    margin-bottom: 8px;
  }

  .builder-title {
    font-size: clamp(22px, 3vw, 30px);
    margin-bottom: 6px;
    color: #121218;
    letter-spacing: -0.04em;
  }

  .builder-copy,
  .builder-section-copy,
  .builder-footer-copy,
  .builder-link-box {
    color: rgba(24, 24, 32, 0.54);
    font-size: 14px;
  }

  .builder-copy {
    max-width: 760px;
  }

  .builder-form {
    display: grid;
  }

  .builder-form-body,
  .builder-subgrid,
  .builder-section-fields {
    display: grid;
    gap: 18px;
  }

  .builder-form-body {
    padding: 26px;
  }

  .builder-field {
    display: grid;
    gap: 8px;
  }

  .builder-label {
    color: rgba(24, 24, 32, 0.38);
  }

  .builder-label span {
    color: var(--brand);
  }

  .builder-input {
    width: 100%;
    padding: 14px 18px;
    border-radius: 20px;
    border: 2px solid rgba(24, 24, 32, 0.12);
    background: #fff;
    color: #14141b;
    font-size: 15px;
    font-weight: 600;
    outline: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }

  .builder-input:focus {
    border-color: rgba(255, 92, 53, 0.42);
    box-shadow: 0 0 0 4px rgba(255, 92, 53, 0.08);
  }

  .builder-input::placeholder {
    color: rgba(24, 24, 32, 0.34);
  }

  .builder-textarea {
    resize: vertical;
    min-height: 128px;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 14px;
    line-height: 1.55;
  }

  .builder-section-card,
  .builder-success-card,
  .builder-error-card {
    border-radius: 22px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    padding: 18px 20px;
    background: #f7f6f4;
  }

  .builder-section-head,
  .builder-footer-row,
  .builder-actions-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    flex-wrap: wrap;
  }

  .builder-section-label {
    margin-bottom: 6px;
  }

  .builder-section-card.is-expanded {
    border-color: rgba(24, 24, 32, 0.12);
  }

  .builder-section-card.is-reward {
    border-color: rgba(255, 92, 53, 0.22);
    background: #fff8f6;
  }

  .builder-section-fields {
    margin-top: 14px;
    padding-top: 18px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .builder-section-card.is-reward .builder-section-fields {
    border-top-color: rgba(255, 92, 53, 0.16);
  }

  .builder-toggle-group {
    display: inline-flex;
    gap: 6px;
    padding: 4px;
    border-radius: 999px;
    background: rgba(24, 24, 32, 0.05);
  }

  .builder-toggle,
  .builder-secondary-btn,
  .builder-primary-btn {
    border-radius: 999px;
    font-family: "Figtree", sans-serif;
    font-size: 14px;
    font-weight: 800;
    cursor: pointer;
    text-decoration: none;
  }

  .builder-toggle,
  .builder-secondary-btn {
    padding: 10px 18px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    background: #fff;
    color: #14141b;
  }

  .builder-toggle {
    min-width: 76px;
  }

  .builder-toggle.is-yes-active,
  .builder-primary-btn {
    border-color: transparent;
    background: var(--brand);
    color: #fff;
    box-shadow: 0 8px 18px rgba(255, 92, 53, 0.18);
  }

  .builder-toggle.is-no-active {
    border-color: #14141b;
    background: #14141b;
    color: #fff;
  }

  .builder-primary-btn {
    min-height: 52px;
    padding: 0 24px;
  }

  .builder-primary-btn:disabled {
    background: rgba(255, 92, 53, 0.5);
    box-shadow: none;
    cursor: wait;
  }

  .builder-footer-copy {
    max-width: 560px;
  }

  .builder-error-card {
    color: #c94d2e;
    border-color: rgba(255, 92, 53, 0.14);
    background: #fff5f1;
  }

  .builder-success-card {
    margin: 18px 26px 0;
    border-color: rgba(47, 153, 100, 0.14);
    background: #f6fff9;
  }

  .builder-success-label {
    color: #2f9964;
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 10px;
  }

  .builder-success-grid {
    display: grid;
    gap: 12px;
  }

  .builder-link-box {
    border-radius: 16px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    padding: 12px 14px;
    background: #fff;
    word-break: break-all;
  }

  .builder-footer-row {
    padding: 18px 26px 22px;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
    background: #f7f6f4;
  }

  @media (max-width: 760px) {
    .builder-shell {
      border-radius: 20px;
    }

    .builder-head,
    .builder-form-body,
    .builder-footer-row {
      padding-left: 16px;
      padding-right: 16px;
    }

    .builder-section-card,
    .builder-success-card,
    .builder-error-card {
      border-radius: 18px;
      padding: 16px;
    }

    .builder-success-card {
      margin-left: 16px;
      margin-right: 16px;
    }

    .builder-primary-btn,
    .builder-secondary-btn,
    .builder-toggle {
      width: 100%;
      justify-content: center;
      display: inline-flex;
    }

    .builder-toggle-group {
      width: 100%;
      display: grid;
      grid-template-columns: 1fr 1fr;
      padding: 0;
      background: transparent;
    }
  }
`;

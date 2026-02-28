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
        <label className="builder-field">
          <span className="builder-label">Campaign name *</span>
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

        <div className="builder-section-card">
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
                className={hasReward ? "builder-toggle is-active" : "builder-toggle"}
                onClick={() => setHasReward(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!hasReward ? "builder-toggle is-active" : "builder-toggle"}
                onClick={() => setHasReward(false)}
              >
                No
              </button>
            </div>
          </div>

          {hasReward && (
            <div className="builder-subgrid">
              <label className="builder-field">
                <span className="builder-label">Reward name *</span>
                <input
                  value={rewardName}
                  onChange={(event) => setRewardName(event.target.value)}
                  required={hasReward}
                  placeholder="30-day premium access"
                  className="builder-input"
                />
              </label>

              <label className="builder-field">
                <span className="builder-label">Reward description *</span>
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

        <div className="builder-section-card">
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
                className={hasQuestion ? "builder-toggle is-active" : "builder-toggle"}
                onClick={() => setHasQuestion(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!hasQuestion ? "builder-toggle is-active" : "builder-toggle"}
                onClick={() => setHasQuestion(false)}
              >
                No
              </button>
            </div>
          </div>

          {hasQuestion && (
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
          )}
        </div>

        {error && <div className="builder-error-card">{error}</div>}

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
    padding: 22px clamp(18px, 3vw, 26px);
    background: rgba(255, 255, 255, 0.88);
    box-shadow:
      0 18px 42px rgba(20, 18, 24, 0.06),
      0 1px 0 rgba(255, 255, 255, 0.84) inset;
  }

  .builder-head {
    margin-bottom: 18px;
  }

  .builder-eyebrow,
  .builder-label {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .builder-eyebrow {
    color: var(--brand-2);
    margin-bottom: 8px;
  }

  .builder-title {
    font-size: clamp(22px, 3vw, 30px);
    margin-bottom: 6px;
    color: #121218;
  }

  .builder-copy,
  .builder-section-copy,
  .builder-footer-copy,
  .builder-link-box {
    color: rgba(24, 24, 32, 0.5);
    font-size: 14px;
  }

  .builder-copy {
    max-width: 620px;
  }

  .builder-form,
  .builder-subgrid {
    display: grid;
    gap: 18px;
  }

  .builder-field {
    display: grid;
    gap: 8px;
  }

  .builder-label {
    color: rgba(24, 24, 32, 0.4);
  }

  .builder-input {
    width: 100%;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: rgba(255, 255, 255, 0.92);
    color: #14141b;
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.8) inset;
  }

  .builder-input::placeholder {
    color: rgba(24, 24, 32, 0.34);
  }

  .builder-textarea {
    resize: vertical;
  }

  .builder-section-card,
  .builder-success-card,
  .builder-error-card {
    border-radius: 18px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    padding: 16px;
    background: rgba(255, 255, 255, 0.68);
    box-shadow: 0 1px 0 rgba(255, 255, 255, 0.76) inset;
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

  .builder-toggle-group {
    display: inline-flex;
    gap: 8px;
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
    padding: 10px 16px;
    border: 1px solid rgba(24, 24, 32, 0.1);
    background: rgba(255, 255, 255, 0.9);
    color: #14141b;
  }

  .builder-toggle.is-active,
  .builder-primary-btn {
    border: none;
    background: var(--brand);
    color: #fff;
    box-shadow: 0 10px 24px rgba(255, 92, 53, 0.18);
  }

  .builder-primary-btn {
    padding: 14px 22px;
  }

  .builder-primary-btn:disabled {
    background: rgba(255, 92, 53, 0.5);
    box-shadow: none;
    cursor: wait;
  }

  .builder-footer-copy {
    max-width: 620px;
  }

  .builder-error-card {
    color: #c94d2e;
    border-color: rgba(255, 92, 53, 0.14);
  }

  .builder-success-card {
    margin-top: 18px;
    border-color: rgba(47, 153, 100, 0.14);
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
    border-radius: 14px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    padding: 12px;
    background: rgba(255, 255, 255, 0.9);
    word-break: break-all;
  }

  @media (max-width: 760px) {
    .builder-shell {
      border-radius: 20px;
      padding: 18px 16px;
    }

    .builder-section-card,
    .builder-success-card,
    .builder-error-card {
      border-radius: 16px;
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
    }
  }
`;

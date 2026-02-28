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
    <button type="button" className="btn btn-ghost" onClick={handleCopy}>
      {copied ? "Copied" : label}
    </button>
  );
}

export default function CampaignBuilder() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hasReward, setHasReward] = useState(true);
  const [rewardName, setRewardName] = useState("");
  const [rewardDescription, setRewardDescription] = useState("");
  const [hasQuestion, setHasQuestion] = useState(true);
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
    setHasReward(true);
    setRewardName("");
    setRewardDescription("");
    setHasQuestion(true);
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
    <div
      style={{
        border: "1px solid var(--ink-3)",
        borderRadius: 24,
        padding: "22px clamp(18px, 3vw, 26px)",
        background: "rgba(17,17,24,.9)",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <p className="label" style={{ color: "var(--brand-2)", marginBottom: 8 }}>
          Campaign builder
        </p>
        <h2 className="heading" style={{ fontSize: "clamp(22px, 3vw, 30px)", marginBottom: 6 }}>
          Create a campaign
        </h2>
        <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)", maxWidth: 620 }}>
          Set the campaign name, choose whether to show a reward, and optionally add one question.
        </p>
      </div>

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="label" style={{ color: "var(--fog)" }}>Campaign name *</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            placeholder="Post-purchase product review"
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid var(--ink-4)",
              background: "rgba(255,255,255,.03)",
              color: "var(--white)",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 8 }}>
          <span className="label" style={{ color: "var(--fog)" }}>Optional description</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 200))}
            placeholder="Add a short note about the campaign."
            rows={3}
            style={{
              width: "100%",
              padding: "14px 16px",
              borderRadius: 14,
              border: "1px solid var(--ink-4)",
              background: "rgba(255,255,255,.03)",
              color: "var(--white)",
              resize: "vertical",
            }}
          />
        </label>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--ink-3)",
            padding: 16,
            background: "rgba(255,255,255,.02)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p className="label" style={{ color: "var(--fog)", marginBottom: 6 }}>Reward</p>
              <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>
                Decide whether this campaign includes a reward.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={hasReward ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setHasReward(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!hasReward ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setHasReward(false)}
              >
                No
              </button>
            </div>
          </div>

          {hasReward && (
            <div style={{ display: "grid", gap: 14 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span className="label" style={{ color: "var(--fog)" }}>Reward name *</span>
                <input
                  value={rewardName}
                  onChange={(event) => setRewardName(event.target.value)}
                  required={hasReward}
                  placeholder="30-day premium access"
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--ink-4)",
                    background: "rgba(255,255,255,.03)",
                    color: "var(--white)",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: 8 }}>
                <span className="label" style={{ color: "var(--fog)" }}>Reward description *</span>
                <textarea
                  value={rewardDescription}
                  onChange={(event) => setRewardDescription(event.target.value)}
                  required={hasReward}
                  placeholder="Describe what the customer receives after approval."
                  rows={3}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    borderRadius: 14,
                    border: "1px solid var(--ink-4)",
                    background: "rgba(255,255,255,.03)",
                    color: "var(--white)",
                    resize: "vertical",
                  }}
                />
              </label>
            </div>
          )}
        </div>

        <div
          style={{
            borderRadius: 18,
            border: "1px solid var(--ink-3)",
            padding: 16,
            background: "rgba(255,255,255,.02)",
            display: "grid",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <p className="label" style={{ color: "var(--fog)", marginBottom: 6 }}>Question</p>
              <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)" }}>
                Add a single prompt if you want to guide the customer.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className={hasQuestion ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setHasQuestion(true)}
              >
                Yes
              </button>
              <button
                type="button"
                className={!hasQuestion ? "btn btn-primary" : "btn btn-ghost"}
                onClick={() => setHasQuestion(false)}
              >
                No
              </button>
            </div>
          </div>

          {hasQuestion && (
            <label style={{ display: "grid", gap: 8 }}>
              <span className="label" style={{ color: "var(--fog)" }}>Question</span>
              <textarea
                value={questionText}
                onChange={(event) => setQuestionText(event.target.value)}
                placeholder="What did you like most about the product?"
                rows={3}
                style={{
                  width: "100%",
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid var(--ink-4)",
                  background: "rgba(255,255,255,.03)",
                  color: "var(--white)",
                  resize: "vertical",
                }}
              />
            </label>
          )}
        </div>

        {error && (
          <div style={{ borderRadius: 14, padding: 14, background: "rgba(255,95,61,.08)", border: "1px solid rgba(255,95,61,.18)", color: "var(--brand-2)" }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <p style={{ color: "var(--fog)", fontSize: "var(--text-sm)", maxWidth: 620 }}>
            After creation, you will get the public campaign link and a suggested invite message you can copy.
          </p>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating..." : "Create campaign"}
          </button>
        </div>
      </form>

      {createdCampaign && (
        <div
          style={{
            marginTop: 18,
            borderRadius: 20,
            padding: 18,
            border: "1px solid rgba(61,255,160,.14)",
            background: "rgba(61,255,160,.05)",
          }}
        >
          <p className="label" style={{ color: "var(--success)", marginBottom: 10 }}>Campaign created</p>
          <div style={{ display: "grid", gap: 12 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid var(--ink-3)",
                padding: 12,
                background: "rgba(10,10,15,.55)",
                wordBreak: "break-all",
              }}
            >
              {absolutePublicUrl || createdCampaign.publicPath}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <CopyButton text={absolutePublicUrl || createdCampaign.publicPath} label="Copy link" />
              <CopyButton text={createdCampaign.inviteMessage} label="Copy invite message" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

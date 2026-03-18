"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type CreatedCampaign = {
  publicPath: string;
  inviteMessage: string;
};

type CampaignBuilderProps = {
  mode?: "create" | "edit";
  initialValues?: {
    id: string;
    name: string;
    description: string | null;
    rewardText: string;
    rewardValue: string | null;
    isPublished: boolean;
    questions: Array<{
      id: string;
      text: string;
      required: boolean;
      sortOrder: number;
    }>;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
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

export default function CampaignBuilder({
  mode = "create",
  initialValues = null,
  onSuccess,
  onCancel,
}: CampaignBuilderProps) {
  const router = useRouter();
  const isEditMode = mode === "edit";
  const [name, setName] = useState(initialValues?.name ?? "");
  const [description, setDescription] = useState(initialValues?.description ?? "");
  const [hasReward, setHasReward] = useState(Boolean(initialValues?.rewardText));
  const [rewardName, setRewardName] = useState(initialValues?.rewardText ?? "");
  const [rewardDescription, setRewardDescription] = useState(initialValues?.rewardValue ?? "");
  const [hasQuestion, setHasQuestion] = useState(Boolean(initialValues?.questions?.[0]?.text));
  const [questionText, setQuestionText] = useState(initialValues?.questions?.[0]?.text ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [createdCampaign, setCreatedCampaign] = useState<CreatedCampaign | null>(null);
  const [isPublished, setIsPublished] = useState(initialValues?.isPublished ?? false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  const absolutePublicUrl = useMemo(() => {
    if (!createdCampaign || typeof window === "undefined") {
      return "";
    }

    return `${window.location.origin}${createdCampaign.publicPath}`;
  }, [createdCampaign]);

  const resetForm = () => {
    if (isEditMode && initialValues) {
      setName(initialValues.name);
      setDescription(initialValues.description ?? "");
      setHasReward(Boolean(initialValues.rewardText));
      setRewardName(initialValues.rewardText);
      setRewardDescription(initialValues.rewardValue ?? "");
      setHasQuestion(Boolean(initialValues.questions?.[0]?.text));
      setQuestionText(initialValues.questions?.[0]?.text ?? "");
      setIsPublished(initialValues.isPublished);
      setShowUnpublishConfirm(false);
      return;
    }

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
    setCreatedCampaign(null);

    try {
      const endpoint =
        isEditMode && initialValues ? `/api/campaigns/${initialValues.id}` : "/api/campaigns";
      const response = await fetch(endpoint, {
        method: isEditMode ? "PUT" : "POST",
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
        throw new Error(data.error || `Failed to ${isEditMode ? "update" : "create"} campaign.`);
      }

      setCreatedCampaign({
        publicPath: data.publicPath,
        inviteMessage: data.inviteMessage,
      });

      if (!isEditMode) {
        resetForm();
      }

      router.refresh();
      onSuccess?.();
    } catch (submitError) {
      console.error(submitError);
      setError(
        submitError instanceof Error
          ? submitError.message
          : `Failed to ${isEditMode ? "update" : "create"} campaign.`
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePublishStateChange = async (action: "publish" | "unpublish") => {
    if (!isEditMode || !initialValues) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${initialValues.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} campaign.`);
      }

      setIsPublished(action === "publish");
      setShowUnpublishConfirm(false);
      router.refresh();
    } catch (actionError) {
      console.error(actionError);
      setError(actionError instanceof Error ? actionError.message : `Failed to ${action} campaign.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="builder-shell">
      <div className="builder-head">
        <p className="builder-eyebrow">Campaign builder</p>
        <h2 className="builder-title">{isEditMode ? "Edit campaign" : "Nuova campagna"}</h2>
        <p className="builder-copy">
          {isEditMode ? "Aggiorna la configurazione della campagna." : "Configura la nuova campagna."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="builder-form">
        <div className="builder-form-body">
          <section className="builder-row">
            <div className="builder-row-copy">
              <h3 className="builder-row-title">Nome campagna</h3>
              <p className="builder-row-text">
                Il nome interno della campagna. I clienti non lo vedono.
              </p>
            </div>
            <div className="builder-row-panel">
              <label className="builder-field">
                <span className="builder-field-title">Nome <span>*</span></span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Es. Post-acquisto prodotto"
                  className="builder-input"
                />
              </label>

              <label className="builder-field">
                <span className="builder-field-title">Descrizione (opzionale)</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 200))}
                  placeholder="Note interne sulla campagna..."
                  rows={4}
                  className="builder-input builder-textarea"
                />
              </label>
            </div>
          </section>

          <section className="builder-row">
            <div className="builder-row-copy">
              <h3 className="builder-row-title">Reward</h3>
              <p className="builder-row-text">
                Offri un incentivo ai clienti che lasciano una recensione video.
              </p>
            </div>
            <div className="builder-row-panel">
              <div className={`builder-toggle-card ${hasReward ? "is-active is-reward" : ""}`}>
                <div className="builder-toggle-card-copy">
                  <p className="builder-toggle-card-title">Aggiungi un reward</p>
                  <p className="builder-toggle-card-text">
                    Codice sconto, accesso premium, spedizione gratuita...
                  </p>
                </div>
                <button
                  type="button"
                  className={`builder-switch ${hasReward ? "is-on" : ""}`}
                  onClick={() => setHasReward((current) => !current)}
                  aria-pressed={hasReward}
                  aria-label={hasReward ? "Disable reward" : "Enable reward"}
                >
                  <span className="builder-switch-thumb" />
                </button>
              </div>

              {hasReward && (
                <div className="builder-inline-fields">
                  <label className="builder-field">
                    <span className="builder-field-title">Reward name <span>*</span></span>
                    <input
                      value={rewardName}
                      onChange={(event) => setRewardName(event.target.value)}
                      required={hasReward}
                      placeholder="30 giorni premium"
                      className="builder-input"
                    />
                  </label>

                  <label className="builder-field">
                    <span className="builder-field-title">Reward description <span>*</span></span>
                    <textarea
                      value={rewardDescription}
                      onChange={(event) => setRewardDescription(event.target.value)}
                      required={hasReward}
                      placeholder="Descrivi cosa riceve il cliente dopo l'approvazione."
                      rows={3}
                      className="builder-input builder-textarea builder-textarea-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          <section className="builder-row">
            <div className="builder-row-copy">
              <h3 className="builder-row-title">Domanda</h3>
              <p className="builder-row-text">
                Una singola domanda per guidare il cliente nella recensione.
              </p>
            </div>
            <div className="builder-row-panel">
              <div className={`builder-toggle-card ${hasQuestion ? "is-active" : ""}`}>
                <div className="builder-toggle-card-copy">
                  <p className="builder-toggle-card-title">Aggiungi una domanda</p>
                  <p className="builder-toggle-card-text">
                    Es. Cosa hai apprezzato di più del prodotto?
                  </p>
                </div>
                <button
                  type="button"
                  className={`builder-switch ${hasQuestion ? "is-on" : ""}`}
                  onClick={() => setHasQuestion((current) => !current)}
                  aria-pressed={hasQuestion}
                  aria-label={hasQuestion ? "Disable question" : "Enable question"}
                >
                  <span className="builder-switch-thumb" />
                </button>
              </div>

              {hasQuestion && (
                <div className="builder-inline-fields">
                  <label className="builder-field">
                    <span className="builder-field-title">Question</span>
                    <textarea
                      value={questionText}
                      onChange={(event) => setQuestionText(event.target.value)}
                      placeholder="Es. Cosa hai apprezzato di più del prodotto?"
                      rows={3}
                      className="builder-input builder-textarea builder-textarea-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          </section>

          {error && <div className="builder-error-card">{error}</div>}
        </div>

        <div className="builder-footer-row">
          <p className="builder-footer-copy">
            {isEditMode
              ? "Update the public-facing campaign details without changing its link."
              : "Rivedi i dettagli e crea la campagna quando sei pronto."}
          </p>
          <div className="builder-footer-actions">
            {onCancel && (
              <button type="button" className="builder-secondary-btn" onClick={onCancel} disabled={loading}>
                Annulla
              </button>
            )}
            {isEditMode && isPublished && (
              <button
                type="button"
                className="builder-secondary-btn builder-danger-btn"
                onClick={() => setShowUnpublishConfirm(true)}
                disabled={loading}
              >
                Unpublish
              </button>
            )}
            {isEditMode && !isPublished && (
              <button
                type="button"
                className="builder-secondary-btn"
                onClick={() => {
                  handlePublishStateChange("publish");
                }}
                disabled={loading}
              >
                Publish
              </button>
            )}
            <button type="submit" className="builder-primary-btn" disabled={loading}>
              {loading
                ? isEditMode
                  ? "Saving..."
                  : "Creating..."
                : isEditMode
                  ? "Save changes"
                  : "Crea campagna"}
            </button>
          </div>
        </div>
      </form>

      {createdCampaign && (
        <div className="builder-success-card">
          <p className="builder-success-label">{isEditMode ? "Campaign updated" : "Campaign created"}</p>
          <div className="builder-success-grid">
            <div className="builder-link-box">{absolutePublicUrl || createdCampaign.publicPath}</div>
            <div className="builder-actions-row">
              <CopyButton text={absolutePublicUrl || createdCampaign.publicPath} label="Copy link" />
              <CopyButton text={createdCampaign.inviteMessage} label="Copy invite message" />
            </div>
          </div>
        </div>
      )}

      {showUnpublishConfirm && (
        <div className="builder-modal-backdrop" role="presentation">
          <div
            className="builder-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="builder-unpublish-title"
          >
            <p className="builder-success-label">Campaign status</p>
            <h3 id="builder-unpublish-title" className="builder-modal-title">
              Unpublish this campaign?
            </h3>
            <p className="builder-modal-copy">
              Se la disattivi i tuoi utenti verranno indirizzati al tuo Wall of Love automaticamente,
              ma puoi riattivarla quando vuoi.
            </p>
            <div className="builder-modal-actions">
              <button
                type="button"
                className="builder-secondary-btn"
                onClick={() => setShowUnpublishConfirm(false)}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="button"
                className="builder-primary-btn"
                onClick={() => {
                  handlePublishStateChange("unpublish");
                }}
                disabled={loading}
              >
                {loading ? "Unpublishing..." : "Unpublish"}
              </button>
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
    border: none;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    overflow: hidden;
  }

  .builder-head {
    padding: 2px 0 14px;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
  }

  .builder-eyebrow {
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--brand);
    margin-bottom: 6px;
    font-family: "DM Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  }

  .builder-title {
    font-size: clamp(20px, 2.4vw, 26px);
    margin: 0 0 2px;
    color: #121218;
    letter-spacing: -0.04em;
  }

  .builder-copy,
  .builder-row-text,
  .builder-footer-copy,
  .builder-link-box,
  .builder-toggle-card-text {
    color: rgba(24, 24, 32, 0.54);
    font-size: 13px;
  }

  .builder-copy,
  .builder-row-text,
  .builder-footer-copy,
  .builder-toggle-card-text,
  .builder-modal-copy {
    line-height: 1.6;
  }

  .builder-form {
    display: grid;
  }

  .builder-form-body {
    display: grid;
    gap: 0;
    padding: 0;
  }

  .builder-row {
    display: grid;
    grid-template-columns: minmax(220px, 320px) minmax(0, 1fr);
    gap: 28px;
    padding: 24px 0;
    border-bottom: 1px solid rgba(24, 24, 32, 0.08);
    align-items: start;
  }

  .builder-row-copy {
    display: grid;
    gap: 8px;
    padding-top: 4px;
  }

  .builder-row-title {
    margin: 0;
    font-size: 17px;
    line-height: 1.1;
    color: #121218;
    letter-spacing: -0.03em;
  }

  .builder-row-text {
    margin: 0;
    max-width: 280px;
  }

  .builder-row-panel {
    display: grid;
    gap: 14px;
    min-width: 0;
  }

  .builder-field {
    display: grid;
    gap: 8px;
  }

  .builder-field-title {
    font-size: 13px;
    font-weight: 700;
    color: #2f2f36;
    letter-spacing: -0.01em;
  }

  .builder-field-title span {
    color: var(--brand);
  }

  .builder-input {
    width: 100%;
    padding: 13px 14px;
    border-radius: 12px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    background: rgba(255, 255, 255, 0.86);
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
    font-weight: 500;
  }

  .builder-textarea {
    resize: vertical;
    min-height: 124px;
    font-family: "Figtree", sans-serif;
    line-height: 1.55;
  }

  .builder-textarea-sm {
    min-height: 96px;
  }

  .builder-toggle-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    border: 1px solid rgba(24, 24, 32, 0.1);
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.72);
    padding: 14px;
  }

  .builder-toggle-card.is-active {
    border-color: rgba(24, 24, 32, 0.18);
    box-shadow: inset 0 0 0 1px rgba(24, 24, 32, 0.03);
  }

  .builder-toggle-card.is-reward {
    border-color: rgba(255, 92, 53, 0.22);
    background: rgba(255, 92, 53, 0.05);
  }

  .builder-toggle-card-copy {
    display: grid;
    gap: 4px;
  }

  .builder-toggle-card-title {
    margin: 0;
    font-size: 15px;
    font-weight: 800;
    color: #121218;
    letter-spacing: -0.02em;
  }

  .builder-toggle-card-text {
    margin: 0;
  }

  .builder-inline-fields {
    display: grid;
    gap: 12px;
  }

  .builder-switch {
    width: 58px;
    height: 34px;
    border: 1px solid rgba(24, 24, 32, 0.14);
    border-radius: 999px;
    background: #f1efec;
    padding: 3px;
    cursor: pointer;
    position: relative;
    flex-shrink: 0;
    transition: background 160ms ease, border-color 160ms ease;
  }

  .builder-switch.is-on {
    background: rgba(255, 92, 53, 0.16);
    border-color: rgba(255, 92, 53, 0.22);
  }

  .builder-switch-thumb {
    display: block;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.12);
    transition: transform 160ms ease;
  }

  .builder-switch.is-on .builder-switch-thumb {
    transform: translateX(24px);
  }

  .builder-footer-row,
  .builder-actions-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
  }

  .builder-footer-actions,
  .builder-modal-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .builder-secondary-btn,
  .builder-primary-btn {
    border-radius: 999px;
    font-family: "Figtree", sans-serif;
    font-size: 12px;
    font-weight: 800;
    cursor: pointer;
    text-decoration: none;
  }

  .builder-secondary-btn {
    min-height: 38px;
    padding: 0 14px;
    border: 1px solid rgba(24, 24, 32, 0.12);
    background: rgba(255, 255, 255, 0.8);
    color: #14141b;
  }

  .builder-primary-btn {
    min-height: 40px;
    padding: 0 16px;
    border: none;
    background: var(--brand);
    color: #fff;
  }

  .builder-primary-btn:disabled {
    background: rgba(255, 92, 53, 0.5);
    box-shadow: none;
    cursor: wait;
  }

  .builder-danger-btn {
    border-color: rgba(201, 77, 46, 0.18);
    color: #c94d2e;
    background: #fff5f1;
  }

  .builder-footer-copy {
    max-width: 560px;
    margin: 0;
  }

  .builder-error-card {
    margin: 20px 0 0;
    color: #c94d2e;
    border: 1px solid rgba(255, 92, 53, 0.14);
    border-radius: 14px;
    padding: 12px 14px;
    background: #fff5f1;
  }

  .builder-success-card {
    margin: 14px 20px 0;
    border-radius: 16px;
    border: 1px solid rgba(47, 153, 100, 0.14);
    padding: 14px 16px;
    background: #f6fff9;
  }

  .builder-success-label {
    color: #2f9964;
    font-size: 10px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 700;
    margin-bottom: 8px;
  }

  .builder-success-grid {
    display: grid;
    gap: 10px;
  }

  .builder-link-box {
    border-radius: 12px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    padding: 10px 12px;
    background: #fff;
    word-break: break-all;
  }

  .builder-footer-row {
    padding: 16px 0 0;
    background: transparent;
    border-top: 1px solid rgba(24, 24, 32, 0.08);
  }

  .builder-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(17, 19, 24, 0.42);
    display: grid;
    place-items: center;
    padding: 20px;
    z-index: 50;
  }

  .builder-modal {
    width: min(460px, 100%);
    border-radius: 18px;
    border: 1px solid rgba(24, 24, 32, 0.08);
    background: #fff;
    box-shadow: 0 12px 36px rgba(0, 0, 0, 0.16);
    padding: 18px 20px;
  }

  .builder-modal-title {
    margin: 0 0 8px;
    font-size: 22px;
    line-height: 1.05;
    letter-spacing: -0.04em;
    color: #121218;
  }

  .builder-modal-copy {
    margin: 0;
    font-size: 14px;
    color: rgba(24, 24, 32, 0.64);
  }

  .builder-modal-actions {
    margin-top: 18px;
  }

  @media (max-width: 980px) {
    .builder-row {
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .builder-row-copy {
      padding-top: 0;
    }

    .builder-row-text {
      max-width: none;
    }
  }

  @media (max-width: 760px) {
    .builder-head,
    .builder-form-body,
    .builder-footer-row {
      padding-left: 0;
      padding-right: 0;
    }

    .builder-toggle-card {
      padding: 14px;
      align-items: flex-start;
    }

    .builder-secondary-btn,
    .builder-primary-btn {
      width: 100%;
      justify-content: center;
      display: inline-flex;
    }
  }
`;

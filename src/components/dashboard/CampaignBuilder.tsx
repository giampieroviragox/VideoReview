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

function BuilderSwitch({
  checked,
  label,
}: {
  checked: boolean;
  label: string;
}) {
  return (
    <span
      className={`builder-switch ${checked ? "is-on" : ""}`}
      role="switch"
      aria-checked={checked}
      aria-label={label}
    >
      <span className="builder-switch-thumb" />
    </span>
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
  const [rewardType, setRewardType] = useState(initialValues?.rewardText ? "Custom" : "Codice sconto");
  const [rewardName, setRewardName] = useState(initialValues?.rewardText ?? "");
  const [rewardDescription, setRewardDescription] = useState(initialValues?.rewardValue ?? "");
  const [hasQuestion, setHasQuestion] = useState(Boolean(initialValues?.questions?.[0]?.text));
  const [questionText, setQuestionText] = useState(initialValues?.questions?.[0]?.text ?? "");
  const [promptTitle, setPromptTitle] = useState("");
  const [promptSubtitle, setPromptSubtitle] = useState("");
  const [manualApproval, setManualApproval] = useState(true);
  const [allowTextReviews, setAllowTextReviews] = useState(true);
  const [starRatingEnabled, setStarRatingEnabled] = useState(true);
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
      setRewardType(initialValues.rewardText ? "Custom" : "Codice sconto");
      setRewardName(initialValues.rewardText);
      setRewardDescription(initialValues.rewardValue ?? "");
      setHasQuestion(Boolean(initialValues.questions?.[0]?.text));
      setQuestionText(initialValues.questions?.[0]?.text ?? "");
      setPromptTitle("");
      setPromptSubtitle("");
      setManualApproval(true);
      setAllowTextReviews(true);
      setStarRatingEnabled(true);
      setIsPublished(initialValues.isPublished);
      setShowUnpublishConfirm(false);
      return;
    }

    setName("");
    setDescription("");
    setHasReward(false);
    setRewardType("Codice sconto");
    setRewardName("");
    setRewardDescription("");
    setHasQuestion(false);
    setQuestionText("");
    setPromptTitle("");
    setPromptSubtitle("");
    setManualApproval(true);
    setAllowTextReviews(true);
    setStarRatingEnabled(true);
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
          rewardValue: rewardDescription.trim() || rewardType,
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
      <form onSubmit={handleSubmit} className="builder-form">
        <div className="builder-head">
          <p className="builder-eyebrow">Campaign Builder</p>
          <h2 className="builder-title">{isEditMode ? "Modifica campagna" : "Nuova campagna"}</h2>
          <p className="builder-copy">
            {isEditMode ? "Aggiorna i dettagli della campagna." : "Configura la nuova campagna."}
          </p>
        </div>

        <div className="builder-body">
          <section className="builder-section">
            <div className="builder-section-copy">
              <h3 className="builder-section-title">Nome campagna</h3>
              <p className="builder-section-text">
                Il nome interno della campagna. I clienti non lo vedono.
              </p>
            </div>
            <div className="builder-section-panel">
              <label className="builder-field">
                <span className="builder-field-title">
                  Nome <span className="builder-required">*</span>
                </span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  required
                  placeholder="Es. Post-acquisto prodotto"
                  className="builder-input"
                />
              </label>

              <label className="builder-field">
                <span className="builder-field-title">
                  Descrizione <span className="builder-field-optional">(opzionale)</span>
                </span>
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

          <section className="builder-section">
            <div className="builder-section-copy">
              <h3 className="builder-section-title">Reward</h3>
              <p className="builder-section-text">
                Offri un incentivo ai clienti che lasciano una recensione video.
              </p>
            </div>
            <div className="builder-section-panel">
              <div className="builder-toggle-card">
                <button
                  type="button"
                  className="builder-toggle-card-head"
                  onClick={() => setHasReward((current) => !current)}
                >
                  <div className="builder-toggle-copy">
                    <p className="builder-toggle-title">Aggiungi un reward</p>
                    <p className="builder-toggle-text">
                      Codice sconto, accesso premium, spedizione gratuita...
                    </p>
                  </div>
                  <BuilderSwitch checked={hasReward} label={hasReward ? "Disable reward" : "Enable reward"} />
                </button>

                {hasReward && (
                  <div className="builder-toggle-card-body">
                    <div className="builder-grid-two">
                      <label className="builder-field">
                        <span className="builder-field-title">Tipo di reward</span>
                        <div className="builder-select-wrap">
                          <select
                            value={rewardType}
                            onChange={(event) => setRewardType(event.target.value)}
                            className="builder-input builder-select"
                          >
                            <option>Codice sconto</option>
                            <option>Gift card</option>
                            <option>Accesso premium</option>
                            <option>Custom</option>
                          </select>
                        </div>
                      </label>

                      <label className="builder-field">
                        <span className="builder-field-title">
                          Valore <span className="builder-required">*</span>
                        </span>
                        <input
                          value={rewardName}
                          onChange={(event) => setRewardName(event.target.value)}
                          required={hasReward}
                          placeholder="Es. 20% off, 30 giorni premium..."
                          className="builder-input"
                        />
                      </label>
                    </div>

                    <label className="builder-field">
                      <span className="builder-field-title">
                        Messaggio <span className="builder-field-optional">(opzionale)</span>
                      </span>
                      <input
                        value={rewardDescription}
                        onChange={(event) => setRewardDescription(event.target.value)}
                        placeholder="Es. Ecco il tuo reward!"
                        className="builder-input"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="builder-section">
            <div className="builder-section-copy">
              <h3 className="builder-section-title">Domanda</h3>
              <p className="builder-section-text">
                Una singola domanda per guidare il cliente nella recensione.
              </p>
            </div>
            <div className="builder-section-panel">
              <div className="builder-toggle-card">
                <button
                  type="button"
                  className="builder-toggle-card-head"
                  onClick={() => setHasQuestion((current) => !current)}
                >
                  <div className="builder-toggle-copy">
                    <p className="builder-toggle-title">Aggiungi una domanda</p>
                    <p className="builder-toggle-text">
                      Es. Cosa hai apprezzato di più del prodotto?
                    </p>
                  </div>
                  <BuilderSwitch
                    checked={hasQuestion}
                    label={hasQuestion ? "Disable question" : "Enable question"}
                  />
                </button>

                {hasQuestion && (
                  <div className="builder-toggle-card-body">
                    <label className="builder-field">
                      <span className="builder-field-title">La tua domanda</span>
                      <input
                        value={questionText}
                        onChange={(event) => setQuestionText(event.target.value)}
                        placeholder="Es. Cosa hai apprezzato di più del prodotto?"
                        className="builder-input"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="builder-section">
            <div className="builder-section-copy">
              <h3 className="builder-section-title">Prompt widget</h3>
              <p className="builder-section-text">
                Il testo mostrato al cliente nella schermata di registrazione.
              </p>
            </div>
            <div className="builder-section-panel">
              <label className="builder-field">
                <span className="builder-field-title">Titolo</span>
                <input
                  value={promptTitle}
                  onChange={(event) => setPromptTitle(event.target.value)}
                  placeholder="Es. Raccontaci la tua esperienza"
                  className="builder-input"
                />
              </label>

              <label className="builder-field">
                <span className="builder-field-title">
                  Sottotitolo <span className="builder-field-optional">(opzionale)</span>
                </span>
                <input
                  value={promptSubtitle}
                  onChange={(event) => setPromptSubtitle(event.target.value)}
                  placeholder="Es. Un video di 60 secondi aiuta altri clienti a scegliere."
                  className="builder-input"
                />
              </label>
            </div>
          </section>

          <section className="builder-section builder-section-last">
            <div className="builder-section-copy">
              <h3 className="builder-section-title">Opzioni</h3>
              <p className="builder-section-text">
                Configura il comportamento della campagna.
              </p>
            </div>
            <div className="builder-section-panel">
              <div className="builder-options-card">
                <button
                  type="button"
                  className="builder-option-row"
                  onClick={() => setManualApproval((current) => !current)}
                >
                  <div className="builder-option-copy">
                    <p className="builder-option-title">Approvazione manuale</p>
                    <p className="builder-option-text">
                      Approva ogni recensione prima della pubblicazione
                    </p>
                  </div>
                  <BuilderSwitch
                    checked={manualApproval}
                    label={manualApproval ? "Disable manual approval" : "Enable manual approval"}
                  />
                </button>

                <button
                  type="button"
                  className="builder-option-row"
                  onClick={() => setAllowTextReviews((current) => !current)}
                >
                  <div className="builder-option-copy">
                    <p className="builder-option-title">Consenti testo</p>
                    <p className="builder-option-text">
                      I clienti possono lasciare una recensione testuale
                    </p>
                  </div>
                  <BuilderSwitch
                    checked={allowTextReviews}
                    label={allowTextReviews ? "Disable text reviews" : "Enable text reviews"}
                  />
                </button>

                <button
                  type="button"
                  className="builder-option-row"
                  onClick={() => setStarRatingEnabled((current) => !current)}
                >
                  <div className="builder-option-copy">
                    <p className="builder-option-title">Rating con stelle</p>
                    <p className="builder-option-text">
                      Mostra il passo di valutazione a stelle prima della registrazione
                    </p>
                  </div>
                  <BuilderSwitch
                    checked={starRatingEnabled}
                    label={starRatingEnabled ? "Disable star rating" : "Enable star rating"}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {error && <div className="builder-error-card">{error}</div>}

        <div className="builder-footer">
          <p className="builder-footer-copy">
            {isEditMode
              ? "Aggiorna la campagna quando sei pronto."
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
              <span>
                {loading
                  ? isEditMode
                    ? "Saving..."
                    : "Creating..."
                  : isEditMode
                    ? "Save changes"
                    : "Crea campagna"}
              </span>
              {!isEditMode && !loading && (
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 11 11"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M1 5.5h8M6 2.5l3 3-3 3"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
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
              Se la disattivi, il link pubblico della campagna non sarà più disponibile.
              Puoi riattivarla quando vuoi.
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
    --builder-font: "Geist", "Inter", "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --builder-brand: #ff4820;
    --builder-bg: #ffffff;
    --builder-bg-subtle: #fafafa;
    --builder-text: #111111;
    --builder-text-secondary: #6f6f6f;
    --builder-text-tertiary: #a2a2a2;
    --builder-border: #ece8e1;
    --builder-border-strong: #ded8cf;
    font-family: var(--builder-font);
    color: var(--builder-text);
  }

  .builder-form {
    display: grid;
  }

  .builder-head {
    max-width: 900px;
    padding: 6px 0 4px;
  }

  .builder-eyebrow {
    margin: 0 0 4px;
    color: var(--builder-brand);
    font-size: 11px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .builder-title {
    margin: 0;
    font-size: clamp(22px, 2vw, 30px);
    line-height: 1.05;
    letter-spacing: -0.04em;
    font-weight: 700;
  }

  .builder-copy {
    margin: 4px 0 0;
    color: var(--builder-text-secondary);
    font-size: 13px;
    line-height: 1.45;
  }

  .builder-body {
    max-width: 900px;
    border-top: 1px solid var(--builder-border);
  }

  .builder-section {
    display: grid;
    grid-template-columns: minmax(220px, 332px) minmax(0, 1fr);
    gap: 28px;
    padding: 22px 0;
    border-bottom: 1px solid var(--builder-border);
    align-items: start;
  }

  .builder-section-last {
    border-bottom: none;
  }

  .builder-section-copy {
    display: grid;
    gap: 8px;
    padding-top: 1px;
  }

  .builder-section-title {
    margin: 0;
    font-size: 15px;
    line-height: 1.2;
    letter-spacing: -0.03em;
    font-weight: 700;
  }

  .builder-section-text {
    margin: 0;
    max-width: 260px;
    color: var(--builder-text-secondary);
    font-size: 13px;
    line-height: 1.5;
  }

  .builder-section-panel {
    display: grid;
    gap: 12px;
    min-width: 0;
  }

  .builder-grid-two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .builder-field {
    display: grid;
    gap: 6px;
  }

  .builder-field-title {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    color: var(--builder-text);
    font-size: 11px;
    line-height: 1.3;
    font-weight: 600;
    letter-spacing: -0.01em;
  }

  .builder-required {
    color: var(--builder-brand);
  }

  .builder-field-optional {
    color: var(--builder-text-secondary);
    font-weight: 500;
  }

  .builder-input {
    width: 100%;
    min-height: 34px;
    padding: 0 11px;
    border: 1px solid var(--builder-border-strong);
    border-radius: 6px;
    background: var(--builder-bg);
    color: var(--builder-text);
    font: inherit;
    font-size: 13px;
    line-height: 1.3;
    outline: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease,
      background-color 160ms ease;
  }

  .builder-input:hover {
    border-color: #d3cdc4;
  }

  .builder-input:focus {
    border-color: #cfc7bc;
    box-shadow: 0 0 0 3px rgba(17, 17, 17, 0.04);
  }

  .builder-input::placeholder {
    color: var(--builder-text-tertiary);
  }

  .builder-textarea {
    min-height: 88px;
    padding: 9px 11px;
    resize: vertical;
  }

  .builder-select-wrap {
    position: relative;
  }

  .builder-select {
    appearance: none;
    padding-right: 44px;
    cursor: pointer;
    background-image:
      linear-gradient(45deg, transparent 50%, #6f6f6f 50%),
      linear-gradient(135deg, #6f6f6f 50%, transparent 50%);
    background-position:
      calc(100% - 18px) 18px,
      calc(100% - 12px) 18px;
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
  }

  .builder-toggle-card,
  .builder-options-card {
    border: 1px solid var(--builder-border);
    border-radius: 8px;
    background: #fcfcfb;
    overflow: hidden;
  }

  .builder-toggle-card-head,
  .builder-option-row {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    padding: 11px 13px;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }

  .builder-option-row + .builder-option-row {
    border-top: 1px solid var(--builder-border);
  }

  .builder-toggle-card-head:hover,
  .builder-option-row:hover {
    background: rgba(17, 17, 17, 0.015);
  }

  .builder-toggle-copy,
  .builder-option-copy {
    min-width: 0;
  }

  .builder-toggle-title,
  .builder-option-title {
    margin: 0;
    font-size: 13px;
    line-height: 1.25;
    letter-spacing: -0.02em;
    font-weight: 700;
  }

  .builder-toggle-text,
  .builder-option-text {
    margin: 4px 0 0;
    color: var(--builder-text-secondary);
    font-size: 12px;
    line-height: 1.45;
  }

  .builder-toggle-card-body {
    display: grid;
    gap: 10px;
    padding: 0 13px 13px;
    border-top: 1px solid var(--builder-border);
    background: #ffffff;
  }

  .builder-toggle-card-body .builder-field:first-child {
    padding-top: 11px;
  }

  .builder-switch {
    width: 34px;
    height: 20px;
    flex: 0 0 auto;
    display: inline-flex;
    align-items: center;
    padding: 2px;
    border-radius: 999px;
    background: #d2d2d2;
    transition: background-color 160ms ease;
  }

  .builder-switch.is-on {
    background: #0f0f10;
  }

  .builder-switch-thumb {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    background: #ffffff;
    box-shadow: 0 1px 2px rgba(17, 17, 17, 0.12);
    transform: translateX(0);
    transition: transform 160ms ease;
  }

  .builder-switch.is-on .builder-switch-thumb {
    transform: translateX(14px);
  }

  .builder-error-card,
  .builder-success-card {
    max-width: 900px;
    margin-top: 14px;
    padding: 14px 16px;
    border: 1px solid var(--builder-border);
    border-radius: 12px;
    background: #ffffff;
  }

  .builder-error-card {
    color: #9d2b12;
    background: #fff5f2;
    border-color: rgba(255, 72, 32, 0.18);
  }

  .builder-success-label {
    margin: 0 0 6px;
    color: var(--builder-brand);
    font-size: 11px;
    line-height: 1.1;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    font-weight: 700;
  }

  .builder-success-grid {
    display: grid;
    gap: 10px;
  }

  .builder-link-box {
    padding: 12px 14px;
    border: 1px solid var(--builder-border);
    border-radius: 10px;
    background: #fbfbfb;
    color: var(--builder-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    word-break: break-all;
  }

  .builder-actions-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .builder-footer {
    position: sticky;
    bottom: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 12px 0 4px;
    margin-top: 2px;
    background: #ffffff;
    border-top: 1px solid var(--builder-border);
  }

  .builder-footer-copy {
    margin: 0;
    color: var(--builder-text-secondary);
    font-size: 12px;
    line-height: 1.4;
  }

  .builder-footer-actions {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    flex-shrink: 0;
  }

  .builder-primary-btn,
  .builder-secondary-btn {
    min-height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 0 12px;
    border-radius: 6px;
    border: 1px solid var(--builder-border-strong);
    font: inherit;
    font-size: 13px;
    line-height: 1;
    font-weight: 500;
    letter-spacing: -0.01em;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      border-color 160ms ease,
      color 160ms ease,
      opacity 160ms ease;
  }

  .builder-secondary-btn {
    color: #2f2f2f;
    background: #ffffff;
  }

  .builder-secondary-btn:hover:not(:disabled) {
    background: #faf9f8;
  }

  .builder-danger-btn {
    color: #9d2b12;
  }

  .builder-primary-btn {
    color: #ffffff;
    background: var(--builder-brand);
    border-color: var(--builder-brand);
  }

  .builder-primary-btn:hover:not(:disabled) {
    background: #f03e17;
    border-color: #f03e17;
  }

  .builder-primary-btn:disabled,
  .builder-secondary-btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .builder-modal-backdrop {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: grid;
    place-items: center;
    padding: 24px;
    background: rgba(10, 10, 10, 0.32);
  }

  .builder-modal {
    width: min(100%, 460px);
    padding: 20px;
    border-radius: 14px;
    background: #ffffff;
    box-shadow: 0 20px 60px rgba(17, 17, 17, 0.18);
  }

  .builder-modal-title {
    margin: 0;
    font-size: 20px;
    line-height: 1.1;
    letter-spacing: -0.03em;
  }

  .builder-modal-copy {
    margin: 8px 0 0;
    color: var(--builder-text-secondary);
    font-size: 13px;
    line-height: 1.55;
  }

  .builder-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 18px;
  }

  @media (max-width: 980px) {
    .builder-section {
      grid-template-columns: 1fr;
      gap: 16px;
      padding: 18px 0;
    }

    .builder-section-copy {
      gap: 8px;
    }

    .builder-section-text {
      max-width: none;
    }

    .builder-grid-two {
      grid-template-columns: 1fr;
    }

    .builder-footer {
      flex-direction: column;
      align-items: stretch;
    }

    .builder-footer-actions {
      justify-content: stretch;
      flex-wrap: wrap;
    }

    .builder-footer-actions > * {
      flex: 1 1 180px;
    }
  }

  @media (max-width: 640px) {
    .builder-head {
      padding-top: 6px;
    }

    .builder-title {
      font-size: 24px;
    }

    .builder-toggle-card-head,
    .builder-option-row {
      padding: 12px;
    }

    .builder-toggle-card-body {
      padding: 0 12px 12px;
    }

    .builder-input {
      min-height: 40px;
      font-size: 13px;
    }
  }
`;

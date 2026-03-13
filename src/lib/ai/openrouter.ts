const OPENROUTER_CHAT_COMPLETIONS_URL =
  "https://openrouter.ai/api/v1/chat/completions";
const OPENROUTER_MODELS_URL = "https://openrouter.ai/api/v1/models";
const DEFAULT_OPENROUTER_MODEL = "openrouter/free";
const DEFAULT_TRANSCRIPTION_MODEL = "";

type OpenRouterMessage = {
  role: "system" | "user" | "assistant";
  content: unknown;
};

type OpenRouterResponse = {
  choices?: Array<{
    message?: {
      content?: unknown;
    };
  }>;
  error?: {
    message?: string;
  };
};

type OpenRouterSubmissionExtraction = {
  transcript: string | null;
  generatedReview: string | null;
  keyPhrase: string | null;
  model: string;
};

type OpenRouterModelCatalogEntry = {
  id?: string;
  architecture?: {
    input_modalities?: string[];
  };
};

export type AudioInputFormat = "wav" | "mp3" | "webm" | "mp4";

function getOpenRouterApiKey() {
  return process.env.OPENROUTER_API_KEY?.trim() || "";
}

function isAiFeatureFlagEnabled() {
  return process.env.OPENROUTER_AI_ENABLED?.trim().toLowerCase() === "true";
}

function requiresFreeModelOnly() {
  return process.env.OPENROUTER_FREE_ONLY?.trim().toLowerCase() !== "false";
}

function isFreeModelId(modelId: string) {
  return modelId === "openrouter/free" || modelId.endsWith(":free");
}

function validateModelPolicy(modelId: string) {
  if (requiresFreeModelOnly() && !isFreeModelId(modelId)) {
    throw new Error(
      "Only free OpenRouter models are allowed. Use `openrouter/free` or a model ending with `:free`."
    );
  }
}

export function hasOpenRouterApiKey() {
  return getOpenRouterApiKey().length > 0;
}

export function isOpenRouterConfigured() {
  return hasOpenRouterApiKey() && isAiFeatureFlagEnabled();
}

export function getOpenRouterModel() {
  const selected = process.env.OPENROUTER_MODEL?.trim() || DEFAULT_OPENROUTER_MODEL;
  if (requiresFreeModelOnly() && !isFreeModelId(selected)) {
    return DEFAULT_OPENROUTER_MODEL;
  }
  validateModelPolicy(selected);
  return selected;
}

function getOpenRouterRewriteModel() {
  const selected = process.env.OPENROUTER_REWRITE_MODEL?.trim() || getOpenRouterModel();
  if (requiresFreeModelOnly() && !isFreeModelId(selected)) {
    return getOpenRouterModel();
  }
  validateModelPolicy(selected);
  return selected;
}

function sanitizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return null;
  }

  return normalized.slice(0, maxLength);
}

function extractMessageText(content: unknown) {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const chunks: string[] = [];

    for (const part of content) {
      if (!part || typeof part !== "object") {
        continue;
      }

      const candidate = part as Record<string, unknown>;
      if (typeof candidate.text === "string") {
        chunks.push(candidate.text);
      } else if (typeof candidate.content === "string") {
        chunks.push(candidate.content);
      }
    }

    return chunks.join("\n").trim();
  }

  return "";
}

function parseJsonObject(text: string) {
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Fallback below when model wraps json in markdown.
  }

  const fencedMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    try {
      const parsed = JSON.parse(fencedMatch[1]);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return null;
    }
  }

  return null;
}

function deriveReviewFromTranscript(transcript: string | null) {
  if (!transcript) {
    return null;
  }

  const sentence =
    transcript.split(/(?<=[.!?])\s+/).find((part) => part.trim().length >= 24) ||
    transcript;

  const compact = sentence.replace(/\s+/g, " ").trim();
  return compact.slice(0, 260);
}

function deriveKeyPhrase(
  generatedReview: string | null,
  transcript: string | null
) {
  const source = generatedReview || transcript;
  if (!source) {
    return null;
  }

  const sentence =
    source.split(/(?<=[.!?])\s+/).find((part) => part.trim().length >= 18) ||
    source;
  const compact = sentence.replace(/\s+/g, " ").trim().replace(/^"|"$/g, "");
  return compact.slice(0, 180);
}

async function callOpenRouterWithModel({
  model,
  messages,
}: {
  model: string;
  messages: OpenRouterMessage[];
}) {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  validateModelPolicy(model);

  const response = await fetch(OPENROUTER_CHAT_COMPLETIONS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "https://tellr.me",
      "X-Title": "Tellr",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages,
    }),
    signal: AbortSignal.timeout(120000),
  });

  const body = (await response.json().catch(() => ({}))) as OpenRouterResponse;

  if (!response.ok) {
    const message =
      body.error?.message ||
      `OpenRouter request failed with status ${response.status}.`;
    throw new Error(message);
  }

  const content = extractMessageText(body.choices?.[0]?.message?.content);
  if (!content) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return {
    model,
    content,
  };
}

async function listOpenRouterModels() {
  const apiKey = getOpenRouterApiKey();
  if (!apiKey) {
    throw new Error("Missing OPENROUTER_API_KEY.");
  }

  const response = await fetch(OPENROUTER_MODELS_URL, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to load OpenRouter model list (status ${response.status}).`
    );
  }

  const body = (await response.json().catch(() => ({}))) as {
    data?: OpenRouterModelCatalogEntry[];
  };

  return Array.isArray(body.data) ? body.data : [];
}

async function resolveTranscriptionModel() {
  const explicit =
    process.env.OPENROUTER_TRANSCRIPTION_MODEL?.trim() ||
    DEFAULT_TRANSCRIPTION_MODEL;

  if (explicit) {
    if (requiresFreeModelOnly() && !isFreeModelId(explicit)) {
      // Ignore explicit non-free model when free-only mode is enabled.
    } else {
      validateModelPolicy(explicit);
      return explicit;
    }
  }

  const models = await listOpenRouterModels();
  const audioFreeModel = models.find((entry) => {
    const id = typeof entry.id === "string" ? entry.id : "";
    const modalities = entry.architecture?.input_modalities || [];
    const hasAudio = modalities.includes("audio");
    return Boolean(id) && hasAudio && isFreeModelId(id);
  });

  if (!audioFreeModel?.id) {
    throw new Error(
      "No free audio-capable model found on OpenRouter. Set OPENROUTER_TRANSCRIPTION_MODEL to a free audio model (ending with :free)."
    );
  }

  return audioFreeModel.id;
}

export async function transcribeAudioWithOpenRouter({
  audioBase64,
  format,
}: {
  audioBase64: string;
  format: AudioInputFormat;
}) {
  const model = await resolveTranscriptionModel();
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content:
        "You are a transcription assistant. Return strict JSON with one key: transcript.",
    },
    {
      role: "user",
      content: [
        {
          type: "text",
          text:
            "Transcribe this customer testimonial audio/video. Return only JSON: {\"transcript\":\"...\"}. If unclear, do your best and keep language of the speaker.",
        },
        {
          type: "input_audio",
          input_audio: {
            data: audioBase64,
            format,
          },
        },
      ],
    },
  ];

  const completion = await callOpenRouterWithModel({ model, messages });
  const parsed = parseJsonObject(completion.content);

  const transcript = sanitizeText(
    parsed?.transcript ?? parsed?.text ?? completion.content,
    12000
  );

  if (!transcript) {
    throw new Error("Transcription model returned an empty transcript.");
  }

  return {
    transcript,
    model: completion.model,
  };
}

export async function rewriteTranscriptWithOpenRouter(transcript: string) {
  const model = getOpenRouterRewriteModel();
  const messages: OpenRouterMessage[] = [
    {
      role: "system",
      content:
        "You rewrite customer transcripts into concise written testimonials. Return strict JSON only.",
    },
    {
      role: "user",
      content:
        "Rewrite the following transcript into a clean first-person written review (max 3 short sentences, no markdown). Also return one short key phrase (max 12 words) useful as highlight. Return JSON with keys generatedReview and keyPhrase.\n\nTranscript:\n" +
        transcript,
    },
  ];

  const completion = await callOpenRouterWithModel({ model, messages });
  const parsed = parseJsonObject(completion.content);

  const generatedReview = sanitizeText(
    parsed?.generatedReview ?? parsed?.review ?? completion.content,
    1200
  );
  const keyPhrase = sanitizeText(
    parsed?.keyPhrase ?? parsed?.highlight ?? null,
    180
  );

  const fallbackReview = generatedReview ?? deriveReviewFromTranscript(transcript);

  return {
    generatedReview: fallbackReview,
    keyPhrase: keyPhrase ?? deriveKeyPhrase(fallbackReview, transcript),
    model: completion.model,
  };
}

export async function extractSubmissionInsightsFromAudio({
  audioBase64,
  format,
}: {
  audioBase64: string;
  format: AudioInputFormat;
}): Promise<OpenRouterSubmissionExtraction> {
  const transcription = await transcribeAudioWithOpenRouter({
    audioBase64,
    format,
  });
  const rewritten = await rewriteTranscriptWithOpenRouter(
    transcription.transcript
  );

  return {
    transcript: transcription.transcript,
    generatedReview: rewritten.generatedReview,
    keyPhrase: rewritten.keyPhrase,
    model: `${transcription.model} -> ${rewritten.model}`,
  };
}

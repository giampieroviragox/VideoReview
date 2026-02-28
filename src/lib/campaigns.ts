import { DEFAULT_WORKSPACE } from "@/lib/workspace";

export const MAX_CAMPAIGN_QUESTIONS = 3;

export type CampaignQuestionInput = {
  text: string;
  required: boolean;
  sortOrder: number;
};

export function buildCampaignInviteMessage(campaignName: string, publicPath: string) {
  return [
    `Hi! We would love your feedback for ${campaignName}.`,
    "Please record a short video review using this private link:",
    publicPath,
    "If your video is approved, we will send your reward manually.",
  ].join("\n");
}

export function buildCampaignPublicPath(campaignId: string) {
  return `/c/${DEFAULT_WORKSPACE.brandSlug}/${campaignId}`;
}

export function normalizeCampaignQuestions(questions: CampaignQuestionInput[]) {
  return questions
    .map((question, index) => ({
      text: question.text.trim(),
      required: Boolean(question.required),
      sortOrder: index + 1,
    }))
    .filter((question) => question.text.length > 0)
    .slice(0, MAX_CAMPAIGN_QUESTIONS);
}

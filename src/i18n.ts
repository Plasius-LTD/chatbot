import { createI18n } from "@plasius/translations";
import type { TranslationArgs, TranslationDictionary } from "@plasius/translations";
import { chatbotEnGbTranslations } from "./translations/en-GB.js";

export const chatbotTranslationKeys = {
  checkingAccess: "chatbot.ui.checkingAccess",
  defaultPlaceholder: "chatbot.ui.defaultPlaceholder",
  defaultTitle: "chatbot.ui.defaultTitle",
  demoLimitReached: "chatbot.ui.demoLimitReached",
  demoLimitReachedWithUsage: "chatbot.ui.demoLimitReachedWithUsage",
  failedToLoad: "chatbot.ui.failedToLoad",
  invalidResponse: "chatbot.client.invalidResponse",
  invalidUsageResponse: "chatbot.client.invalidUsageResponse",
  loadingEmojiPicker: "chatbot.ui.loadingEmojiPicker",
  messageFailed: "chatbot.ui.messageFailed",
  noFetch: "chatbot.client.noFetch",
  noUsageData: "chatbot.ui.noUsageData",
  openEmojiPicker: "chatbot.ui.openEmojiPicker",
  requestFailed: "chatbot.client.requestFailed",
  sendMessage: "chatbot.ui.sendMessage",
  signInRequired: "chatbot.client.signInRequired",
  signInStart: "chatbot.ui.signInStart",
  signInToUse: "chatbot.ui.signInToUse",
  signedInRequired: "chatbot.ui.signedInRequired",
  unavailable: "chatbot.ui.unavailable",
  usageLimitReached: "chatbot.client.usageLimitReached",
  usageSummary: "chatbot.ui.usageSummary",
  userDemoLimitReached: "chatbot.ui.userDemoLimitReached",
} as const;

export type ChatbotTranslationKey =
  (typeof chatbotTranslationKeys)[keyof typeof chatbotTranslationKeys];

export type ChatbotTranslate = (
  key: ChatbotTranslationKey,
  args?: TranslationArgs
) => string | undefined;

export const chatbotTranslations = {
  "en-GB": chatbotEnGbTranslations,
} satisfies Partial<Record<string, TranslationDictionary>>;

const chatbotI18n = createI18n({
  language: "en-GB",
  fallback: "en-GB",
  translations: chatbotTranslations,
});

export function translateChatbotText(
  key: ChatbotTranslationKey,
  args?: TranslationArgs,
  translate?: ChatbotTranslate
): string {
  const translated = translate?.(key, args);
  if (translated && translated !== key) {
    return translated;
  }

  return chatbotI18n.t(key, args);
}


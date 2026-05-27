import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

import {
  ChatBot,
  chatbotEnGbTranslations,
  chatbotTranslationKeys,
  translateChatbotText,
  type ChatbotTranslate,
} from "../src/index.js";

describe("chatbot translations", () => {
  it("resolves default en-GB text through the shared translation runtime", () => {
    expect(translateChatbotText(chatbotTranslationKeys.defaultTitle)).toBe("Plasius Chatbot");
    expect(
      translateChatbotText(chatbotTranslationKeys.demoLimitReachedWithUsage, {
        used: 10,
        limit: 10,
      })
    ).toBe("Demo limit reached (10/10 messages).");
    expect(chatbotEnGbTranslations[chatbotTranslationKeys.sendMessage]).toBe("Send message");
  });

  it("falls back to package translations when a supplied translator misses a key", () => {
    expect(
      translateChatbotText(chatbotTranslationKeys.noUsageData, undefined, (key) => key)
    ).toBe("No usage data");
  });

  it("renders default chatbot UI text from package translations", () => {
    const markup = renderToStaticMarkup(
      React.createElement(ChatBot, {
        fetchFn: vi.fn<typeof fetch>(),
      })
    );

    expect(markup).toContain("Plasius Chatbot");
    expect(markup).toContain("No usage data");
    expect(markup).toContain("Checking access...");
    expect(markup).toContain('placeholder="Ask Plasius something..."');
    expect(markup).toContain('aria-label="Open emoji picker"');
    expect(markup).toContain('aria-label="Send message"');
  });

  it("preserves title and placeholder props while translating other UI text", () => {
    const translate: ChatbotTranslate = (key) => {
      const translations: Partial<Record<Parameters<ChatbotTranslate>[0], string>> = {
        [chatbotTranslationKeys.checkingAccess]: "Checking translated access",
        [chatbotTranslationKeys.noUsageData]: "No translated usage",
        [chatbotTranslationKeys.openEmojiPicker]: "Open translated emoji picker",
        [chatbotTranslationKeys.sendMessage]: "Send translated message",
      };

      return translations[key] ?? key;
    };

    const markup = renderToStaticMarkup(
      React.createElement(ChatBot, {
        fetchFn: vi.fn<typeof fetch>(),
        placeholder: "Custom placeholder",
        title: "Custom title",
        translate,
      })
    );

    expect(markup).toContain("Custom title");
    expect(markup).toContain('placeholder="Custom placeholder"');
    expect(markup).toContain("No translated usage");
    expect(markup).toContain("Checking translated access");
    expect(markup).toContain('aria-label="Open translated emoji picker"');
    expect(markup).toContain('aria-label="Send translated message"');
  });
});

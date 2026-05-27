// @vitest-environment jsdom

import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ChatBot, chatbotTranslationKeys, type ChatbotTranslate } from "../src/index.js";
import type { ChatbotUsage } from "../src/client.js";

vi.mock("emoji-picker-react/dist/emoji-picker-react.esm.js", async () => {
  const ReactModule = await import("react");

  return {
    EmojiPicker: ({
      onEmojiClick,
    }: {
      onEmojiClick: (emojiData: { emoji?: string }) => void;
    }) =>
      ReactModule.createElement(
        "button",
        {
          type: "button",
          onClick: () => onEmojiClick({ emoji: "!" }),
        },
        "Pick emoji"
      ),
  };
});

function usage(overrides: Partial<ChatbotUsage> = {}): ChatbotUsage {
  return {
    limit: 10,
    used: 0,
    remaining: 10,
    exhausted: false,
    ...overrides,
  };
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

function usageResponse(overrides: Partial<ChatbotUsage> = {}): Response {
  return jsonResponse({ usage: usage(overrides) });
}

function readyFetch(reply = "assistant reply"): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(usageResponse())
    .mockResolvedValueOnce(
      jsonResponse({
        reply,
        model: "gpt-4o-mini",
        usage: usage({ remaining: 9, used: 1 }),
      })
    );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("ChatBot component translations", () => {
  it("loads usage and sends messages with translated defaults", async () => {
    const fetchMock = readyFetch();
    const onUsageChange = vi.fn();

    render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
        onUsageChange,
        systemPrompt: "Custom system prompt",
      })
    );

    expect(await screen.findByText("0/10 used")).toBeTruthy();

    const input = screen.getByPlaceholderText("Ask Plasius something...");
    fireEvent.change(input, { target: { value: "hello" } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("assistant reply")).toBeTruthy();
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("1/10 used")).toBeTruthy();

    const [, request] = fetchMock.mock.calls[1] ?? [];
    expect(JSON.parse(String(request?.body))).toMatchObject({
      history: [{ content: "hello", role: "user" }],
      message: "hello",
      systemPrompt: "Custom system prompt",
    });
    expect(onUsageChange).toHaveBeenCalledWith(usage());
    expect(onUsageChange).toHaveBeenCalledWith(usage({ remaining: 9, used: 1 }));
  });

  it("uses the supplied translator for rendered defaults and emoji controls", async () => {
    const fetchMock = readyFetch();
    const translate: ChatbotTranslate = (key) => {
      const translations: Partial<Record<Parameters<ChatbotTranslate>[0], string>> = {
        [chatbotTranslationKeys.defaultPlaceholder]: "Translated placeholder",
        [chatbotTranslationKeys.defaultTitle]: "Translated chatbot",
        [chatbotTranslationKeys.loadingEmojiPicker]: "Loading translated emoji",
        [chatbotTranslationKeys.noUsageData]: "No translated usage",
        [chatbotTranslationKeys.openEmojiPicker]: "Open translated emoji picker",
        [chatbotTranslationKeys.sendMessage]: "Send translated message",
        [chatbotTranslationKeys.usageSummary]: "Translated usage",
      };

      return translations[key] ?? key;
    };

    render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
        translate,
      })
    );

    expect(screen.getByText("Translated chatbot")).toBeTruthy();
    expect(screen.getByText("No translated usage")).toBeTruthy();
    expect(await screen.findByText("Translated usage")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Open translated emoji picker" }));
    expect(screen.getByText("Loading translated emoji")).toBeTruthy();
    fireEvent.click(await screen.findByText("Pick emoji"));
    expect(screen.getByPlaceholderText("Translated placeholder")).toHaveProperty("value", "!");

    fireEvent.click(screen.getByRole("button", { name: "Send translated message" }));
    expect(await screen.findByText("assistant reply")).toBeTruthy();
  });

  it("shows translated unauthenticated load state and calls the auth hook", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: "Unauthorized" }, 401));
    const onAuthRequired = vi.fn();
    const translate: ChatbotTranslate = (key) =>
      key === chatbotTranslationKeys.signInStart ? "Translated sign-in start" : key;

    render(
      React.createElement(ChatBot, {
        fetchFn: fetchMock,
        onAuthRequired,
        translate,
      })
    );

    expect(await screen.findByText("Translated sign-in start")).toBeTruthy();
    expect(onAuthRequired).toHaveBeenCalledTimes(1);
  });

  it("shows translated exhausted usage state", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(usageResponse({ exhausted: true, remaining: 0, used: 10 }));

    render(React.createElement(ChatBot, { fetchFn: fetchMock }));

    expect(await screen.findByText("Demo limit reached (10/10 messages).")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Open emoji picker" })).toHaveProperty(
      "disabled",
      true
    );
  });

  it("shows translated fallback text when loading fails without an Error object", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockRejectedValue("load failed");

    render(React.createElement(ChatBot, { fetchFn: fetchMock }));

    expect(await screen.findByText("Failed to load chatbot.")).toBeTruthy();
  });

  it("handles translated send errors for auth and limits", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(usageResponse())
      .mockResolvedValueOnce(jsonResponse({ error: "Unauthorized" }, 401));
    const onAuthRequired = vi.fn();

    render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
        onAuthRequired,
      })
    );

    expect(await screen.findByText("0/10 used")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Ask Plasius something..."), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("You must be signed in to use chatbot.")).toBeTruthy();
    expect(onAuthRequired).toHaveBeenCalledTimes(1);
  });

  it("applies limit usage returned from send failures", async () => {
    const limitUsage = usage({ exhausted: true, remaining: 0, used: 10 });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(usageResponse())
      .mockResolvedValueOnce(
        jsonResponse(
          {
            error: "CHATBOT_LIMIT_REACHED",
            usage: limitUsage,
          },
          429
        )
      );

    render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
      })
    );

    expect(await screen.findByText("0/10 used")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Ask Plasius something..."), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("You reached the 10 message demo limit.")).toBeTruthy();
    expect(screen.getByText("10/10 used")).toBeTruthy();
  });

  it("handles limit failures without usage and generic send failures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(usageResponse())
      .mockResolvedValueOnce(jsonResponse({ error: "CHATBOT_LIMIT_REACHED" }, 429))
      .mockResolvedValueOnce(usageResponse())
      .mockRejectedValueOnce("send failed");

    const { unmount } = render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
      })
    );

    expect(await screen.findByText("0/10 used")).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText("Ask Plasius something..."), {
      target: { value: "hello" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("You reached the 10 message demo limit.")).toBeTruthy();

    unmount();

    render(
      React.createElement(ChatBot, {
        bootstrapCsrf: false,
        fetchFn: fetchMock,
        title: "Second chatbot",
      })
    );

    expect(await screen.findByText("Second chatbot")).toBeTruthy();
    await waitFor(() => expect(screen.getByText("0/10 used")).toBeTruthy());
    fireEvent.change(screen.getByPlaceholderText("Ask Plasius something..."), {
      target: { value: "hello again" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    expect(await screen.findByText("Message failed.")).toBeTruthy();
  });
});

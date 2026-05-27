import React, { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import type { EmojiClickData } from "emoji-picker-react";
import { FaPaperPlane, FaSmile } from "react-icons/fa";
import styles from "./styles/chatbot.module.css";
import {
  ChatbotClientError,
  getChatbotUsage,
  sendChatbotMessage,
  type ChatMessage,
  type ChatbotClientOptions,
  type ChatbotUsage,
} from "./client.js";
import {
  chatbotTranslationKeys,
  translateChatbotText,
  type ChatbotTranslate,
} from "./i18n.js";

const EmojiPicker = lazy(() =>
  import("emoji-picker-react/dist/emoji-picker-react.esm.js").then((module) => ({
    default: module.EmojiPicker,
  }))
);

type ChatbotState = "loading" | "ready" | "signed_out" | "limit_reached" | "error";

export interface ChatBotProps extends ChatbotClientOptions {
  initialMessages?: ChatMessage[];
  systemPrompt?: string;
  placeholder?: string;
  title?: string;
  translate?: ChatbotTranslate;
  onUsageChange?: (usage: ChatbotUsage) => void;
  onAuthRequired?: () => void;
}

const DEFAULT_SYSTEM_PROMPT =
  "You are the Plasius assistant. Keep responses concise, practical, and factual.";

function statusMessage(
  state: ChatbotState,
  usage: ChatbotUsage | null,
  translate?: ChatbotTranslate
): string {
  if (state === "loading") {
    return translateChatbotText(chatbotTranslationKeys.checkingAccess, undefined, translate);
  }
  if (state === "signed_out") {
    return translateChatbotText(chatbotTranslationKeys.signInToUse, undefined, translate);
  }
  if (state === "limit_reached") {
    if (usage) {
      return translateChatbotText(
        chatbotTranslationKeys.demoLimitReachedWithUsage,
        { used: usage.used, limit: usage.limit },
        translate
      );
    }
    return translateChatbotText(chatbotTranslationKeys.demoLimitReached, undefined, translate);
  }
  if (state === "error") {
    return translateChatbotText(chatbotTranslationKeys.unavailable, undefined, translate);
  }
  return "";
}

export default function ChatBot(
  props: React.PropsWithChildren<ChatBotProps>
): React.ReactElement {
  const [messages, setMessages] = useState<ChatMessage[]>(props.initialMessages ?? []);
  const [input, setInput] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [state, setState] = useState<ChatbotState>("loading");
  const [usage, setUsage] = useState<ChatbotUsage | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clientOptions = useMemo<ChatbotClientOptions>(
    () => ({
      endpoint: props.endpoint,
      credentials: props.credentials,
      headers: props.headers,
      fetchFn: props.fetchFn,
      csrfCookieName: props.csrfCookieName,
      csrfHeaderName: props.csrfHeaderName,
      bootstrapCsrf: props.bootstrapCsrf,
      translate: props.translate,
    }),
    [
      props.endpoint,
      props.credentials,
      props.headers,
      props.fetchFn,
      props.csrfCookieName,
      props.csrfHeaderName,
      props.bootstrapCsrf,
      props.translate,
    ]
  );

  const applyUsage = useCallback(
    (nextUsage: ChatbotUsage) => {
      setUsage(nextUsage);
      props.onUsageChange?.(nextUsage);
      setState(nextUsage.exhausted ? "limit_reached" : "ready");
    },
    [props.onUsageChange]
  );

  useEffect(() => {
    let active = true;

    const loadUsage = async () => {
      setState("loading");
      setErrorMessage(null);
      try {
        const result = await getChatbotUsage(clientOptions);
        if (!active) return;
        applyUsage(result.usage);
      } catch (error) {
        if (!active) return;
        if (error instanceof ChatbotClientError && error.status === 401) {
          setState("signed_out");
          setErrorMessage(
            translateChatbotText(chatbotTranslationKeys.signInStart, undefined, props.translate)
          );
          props.onAuthRequired?.();
          return;
        }

        setState("error");
        setErrorMessage(
          error instanceof Error
            ? error.message
            : translateChatbotText(chatbotTranslationKeys.failedToLoad, undefined, props.translate)
        );
      }
    };

    void loadUsage();
    return () => {
      active = false;
    };
  }, [applyUsage, clientOptions, props.onAuthRequired, props.translate]);

  const sendDisabled =
    isSending ||
    state === "loading" ||
    state === "signed_out" ||
    state === "limit_reached" ||
    !input.trim();

  const handleEmojiClick = (emojiData: EmojiClickData): void => {
    setInput((prev) => prev + (emojiData.emoji ?? ""));
  };

  const handleSend = useCallback(async (): Promise<void> => {
    const message = input.trim();
    if (!message || sendDisabled) return;

    const userMessage: ChatMessage = { role: "user", content: message };
    const nextHistory = [...messages, userMessage].slice(-20);

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setShowEmojiPicker(false);
    setIsSending(true);
    setErrorMessage(null);

    try {
      const response = await sendChatbotMessage(
        {
          message,
          history: nextHistory,
          systemPrompt: props.systemPrompt ?? DEFAULT_SYSTEM_PROMPT,
        },
        clientOptions
      );

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: response.reply },
      ]);
      applyUsage(response.usage);
    } catch (error) {
      if (error instanceof ChatbotClientError) {
        if (error.status === 401) {
          setState("signed_out");
          setErrorMessage(
            translateChatbotText(
              chatbotTranslationKeys.signedInRequired,
              undefined,
              props.translate
            )
          );
          props.onAuthRequired?.();
          return;
        }

        if (error.status === 429) {
          if (error.usage) {
            applyUsage(error.usage);
          } else {
            setState("limit_reached");
          }
          setErrorMessage(
            translateChatbotText(
              chatbotTranslationKeys.userDemoLimitReached,
              undefined,
              props.translate
            )
          );
          return;
        }

        setState("error");
        setErrorMessage(error.message);
        return;
      }

      setState("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : translateChatbotText(chatbotTranslationKeys.messageFailed, undefined, props.translate)
      );
    } finally {
      setIsSending(false);
    }
  }, [
    applyUsage,
    clientOptions,
    input,
    messages,
    props.onAuthRequired,
    props.systemPrompt,
    props.translate,
    sendDisabled,
  ]);

  return (
    <div className={styles.chatbotcontainer}>
      <div className={styles.header}>
        <div className={styles.title}>
          {props.title ??
            translateChatbotText(chatbotTranslationKeys.defaultTitle, undefined, props.translate)}
        </div>
        <div className={styles.usage}>
          {usage
            ? translateChatbotText(
                chatbotTranslationKeys.usageSummary,
                { used: usage.used, limit: usage.limit },
                props.translate
              )
            : translateChatbotText(chatbotTranslationKeys.noUsageData, undefined, props.translate)}
        </div>
      </div>

      {(state !== "ready" || errorMessage) && (
        <div className={styles.notice}>
          {errorMessage ?? statusMessage(state, usage, props.translate)}
        </div>
      )}

      <div className={styles.messagesbox}>
        {messages.map((msg, index) => (
          <div key={`${msg.role}-${index}`} className={styles.message}>
            <div className={styles[msg.role]}>
              <div className={styles.bubble}>{msg.content}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.inputbox}>
        <input
          type="text"
          value={input}
          disabled={sendDisabled}
          onChange={(event) => setInput(event.target.value)}
          onKeyUp={async (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              await handleSend();
              event.stopPropagation();
            }
          }}
          placeholder={
            props.placeholder ??
            translateChatbotText(
              chatbotTranslationKeys.defaultPlaceholder,
              undefined,
              props.translate
            )
          }
        />

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => setShowEmojiPicker((current) => !current)}
          disabled={state === "signed_out" || state === "limit_reached"}
          aria-label={translateChatbotText(
            chatbotTranslationKeys.openEmojiPicker,
            undefined,
            props.translate
          )}
        >
          <FaSmile className={styles.emojiicon} />
        </button>

        {showEmojiPicker && (
          <div className={styles.emojiPicker}>
            <Suspense
              fallback={
                <div>
                  {translateChatbotText(
                    chatbotTranslationKeys.loadingEmojiPicker,
                    undefined,
                    props.translate
                  )}
                </div>
              }
            >
              <EmojiPicker onEmojiClick={handleEmojiClick} />
            </Suspense>
          </div>
        )}

        <button
          type="button"
          className={styles.iconButton}
          onClick={() => void handleSend()}
          disabled={sendDisabled}
          aria-label={translateChatbotText(
            chatbotTranslationKeys.sendMessage,
            undefined,
            props.translate
          )}
        >
          <FaPaperPlane className={styles.sendicon} />
        </button>
      </div>
    </div>
  );
}

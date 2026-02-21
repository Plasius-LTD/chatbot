import {
  ChatbotClientError,
  getChatbotUsage,
  sendChatbotMessage,
} from "../src/client.js";

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}

describe("@plasius/chatbot client", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "document", {
      configurable: true,
      value: { cookie: "" },
    });
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as Record<string, unknown>).document;
  });

  it("loads chatbot usage when user is signed in", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      jsonResponse({
        usage: {
          limit: 10,
          used: 2,
          remaining: 8,
          exhausted: false,
        },
      })
    );

    const response = await getChatbotUsage({ fetchFn: fetchMock });
    expect(response.usage.used).toBe(2);
  });

  it("returns a typed error for unauthenticated usage checks", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(jsonResponse({ error: "Unauthorized" }, 401));

    try {
      await getChatbotUsage({ fetchFn: fetchMock });
      throw new Error("Expected usage call to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ChatbotClientError);
      expect(error).toMatchObject({ status: 401 });
    }
  });

  it("sends chatbot messages with CSRF header", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockImplementationOnce(async () => {
        (globalThis as { document: { cookie: string } }).document.cookie =
          "csrf-token=token123";
        return jsonResponse({
          usage: { limit: 10, used: 0, remaining: 10, exhausted: false },
        });
      })
      .mockResolvedValueOnce(
        jsonResponse({
          reply: "hello",
          model: "gpt-4o-mini",
          usage: { limit: 10, used: 1, remaining: 9, exhausted: false },
        })
      );

    const response = await sendChatbotMessage(
      {
        message: "hello",
        history: [{ role: "user", content: "hello" }],
      },
      { fetchFn: fetchMock }
    );

    expect(response.reply).toBe("hello");
    const [, options] = fetchMock.mock.calls[1] ?? [];
    const headers = options?.headers as Record<string, string>;
    expect(headers["x-csrf-token"]).toBe("token123");
  });
});

"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Copy,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import { MessageRenderer } from "@/components/MessageRenderer";
import { useFeedback } from "@/components/feedback-provider";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  pending?: boolean;
  streaming?: boolean;
  status?: string;
  error?: string;
};

type StreamEvent =
  | { type: "status"; message: string }
  | { type: "token"; content: string }
  | { type: "done" };

type ChatClientProps = {
  chatId: string;
  title: string;
  initialMessages: ChatMessage[];
  initialMessage?: string;
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isStreamingAssistant =
    message.role === "assistant" && message.streaming;
  const showThinkingOnly =
    message.role === "assistant" && message.pending && !message.content;
  const showStatus = message.role === "assistant" && message.status;

  return (
    <div
      className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-2xl border px-4 py-3 ${
          message.role === "user"
            ? "border-primary bg-primary/15 text-foreground"
            : "border-border bg-card text-foreground"
        }`}
      >
        {showThinkingOnly ? (
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span>{message.status ?? "Thinking..."}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {showStatus && message.content ? (
              <p
                className={`text-[11px] uppercase tracking-[0.18em] text-muted-foreground ${
                  message.streaming ? "opacity-70" : ""
                }`}
              >
                {message.status}
              </p>
            ) : null}
            {message.error ? (
              <p className="text-[14px] leading-7 text-red-400">
                {message.error}
              </p>
            ) : (
              <div className="text-[14px]">
                {message.role === "assistant" ? (
                  <MessageRenderer
                    content={message.content}
                    isStreaming={isStreamingAssistant}
                  />
                ) : (
                  <p className="whitespace-pre-wrap leading-7 tracking-[-0.01em]">
                    {message.content}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {message.role === "assistant" &&
        !message.pending &&
        !message.streaming ? (
          <div className="mt-3 flex items-center gap-1 text-muted-foreground">
            <button className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground">
              <Copy size={13} />
            </button>
            <button className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground">
              <RotateCcw size={13} />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatClient({
  chatId,
  title,
  initialMessages,
  initialMessage,
}: ChatClientProps) {
  const { showFeedback } = useFeedback();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSentRef = useRef(false);

  const hasMessages = messages.length > 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isSending]);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
  }, [draft]);

  const stopGeneration = () => {
    if (!abortControllerRef.current) {
      return;
    }

    abortControllerRef.current.abort();
    abortControllerRef.current = null;
    setIsSending(false);
    showFeedback({
      type: "success",
      title: "Generation stopped",
    });
  };

  const sendMessage = async (messageToSend?: string) => {
    const message = (messageToSend ?? draft).trim();

    if (!message || isSending) {
      if (!message && !messageToSend) {
        showFeedback({
          type: "error",
          title: "Type a message first",
        });
      }

      return;
    }

    const userMessageId = `local-user-${crypto.randomUUID()}`;
    const assistantPlaceholderId = `local-assistant-${crypto.randomUUID()}`;

    setIsSending(true);
    setError(null);
    setLastUserMessage(message);

    if (!messageToSend) {
      setDraft("");
    }

    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: userMessageId,
        role: "user",
        content: message,
      },
      {
        id: assistantPlaceholderId,
        role: "assistant",
        content: "",
        pending: true,
        streaming: false,
      },
    ]);

    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chatId,
          message,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to generate a response.");
      }

      const reader = response.body?.getReader();

      if (!reader) {
        throw new Error("Streaming response is not available.");
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let finalAssistantMessage = "";

      const applyChunk = (delta: string) => {
        finalAssistantMessage = `${finalAssistantMessage}${delta}`;
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  content: finalAssistantMessage,
                  pending: false,
                  streaming: true,
                  status: currentMessage.status,
                }
              : currentMessage,
          ),
        );
      };

      const applyStatus = (status: string) => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  status,
                }
              : currentMessage,
          ),
        );
      };

      const applyDone = (content: string) => {
        const finalContent = (content || finalAssistantMessage || "").trim();

        if (!finalContent) {
          setError("No response generated. Please try again.");
          setMessages((currentMessages) =>
            currentMessages.filter(
              (currentMessage) =>
                currentMessage.id !== userMessageId &&
                currentMessage.id !== assistantPlaceholderId,
            ),
          );
          setDraft(message);
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  id: assistantPlaceholderId,
                  role: "assistant",
                  content: finalContent,
                  pending: false,
                  streaming: false,
                  status: undefined,
                }
              : currentMessage,
          ),
        );
      };

      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });

        let frameEndIndex = buffer.indexOf("\n\n");
        while (frameEndIndex !== -1) {
          const frame = buffer.slice(0, frameEndIndex).trim();
          buffer = buffer.slice(frameEndIndex + 2);
          frameEndIndex = buffer.indexOf("\n\n");

          if (!frame) {
            continue;
          }

          try {
            const payloadText = frame.startsWith("data:")
              ? frame.replace(/^data:\s*/, "")
              : frame;
            const event = JSON.parse(payloadText) as StreamEvent;

            if (event.type === "status") {
              applyStatus(event.message);
            }

            if (event.type === "token") {
              applyChunk(event.content);
            }

            if (event.type === "done") {
              applyDone(finalAssistantMessage);
            }
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message &&
              !parseError.message.includes("JSON.parse")
            ) {
              throw parseError;
            }

            console.error("Failed to parse stream payload:", parseError);
          }
        }
      }

      applyDone(finalAssistantMessage);
    } catch (sendError) {
      if (sendError instanceof Error && sendError.name === "AbortError") {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  pending: false,
                  streaming: false,
                  status: undefined,
                  error: "Stopped",
                }
              : currentMessage,
          ),
        );
        return;
      }

      const errorMessage =
        sendError instanceof Error
          ? sendError.message
          : "Failed to send message.";

      setMessages((currentMessages) =>
        currentMessages.filter(
          (currentMessage) =>
            currentMessage.id !== userMessageId &&
            currentMessage.id !== assistantPlaceholderId,
        ),
      );
      setError(errorMessage);
      showFeedback({
        type: "error",
        title: "Chat failed",
        description: errorMessage,
      });
    } finally {
      abortControllerRef.current = null;
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (!initialMessage || hasAutoSentRef.current || hasMessages || isSending) {
      return;
    }

    hasAutoSentRef.current = true;
    void sendMessage(initialMessage);
  }, [initialMessage, hasMessages, isSending]);

  return (
    <div className="relative flex h-full flex-col overflow-hidden bg-background">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex items-center justify-between border-b border-border px-6 py-4">
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            Chat
          </p>
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        </div>

        <span className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
          <Sparkles size={12} className="text-primary" />
          Forge Preview
        </span>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto w-full max-w-4xl space-y-4">
          {!hasMessages ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <MessageSquare size={32} className="mb-3 text-muted-foreground" />
              <p className="text-[14px] font-medium text-foreground">
                No messages yet
              </p>
              <p className="mt-1 text-[13px] text-muted-foreground">
                Start a conversation to begin.
              </p>
            </div>
          ) : (
            messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="relative z-10 border-t border-border bg-card/80 px-6 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-4xl rounded-2xl border border-border bg-card px-3 py-2.5">
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void sendMessage();
                }
              }}
              placeholder="Message Forge"
              rows={1}
              disabled={isSending}
              className="max-h-40 min-h-6 flex-1 resize-none bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
            {isSending ? (
              <button
                onClick={stopGeneration}
                className="rounded-lg bg-destructive/20 p-2 text-destructive transition hover:bg-destructive/30"
                title="Stop generation"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                onClick={() => void sendMessage()}
                disabled={!draft.trim()}
                className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ArrowUp size={14} />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
            <p>Enter to send. Shift+Enter for a new line.</p>
            {lastUserMessage && error && (
              <button
                onClick={() => void sendMessage(lastUserMessage)}
                disabled={isSending}
                className="rounded px-2 py-1 hover:bg-accent hover:text-foreground disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
          {error ? (
            <p className="mt-2 text-[11px] text-red-400">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

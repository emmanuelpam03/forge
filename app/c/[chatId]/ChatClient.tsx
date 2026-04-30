"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Copy,
  MessageSquare,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
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

type ChatClientProps = {
  chatId: string;
  title: string;
  initialMessages: ChatMessage[];
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isStreamingAssistant = message.role === "assistant" && message.pending;
  const streamingLabel = message.status ?? "Processing...";

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
        {message.pending && !message.content ? (
          <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
            <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
            <span>{streamingLabel}</span>
          </div>
        ) : (
          <div className="space-y-2">
            {message.pending && message.status ? (
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {streamingLabel}
              </p>
            ) : null}
            {message.error ? (
              <p className="text-[14px] leading-7 text-red-400">
                {message.error}
              </p>
            ) : (
              <p className="whitespace-pre-wrap text-[14px] leading-7 tracking-[-0.01em]">
                {message.content}
                {isStreamingAssistant ? (
                  <span className="ml-0.5 animate-pulse text-primary">▍</span>
                ) : null}
              </p>
            )}
          </div>
        )}

        {message.role === "assistant" && !message.pending && (
          <div className="mt-3 flex items-center gap-1 text-muted-foreground">
            <button className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground">
              <Copy size={13} />
            </button>
            <button className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground">
              <RotateCcw size={13} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChatClient({
  chatId,
  title,
  initialMessages,
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

  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

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
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsSending(false);
      showFeedback({
        type: "success",
        title: "Generation stopped",
      });
    }
  };

  const sendMessage = async (messageToSend?: string) => {
    const message = (messageToSend || draft).trim();

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
        status: "Loading context...",
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

      const applyChunk = (delta: string, content: string) => {
        finalAssistantMessage = content || `${finalAssistantMessage}${delta}`;
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  content: finalAssistantMessage,
                  pending: true,
                  streaming: true,
                  status: "Writing...",
                }
              : currentMessage,
          ),
        );
      };

      const finalizeStream = (content: string) => {
        const finalContent = (content || finalAssistantMessage || "").trim();

        // Frontend validation: never finalize with empty message
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

        let newlineIndex = buffer.indexOf("\n");
        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          newlineIndex = buffer.indexOf("\n");

          if (!line) {
            continue;
          }

          try {
            const message = JSON.parse(line) as {
              event?: string;
              payload?: {
                delta?: string;
                content?: string;
                status?: string;
                assistantMessage?: string;
                error?: string;
              };
            };

            if (message.event === "chunk") {
              applyChunk(
                message.payload?.delta ?? "",
                message.payload?.content ?? "",
              );
            }

            if (message.event === "status") {
              const status = message.payload?.status ?? "Processing...";
              setMessages((currentMessages) =>
                currentMessages.map((currentMessage) =>
                  currentMessage.id === assistantPlaceholderId
                    ? {
                        ...currentMessage,
                        status,
                        pending: true,
                      }
                    : currentMessage,
                ),
              );
            }

            if (message.event === "done") {
              finalizeStream(
                message.payload?.assistantMessage ?? finalAssistantMessage,
              );
            }

            // Error event: clean up UI and propagate error
            if (message.event === "error") {
              const errorMsg =
                message.payload?.error ?? "Failed to generate a response.";
              // Clean up placeholder before throwing
              setMessages((currentMessages) =>
                currentMessages.filter(
                  (currentMessage) =>
                    currentMessage.id !== userMessageId &&
                    currentMessage.id !== assistantPlaceholderId,
                ),
              );
              // Propagate error to outer error handler
              throw new Error(errorMsg);
            }
          } catch (parseError) {
            // Re-throw if it's a stream error (from message.event === "error")
            // Otherwise, it's a JSON parse error, just log it
            if (
              parseError instanceof Error &&
              parseError.message &&
              !parseError.message.includes("JSON.parse")
            ) {
              throw parseError; // Re-throw stream errors
            }
            console.error("Failed to parse stream payload:", parseError);
          }
        }
      }

      finalizeStream(finalAssistantMessage);
    } catch (sendError) {
      // Ignore abort errors (user clicked stop)
      if (sendError instanceof Error && sendError.name === "AbortError") {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  pending: false,
                  streaming: false,
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

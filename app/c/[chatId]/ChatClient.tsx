"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUp,
  Copy,
  MessageSquare,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useFeedback } from "@/components/feedback-provider";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  pending?: boolean;
  streaming?: boolean;
  status?: string;
};

type ChatClientProps = {
  chatId: string;
  title: string;
  initialMessages: ChatMessage[];
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isStreamingAssistant = message.role === "assistant" && message.pending;
  const streamingLabel = message.status ?? "Thinking...";

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
            {message.pending ? (
              <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                {streamingLabel}
              </p>
            ) : null}
            <p className="whitespace-pre-wrap text-[14px] leading-7 tracking-[-0.01em]">
              {message.content}
              {isStreamingAssistant ? (
                <span className="ml-0.5 animate-pulse text-primary">▍</span>
              ) : null}
            </p>
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
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const sendMessage = async () => {
    const message = draft.trim();

    if (!message || isSending) {
      if (!message) {
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
    setDraft("");
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
      },
    ]);

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
                  content: content || delta,
                  pending: true,
                  streaming: true,
                  status: "Writing...",
                }
              : currentMessage,
          ),
        );
      };

      const finalizeStream = (content: string) => {
        const finalContent = content || finalAssistantMessage;
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
              const status = message.payload?.status ?? "Thinking...";
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

            if (message.event === "error") {
              throw new Error(
                message.payload?.error ?? "Failed to generate a response.",
              );
            }
          } catch (parseError) {
            console.error("Failed to parse stream payload:", parseError);
          }
        }
      }

      finalizeStream(finalAssistantMessage);
    } catch (sendError) {
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
      setDraft(message);
      setError(errorMessage);
      showFeedback({
        type: "error",
        title: "Chat failed",
        description: errorMessage,
      });
    } finally {
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
            <button
              onClick={() => void sendMessage()}
              disabled={isSending || !draft.trim()}
              className="rounded-lg bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSending ? (
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground/70 border-t-transparent" />
              ) : (
                <ArrowUp size={14} />
              )}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Enter to send. Shift+Enter for a new line.
          </p>
          {error ? (
            <p className="mt-2 text-[11px] text-red-400">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

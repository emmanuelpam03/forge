"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Square,
} from "lucide-react";
import { MessageRenderer } from "@/components/MessageRenderer";
import { ReasoningTimeline } from "@/components/ReasoningTimeline";
import { useFeedback } from "@/components/feedback-provider";
import { type StreamEvent } from "@/ai/graph/stream";

type BranchOption = {
  id: string;
  content: string;
  parentId: string | null;
  branchId: string | null;
  createdAt: string;
};

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  parentId?: string | null;
  branchId?: string | null;
  branchOptions?: BranchOption[];
  pending?: boolean;
  streaming?: boolean;
  status?: string;
  reasoningSteps?: string[];
  reasoningExpanded?: boolean;
  error?: string;
};

type ChatClientProps = {
  chatId: string;
  title: string;
  initialMessages: ChatMessage[];
  initialMessage?: string;
};

function MessageBubble({
  message,
  onStartEdit,
  isEditing,
  editingContent,
  setEditingContent,
  onSaveEdit,
  onCancelEdit,
  onRegenerate,
  onSwitchBranch,
  onToggleReasoning,
  onCopyMessage,
}: {
  message: ChatMessage;
  onStartEdit: (m: ChatMessage) => void;
  isEditing: boolean;
  editingContent: string | null;
  setEditingContent: (s: string) => void;
  onSaveEdit: (id: string, newContent: string) => void;
  onCancelEdit: () => void;
  onRegenerate?: (assistantMessageId: string) => void;
  onSwitchBranch?: (messageId: string, branch: BranchOption) => void;
  onToggleReasoning?: (messageId: string, expanded: boolean) => void;
  onCopyMessage?: (content: string) => void;
}) {
  const isStreamingAssistant =
    message.role === "assistant" && message.streaming;
  const showThinkingOnly =
    message.role === "assistant" && message.pending && !message.content;
  const reasoningSteps = message.reasoningSteps ?? [];
  const showReasoning =
    message.role === "assistant" && reasoningSteps.length > 0;

  const isUser = message.role === "user";
  const branchOptions = message.branchOptions ?? [];
  const activeBranchId = message.branchId ?? message.id;
  const currentBranchIndex = branchOptions.findIndex(
    (branch) => branch.branchId === activeBranchId,
  );
  const previousBranch =
    currentBranchIndex > 0 ? branchOptions[currentBranchIndex - 1] : null;
  const nextBranch =
    currentBranchIndex !== -1 && currentBranchIndex < branchOptions.length - 1
      ? branchOptions[currentBranchIndex + 1]
      : null;
  const hasBranches = branchOptions.length > 1;
  const branchIndex = currentBranchIndex === -1 ? 0 : currentBranchIndex + 1;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`group relative max-w-[80%] rounded-2xl border px-4 py-3 ${
          isUser
            ? "border-primary bg-primary/15 text-foreground"
            : "border-border bg-card text-foreground"
        }`}
      >
        {isEditing && isUser ? (
          <div className="space-y-2">
            <textarea
              value={editingContent ?? message.content}
              onChange={(e) => setEditingContent(e.target.value)}
              className="w-full resize-none rounded-md border bg-transparent p-2 text-sm"
              rows={3}
            />
            <div className="flex gap-2">
              <button
                onClick={() =>
                  onSaveEdit(message.id, editingContent ?? message.content)
                }
                className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="rounded border px-3 py-1 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {showReasoning ? (
              <ReasoningTimeline
                steps={reasoningSteps}
                expanded={message.reasoningExpanded ?? true}
                onExpandedChange={(expanded) => {
                  onToggleReasoning?.(message.id, expanded);
                }}
              />
            ) : null}
            {showThinkingOnly ? (
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <span>{message.status ?? "Thinking..."}</span>
              </div>
            ) : message.error ? (
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
          <div className="mt-3 flex items-center gap-2 text-muted-foreground">
            {hasBranches ? (
              <div className="flex items-center gap-1 text-muted-foreground">
                <button
                  type="button"
                  onClick={() =>
                    previousBranch &&
                    onSwitchBranch?.(message.id, previousBranch)
                  }
                  disabled={!previousBranch}
                  className="rounded-md p-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-accent hover:enabled:text-foreground"
                  title="Previous response"
                >
                  <ChevronLeft size={13} />
                </button>
                <span className="text-[11px] font-medium px-1.5 py-1 rounded-md">
                  {branchIndex}/{branchOptions.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    nextBranch && onSwitchBranch?.(message.id, nextBranch)
                  }
                  disabled={!nextBranch}
                  className="rounded-md p-1.5 transition disabled:opacity-50 disabled:cursor-not-allowed hover:enabled:bg-accent hover:enabled:text-foreground"
                  title="Next response"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            ) : null}
            <button
              onClick={() => onCopyMessage?.(message.content)}
              className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground"
              title="Copy response"
            >
              <Copy size={13} />
            </button>
            <button
              onClick={() => onRegenerate?.(message.id)}
              className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground"
              title="Regenerate response"
            >
              <RotateCcw size={13} />
            </button>
            <button
              className="rounded-md p-1.5 transition hover:bg-accent hover:text-foreground"
              title="More options"
            >
              <MoreHorizontal size={13} />
            </button>
          </div>
        ) : null}

        {isUser && !isEditing ? (
          <button
            onClick={() => onStartEdit(message)}
            aria-label="Edit"
            title="Edit"
            tabIndex={0}
            className="absolute right-2 -bottom-6 hidden p-1 transition group-hover:block focus:block pointer-events-auto"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              width="16"
              height="16"
              className="text-muted-foreground fill-current"
              aria-hidden="true"
            >
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
            </svg>
          </button>
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSentRef = useRef(false);

  const hasMessages = messages.length > 0;

  const updateAssistantMessage = useCallback(
    (messageId: string, updater: (message: ChatMessage) => ChatMessage) => {
      setMessages((currentMessages) =>
        currentMessages.map((currentMessage) =>
          currentMessage.id === messageId
            ? updater(currentMessage)
            : currentMessage,
        ),
      );
    },
    [],
  );

  const appendReasoningStep = useCallback(
    (messageId: string, step: string) => {
      updateAssistantMessage(messageId, (currentMessage) => {
        const reasoningSteps = currentMessage.reasoningSteps ?? [];
        // Avoid duplicate consecutive steps
        if (reasoningSteps[reasoningSteps.length - 1] === step) {
          return currentMessage;
        }

        const MAX_REASONING_STEPS = 50;
        const newSteps = [...reasoningSteps, step].slice(
          Math.max(0, reasoningSteps.length + 1 - MAX_REASONING_STEPS),
        );

        return {
          ...currentMessage,
          reasoningSteps: newSteps,
          reasoningExpanded: currentMessage.reasoningExpanded ?? true,
          status: step,
        };
      });
    },
    [updateAssistantMessage],
  );

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

  const startEdit = (message: ChatMessage) => {
    if (message.role !== "user") return;
    setEditingId(message.id);
    setEditingContent(message.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingContent(null);
  };

  const copyMessage = async (content: string) => {
    const textToCopy = content.trim();
    if (!textToCopy) {
      showFeedback({
        type: "error",
        title: "Nothing to copy",
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      showFeedback({
        type: "success",
        title: "Copied",
      });
    } catch {
      showFeedback({
        type: "error",
        title: "Copy failed",
        description: "Clipboard access was denied.",
      });
    }
  };

  const switchBranch = (messageId: string, branch: BranchOption) => {
    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        currentMessage.id === messageId
          ? {
              ...currentMessage,
              id: branch.id,
              content: branch.content,
              parentId: branch.parentId,
              branchId: branch.branchId,
              branchOptions: currentMessage.branchOptions,
            }
          : currentMessage,
      ),
    );
  };

  const saveEdit = async (messageId: string, newContent: string) => {
    if (!newContent || isSending) return;

    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;

    setIsSending(true);
    setError(null);

    // Update the edited message locally and truncate later messages
    setMessages((current) =>
      current
        .map((m) => (m.id === messageId ? { ...m, content: newContent } : m))
        .slice(0, index + 1),
    );

    const assistantPlaceholderId = `local-assistant-${crypto.randomUUID()}`;

    setMessages((current) => [
      ...current,
      {
        id: assistantPlaceholderId,
        role: "assistant",
        content: "",
        pending: true,
        streaming: false,
      },
    ]);

    abortControllerRef.current = new AbortController();
    let activeAssistantMessageId = assistantPlaceholderId;

    try {
      const response = await fetch("/api/chat/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, messageId, newContent }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to edit message.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming response is not available.");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalAssistantMessage = "";

      const applyChunk = (delta: string) => {
        finalAssistantMessage = `${finalAssistantMessage}${delta}`;
        updateAssistantMessage(activeAssistantMessageId, (currentMessage) => ({
          ...currentMessage,
          content: finalAssistantMessage,
          pending: false,
          streaming: true,
        }));
      };

      const applyStatus = (status: string) => {
        appendReasoningStep(activeAssistantMessageId, status);
      };

      const applyDone = (content: string, persistedMessageId?: string) => {
        const finalContent = (content || finalAssistantMessage || "").trim();
        const nextAssistantMessageId =
          persistedMessageId && persistedMessageId.trim().length > 0
            ? persistedMessageId
            : activeAssistantMessageId;
        const previousAssistantMessageId = activeAssistantMessageId;
        activeAssistantMessageId = nextAssistantMessageId;

        if (!finalContent) {
          setError("No response generated. Please try again.");
          setMessages((currentMessages) =>
            currentMessages.filter(
              (m) =>
                m.id !== assistantPlaceholderId &&
                m.id !== previousAssistantMessageId,
            ),
          );
          setEditingId(messageId);
          setEditingContent(newContent);
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === previousAssistantMessageId ||
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  id: nextAssistantMessageId,
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
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let frameEndIndex = buffer.indexOf("\n\n");
        while (frameEndIndex !== -1) {
          const frame = buffer.slice(0, frameEndIndex).trim();
          buffer = buffer.slice(frameEndIndex + 2);
          frameEndIndex = buffer.indexOf("\n\n");

          if (!frame) continue;

          try {
            const payloadText = frame.startsWith("data:")
              ? frame.replace(/^data:\s*/, "")
              : frame;
            const event = JSON.parse(payloadText) as StreamEvent;

            if (event.type === "status") applyStatus(event.message);
            if (event.type === "token") applyChunk(event.content);
            if (event.type === "done") {
              applyDone(finalAssistantMessage, event.messageId);
            }
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message &&
              !parseError.message.includes("JSON.parse")
            ) {
              throw parseError;
            }
            console.error("Failed to parse edit stream payload:", parseError);
          }
        }
      }

      applyDone(finalAssistantMessage, undefined);
      // Clear editing state on success
      setEditingId(null);
      setEditingContent(null);
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
          : "Failed to edit message.";
      setMessages((currentMessages) =>
        currentMessages.filter((m) => m.id !== assistantPlaceholderId),
      );
      setError(errorMessage);
      showFeedback({
        type: "error",
        title: "Edit failed",
        description: errorMessage,
      });
    } finally {
      abortControllerRef.current = null;
      setIsSending(false);
    }
  };

  const regenerateMessage = async (assistantMessageId: string) => {
    if (isSending) return;

    setIsSending(true);
    setError(null);

    const assistantPlaceholderId = `local-assistant-${crypto.randomUUID()}`;

    setMessages((current) =>
      current.map((message) =>
        message.id === assistantMessageId
          ? {
              ...message,
              id: assistantPlaceholderId,
              content: "",
              pending: true,
              streaming: false,
              status: undefined,
              error: undefined,
            }
          : message,
      ),
    );

    abortControllerRef.current = new AbortController();
    let activeAssistantMessageId = assistantPlaceholderId;

    try {
      const response = await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, assistantMessageId }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(payload?.error ?? "Failed to regenerate message.");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Streaming response is not available.");

      const decoder = new TextDecoder();
      let buffer = "";
      let finalAssistantMessage = "";

      const applyChunk = (delta: string) => {
        finalAssistantMessage = `${finalAssistantMessage}${delta}`;
        updateAssistantMessage(activeAssistantMessageId, (currentMessage) => ({
          ...currentMessage,
          content: finalAssistantMessage,
          pending: false,
          streaming: true,
        }));
      };

      const applyStatus = (status: string) => {
        appendReasoningStep(activeAssistantMessageId, status);
      };

      const applyPlaceholder = (
        event: Extract<StreamEvent, { type: "placeholder" }>,
      ) => {
        activeAssistantMessageId = event.messageId;
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  id: event.messageId,
                  branchId: event.branchId,
                  parentId: event.parentId,
                }
              : currentMessage,
          ),
        );
      };

      const applyBranchList = (
        event: Extract<StreamEvent, { type: "branches" }>,
      ) => {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) => {
            if (
              currentMessage.role !== "assistant" ||
              currentMessage.parentId !== event.parentId
            ) {
              return currentMessage;
            }

            return {
              ...currentMessage,
              branchOptions: event.branches,
            };
          }),
        );
      };

      const applyDone = (content: string) => {
        const finalContent = (content || finalAssistantMessage || "").trim();

        if (!finalContent) {
          setError("No response generated. Please try again.");
          setMessages((currentMessages) =>
            currentMessages.filter(
              (m) =>
                m.id !== assistantPlaceholderId &&
                m.id !== activeAssistantMessageId,
            ),
          );
          activeAssistantMessageId = assistantPlaceholderId;
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === activeAssistantMessageId
              ? {
                  ...currentMessage,
                  id: activeAssistantMessageId,
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
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let frameEndIndex = buffer.indexOf("\n\n");
        while (frameEndIndex !== -1) {
          const frame = buffer.slice(0, frameEndIndex).trim();
          buffer = buffer.slice(frameEndIndex + 2);
          frameEndIndex = buffer.indexOf("\n\n");

          if (!frame) continue;

          try {
            const payloadText = frame.startsWith("data:")
              ? frame.replace(/^data:\s*/, "")
              : frame;
            const event = JSON.parse(payloadText) as StreamEvent;

            if (event.type === "placeholder") {
              applyPlaceholder(event);
            }

            if (event.type === "branches") {
              applyBranchList(event);
            }

            if (event.type === "status") applyStatus(event.message);
            if (event.type === "token") applyChunk(event.content);
            if (event.type === "done") applyDone(finalAssistantMessage);
          } catch (parseError) {
            if (
              parseError instanceof Error &&
              parseError.message &&
              !parseError.message.includes("JSON.parse")
            ) {
              throw parseError;
            }
            console.error(
              "Failed to parse regenerate stream payload:",
              parseError,
            );
          }
        }
      }

      applyDone(finalAssistantMessage);
    } catch (sendError) {
      if (sendError instanceof Error && sendError.name === "AbortError") {
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === activeAssistantMessageId
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
          : "Failed to regenerate.";
      setMessages((currentMessages) =>
        currentMessages.filter(
          (m) =>
            m.id !== assistantPlaceholderId &&
            m.id !== activeAssistantMessageId,
        ),
      );
      setError(errorMessage);
      showFeedback({
        type: "error",
        title: "Regenerate failed",
        description: errorMessage,
      });
    } finally {
      abortControllerRef.current = null;
      setIsSending(false);
    }
  };

  const sendMessage = useCallback(
    async (messageToSend?: string) => {
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
        let activeAssistantMessageId = assistantPlaceholderId;

        const applyChunk = (delta: string) => {
          finalAssistantMessage = `${finalAssistantMessage}${delta}`;
          updateAssistantMessage(
            activeAssistantMessageId,
            (currentMessage) => ({
              ...currentMessage,
              content: finalAssistantMessage,
              pending: false,
              streaming: true,
            }),
          );
        };

        const applyStatus = (status: string) => {
          appendReasoningStep(activeAssistantMessageId, status);
        };

        const applyDone = (content: string, persistedMessageId?: string) => {
          const finalContent = (content || finalAssistantMessage || "").trim();
          const nextAssistantMessageId =
            persistedMessageId && persistedMessageId.trim().length > 0
              ? persistedMessageId
              : activeAssistantMessageId;
          const previousAssistantMessageId = activeAssistantMessageId;
          activeAssistantMessageId = nextAssistantMessageId;

          if (!finalContent) {
            setError("No response generated. Please try again.");
            setMessages((currentMessages) =>
              currentMessages.filter(
                (currentMessage) =>
                  currentMessage.id !== userMessageId &&
                  currentMessage.id !== assistantPlaceholderId &&
                  currentMessage.id !== previousAssistantMessageId,
              ),
            );
            setDraft(message);
            return;
          }

          setMessages((currentMessages) =>
            currentMessages.map((currentMessage) =>
              currentMessage.id === previousAssistantMessageId ||
              currentMessage.id === assistantPlaceholderId
                ? {
                    ...currentMessage,
                    id: nextAssistantMessageId,
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
                applyDone(finalAssistantMessage, event.messageId);
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

        applyDone(finalAssistantMessage, undefined);
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
    },
    [
      appendReasoningStep,
      chatId,
      draft,
      isSending,
      showFeedback,
      updateAssistantMessage,
    ],
  );

  useEffect(() => {
    if (!initialMessage || hasAutoSentRef.current || hasMessages || isSending) {
      return;
    }

    hasAutoSentRef.current = true;
    void sendMessage(initialMessage);
  }, [initialMessage, hasMessages, isSending, sendMessage]);

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
              <MessageBubble
                key={message.id}
                message={message}
                onStartEdit={startEdit}
                isEditing={editingId === message.id}
                editingContent={editingContent}
                setEditingContent={setEditingContent}
                onSaveEdit={saveEdit}
                onCancelEdit={cancelEdit}
                onRegenerate={regenerateMessage}
                onSwitchBranch={switchBranch}
                onCopyMessage={(content) => {
                  void copyMessage(content);
                }}
              />
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

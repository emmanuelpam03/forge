"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  MessageSquare,
  MoreHorizontal,
  RotateCcw,
  Sparkles,
  Square,
  Mic,
  Plus,
} from "lucide-react";
import { MessageRenderer } from "@/components/MessageRenderer";
import { useFeedback } from "@/components/feedback-provider";
import { ActiveToolChip } from "@/components/chat/ActiveToolChip";
import { ModesMenu } from "@/components/ModesMenu";
import { useSelectedOptions } from "@/hooks/useSelectedOptions";
import { type StreamEvent } from "@/ai/graph/stream";
import { useSeniorEngineeringMode } from "@/hooks/useSeniorEngineeringMode";

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
  reasoning?: string;
  reasoningExpanded?: boolean;
  error?: string;
};

type ChatClientProps = {
  chatId: string;
  projectId: string | null;
  title: string;
  initialMessages: ChatMessage[];
  initialMessage?: string;
};

type ModelOption = {
  id: string;
  label: string;
  provider: "google-genai" | "ollama";
};

const MODEL_OPTIONS: ModelOption[] = [
  { id: "gpt-oss:120b", label: "GPT-OSS 120B", provider: "ollama" },
  { id: "gemma-4-31b-it", label: "Gemma 4 31B IT", provider: "google-genai" },
];

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
  reasoning,
  showReasoning,
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
  reasoning: string;
  showReasoning: boolean;
}) {
  const isStreamingAssistant =
    message.role === "assistant" && message.streaming;
  const showThinkingOnly =
    message.role === "assistant" && message.pending && !message.content;
  const reasoningText = reasoning.trim();
  const hasReasoning = reasoningText.length > 0;

  const isUser = message.role === "user";
  const branchOptions = message.branchOptions ?? [];
  const activeBranchId = message.branchId ?? message.id;
  const currentBranchIndex = branchOptions.findIndex(
    (branch: BranchOption) => branch.branchId === activeBranchId,
  );
  const previousBranch =
    currentBranchIndex > 0 ? branchOptions[currentBranchIndex - 1] : null;
  const nextBranch =
    currentBranchIndex !== -1 && currentBranchIndex < branchOptions.length - 1
      ? branchOptions[currentBranchIndex + 1]
      : null;
  const hasBranches = branchOptions.length > 1;
  const branchIndex = currentBranchIndex === -1 ? 0 : currentBranchIndex + 1;
  const canCopyMessage = Boolean(onCopyMessage && message.content.trim());

  return (
    <div
      className={`flex ${isUser ? "justify-end" : message.role === "assistant" ? "justify-center" : "justify-start"}`}
    >
      <div
        className={`group relative ${
          message.role === "assistant"
            ? "w-full max-w-225 px-0 py-0 bg-transparent border-0 text-foreground"
            : `max-w-[80%] rounded-2xl border px-4 py-3 ${
                isUser
                  ? "border-primary bg-primary/15 text-foreground"
                  : "border-border bg-card text-foreground"
              }`
        }`}
      >
        {isEditing && isUser ? (
          <div className="min-w-[min(100%,48rem)] rounded-[28px] border border-border/80 bg-card/95 px-6 py-5 shadow-2xl shadow-black/20 backdrop-blur-sm">
            <textarea
              autoFocus
              value={editingContent ?? message.content}
              onChange={(e) => setEditingContent(e.target.value)}
              className="min-h-[5rem] w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-7 text-foreground outline-none placeholder:text-muted-foreground/70"
              rows={3}
            />
            <div className="mt-4 flex items-center justify-end gap-3">
              <button
                onClick={onCancelEdit}
                className="rounded-full bg-[#1f1f1f] px-5 py-2 text-sm font-semibold text-foreground transition hover:bg-[#2a2a2a]"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  onSaveEdit(message.id, editingContent ?? message.content)
                }
                className="rounded-full bg-white px-5 py-2 text-sm font-semibold text-[#111111] transition hover:bg-white/90"
              >
                Send
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {hasReasoning ? (
              <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2.5 text-[13px] text-muted-foreground">
                <button
                  type="button"
                  onClick={() =>
                    onToggleReasoning?.(message.id, !showReasoning)
                  }
                  className="flex w-full items-center justify-between gap-3 text-left text-[12px] font-medium uppercase tracking-[0.14em] text-muted-foreground transition hover:text-foreground"
                >
                  <span>
                    {showReasoning ? "Hide reasoning" : "View reasoning"}
                  </span>
                  <span className="text-[11px] font-normal normal-case tracking-normal text-muted-foreground/80">
                    Hidden by default
                  </span>
                </button>

                {showReasoning ? (
                  <p className="mt-2 whitespace-pre-wrap leading-5 text-foreground/85">
                    {reasoningText}
                  </p>
                ) : null}
              </div>
            ) : null}

            {message.error ? (
              <p className="text-[14px] leading-7 text-red-400">
                {message.error}
              </p>
            ) : showThinkingOnly ? (
              <div className="flex items-center gap-2 text-[14px] text-muted-foreground">
                <span className="block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                <span className="text-sm">
                  {message.status ?? "Thinking..."}
                </span>
              </div>
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
          <div className="mt-3 flex items-center gap-2 text-muted-foreground opacity-100 transition group-hover:opacity-100">
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
          <div className="absolute right-3 -bottom-10 hidden items-center gap-1 rounded-full border border-border/70 bg-background/90 px-2 py-1 shadow-lg shadow-black/15 backdrop-blur group-hover:flex group-focus-within:flex">
            {canCopyMessage ? (
              <button
                type="button"
                onClick={() => onCopyMessage?.(message.content)}
                className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
                aria-label="Copy prompt"
                title="Copy prompt"
              >
                <Copy size={13} />
              </button>
            ) : null}
            <button
              onClick={() => onStartEdit(message)}
              aria-label="Edit prompt"
              title="Edit prompt"
              tabIndex={0}
              className="rounded-full p-1.5 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="16"
                height="16"
                className="fill-current"
                aria-hidden="true"
              >
                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
              </svg>
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function ChatClient({
  chatId,
  projectId,
  title,
  initialMessages,
  initialMessage,
}: ChatClientProps) {
  const { showFeedback } = useFeedback();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [reasoning, setReasoning] = useState("");
  const [message, setMessage] = useState("");
  const [showReasoning, setShowReasoning] = useState(false);
  const [draft, setDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUserMessage, setLastUserMessage] = useState<string | null>(null);
  const [isModesMenuOpen, setIsModesMenuOpen] = useState(false);
  const [selectedModelId, setSelectedModelId] = useState(
    MODEL_OPTIONS[0]?.id ?? "claude-3-5-sonnet",
  );
  const {
    getSelectedOptionObjects,
    removeOption,
    isLoaded: optionsLoaded,
  } = useSelectedOptions(chatId);
  const selectedOptions = getSelectedOptionObjects();
  const { isEnabled: isForceSeniorEngineeringMode } =
    useSeniorEngineeringMode(chatId);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);
  const modesMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSentRef = useRef(false);

  const selectedModel =
    MODEL_OPTIONS.find((model) => model.id === selectedModelId) ??
    MODEL_OPTIONS[0];

  const hasMessages = messages.length > 0;

  const resetStreamBuffers = useCallback(() => {
    setReasoning("");
    setMessage("");
    setShowReasoning(false);
  }, []);

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

  const appendReasoningChunk = useCallback(
    (messageId: string, chunk: string) => {
      setReasoning((currentReasoning) => {
        const nextReasoning = `${currentReasoning}${chunk}`;

        updateAssistantMessage(messageId, (currentMessage) => ({
          ...currentMessage,
          reasoning: nextReasoning,
        }));

        return nextReasoning;
      });
    },
    [updateAssistantMessage],
  );

  const appendReasoningStep = appendReasoningChunk;

  const appendAnswerChunk = useCallback(
    (messageId: string, chunk: string) => {
      setMessage((currentMessageText) => {
        const nextMessage = `${currentMessageText}${chunk}`;

        updateAssistantMessage(messageId, (currentMessage) => ({
          ...currentMessage,
          content: nextMessage,
          pending: false,
          streaming: true,
          status: undefined,
        }));

        return nextMessage;
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

  useEffect(() => {
    if (!isModelMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (
        modelMenuRef.current &&
        !modelMenuRef.current.contains(event.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsModelMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isModelMenuOpen]);

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

  const clearAssistantStreamingState = useCallback((messageId: string) => {
    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        currentMessage.id === messageId
          ? {
              ...currentMessage,
              pending: false,
              streaming: false,
              status: undefined,
            }
          : currentMessage,
      ),
    );
  }, []);

  const clearAssistantStreamingStates = useCallback((messageIds: string[]) => {
    if (messageIds.length === 0) {
      return;
    }

    const messageIdSet = new Set(messageIds);
    setMessages((currentMessages) =>
      currentMessages.map((currentMessage) =>
        messageIdSet.has(currentMessage.id)
          ? {
              ...currentMessage,
              pending: false,
              streaming: false,
              status: undefined,
              reasoningSteps: [],
              reasoningExpanded: false,
            }
          : currentMessage,
      ),
    );
  }, []);

  const finalizeStreamState = useCallback(
    (messageId: string, source: string) => {
      console.info("STREAM END DETECTED", {
        chatId,
        source,
      });
      clearAssistantStreamingState(messageId);
      setIsSending(false);
      console.info("STATE RESET", {
        chatId,
        source,
      });
    },
    [chatId, clearAssistantStreamingState],
  );

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

  const toggleReasoning = useCallback(
    (messageId: string, expanded: boolean) => {
      setShowReasoning(expanded);
      updateAssistantMessage(messageId, (currentMessage) => ({
        ...currentMessage,
        reasoningExpanded: expanded,
      }));
    },
    [updateAssistantMessage],
  );

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
        status: "Thinking...",
        reasoning: "",
        reasoningExpanded: false,
      },
    ]);

    abortControllerRef.current = new AbortController();
    let activeAssistantMessageId = assistantPlaceholderId;
    resetStreamBuffers();

    try {
      const response = await fetch("/api/chat/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          messageId,
          newContent,
          model: selectedModelId,
          provider: selectedModel.provider,
        }),
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
      let hasReceivedDone = false;
      let hasLoggedFirstToken = false;
      let streamedReasoning = "";
      let streamedMessage = "";

      const applyReasoning = (delta: string) => {
        streamedReasoning = `${streamedReasoning}${delta}`;
        appendReasoningChunk(activeAssistantMessageId, delta);
      };

      const applyChunk = (delta: string) => {
        streamedMessage = `${streamedMessage}${delta}`;
        appendAnswerChunk(activeAssistantMessageId, delta);
      };

      const applyDone = (
        content: string,
        persistedMessageId?: string,
        persistedUserMessageId?: string,
      ) => {
        const finalContent = (content || streamedMessage || "").trim();
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
          finalizeStreamState(previousAssistantMessageId, "edit");
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
                  reasoning: streamedReasoning,
                  reasoningExpanded: currentMessage.reasoningExpanded ?? false,
                }
              : persistedUserMessageId && currentMessage.id === messageId
                ? {
                    ...currentMessage,
                    id: persistedUserMessageId,
                  }
                : currentMessage,
          ),
        );
        finalizeStreamState(nextAssistantMessageId, "edit");
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let lineEndIndex = buffer.indexOf("\n");
        while (lineEndIndex !== -1) {
          const line = buffer.slice(0, lineEndIndex).trim();
          buffer = buffer.slice(lineEndIndex + 1);
          lineEndIndex = buffer.indexOf("\n");

          if (!line) continue;

          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "reasoning") {
              applyReasoning(event.content);
            }
            if (event.type === "token") applyChunk(event.content);
            if (event.type === "done") {
              hasReceivedDone = true;
              console.info("STREAM ENDED", {
                chatId,
                source: "edit",
              });
              applyDone(
                event.response ?? streamedMessage,
                event.messageId,
                event.userMessageId,
              );
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

      if (!hasReceivedDone) {
        console.info("STREAM ENDED", {
          chatId,
          source: "edit",
        });
        applyDone(streamedMessage, undefined);
      }
      // Clear editing state on success
      setEditingId(null);
      setEditingContent(null);
    } catch (sendError) {
      if (sendError instanceof Error && sendError.name === "AbortError") {
        // Preserve accumulated content when stopped; just mark as not streaming
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === assistantPlaceholderId
              ? {
                  ...currentMessage,
                  pending: false,
                  streaming: false,
                  status: undefined,
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
              reasoning: "",
              reasoningExpanded: false,
              error: undefined,
            }
          : message,
      ),
    );

    abortControllerRef.current = new AbortController();
    let activeAssistantMessageId = assistantPlaceholderId;
    resetStreamBuffers();

    try {
      const response = await fetch("/api/chat/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId,
          assistantMessageId,
          model: selectedModelId,
          provider: selectedModel.provider,
        }),
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
      let hasReceivedDone = false;
      let hasLoggedFirstToken = false;
      let streamedReasoning = "";
      let streamedMessage = "";
      let activeAssistantParentId: string | null = null;

      const applyReasoning = (delta: string) => {
        streamedReasoning = `${streamedReasoning}${delta}`;
        appendReasoningChunk(activeAssistantMessageId, delta);
      };

      const applyChunk = (delta: string) => {
        streamedMessage = `${streamedMessage}${delta}`;
        appendAnswerChunk(activeAssistantMessageId, delta);
      };

      const applyPlaceholder = (
        event: Extract<StreamEvent, { type: "placeholder" }>,
      ) => {
        activeAssistantMessageId = event.messageId;
        activeAssistantParentId = event.parentId;
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

      const applyDone = (content: string, persistedMessageId?: string) => {
        const finalContent = (content || streamedMessage || "").trim();
        const nextAssistantMessageId =
          persistedMessageId && persistedMessageId.trim().length > 0
            ? persistedMessageId
            : activeAssistantMessageId;
        const previousAssistantMessageId = activeAssistantMessageId;
        const messageIdsToClear = Array.from(
          new Set([
            assistantPlaceholderId,
            previousAssistantMessageId,
            nextAssistantMessageId,
          ]),
        );
        const shouldClearByParent =
          activeAssistantParentId !== null
            ? (currentMessage: ChatMessage) =>
                currentMessage.role === "assistant" &&
                currentMessage.parentId === activeAssistantParentId
            : () => false;

        activeAssistantMessageId = nextAssistantMessageId;

        if (!finalContent) {
          setError("No response generated. Please try again.");
          setMessages((currentMessages) =>
            currentMessages.filter((m) => !messageIdsToClear.includes(m.id)),
          );
          activeAssistantMessageId = assistantPlaceholderId;
          clearAssistantStreamingStates(messageIdsToClear);
          setIsSending(false);
          console.info("STREAM END DETECTED", {
            chatId,
            source: "regenerate",
          });
          console.info("STATE RESET", {
            chatId,
            source: "regenerate",
          });
          return;
        }

        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            messageIdsToClear.includes(currentMessage.id) ||
            shouldClearByParent(currentMessage)
              ? {
                  ...currentMessage,
                  id: nextAssistantMessageId,
                  role: "assistant",
                  content: finalContent,
                  pending: false,
                  streaming: false,
                  status: undefined,
                  reasoning: streamedReasoning,
                  reasoningExpanded: currentMessage.reasoningExpanded ?? false,
                }
              : currentMessage,
          ),
        );
        clearAssistantStreamingStates(messageIdsToClear);
        setIsSending(false);
        console.info("STREAM END DETECTED", {
          chatId,
          source: "regenerate",
        });
        console.info("STATE RESET", {
          chatId,
          source: "regenerate",
        });
      };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let lineEndIndex = buffer.indexOf("\n");
        while (lineEndIndex !== -1) {
          const line = buffer.slice(0, lineEndIndex).trim();
          buffer = buffer.slice(lineEndIndex + 1);
          lineEndIndex = buffer.indexOf("\n");

          if (!line) continue;

          try {
            const event = JSON.parse(line) as StreamEvent;

            if (event.type === "placeholder") {
              applyPlaceholder(event);
            }

            if (event.type === "branches") {
              applyBranchList(event);
            }

            if (event.type === "reasoning" && !hasReceivedDone) {
              applyReasoning(event.content);
            }

            if (event.type === "token" && !hasReceivedDone) {
              applyChunk(event.content);
            }
            if (event.type === "done") {
              if (!hasReceivedDone) {
                hasReceivedDone = true;
                console.info("STREAM ENDED", {
                  chatId,
                  source: "regenerate",
                });
                applyDone(event.response ?? streamedMessage, event.messageId);
              }
            }
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

      if (!hasReceivedDone) {
        console.info("STREAM ENDED", {
          chatId,
          source: "regenerate",
        });
        applyDone(streamedMessage, activeAssistantMessageId);
      }
    } catch (sendError) {
      if (sendError instanceof Error && sendError.name === "AbortError") {
        // Preserve accumulated content when stopped; just mark as not streaming
        setMessages((currentMessages) =>
          currentMessages.map((currentMessage) =>
            currentMessage.id === activeAssistantMessageId
              ? {
                  ...currentMessage,
                  pending: false,
                  streaming: false,
                  status: undefined,
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
      clearAssistantStreamingStates([
        assistantPlaceholderId,
        activeAssistantMessageId,
      ]);
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
          reasoning: "",
          reasoningExpanded: false,
        },
      ]);

      abortControllerRef.current = new AbortController();
      resetStreamBuffers();

      try {
        const response = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            message,
            model: selectedModelId,
            provider: selectedModel.provider,
            promptBehavior: isForceSeniorEngineeringMode
              ? { persona: "senior-engineer" }
              : undefined,
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
        let activeAssistantMessageId = assistantPlaceholderId;
        let hasReceivedDone = false;
        let hasLoggedFirstToken = false;
        let streamedReasoning = "";
        let streamedMessage = "";

        const applyReasoning = (delta: string) => {
          streamedReasoning = `${streamedReasoning}${delta}`;
          appendReasoningChunk(activeAssistantMessageId, delta);
        };

        const applyChunk = (delta: string) => {
          streamedMessage = `${streamedMessage}${delta}`;
          appendAnswerChunk(activeAssistantMessageId, delta);
        };

        const applyDone = (
          content: string,
          persistedMessageId?: string,
          persistedUserMessageId?: string,
        ) => {
          const finalContent = (content || streamedMessage || "").trim();
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
            finalizeStreamState(previousAssistantMessageId, "send");
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
                    reasoning: streamedReasoning,
                    reasoningExpanded:
                      currentMessage.reasoningExpanded ?? false,
                  }
                : persistedUserMessageId && currentMessage.id === userMessageId
                  ? {
                      ...currentMessage,
                      id: persistedUserMessageId,
                    }
                  : currentMessage,
            ),
          );
          finalizeStreamState(nextAssistantMessageId, "send");
        };

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            break;
          }

          buffer += decoder.decode(value, { stream: true });

          let lineEndIndex = buffer.indexOf("\n");
          while (lineEndIndex !== -1) {
            const line = buffer.slice(0, lineEndIndex).trim();
            buffer = buffer.slice(lineEndIndex + 1);
            lineEndIndex = buffer.indexOf("\n");

            if (!line) {
              continue;
            }

            try {
              const event = JSON.parse(line) as StreamEvent;

              if (event.type === "reasoning") {
                applyReasoning(event.content);
              }

              if (event.type === "token") {
                applyChunk(event.content);
              }

              if (event.type === "done") {
                hasReceivedDone = true;
                console.info("STREAM ENDED", {
                  chatId,
                  source: "send",
                });
                applyDone(
                  event.response ?? streamedMessage,
                  event.messageId,
                  event.userMessageId,
                );
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

        if (!hasReceivedDone) {
          console.info("STREAM ENDED", {
            chatId,
            source: "send",
          });
          applyDone(streamedMessage, undefined);
        }
      } catch (sendError) {
        if (sendError instanceof Error && sendError.name === "AbortError") {
          // Preserve accumulated content when stopped; just mark as not streaming
          setMessages((currentMessages) =>
            currentMessages.map((currentMessage) =>
              currentMessage.id === assistantPlaceholderId
                ? {
                    ...currentMessage,
                    pending: false,
                    streaming: false,
                    status: undefined,
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
      appendAnswerChunk,
      appendReasoningChunk,
      resetStreamBuffers,
      chatId,
      draft,
      isSending,
      selectedModelId,
      isForceSeniorEngineeringMode,
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
        <div className="flex items-center gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
              Chat
            </p>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>

          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-card px-2.5 py-1 text-[11px] text-muted-foreground">
            <Sparkles size={12} className="text-primary" />
            Forge Preview
          </span>
        </div>
      </div>

      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-5 pb-40">
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
                onToggleReasoning={toggleReasoning}
                onCopyMessage={(content) => {
                  void copyMessage(content);
                }}
                reasoning={
                  message.role === "assistant" &&
                  (message.pending || message.streaming)
                    ? reasoning
                    : (message.reasoning ?? "")
                }
                showReasoning={
                  message.role === "assistant" &&
                  (message.pending || message.streaming)
                    ? showReasoning
                    : (message.reasoningExpanded ?? false)
                }
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="absolute inset-x-0 bottom-6 z-50 pointer-events-none">
        <div className="mx-auto w-full max-w-4xl px-6 pointer-events-auto">
          <div className="relative rounded-full border border-border bg-card/90 px-4 py-3 shadow-lg backdrop-blur">
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              <div className="relative shrink-0">
                <button
                  ref={modesMenuTriggerRef}
                  type="button"
                  onClick={() => setIsModesMenuOpen((value) => !value)}
                  className="rounded-full p-2 text-muted-foreground transition hover:text-foreground"
                  aria-haspopup="menu"
                  aria-expanded={isModesMenuOpen}
                  title="Open modes"
                >
                  <Plus size={18} />
                </button>

                <ModesMenu
                  isOpen={isModesMenuOpen}
                  onClose={() => setIsModesMenuOpen(false)}
                  chatId={chatId}
                  triggerRef={modesMenuTriggerRef}
                  className="absolute bottom-full left-0 mb-3 z-50 w-[20rem] max-w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
                />
              </div>

              {optionsLoaded && selectedOptions.length > 0 ? (
                <div className="flex min-w-0 max-w-full flex-1 flex-wrap items-center gap-2">
                  {selectedOptions.map((option) => (
                    <ActiveToolChip
                      key={option.id}
                      option={option}
                      onRemove={() => removeOption(option.id)}
                    />
                  ))}
                </div>
              ) : null}

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
                placeholder="Ask anything"
                rows={1}
                disabled={isSending}
                className="min-h-10 max-h-40 flex-1 resize-none bg-transparent px-1 py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />

              <button className="rounded-full p-2 text-muted-foreground transition hover:text-foreground">
                <Mic size={18} />
              </button>

              <div className="flex items-center gap-2">
                <div className="relative" ref={modelMenuRef}>
                  <button
                    type="button"
                    title="Select model"
                    aria-label="Select model"
                    aria-expanded={isModelMenuOpen}
                    aria-haspopup="menu"
                    onClick={() => setIsModelMenuOpen((value) => !value)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3.5 py-2 text-[12px] font-medium text-muted-foreground shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/70 hover:text-foreground hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <span className="truncate">{selectedModel.label}</span>
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        isModelMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {isModelMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 bottom-full mb-2 w-56 overflow-hidden rounded-2xl border border-border bg-popover p-1 shadow-xl"
                    >
                      {MODEL_OPTIONS.map((option) => {
                        const isActive = option.id === selectedModelId;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={isActive}
                            onClick={() => {
                              setSelectedModelId(option.id);
                              setIsModelMenuOpen(false);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm transition hover:bg-accent hover:text-foreground ${
                              isActive ? "bg-accent text-foreground" : ""
                            }`}
                          >
                            <span className="pr-3">{option.label}</span>
                            {isActive ? (
                              <span className="text-[10px] uppercase tracking-[0.3em] text-primary">
                                Active
                              </span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>

                {isSending ? (
                  <button
                    type="button"
                    onClick={stopGeneration}
                    className="rounded-full bg-destructive p-2 text-destructive-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Stop generation"
                    title="Stop generation"
                  >
                    <Square size={16} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim()}
                    className="rounded-full bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label="Send message"
                    title="Send message"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-3">
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
            <p className="mt-2 text-[11px] text-red-400 px-3">{error}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

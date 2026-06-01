"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowUp, Bookmark, Globe, Layers, Mic, Plus } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { ActiveToolChip } from "@/components/chat/ActiveToolChip";
import { AttachmentChip } from "@/components/chat/AttachmentChip";
import { AttachmentPreviewDialog } from "@/components/chat/AttachmentPreviewDialog";
import { ModesMenu } from "@/components/ModesMenu";
import { useFeedback } from "@/components/feedback-provider";
import { useAuth } from "@/components/auth-provider";
import { useSelectedOptions } from "@/hooks/useSelectedOptions";
import { inferAttachmentKind, type UploadedAttachment } from "@/lib/attachment-types";

function ForgeLogo({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      className={className}
      style={style}
      viewBox="0 0 41 41"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M37.532 16.87a9.963 9.963 0 0 0-.856-8.184 10.078 10.078 0 0 0-10.855-4.835 9.964 9.964 0 0 0-6.99-3.123 10.079 10.079 0 0 0-9.617 6.977 9.967 9.967 0 0 0-6.69 4.839 10.081 10.081 0 0 0 1.24 11.817 9.965 9.965 0 0 0 .856 8.185 10.079 10.079 0 0 0 10.855 4.835 9.965 9.965 0 0 0 6.99 3.123 10.079 10.079 0 0 0 9.617-6.977 9.967 9.967 0 0 0 6.69-4.839 10.079 10.079 0 0 0-1.24-11.816z" />
    </svg>
  );
}

const FEATURE_CARDS = [
  {
    id: "1",
    icon: Bookmark,
    title: "Saved Prompts",
    description: "Store and reuse your best prompts instantly.",
  },
  {
    id: "2",
    icon: Layers,
    title: "Projects",
    description: "Organize chats into focused workspaces.",
  },
  {
    id: "3",
    icon: Globe,
    title: "Research Ready",
    description: "Get answers, ideas, summaries, and strategy.",
  },
];

export default function HomePage() {
  const { showFeedback } = useFeedback();
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const homeScopeId = "home-global";
  const uploadInputId = "home-upload-input";

  const hour = new Date().getHours();
  const greetingText =
    hour < 12 ? "Morning" : hour < 18 ? "Afternoon" : "Evening";

  const displayName =
    user?.name?.split(" ")[0] ||
    user?.email?.split("@")[0] ||
    "there";

  const [input, setInput] = useState("");
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const [error, setError] = useState("");
  const [isModesMenuOpen, setIsModesMenuOpen] = useState(false);
  const [previewAttachment, setPreviewAttachment] = useState<UploadedAttachment | null>(null);
  const modesMenuTriggerRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [draftChatId, setDraftChatId] = useState<string | null>(null);
  const draftChatIdRef = useRef<string | null>(null);
  const [attachments, setAttachments] = useState<UploadedAttachment[]>([]);
  const {
    selectedOptions: selectedOptionIds,
    getSelectedOptionObjects,
    removeOption,
  } = useSelectedOptions(homeScopeId);
  const selectedOptions = getSelectedOptionObjects();

  const clearComposerAttachments = useCallback(() => {
    setAttachments([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const ensureDraftChat = useCallback(async () => {
    if (draftChatIdRef.current) {
      return draftChatIdRef.current;
    }

    if (!user) {
      const { createGuestChatId } = await import("@/lib/guest-chat");
      const chatId = createGuestChatId();
      draftChatIdRef.current = chatId;
      setDraftChatId(chatId);
      return chatId;
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    window.dispatchEvent(
      new CustomEvent("chat:created", {
        detail: { id: tempId, title: "New Chat" },
      }),
    );

    const { createChat } = await import("@/lib/actions/chats");
    const createResult = await createChat();

    if (!createResult.success || !createResult.chat) {
      throw new Error(createResult.error ?? "Failed to create chat");
    }

    const chatId = createResult.chat.id;
    draftChatIdRef.current = chatId;
    setDraftChatId(chatId);

    window.dispatchEvent(
      new CustomEvent("chat:confirmed", {
        detail: { tempId, id: chatId, title: "New Chat" },
      }),
    );

    return chatId;
  }, [user]);

  useEffect(() => {
    if (!user) {
      draftChatIdRef.current = null;
      setDraftChatId(null);
    }
  }, [user]);

  useEffect(() => {
    if (!user && pathname === "/") {
      draftChatIdRef.current = null;
      setDraftChatId(null);
    }
  }, [user, pathname]);

  const uploadAttachment = useCallback(
    async (file: File) => {
      const chatId = await ensureDraftChat();
      const tempAttachmentId = `temp-${crypto.randomUUID()}`;
      const tempAttachment: UploadedAttachment = {
        id: tempAttachmentId,
        chatId,
        name: file.name,
        originalName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: file.size,
        checksum: "pending",
        kind: inferAttachmentKind({ name: file.name, mimeType: file.type }),
        status: "uploading",
        storageUrl: "",
        storagePath: "",
        uploadedAt: new Date().toISOString(),
      };

      setAttachments((current) => [...current, tempAttachment]);

      try {
        const formData = new FormData();
        formData.append("chatId", chatId);
        formData.append("file", file);

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
          credentials: "include",
        });

        const payload = (await response.json().catch(() => null)) as
          | { attachments?: UploadedAttachment[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? `Failed to upload ${file.name}`);
        }

        const uploadedAttachment = payload?.attachments?.[0];
        if (!uploadedAttachment) {
          throw new Error(`Upload succeeded but no attachment metadata was returned for ${file.name}.`);
        }

        setAttachments((current) =>
          current.map((attachment) =>
            attachment.id === tempAttachmentId ? uploadedAttachment : attachment,
          ),
        );

        if (uploadedAttachment.status === "failed") {
          showFeedback({
            type: "error",
            title: "Processing failed",
            description:
              uploadedAttachment.summary?.trim() ||
              `${uploadedAttachment.name || file.name} was uploaded, but it could not be processed.`,
          });
        } else if (uploadedAttachment.status === "processing") {
          showFeedback({
            type: "info",
            title: "Upload queued",
            description: `${uploadedAttachment.name} is being processed.`,
          });
        } else {
          showFeedback({
            type: "success",
            title: "Upload completed",
            description: uploadedAttachment.name,
          });
        }
      } catch (uploadError) {
        const description =
          uploadError instanceof Error
            ? uploadError.message
            : `Failed to upload ${file.name}`;

        setAttachments((current) => current.filter((attachment) => attachment.id !== tempAttachmentId));

        showFeedback({
          type: "error",
          title: "Upload failed",
          description,
        });
      }
    },
    [ensureDraftChat, showFeedback],
  );

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);

      if (fileArray.length === 0) {
        return;
      }

      setIsUploading(true);

      try {
        for (const file of fileArray) {
          await uploadAttachment(file);
        }
      } finally {
        setIsUploading(false);
      }
    },
    [uploadAttachment],
  );

  const removeAttachment = useCallback((attachmentId: string) => {
    setAttachments((current) =>
      current.filter((attachment) => attachment.id !== attachmentId),
    );
  }, []);

  const handleSend = async () => {
    const message = input.trim();

    if (!message) {
      showFeedback({
        type: "error",
        title: "Type a message first",
      });
      return;
    }

    if (isUploading) {
      showFeedback({
        type: "error",
        title: "Wait for uploads to finish",
        description: "All attachments must finish uploading before you send.",
      });
      return;
    }

    if (attachments.some((attachment) => attachment.status === "failed")) {
      showFeedback({
        type: "error",
        title: "Remove failed attachments",
        description: "One or more files failed extraction. Remove them or re-upload before sending.",
      });
      return;
    }

    if (attachments.some((attachment) => attachment.status === "processing")) {
      showFeedback({
        type: "error",
        title: "Wait for uploads to finish",
        description: "Attachment processing is still running. Please wait a moment.",
      });
      return;
    }

    try {
      setError("");
      setIsCreatingChat(true);
      const chatId = draftChatIdRef.current ?? draftChatId ?? (await ensureDraftChat());
      clearComposerAttachments();

      try {
        localStorage.setItem(
          `forge:chat:${chatId}:selected-options`,
          JSON.stringify(selectedOptionIds),
        );
      } catch (storageError) {
        console.warn(
          "Failed to persist selected options for chat:",
          storageError,
        );
      }

      showFeedback({
        type: "success",
        title: "Chat created",
        description: "Opening your new conversation.",
      });

      setInput("");
      const attachmentQuery =
        attachments.length > 0
          ? `&attachmentIds=${encodeURIComponent(attachments.map((attachment) => attachment.id).join(","))}`
          : "";
      window.setTimeout(() => {
        router.push(
          `/c/${chatId}?initialMessage=${encodeURIComponent(message)}${attachmentQuery}`,
        );
      }, 0);
    } catch (caughtError) {
      const description =
        caughtError instanceof Error
          ? caughtError.message
          : "Failed to create chat";

      setError(description);
      showFeedback({
        type: "error",
        title: "Error",
        description,
      });
    } finally {
      setIsCreatingChat(false);
    }
  };

  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-background pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 60% 40%, rgba(16,163,127,0.08) 0%, transparent 70%)",
        }}
      />

      <div
        className="pointer-events-none absolute inset-0 opacity-[0.018]"
        style={{
          backgroundImage:
            "linear-gradient(color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 1px), linear-gradient(90deg, color-mix(in oklab, var(--foreground) 18%, transparent) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-5 px-6">
        <div className="mb-1 flex flex-col items-center gap-2">
          <div
            className="flex h-12 w-12 items-center justify-center rounded-2xl"
            style={{
              background:
                "linear-gradient(135deg, color-mix(in oklab, var(--primary) 28%, transparent) 0%, color-mix(in oklab, var(--primary) 10%, transparent) 100%)",
              boxShadow:
                "0 0 0 1px color-mix(in oklab, var(--primary) 32%, transparent), 0 8px 32px color-mix(in oklab, var(--primary) 16%, transparent)",
            }}
          >
            <ForgeLogo className="h-6 w-6 text-primary" />
          </div>
        </div>

        <div
          className="flex w-full max-w-104 flex-col gap-6"
          style={{
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--card) 96%, transparent) 0%, color-mix(in oklab, var(--card) 90%, transparent) 100%)",
            border:
              "1px solid color-mix(in oklab, var(--border) 80%, transparent)",
            borderRadius: "20px",
            boxShadow:
              "0 1px 0 color-mix(in oklab, var(--card-foreground) 6%, transparent) inset, 0 20px 48px color-mix(in oklab, var(--foreground) 10%, transparent), 0 0 0 1px color-mix(in oklab, var(--foreground) 12%, transparent)",
            padding: "28px",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="flex flex-col items-center gap-2 text-center">
            <h1
              className="text-[26px] font-semibold leading-tight text-foreground"
              style={{
                letterSpacing: "-0.04em",
                fontFamily: "var(--font-manrope), sans-serif",
              }}
            >
              {greetingText.toUpperCase() + ", " + displayName}
            </h1>

            <p
              className="max-w-68 text-[13px] leading-[1.7]"
              style={{ color: "var(--muted-foreground)" }}
            >
              Think, create, research, and organize — all in one workspace.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {FEATURE_CARDS.map(({ id, icon: Icon, title, description }) => (
              <button
                key={id}
                className="group flex flex-col items-center gap-2.5 text-left transition-all duration-200"
                style={{
                  background:
                    "color-mix(in oklab, var(--card) 94%, var(--primary) 6%)",
                  border:
                    "1px solid color-mix(in oklab, var(--border) 78%, transparent)",
                  borderRadius: "14px",
                  padding: "12px 10px",
                }}
                onMouseEnter={(event) => {
                  (event.currentTarget as HTMLElement).style.background =
                    "color-mix(in oklab, var(--primary) 9%, var(--card))";
                  (event.currentTarget as HTMLElement).style.borderColor =
                    "color-mix(in oklab, var(--primary) 38%, transparent)";
                }}
                onMouseLeave={(event) => {
                  (event.currentTarget as HTMLElement).style.background =
                    "color-mix(in oklab, var(--card) 94%, var(--primary) 6%)";
                  (event.currentTarget as HTMLElement).style.borderColor =
                    "color-mix(in oklab, var(--border) 78%, transparent)";
                }}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-xl"
                  style={{
                    background:
                      "color-mix(in oklab, var(--primary) 16%, transparent)",
                    border:
                      "1px solid color-mix(in oklab, var(--primary) 28%, transparent)",
                  }}
                >
                  <Icon size={14} className="text-primary" />
                </span>

                <span
                  className="text-center text-[11.5px] font-semibold leading-snug text-foreground"
                  style={{ letterSpacing: "-0.01em" }}
                >
                  {title}
                </span>

                <span
                  className="text-center text-[10.5px] leading-snug"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {description}
                </span>
              </button>
            ))}
          </div>
        </div>

        <p className="text-[11px]" style={{ color: "var(--muted-foreground)" }}>
          Forge can make mistakes. Verify important information.
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-[calc(1.5rem+env(safe-area-inset-bottom))] z-50 pointer-events-none">
        <div className="mx-auto w-full max-w-4xl px-6 pointer-events-auto">
          <div
            className={`relative rounded-[28px] border bg-card/90 px-4 py-3 shadow-lg backdrop-blur transition ${isDraggingFiles ? "border-primary ring-2 ring-primary/30" : "border-border"}`}
            onDragOver={(event) => {
              event.preventDefault();
              if (event.dataTransfer.types.includes("Files")) {
                setIsDraggingFiles(true);
              }
            }}
            onDragLeave={(event) => {
              const relatedTarget = event.relatedTarget ?? event.nativeEvent.relatedTarget;

              if (relatedTarget && event.currentTarget.contains(relatedTarget as Node)) {
                return;
              }

              setIsDraggingFiles(false);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingFiles(false);
              void uploadFiles(event.dataTransfer.files);
            }}
            onPaste={(event) => {
              const pastedFiles = Array.from(event.clipboardData.files);
              if (pastedFiles.length > 0) {
                void uploadFiles(pastedFiles);
              }
            }}
          >
            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
              <div className="relative col-start-1 row-start-1 self-center">
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
                  chatId={homeScopeId}
                  triggerRef={modesMenuTriggerRef}
                  uploadInputId={uploadInputId}
                  className="absolute bottom-full left-0 mb-3 z-50 w-[20rem] max-w-[min(20rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
                />
              </div>

              <input
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void handleSend();
                  }
                }}
                placeholder="Ask anything"
                disabled={isCreatingChat}
                className="col-start-2 row-start-1 w-full bg-transparent py-1 text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />

              <div className="col-start-3 row-start-1 flex items-center gap-2 self-center">
                <button className="rounded-full p-2 text-muted-foreground transition hover:text-foreground">
                  <Mic size={18} />
                </button>

                <input
                  id={uploadInputId}
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={(event) => {
                    void uploadFiles(event.target.files ?? []);
                    event.target.value = "";
                    setIsModesMenuOpen(false);
                  }}
                />

                {isCreatingChat ? (
                  <button
                    className="rounded-full bg-muted/50 p-2 text-muted-foreground cursor-not-allowed"
                    disabled
                  >
                    <span
                      className="block h-3 w-3 animate-spin rounded-full border-2 border-t-transparent"
                      style={{ borderColor: "currentColor" }}
                    />
                  </button>
                ) : (
                  <button
                    onClick={() => void handleSend()}
                    disabled={!input.trim() || isCreatingChat || isUploading}
                    className="rounded-full bg-primary p-2 text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <ArrowUp size={16} />
                  </button>
                )}
              </div>

              {selectedOptions.length > 0 ? (
                <div className="col-start-2 row-start-2 flex flex-wrap gap-2">
                  {selectedOptions.map((option) => (
                    <ActiveToolChip
                      key={option.id}
                      option={option}
                      onRemove={() => removeOption(option.id)}
                    />
                  ))}
                </div>
              ) : null}

              {attachments.length > 0 ? (
                <div className="col-start-2 row-start-3 flex flex-wrap gap-2">
                  {attachments.map((attachment) => (
                    <AttachmentChip
                      key={attachment.id}
                      attachment={attachment}
                      onRemove={() => removeAttachment(attachment.id)}
                      onPreview={
                        attachment.status === "ready"
                          ? () => setPreviewAttachment(attachment)
                          : undefined
                      }
                    />
                  ))}
                </div>
              ) : null}
            </div>

            <div className="mt-2 flex items-center justify-between px-3 text-[11px] text-muted-foreground">
              <p>
                {isDraggingFiles ? "Drop files to upload." : "Enter to send."}
              </p>
              {isUploading ? <p>Uploading files...</p> : null}
            </div>

            {error ? (
              <p className="mt-2 px-3 text-[11px] text-red-400">{error}</p>
            ) : null}
          </div>
        </div>
      </div>

      <AttachmentPreviewDialog
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}

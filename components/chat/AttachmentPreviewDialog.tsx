"use client";

import Image from "next/image";
import { useEffect, useId, useRef } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { formatAttachmentSize, getAttachmentLanguage, getAttachmentPreviewMode, type UploadedAttachment } from "@/lib/attachment-types";

type AttachmentPreviewDialogProps = {
  attachment: UploadedAttachment | null;
  onClose: () => void;
};

export function AttachmentPreviewDialog({ attachment, onClose }: AttachmentPreviewDialogProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!attachment) {
      return;
    }

    const previouslyFocusedElement = document.activeElement as HTMLElement | null;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab") {
        return;
      }

      const dialogElement = dialogRef.current;
      if (!dialogElement) {
        return;
      }

      const focusableElements = Array.from(
        dialogElement.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => !element.hasAttribute("disabled") && element.tabIndex !== -1);

      if (focusableElements.length === 0) {
        event.preventDefault();
        closeButtonRef.current?.focus();
        return;
      }

      const firstFocusableElement = focusableElements[0];
      const lastFocusableElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!activeElement || !dialogElement.contains(activeElement) || activeElement === firstFocusableElement) {
          event.preventDefault();
          lastFocusableElement.focus();
        }
      } else if (!activeElement || !dialogElement.contains(activeElement) || activeElement === lastFocusableElement) {
        event.preventDefault();
        firstFocusableElement.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    requestAnimationFrame(() => {
      closeButtonRef.current?.focus();
    });

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      previouslyFocusedElement?.focus();
    };
  }, [attachment, onClose]);

  if (!attachment) {
    return null;
  }

  const previewMode = getAttachmentPreviewMode(attachment);
  const language = attachment.language ?? getAttachmentLanguage(attachment.name);

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] text-white shadow-2xl shadow-black/40"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p id={titleId} className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-white/60">
              {formatAttachmentSize(attachment.sizeBytes)} · {attachment.mimeType}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`/api/attachments/${attachment.chatId}/${attachment.id}?download=1`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Download size={14} />
              Download
            </a>
            <a
              href={`/api/attachments/${attachment.chatId}/${attachment.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink size={14} />
              Open
            </a>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white"
              aria-label="Close preview"
              title="Close preview"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_42%)] p-4">
          {previewMode === "image" ? (
            <div className="flex min-h-full items-center justify-center">
              <div className="relative w-full overflow-hidden rounded-2xl border border-white/10 bg-black/30">
                  <Image
                  src={`/api/attachments/${attachment.chatId}/${attachment.id}`}
                  alt={attachment.name}
                  width={attachment.width ?? 1600}
                  height={attachment.height ?? 1200}
                  className="h-auto w-full object-contain"
                  sizes="(max-width: 768px) 100vw, 70vw"
                  priority
                />
              </div>
            </div>
          ) : null}

          {previewMode === "pdf" ? (
            <div className="flex h-[78vh] w-full flex-col gap-3">
              <iframe
                src={`/api/attachments/${attachment.chatId}/${attachment.id}`}
                title={attachment.name}
                className="min-h-0 flex-1 rounded-2xl border border-white/10 bg-white"
              />
            </div>
          ) : null}

          {previewMode === "code" ? (
            <div className="rounded-2xl border border-white/10 bg-[#111827] p-2">
              <CodeBlock
                code={attachment.extractedText ?? "No preview text available."}
                language={language}
              />
            </div>
          ) : null}

          {previewMode === "text" ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <MarkdownMessage content={attachment.extractedText ?? attachment.summary ?? "No preview text available."} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

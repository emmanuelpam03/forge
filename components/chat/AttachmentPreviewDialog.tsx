"use client";

import Image from "next/image";
import { useEffect } from "react";
import { Download, ExternalLink, X } from "lucide-react";
import CodeBlock from "@/components/CodeBlock";
import { MarkdownMessage } from "@/components/MarkdownMessage";
import { formatAttachmentSize, getAttachmentLanguage, getAttachmentPreviewMode, type UploadedAttachment } from "@/lib/attachment-types";

type AttachmentPreviewDialogProps = {
  attachment: UploadedAttachment | null;
  onClose: () => void;
};

export function AttachmentPreviewDialog({ attachment, onClose }: AttachmentPreviewDialogProps) {
  useEffect(() => {
    if (!attachment) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [attachment, onClose]);

  if (!attachment) {
    return null;
  }

  const previewMode = getAttachmentPreviewMode(attachment);
  const language = attachment.language ?? getAttachmentLanguage(attachment.name);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0d1117] text-white shadow-2xl shadow-black/40">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{attachment.name}</p>
            <p className="text-xs text-white/60">
              {formatAttachmentSize(attachment.sizeBytes)} · {attachment.mimeType}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={attachment.storageUrl}
              download={attachment.originalName}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <Download size={14} />
              Download
            </a>
            <a
              href={attachment.storageUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
            >
              <ExternalLink size={14} />
              Open
            </a>
            <button
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
                  src={attachment.storageUrl}
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
                src={attachment.storageUrl}
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

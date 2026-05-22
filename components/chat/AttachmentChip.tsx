"use client";

import { FileText, Image as ImageIcon, Loader2, Music4, Presentation, Table2, Video, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatAttachmentSize, getAttachmentKindLabel, type UploadedAttachment } from "@/lib/attachment-types";

type AttachmentChipProps = {
  attachment: UploadedAttachment;
  onRemove?: () => void;
  onPreview?: () => void;
  compact?: boolean;
};

export function AttachmentChip({ attachment, onRemove, onPreview, compact }: AttachmentChipProps) {
  const attachmentIcon = (
    <span className="shrink-0 text-muted-foreground">
      {attachment.kind === "image" ? <ImageIcon size={14} /> : null}
      {attachment.kind === "pdf" || attachment.kind === "document" || attachment.kind === "text" || attachment.kind === "json" ? <FileText size={14} /> : null}
      {attachment.kind === "spreadsheet" ? <Table2 size={14} /> : null}
      {attachment.kind === "audio" ? <Music4 size={14} /> : null}
      {attachment.kind === "video" ? <Video size={14} /> : null}
      {attachment.kind !== "image" && attachment.kind !== "pdf" && attachment.kind !== "document" && attachment.kind !== "text" && attachment.kind !== "json" && attachment.kind !== "spreadsheet" && attachment.kind !== "audio" && attachment.kind !== "video" ? <Presentation size={14} /> : null}
    </span>
  );
  const canPreview = Boolean(onPreview) && attachment.status === "ready";

  return (
    <div className="inline-flex max-w-full items-center gap-1">
      <button
        type="button"
        onClick={canPreview ? onPreview : undefined}
        className={cn(
          "group inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-left text-[12px] font-medium text-foreground transition-all duration-200 hover:bg-accent/60 hover:border-accent/40",
          compact ? "min-h-9" : "min-h-10",
          canPreview && "cursor-pointer",
        )}
        title={canPreview ? `Preview ${attachment.name}` : attachment.name}
      >
        {attachment.status === "uploading" || attachment.status === "processing" ? (
          <Loader2 size={14} className="shrink-0 animate-spin text-muted-foreground" />
        ) : (
          attachmentIcon
        )}

        <span className="max-w-48 truncate whitespace-nowrap">{attachment.name}</span>

        <span className="rounded-full bg-background/70 px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
          {getAttachmentKindLabel(attachment.kind)}
        </span>

        <span className="text-[10px] text-muted-foreground/80">
          {formatAttachmentSize(attachment.sizeBytes)}
        </span>

        {attachment.status !== "ready" ? (
          <span className="text-[10px] text-muted-foreground/80 capitalize">
            {attachment.status}
          </span>
        ) : null}
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="inline-flex shrink-0 rounded-full p-1 text-muted-foreground opacity-70 transition hover:bg-background/80 hover:text-foreground"
          aria-label={`Remove ${attachment.name}`}
          title={`Remove ${attachment.name}`}
        >
          <X size={13} />
        </button>
      ) : null}
    </div>
  );
}

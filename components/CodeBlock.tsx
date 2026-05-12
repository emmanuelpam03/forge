"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { atomOneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import copy from "copy-to-clipboard";
import { Check, Copy } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";

type Props = {
  code: string;
  language?: string | undefined;
};

export default function CodeBlock({ code, language }: Props) {
  const { theme } = useTheme();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  function handleCopy() {
    try {
      copy(code);
      setCopied(true);
    } catch {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code).then(() => setCopied(true));
      }
    }
  }

  const lang = language || "text";
  const isDark = theme === "dark";
  const syntaxStyle = isDark ? dracula : atomOneLight;

  return (
    <div
      className={cn(
        "group relative mb-4 overflow-hidden rounded-lg border transition-all duration-200",
        "shadow-sm hover:shadow-md",
        "border-border bg-card",
      )}
    >
      {/* Header: Language Label + Copy Button */}
      <div
        className={cn(
          "flex items-center justify-between border-b px-4 py-3",
          "border-border",
          isDark ? "bg-card/50" : "bg-card/75",
        )}
      >
        <span
          className={cn(
            "text-xs font-semibold uppercase tracking-wider",
            "text-muted-foreground",
          )}
        >
          {lang}
        </span>

        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied to clipboard" : "Copy code to clipboard"}
          title={copied ? "Copied!" : "Copy code"}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium",
            "transition-all duration-200",
            "border border-border",
            "opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            !isDark && [
              "bg-muted/40 text-foreground",
              "hover:bg-muted/60 hover:border-primary/50",
              "active:bg-muted/80",
            ],
            isDark && [
              "bg-muted/30 text-muted-foreground",
              "hover:bg-muted/50 hover:border-primary/60 hover:text-foreground",
              "active:bg-muted/70",
            ],
            copied &&
              "opacity-100 bg-primary/20 text-primary border-primary/50",
          )}
        >
          {copied ? (
            <>
              <Check size={14} className="flex-shrink-0" />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={14} className="flex-shrink-0" />
              <span className="hidden sm:inline">Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code Container */}
      <div
        className={cn(
          "overflow-x-auto",
          "[&_pre]:my-0 [&_code]:text-sm",
          "[&::-webkit-scrollbar]:h-2",
          "[&::-webkit-scrollbar-track]:bg-transparent",
          "[&::-webkit-scrollbar-thumb]:rounded-full",
          isDark
            ? "[&::-webkit-scrollbar-thumb]:bg-muted/40 [&::-webkit-scrollbar-thumb]:hover:bg-muted/60"
            : "[&::-webkit-scrollbar-thumb]:bg-muted/30 [&::-webkit-scrollbar-thumb]:hover:bg-muted/50",
        )}
      >
        <SyntaxHighlighter
          language={lang}
          style={syntaxStyle}
          customStyle={{
            background: "transparent",
            margin: 0,
            padding: "1rem",
            fontSize: 13,
            lineHeight: "1.6",
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace",
          }}
          codeTagProps={{
            className: cn(
              "font-mono",
              isDark ? "text-[#d4d4d4]" : "text-slate-900",
            ),
          }}
          wrapLongLines={false}
        >
          {code}
        </SyntaxHighlighter>
      </div>
    </div>
  );
}

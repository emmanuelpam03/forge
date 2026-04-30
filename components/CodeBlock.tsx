"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import copy from "copy-to-clipboard";
import { Check, Copy } from "lucide-react";

type Props = {
  code: string;
  language?: string | undefined;
};

export default function CodeBlock({ code, language }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(id);
  }, [copied]);

  function handleCopy() {
    try {
      copy(code);
      setCopied(true);
    } catch {
      // best-effort: fallback to navigator clipboard
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(code).then(() => setCopied(true));
      }
    }
  }

  const lang = language || "text";

  return (
    <div className="group relative mb-4 overflow-hidden rounded-xl border border-border bg-[#1e1e1e] text-slate-50 shadow-sm">
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
        <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
          {lang.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

      <SyntaxHighlighter
        language={lang}
        style={atomDark}
        customStyle={{
          background: "transparent",
          margin: 0,
          padding: "1rem",
          fontSize: 13,
          lineHeight: "1.6",
          fontFamily:
            "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Courier New', monospace",
        }}
        codeTagProps={{ className: "font-mono text-sm leading-7" }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

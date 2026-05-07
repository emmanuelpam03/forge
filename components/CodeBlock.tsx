"use client";

import { useEffect, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { atomDark, atomOneLight } from "react-syntax-highlighter/dist/cjs/styles/prism";
import copy from "copy-to-clipboard";
import { Check, Copy } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

type Props = {
  code: string;
  language?: string | undefined;
};

export default function CodeBlock({ code, language }: Props) {
  const { theme } = useTheme();
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
  const isDark = theme === "dark";
  const syntaxStyle = isDark ? atomDark : atomOneLight;

  return (
    <div
      className={`group relative mb-4 overflow-hidden rounded-xl border shadow-sm ${
        isDark
          ? "border-border bg-[#1e1e1e] text-slate-50"
          : "border-slate-200 bg-slate-50 text-slate-900"
      }`}
    >
      <div
        className={`flex items-center justify-between border-b px-3 py-2 ${
          isDark
            ? "border-white/10"
            : "border-slate-200"
        }`}
      >
        <span
          className={`text-[11px] font-medium uppercase tracking-[0.18em] ${
            isDark ? "text-slate-400" : "text-slate-600"
          }`}
        >
          {lang.toUpperCase()}
        </span>
        <button
          onClick={handleCopy}
          aria-label={copied ? "Copied" : "Copy code"}
          title={copied ? "Copied" : "Copy code"}
          className={`opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-[11px] font-medium focus:outline-none ${
            isDark
              ? "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white focus:ring-2 focus:ring-white/20"
              : "border-slate-300 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-2 focus:ring-slate-300"
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          <span className="ml-1">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>

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
        codeTagProps={{ className: "font-mono text-sm leading-7" }}
        wrapLongLines={false}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}


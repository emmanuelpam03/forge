"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy } from "lucide-react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageRendererProps = {
  content: string;
  isStreaming?: boolean;
};

function useCopyState() {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!copiedCode) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopiedCode(null);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [copiedCode]);

  return { copiedCode, setCopiedCode };
}

export function MessageRenderer({
  content,
  isStreaming,
}: MessageRendererProps) {
  const { copiedCode, setCopiedCode } = useCopyState();

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h1 className="mb-4 mt-7 text-3xl font-semibold tracking-[-0.04em] text-foreground first:mt-0">
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2 className="mb-3 mt-6 text-2xl font-semibold tracking-[-0.03em] text-foreground first:mt-0">
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3 className="mb-2.5 mt-5 text-xl font-semibold tracking-[-0.02em] text-foreground first:mt-0">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="mb-2 mt-4 text-lg font-semibold tracking-[-0.01em] text-foreground first:mt-0">
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5 className="mb-2 mt-4 text-base font-semibold text-foreground first:mt-0">
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6 className="mb-2 mt-4 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground first:mt-0">
          {children}
        </h6>
      ),
      p: ({ children }) => (
        <p className="mb-4 leading-7 text-foreground/90 last:mb-0">
          {children}
        </p>
      ),
      ul: ({ children }) => (
        <ul className="mb-4 ml-6 list-disc space-y-2 text-foreground/90 [&_ul]:mt-2 [&_ul]:mb-0 [&_ul]:ml-5">
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol className="mb-4 ml-6 list-decimal space-y-2 text-foreground/90 [&_ol]:mt-2 [&_ol]:mb-0 [&_ol]:ml-5">
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="pl-1 leading-7">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote className="mb-4 border-l-4 border-border bg-muted/30 px-4 py-3 text-foreground/80 italic">
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div className="mb-4 overflow-x-auto rounded-xl border border-border bg-card/40">
          <table className="w-full border-collapse text-left text-sm text-foreground/90">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead className="bg-muted/60">{children}</thead>
      ),
      tbody: ({ children }) => (
        <tbody className="divide-y divide-border">{children}</tbody>
      ),
      tr: ({ children }) => (
        <tr className="transition-colors hover:bg-muted/40">{children}</tr>
      ),
      th: ({ children }) => (
        <th className="border-b border-border px-4 py-3 font-semibold text-foreground">
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td className="border-b border-border/70 px-4 py-3 align-top text-foreground/85 last:border-b-0">
          {children}
        </td>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-sky-400 underline decoration-sky-400/40 underline-offset-4 transition hover:text-sky-300 hover:decoration-sky-300"
        >
          {children}
        </a>
      ),
      code: ({ className, children, ...props }) => {
        const languageMatch = /language-(\w+)/.exec(className ?? "");
        const language = languageMatch?.[1];
        const codeText = String(children).replace(/\n$/, "");
        const isBlockCode = Boolean(languageMatch);
        const isCopied = copiedCode === codeText;

        if (!isBlockCode) {
          return (
            <code
              {...props}
              className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
            >
              {children}
            </code>
          );
        }

        return (
          <div className="relative mb-4 overflow-hidden rounded-xl border border-border bg-slate-950 text-slate-50 shadow-sm">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-slate-400">
                {language ?? "code"}
              </span>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(codeText);
                  setCopiedCode(codeText);
                }}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                title={isCopied ? "Copied" : "Copy code"}
              >
                {isCopied ? <Check size={12} /> : <Copy size={12} />}
                {isCopied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="overflow-x-auto px-4 py-4 text-sm leading-7">
              <code {...props} className={className}>
                {children}
              </code>
            </pre>
          </div>
        );
      },
      hr: () => <hr className="my-5 border-border" />,
      em: ({ children }) => (
        <em className="italic text-foreground/90">{children}</em>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
      ),
    }),
    [copiedCode, setCopiedCode],
  );

  return (
    <div className="prose prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-hr:my-0 prose-pre:my-0 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {isStreaming ? (
        <span className="ml-0.5 inline-block animate-pulse text-primary">
          ▍
        </span>
      ) : null}
    </div>
  );
}

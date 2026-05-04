"use client";

import React, { useMemo } from "react";
import CodeBlock from "./CodeBlock";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageRendererProps = {
  content: string;
  isStreaming?: boolean;
};

export function MessageRenderer({ content, isStreaming }: MessageRendererProps) {
  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h1
          className="mb-4 mt-7 first:mt-0"
          style={{
            fontSize: "1.6rem",
            fontWeight: 600,
            letterSpacing: "-0.04em",
            color: "rgba(255,255,255,0.92)",
            fontFamily: "var(--font-manrope), sans-serif",
          }}
        >
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2
          className="mb-3 mt-6 first:mt-0"
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "rgba(255,255,255,0.9)",
            fontFamily: "var(--font-manrope), sans-serif",
          }}
        >
          {children}
        </h2>
      ),
      h3: ({ children }) => (
        <h3
          className="mb-2.5 mt-5 first:mt-0"
          style={{
            fontSize: "1.05rem",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: "rgba(255,255,255,0.88)",
            fontFamily: "var(--font-manrope), sans-serif",
          }}
        >
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4
          className="mb-2 mt-4 first:mt-0"
          style={{
            fontSize: "0.95rem",
            fontWeight: 600,
            letterSpacing: "-0.01em",
            color: "rgba(255,255,255,0.86)",
          }}
        >
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5
          className="mb-2 mt-4 text-base font-semibold first:mt-0"
          style={{ color: "rgba(255,255,255,0.84)" }}
        >
          {children}
        </h5>
      ),
      h6: ({ children }) => (
        <h6
          className="mb-2 mt-4 text-sm font-semibold first:mt-0"
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {children}
        </h6>
      ),
      p: ({ children }) => (
        <div
          className="mb-4 last:mb-0"
          style={{
            lineHeight: "1.75",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {children}
        </div>
      ),
      ul: ({ children }) => (
        <ul
          className="mb-4 ml-6 space-y-2"
          style={{
            listStyleType: "disc",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol
          className="mb-4 ml-6 space-y-2"
          style={{
            listStyleType: "decimal",
            color: "rgba(255,255,255,0.78)",
          }}
        >
          {children}
        </ol>
      ),
      li: ({ children }) => (
        <li className="pl-1" style={{ lineHeight: "1.75" }}>
          {children}
        </li>
      ),
      blockquote: ({ children }) => (
        <blockquote
          className="mb-4 px-4 py-3 italic"
          style={{
            borderLeft: "3px solid rgba(251,191,36,0.4)",
            background: "rgba(251,191,36,0.04)",
            borderRadius: "0 10px 10px 0",
            color: "rgba(255,255,255,0.6)",
          }}
        >
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div
          className="mb-4 overflow-x-auto"
          style={{
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "12px",
          }}
        >
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ color: "rgba(255,255,255,0.8)" }}
          >
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead style={{ background: "rgba(255,255,255,0.04)" }}>{children}</thead>
      ),
      tbody: ({ children }) => (
        <tbody style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          {children}
        </tbody>
      ),
      tr: ({ children }) => (
        <tr
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "rgba(255,255,255,0.025)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = "transparent";
          }}
        >
          {children}
        </tr>
      ),
      th: ({ children }) => (
        <th
          className="px-4 py-3 text-[12px] font-semibold"
          style={{
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.45)",
          }}
        >
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td
          className="px-4 py-3 align-top"
          style={{ color: "rgba(255,255,255,0.72)" }}
        >
          {children}
        </td>
      ),
      a: ({ href, children }) => (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="font-medium underline underline-offset-4 transition-colors"
          style={{
            color: "rgba(251,191,36,0.85)",
            textDecorationColor: "rgba(251,191,36,0.3)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "rgba(251,191,36,1)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "rgba(251,191,36,0.85)";
          }}
        >
          {children}
        </a>
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      code: (props: any) => {
        const { className, children, inline, ...restProps } = props;
        const languageMatch = /language-(\w+)/.exec(className ?? "");
        const language = languageMatch?.[1];
        const codeText = String(children).replace(/\n$/, "");
        const isBlockCode = !(inline as boolean);

        if (!isBlockCode) {
          return (
            <code
              {...restProps}
              className="rounded-md px-1.5 py-0.5 font-mono text-[0.875em]"
              style={{
                background: "rgba(251,191,36,0.08)",
                border: "1px solid rgba(251,191,36,0.15)",
                color: "rgba(251,191,36,0.9)",
              }}
            >
              {children}
            </code>
          );
        }

        return <CodeBlock language={language} code={codeText} />;
      },
      hr: () => (
        <hr
          className="my-5"
          style={{ borderColor: "rgba(255,255,255,0.07)" }}
        />
      ),
      em: ({ children }) => (
        <em className="italic" style={{ color: "rgba(255,255,255,0.75)" }}>
          {children}
        </em>
      ),
      strong: ({ children }) => (
        <strong
          className="font-semibold"
          style={{ color: "rgba(255,255,255,0.95)" }}
        >
          {children}
        </strong>
      ),
    }),
    [],
  );

  return (
    <div className="prose prose-invert max-w-none prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-hr:my-0 prose-pre:my-0 prose-code:before:content-none prose-code:after:content-none">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      {isStreaming ? (
        <span
          className="ml-0.5 inline-block animate-pulse"
          style={{ color: "rgba(251,191,36,0.8)" }}
        >
          ▍
        </span>
      ) : null}
    </div>
  );
}
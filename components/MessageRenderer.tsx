"use client";

import React, { useMemo } from "react";
import CodeBlock from "./CodeBlock";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

type MessageRendererProps = {
  content: string;
  isStreaming?: boolean;
};

// Copy state helper removed — currently unused. Reintroduce when enabling copy UI.

export function MessageRenderer({
  content,
  isStreaming,
}: MessageRendererProps) {
  // copy helper not used currently

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
      p: ({ children }) => {
        const childArray = React.Children.toArray(children);
        const hasBlockChild = childArray.some(
          (child) =>
            React.isValidElement(child) &&
            (child.type === "pre" ||
              child.type === "div" ||
              child.type === CodeBlock),
        );

        const Wrapper: React.ElementType = hasBlockChild ? "div" : "p";

        return (
          <Wrapper className="mb-4 leading-7 text-foreground/90 last:mb-0">
            {children}
          </Wrapper>
        );
      },
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
              className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
            >
              {children}
            </code>
          );
        }

        return <CodeBlock language={language} code={codeText} />;
      },
      hr: () => <hr className="my-5 border-border" />,
      em: ({ children }) => (
        <em className="italic text-foreground/90">{children}</em>
      ),
      strong: ({ children }) => (
        <strong className="font-semibold text-foreground">{children}</strong>
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
        <span className="ml-0.5 inline-block animate-pulse text-primary">
          ▍
        </span>
      ) : null}
    </div>
  );
}

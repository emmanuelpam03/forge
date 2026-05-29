"use client";

import { Children, isValidElement, useMemo, useState, useEffect } from "react";
import type { ComponentPropsWithoutRef } from "react";
import CodeBlock from "./CodeBlock";
import ReactMarkdown, { type Components } from "react-markdown";
import Image from "next/image";
import remarkGfm from "remark-gfm";
import { splitStreamingMarkdown } from "./markdown-stream";

type MessageRendererProps = {
  content: string;
  isStreaming?: boolean;
  images?: { id: string; url: string; thumbnailUrl?: string; title?: string }[] | null;
};

function containsBlockLevelChild(children: React.ReactNode) {
  return Children.toArray(children).some((child) => {
    if (!isValidElement(child) || typeof child.type !== "string") {
      return false;
    }

    return [
      "div",
      "pre",
      "blockquote",
      "table",
      "ul",
      "ol",
      "li",
      "p",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
    ].includes(child.type);
  });
}

export function MessageRenderer({
  content,
  isStreaming,
  images,
}: MessageRendererProps) {
  // Initialize to the raw content so server and initial client render match.
  const [cleanedContent, setCleanedContent] = useState<string>(content || "");
  const [extractedHtmlImages, setExtractedHtmlImages] = useState<MessageRendererProps['images']>([]);

  useEffect(() => {
    if (!content) {
      setCleanedContent("");
      setExtractedHtmlImages([]);
      return;
    }

    try {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = content;
      const imgs = Array.from(wrapper.querySelectorAll("img"));
      const extracted = imgs
        .map((img) => {
          const src = img.getAttribute("src") ?? "";
          const alt = img.getAttribute("alt") ?? "";
          const title = img.getAttribute("title") ?? "";
          if (/^https?:\/\//i.test(src)) {
            return { id: src, url: src, thumbnailUrl: src, title: title || alt } as MessageRendererProps['images'][0];
          }
          return null;
        })
        .filter(Boolean) as MessageRendererProps['images'];

      imgs.forEach((img) => img.remove());
      const cleaned = wrapper.innerHTML;

      // Update state only after mount to avoid hydration mismatches.
      if (cleaned !== cleanedContent || extracted.length > 0) {
        setCleanedContent(cleaned);
        setExtractedHtmlImages(extracted);
      }
    } catch {
      // If parsing fails, keep the original content and no extracted images.
      setCleanedContent(content);
      setExtractedHtmlImages([]);
    }
  }, [content]);

  const { markdown, trailingText } = useMemo(
    () => splitStreamingMarkdown(cleanedContent || "", isStreaming),
    [cleanedContent, isStreaming],
  );

  const combinedImages = useMemo(() => {
    const fromProps = images ?? [];
    return [...fromProps, ...(extractedHtmlImages ?? [])];
  }, [images, extractedHtmlImages]);

  const components = useMemo<Components>(
    () => ({
      h1: ({ children }) => (
        <h1
          className="mb-6 mt-8 first:mt-0"
          style={{
            fontSize: "1.8rem",
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: "var(--message-heading)",
            fontFamily: "var(--font-manrope), sans-serif",
          }}
        >
          {children}
        </h1>
      ),
      h2: ({ children }) => (
        <h2
          className="mb-4 mt-6 first:mt-0"
          style={{
            fontSize: "1.3rem",
            fontWeight: 600,
            letterSpacing: "-0.03em",
            color: "var(--message-heading)",
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
            color: "var(--message-heading)",
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
            color: "var(--message-heading)",
          }}
        >
          {children}
        </h4>
      ),
      h5: ({ children }) => (
        <h5
          className="mb-2 mt-4 text-base font-semibold first:mt-0"
          style={{ color: "var(--message-heading)" }}
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
            color: "var(--muted-foreground)",
          }}
        >
          {children}
        </h6>
      ),
      p: ({ children }) => (
        containsBlockLevelChild(children) ? (
          <div
            className="mb-4 last:mb-0"
            style={{
              lineHeight: "1.85",
              color: "var(--message-text)",
              fontSize: "1rem",
            }}
          >
            {children}
          </div>
        ) : (
          <p
            className="mb-4 last:mb-0"
            style={{
              lineHeight: "1.85",
              color: "var(--message-text)",
              fontSize: "1rem",
            }}
          >
            {children}
          </p>
        )
      ),
      ul: ({ children }) => (
        <ul
          className="mb-4 ml-6 space-y-2"
          style={{
            listStyleType: "disc",
            color: "var(--message-text)",
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
            color: "var(--message-text)",
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
          className="mb-6 px-5 py-4 italic"
          style={{
            borderLeft: "4px solid var(--message-blockquote-border)",
            background: "var(--message-blockquote-bg)",
            borderRadius: "0 12px 12px 0",
            color: "var(--message-text)",
          }}
        >
          {children}
        </blockquote>
      ),
      table: ({ children }) => (
        <div
          className="mb-4 overflow-x-auto"
          style={{
            border: "1px solid var(--message-table-border)",
            borderRadius: "12px",
          }}
        >
          <table
            className="w-full border-collapse text-left text-sm"
            style={{ color: "var(--message-text)" }}
          >
            {children}
          </table>
        </div>
      ),
      thead: ({ children }) => (
        <thead style={{ background: "var(--message-table-hover)" }}>
          {children}
        </thead>
      ),
      tbody: ({ children }) => (
        <tbody style={{ borderTop: "1px solid var(--message-table-border)" }}>
          {children}
        </tbody>
      ),
      tr: ({ children }) => (
        <tr
          style={{
            borderBottom: "1px solid var(--message-table-border)",
            transition: "background 0.1s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background =
              "var(--message-table-hover)";
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
            color: "var(--muted-foreground)",
          }}
        >
          {children}
        </th>
      ),
      td: ({ children }) => (
        <td
          className="px-4 py-3 align-top"
          style={{ color: "var(--message-text)" }}
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
            color: "var(--message-link)",
            textDecorationColor: "var(--message-link)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--message-link-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--message-link)";
          }}
        >
          {children}
        </a>
      ),
      img: ({ src, alt, title }) => (
        src ? (
          <div className="relative w-full h-64 mb-4 overflow-hidden rounded-md">
            <Image
              src={String(src)}
              alt={String(alt ?? title ?? "image")}
              fill
              sizes="(max-width: 640px) 100vw, 33vw"
              className="object-cover"
              unoptimized
            />
          </div>
        ) : null
      ),
      code: ({ children, ...restProps }: ComponentPropsWithoutRef<"code">) => (
        <code
          {...restProps}
          className="rounded-md px-1.5 py-0.5 font-mono text-[0.875em]"
          style={{
            background: "var(--message-code-bg)",
            border: "1px solid var(--message-code-border)",
            color: "var(--message-code-text)",
          }}
        >
          {children}
        </code>
      ),
      pre: ({ children }) => {
        const child = Children.only(children) as React.ReactElement<{
          className?: string;
          children?: React.ReactNode;
        }>;

        const languageMatch = /language-(\w+)/.exec(child.props.className ?? "");
        const language = languageMatch?.[1];
        const codeText = String(child.props.children ?? "").replace(/\n$/, "");

        return <CodeBlock language={language} code={codeText} />;
      },
      hr: () => (
        <hr className="my-5" style={{ borderColor: "var(--border)" }} />
      ),
      em: ({ children }) => (
        <em className="italic" style={{ color: "var(--message-text)" }}>
          {children}
        </em>
      ),
      strong: ({ children }) => (
        <strong
          className="font-semibold"
          style={{ color: "var(--message-heading)" }}
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
        {markdown}
      </ReactMarkdown>

      {trailingText ? (
        <p
          className="mb-4 whitespace-pre-wrap last:mb-0"
          style={{
            lineHeight: "1.85",
            color: "var(--message-text)",
            fontSize: "1rem",
          }}
        >
          {trailingText}
        </p>
      ) : null}

      {combinedImages && combinedImages.length > 0 ? (
        <div className="my-4">
          {combinedImages.length >= 4 ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {combinedImages.map((im) => (
                <div
                  key={im.id}
                  className="relative h-40 overflow-hidden rounded-md bg-gray-100"
                >
                  {im.thumbnailUrl || im.url ? (
                    <Image
                      src={im.thumbnailUrl || im.url}
                      alt={im.title || "image"}
                      className="h-full w-full object-cover"
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex space-x-3 overflow-x-auto py-2">
              {combinedImages.map((im) => (
                <div
                  key={im.id}
                  className="relative h-36 w-56 flex-none overflow-hidden rounded-md bg-muted"
                >
                  {im.thumbnailUrl || im.url ? (
                    <Image
                      src={im.thumbnailUrl || im.url}
                      alt={im.title || "image"}
                      title={im.title}
                      className="h-full w-full object-cover"
                      fill
                      sizes="200px"
                      unoptimized
                    />
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {isStreaming ? (
        <span
          className="ml-0.5 inline-block animate-pulse"
          style={{ color: "var(--message-link)" }}
        >
          ▍
        </span>
      ) : null}
    </div>
  );
}

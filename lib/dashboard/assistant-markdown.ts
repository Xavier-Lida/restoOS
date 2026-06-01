import type { ReactNode } from "react";
import { createElement, Fragment } from "react";

type MarkdownSegment =
  | { type: "text"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string };

/**
 * Parse minimal markdown: **bold**, *italic*, newlines.
 * Italic is not applied inside bold segments.
 */
export function parseAssistantMarkdown(source: string): MarkdownSegment[] {
  const segments: MarkdownSegment[] = [];
  let i = 0;

  while (i < source.length) {
    if (source.startsWith("**", i)) {
      const end = source.indexOf("**", i + 2);
      if (end !== -1) {
        segments.push({ type: "bold", value: source.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }
    if (source[i] === "*" && source[i + 1] !== "*") {
      const end = source.indexOf("*", i + 1);
      if (end !== -1) {
        segments.push({ type: "italic", value: source.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }
    const nextBold = source.indexOf("**", i);
    const nextItalic = source.indexOf("*", i);
    let next = source.length;
    if (nextBold !== -1) next = Math.min(next, nextBold);
    if (nextItalic !== -1) next = Math.min(next, nextItalic);
    if (next > i) {
      segments.push({ type: "text", value: source.slice(i, next) });
    }
    i = next === i ? i + 1 : next;
  }

  return segments;
}

export function renderAssistantMarkdown(source: string): ReactNode {
  const segments = parseAssistantMarkdown(source);
  const nodes: ReactNode[] = [];
  let key = 0;

  for (const seg of segments) {
    if (seg.type === "text") {
      const parts = seg.value.split("\n");
      parts.forEach((part, idx) => {
        if (part) nodes.push(part);
        if (idx < parts.length - 1) nodes.push(createElement("br", { key: `br-${key++}` }));
      });
      continue;
    }
    if (seg.type === "bold") {
      nodes.push(createElement("strong", { key: `b-${key++}` }, seg.value));
      continue;
    }
    nodes.push(createElement("em", { key: `i-${key++}` }, seg.value));
  }

  return createElement(Fragment, null, ...nodes);
}

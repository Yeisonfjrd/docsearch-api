import { readFile } from "fs/promises";
import type { IDocumentParser, ParsedDocument, ParsedSection, SourceFormat } from "../types.js";

interface HeadingMatch {
  level: 1 | 2;
  title: string;
  index: number;
  lineEnd: number;
}

export function parseMarkdownSections(markdown: string): ParsedSection[] {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const headingRegex = /^(#{1,2})\s+(.+)$/gm;
  const headings: HeadingMatch[] = [];
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(normalized)) !== null) {
    headings.push({
      level: match[1].length as 1 | 2,
      title: match[2].trim(),
      index: match.index,
      lineEnd: headingRegex.lastIndex,
    });
  }

  if (headings.length === 0) {
    return normalized
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((content, index) => ({
        pageNumber: index + 1,
        title: null,
        content,
      }));
  }

  const sections: Array<Omit<ParsedSection, "pageNumber">> = [];
  const preface = normalized.slice(0, headings[0].index).trim();
  if (preface) {
    sections.push({ title: null, content: preface });
  }

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const nextHeading = headings.slice(i + 1).find((candidate) => candidate.level <= heading.level);
    const contentEnd = nextHeading?.index ?? normalized.length;
    const content = normalized.slice(heading.lineEnd, contentEnd).trim();

    sections.push({
      title: heading.title,
      content,
    });
  }

  return sections.map((section, index) => ({
    pageNumber: index + 1,
    title: section.title,
    content: section.content,
  }));
}

export function buildMarkdownDocument(markdown: string, sourceFormat: SourceFormat, metadata: Record<string, string> = {}): ParsedDocument {
  const normalized = markdown.replace(/\r\n/g, "\n");
  const sections = parseMarkdownSections(normalized);

  return {
    fullText: normalized,
    pageCount: sections.length,
    sections,
    sourceFormat,
    metadata,
  };
}

export class MarkdownParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "text/markdown";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const content = await readFile(filePath, "utf-8");
    return buildMarkdownDocument(content, "md");
  }
}

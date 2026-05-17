import { readFile } from "fs/promises";
import type { IDocumentParser, ParsedDocument, ParsedSection } from "../types.js";

export class TextParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "text/plain";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const rawContent = await readFile(filePath, "utf-8");
    const normalized = rawContent.replace(/\r\n/g, "\n");
    const content = normalized.endsWith("\n\n") ? normalized : `${normalized}\n\n`;
    const paragraphs = content
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean);
    const blocks = groupLogicalParagraphs(paragraphs);

    const sections: ParsedSection[] = blocks.map((block, index) => ({
      pageNumber: index + 1,
      title: null,
      content: block,
    }));

    return {
      fullText: normalized,
      pageCount: sections.length,
      sections,
      sourceFormat: "txt",
      metadata: {},
    };
  }
}

function groupLogicalParagraphs(paragraphs: string[]): string[] {
  const canPairAsHeadingAndBody =
    paragraphs.length > 0 &&
    paragraphs.length % 2 === 0 &&
    paragraphs.every((paragraph, index) => index % 2 === 1 || !paragraph.includes("\n"));

  if (!canPairAsHeadingAndBody) return paragraphs;

  const blocks: string[] = [];
  for (let i = 0; i < paragraphs.length; i += 2) {
    blocks.push(`${paragraphs[i]}\n\n${paragraphs[i + 1]}`);
  }
  return blocks;
}

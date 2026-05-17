import type { ParsedSection, SourceFormat } from "./types.js";

export interface ChunkInput {
  documentId: string;
  pageNumber: number;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  startOffset: number;
  endOffset: number;
  sourceFormat: SourceFormat;
}

const MAX_CHUNK_TOKENS = 400;
const OVERLAP_TOKENS = 40;

export function chunkSections(
  documentId: string,
  sections: ParsedSection[],
  sourceFormat: SourceFormat
): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let chunkIndex = 0;

  for (const section of sections) {
    const sectionContent = section.title ? `## ${section.title}\n\n${section.content}` : section.content;
    const words = sectionContent.split(/\s+/).filter(Boolean);

    if (words.length === 0) continue;

    if (words.length <= MAX_CHUNK_TOKENS) {
      chunks.push({
        documentId,
        pageNumber: section.pageNumber,
        chunkIndex: chunkIndex++,
        content: sectionContent,
        tokenCount: words.length,
        startOffset: 0,
        endOffset: sectionContent.length,
        sourceFormat,
      });
      continue;
    }

    for (let startWord = 0; startWord < words.length; startWord += MAX_CHUNK_TOKENS - OVERLAP_TOKENS) {
      const slice = words.slice(startWord, startWord + MAX_CHUNK_TOKENS);
      const content = slice.join(" ");
      const startOffset = findWordOffset(sectionContent, words, startWord);

      chunks.push({
        documentId,
        pageNumber: section.pageNumber,
        chunkIndex: chunkIndex++,
        content,
        tokenCount: slice.length,
        startOffset,
        endOffset: startOffset + content.length,
        sourceFormat,
      });

      if (startWord + MAX_CHUNK_TOKENS >= words.length) break;
    }
  }

  return chunks;
}

function findWordOffset(content: string, words: string[], wordIndex: number): number {
  let searchFrom = 0;

  for (let i = 0; i <= wordIndex; i++) {
    const foundAt = content.indexOf(words[i], searchFrom);
    if (foundAt === -1) return searchFrom;
    if (i === wordIndex) return foundAt;
    searchFrom = foundAt + words[i].length;
  }

  return 0;
}

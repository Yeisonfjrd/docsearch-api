import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";

export interface ParsedDocument {
  text: string;
  pageCount: number;
  pages: ParsedPage[];
}

export interface ParsedPage {
  pageNumber: number;
  content: string;
}

// ─── Parser ───────────────────────────────────────────────────────────────────

export async function parseDocument(
  filePath: string,
  mimeType: string
): Promise<ParsedDocument> {
  if (mimeType === "application/pdf") {
    return parsePdf(filePath);
  }

  if (mimeType === "text/plain") {
    return parsePlainText(filePath);
  }

  throw new Error(`Tipo MIME no soportado: ${mimeType}`);
}

async function parsePdf(filePath: string): Promise<ParsedDocument> {
  const buffer = await readFile(filePath);

  // Detectar PDF spoofed (magic bytes)
  if (!buffer.slice(0, 5).equals(Buffer.from("%PDF-"))) {
    throw new Error("El archivo no es un PDF válido (magic bytes incorrectos)");
  }

  const pages: ParsedPage[] = [];

  const data = await pdfParse(buffer, {
    pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => {
      return pageData.getTextContent().then((content) => {
        const text = content.items
          .map((item) => ("hasEOL" in item && item.hasEOL ? `${item.str}\n` : item.str))
          .join(" ")
          .trim();

        pages.push({
          pageNumber: pageData.pageIndex + 1,
          content: text,
        });

        return text;
      });
    },
  });

  return {
    text: data.text,
    pageCount: data.numpages,
    pages: pages.sort((a, b) => a.pageNumber - b.pageNumber),
  };
}

async function parsePlainText(filePath: string): Promise<ParsedDocument> {
  const content = await readFile(filePath, "utf-8");
  const lines = content.split("\n");
  const chunkSize = 100;

  const pages: ParsedPage[] = [];
  for (let i = 0; i < lines.length; i += chunkSize) {
    pages.push({
      pageNumber: Math.floor(i / chunkSize) + 1,
      content: lines.slice(i, i + chunkSize).join("\n"),
    });
  }

  return {
    text: content,
    pageCount: pages.length,
    pages,
  };
}

// ─── Chunker ──────────────────────────────────────────────────────────────────

export interface ChunkInput {
  documentId: string;
  pageNumber: number;
  content: string;
  chunkIndex: number;
  startOffset: number;
  endOffset: number;
  tokenCount: number;
}

export function chunkPages(
  documentId: string,
  pages: ParsedPage[],
  maxTokens = 400,
  overlap = 50
): ChunkInput[] {
  const chunks: ChunkInput[] = [];
  let globalOffset = 0;
  let chunkIndex = 0;

  for (const page of pages) {
    const words = page.content.split(/\s+/).filter(Boolean);
    let i = 0;

    while (i < words.length) {
      const slice = words.slice(i, i + maxTokens);
      const content = slice.join(" ");
      const tokenCount = slice.length; // approximation; replace with tiktoken if needed

      chunks.push({
        documentId,
        pageNumber: page.pageNumber,
        content,
        chunkIndex: chunkIndex++,
        startOffset: globalOffset,
        endOffset: globalOffset + content.length,
        tokenCount,
      });

      globalOffset += content.length + 1;
      i += maxTokens - overlap;
    }
  }

  return chunks;
}

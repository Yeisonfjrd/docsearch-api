import { getParser } from "./parser-factory.js";
import { chunkSections, type ChunkInput } from "./markdown-chunker.js";
import type { ParsedDocument } from "./types.js";

export async function parseDocument(
  filePath: string,
  mimeType: string
): Promise<ParsedDocument> {
  return getParser(mimeType).parse(filePath);
}

export function chunkDocument(
  documentId: string,
  parsed: ParsedDocument
): ChunkInput[] {
  return chunkSections(documentId, parsed.sections, parsed.sourceFormat);
}

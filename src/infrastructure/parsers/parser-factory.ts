import type { IDocumentParser } from "./types.js";
import { PdfParser } from "./parsers/pdf-parser.js";
import { TextParser } from "./parsers/text-parser.js";
import { MarkdownParser } from "./parsers/markdown-parser.js";
import { DocxParser } from "./parsers/docx-parser.js";
import { CsvParser } from "./parsers/csv-parser.js";
import { PptxParser } from "./parsers/pptx-parser.js";

const parsers: IDocumentParser[] = [
  new PdfParser(),
  new TextParser(),
  new MarkdownParser(),
  new DocxParser(),
  new CsvParser(),
  new PptxParser(),
];

export function getParser(mimeType: string): IDocumentParser {
  const parser = parsers.find((candidate) => candidate.canParse(mimeType));
  if (!parser) {
    throw new Error(`Parser no disponible para MIME: ${mimeType}`);
  }

  return parser;
}

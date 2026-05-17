import mammoth from "mammoth";
import type { IDocumentParser, ParsedDocument } from "../types.js";
import { buildMarkdownDocument } from "./markdown-parser.js";

type MammothWithMarkdown = typeof mammoth & {
  convertToMarkdown(input: { path: string }): Promise<{ value: string; messages: Array<{ type?: string; message: string }> }>;
};

export class DocxParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    try {
      const result = await (mammoth as MammothWithMarkdown).convertToMarkdown({ path: filePath });
      const markdown = result.value;

      if (!markdown.trim()) {
        throw new Error("El archivo DOCX no contiene texto extraíble");
      }

      const metadata = result.messages.reduce<Record<string, string>>((acc, message, index) => {
        if (message.message.trim()) {
          acc[`warning_${index + 1}`] = message.message;
        }
        return acc;
      }, {});

      return buildMarkdownDocument(markdown, "docx", metadata);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "El archivo DOCX no contiene texto extraíble") {
        throw error;
      }
      throw new Error(`Error al parsear DOCX: ${message}`);
    }
  }
}

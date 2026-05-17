import officeParser from "officeparser";
import type { IDocumentParser, ParsedDocument, ParsedSection } from "../types.js";

type OfficeParserCompat = typeof officeParser & {
  parseOfficeAsync?: (filePath: string) => Promise<string>;
  parseOffice?: (filePath: string) => Promise<{ toText?: () => string; to?: (format: "text") => Promise<unknown> }>;
};

export class PptxParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    try {
      const text = await this.extractText(filePath);
      if (!text.trim()) {
        throw new Error("El PPTX no contiene texto extraíble");
      }

      const slides = text
        .replace(/\r\n/g, "\n")
        .split(/\n{2,}/)
        .map((slide) => slide.trim())
        .filter(Boolean);

      const sections: ParsedSection[] = slides.map((slide, index) => {
        const lines = slide.split("\n").map((line) => line.trim()).filter(Boolean);
        const [titleLine, ...contentLines] = lines;

        return {
          pageNumber: index + 1,
          title: titleLine || null,
          content: contentLines.join("\n"),
        };
      });

      return {
        fullText: text,
        pageCount: sections.length,
        sections,
        sourceFormat: "pptx",
        metadata: {},
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === "El PPTX no contiene texto extraíble") {
        throw error;
      }
      throw new Error(`Error al parsear PPTX: ${message}`);
    }
  }

  private async extractText(filePath: string): Promise<string> {
    const parser = officeParser as OfficeParserCompat;
    if (typeof parser.parseOfficeAsync === "function") {
      return parser.parseOfficeAsync(filePath);
    }

    const ast = await parser.parseOffice?.(filePath);
    if (!ast) return "";
    if (typeof ast.to === "function") {
      const result = await ast.to("text");
      return typeof result === "string" ? result : String(result);
    }
    if (typeof ast.toText === "function") return ast.toText();
    return "";
  }
}

import { readFile } from "fs/promises";
import pdfParse from "pdf-parse";
import type { IDocumentParser, ParsedDocument, ParsedSection } from "../types.js";

export class PdfParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "application/pdf";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const buffer = await readFile(filePath);

    // Detectar PDF spoofed (magic bytes)
    if (!buffer.slice(0, 5).equals(Buffer.from("%PDF-"))) {
      throw new Error("El archivo no es un PDF válido (magic bytes incorrectos)");
    }

    const sections: ParsedSection[] = [];

    const data = await pdfParse(buffer, {
      pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => {
        return pageData.getTextContent().then((content) => {
          const text = content.items
            .map((item) => ("hasEOL" in item && item.hasEOL ? `${item.str}\n` : item.str))
            .join(" ")
            .trim();

          sections.push({
            pageNumber: pageData.pageIndex + 1,
            title: null,
            content: text,
          });

          return text;
        });
      },
    });

    return {
      fullText: data.text,
      pageCount: data.numpages,
      sections: sections.sort((a, b) => a.pageNumber - b.pageNumber),
      sourceFormat: "pdf",
      metadata: {},
    };
  }
}

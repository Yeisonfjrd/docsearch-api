import { readFile } from "fs/promises";
import { parse } from "csv-parse/sync";
import type { IDocumentParser, ParsedDocument, ParsedSection } from "../types.js";

const ROWS_PER_SECTION = 20;

export class CsvParser implements IDocumentParser {
  canParse(mimeType: string): boolean {
    return mimeType === "text/csv";
  }

  async parse(filePath: string): Promise<ParsedDocument> {
    const content = await readFile(filePath, "utf-8");
    let rows: Array<Record<string, string>>;

    try {
      rows = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Error al parsear CSV: ${message}`);
    }

    const headers = Object.keys(rows[0] ?? {}).filter(Boolean);
    if (headers.length === 0) {
      throw new Error("El CSV no tiene encabezados válidos");
    }

    if (rows.length > 1000) {
      console.warn(`CSV con ${rows.length} filas; se procesará completo.`);
    }

    const sections: ParsedSection[] = [];
    for (let start = 0; start < rows.length; start += ROWS_PER_SECTION) {
      const end = Math.min(start + ROWS_PER_SECTION, rows.length);
      const blockRows = rows.slice(start, end).map((row) =>
        headers.map((header) => `${header}: ${row[header] ?? ""}`).join(" | ")
      );

      sections.push({
        pageNumber: sections.length + 1,
        title: `Filas ${start + 1}–${end}`,
        content: blockRows.join("\n"),
      });
    }

    return {
      fullText: sections.map((section) => section.content).join("\n\n"),
      pageCount: sections.length,
      sections,
      sourceFormat: "csv",
      metadata: {},
    };
  }
}

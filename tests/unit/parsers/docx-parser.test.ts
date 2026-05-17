import { describe, it, expect, vi, beforeEach } from "vitest";
import mammoth from "mammoth";
import { DocxParser } from "../../../src/infrastructure/parsers/parsers/docx-parser.js";

vi.mock("mammoth", () => ({
  default: {
    convertToMarkdown: vi.fn(),
  },
}));

describe("DocxParser", () => {
  const parser = new DocxParser();

  beforeEach(() => {
    vi.mocked((mammoth as unknown as { convertToMarkdown: (input: { path: string }) => Promise<unknown> }).convertToMarkdown)
      .mockResolvedValue({
        value: "# Documento\n\nContenido extraíble.",
        messages: [],
      });
  });

  it("parsea el fixture sin lanzar excepción", async () => {
    await expect(parser.parse("/tmp/sample.docx")).resolves.toBeDefined();
  });

  it("devuelve sourceFormat correcto", async () => {
    const result = await parser.parse("/tmp/sample.docx");
    expect(result.sourceFormat).toBe("docx");
  });

  it("devuelve al menos una sección con contenido", async () => {
    const result = await parser.parse("/tmp/sample.docx");
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].content.trim().length).toBeGreaterThan(0);
  });

  it("los números de sección arrancan en 1", async () => {
    const result = await parser.parse("/tmp/sample.docx");
    expect(result.sections[0].pageNumber).toBe(1);
  });

  it("fullText no está vacío", async () => {
    const result = await parser.parse("/tmp/sample.docx");
    expect(result.fullText.trim().length).toBeGreaterThan(0);
  });

  it("lanza error descriptivo con archivo corrupto", async () => {
    vi.mocked((mammoth as unknown as { convertToMarkdown: (input: { path: string }) => Promise<unknown> }).convertToMarkdown)
      .mockRejectedValueOnce(new Error("not found"));

    await expect(parser.parse("/tmp/no-existe.docx"))
      .rejects.toThrow(/no existe|not found|ENOENT|Error al parsear/i);
  });
});

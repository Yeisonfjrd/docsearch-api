import { describe, it, expect, vi, beforeEach } from "vitest";
import officeParser from "officeparser";
import { PptxParser } from "../../../src/infrastructure/parsers/parsers/pptx-parser.js";

vi.mock("officeparser", () => ({
  default: {
    parseOfficeAsync: vi.fn(),
  },
}));

describe("PptxParser", () => {
  const parser = new PptxParser();

  beforeEach(() => {
    vi.mocked((officeParser as unknown as { parseOfficeAsync: (filePath: string) => Promise<string> }).parseOfficeAsync)
      .mockResolvedValue("Slide Uno\nContenido uno\n\nSlide Dos\nContenido dos");
  });

  it("parsea el fixture sin lanzar excepción", async () => {
    await expect(parser.parse("/tmp/sample.pptx")).resolves.toBeDefined();
  });

  it("devuelve sourceFormat correcto", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.sourceFormat).toBe("pptx");
  });

  it("devuelve al menos una sección con contenido", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].content.trim().length).toBeGreaterThan(0);
  });

  it("los números de sección arrancan en 1", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.sections[0].pageNumber).toBe(1);
  });

  it("fullText no está vacío", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.fullText.trim().length).toBeGreaterThan(0);
  });

  it("lanza error descriptivo con archivo corrupto", async () => {
    vi.mocked((officeParser as unknown as { parseOfficeAsync: (filePath: string) => Promise<string> }).parseOfficeAsync)
      .mockRejectedValueOnce(new Error("not found"));

    await expect(parser.parse("/tmp/no-existe.pptx"))
      .rejects.toThrow(/no existe|not found|ENOENT|Error al parsear/i);
  });

  it("cada slide es una sección separada", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.sections.length).toBe(2);
  });

  it("el título del slide se detecta como title", async () => {
    const result = await parser.parse("/tmp/sample.pptx");
    expect(result.sections[0].title).toBe("Slide Uno");
  });
});

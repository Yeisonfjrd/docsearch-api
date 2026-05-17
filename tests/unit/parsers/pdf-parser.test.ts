import { describe, it, expect, vi } from "vitest";
import { writeFile, rm } from "fs/promises";
import { resolve } from "path";
import { PdfParser } from "../../../src/infrastructure/parsers/parsers/pdf-parser.js";
import { parseDocument } from "../../../src/infrastructure/parsers/document-parser.js";

vi.mock("pdf-parse", () => ({
  default: vi.fn(async (_buffer: Buffer, options: { pagerender: (pageData: { pageIndex: number; getTextContent: () => Promise<{ items: Array<{ str: string; hasEOL?: boolean }> }> }) => Promise<string> }) => {
    await options.pagerender({
      pageIndex: 0,
      getTextContent: async () => ({ items: [{ str: "Contenido PDF", hasEOL: false }] }),
    });

    return { text: "Contenido PDF", numpages: 1 };
  }),
}));

describe("PdfParser", () => {
  const parser = new PdfParser();
  const fixture = resolve("tests/fixtures/sample.pdf");

  async function createFixture() {
    await writeFile(fixture, Buffer.from("%PDF- fixture"));
  }

  it("parsea el fixture sin lanzar excepción", async () => {
    await createFixture();
    await expect(parser.parse(fixture)).resolves.toBeDefined();
    await rm(fixture);
  });

  it("devuelve sourceFormat correcto", async () => {
    await createFixture();
    const result = await parser.parse(fixture);
    expect(result.sourceFormat).toBe("pdf");
    await rm(fixture);
  });

  it("devuelve al menos una sección con contenido", async () => {
    await createFixture();
    const result = await parser.parse(fixture);
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].content.trim().length).toBeGreaterThan(0);
    await rm(fixture);
  });

  it("los números de sección arrancan en 1", async () => {
    await createFixture();
    const result = await parser.parse(fixture);
    expect(result.sections[0].pageNumber).toBe(1);
    await rm(fixture);
  });

  it("fullText no está vacío", async () => {
    await createFixture();
    const result = await parser.parse(fixture);
    expect(result.fullText.trim().length).toBeGreaterThan(0);
    await rm(fixture);
  });

  it("lanza error descriptivo con archivo corrupto", async () => {
    await expect(parser.parse("/tmp/no-existe.pdf"))
      .rejects.toThrow(/no existe|not found|ENOENT|Error al parsear/i);
  });
});

describe("PDF Parser — regresión", () => {
  it("el pipeline completo de PDF no se rompe", async () => {
    const fixture = resolve("tests/fixtures/sample.pdf");
    await writeFile(fixture, Buffer.from("%PDF- fixture"));
    const result = await parseDocument(fixture, "application/pdf");

    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sourceFormat).toBe("pdf");
    await rm(fixture);
  });
});

import { describe, it, expect } from "vitest";
import { resolve } from "path";
import { TextParser } from "../../../src/infrastructure/parsers/parsers/text-parser.js";

describe("TextParser", () => {
  const parser = new TextParser();
  const fixture = resolve("tests/fixtures/sample.txt");

  it("parsea el fixture sin lanzar excepción", async () => {
    await expect(parser.parse(fixture)).resolves.toBeDefined();
  });

  it("devuelve sourceFormat correcto", async () => {
    const result = await parser.parse(fixture);
    expect(result.sourceFormat).toBe("txt");
  });

  it("devuelve al menos una sección con contenido", async () => {
    const result = await parser.parse(fixture);
    expect(result.sections.length).toBeGreaterThanOrEqual(1);
    expect(result.sections[0].content.trim().length).toBeGreaterThan(0);
  });

  it("los números de sección arrancan en 1", async () => {
    const result = await parser.parse(fixture);
    expect(result.sections[0].pageNumber).toBe(1);
  });

  it("fullText no está vacío", async () => {
    const result = await parser.parse(fixture);
    expect(result.fullText.trim().length).toBeGreaterThan(0);
  });

  it("lanza error descriptivo con archivo corrupto", async () => {
    await expect(parser.parse("/tmp/no-existe.txt"))
      .rejects.toThrow(/no existe|not found|ENOENT|Error al parsear/i);
  });

  it("genera secciones separadas por párrafos", async () => {
    const result = await parser.parse(fixture);
    expect(result.sections.length).toBe(3);
  });
});

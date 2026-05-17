import { describe, it, expect } from "vitest";
import { chunkSections } from "../../../src/infrastructure/parsers/markdown-chunker.js";

describe("markdown-chunker", () => {
  it("genera chunks con chunkIndex global incrementando", () => {
    const chunks = chunkSections("doc-1", [
      { pageNumber: 1, title: null, content: "uno" },
      { pageNumber: 2, title: null, content: "dos" },
    ], "txt");

    expect(chunks.map((chunk) => chunk.chunkIndex)).toEqual([0, 1]);
  });

  it("chunks de secciones largas tienen overlap correcto", () => {
    const content = Array.from({ length: 450 }, (_, index) => `w${index}`).join(" ");
    const chunks = chunkSections("doc-1", [{ pageNumber: 1, title: null, content }], "md");

    expect(chunks[0].content.split(/\s+/).slice(-40)).toEqual(chunks[1].content.split(/\s+/).slice(0, 40));
  });

  it("secciones cortas producen un único chunk", () => {
    const chunks = chunkSections("doc-1", [{ pageNumber: 1, title: "Corta", content: "contenido breve" }], "md");

    expect(chunks.length).toBe(1);
  });

  it("el campo sourceFormat se propaga a cada chunk", () => {
    const chunks = chunkSections("doc-1", [{ pageNumber: 1, title: null, content: "contenido" }], "docx");

    expect(chunks.every((chunk) => chunk.sourceFormat === "docx")).toBe(true);
  });

  it("startOffset y endOffset son consistentes con el contenido", () => {
    const content = Array.from({ length: 405 }, (_, index) => `w${index}`).join(" ");
    const chunks = chunkSections("doc-1", [{ pageNumber: 1, title: null, content }], "txt");

    expect(chunks[0].startOffset).toBe(0);
    expect(chunks[0].endOffset).toBe(chunks[0].content.length);
    expect(chunks[1].startOffset).toBeGreaterThan(chunks[0].startOffset);
    expect(chunks[1].endOffset).toBe(chunks[1].startOffset + chunks[1].content.length);
  });
});

export type SupportedMimeType =
  | "application/pdf"
  | "text/plain"
  | "text/markdown"
  | "text/csv"
  | "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  | "application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type SourceFormat = "pdf" | "txt" | "md" | "docx" | "csv" | "pptx";

export interface ParsedSection {
  /** Número de página o slide (1-indexed). Para TXT/MD/CSV: bloque lógico. */
  pageNumber: number;
  /** Título de la sección si existe (heading, título de slide). Null si no aplica. */
  title: string | null;
  /** Contenido en texto plano o Markdown limpio */
  content: string;
}

export interface ParsedDocument {
  /** Texto completo concatenado. Usado solo para logging/debug. */
  fullText: string;
  /** Número total de secciones (páginas, slides, bloques) */
  pageCount: number;
  /** Secciones del documento. Mínimo 1. */
  sections: ParsedSection[];
  /** Formato original detectado */
  sourceFormat: SourceFormat;
  /** Metadatos adicionales opcionales (autor, fecha, etc.) */
  metadata: Record<string, string>;
}

export interface IDocumentParser {
  /** Devuelve true si este parser puede manejar el mimeType dado */
  canParse(mimeType: string): boolean;
  /** Parsea el archivo y devuelve estructura normalizada */
  parse(filePath: string): Promise<ParsedDocument>;
}

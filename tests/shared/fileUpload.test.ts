import { describe, expect, it } from "vitest";
import {
  ACCEPTED_FILE_ERROR_LABEL,
  ACCEPTED_FILE_EXTENSIONS,
  ACCEPTED_FILE_INPUT_ACCEPT,
  ACCEPTED_FILE_LABEL,
  FILE_UPLOAD_FIELD,
  MAX_FILE_COUNT,
  MAX_FILE_SIZE_BYTES,
} from "@shared/fileUpload";

describe("file upload constants", () => {
  it("keeps the upload field and size limits stable", () => {
    expect(FILE_UPLOAD_FIELD).toBe("files");
    expect(MAX_FILE_COUNT).toBe(10);
    expect(MAX_FILE_SIZE_BYTES).toBe(25 * 1024 * 1024);
  });

  it("derives user-facing labels from the accepted extensions", () => {
    expect(ACCEPTED_FILE_EXTENSIONS).toEqual(["txt", "md", "doc", "docx", "pdf"]);
    expect(ACCEPTED_FILE_INPUT_ACCEPT).toBe(".txt,.md,.doc,.docx,.pdf");
    expect(ACCEPTED_FILE_LABEL).toBe("TXT, MD, DOC, DOCX, PDF");
    expect(ACCEPTED_FILE_ERROR_LABEL).toBe(".txt, .md, .doc, .docx, .pdf");
  });
});

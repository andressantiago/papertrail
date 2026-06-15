import { describe, expect, it } from "vitest";
import { sortStoredFilesNewestFirst } from "@client/lib/storedFiles";
import type { StoredFile } from "@client/types";

const olderFile: StoredFile = {
  id: "older.txt",
  name: "older.txt",
  extension: "txt",
  size: 100,
  uploadedAt: "2026-05-28T13:05:00.000Z",
};

const newerFile: StoredFile = {
  id: "newer.pdf",
  name: "newer.pdf",
  extension: "pdf",
  size: 200,
  uploadedAt: "2026-05-29T13:05:00.000Z",
};

describe("sortStoredFilesNewestFirst", () => {
  it("sorts files by upload date without mutating the input", () => {
    const files = [olderFile, newerFile];

    expect(sortStoredFilesNewestFirst(files)).toEqual([newerFile, olderFile]);
    expect(files).toEqual([olderFile, newerFile]);
  });
});

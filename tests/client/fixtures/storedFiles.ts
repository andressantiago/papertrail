import type { StoredFile } from "@client/types";

export const olderFile: StoredFile = {
  id: "older.txt",
  name: "older.txt",
  extension: "txt",
  size: 100,
  uploadedAt: "2026-05-28T13:05:00.000Z",
};

export const newerFile: StoredFile = {
  id: "newer.pdf",
  name: "newer.pdf",
  extension: "pdf",
  size: 200,
  uploadedAt: "2026-05-29T13:05:00.000Z",
};

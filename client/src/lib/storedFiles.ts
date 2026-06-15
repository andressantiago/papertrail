import type { StoredFile } from "@client/types";

export function sortStoredFilesNewestFirst(files: StoredFile[]): StoredFile[] {
  return [...files].sort((first, second) => {
    return Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt);
  });
}

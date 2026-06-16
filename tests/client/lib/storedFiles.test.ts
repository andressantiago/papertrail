import { describe, expect, it } from "vitest";
import { sortStoredFilesNewestFirst } from "@client/lib/storedFiles";
import { newerFile, olderFile } from "@tests/client/fixtures/storedFiles";

describe("sortStoredFilesNewestFirst", () => {
  it("sorts files by upload date without mutating the input", () => {
    const files = [olderFile, newerFile];

    expect(sortStoredFilesNewestFirst(files)).toEqual([newerFile, olderFile]);
    expect(files).toEqual([olderFile, newerFile]);
  });
});

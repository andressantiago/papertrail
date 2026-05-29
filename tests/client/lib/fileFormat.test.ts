import { describe, expect, it } from "vitest";
import { formatFileSize } from "@client/lib/fileFormat";

describe("formatFileSize", () => {
  it("formats byte, kilobyte, and megabyte values", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(2 * 1024 * 1024)).toBe("2 MB");
  });
});

import { describe, expect, it, vi } from "vitest";
import { deleteStoredFile, fetchStoredFiles, uploadStoredFiles } from "@client/lib/filesApi";
import type { StoredFile } from "@client/types";

const storedFiles: StoredFile[] = [
  {
    id: "notes.txt",
    name: "notes.txt",
    extension: "txt",
    size: 128,
    uploadedAt: "2026-05-29T13:05:00.000Z",
  },
];

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("filesApi", () => {
  it("fetches stored files", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ files: storedFiles }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchStoredFiles()).resolves.toEqual(storedFiles);
    expect(fetchMock).toHaveBeenCalledWith("/api/files", { signal: undefined });
  });

  it("uploads files with multipart form data", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ files: storedFiles }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(uploadStoredFiles([new File(["hello"], "notes.txt")])).resolves.toEqual(
      storedFiles,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );
  });

  it("deletes files by encoded id", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ files: [] }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteStoredFile("report 1.pdf")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/files/report%201.pdf", { method: "DELETE" });
  });

  it("uses API error messages when a request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "No files found." }, { status: 404 })),
    );

    await expect(fetchStoredFiles()).rejects.toThrow("No files found.");
  });

  it("uses fallback errors when the response body cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 500 })));

    await expect(uploadStoredFiles([new File(["hello"], "notes.txt")])).rejects.toThrow(
      "Unable to upload files.",
    );
  });
});

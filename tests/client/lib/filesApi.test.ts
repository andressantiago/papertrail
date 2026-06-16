import { describe, expect, it } from "vitest";
import { deleteStoredFile, fetchStoredFiles, uploadStoredFiles } from "@client/lib/filesApi";
import type { StoredFile } from "@client/types";
import { FILE_UPLOAD_FIELD } from "@shared/fileUpload";
import { createJsonResponse, stubFetchResponse } from "@tests/client/lib/apiTestUtils";

const storedFiles: StoredFile[] = [
  {
    id: "notes.txt",
    name: "notes.txt",
    extension: "txt",
    size: 128,
    uploadedAt: "2026-05-29T13:05:00.000Z",
  },
];

describe("filesApi", () => {
  it("fetches stored files", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse({ files: storedFiles }));

    await expect(fetchStoredFiles()).resolves.toEqual(storedFiles);
    expect(fetchMock).toHaveBeenCalledWith("/api/files", { signal: undefined });
  });

  it("uploads files with multipart form data", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse({ files: storedFiles }));
    const file = new File(["hello"], "notes.txt");

    await expect(uploadStoredFiles([file])).resolves.toEqual(storedFiles);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/files",
      expect.objectContaining({
        method: "POST",
        body: expect.any(FormData),
      }),
    );

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const formData = requestInit.body as FormData;

    expect(formData.get(FILE_UPLOAD_FIELD)).toBe(file);
  });

  it("deletes files by encoded id", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse({ files: [] }));

    await expect(deleteStoredFile("report 1.pdf")).resolves.toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/api/files/report%201.pdf", { method: "DELETE" });
  });

  it("uses API error messages when a request fails", async () => {
    stubFetchResponse(createJsonResponse({ error: "No files found." }, { status: 404 }));

    await expect(fetchStoredFiles()).rejects.toThrow("No files found.");
  });

  it("uses fallback errors when the response body cannot be read", async () => {
    stubFetchResponse(new Response("not-json", { status: 500 }));

    await expect(uploadStoredFiles([new File(["hello"], "notes.txt")])).rejects.toThrow(
      "Unable to upload files.",
    );
  });
});

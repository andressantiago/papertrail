import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFiles } from "@client/hooks/useFiles";
import { deleteStoredFile, fetchStoredFiles, uploadStoredFiles } from "@client/lib/filesApi";
import { newerFile, olderFile } from "@tests/client/fixtures/storedFiles";

vi.mock("@client/lib/filesApi", () => ({
  deleteStoredFile: vi.fn(),
  fetchStoredFiles: vi.fn(),
  uploadStoredFiles: vi.fn(),
}));

const fetchStoredFilesMock = vi.mocked(fetchStoredFiles);
const uploadStoredFilesMock = vi.mocked(uploadStoredFiles);
const deleteStoredFileMock = vi.mocked(deleteStoredFile);

describe("useFiles", () => {
  beforeEach(() => {
    fetchStoredFilesMock.mockResolvedValue([]);
    uploadStoredFilesMock.mockResolvedValue([]);
    deleteStoredFileMock.mockResolvedValue([]);
  });

  it("loads and sorts files newest first", async () => {
    fetchStoredFilesMock.mockResolvedValue([olderFile, newerFile]);

    const { result } = renderHook(() => useFiles());

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.files).toEqual([newerFile, olderFile]);
  });

  it("sets an error when initial loading fails", async () => {
    fetchStoredFilesMock.mockRejectedValue(new Error("Unable to load test files."));

    const { result } = renderHook(() => useFiles());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe("Unable to load test files.");
    expect(result.current.files).toEqual([]);
  });

  it("uploads files, reloads the list, and clears the uploading state", async () => {
    fetchStoredFilesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([newerFile]);
    uploadStoredFilesMock.mockResolvedValue([newerFile]);

    const { result } = renderHook(() => useFiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.uploadFiles([new File(["hello"], "newer.pdf")]);
    });

    expect(uploadStoredFilesMock).toHaveBeenCalledWith([expect.any(File)]);
    expect(fetchStoredFilesMock).toHaveBeenCalledTimes(2);
    expect(result.current.uploading).toBe(false);
    expect(result.current.files).toEqual([newerFile]);
  });

  it("skips empty uploads", async () => {
    const { result } = renderHook(() => useFiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.uploadFiles([]);
    });

    expect(uploadStoredFilesMock).not.toHaveBeenCalled();
  });

  it("tracks delete state and replaces files with the API response", async () => {
    fetchStoredFilesMock.mockResolvedValue([newerFile]);
    deleteStoredFileMock.mockResolvedValue([olderFile]);

    const { result } = renderHook(() => useFiles());
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.deleteFile(newerFile.id);
    });

    expect(deleteStoredFileMock).toHaveBeenCalledWith(newerFile.id);
    expect(result.current.deletingFileIds.has(newerFile.id)).toBe(false);
    expect(result.current.files).toEqual([olderFile]);
  });
});

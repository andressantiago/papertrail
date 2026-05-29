import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import {
  deleteStoredFile as deleteStoredFileRequest,
  fetchStoredFiles,
  uploadStoredFiles,
} from "@client/lib/filesApi";
import type { StoredFile } from "@client/types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function sortFiles(files: StoredFile[]): StoredFile[] {
  return [...files].sort((first, second) => {
    return Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt);
  });
}

function useDeletingFileIds() {
  const [deletingFileIds, setDeletingFileIds] = useState<ReadonlySet<string>>(() => new Set());

  const markDeleting = useCallback((fileId: string) => {
    setDeletingFileIds((currentFileIds) => new Set(currentFileIds).add(fileId));
  }, []);

  const clearDeleting = useCallback((fileId: string) => {
    setDeletingFileIds((currentFileIds) => {
      const nextFileIds = new Set(currentFileIds);
      nextFileIds.delete(fileId);
      return nextFileIds;
    });
  }, []);

  return { clearDeleting, deletingFileIds, markDeleting };
}

function useInitialFilesLoad(
  setFiles: Dispatch<SetStateAction<StoredFile[]>>,
  setError: Dispatch<SetStateAction<string | null>>,
  setLoading: Dispatch<SetStateAction<boolean>>,
): void {
  useEffect(() => {
    let active = true;

    fetchStoredFiles()
      .then((nextFiles) => {
        if (active) {
          setFiles(sortFiles(nextFiles));
          setError(null);
        }
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(getErrorMessage(loadError, "Unable to load files."));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [setError, setFiles, setLoading]);
}

export function useFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { clearDeleting, deletingFileIds, markDeleting } = useDeletingFileIds();

  useInitialFilesLoad(setFiles, setError, setLoading);

  const loadFiles = useCallback(async () => {
    try {
      setFiles(sortFiles(await fetchStoredFiles()));
      setError(null);
    } catch (loadError) {
      setError(getErrorMessage(loadError, "Unable to load files."));
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    await loadFiles();
  }, [loadFiles]);

  const uploadFiles = useCallback(async (fileList: FileList | File[]) => {
    const selectedFiles = Array.from(fileList);

    if (!selectedFiles.length) {
      return;
    }

    setUploading(true);
    setError(null);

    try {
      await uploadStoredFiles(selectedFiles);
      setFiles(sortFiles(await fetchStoredFiles()));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, "Unable to upload files."));
    } finally {
      setUploading(false);
    }
  }, []);

  const deleteFile = useCallback(
    async (fileId: string) => {
      markDeleting(fileId);
      setError(null);

      try {
        setFiles(sortFiles(await deleteStoredFileRequest(fileId)));
      } catch (deleteError) {
        setError(getErrorMessage(deleteError, "Unable to delete file."));
      } finally {
        clearDeleting(fileId);
      }
    },
    [clearDeleting, markDeleting],
  );

  return {
    deleteFile,
    deletingFileIds,
    error,
    files,
    loading,
    refreshFiles,
    uploadFiles,
    uploading,
  };
}

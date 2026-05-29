import { useCallback, useEffect, useState } from "react";
import { fetchStoredFiles, uploadStoredFiles } from "../lib/filesApi";
import type { StoredFile } from "../types";

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function sortFiles(files: StoredFile[]): StoredFile[] {
  return [...files].sort((first, second) => {
    return Date.parse(second.uploadedAt) - Date.parse(first.uploadedAt);
  });
}

export function useFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return {
    error,
    files,
    loading,
    refreshFiles,
    uploadFiles,
    uploading,
  };
}

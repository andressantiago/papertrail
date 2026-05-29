import type { StoredFile } from "../types";

type FilesResponse = {
  files: StoredFile[];
};

const FILES_ENDPOINT = "/api/files";

async function readError(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error || fallback;
  } catch {
    return fallback;
  }
}

async function readJson<T>(response: Response, fallbackError: string): Promise<T> {
  if (!response.ok) {
    throw new Error(await readError(response, fallbackError));
  }

  return response.json() as Promise<T>;
}

export async function fetchStoredFiles(signal?: AbortSignal): Promise<StoredFile[]> {
  const response = await fetch(FILES_ENDPOINT, { signal });
  const payload = await readJson<FilesResponse>(response, "Unable to load files.");

  return payload.files;
}

export async function uploadStoredFiles(files: File[]): Promise<StoredFile[]> {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  const response = await fetch(FILES_ENDPOINT, {
    method: "POST",
    body: formData,
  });
  const payload = await readJson<FilesResponse>(response, "Unable to upload files.");

  return payload.files;
}

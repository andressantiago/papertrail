import { readJson } from "@client/lib/apiResponse";
import type { StoredFile } from "@client/types";

type FilesResponse = {
  files: StoredFile[];
};

const FILES_ENDPOINT = "/api/files";

function getFileEndpoint(fileId: string): string {
  return `${FILES_ENDPOINT}/${encodeURIComponent(fileId)}`;
}

export async function fetchStoredFiles(signal?: AbortSignal): Promise<StoredFile[]> {
  const response = await fetch(FILES_ENDPOINT, { signal });
  const payload = await readJson<FilesResponse>(response, "Unable to load files.");

  return payload.files;
}

export async function deleteStoredFile(fileId: string): Promise<StoredFile[]> {
  const response = await fetch(getFileEndpoint(fileId), {
    method: "DELETE",
  });
  const payload = await readJson<FilesResponse>(response, "Unable to delete file.");

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

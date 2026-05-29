export const FILE_UPLOAD_FIELD = "files";
export const MAX_FILE_COUNT = 10;
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export const ACCEPTED_FILE_EXTENSIONS = ["txt", "md", "doc", "docx", "pdf"] as const;

export type AcceptedFileExtension = (typeof ACCEPTED_FILE_EXTENSIONS)[number];

export const ACCEPTED_FILE_INPUT_ACCEPT = ACCEPTED_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(",");

export const ACCEPTED_FILE_LABEL = ACCEPTED_FILE_EXTENSIONS.map((extension) =>
  extension.toUpperCase(),
).join(", ");

export const ACCEPTED_FILE_ERROR_LABEL = ACCEPTED_FILE_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(", ");

const FILE_SIZE_FORMATTER = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
});

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kilobytes = bytes / 1024;

  if (kilobytes < 1024) {
    return `${FILE_SIZE_FORMATTER.format(kilobytes)} KB`;
  }

  return `${FILE_SIZE_FORMATTER.format(kilobytes / 1024)} MB`;
}

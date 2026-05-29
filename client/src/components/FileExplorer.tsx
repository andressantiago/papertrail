import type { StoredFile } from "../types";
import { FileDropzone } from "./FileDropzone";
import { AlertIcon } from "./icons/AlertIcon";
import { UploadedFileList } from "./UploadedFileList";

type FileExplorerProps = {
  files: StoredFile[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  onRefresh: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
};

export function FileExplorer({
  files,
  loading,
  uploading,
  error,
  onRefresh,
  onUploadFiles,
}: FileExplorerProps): React.JSX.Element {
  return (
    <main className="file-explorer" aria-label="Files workspace">
      <FileDropzone uploading={uploading} onUploadFiles={onUploadFiles} />
      {error ? (
        <div className="file-error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      ) : null}
      <UploadedFileList files={files} loading={loading} onRefresh={onRefresh} />
    </main>
  );
}

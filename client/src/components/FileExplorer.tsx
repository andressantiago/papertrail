import type { StoredFile } from "../types";
import { FileDropzone } from "./FileDropzone";
import { AlertIcon } from "./icons/AlertIcon";
import { UploadedFileList } from "./UploadedFileList";

type FileExplorerProps = {
  deletingFileIds: ReadonlySet<string>;
  files: StoredFile[];
  loading: boolean;
  uploading: boolean;
  error: string | null;
  onDeleteFile: (fileId: string) => void;
  onRefresh: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
};

export function FileExplorer({
  deletingFileIds,
  files,
  loading,
  uploading,
  error,
  onDeleteFile,
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
      <UploadedFileList
        deletingFileIds={deletingFileIds}
        files={files}
        loading={loading}
        onDeleteFile={onDeleteFile}
        onRefresh={onRefresh}
      />
    </main>
  );
}

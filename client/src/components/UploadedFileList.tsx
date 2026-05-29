import { FileCard } from "@client/components/FileCard";
import { FileDropzone } from "@client/components/FileDropzone";
import { IconButton } from "@client/components/IconButton";
import { AlertIcon } from "@client/components/icons/AlertIcon";
import { RefreshIcon } from "@client/components/icons/RefreshIcon";
import type { StoredFile } from "@client/types";

type UploadedFileListProps = {
  deletingFileIds: ReadonlySet<string>;
  error: string | null;
  files: StoredFile[];
  loading: boolean;
  uploading: boolean;
  onDeleteFile: (fileId: string) => void;
  onRefresh: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
};

export function UploadedFileList({
  deletingFileIds,
  error,
  files,
  loading,
  uploading,
  onDeleteFile,
  onRefresh,
  onUploadFiles,
}: UploadedFileListProps): React.JSX.Element {
  return (
    <section className="file-list-section" aria-label="Uploaded files">
      <div className="file-list-header">
        <div className="file-list-title-group">
          <h1>Files</h1>
          <FileDropzone uploading={uploading} onUploadFiles={onUploadFiles} />
        </div>
        <IconButton label="Refresh files" onClick={onRefresh} disabled={loading}>
          <RefreshIcon />
        </IconButton>
      </div>

      {error ? (
        <div className="file-error" role="alert">
          <AlertIcon />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="file-grid">
        {loading ? <p className="file-state">Loading files...</p> : null}
        {!loading && files.length === 0 ? <p className="file-state">No files yet.</p> : null}
        {!loading
          ? files.map((file) => (
              <FileCard
                key={file.id}
                deleting={deletingFileIds.has(file.id)}
                file={file}
                onDelete={onDeleteFile}
              />
            ))
          : null}
      </div>
    </section>
  );
}

import type { StoredFile } from "../types";
import { FileCard } from "./FileCard";

type UploadedFileListProps = {
  files: StoredFile[];
  loading: boolean;
  onRefresh: () => void;
};

export function UploadedFileList({
  files,
  loading,
  onRefresh,
}: UploadedFileListProps): React.JSX.Element {
  return (
    <section className="file-list-section" aria-label="Uploaded files">
      <div className="file-list-header">
        <h1>Files</h1>
        <button
          className="file-refresh-button"
          type="button"
          onClick={onRefresh}
          disabled={loading}
        >
          Refresh
        </button>
      </div>

      {loading ? <p className="file-state">Loading files...</p> : null}
      {!loading && files.length === 0 ? <p className="file-state">No files yet.</p> : null}
      {!loading && files.length > 0 ? (
        <div className="file-grid">
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

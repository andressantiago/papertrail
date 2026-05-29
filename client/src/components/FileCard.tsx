import { formatFileSize } from "../lib/fileFormat";
import type { StoredFile } from "../types";

type FileCardProps = {
  file: StoredFile;
};

export function FileCard({ file }: FileCardProps): React.JSX.Element {
  return (
    <article className="file-card">
      <div className="file-thumbnail" aria-hidden="true">
        {file.extension.toUpperCase()}
      </div>
      <div className="file-card-body">
        <h2 title={file.name}>{file.name}</h2>
        <p>{formatFileSize(file.size)}</p>
      </div>
    </article>
  );
}

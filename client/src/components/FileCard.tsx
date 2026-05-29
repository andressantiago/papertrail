import { IconButton } from "@client/components/IconButton";
import { TrashIcon } from "@client/components/icons/TrashIcon";
import { formatFileSize } from "@client/lib/fileFormat";
import type { StoredFile } from "@client/types";

type FileCardProps = {
  deleting: boolean;
  file: StoredFile;
  onDelete: (fileId: string) => void;
};

export function FileCard({ deleting, file, onDelete }: FileCardProps): React.JSX.Element {
  const deleteLabel = deleting ? `Deleting ${file.name}` : `Delete ${file.name}`;

  function handleDelete(): void {
    if (window.confirm(`Delete "${file.name}"? This cannot be undone.`)) {
      onDelete(file.id);
    }
  }

  return (
    <article className="file-card">
      <div className="file-thumbnail" aria-hidden="true">
        {file.extension.toUpperCase()}
      </div>
      <div className="file-card-body">
        <h2 title={file.name}>{file.name}</h2>
        <p>{formatFileSize(file.size)}</p>
      </div>
      <IconButton label={deleteLabel} onClick={handleDelete} disabled={deleting}>
        <TrashIcon />
      </IconButton>
    </article>
  );
}

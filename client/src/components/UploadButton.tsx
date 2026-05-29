import { PlusIcon } from "./icons/PlusIcon";

type UploadButtonProps = {
  describedBy: string;
  uploading: boolean;
  onClick: () => void;
};

export function UploadButton({
  describedBy,
  uploading,
  onClick,
}: UploadButtonProps): React.JSX.Element {
  return (
    <button
      className="file-upload-button file-dropzone-action"
      type="button"
      aria-label={uploading ? "Uploading files" : "Add files"}
      aria-describedby={describedBy}
      onClick={onClick}
      disabled={uploading}
    >
      {uploading ? (
        <span className="file-upload-label">Uploading...</span>
      ) : (
        <span className="file-upload-label">
          <span className="file-upload-plus" aria-hidden="true">
            <PlusIcon />
          </span>
          <span>Add</span>
        </span>
      )}
    </button>
  );
}

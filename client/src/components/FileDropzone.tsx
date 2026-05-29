import { useRef, useState } from "react";
import type { ChangeEvent, DragEvent } from "react";
import { ACCEPTED_FILE_INPUT_ACCEPT, ACCEPTED_FILE_LABEL } from "../../../shared/fileUpload";

type FileDropzoneProps = {
  uploading: boolean;
  onUploadFiles: (files: FileList | File[]) => void;
};

function hasFiles(event: DragEvent<HTMLElement>): boolean {
  return Array.from(event.dataTransfer.types).includes("Files");
}

export function FileDropzone({ uploading, onUploadFiles }: FileDropzoneProps): React.JSX.Element {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const dragDepthRef = useRef(0);
  const [dragging, setDragging] = useState(false);

  function handleInputChange(event: ChangeEvent<HTMLInputElement>): void {
    if (event.currentTarget.files) {
      onUploadFiles(event.currentTarget.files);
    }

    event.currentTarget.value = "";
  }

  function handleDragEnter(event: DragEvent<HTMLElement>): void {
    if (!hasFiles(event)) {
      return;
    }

    event.preventDefault();
    // Drag enter/leave fires for child elements, so keep the highlight until the whole dropzone is left.
    dragDepthRef.current++;
    setDragging(true);
  }

  function handleDragOver(event: DragEvent<HTMLElement>): void {
    if (hasFiles(event)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  function handleDragLeave(event: DragEvent<HTMLElement>): void {
    if (!hasFiles(event)) {
      return;
    }

    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    setDragging(dragDepthRef.current > 0);
  }

  function handleDrop(event: DragEvent<HTMLElement>): void {
    event.preventDefault();
    dragDepthRef.current = 0;
    setDragging(false);
    onUploadFiles(event.dataTransfer.files);
  }

  return (
    <section
      className={dragging ? "file-dropzone is-dragging" : "file-dropzone"}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div>
        <p className="file-dropzone-title">Upload files</p>
        <p className="file-dropzone-meta">{ACCEPTED_FILE_LABEL}</p>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_INPUT_ACCEPT}
        onChange={handleInputChange}
        hidden
      />
      <button
        className="file-upload-button"
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? "Uploading..." : "Choose files"}
      </button>
    </section>
  );
}

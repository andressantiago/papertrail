import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FileDropzone } from "@client/components/FileDropzone";
import { ACCEPTED_FILE_INPUT_ACCEPT, ACCEPTED_FILE_LABEL } from "@shared/fileUpload";

function getFileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]');

  if (!input) {
    throw new Error("Expected file input to render.");
  }

  return input;
}

describe("FileDropzone", () => {
  it("configures the hidden file input for supported files", () => {
    const { container } = render(<FileDropzone uploading={false} onUploadFiles={vi.fn()} />);

    expect(getFileInput(container)).toHaveAttribute("accept", ACCEPTED_FILE_INPUT_ACCEPT);
    expect(screen.getByRole("tooltip")).toHaveTextContent(`Supported: ${ACCEPTED_FILE_LABEL}`);
  });

  it("uploads selected files and clears the input value", () => {
    const onUploadFiles = vi.fn();
    const { container } = render(<FileDropzone uploading={false} onUploadFiles={onUploadFiles} />);
    const input = getFileInput(container);
    const file = new File(["hello"], "notes.txt", { type: "text/plain" });

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [file],
    });
    fireEvent.change(input);

    expect(onUploadFiles).toHaveBeenCalledWith([file]);
    expect(input.value).toBe("");
  });

  it("does not upload selected files while an upload is already running", () => {
    const onUploadFiles = vi.fn();
    const { container } = render(<FileDropzone uploading={true} onUploadFiles={onUploadFiles} />);
    const input = getFileInput(container);

    Object.defineProperty(input, "files", {
      configurable: true,
      value: [new File(["hello"], "notes.txt")],
    });
    fireEvent.change(input);

    expect(onUploadFiles).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Uploading files" })).toBeDisabled();
  });

  it("highlights file drags and uploads dropped files", () => {
    const onUploadFiles = vi.fn();
    const { container } = render(<FileDropzone uploading={false} onUploadFiles={onUploadFiles} />);
    const dropzone = container.querySelector<HTMLElement>(".file-dropzone");
    const file = new File(["hello"], "notes.txt");
    const dataTransfer = {
      dropEffect: "none",
      files: [file],
      types: ["Files"],
    };

    expect(dropzone).not.toBeNull();

    if (!dropzone) {
      return;
    }

    fireEvent.dragEnter(dropzone, { dataTransfer });
    expect(dropzone).toHaveClass("is-dragging");

    fireEvent.drop(dropzone, { dataTransfer });

    expect(dropzone).not.toHaveClass("is-dragging");
    expect(onUploadFiles).toHaveBeenCalledWith([file]);
    expect(dataTransfer.dropEffect).toBe("none");
  });
});

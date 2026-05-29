import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FileCard } from "@client/components/FileCard";
import type { StoredFile } from "@client/types";

const file: StoredFile = {
  id: "notes.txt",
  name: "notes.txt",
  extension: "txt",
  size: 1536,
  uploadedAt: "2026-05-29T13:05:00.000Z",
};

describe("FileCard", () => {
  it("renders file details and deletes after confirmation", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<FileCard deleting={false} file={file} onDelete={onDelete} />);

    expect(screen.getByRole("heading", { name: "notes.txt" })).toBeInTheDocument();
    expect(screen.getByText("1.5 KB")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete notes.txt" }));

    expect(window.confirm).toHaveBeenCalledWith('Delete "notes.txt"? This cannot be undone.');
    expect(onDelete).toHaveBeenCalledWith("notes.txt");
  });

  it("does not delete when confirmation is declined", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    vi.spyOn(window, "confirm").mockReturnValue(false);

    render(<FileCard deleting={false} file={file} onDelete={onDelete} />);

    await user.click(screen.getByRole("button", { name: "Delete notes.txt" }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables deletion while the file is being deleted", () => {
    render(<FileCard deleting={true} file={file} onDelete={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Deleting notes.txt" })).toBeDisabled();
  });
});

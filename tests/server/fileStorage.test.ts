import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FileStorageError,
  deleteStoredFile,
  listStoredFiles,
  saveUploadedFiles,
} from "@server/fileStorage";

let uploadDirectory = "";

function createUpload(originalname: string, content = "file content"): Express.Multer.File {
  return {
    buffer: Buffer.from(content),
    originalname,
  } as Express.Multer.File;
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

beforeEach(async () => {
  uploadDirectory = await fs.mkdtemp(path.join(os.tmpdir(), "papertrail-files-"));
});

afterEach(async () => {
  await fs.rm(uploadDirectory, { force: true, recursive: true });
});

describe("fileStorage", () => {
  it("rejects empty uploads", async () => {
    await expect(saveUploadedFiles(uploadDirectory, [])).rejects.toMatchObject({
      message: "Upload at least one file.",
      statusCode: 400,
    });
  });

  it("rejects unsupported file extensions", async () => {
    await expect(saveUploadedFiles(uploadDirectory, [createUpload("script.exe")])).rejects.toThrow(
      FileStorageError,
    );
    await expect(saveUploadedFiles(uploadDirectory, [createUpload("script.exe")])).rejects.toThrow(
      "Unsupported file type. Allowed file types: .txt, .md, .doc, .docx, .pdf.",
    );
  });

  it("sanitizes uploaded filenames and normalizes extensions", async () => {
    const files = await saveUploadedFiles(uploadDirectory, [
      createUpload("../../Quarterly Report!!.PDF"),
    ]);

    expect(files).toHaveLength(1);
    expect(files[0]).toMatchObject({
      id: "Quarterly-Report.pdf",
      name: "Quarterly-Report.pdf",
      extension: "pdf",
      size: "file content".length,
    });
    await expect(
      fs.readFile(path.join(uploadDirectory, "Quarterly-Report.pdf"), "utf8"),
    ).resolves.toBe("file content");
  });

  it("adds suffixes for duplicate safe filenames", async () => {
    const files = await saveUploadedFiles(uploadDirectory, [
      createUpload("notes.txt", "first"),
      createUpload("notes.txt", "second"),
    ]);

    expect(files.map((file) => file.name).sort()).toEqual(["notes-2.txt", "notes.txt"]);
    await expect(fs.readFile(path.join(uploadDirectory, "notes.txt"), "utf8")).resolves.toBe(
      "first",
    );
    await expect(fs.readFile(path.join(uploadDirectory, "notes-2.txt"), "utf8")).resolves.toBe(
      "second",
    );
  });

  it("skips filenames that are already reserved by the database", async () => {
    const files = await saveUploadedFiles(
      uploadDirectory,
      [createUpload("notes.txt", "new")],
      new Set(["notes.txt"]),
    );

    expect(files.map((file) => file.name)).toEqual(["notes-2.txt"]);
    await expect(fs.readFile(path.join(uploadDirectory, "notes-2.txt"), "utf8")).resolves.toBe(
      "new",
    );
  });

  it("lists only supported stored files newest first", async () => {
    await fs.writeFile(path.join(uploadDirectory, "older.txt"), "older");
    await wait(20);
    await fs.writeFile(path.join(uploadDirectory, "newer.pdf"), "newer");
    await fs.writeFile(path.join(uploadDirectory, "ignored.exe"), "ignored");

    const files = await listStoredFiles(uploadDirectory);

    expect(files.map((file) => file.name)).toEqual(["newer.pdf", "older.txt"]);
  });

  it("deletes stored files", async () => {
    await fs.writeFile(path.join(uploadDirectory, "notes.txt"), "notes");

    await deleteStoredFile(uploadDirectory, "notes.txt");

    await expect(fs.stat(path.join(uploadDirectory, "notes.txt"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("returns a 404 storage error for missing files", async () => {
    await expect(deleteStoredFile(uploadDirectory, "missing.txt")).rejects.toMatchObject({
      message: "File not found.",
      statusCode: 404,
    });
  });

  it("allows missing bytes during metadata cleanup", async () => {
    await expect(
      deleteStoredFile(uploadDirectory, "missing.txt", { missingOk: true }),
    ).resolves.toBeUndefined();
  });

  it("rejects unsafe or unsupported file ids before deleting", async () => {
    await expect(deleteStoredFile(uploadDirectory, "../notes.txt")).rejects.toMatchObject({
      message: "Invalid upload filename.",
      statusCode: 400,
    });
    await expect(deleteStoredFile(uploadDirectory, "notes.exe")).rejects.toMatchObject({
      message: "Unsupported file type. Allowed file types: .txt, .md, .doc, .docx, .pdf.",
      statusCode: 400,
    });
  });
});

/**
 * This file implements evidence storage and text extraction for uploaded files.
 * It exists to keep file-system operations and parsing logic out of the commitment service.
 * It fits the system by turning uploaded evidence into clean text that the AI verifier can evaluate.
 */
import { promises as fs } from "node:fs";
import path from "node:path";

import type { Express } from "express";
import pdfParse from "pdf-parse";

import { env } from "../config/env";
import { ensureDirectoryExists, normalizeExtractedText } from "../utils/file-utils";
import { AppError } from "../utils/app-error";

export type ExtractedEvidence = {
  extractedText: string;
  fileSize: number;
  mimeType: string;
  originalFileName: string;
  storagePath: string;
  storedFileName: string;
};

export class EvidenceService {
  /**
   * This function ensures that the upload directory exists before the server starts handling files.
   * It receives no parameters because the upload directory comes from validated environment variables.
   * It returns a promise that resolves after the directory exists.
   * It is important because multer disk storage assumes the destination folder is already available.
   */
  async ensureUploadDirectory() {
    await ensureDirectoryExists(env.UPLOAD_DIR);
  }

  /**
   * This function reads an uploaded file from disk and extracts normalized text from it.
   * It receives the multer file metadata produced by the upload middleware.
   * It returns the storage metadata plus the extracted text.
   * It is important because the AI verifier operates on text, not raw binary files.
   */
  async ingestUploadedFile(file: Express.Multer.File): Promise<ExtractedEvidence> {
    const absoluteStoragePath = path.resolve(file.path);
    const fileBuffer = await fs.readFile(absoluteStoragePath);

    let extractedText = "";

    /**
     * This block dispatches parsing based on the uploaded MIME type.
     * It receives the already persisted file contents from disk.
     * It returns clean extracted text assigned to the local variable.
     * It is important because PDFs and text files need different extraction strategies.
     */
    if (file.mimetype === "application/pdf") {
      const parsedPdf = await pdfParse(fileBuffer);
      extractedText = normalizeExtractedText(parsedPdf.text);
    } else if (file.mimetype === "text/plain") {
      extractedText = normalizeExtractedText(fileBuffer.toString("utf8"));
    } else {
      throw new AppError(400, "EVIDENCE_TYPE_UNSUPPORTED", "Unsupported evidence file type.");
    }

    if (extractedText.length === 0) {
      throw new AppError(400, "EVIDENCE_TEXT_EMPTY", "The uploaded evidence did not contain readable text.");
    }

    return {
      extractedText,
      fileSize: file.size,
      mimeType: file.mimetype,
      originalFileName: file.originalname,
      storagePath: absoluteStoragePath,
      storedFileName: file.filename
    };
  }

  /**
   * This function normalizes written evidence submitted directly through the form.
   * It receives the raw text field sent by the client, when present.
   * It returns the cleaned text or null when the field is empty after normalization.
   * It is important because written evidence should follow the same cleanup rules as file-extracted text.
   */
  normalizeSubmittedText(rawText: string | undefined) {
    if (typeof rawText !== "string") {
      return null;
    }

    const normalizedText = normalizeExtractedText(rawText);
    return normalizedText.length > 0 ? normalizedText : null;
  }

  /**
   * This function removes a stored file from disk when an upload flow fails after persistence.
   * It receives the absolute or relative path of the file that should be deleted.
   * It returns a promise that resolves after the cleanup attempt finishes.
   * It is important because failed database or parsing operations should not leave orphaned files behind.
   */
  async removeStoredFile(storagePath: string) {
    try {
      await fs.unlink(path.resolve(storagePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }
}

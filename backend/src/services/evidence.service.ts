/**
 * This file implements evidence text extraction for uploaded files and written submissions.
 * It exists to keep parsing logic out of the commitment service and independent from the storage provider.
 * It fits the system by turning uploaded evidence into clean text that the AI verifier can evaluate.
 */

import type { Express } from "express";
import pdfParse from "pdf-parse";

import { normalizeExtractedText } from "../utils/file-utils";
import { AppError } from "../utils/app-error";

export type ExtractedEvidence = {
  extractedText: string;
  fileSize: number;
  mimeType: string;
  originalFileName: string;
};

export class EvidenceService {
  /**
   * This function parses an uploaded file from memory and extracts normalized text from it.
   * It receives the multer file metadata produced by the upload middleware.
   * It returns the storage metadata plus the extracted text.
   * It is important because the AI verifier operates on text while storage may vary by environment.
   */
  async ingestUploadedFile(file: Express.Multer.File): Promise<ExtractedEvidence> {
    if (!Buffer.isBuffer(file.buffer) || file.buffer.length === 0) {
      throw new AppError(
        400,
        "EVIDENCE_FILE_EMPTY",
        "The uploaded evidence file was empty or could not be read.",
      );
    }

    let extractedText = "";

    /**
     * This block dispatches parsing based on the uploaded MIME type.
     * It receives the already persisted file contents from disk.
     * It returns clean extracted text assigned to the local variable.
     * It is important because PDFs and text files need different extraction strategies.
     */
    if (file.mimetype === "application/pdf") {
      const parsedPdf = await pdfParse(file.buffer);
      extractedText = normalizeExtractedText(parsedPdf.text);
    } else if (file.mimetype === "text/plain") {
      extractedText = normalizeExtractedText(file.buffer.toString("utf8"));
    } else {
      throw new AppError(400, "EVIDENCE_TYPE_UNSUPPORTED", "Unsupported evidence file type.");
    }

    if (extractedText.length === 0) {
      throw new AppError(
        400,
        "EVIDENCE_TEXT_EMPTY",
        "The uploaded evidence did not contain readable text.",
      );
    }

    return {
      extractedText,
      fileSize: file.size,
      mimeType: file.mimetype,
      originalFileName: file.originalname,
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
}

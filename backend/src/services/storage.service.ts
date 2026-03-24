/**
 * This file implements persistent evidence file storage for local development and Vercel production.
 * It exists to keep storage-provider concerns outside the commitment orchestration service.
 * It fits the system by giving evidence uploads one auditable adapter that can target Vercel Blob or the local filesystem.
 */
import crypto from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { del, put } from "@vercel/blob";
import type { Express } from "express";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";
import { sanitizeFileName } from "../utils/file-utils";

export type StoredEvidenceFile = {
  fileUrl: string;
  storedFileName: string;
};

/**
 * This class stores and deletes evidence files using the configured runtime capabilities.
 * It receives no constructor parameters because provider configuration comes from validated environment variables.
 * It returns a reusable storage adapter instance.
 * It is important because Vercel deployments require persistent storage while local development still benefits from a simple fallback.
 */
export class StorageService {
  /**
   * This function persists one uploaded evidence file and returns the stored file metadata.
   * It receives the multer file metadata already validated by the upload middleware.
   * It returns the logical file URL plus the stored filename that should be persisted in the database.
   * It is important because evidence metadata must remain stable regardless of the underlying storage provider.
   */
  async storeEvidenceFile(file: Express.Multer.File): Promise<StoredEvidenceFile> {
    const storedFileName = this.buildStoredFileName(file.originalname);

    if (this.shouldUseBlobStorage()) {
      const blobToken = this.getBlobToken();
      const blob = await put(`evidence/${storedFileName}`, file.buffer, {
        access: "public",
        addRandomSuffix: true,
        contentType: file.mimetype,
        token: blobToken,
      });

      return {
        fileUrl: blob.url,
        storedFileName: path.posix.basename(blob.pathname),
      };
    }

    this.assertLocalFilesystemStorageAllowed();

    const absoluteUploadDirectory = path.resolve(env.UPLOAD_DIR);
    await fs.mkdir(absoluteUploadDirectory, { recursive: true });

    const absoluteFilePath = path.join(absoluteUploadDirectory, storedFileName);
    await fs.writeFile(absoluteFilePath, file.buffer);

    return {
      fileUrl: this.buildLocalFileUrl(storedFileName),
      storedFileName,
    };
  }

  /**
   * This function removes a previously persisted evidence file using its stored file URL.
   * It receives the logical file URL that was written to the database or produced during upload.
   * It returns a promise that resolves after the best-effort cleanup finishes.
   * It is important because failed database transactions should not leave orphaned blobs or local files behind.
   */
  async removeEvidenceFile(fileUrl: string) {
    try {
      if (this.isAbsoluteUrl(fileUrl)) {
        if (this.shouldUseBlobStorage()) {
          const blobToken = this.getBlobToken();
          await del(fileUrl, {
            token: blobToken,
          });
        }

        return;
      }

      const relativeFilePath = fileUrl.replace(/^\/+/, "");
      await fs.unlink(path.resolve(relativeFilePath));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /**
   * This function determines whether persistent Vercel Blob storage is configured.
   * It receives no parameters because the token is loaded from the validated environment.
   * It returns true when blob storage should be used for writes and deletes.
   * It is important because Vercel production should not silently fall back to ephemeral local disk.
   */
  private shouldUseBlobStorage() {
    return typeof env.BLOB_READ_WRITE_TOKEN === "string" && env.BLOB_READ_WRITE_TOKEN.length > 0;
  }

  /**
   * This function returns the configured Vercel Blob token once blob storage has been selected.
   * It receives no parameters because the token comes from validated environment variables.
   * It returns the non-empty blob token string.
   * It is important because strict TypeScript settings should not rely on control-flow narrowing across method calls.
   */
  private getBlobToken(): string {
    if (!this.shouldUseBlobStorage()) {
      throw new AppError(
        500,
        "STORAGE_NOT_CONFIGURED",
        "Persistent evidence storage is not configured. Set BLOB_READ_WRITE_TOKEN.",
      );
    }

    return env.BLOB_READ_WRITE_TOKEN!;
  }

  /**
   * This function blocks local-disk storage when the backend is running on Vercel without Blob configured.
   * It receives no parameters because deployment context is inferred from environment variables.
   * It returns nothing and throws when persistent storage has not been configured.
   * It is important because evidence files must survive serverless instance recycling in production.
   */
  private assertLocalFilesystemStorageAllowed() {
    if (typeof process.env.VERCEL === "string") {
      throw new AppError(
        500,
        "STORAGE_NOT_CONFIGURED",
        "Persistent evidence storage is not configured. Set BLOB_READ_WRITE_TOKEN in Vercel.",
      );
    }
  }

  /**
   * This function generates the stored filename used by either storage provider.
   * It receives the original client-provided filename.
   * It returns a sanitized randomized filename.
   * It is important because user-provided filenames should never become storage keys directly.
   */
  private buildStoredFileName(originalFileName: string) {
    const extension = path.extname(originalFileName).toLowerCase();
    const baseName = sanitizeFileName(path.basename(originalFileName, extension));
    return `${baseName}-${crypto.randomUUID()}${extension}`;
  }

  /**
   * This function converts a local stored filename into the logical file URL persisted in the database.
   * It receives the generated local filename.
   * It returns the normalized local file URL string.
   * It is important because local development should mirror the same database shape used in production.
   */
  private buildLocalFileUrl(storedFileName: string) {
    const normalizedDirectory = env.UPLOAD_DIR.replace(/\\/g, "/").replace(/^\/+/, "");
    return `/${normalizedDirectory}/${storedFileName}`;
  }

  /**
   * This function checks whether a stored file URL points to an absolute remote URL.
   * It receives the file URL string that should be inspected.
   * It returns true when the file is stored remotely.
   * It is important because Blob cleanup should not run against local relative paths.
   */
  private isAbsoluteUrl(fileUrl: string) {
    return /^https?:\/\//i.test(fileUrl);
  }
}

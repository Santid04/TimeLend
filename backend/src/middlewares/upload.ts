/**
 * This file configures the multer upload middleware used for evidence ingestion.
 * It exists to centralize file size limits and MIME filtering before files reach storage and parsing services.
 * It fits the system by making evidence uploads safe and Vercel-compatible without depending on local disk persistence.
 */
import multer from "multer";

import { env } from "../config/env";
import { AppError } from "../utils/app-error";

const allowedMimeTypes = new Set(["application/pdf", "text/plain"]);

/**
 * This constant defines the configured multer instance for evidence uploads.
 * It receives runtime configuration from the validated environment.
 * It returns a multer middleware factory.
 * It is important because upload limits and file type filters are part of the backend security boundary.
 */
export const upload = multer({
  fileFilter(_request, file, callback) {
    if (!allowedMimeTypes.has(file.mimetype)) {
      callback(new AppError(400, "FILE_TYPE_UNSUPPORTED", "Only PDF and TXT files are allowed."));
      return;
    }

    callback(null, true);
  },
  limits: {
    fileSize: env.MAX_UPLOAD_SIZE_BYTES,
    files: 1,
  },
  storage: multer.memoryStorage(),
});

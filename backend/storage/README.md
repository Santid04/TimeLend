# Storage

This directory is reserved for storage-related adapters, temporary local artifacts, or fallback file handling used during development.

## Purpose

- Keep upload and storage concerns separate from HTTP and domain logic
- Provide a stable location for local filesystem-based implementations when needed
- Avoid mixing generated artifacts with application source code

In production deployments, TimeLend is designed to use external object storage such as Vercel Blob rather than committing runtime files to the repository.

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { createReadStream, existsSync } from 'fs';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { extname, join, resolve, sep } from 'path';
import { randomUUID } from 'crypto';

/** Formats accepted by the vault (checklist: PDF, PNG, JPG up to 10MB). */
export const ALLOWED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
];

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

export const DOCUMENT_CATEGORIES = [
  'IDENTITY',
  'EMPLOYMENT',
  'ACADEMIC',
  'FINANCIAL',
  'GENERAL',
] as const;

/**
 * Local-disk document storage.
 *
 * Files live outside the web root and are only ever readable through the
 * authenticated download endpoint. The interface (`save` / `resolvePath` /
 * `remove`) is deliberately narrow so an S3-backed implementation can replace
 * it without touching callers.
 */
@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly root = resolve(process.cwd(), 'uploads', 'employee-documents');

  /** Rejects anything outside the whitelist or over the size cap. */
  validate(file: { mimetype: string; size: number; originalname: string }) {
    if (!ALLOWED_DOCUMENT_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Unsupported file type "${file.mimetype}". Allowed: PDF, PNG, JPG.`,
      );
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      throw new BadRequestException(
        `File exceeds the ${Math.round(MAX_DOCUMENT_BYTES / 1024 / 1024)}MB limit.`,
      );
    }
    if (file.size === 0) {
      throw new BadRequestException('The uploaded file is empty.');
    }
  }

  /** Returns the storage key; the original filename is never used on disk. */
  async save(
    employeeId: string,
    file: { buffer: Buffer; originalname: string; mimetype: string },
  ): Promise<string> {
    const dir = join(this.root, employeeId);
    await mkdir(dir, { recursive: true });

    // Generated name avoids path traversal and collisions from user input.
    const ext = extname(file.originalname).toLowerCase().slice(0, 10) || '';
    const key = join(employeeId, `${randomUUID()}${ext}`);

    await writeFile(join(this.root, key), file.buffer);
    return key;
  }

  /**
   * Resolves a stored key to an absolute path, refusing anything that escapes
   * the storage root even if the key were tampered with.
   */
  resolvePath(storageKey: string): string {
    const absolute = resolve(this.root, storageKey);
    if (!absolute.startsWith(this.root + sep)) {
      throw new BadRequestException('Invalid document reference.');
    }
    if (!existsSync(absolute)) {
      throw new BadRequestException('The stored file is no longer available.');
    }
    return absolute;
  }

  createReadStream(storageKey: string) {
    return createReadStream(this.resolvePath(storageKey));
  }

  /** Best-effort: a missing file must not block removing the metadata record. */
  async remove(storageKey: string): Promise<void> {
    try {
      await unlink(resolve(this.root, storageKey));
    } catch (err) {
      this.logger.warn(`Could not delete stored document ${storageKey}: ${(err as Error).message}`);
    }
  }
}

import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';

export const POST_IMAGES_DIR = join(process.cwd(), 'uploads', 'posts');
export const MAX_POST_IMAGES = 6;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

export const postImagesStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(POST_IMAGES_DIR)) mkdirSync(POST_IMAGES_DIR, { recursive: true });
    cb(null, POST_IMAGES_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] ?? '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

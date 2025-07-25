import { randomUUID } from 'crypto';
import { existsSync, mkdirSync } from 'fs';
import { diskStorage } from 'multer';
import { join } from 'path';

export const USER_AVATARS_DIR = join(process.cwd(), 'uploads', 'avatars');
export const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export const userAvatarStorage = diskStorage({
  destination: (_req, _file, cb) => {
    if (!existsSync(USER_AVATARS_DIR)) mkdirSync(USER_AVATARS_DIR, { recursive: true });
    cb(null, USER_AVATARS_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] ?? '';
    cb(null, `${randomUUID()}${ext}`);
  },
});

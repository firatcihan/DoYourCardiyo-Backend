import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

@Injectable()
export class DebugImageService {
  private readonly debugDir = path.resolve(process.cwd(), 'debug-images');

  async save(buffer: Buffer): Promise<void> {
    if (process.env.NODE_ENV === 'production') return;

    try {
      await fs.mkdir(this.debugDir, { recursive: true });
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace(/Z$/, '');
      const filename = `${timestamp}-preprocessed.jpg`;
      await fs.writeFile(path.join(this.debugDir, filename), buffer);
    } catch (err) {
      console.error('[DebugImageService] Failed to save debug image:', err);
    }
  }
}

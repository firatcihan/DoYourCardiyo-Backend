import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class PreprocessingService {
  async process(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .sharpen({ sigma: 1.5 })
      .normalise()
      .jpeg({ quality: 85 })
      .toBuffer();
  }
}

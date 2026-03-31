import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class PreprocessingService {
  async process(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .linear(1.3, -30)
      .sharpen({ sigma: 2.0 })
      .normalise()
      .jpeg({ quality: 90 })
      .toBuffer();
  }
}

import { Test, TestingModule } from '@nestjs/testing';
import { PreprocessingService } from './preprocessing.service';
import sharp from 'sharp';

async function createTestJpeg(width = 100, height = 100): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
}

describe('PreprocessingService', () => {
  let service: PreprocessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreprocessingService],
    }).compile();
    service = module.get<PreprocessingService>(PreprocessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a Buffer', async () => {
    const input = await createTestJpeg();
    const result = await service.process(input);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should return a valid JPEG buffer', async () => {
    const input = await createTestJpeg();
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('jpeg');
  });

  it('should return a grayscale image', async () => {
    // Create a clearly coloured input (red), verify output pixels have R≈G≈B
    const input = await sharp({
      create: { width: 10, height: 10, channels: 3, background: { r: 200, g: 50, b: 50 } },
    })
      .jpeg()
      .toBuffer();
    const result = await service.process(input);
    const { data } = await sharp(result).raw().toBuffer({ resolveWithObject: true });
    // In a grayscale JPEG decoded as RGB, R≈G≈B for every pixel
    for (let i = 0; i < data.length; i += 3) {
      expect(Math.abs(data[i] - data[i + 1])).toBeLessThanOrEqual(2);
      expect(Math.abs(data[i] - data[i + 2])).toBeLessThanOrEqual(2);
    }
  });

  it('should resize large images to fit within 1200x1200', async () => {
    const input = await createTestJpeg(2000, 1500);
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBeLessThanOrEqual(1200);
    expect(metadata.height).toBeLessThanOrEqual(1200);
  });

  it('should not upscale small images', async () => {
    const input = await createTestJpeg(100, 100);
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });
});

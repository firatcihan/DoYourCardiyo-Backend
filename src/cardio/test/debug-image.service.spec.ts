import { Test, TestingModule } from '@nestjs/testing';
import { DebugImageService } from '../debug-image.service';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('DebugImageService', () => {
  let service: DebugImageService;
  const debugDir = path.resolve(process.cwd(), 'debug-images');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DebugImageService],
    }).compile();
    service = module.get<DebugImageService>(DebugImageService);
  });

  afterEach(async () => {
    try {
      const files = await fs.readdir(debugDir);
      await Promise.all(files.map((f) => fs.unlink(path.join(debugDir, f))));
      await fs.rmdir(debugDir);
    } catch {
      // folder may not exist if test was a no-op
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should write a file to debug-images/ in development', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const buffer = Buffer.from('fake-jpeg-data');
    await service.save(buffer);

    const files = await fs.readdir(debugDir);
    expect(files.length).toBe(1);
    expect(files[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}-preprocessed\.jpg$/,
    );

    const written = await fs.readFile(path.join(debugDir, files[0]));
    expect(written).toEqual(buffer);

    process.env.NODE_ENV = original;
  });

  it('should be a no-op in production', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const buffer = Buffer.from('fake-jpeg-data');
    await service.save(buffer);

    let exists = false;
    try {
      await fs.access(debugDir);
      exists = true;
    } catch {
      exists = false;
    }
    expect(exists).toBe(false);

    process.env.NODE_ENV = original;
  });

  it('should not throw if write fails', async () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    await expect(
      service.save(null as unknown as Buffer),
    ).resolves.not.toThrow();

    process.env.NODE_ENV = original;
  });
});

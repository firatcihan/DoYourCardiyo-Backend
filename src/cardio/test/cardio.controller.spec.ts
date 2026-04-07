import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Readable } from 'stream';
import { CardioController } from '../cardio.controller';
import { PreprocessingService } from '../preprocessing.service';
import { GeminiService } from '../gemini.service';
import { DebugImageService } from '../debug-image.service';
import { CardioSession } from '../schemas/cardio-session.schema';
import { ClerkAuthGuard } from '../../common/auth/clerk-auth.guard';
import { DailyLimitGuard } from '../../common/auth/daily-limit.guard';

const mockFile = (
  overrides: Partial<Express.Multer.File> = {},
): Express.Multer.File => ({
  fieldname: 'image',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('fake-image'),
  stream: Readable.from([]),
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('CardioController', () => {
  let controller: CardioController;
  let preprocessingService: jest.Mocked<PreprocessingService>;
  let geminiService: jest.Mocked<GeminiService>;

  const mockGeminiResult = {
    duration: 32,
    calories: 280,
    distance: 4.2,
    unit: 'km' as const,
  };

  const mockSessionId = '507f1f77bcf86cd799439011';
  const mockCreatedAt = new Date('2026-04-06T12:00:00Z');
  const processedBuffer = Buffer.from('processed');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardioController],
      providers: [
        {
          provide: PreprocessingService,
          useValue: { process: jest.fn().mockResolvedValue(processedBuffer) },
        },
        {
          provide: GeminiService,
          useValue: { analyze: jest.fn().mockResolvedValue(mockGeminiResult) },
        },
        {
          provide: DebugImageService,
          useValue: { save: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: getModelToken(CardioSession.name),
          useValue: {
            create: jest.fn().mockResolvedValue({
              _id: { toString: () => mockSessionId },
              createdAt: mockCreatedAt,
            }),
          },
        },
      ],
    })
      .overrideGuard(ClerkAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(DailyLimitGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<CardioController>(CardioController);
    preprocessingService = module.get(PreprocessingService);
    geminiService = module.get(GeminiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return AnalyzeResponseDto for a valid file', async () => {
    const result = await controller.analyze('test-user-id', mockFile());
    expect(result).toEqual({
      sessionId: mockSessionId,
      duration: 32,
      calories: 280,
      distance: 4.2,
      unit: 'km',
      createdAt: mockCreatedAt,
    });
  });

  it('should call PreprocessingService with the file buffer', async () => {
    const file = mockFile();
    await controller.analyze('test-user-id', file);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(preprocessingService.process).toHaveBeenCalledWith(file.buffer);
  });

  it('should call GeminiService with the preprocessed buffer', async () => {
    await controller.analyze('test-user-id', mockFile());
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(geminiService.analyze).toHaveBeenCalledWith(processedBuffer);
  });

  it('should propagate UnprocessableEntityException from GeminiService', async () => {
    geminiService.analyze.mockRejectedValue(
      new UnprocessableEntityException({
        message: 'Fotoğraf okunamadı',
        code: 'UNREADABLE_IMAGE',
      }),
    );
    await expect(
      controller.analyze('test-user-id', mockFile()),
    ).rejects.toThrow(UnprocessableEntityException);
  });
});

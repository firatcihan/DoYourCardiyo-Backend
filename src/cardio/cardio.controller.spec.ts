import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { Readable } from 'stream';
import { CardioController } from './cardio.controller';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { DebugImageService } from './debug-image.service';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

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

  const mockResult: AnalyzeResponseDto = {
    duration: 32,
    calories: 280,
    distance: 4.2,
    unit: 'km',
  };
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
          useValue: { analyze: jest.fn().mockResolvedValue(mockResult) },
        },
        {
          provide: DebugImageService,
          useValue: { save: jest.fn().mockResolvedValue(undefined) },
        },
      ],
    }).compile();

    controller = module.get<CardioController>(CardioController);
    preprocessingService = module.get(PreprocessingService);
    geminiService = module.get(GeminiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return AnalyzeResponseDto for a valid file', async () => {
    const result = await controller.analyze(mockFile());
    expect(result).toEqual(mockResult);
  });

  it('should call PreprocessingService with the file buffer', async () => {
    const file = mockFile();
    await controller.analyze(file);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(preprocessingService.process).toHaveBeenCalledWith(file.buffer);
  });

  it('should call GeminiService with the preprocessed buffer', async () => {
    await controller.analyze(mockFile());
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
    await expect(controller.analyze(mockFile())).rejects.toThrow(
      UnprocessableEntityException,
    );
  });
});

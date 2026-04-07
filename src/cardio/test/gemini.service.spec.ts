// backend/src/cardio/gemini.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import {
  UnprocessableEntityException,
  InternalServerErrorException,
} from '@nestjs/common';
import { GeminiService } from '../gemini.service';

describe('GeminiService', () => {
  let service: GeminiService;
  let mockGenerateContent: jest.Mock;

  beforeEach(async () => {
    mockGenerateContent = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: 'GEMINI_MODEL',
          useValue: { generateContent: mockGenerateContent },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return GeminiParsedResult when image is readable', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            readable: true,
            duration: 32,
            calories: 280,
            distance: 4.2,
            unit: 'km',
          }),
      },
    });

    const result = await service.analyze(Buffer.from('fake'));
    expect(result).toEqual({
      duration: 32,
      calories: 280,
      distance: 4.2,
      unit: 'km',
    });
  });

  it('should throw UnprocessableEntityException when readable is false', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ readable: false }) },
    });

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should throw UnprocessableEntityException when readable is true but fields are missing', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            readable: true,
            duration: 32,
            calories: null,
            distance: null,
            unit: null,
          }),
      },
    });

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(
      UnprocessableEntityException,
    );
  });

  it('should throw InternalServerErrorException on Gemini API error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('should pass base64-encoded buffer and correct mimeType to Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({
            readable: true,
            duration: 30,
            calories: 250,
            distance: 3.5,
            unit: 'km',
          }),
      },
    });

    const imageBuffer = Buffer.from('test-image-data');
    await service.analyze(imageBuffer);

    type GeminiContentPart = {
      text?: string;
      inlineData?: { data: string; mimeType: string };
    };
    const calls = mockGenerateContent.mock.calls as GeminiContentPart[][][];
    const callArgs = calls[0][0];
    expect(callArgs[1].inlineData?.data).toBe(imageBuffer.toString('base64'));
    expect(callArgs[1].inlineData?.mimeType).toBe('image/jpeg');
  });
});

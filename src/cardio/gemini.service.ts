// backend/src/cardio/gemini.service.ts
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { GenerativeModel } from '@google/generative-ai';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

const PROMPT = `This is a photo of a cardio machine display screen (treadmill, stationary bike, or stairmaster) showing a workout summary. Extract the workout data.

Return readable: false if the screen is not clearly visible or the values cannot be confidently read.
Return readable: true with the extracted values otherwise.
Distance unit: use "km" if metric, "miles" if imperial.`;

interface GeminiResponse {
  readable: boolean;
  duration?: number | null;
  calories?: number | null;
  distance?: number | null;
  unit?: 'km' | 'miles' | null;
}

@Injectable()
export class GeminiService {
  constructor(@Inject('GEMINI_MODEL') private readonly model: GenerativeModel) {}

  async analyze(imageBuffer: Buffer): Promise<AnalyzeResponseDto> {
    const base64 = imageBuffer.toString('base64');

    try {
      const result = await this.model.generateContent([
        { text: PROMPT },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ]);

      const data = JSON.parse(result.response.text()) as GeminiResponse;

      if (
        !data.readable ||
        data.duration == null ||
        data.calories == null ||
        data.distance == null ||
        data.unit == null
      ) {
        throw new UnprocessableEntityException({
          message: 'Fotoğraf okunamadı',
          code: 'UNREADABLE_IMAGE',
        });
      }

      return {
        duration: data.duration,
        calories: data.calories,
        distance: data.distance,
        unit: data.unit,
      };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new InternalServerErrorException('Gemini API hatası');
    }
  }
}

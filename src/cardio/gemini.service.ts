// backend/src/cardio/gemini.service.ts
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { GenerativeModel } from '@google/generative-ai';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

const PROMPT = `You are analyzing a photo of a cardio machine (treadmill, bike, stairmaster, elliptical).

FOCUS: Look only at the digital LCD/LED display showing workout numbers. Ignore all buttons, labels printed on the machine body, brand logos, and surrounding environment.

TASK: Find and extract these values from the display:
- Duration: the workout time shown on screen (convert to total minutes, e.g. "30:41" = 30.68 minutes)
- Calories: the calories/kcal number on the display
- Distance: the distance number on the display (if shown). Set to null if not displayed.
- Unit: "km" if metric, "miles" if imperial. Set to null if no distance is shown.
- Floors: the floors/stories climbed (stairmasters). Set to null if not displayed.

IMPORTANT:
- Match each number to its label on the display (e.g. "Calories", "Distance", "Time", "Floors"). Do not confuse values.
- Not all machines show every metric. Duration and calories are always expected. Distance and floors depend on the machine type.
- Ignore speed, incline, heart rate, level, SPM — do not map these to distance or floors.
- Return readable: false ONLY if the display numbers are too blurry, obscured, or cut off to read confidently.`;

interface GeminiResponse {
  readable: boolean;
  duration?: number | null;
  calories?: number | null;
  distance?: number | null;
  unit?: 'km' | 'miles' | null;
  floors?: number | null;
}

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);

  constructor(@Inject('GEMINI_MODEL') private readonly model: GenerativeModel) {}

  async analyze(imageBuffer: Buffer): Promise<AnalyzeResponseDto> {
    const base64 = imageBuffer.toString('base64');

    try {
      const result = await this.model.generateContent([
        { text: PROMPT },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ]);

      const rawText = result.response.text();
      this.logger.debug(`Gemini raw response: ${rawText}`);
      const data = JSON.parse(rawText) as GeminiResponse;

      if (
        !data.readable ||
        data.duration == null ||
        data.calories == null
      ) {
        throw new UnprocessableEntityException({
          message: 'Fotoğraf okunamadı',
          code: 'UNREADABLE_IMAGE',
        });
      }

      const response: AnalyzeResponseDto = {
        duration: data.duration,
        calories: data.calories,
      };
      if (data.distance != null && data.unit != null) {
        response.distance = data.distance;
        response.unit = data.unit;
      }
      if (data.floors != null) {
        response.floors = data.floors;
      }
      return response;
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      this.logger.error('Gemini API error', error instanceof Error ? error.message : error);
      throw new InternalServerErrorException('Gemini API hatası');
    }
  }
}

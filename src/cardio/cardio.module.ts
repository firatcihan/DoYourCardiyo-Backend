import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, Schema, SchemaType } from '@google/generative-ai';
import { CardioController } from './cardio.controller';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { DebugImageService } from './debug-image.service';

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    readable: { type: SchemaType.BOOLEAN },
    duration: {
      type: SchemaType.NUMBER,
      description: 'Workout duration in minutes',
    },
    calories: {
      type: SchemaType.NUMBER,
      description: 'Calories burned in kcal',
    },
    distance: { type: SchemaType.NUMBER, description: 'Distance covered' },
    unit: { type: SchemaType.STRING, format: 'enum', enum: ['km', 'miles'] },
    floors: { type: SchemaType.NUMBER, description: 'Floors climbed (stairmaster)' },
  },
  required: ['readable'],
};

@Module({
  controllers: [CardioController],
  providers: [
    PreprocessingService,
    GeminiService,
    DebugImageService,
    {
      provide: 'GEMINI_MODEL',
      useFactory: (config: ConfigService) => {
        const apiKey = config.getOrThrow<string>('gemini.apiKey');
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class CardioModule {}

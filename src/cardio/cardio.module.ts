import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CardioController } from './cardio.controller';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';

const responseSchema = {
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
    unit: { type: SchemaType.STRING, enum: ['km', 'miles'] },
  },
  required: ['readable'],
};

@Module({
  controllers: [CardioController],
  providers: [
    PreprocessingService,
    GeminiService,
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

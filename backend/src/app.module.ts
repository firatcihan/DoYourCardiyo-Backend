import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { geminiConfig } from './config/gemini.config';
import { CardioModule } from './cardio/cardio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig],
    }),
    CardioModule,
  ],
})
export class AppModule {}

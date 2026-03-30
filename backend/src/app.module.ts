import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { geminiConfig } from './config/gemini.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig],
    }),
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { geminiConfig } from './config/gemini.config';
import { CardioModule } from './cardio/cardio.module';
import { throttlerConfig } from './common/throttler/throttler.config';
import { CustomThrottlerGuard } from './common/throttler/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig],
    }),
    ThrottlerModule.forRoot(throttlerConfig),
    CardioModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { geminiConfig } from './config/gemini.config';
import { mongodbConfig } from './config/mongodb.config';
import { clerkConfig } from './config/clerk.config';
import { CardioModule } from './cardio/cardio.module';
import { ClubModule } from './club/club.module';
import { MemberModule } from './member/member.module';
import { throttlerConfig } from './common/throttler/throttler.config';
import { CustomThrottlerGuard } from './common/throttler/custom-throttler.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig, mongodbConfig, clerkConfig],
    }),
    MongooseModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('mongodb.uri'),
      }),
      inject: [ConfigService],
    }),
    ThrottlerModule.forRoot(throttlerConfig),
    CardioModule,
    ClubModule,
    MemberModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CustomThrottlerGuard,
    },
  ],
})
export class AppModule {}

import {
  Controller,
  Post,
  Get,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { DebugImageService } from './debug-image.service';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';
import { ThrottleAI } from '../common/throttler/throttle-profiles.decorator';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard';
import { DailyLimitGuard } from '../common/auth/daily-limit.guard';
import { UserId } from '../common/auth/user-id.decorator';
import { CardioSession } from './schemas/cardio-session.schema';
import { GetHistoryDto } from './dto/get-history.dto';
import { GetStatsDto } from './dto/get-stats.dto';
import { GetHistoryResponseDto } from './dto/get-history-response.dto';
import { GetStatsResponseDto } from './dto/get-stats-response.dto';

@Controller('cardio')
export class CardioController {
  constructor(
    private readonly preprocessingService: PreprocessingService,
    private readonly geminiService: GeminiService,
    private readonly debugImageService: DebugImageService,
    @InjectModel(CardioSession.name)
    private readonly cardioSessionModel: Model<CardioSession>,
  ) {}

  @Post('analyze')
  @UseGuards(ClerkAuthGuard, DailyLimitGuard)
  @ThrottleAI()
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }),
  )
  async analyze(
    @UserId() userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AnalyzeResponseDto> {
    const processedBuffer = await this.preprocessingService.process(
      file.buffer,
    );
    await this.debugImageService.save(processedBuffer);
    const result = await this.geminiService.analyze(processedBuffer);
    const session = await this.cardioSessionModel.create({
      userId,
      duration: result.duration,
      calories: result.calories,
      distance: result.distance,
      unit: result.unit,
      floors: result.floors,
    });
    return {
      sessionId: session._id.toString(),
      duration: result.duration,
      calories: result.calories,
      distance: result.distance,
      unit: result.unit,
      floors: result.floors,
      createdAt: session.createdAt,
    };
  }

  @Get('history')
  @UseGuards(ClerkAuthGuard)
  async getHistory(
    @UserId() userId: string,
    @Query() query: GetHistoryDto,
  ): Promise<GetHistoryResponseDto> {
    const pageNum = Math.max(1, parseInt(query.page ?? '1', 10) || 1);
    const limitNum = Math.min(
      50,
      Math.max(1, parseInt(query.limit ?? '10', 10) || 10),
    );
    const skip = (pageNum - 1) * limitNum;

    const [sessions, total] = await Promise.all([
      this.cardioSessionModel
        .find({ userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      this.cardioSessionModel.countDocuments({ userId }),
    ]);

    const items = sessions.map((s) => ({
      id: s._id.toString(),
      duration: s.duration,
      calories: s.calories,
      distance: s.distance,
      unit: s.unit,
      floors: s.floors,
      createdAt: s.createdAt,
    }));

    return { items, total, page: pageNum, limit: limitNum };
  }

  @Get('stats')
  @UseGuards(ClerkAuthGuard)
  async getStats(
    @UserId() userId: string,
    @Query() query: GetStatsDto,
  ): Promise<GetStatsResponseDto> {
    const period = query.period ?? 'weekly';
    const dateFrom = new Date();
    if (period === 'monthly') {
      dateFrom.setDate(dateFrom.getDate() - 30);
    } else {
      dateFrom.setDate(dateFrom.getDate() - 7);
    }

    interface StatsAggregation {
      totalDuration: number;
      totalCalories: number;
      totalDistance: number;
      sessionCount: number;
    }

    const [result] = await this.cardioSessionModel.aggregate<StatsAggregation>([
      { $match: { userId, createdAt: { $gte: dateFrom } } },
      {
        $group: {
          _id: null,
          totalDuration: { $sum: '$duration' },
          totalCalories: { $sum: '$calories' },
          totalDistance: { $sum: '$distance' },
          sessionCount: { $sum: 1 },
        },
      },
    ]);

    const stats: StatsAggregation = result ?? {
      totalDuration: 0,
      totalCalories: 0,
      totalDistance: 0,
      sessionCount: 0,
    };

    return {
      period,
      totalDuration: stats.totalDuration,
      totalCalories: stats.totalCalories,
      totalDistance: stats.totalDistance,
      sessionCount: stats.sessionCount,
    };
  }
}

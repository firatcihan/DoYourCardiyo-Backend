import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ThrottlerException } from '@nestjs/throttler';
import { CardioSession } from '../../cardio/schemas/cardio-session.schema';

const DAILY_LIMIT = 3;

@Injectable()
export class DailyLimitGuard implements CanActivate {
  constructor(
    @InjectModel(CardioSession.name)
    private readonly cardioSessionModel: Model<CardioSession>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ userId: string }>();

    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);

    const count = await this.cardioSessionModel.countDocuments({
      userId: request.userId,
      createdAt: { $gte: startOfDay },
    });

    if (count >= DAILY_LIMIT) {
      throw new ThrottlerException(
        'Günlük analiz limitinize ulaştınız (3/gün).',
      );
    }

    return true;
  }
}

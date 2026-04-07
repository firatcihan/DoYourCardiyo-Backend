import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Member } from './schemas/member.schema';
import { Club } from '../club/schemas/club.schema';
import { CardioSession } from '../cardio/schemas/cardio-session.schema';
import { RegisterMemberDto } from './dto/register-member.dto';

const ALLOWED_METRICS = ['calories', 'distance', 'duration'] as const;
type Metric = (typeof ALLOWED_METRICS)[number];

@Injectable()
export class MemberService {
  constructor(
    @InjectModel(Member.name) private readonly memberModel: Model<Member>,
    @InjectModel(Club.name) private readonly clubModel: Model<Club>,
    @InjectModel(CardioSession.name)
    private readonly cardioSessionModel: Model<CardioSession>,
  ) {}

  async register(userId: string, dto: RegisterMemberDto): Promise<Member> {
    const club = await this.clubModel.findById(dto.clubId);
    if (!club) {
      throw new NotFoundException('Seçilen kulüp bulunamadı.');
    }

    try {
      return await this.memberModel.create({ userId, ...dto });
    } catch (error: unknown) {
      if (
        error instanceof Error &&
        'code' in error &&
        (error as { code: number }).code === 11000
      ) {
        throw new ConflictException('Bu kullanıcı zaten kayıtlı.');
      }
      throw error;
    }
  }

  async findByUserId(userId: string): Promise<Member | null> {
    return this.memberModel.findOne({ userId }).populate('clubId');
  }

  async getLeaderboard(period: string, metric: string, clubId?: string) {
    if (!ALLOWED_METRICS.includes(metric as Metric)) {
      throw new BadRequestException(
        `Geçersiz metrik. İzin verilenler: ${ALLOWED_METRICS.join(', ')}`,
      );
    }

    const dateFrom = new Date();
    if (period === 'monthly') {
      dateFrom.setDate(dateFrom.getDate() - 30);
    } else {
      dateFrom.setDate(dateFrom.getDate() - 7);
    }

    const metricField = `$${metric}`;

    const matchStage: Record<string, unknown> = {
      createdAt: { $gte: dateFrom },
    };

    if (clubId) {
      const clubMembers = await this.memberModel
        .find({ clubId })
        .select('userId');
      const userIds = clubMembers.map((m) => m.userId);
      matchStage.userId = { $in: userIds };
    }

    interface IndividualAgg {
      userId: string;
      total: number;
      sessionCount: number;
      displayName?: string;
      avatarUrl?: string;
      clubName?: string;
    }

    const individualRaw =
      await this.cardioSessionModel.aggregate<IndividualAgg>([
        { $match: matchStage },
        {
          $group: {
            _id: '$userId',
            total: { $sum: { $ifNull: [metricField, 0] } },
            sessionCount: { $sum: 1 },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 50 },
        {
          $lookup: {
            from: 'members',
            localField: '_id',
            foreignField: 'userId',
            as: 'member',
          },
        },
        { $unwind: { path: '$member', preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: 'clubs',
            localField: 'member.clubId',
            foreignField: '_id',
            as: 'club',
          },
        },
        { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            total: 1,
            sessionCount: 1,
            displayName: '$member.displayName',
            avatarUrl: '$member.avatarUrl',
            clubName: '$club.name',
          },
        },
      ]);

    const individual = individualRaw.map((entry, index) => ({
      rank: index + 1,
      userId: String(entry.userId),
      total: entry.total,
      sessionCount: entry.sessionCount,
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      clubName: entry.clubName,
    }));

    interface ClubAgg {
      clubId: string;
      clubName?: string;
      total: number;
      memberCount: number;
      sessionCount: number;
    }

    const clubsRaw = await this.cardioSessionModel.aggregate<ClubAgg>([
      { $match: { createdAt: { $gte: dateFrom } } },
      {
        $lookup: {
          from: 'members',
          localField: 'userId',
          foreignField: 'userId',
          as: 'member',
        },
      },
      { $unwind: { path: '$member', preserveNullAndEmptyArrays: false } },
      {
        $group: {
          _id: '$member.clubId',
          total: { $sum: { $ifNull: [metricField, 0] } },
          memberCount: { $addToSet: '$userId' },
          sessionCount: { $sum: 1 },
        },
      },
      {
        $addFields: { memberCount: { $size: '$memberCount' } },
      },
      { $sort: { total: -1 } },
      {
        $lookup: {
          from: 'clubs',
          localField: '_id',
          foreignField: '_id',
          as: 'club',
        },
      },
      { $unwind: { path: '$club', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          clubId: '$_id',
          clubName: '$club.name',
          total: 1,
          memberCount: 1,
          sessionCount: 1,
        },
      },
    ]);

    const clubs = clubsRaw.map((entry, index) => ({
      rank: index + 1,
      clubId: String(entry.clubId),
      clubName: entry.clubName,
      total: entry.total,
      memberCount: entry.memberCount,
      sessionCount: entry.sessionCount,
    }));

    return { period, metric, individual, clubs };
  }
}

import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MemberService } from './member.service';
import { RegisterMemberDto } from './dto/register-member.dto';
import { GetLeaderboardDto } from './dto/get-leaderboard.dto';
import { GetLeaderboardResponseDto } from './dto/get-leaderboard-response.dto';
import { ClerkAuthGuard } from '../common/auth/clerk-auth.guard';
import { UserId } from '../common/auth/user-id.decorator';
import { ThrottleAuth } from '../common/throttler/throttle-profiles.decorator';

@Controller('members')
export class MemberController {
  constructor(private readonly memberService: MemberService) {}

  @Post('register')
  @UseGuards(ClerkAuthGuard)
  @ThrottleAuth()
  register(@UserId() userId: string, @Body() dto: RegisterMemberDto) {
    return this.memberService.register(userId, dto);
  }

  @Get('me')
  @UseGuards(ClerkAuthGuard)
  async getMe(@UserId() userId: string) {
    const member = await this.memberService.findByUserId(userId);
    if (!member) throw new NotFoundException('Üye kaydı bulunamadı.');
    return member;
  }

  @Get('leaderboard')
  @UseGuards(ClerkAuthGuard)
  getLeaderboard(
    @Query() query: GetLeaderboardDto,
  ): Promise<GetLeaderboardResponseDto> {
    return this.memberService.getLeaderboard(
      query.period ?? 'weekly',
      query.metric ?? 'calories',
      query.clubId,
    );
  }
}

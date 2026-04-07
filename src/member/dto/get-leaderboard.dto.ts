import { IsIn, IsMongoId, IsOptional } from 'class-validator';

export class GetLeaderboardDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  period?: string;

  @IsOptional()
  @IsIn(['calories', 'distance', 'duration'])
  metric?: string;

  @IsOptional()
  @IsMongoId()
  clubId?: string;
}

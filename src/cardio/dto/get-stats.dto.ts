import { IsIn, IsOptional } from 'class-validator';

export class GetStatsDto {
  @IsOptional()
  @IsIn(['weekly', 'monthly'])
  period?: string;
}

import { IsNumberString, IsOptional } from 'class-validator';

export class GetHistoryDto {
  @IsOptional()
  @IsNumberString()
  page?: string;

  @IsOptional()
  @IsNumberString()
  limit?: string;
}

import { IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RegisterMemberDto {
  @IsMongoId()
  clubId!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsString()
  @IsOptional()
  avatarUrl?: string;
}

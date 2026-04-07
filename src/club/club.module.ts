import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Club, ClubSchema } from './schemas/club.schema';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Club.name, schema: ClubSchema }]),
  ],
  controllers: [ClubController],
  providers: [ClubService],
  exports: [MongooseModule],
})
export class ClubModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Member, MemberSchema } from './schemas/member.schema';
import {
  CardioSession,
  CardioSessionSchema,
} from '../cardio/schemas/cardio-session.schema';
import { Club, ClubSchema } from '../club/schemas/club.schema';
import { MemberController } from './member.controller';
import { MemberService } from './member.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Member.name, schema: MemberSchema },
      { name: CardioSession.name, schema: CardioSessionSchema },
      { name: Club.name, schema: ClubSchema },
    ]),
  ],
  controllers: [MemberController],
  providers: [MemberService],
})
export class MemberModule {}

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type MemberDocument = HydratedDocument<Member>;

@Schema()
export class Member {
  @Prop({ required: true, unique: true })
  userId!: string;

  @Prop({ type: Types.ObjectId, ref: 'Club', required: true })
  clubId!: Types.ObjectId;

  @Prop({ required: true })
  displayName!: string;

  @Prop()
  avatarUrl?: string;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const MemberSchema = SchemaFactory.createForClass(Member);

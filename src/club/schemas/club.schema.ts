import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClubDocument = HydratedDocument<Club>;

@Schema()
export class Club {
  @Prop({ required: true, unique: true })
  name!: string;

  @Prop()
  description?: string;

  @Prop({ required: true })
  createdBy!: string;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const ClubSchema = SchemaFactory.createForClass(Club);

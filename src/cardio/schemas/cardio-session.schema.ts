import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CardioSessionDocument = HydratedDocument<CardioSession>;

@Schema()
export class CardioSession {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ required: true })
  duration!: number;

  @Prop({ required: true })
  calories!: number;

  @Prop()
  distance?: number;

  @Prop({ enum: ['km', 'miles'] })
  unit?: 'km' | 'miles';

  @Prop()
  floors?: number;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const CardioSessionSchema = SchemaFactory.createForClass(CardioSession);

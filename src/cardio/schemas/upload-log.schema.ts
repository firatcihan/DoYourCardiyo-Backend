import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type UploadLogDocument = HydratedDocument<UploadLog>;

@Schema()
export class UploadLog {
  @Prop({ required: true, index: true })
  userId!: string;

  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

export const UploadLogSchema = SchemaFactory.createForClass(UploadLog);

UploadLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 });

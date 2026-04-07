import { registerAs } from '@nestjs/config';

export const mongodbConfig = registerAs('mongodb', () => ({
  uri: process.env.MONGODB_URI,
}));

import { registerAs } from '@nestjs/config';

export const geminiConfig = registerAs('gemini', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey)
    throw new Error('GEMINI_API_KEY environment variable is required');
  return { apiKey };
});

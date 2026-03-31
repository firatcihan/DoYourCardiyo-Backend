// backend/test/cardio.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import sharp from 'sharp';
import { AppModule } from '../src/app.module';

async function createTestJpeg(): Promise<Buffer> {
  return sharp({
    create: { width: 400, height: 300, channels: 3, background: { r: 40, g: 40, b: 40 } },
  })
    .jpeg()
    .toBuffer();
}

function buildApp(geminiResponse: object): Promise<INestApplication> {
  return Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider('GEMINI_MODEL')
    .useValue({
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => JSON.stringify(geminiResponse) },
      }),
    })
    .compile()
    .then(async (moduleFixture: TestingModule) => {
      const app = moduleFixture.createNestApplication();
      await app.init();
      return app;
    });
}

describe('CardioController (e2e)', () => {
  let imageBuffer: Buffer;

  beforeAll(async () => {
    imageBuffer = await createTestJpeg();
  });

  it('POST /cardio/analyze returns 200 with workout data', async () => {
    const app = await buildApp({
      readable: true,
      duration: 30,
      calories: 250,
      distance: 3.5,
      unit: 'km',
    });

    const response = await request(app.getHttpServer())
      .post('/cardio/analyze')
      .attach('image', imageBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ duration: 30, calories: 250, distance: 3.5, unit: 'km' });
    await app.close();
  });

  it('POST /cardio/analyze returns 422 when image is unreadable', async () => {
    const app = await buildApp({ readable: false });

    const response = await request(app.getHttpServer())
      .post('/cardio/analyze')
      .attach('image', imageBuffer, { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(response.status).toBe(422);
    expect(response.body.message).toBe('Fotoğraf okunamadı');
    expect(response.body.code).toBe('UNREADABLE_IMAGE');
    await app.close();
  });

  it('POST /cardio/analyze returns 400 when no file is attached', async () => {
    const app = await buildApp({ readable: true });

    const response = await request(app.getHttpServer())
      .post('/cardio/analyze');

    expect(response.status).toBe(400);
    await app.close();
  });
});

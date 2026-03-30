# DoYourCardiyo — Image Processing Module Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a NestJS backend with a `POST /cardio/analyze` endpoint that accepts a gym machine photo, preprocesses it with Sharp, sends it to Gemini 2.0 Flash, and returns extracted workout data (duration, calories, distance).

**Architecture:** Multer receives multipart upload → `PreprocessingService` runs Sharp pipeline (resize/grayscale/sharpen/normalise) → `GeminiService` sends processed buffer to Gemini 2.0 Flash with structured JSON output → Controller returns 200 with data or 422 `UNREADABLE_IMAGE`.

**Tech Stack:** NestJS 10, TypeScript (strict), Sharp 0.33, @google/generative-ai, Jest

---

## File Map

| File | Responsibility |
|---|---|
| `backend/src/main.ts` | Bootstrap NestJS app |
| `backend/src/app.module.ts` | Root module — imports ConfigModule + CardioModule |
| `backend/src/config/gemini.config.ts` | Registers GEMINI_API_KEY with validation |
| `backend/src/cardio/cardio.module.ts` | Wires controller, services, and GEMINI_MODEL provider |
| `backend/src/cardio/cardio.controller.ts` | POST /cardio/analyze — file validation, orchestrates pipeline |
| `backend/src/cardio/cardio.controller.spec.ts` | Controller unit tests |
| `backend/src/cardio/preprocessing.service.ts` | Sharp: resize → grayscale → sharpen → normalise → jpeg buffer |
| `backend/src/cardio/preprocessing.service.spec.ts` | Preprocessing unit tests |
| `backend/src/cardio/gemini.service.ts` | Base64 → Gemini structured output → validate → AnalyzeResponseDto |
| `backend/src/cardio/gemini.service.spec.ts` | GeminiService unit tests with injected mock model |
| `backend/src/cardio/dto/analyze-response.dto.ts` | Response type definition |
| `backend/.env.example` | Documents required env vars |
| `backend/test/cardio.e2e-spec.ts` | E2E tests with mocked Gemini model |

---

### Task 1: Scaffold NestJS project and install dependencies

**Files:**
- Create: `backend/` directory via NestJS CLI

- [ ] **Step 1: Scaffold the project**

```bash
cd /Users/firatcihan/Desktop/DoYourCardiyo
npx @nestjs/cli new backend --package-manager npm --strict --skip-git
```

Expected: `backend/` directory created with NestJS boilerplate, `npm install` completed.

- [ ] **Step 2: Install additional dependencies**

```bash
cd backend
npm install sharp @google/generative-ai @nestjs/config
npm install -D @types/multer
```

Expected: All packages installed with no peer dependency errors.

- [ ] **Step 3: Verify dev server starts**

```bash
npm run start:dev
```

Expected: `Nest application successfully started` on port 3000. Ctrl+C to stop.

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "chore: scaffold NestJS backend"
```

---

### Task 2: AnalyzeResponseDto

**Files:**
- Create: `backend/src/cardio/dto/analyze-response.dto.ts`

- [ ] **Step 1: Create the directory and DTO**

```bash
mkdir -p src/cardio/dto
```

```typescript
// backend/src/cardio/dto/analyze-response.dto.ts
export class AnalyzeResponseDto {
  duration: number;  // minutes
  calories: number;  // kcal
  distance: number;  // numeric value
  unit: 'km' | 'miles';
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cardio/dto/analyze-response.dto.ts
git commit -m "feat: add AnalyzeResponseDto"
```

---

### Task 3: ConfigModule setup

**Files:**
- Create: `backend/src/config/gemini.config.ts`
- Modify: `backend/src/app.module.ts`
- Create: `backend/.env.example`

- [ ] **Step 1: Create gemini.config.ts**

```bash
mkdir -p src/config
```

```typescript
// backend/src/config/gemini.config.ts
import { registerAs } from '@nestjs/config';

export const geminiConfig = registerAs('gemini', () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY environment variable is required');
  return { apiKey };
});
```

- [ ] **Step 2: Update app.module.ts**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { geminiConfig } from './config/gemini.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig],
    }),
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Create .env.example and .env**

```bash
echo "GEMINI_API_KEY=" > .env.example
cp .env.example .env
```

Then open `.env` and add your actual `GEMINI_API_KEY` value.

- [ ] **Step 4: Verify .env is in .gitignore**

```bash
grep "^\.env$" .gitignore
```

Expected: `.env` is listed. If not, run `echo ".env" >> .gitignore`.

- [ ] **Step 5: Commit**

```bash
git add src/config/gemini.config.ts src/app.module.ts .env.example .gitignore
git commit -m "feat: add ConfigModule with Gemini API key validation"
```

---

### Task 4: PreprocessingService (TDD)

**Files:**
- Create: `backend/src/cardio/preprocessing.service.ts`
- Create: `backend/src/cardio/preprocessing.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/cardio/preprocessing.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PreprocessingService } from './preprocessing.service';
import sharp from 'sharp';

async function createTestJpeg(width = 100, height = 100): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 128, g: 128, b: 128 } },
  })
    .jpeg()
    .toBuffer();
}

describe('PreprocessingService', () => {
  let service: PreprocessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PreprocessingService],
    }).compile();
    service = module.get<PreprocessingService>(PreprocessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return a Buffer', async () => {
    const input = await createTestJpeg();
    const result = await service.process(input);
    expect(Buffer.isBuffer(result)).toBe(true);
  });

  it('should return a valid JPEG buffer', async () => {
    const input = await createTestJpeg();
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.format).toBe('jpeg');
  });

  it('should return a grayscale image', async () => {
    const input = await createTestJpeg();
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.channels).toBe(1);
  });

  it('should resize large images to fit within 800x800', async () => {
    const input = await createTestJpeg(2000, 1500);
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBeLessThanOrEqual(800);
    expect(metadata.height).toBeLessThanOrEqual(800);
  });

  it('should not upscale small images', async () => {
    const input = await createTestJpeg(100, 100);
    const result = await service.process(input);
    const metadata = await sharp(result).metadata();
    expect(metadata.width).toBe(100);
    expect(metadata.height).toBe(100);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=preprocessing.service.spec
```

Expected: FAIL — `Cannot find module './preprocessing.service'`

- [ ] **Step 3: Implement PreprocessingService**

```typescript
// backend/src/cardio/preprocessing.service.ts
import { Injectable } from '@nestjs/common';
import sharp from 'sharp';

@Injectable()
export class PreprocessingService {
  async process(imageBuffer: Buffer): Promise<Buffer> {
    return sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .grayscale()
      .sharpen({ sigma: 1.5 })
      .normalise()
      .jpeg({ quality: 85 })
      .toBuffer();
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=preprocessing.service.spec
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cardio/preprocessing.service.ts src/cardio/preprocessing.service.spec.ts
git commit -m "feat: add PreprocessingService with Sharp pipeline"
```

---

### Task 5: GeminiService (TDD)

**Files:**
- Create: `backend/src/cardio/gemini.service.ts`
- Create: `backend/src/cardio/gemini.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/cardio/gemini.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException, InternalServerErrorException } from '@nestjs/common';
import { GeminiService } from './gemini.service';

describe('GeminiService', () => {
  let service: GeminiService;
  let mockGenerateContent: jest.Mock;

  beforeEach(async () => {
    mockGenerateContent = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GeminiService,
        {
          provide: 'GEMINI_MODEL',
          useValue: { generateContent: mockGenerateContent },
        },
      ],
    }).compile();

    service = module.get<GeminiService>(GeminiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return AnalyzeResponseDto when image is readable', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({ readable: true, duration: 32, calories: 280, distance: 4.2, unit: 'km' }),
      },
    });

    const result = await service.analyze(Buffer.from('fake'));
    expect(result).toEqual({ duration: 32, calories: 280, distance: 4.2, unit: 'km' });
  });

  it('should throw UnprocessableEntityException when readable is false', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: { text: () => JSON.stringify({ readable: false }) },
    });

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw UnprocessableEntityException when readable is true but fields are missing', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({ readable: true, duration: 32, calories: null, distance: null, unit: null }),
      },
    });

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(UnprocessableEntityException);
  });

  it('should throw InternalServerErrorException on Gemini API error', async () => {
    mockGenerateContent.mockRejectedValueOnce(new Error('Network error'));

    await expect(service.analyze(Buffer.from('fake'))).rejects.toThrow(InternalServerErrorException);
  });

  it('should pass base64-encoded buffer and correct mimeType to Gemini', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        text: () =>
          JSON.stringify({ readable: true, duration: 30, calories: 250, distance: 3.5, unit: 'km' }),
      },
    });

    const imageBuffer = Buffer.from('test-image-data');
    await service.analyze(imageBuffer);

    const callArgs = mockGenerateContent.mock.calls[0][0];
    expect(callArgs[1].inlineData.data).toBe(imageBuffer.toString('base64'));
    expect(callArgs[1].inlineData.mimeType).toBe('image/jpeg');
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=gemini.service.spec
```

Expected: FAIL — `Cannot find module './gemini.service'`

- [ ] **Step 3: Implement GeminiService**

```typescript
// backend/src/cardio/gemini.service.ts
import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnprocessableEntityException,
} from '@nestjs/common';
import type { GenerativeModel } from '@google/generative-ai';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

const PROMPT = `This is a photo of a cardio machine display screen (treadmill, stationary bike, or stairmaster) showing a workout summary. Extract the workout data.

Return readable: false if the screen is not clearly visible or the values cannot be confidently read.
Return readable: true with the extracted values otherwise.
Distance unit: use "km" if metric, "miles" if imperial.`;

interface GeminiResponse {
  readable: boolean;
  duration?: number | null;
  calories?: number | null;
  distance?: number | null;
  unit?: 'km' | 'miles' | null;
}

@Injectable()
export class GeminiService {
  constructor(@Inject('GEMINI_MODEL') private readonly model: GenerativeModel) {}

  async analyze(imageBuffer: Buffer): Promise<AnalyzeResponseDto> {
    const base64 = imageBuffer.toString('base64');

    try {
      const result = await this.model.generateContent([
        { text: PROMPT },
        { inlineData: { mimeType: 'image/jpeg', data: base64 } },
      ]);

      const data = JSON.parse(result.response.text()) as GeminiResponse;

      if (
        !data.readable ||
        data.duration == null ||
        data.calories == null ||
        data.distance == null ||
        data.unit == null
      ) {
        throw new UnprocessableEntityException({
          message: 'Fotoğraf okunamadı',
          code: 'UNREADABLE_IMAGE',
        });
      }

      return {
        duration: data.duration,
        calories: data.calories,
        distance: data.distance,
        unit: data.unit,
      };
    } catch (error) {
      if (error instanceof UnprocessableEntityException) throw error;
      throw new InternalServerErrorException('Gemini API hatası');
    }
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=gemini.service.spec
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cardio/gemini.service.ts src/cardio/gemini.service.spec.ts
git commit -m "feat: add GeminiService with structured output and error handling"
```

---

### Task 6: CardioController (TDD)

**Files:**
- Create: `backend/src/cardio/cardio.controller.ts`
- Create: `backend/src/cardio/cardio.controller.spec.ts`

- [ ] **Step 1: Write the failing tests**

```typescript
// backend/src/cardio/cardio.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { UnprocessableEntityException } from '@nestjs/common';
import { CardioController } from './cardio.controller';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

const mockFile = (overrides: Partial<Express.Multer.File> = {}): Express.Multer.File => ({
  fieldname: 'image',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  size: 1024,
  buffer: Buffer.from('fake-image'),
  stream: null as any,
  destination: '',
  filename: '',
  path: '',
  ...overrides,
});

describe('CardioController', () => {
  let controller: CardioController;
  let preprocessingService: jest.Mocked<PreprocessingService>;
  let geminiService: jest.Mocked<GeminiService>;

  const mockResult: AnalyzeResponseDto = { duration: 32, calories: 280, distance: 4.2, unit: 'km' };
  const processedBuffer = Buffer.from('processed');

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CardioController],
      providers: [
        {
          provide: PreprocessingService,
          useValue: { process: jest.fn().mockResolvedValue(processedBuffer) },
        },
        {
          provide: GeminiService,
          useValue: { analyze: jest.fn().mockResolvedValue(mockResult) },
        },
      ],
    }).compile();

    controller = module.get<CardioController>(CardioController);
    preprocessingService = module.get(PreprocessingService);
    geminiService = module.get(GeminiService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return AnalyzeResponseDto for a valid file', async () => {
    const result = await controller.analyze(mockFile());
    expect(result).toEqual(mockResult);
  });

  it('should call PreprocessingService with the file buffer', async () => {
    const file = mockFile();
    await controller.analyze(file);
    expect(preprocessingService.process).toHaveBeenCalledWith(file.buffer);
  });

  it('should call GeminiService with the preprocessed buffer', async () => {
    await controller.analyze(mockFile());
    expect(geminiService.analyze).toHaveBeenCalledWith(processedBuffer);
  });

  it('should propagate UnprocessableEntityException from GeminiService', async () => {
    geminiService.analyze.mockRejectedValue(
      new UnprocessableEntityException({ message: 'Fotoğraf okunamadı', code: 'UNREADABLE_IMAGE' }),
    );
    await expect(controller.analyze(mockFile())).rejects.toThrow(UnprocessableEntityException);
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm test -- --testPathPattern=cardio.controller.spec
```

Expected: FAIL — `Cannot find module './cardio.controller'`

- [ ] **Step 3: Implement CardioController**

```typescript
// backend/src/cardio/cardio.controller.ts
import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';
import { AnalyzeResponseDto } from './dto/analyze-response.dto';

@Controller('cardio')
export class CardioController {
  constructor(
    private readonly preprocessingService: PreprocessingService,
    private readonly geminiService: GeminiService,
  ) {}

  @Post('analyze')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async analyze(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }),
          new FileTypeValidator({ fileType: /image\/(jpeg|jpg|png)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<AnalyzeResponseDto> {
    const processedBuffer = await this.preprocessingService.process(file.buffer);
    return this.geminiService.analyze(processedBuffer);
  }
}
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm test -- --testPathPattern=cardio.controller.spec
```

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cardio/cardio.controller.ts src/cardio/cardio.controller.spec.ts
git commit -m "feat: add CardioController with file validation and pipeline orchestration"
```

---

### Task 7: CardioModule + AppModule wiring

**Files:**
- Create: `backend/src/cardio/cardio.module.ts`
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Create CardioModule**

```typescript
// backend/src/cardio/cardio.module.ts
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';
import { CardioController } from './cardio.controller';
import { PreprocessingService } from './preprocessing.service';
import { GeminiService } from './gemini.service';

const responseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    readable: { type: SchemaType.BOOLEAN },
    duration: { type: SchemaType.NUMBER, description: 'Workout duration in minutes' },
    calories: { type: SchemaType.NUMBER, description: 'Calories burned in kcal' },
    distance: { type: SchemaType.NUMBER, description: 'Distance covered' },
    unit: { type: SchemaType.STRING, enum: ['km', 'miles'] },
  },
  required: ['readable'],
};

@Module({
  controllers: [CardioController],
  providers: [
    PreprocessingService,
    GeminiService,
    {
      provide: 'GEMINI_MODEL',
      useFactory: (config: ConfigService) => {
        const apiKey = config.getOrThrow<string>('gemini.apiKey');
        const genAI = new GoogleGenerativeAI(apiKey);
        return genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
          },
        });
      },
      inject: [ConfigService],
    },
  ],
})
export class CardioModule {}
```

- [ ] **Step 2: Update AppModule to import CardioModule**

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { geminiConfig } from './config/gemini.config';
import { CardioModule } from './cardio/cardio.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [geminiConfig],
    }),
    CardioModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Remove unused NestJS boilerplate**

```bash
rm src/app.controller.ts src/app.controller.spec.ts src/app.service.ts src/app.service.spec.ts
```

- [ ] **Step 4: Run all unit tests to confirm nothing broke**

```bash
npm test
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/cardio/cardio.module.ts src/app.module.ts
git rm src/app.controller.ts src/app.controller.spec.ts src/app.service.ts src/app.service.spec.ts
git commit -m "feat: wire CardioModule into AppModule, remove unused boilerplate"
```

---

### Task 8: E2E Tests

**Files:**
- Modify: `backend/test/cardio.e2e-spec.ts`
- Delete: `backend/test/app.e2e-spec.ts` (default boilerplate)

- [ ] **Step 1: Remove default e2e boilerplate**

```bash
rm test/app.e2e-spec.ts
```

- [ ] **Step 2: Write the e2e tests**

```typescript
// backend/test/cardio.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
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
```

- [ ] **Step 3: Run e2e tests**

```bash
npm run test:e2e
```

Expected: All 3 e2e tests PASS.

- [ ] **Step 4: Commit**

```bash
git add test/cardio.e2e-spec.ts
git rm test/app.e2e-spec.ts
git commit -m "test: add e2e tests for POST /cardio/analyze"
```

---

### Task 9: Manual Verification

- [ ] **Step 1: Start the server**

```bash
npm run start:dev
```

Expected: `Nest application successfully started` on port 3000.

- [ ] **Step 2: Test with a real cardio machine photo**

```bash
curl -X POST http://localhost:3000/cardio/analyze \
  -F "image=@/path/to/your/treadmill-photo.jpg"
```

Expected: `{"duration":<number>,"calories":<number>,"distance":<number>,"unit":"km"}`

- [ ] **Step 3: Test unreadable image (blurry or non-machine photo)**

```bash
curl -X POST http://localhost:3000/cardio/analyze \
  -F "image=@/path/to/irrelevant-photo.jpg"
```

Expected: HTTP 422 — `{"message":"Fotoğraf okunamadı","code":"UNREADABLE_IMAGE"}`

- [ ] **Step 4: Test file type validation**

```bash
curl -X POST http://localhost:3000/cardio/analyze \
  -F "image=@/path/to/document.pdf"
```

Expected: HTTP 400 validation error.

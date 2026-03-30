# DoYourCardiyo — Image Processing Module Design

**Date:** 2026-03-31
**Scope:** NestJS backend, image processing module only (no auth, no frontend)

---

## Context

Users take a photo of a cardio machine's summary screen (treadmill, stationary bike, stairmaster) after their workout. The app extracts three values from that photo: **duration (minutes)**, **calories (kcal)**, and **distance (km or miles)**. These values feed downstream features like visualization and streak tracking.

The core challenge is doing this extraction reliably without sending the full high-resolution photo directly to an AI — gym machine screens vary widely (LED segments, glare, angle, different fonts), so OCR alone is unreliable. The chosen approach is lightweight image preprocessing followed by Gemini 2.0 Flash Vision with structured output.

---

## Decisions Made

| Decision | Choice | Reasoning |
|---|---|---|
| Upload method | Gallery + camera (mobile web standard) | `<input type="file" accept="image/*">` gives both options natively on iOS/Android |
| Processing approach | Preprocessing + Vision LLM | Pure OCR accuracy too low (~55%) for variable gym screens |
| AI provider | Google Gemini 2.0 Flash | Cheapest + fastest Vision LLM for this use case |
| Preprocessing depth | Resize + enhance (no screen detection) | Screen region detection is brittle on real-world gym photos; simple enhancement is reliable |
| Error handling | Return 422, no manual entry | Data integrity over convenience — users retake photo |
| Fraud detection | Out of scope | Low cheat motivation (personal app, no competition); camera-only restriction rejected for UX cost |

---

## Architecture

### Endpoint

```
POST /cardio/analyze
Content-Type: multipart/form-data
Body: image (file)
```

### Module Structure

```
src/
  cardio/
    cardio.module.ts
    cardio.controller.ts
    preprocessing.service.ts
    gemini.service.ts
    dto/
      analyze-response.dto.ts
  config/
    gemini.config.ts
```

### Pipeline Flow

```
Incoming image (multipart)
  ↓
[CardioController]
  - Accept multipart via Multer
  - Pass buffer to service
  ↓
[PreprocessingService] — sharp
  1. Validate: image/jpeg or image/png, max 10MB
  2. resize(800, 800, { fit: 'inside', withoutEnlargement: true })
  3. grayscale()
  4. sharpen({ sigma: 1.5 })
  5. normalise()   ← auto-stretch contrast, helps with glare + low contrast LCDs
  6. jpeg({ quality: 85 })
  → returns Buffer
  ↓
[GeminiService] — @google/generative-ai
  1. Buffer → base64
  2. Send to Gemini 2.0 Flash with JSON schema (structured output)
  3. Validate response (readable flag)
  → returns CardioData | throws UnprocessableEntityException
  ↓
[CardioController]
  → 200 OK: { duration, calories, distance, unit }
  → 422 UNREADABLE_IMAGE: { message: "Fotoğraf okunamadı", code: "UNREADABLE_IMAGE" }
```

---

## Gemini Integration

### Structured Output Schema

```typescript
const responseSchema = {
  type: "object",
  properties: {
    readable:  { type: "boolean" },
    duration:  { type: "number", description: "Workout duration in minutes" },
    calories:  { type: "number", description: "Calories burned in kcal" },
    distance:  { type: "number", description: "Distance covered" },
    unit:      { type: "string", enum: ["km", "miles"] },
  },
  required: ["readable"],
};
```

### Prompt

```
This is a photo of a cardio machine display screen (treadmill, stationary bike, or stairmaster)
showing a workout summary. Extract the workout data.

Return readable: false if the screen is not clearly visible or the values cannot be confidently read.
Return readable: true with the extracted values otherwise.
Distance unit: use "km" if metric, "miles" if imperial.
```

### Error Logic

- `readable: false` → throw `UnprocessableEntityException` with code `UNREADABLE_IMAGE`
- Any field missing while `readable: true` → throw `UnprocessableEntityException` (treat as unreadable)
- Gemini API error → throw `InternalServerErrorException`

---

## Response DTOs

```typescript
// Success
export class AnalyzeResponseDto {
  duration: number;   // minutes
  calories: number;   // kcal
  distance: number;   // numeric value
  unit: 'km' | 'miles';
}

// Error
{
  message: "Fotoğraf okunamadı",
  code: "UNREADABLE_IMAGE"
}
```

---

## Dependencies

```json
{
  "sharp": "^0.33.x",
  "@google/generative-ai": "^0.21.x",
  "@nestjs/platform-express": "^10.x",
  "@types/multer": "^1.x",
  "class-validator": "^0.14.x",
  "class-transformer": "^0.5.x"
}
```

---

## Configuration

`GEMINI_API_KEY` environment variable required. Loaded via NestJS `ConfigModule`.

---

## Cost & Performance Estimates

Assuming 100 users × 30 workouts/month = **3,000 images/month**:

| Stage | Latency | Notes |
|---|---|---|
| Preprocessing (Sharp) | ~200-300ms | CPU-bound, synchronous Sharp pipeline |
| Gemini 2.0 Flash | ~800ms-1.5s | Network + inference |
| **Total** | **~1-2s** | Acceptable for a photo-upload flow |

**Cost:** ~$0.0010-0.0015 per image → **~$3-5/month** for 3,000 images.

---

## Verification

To test the module end-to-end after implementation:

1. Start the NestJS server
2. `POST /cardio/analyze` with a real treadmill/bike summary screen photo
3. Verify response contains valid `duration`, `calories`, `distance`, `unit`
4. `POST /cardio/analyze` with a blurry/irrelevant photo → verify `422 UNREADABLE_IMAGE`
5. `POST /cardio/analyze` with no file → verify validation error

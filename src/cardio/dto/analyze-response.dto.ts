export class AnalyzeResponseDto {
  sessionId: string; // created CardioSession _id
  duration: number; // minutes
  calories: number; // kcal
  distance?: number; // numeric value (not all machines show this)
  unit?: 'km' | 'miles'; // only present when distance is present
  floors?: number; // stairmaster floors
  createdAt: Date; // session creation timestamp
}

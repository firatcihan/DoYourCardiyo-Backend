export class AnalyzeResponseDto {
  duration: number;      // minutes
  calories: number;      // kcal
  distance?: number;     // numeric value (not all machines show this)
  unit?: 'km' | 'miles'; // only present when distance is present
  floors?: number;       // stairmaster floors
}

export class AnalyzeResponseDto {
  duration: number;  // minutes
  calories: number;  // kcal
  distance: number;  // numeric value
  unit: 'km' | 'miles';
}

export class GetStatsResponseDto {
  period: string; // 'weekly' | 'monthly'
  totalDuration: number;
  totalCalories: number;
  totalDistance: number;
  sessionCount: number;
}

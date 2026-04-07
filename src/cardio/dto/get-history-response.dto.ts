export class HistoryItemDto {
  id: string; // CardioSession _id as string
  duration: number; // minutes
  calories: number; // kcal
  distance?: number; // optional
  unit?: 'km' | 'miles'; // optional
  floors?: number; // optional
  createdAt: Date;
}

export class GetHistoryResponseDto {
  items: HistoryItemDto[];
  total: number;
  page: number;
  limit: number;
}

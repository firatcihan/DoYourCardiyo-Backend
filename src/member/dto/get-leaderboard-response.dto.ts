export class LeaderboardIndividualDto {
  rank: number;
  userId: string;
  total: number;
  sessionCount: number;
  displayName?: string;
  avatarUrl?: string;
  clubName?: string;
}

export class LeaderboardClubDto {
  rank: number;
  clubId: string;
  clubName?: string;
  total: number;
  memberCount: number;
  sessionCount: number;
}

export class GetLeaderboardResponseDto {
  period: string; // 'weekly' | 'monthly'
  metric: string; // 'calories' | 'distance' | 'duration'
  individual: LeaderboardIndividualDto[];
  clubs: LeaderboardClubDto[];
}

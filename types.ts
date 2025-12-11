
export interface Player {
  id: string;
  name: string;
}

export type MatchType = 'singles' | 'doubles';

export interface Match {
  id: string;
  type: MatchType;
  teamA: Player[];
  teamB: Player[];
  timestamp: number;
  aiCommentary?: string; // Optional field for Gemini generated content
}

export interface MatchConfig {
  type: MatchType;
  selectedPlayerIds: string[];
}

// --- Tournament Types ---

export interface Competitor {
  id: string;
  name: string;
  players: Player[];
  isBye?: boolean;
  isSeed?: boolean;      // Priority 1: Best positions + Priority Byes
  isSeparated?: boolean; // Priority 2: Good positions (separated) + No Priority Byes
  stats?: {              // For Round Robin
    wins: number;
    points: number;
    played: number;
  };
}

export interface TournamentMatch {
  id: string;
  round: number; // 1-based index (1 = First Round, etc.)
  matchIndex: number; // 0-based index within the round
  group?: 'A' | 'B' | 'Finals'; // For Round Robin
  competitorA: Competitor | null;
  competitorB: Competitor | null;
  scoreA?: number | string;
  scoreB?: number | string;
  winner: Competitor | null;
  nextMatchId: string | null;
}

export interface Tournament {
  id: string;
  type: MatchType;
  format: 'knockout' | 'round-robin-6'; // Format differentiator
  matches: TournamentMatch[];
  rounds: number;
  status: 'active' | 'completed';
  champion: Competitor | null;
  timestamp: number;
}

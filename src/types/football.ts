export type MatchStatus = 'scheduled' | 'finished' | 'live' | 'unknown';

export type DataSourceKind = 'openfootball' | 'realtime' | 'saved' | 'unknown';

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'reconnecting'
  | 'offline';

export interface TeamInfo {
  name: string;
  shortName?: string;
  crestUrl?: string;
}

export interface CompetitionInfo {
  id: number | string;
  name: string;
  code?: string;
}

export interface MatchItem {
  id: string;
  /**
   * Present only when a saved match detail route (/matches/:id) exists.
   * OpenFootball fixture rows without a saved match do not expose a detail route.
   */
  detailMatchId?: string;
  competition: CompetitionInfo;
  matchday?: string | number;
  kickoffAt: string;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  homeScore: number | null;
  awayScore: number | null;
  status: MatchStatus;
  /**
   * True only when backed by a verified real-time score source.
   * Always false for OpenFootball fixtures.
   */
  isLiveVerified: boolean;
  source: DataSourceKind;
  updatedAt?: string;
}

export interface FixturesSnapshot {
  fixtures: MatchItem[];
  updatedAt: string | null;
  leagueId: number;
  leagueName: string;
  availableCompetitions: CompetitionInfo[];
}

export type CommentaryEventType =
  | 'goal'
  | 'own_goal'
  | 'penalty'
  | 'missed_penalty'
  | 'yellow_card'
  | 'red_card'
  | 'substitution'
  | 'var'
  | 'kickoff'
  | 'halftime'
  | 'fulltime'
  | 'note';

export interface CommentaryEntry {
  id: string;
  matchId: string;
  minute: number | null;
  extraTime?: number | null;
  eventType: CommentaryEventType;
  eventLabel: string;
  team: string;
  actor: string;
  message: string;
  createdAt?: string;
  sequence?: number;
}

export type WsOutgoingMessage =
  | { type: 'subscribeFixtures'; league: number }
  | { type: 'unsubscribeFixtures'; league: number }
  | { type: 'subscribe'; matchId: number | string }
  | { type: 'unsubscribe'; matchId: number | string };

export interface WsRawMessage {
  type: string;
  [key: string]: unknown;
}

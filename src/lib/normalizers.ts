import type {
  CommentaryEntry,
  CommentaryEventType,
  CompetitionInfo,
  DataSourceKind,
  FixturesSnapshot,
  MatchItem,
  MatchStatus,
  TeamInfo,
} from '../types/football';

export const DEFAULT_LEAGUE_ID = 39;
export const DEFAULT_LEAGUE_NAME = 'Premier League';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  return undefined;
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function asBoolean(value: unknown): boolean {
  return value === true;
}

function normalizeTeam(raw: unknown, fallbackName: string): TeamInfo {
  if (typeof raw === 'string' && raw.trim()) {
    return { name: raw.trim() };
  }
  if (isRecord(raw)) {
    const name =
      asString(raw.name) ??
      asString(raw.teamName) ??
      asString(raw.shortName) ??
      fallbackName;
    const shortName = asString(raw.shortName) ?? asString(raw.tla);
    const crestUrl =
      asString(raw.crestUrl) ?? asString(raw.crest) ?? asString(raw.logo);
    return { name, shortName, crestUrl };
  }
  return { name: fallbackName };
}

function normalizeCompetition(
  raw: UnknownRecord,
  fallbackId: number = DEFAULT_LEAGUE_ID,
  fallbackName: string = DEFAULT_LEAGUE_NAME,
): CompetitionInfo {
  const compRaw = raw.competition ?? raw.league;
  if (typeof compRaw === 'string' && compRaw.trim()) {
    return {
      id: asNumber(raw.leagueId) ?? fallbackId,
      name: compRaw.trim(),
      code: asString(raw.leagueCode),
    };
  }
  if (isRecord(compRaw)) {
    return {
      id:
        asNumber(compRaw.id) ??
        asString(compRaw.id) ??
        asNumber(raw.leagueId) ??
        fallbackId,
      name: asString(compRaw.name) ?? fallbackName,
      code: asString(compRaw.code),
    };
  }
  return {
    id: asNumber(raw.leagueId) ?? fallbackId,
    name: asString(raw.competitionName) ?? asString(raw.leagueName) ?? fallbackName,
  };
}

function detectSourceKind(
  raw: UnknownRecord,
  defaultSource: DataSourceKind,
): { source: DataSourceKind; isLiveVerified: boolean } {
  const rawSource = (
    asString(raw.source) ??
    asString(raw.provider) ??
    asString(raw.dataSource) ??
    ''
  ).toLowerCase();

  const explicitLiveFlag =
    asBoolean(raw.isLiveVerified) ||
    asBoolean(raw.verifiedLive) ||
    asBoolean(raw.realtime);

  if (rawSource.includes('openfootball')) {
    return { source: 'openfootball', isLiveVerified: false };
  }

  if (
    rawSource === 'realtime' ||
    rawSource === 'live-feed' ||
    explicitLiveFlag
  ) {
    return { source: 'realtime', isLiveVerified: true };
  }

  return { source: defaultSource, isLiveVerified: false };
}

function normalizeStatus(
  rawStatus: unknown,
  isLiveVerified: boolean,
): { status: MatchStatus; liveActive: boolean } {
  const normalized = (asString(rawStatus) ?? '').toLowerCase();

  if (
    normalized === 'scheduled' ||
    normalized === 'timed' ||
    normalized === 'not_started' ||
    normalized === 'ns' ||
    normalized === 'upcoming'
  ) {
    return { status: 'scheduled', liveActive: false };
  }

  if (
    normalized === 'finished' ||
    normalized === 'ft' ||
    normalized === 'full_time' ||
    normalized === 'completed' ||
    normalized === 'ended'
  ) {
    return { status: 'finished', liveActive: false };
  }

  if (
    normalized === 'live' ||
    normalized === 'in_play' ||
    normalized === 'inplay' ||
    normalized === 'playing'
  ) {
    // Never mark OpenFootball or unverified sources as live
    if (isLiveVerified) {
      return { status: 'live', liveActive: true };
    }
    return { status: 'unknown', liveActive: false };
  }

  return { status: 'unknown', liveActive: false };
}

function extractScores(raw: UnknownRecord): {
  homeScore: number | null;
  awayScore: number | null;
} {
  const directHome = asNumber(raw.homeScore ?? raw.homeGoals);
  const directAway = asNumber(raw.awayScore ?? raw.awayGoals);
  if (directHome !== null || directAway !== null) {
    return { homeScore: directHome, awayScore: directAway };
  }

  const scoreObj = isRecord(raw.score)
    ? raw.score
    : isRecord(raw.goals)
      ? raw.goals
      : null;

  if (scoreObj) {
    const fullTime = isRecord(scoreObj.fullTime) ? scoreObj.fullTime : null;
    const home = asNumber(scoreObj.home ?? fullTime?.home);
    const away = asNumber(scoreObj.away ?? fullTime?.away);
    return { homeScore: home, awayScore: away };
  }

  return { homeScore: null, awayScore: null };
}

export function normalizeMatchItem(
  raw: unknown,
  options: {
    defaultSource: DataSourceKind;
    defaultLeagueId?: number;
    defaultLeagueName?: string;
    isSavedMatch?: boolean;
  },
): MatchItem | null {
  if (!isRecord(raw)) return null;

  const id =
    asString(raw.id) ??
    asString(raw.fixtureId) ??
    asString(raw.matchId) ??
    '';

  const homeTeamRaw = raw.homeTeam ?? raw.home ?? raw.homeTeamName;
  const awayTeamRaw = raw.awayTeam ?? raw.away ?? raw.awayTeamName;
  const homeTeam = normalizeTeam(homeTeamRaw, 'Home Team');
  const awayTeam = normalizeTeam(awayTeamRaw, 'Away Team');

  const kickoffAt =
    asString(raw.kickoffAt) ??
    asString(raw.startTime) ??
    asString(raw.utcDate) ??
    asString(raw.kickoff) ??
    asString(raw.date) ??
    '';

  const fallbackId = `${homeTeam.name}-${awayTeam.name}-${kickoffAt || 'tbd'}`;
  const resolvedId = id || fallbackId;

  const { source, isLiveVerified } = detectSourceKind(
    raw,
    options.defaultSource,
  );

  const { status, liveActive } = normalizeStatus(raw.status, isLiveVerified);
  const { homeScore, awayScore } = extractScores(raw);

  // Only expose detail link when a saved match detail view actually exists.
  const explicitMatchId =
    asString(raw.savedMatchId) ??
    (options.isSavedMatch ? resolvedId : asString(raw.matchId));
  const detailMatchId =
    options.isSavedMatch || asBoolean(raw.hasDetail) || Boolean(explicitMatchId)
      ? explicitMatchId ?? resolvedId
      : undefined;

  const metadataObj = isRecord(raw.metadata) ? raw.metadata : null;
  const sportText = asString(raw.sport);
  const formattedSport = sportText
    ? sportText.charAt(0).toUpperCase() + sportText.slice(1)
    : undefined;
  const savedFallbackName =
    asString(metadataObj?.competition) ??
    asString(metadataObj?.league) ??
    formattedSport ??
    'Saved match';

  const competition = normalizeCompetition(
    raw,
    options.defaultLeagueId ?? DEFAULT_LEAGUE_ID,
    options.defaultLeagueName ??
      (options.isSavedMatch ? savedFallbackName : DEFAULT_LEAGUE_NAME),
  );

  const matchdayValue = raw.matchday ?? raw.round;
  const matchday =
    typeof matchdayValue === 'number' || typeof matchdayValue === 'string'
      ? matchdayValue
      : undefined;

  return {
    id: resolvedId,
    detailMatchId,
    competition,
    matchday,
    kickoffAt,
    homeTeam,
    awayTeam,
    homeScore,
    awayScore,
    status,
    isLiveVerified: liveActive,
    source,
    updatedAt: asString(raw.updatedAt) ?? asString(raw.lastUpdated),
  };
}

function extractArrayAndMeta(payload: unknown): {
  items: unknown[];
  updatedAt: string | null;
  leagueId: number;
  leagueName: string;
} {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      updatedAt: null,
      leagueId: DEFAULT_LEAGUE_ID,
      leagueName: DEFAULT_LEAGUE_NAME,
    };
  }

  if (!isRecord(payload)) {
    return {
      items: [],
      updatedAt: null,
      leagueId: DEFAULT_LEAGUE_ID,
      leagueName: DEFAULT_LEAGUE_NAME,
    };
  }

  const container = isRecord(payload.snapshot) ? payload.snapshot : payload;

  const items = Array.isArray(container.fixtures)
    ? container.fixtures
    : Array.isArray(container.matches)
      ? container.matches
      : Array.isArray(container.data)
        ? container.data
        : Array.isArray(container.items)
          ? container.items
          : [];

  const updatedAt =
    asString(container.updatedAt) ??
    asString(container.lastUpdated) ??
    asString(container.fetchedAt) ??
    asString(payload.updatedAt) ??
    null;

  const leagueObj = isRecord(container.league) ? container.league : null;
  const leagueId =
    asNumber(container.leagueId) ??
    asNumber(container.league) ??
    asNumber(leagueObj?.id) ??
    DEFAULT_LEAGUE_ID;

  const leagueName =
    asString(container.leagueName) ??
    asString(leagueObj?.name) ??
    DEFAULT_LEAGUE_NAME;

  return { items, updatedAt, leagueId, leagueName };
}

export function normalizeFixturesSnapshot(
  payload: unknown,
  fallbackLeagueId: number = DEFAULT_LEAGUE_ID,
): FixturesSnapshot {
  const { items, updatedAt, leagueId, leagueName } =
    extractArrayAndMeta(payload);
  const resolvedLeagueId = leagueId || fallbackLeagueId;

  const fixtures = items
    .map((item) =>
      normalizeMatchItem(item, {
        defaultSource: 'openfootball',
        defaultLeagueId: resolvedLeagueId,
        defaultLeagueName: leagueName,
        isSavedMatch: false,
      }),
    )
    .filter((item): item is MatchItem => item !== null);

  const inferredUpdatedAt =
    updatedAt ??
    fixtures.find((f) => Boolean(f.updatedAt))?.updatedAt ??
    null;

  const compMap = new Map<string, CompetitionInfo>();
  for (const fixture of fixtures) {
    const key = String(fixture.competition.id);
    if (!compMap.has(key)) {
      compMap.set(key, fixture.competition);
    }
  }
  if (compMap.size === 0) {
    compMap.set(String(resolvedLeagueId), {
      id: resolvedLeagueId,
      name: leagueName,
    });
  }

  return {
    fixtures,
    updatedAt: inferredUpdatedAt,
    leagueId: resolvedLeagueId,
    leagueName,
    availableCompetitions: Array.from(compMap.values()),
  };
}

export function normalizeSavedMatches(payload: unknown): MatchItem[] {
  const { items } = extractArrayAndMeta(payload);
  return items
    .map((item) =>
      normalizeMatchItem(item, {
        defaultSource: 'saved',
        isSavedMatch: true,
      }),
    )
    .filter((item): item is MatchItem => item !== null);
}

const EVENT_TYPE_LABELS: Record<CommentaryEventType, string> = {
  goal: 'Goal',
  own_goal: 'Own goal',
  penalty: 'Penalty goal',
  missed_penalty: 'Missed penalty',
  yellow_card: 'Yellow card',
  red_card: 'Red card',
  substitution: 'Substitution',
  var: 'VAR review',
  kickoff: 'Kickoff',
  halftime: 'Half-time',
  fulltime: 'Full-time',
  note: 'Update',
};

function normalizeCommentaryEventType(rawType: unknown): CommentaryEventType {
  const val = (asString(rawType) ?? '').toLowerCase().replace(/[\s-]+/g, '_');

  if (val === 'goal' || val === 'score') return 'goal';
  if (val === 'own_goal' || val === 'owngoal') return 'own_goal';
  if (val === 'penalty' || val === 'penalty_goal') return 'penalty';
  if (val === 'missed_penalty' || val === 'penalty_missed')
    return 'missed_penalty';
  if (val === 'yellow_card' || val === 'yellow' || val === 'booking')
    return 'yellow_card';
  if (val === 'red_card' || val === 'red' || val === 'dismissal')
    return 'red_card';
  if (val === 'substitution' || val === 'sub') return 'substitution';
  if (val === 'var' || val === 'var_check') return 'var';
  if (val === 'kickoff' || val === 'kick_off' || val === 'start')
    return 'kickoff';
  if (val === 'halftime' || val === 'half_time' || val === 'ht')
    return 'halftime';
  if (val === 'fulltime' || val === 'full_time' || val === 'ft')
    return 'fulltime';
  return 'note';
}

export function normalizeCommentaryEntry(
  raw: unknown,
  fallbackMatchId?: string,
  index: number = 0,
): CommentaryEntry | null {
  if (!isRecord(raw)) return null;

  const matchId =
    asString(raw.matchId) ?? fallbackMatchId ?? '';
  const minute = asNumber(raw.minute ?? raw.elapsed ?? raw.time);
  const extraTime = asNumber(raw.extraTime ?? raw.addedTime);
  const eventType = normalizeCommentaryEventType(
    raw.eventType ?? raw.type ?? raw.event,
  );
  const eventLabel =
    asString(raw.eventLabel) ?? EVENT_TYPE_LABELS[eventType];

  const teamRaw = raw.team;
  const team =
    typeof teamRaw === 'string'
      ? teamRaw.trim()
      : isRecord(teamRaw)
        ? asString(teamRaw.name) ?? ''
        : asString(raw.teamName) ?? '';

  const actor =
    asString(raw.actor) ??
    asString(raw.player) ??
    asString(raw.author) ??
    '';

  const message =
    asString(raw.message) ??
    asString(raw.text) ??
    asString(raw.description) ??
    '';

  const createdAt = asString(raw.createdAt) ?? asString(raw.timestamp);
  const sequence = asNumber(raw.sequence) ?? undefined;
  const id =
    asString(raw.id) ??
    `${matchId}-${minute ?? 'x'}-${extraTime ?? 0}-${eventType}-${actor}-${index}`;

  return {
    id,
    matchId,
    minute,
    extraTime,
    eventType,
    eventLabel,
    team,
    actor,
    message,
    createdAt,
    sequence,
  };
}

export function normalizeCommentaryList(
  payload: unknown,
  matchId?: string,
): CommentaryEntry[] {
  let items: unknown[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (isRecord(payload)) {
    items = Array.isArray(payload.commentary)
      ? payload.commentary
      : Array.isArray(payload.data)
        ? payload.data
        : Array.isArray(payload.items)
          ? payload.items
          : [];
  }

  const normalized = items
    .map((item, idx) => normalizeCommentaryEntry(item, matchId, idx))
    .filter((entry): entry is CommentaryEntry => entry !== null);

  return sortCommentaryChronologically(normalized);
}

export function sortCommentaryChronologically(
  entries: CommentaryEntry[],
): CommentaryEntry[] {
  return [...entries].sort((a, b) => {
    const minA = a.minute ?? -1;
    const minB = b.minute ?? -1;
    if (minA !== minB) return minA - minB;

    const extA = a.extraTime ?? 0;
    const extB = b.extraTime ?? 0;
    if (extA !== extB) return extA - extB;

    if (a.sequence !== undefined && b.sequence !== undefined) {
      if (a.sequence !== b.sequence) return a.sequence - b.sequence;
    }

    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt.localeCompare(b.createdAt);
    }

    return a.id.localeCompare(b.id);
  });
}

export function mergeCommentaryEntries(
  existing: CommentaryEntry[],
  incoming: CommentaryEntry,
): CommentaryEntry[] {
  const withoutDuplicate = existing.filter((item) => item.id !== incoming.id);
  return sortCommentaryChronologically([...withoutDuplicate, incoming]);
}

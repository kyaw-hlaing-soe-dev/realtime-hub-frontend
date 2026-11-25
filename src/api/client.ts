import { getTodayDateKey } from '../lib/format';
import {
  DEFAULT_LEAGUE_ID,
  normalizeCommentaryList,
  normalizeFixturesSnapshot,
  normalizeMatchItem,
  normalizeSavedMatches,
} from '../lib/normalizers';
import type {
  CommentaryEntry,
  FixturesSnapshot,
  MatchItem,
} from '../types/football';

export class ApiError extends Error {
  readonly status: number;
  readonly retryable: boolean;

  constructor(message: string, status: number, retryable: boolean = true) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryable = retryable;
  }
}

export interface ApiClientConfig {
  baseUrl?: string;
}

function buildUrl(path: string, baseUrl: string = ''): string {
  if (!baseUrl) return path;
  const trimmedBase = baseUrl.replace(/\/+$/, '');
  return `${trimmedBase}${path}`;
}

async function fetchJson(
  url: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new ApiError(
      'Unable to reach the match data server. Check your connection and retry.',
      0,
      true,
    );
  }

  if (!response.ok) {
    const retryable = response.status >= 500 || response.status === 429;
    throw new ApiError(
      `Request failed with status ${response.status}.`,
      response.status,
      retryable,
    );
  }

  const text = await response.text();
  if (!text.trim()) return [];
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError('Received invalid JSON from server.', 502, true);
  }
}

export interface FetchFixturesOptions extends ApiClientConfig {
  date?: string;
  league?: number;
  signal?: AbortSignal;
}

export async function fetchTodayFixtures(
  options: FetchFixturesOptions = {},
): Promise<FixturesSnapshot> {
  const {
    date,
    league = DEFAULT_LEAGUE_ID,
    baseUrl = '',
    signal,
  } = options;

  const todayKey = getTodayDateKey();
  const params = new URLSearchParams();
  if (date && date !== todayKey) {
    params.set('date', date);
  }
  if (league !== DEFAULT_LEAGUE_ID) {
    params.set('league', String(league));
  }

  const query = params.toString();
  const path = query
    ? `/football/fixtures/today?${query}`
    : '/football/fixtures/today';

  const payload = await fetchJson(buildUrl(path, baseUrl), signal);
  return normalizeFixturesSnapshot(payload, league);
}

export async function fetchSavedMatches(
  limit: number = 20,
  options: ApiClientConfig & { signal?: AbortSignal } = {},
): Promise<MatchItem[]> {
  const { baseUrl = '', signal } = options;
  const payload = await fetchJson(
    buildUrl(`/matches?limit=${limit}`, baseUrl),
    signal,
  );
  return normalizeSavedMatches(payload);
}

export async function fetchMatchCommentary(
  matchId: string | number,
  limit: number = 100,
  options: ApiClientConfig & { signal?: AbortSignal } = {},
): Promise<CommentaryEntry[]> {
  const { baseUrl = '', signal } = options;
  const encodedId = encodeURIComponent(String(matchId));
  const payload = await fetchJson(
    buildUrl(`/matches/${encodedId}/commentary?limit=${limit}`, baseUrl),
    signal,
  );
  return normalizeCommentaryList(payload, String(matchId));
}

export async function fetchSavedMatchById(
  matchId: string | number,
  options: ApiClientConfig & { signal?: AbortSignal } = {},
): Promise<MatchItem | null> {
  const { baseUrl = '', signal } = options;
  const idText = String(matchId);

  try {
    const payload = await fetchJson(
      buildUrl(`/matches/${encodeURIComponent(idText)}`, baseUrl),
      signal,
    );
    const direct = normalizeMatchItem(payload, {
      defaultSource: 'saved',
      isSavedMatch: true,
    });
    if (direct) return direct;
    const list = normalizeSavedMatches(payload);
    const found = list.find((m) => m.id === idText || m.detailMatchId === idText);
    if (found) return found;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    if (error instanceof ApiError && error.status !== 404 && error.status !== 405) {
      throw error;
    }
  }

  const matches = await fetchSavedMatches(50, { baseUrl, signal });
  return (
    matches.find((m) => m.id === idText || m.detailMatchId === idText) ?? null
  );
}

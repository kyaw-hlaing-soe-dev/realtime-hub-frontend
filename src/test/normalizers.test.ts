import { describe, expect, it } from 'vitest';
import {
  mergeCommentaryEntries,
  normalizeCommentaryList,
  normalizeFixturesSnapshot,
  normalizeMatchItem,
  normalizeSavedMatches,
} from '../lib/normalizers';

describe('domain normalizers', () => {
  it('never marks OpenFootball fixtures as live even if raw status says live', () => {
    const fixture = normalizeMatchItem(
      {
        id: 'of-1',
        source: 'openfootball',
        status: 'LIVE',
        kickoffAt: '2020-01-01T15:00:00Z',
        homeTeam: 'Arsenal',
        awayTeam: 'Chelsea',
      },
      { defaultSource: 'openfootball' },
    );

    expect(fixture).not.toBeNull();
    expect(fixture?.status).toBe('unknown');
    expect(fixture?.isLiveVerified).toBe(false);
    expect(fixture?.detailMatchId).toBeUndefined();
  });

  it('allows live badge state only for verified real-time sources', () => {
    const match = normalizeMatchItem(
      {
        id: 'rt-1',
        source: 'realtime',
        isLiveVerified: true,
        status: 'IN_PLAY',
        homeTeam: { name: 'Liverpool' },
        awayTeam: { name: 'Everton' },
        score: { home: 2, away: 0 },
      },
      { defaultSource: 'saved', isSavedMatch: true },
    );

    expect(match?.status).toBe('live');
    expect(match?.isLiveVerified).toBe(true);
    expect(match?.homeScore).toBe(2);
    expect(match?.awayScore).toBe(0);
    expect(match?.detailMatchId).toBe('rt-1');
  });

  it('normalizes fixture snapshot arrays and envelopes with updatedAt', () => {
    const emptySnapshot = normalizeFixturesSnapshot([]);
    expect(emptySnapshot.fixtures).toEqual([]);
    expect(emptySnapshot.leagueId).toBe(39);

    const envelopeSnapshot = normalizeFixturesSnapshot({
      leagueId: 39,
      leagueName: 'Premier League',
      updatedAt: '2026-11-25T09:00:00Z',
      fixtures: [
        {
          id: 'fix-10',
          competition: { id: 39, name: 'Premier League' },
          matchday: 13,
          kickoffAt: '2026-11-25T19:45:00Z',
          homeTeam: { name: 'Arsenal' },
          awayTeam: { name: 'West Ham' },
          status: 'SCHEDULED',
        },
      ],
    });

    expect(envelopeSnapshot.updatedAt).toBe('2026-11-25T09:00:00Z');
    expect(envelopeSnapshot.fixtures).toHaveLength(1);
    expect(envelopeSnapshot.fixtures[0]?.status).toBe('scheduled');
    expect(envelopeSnapshot.fixtures[0]?.matchday).toBe(13);
    expect(envelopeSnapshot.fixtures[0]?.detailMatchId).toBeUndefined();
  });

  it('always assigns detailMatchId to saved matches', () => {
    const matches = normalizeSavedMatches({
      data: [
        {
          id: 123,
          homeTeam: 'Manchester City',
          awayTeam: 'Tottenham',
          homeScore: 1,
          awayScore: 1,
          status: 'FINISHED',
          kickoffAt: '2026-11-25T12:30:00Z',
        },
      ],
    });

    expect(matches).toHaveLength(1);
    expect(matches[0]?.id).toBe('123');
    expect(matches[0]?.detailMatchId).toBe('123');
    expect(matches[0]?.status).toBe('finished');
  });

  it('sorts and deduplicates commentary chronologically', () => {
    const initial = normalizeCommentaryList(
      [
        {
          id: 'c2',
          minute: 45,
          extraTime: 2,
          type: 'yellow_card',
          team: 'Chelsea',
          actor: 'Enzo Fernandez',
          message: 'Booked for halting the counter.',
        },
        {
          id: 'c1',
          minute: 12,
          type: 'goal',
          team: 'Arsenal',
          actor: 'Bukayo Saka',
          message: 'Curled into the far corner.',
        },
      ],
      '123',
    );

    expect(initial.map((e) => e.id)).toEqual(['c1', 'c2']);
    expect(initial[0]?.eventLabel).toBe('Goal');
    expect(initial[1]?.eventLabel).toBe('Yellow card');

    const merged = mergeCommentaryEntries(initial, {
      id: 'c3',
      matchId: '123',
      minute: 45,
      extraTime: 1,
      eventType: 'substitution',
      eventLabel: 'Substitution',
      team: 'Arsenal',
      actor: 'Leandro Trossard',
      message: 'Replaces injured winger.',
    });

    expect(merged.map((e) => e.id)).toEqual(['c1', 'c3', 'c2']);
  });
});

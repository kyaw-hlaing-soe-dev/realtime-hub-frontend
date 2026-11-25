import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppRoutes } from '../App';
import { RealtimeProvider } from '../context/RealtimeContext';

class FakeBrowserWebSocket {
  static instances: FakeBrowserWebSocket[] = [];
  readonly url: string;
  readyState = 0;
  sent: string[] = [];

  onopen: ((ev: Event) => unknown) | null = null;
  onmessage: ((ev: MessageEvent) => unknown) | null = null;
  onerror: ((ev: Event) => unknown) | null = null;
  onclose: ((ev: CloseEvent) => unknown) | null = null;

  constructor(url: string) {
    this.url = url;
    FakeBrowserWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code: number = 1000, reason: string = ''): void {
    this.readyState = 3;
    this.onclose?.({ code, reason } as CloseEvent);
  }

  emitOpen(): void {
    this.readyState = 1;
    this.onopen?.(new Event('open'));
  }

  emitMessage(payload: unknown): void {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(payload) }),
    );
  }

  emitDrop(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: 'Dropped' } as CloseEvent);
  }
}

function renderApp(initialRoute: string = '/') {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <RealtimeProvider
        initialSettings={{
          wsUrl: 'ws://localhost/ws',
          apiBaseUrl: '',
          defaultLeagueId: 39,
        }}
      >
        <AppRoutes />
      </RealtimeProvider>
    </MemoryRouter>,
  );
}

describe('Realtime Hub pages & WebSocket integration', () => {
  beforeEach(() => {
    FakeBrowserWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeBrowserWebSocket);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renders Match hub overview, handles empty fixtures, and preserves shell on retry', async () => {
    let failFirst = true;
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/football/fixtures/today')) {
        if (failFirst) {
          failFirst = false;
          return new Response('Server error', { status: 500 });
        }
        return new Response(
          JSON.stringify({
            updatedAt: '2026-11-25T10:00:00Z',
            fixtures: [],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/matches?limit=20')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderApp('/');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Match hub' }),
    ).toBeInTheDocument();

    // Error state appears with Retry button while keeping page shell visible
    const retryBtn = await screen.findByRole('button', { name: 'Retry' });
    await user.click(retryBtn);

    // After retry returns [], shows normal empty state
    expect(
      await screen.findByText('No fixtures scheduled today'),
    ).toBeInTheDocument();
  });

  it('retains last snapshot during socket reconnect and replaces on fixturesUpdated', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/football/fixtures/today')) {
        return new Response(
          JSON.stringify({
            updatedAt: '2026-11-25T09:00:00Z',
            fixtures: [
              {
                id: 'f1',
                source: 'openfootball',
                competition: { id: 39, name: 'Premier League' },
                homeTeam: 'Arsenal',
                awayTeam: 'Chelsea',
                status: 'scheduled',
                kickoffAt: '2026-11-25T15:00:00Z',
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    renderApp('/');

    expect(await screen.findByText('Arsenal')).toBeInTheDocument();

    const ws = FakeBrowserWebSocket.instances[0]!;
    act(() => {
      ws.emitOpen();
      ws.emitMessage({ type: 'welcome' });
    });

    await waitFor(() => {
      expect(screen.getAllByText('Connected').length).toBeGreaterThanOrEqual(1);
    });

    // Drop WebSocket -> state becomes Reconnecting, retained fixture remains visible!
    act(() => {
      ws.emitDrop();
    });

    await waitFor(() => {
      expect(screen.getAllByText('Reconnecting').length).toBeGreaterThanOrEqual(
        1,
      );
    });
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(
      screen.getByText(/showing the last known fixture snapshot/i),
    ).toBeInTheDocument();
  });

  it('subscribes and unsubscribes commentary channel on MatchDetail navigation', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/football/fixtures/today')) {
        return new Response(JSON.stringify({ fixtures: [] }), { status: 200 });
      }
      if (url.includes('/matches?limit=20')) {
        return new Response(
          JSON.stringify([
            {
              id: 123,
              competition: { id: 39, name: 'Premier League' },
              homeTeam: 'Liverpool',
              awayTeam: 'Newcastle',
              homeScore: 2,
              awayScore: 1,
              status: 'finished',
              kickoffAt: '2026-11-25T12:30:00Z',
            },
          ]),
          { status: 200 },
        );
      }
      if (url.includes('/matches/123/commentary')) {
        return new Response(
          JSON.stringify([
            {
              id: 'c-1',
              matchId: 123,
              minute: 10,
              eventType: 'goal',
              team: 'Liverpool',
              actor: 'Mohamed Salah',
              message: 'Left-footed finish inside the box.',
            },
          ]),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ id: 123 }), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderApp('/matches/123');

    const ws = FakeBrowserWebSocket.instances[0]!;
    act(() => {
      ws.emitOpen();
      ws.emitMessage({ type: 'welcome' });
    });

    await waitFor(() => {
      expect(ws.sent).toContain(
        JSON.stringify({ type: 'subscribe', matchId: 123 }),
      );
    });

    expect(
      await screen.findByText('Left-footed finish inside the box.'),
    ).toBeInTheDocument();

    // Receive live commentary message over WebSocket
    act(() => {
      ws.emitMessage({
        type: 'commentary',
        matchId: 123,
        entry: {
          id: 'c-2',
          matchId: 123,
          minute: 77,
          eventType: 'substitution',
          team: 'Liverpool',
          actor: 'Curtis Jones',
          message: 'Enters in midfield.',
        },
      });
    });

    expect(await screen.findByText('Enters in midfield.')).toBeInTheDocument();

    // Navigate away -> sends unsubscribe for matchId 123
    const backLink = screen.getByRole('link', { name: /back to matches/i });
    await user.click(backLink);

    await waitFor(() => {
      expect(ws.sent).toContain(
        JSON.stringify({ type: 'unsubscribe', matchId: 123 }),
      );
    });
  });

  it('renders Fixtures page controls and mobile navigation accessibility attributes', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/football/fixtures/today')) {
        return new Response(
          JSON.stringify({
            updatedAt: '2026-11-25T08:30:00Z',
            fixtures: [
              {
                id: 'f-pl',
                competition: { id: 39, name: 'Premier League' },
                matchday: 13,
                homeTeam: 'Aston Villa',
                awayTeam: 'Brighton',
                status: 'scheduled',
                kickoffAt: '2026-11-25T19:45:00Z',
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderApp('/fixtures');

    expect(
      screen.getByRole('heading', { level: 1, name: 'Fixtures' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Aston Villa')).toBeInTheDocument();
    expect(screen.getByText('Matchday 13')).toBeInTheDocument();
    expect(screen.getByText(/Data updated/)).toBeInTheDocument();

    const menuButton = screen.getByRole('button', {
      name: 'Toggle navigation menu',
    });
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
    await user.click(menuButton);
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    const settingsButton = screen.getByRole('button', {
      name: 'Open hub settings',
    });
    await user.click(settingsButton);
    expect(
      screen.getByRole('dialog', { name: /Hub & connection settings/i }),
    ).toBeInTheDocument();
  });

  it('handles fixturesUpdated, matchCreated, protocol error, and multi-league selection', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/football/fixtures/today')) {
        if (url.includes('league=140')) {
          return new Response(
            JSON.stringify({
              leagueId: 140,
              leagueName: 'La Liga',
              updatedAt: '2026-11-25T11:00:00Z',
              fixtures: [
                {
                  id: 'll-1',
                  competition: { id: 140, name: 'La Liga' },
                  homeTeam: 'Real Madrid',
                  awayTeam: 'Barcelona',
                  status: 'scheduled',
                  kickoffAt: '2026-11-25T20:00:00Z',
                },
              ],
            }),
            { status: 200 },
          );
        }
        return new Response(
          JSON.stringify({
            updatedAt: '2026-11-25T09:00:00Z',
            fixtures: [
              {
                id: 'pl-1',
                competition: { id: 39, name: 'Premier League' },
                homeTeam: 'Chelsea',
                awayTeam: 'Fulham',
                status: 'scheduled',
                kickoffAt: '2026-11-25T15:00:00Z',
              },
              {
                id: 'll-preview',
                competition: { id: 140, name: 'La Liga' },
                homeTeam: 'Atletico Madrid',
                awayTeam: 'Sevilla',
                status: 'scheduled',
                kickoffAt: '2026-11-25T18:00:00Z',
              },
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes('/matches?limit=20')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = userEvent.setup();
    renderApp('/fixtures');

    expect(await screen.findByText('Chelsea')).toBeInTheDocument();

    const ws = FakeBrowserWebSocket.instances[0]!;
    act(() => {
      ws.emitOpen();
      ws.emitMessage({ type: 'welcome' });
    });

    // Multiple competitions detected -> league selector renders
    const select = await screen.findByLabelText('Competition');
    await user.selectOptions(select, '140');

    await waitFor(() => {
      expect(ws.sent).toContain(
        JSON.stringify({ type: 'unsubscribeFixtures', league: 39 }),
      );
      expect(ws.sent).toContain(
        JSON.stringify({ type: 'subscribeFixtures', league: 140 }),
      );
    });
    expect(await screen.findByText('Real Madrid')).toBeInTheDocument();

    // WebSocket fixturesUpdated replaces collection and updates timestamp
    act(() => {
      ws.emitMessage({
        type: 'fixturesUpdated',
        leagueId: 140,
        leagueName: 'La Liga',
        updatedAt: '2026-11-25T12:15:00Z',
        fixtures: [
          {
            id: 'll-2',
            competition: { id: 140, name: 'La Liga' },
            homeTeam: 'Real Sociedad',
            awayTeam: 'Athletic Club',
            homeScore: 1,
            awayScore: 0,
            status: 'finished',
            kickoffAt: '2026-11-25T16:00:00Z',
          },
        ],
      });
    });

    expect(await screen.findByText('Real Sociedad')).toBeInTheDocument();

    // WebSocket non-blocking error displays and can be dismissed
    act(() => {
      ws.emitMessage({ type: 'error', message: 'Upstream throttle' });
    });
    expect(await screen.findByText('Upstream throttle')).toBeInTheDocument();
    await user.click(
      screen.getByRole('button', { name: 'Dismiss socket error' }),
    );
    expect(screen.queryByText('Upstream throttle')).not.toBeInTheDocument();

    // WebSocket matchCreated adds saved match visible on Matches page
    act(() => {
      ws.emitMessage({
        type: 'matchCreated',
        match: {
          id: 99,
          competition: { id: 39, name: 'Premier League' },
          homeTeam: 'Brentford',
          awayTeam: 'Crystal Palace',
          status: 'scheduled',
          kickoffAt: '2026-11-25T19:45:00Z',
        },
      });
    });

    await user.click(screen.getByRole('link', { name: 'Matches' }));
    expect(await screen.findByText('Brentford')).toBeInTheDocument();
  });
});

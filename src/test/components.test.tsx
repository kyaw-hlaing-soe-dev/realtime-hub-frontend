import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { CommentaryFeed } from '../components/CommentaryFeed';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { MatchRow } from '../components/MatchRow';
import { StatusBadge } from '../components/StatusBadge';
import type { CommentaryEntry, MatchItem } from '../types/football';

describe('Core UI components', () => {
  it('StatusBadge renders text + prevents unverified live indicator', () => {
    const { rerender } = render(
      <StatusBadge status="scheduled" isLiveVerified={false} />,
    );
    expect(screen.getByText('Scheduled')).toBeInTheDocument();

    rerender(<StatusBadge status="finished" isLiveVerified={false} />);
    expect(screen.getByText('Finished')).toBeInTheDocument();

    // Unverified live status must NOT show Live
    rerender(<StatusBadge status="live" isLiveVerified={false} />);
    expect(screen.queryByText('Live')).not.toBeInTheDocument();
    expect(screen.getByText('Unknown')).toBeInTheDocument();

    // Verified live source shows Live
    rerender(<StatusBadge status="live" isLiveVerified={true} />);
    expect(screen.getByText('Live')).toBeInTheDocument();
  });

  it('ConnectionIndicator renders all four WebSocket states', () => {
    const { rerender } = render(<ConnectionIndicator state="connected" />);
    expect(screen.getByText('Connected')).toBeInTheDocument();

    rerender(<ConnectionIndicator state="connecting" />);
    expect(screen.getByText('Connecting')).toBeInTheDocument();

    rerender(<ConnectionIndicator state="reconnecting" />);
    expect(screen.getByText('Reconnecting')).toBeInTheDocument();

    rerender(<ConnectionIndicator state="offline" />);
    expect(screen.getByText('Offline')).toBeInTheDocument();
  });

  it('MatchRow only turns into a link when detailMatchId exists', () => {
    const fixtureWithoutDetail: MatchItem = {
      id: 'fx-1',
      competition: { id: 39, name: 'Premier League' },
      kickoffAt: '2026-11-25T15:00:00Z',
      homeTeam: { name: 'Arsenal' },
      awayTeam: { name: 'Everton' },
      homeScore: null,
      awayScore: null,
      status: 'scheduled',
      isLiveVerified: false,
      source: 'openfootball',
    };

    const savedMatchWithDetail: MatchItem = {
      ...fixtureWithoutDetail,
      id: '42',
      detailMatchId: '42',
      homeTeam: { name: 'Liverpool' },
      awayTeam: { name: 'Tottenham' },
      homeScore: 2,
      awayScore: 1,
      status: 'finished',
      source: 'saved',
    };

    render(
      <MemoryRouter>
        <MatchRow match={fixtureWithoutDetail} />
        <MatchRow match={savedMatchWithDetail} />
      </MemoryRouter>,
    );

    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', '/matches/42');
    expect(screen.getByText('Arsenal')).toBeInTheDocument();
    expect(screen.getByText('Everton')).toBeInTheDocument();
    expect(screen.getByText('Liverpool')).toBeInTheDocument();
    expect(screen.getByText('Tottenham')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('CommentaryFeed displays empty state and accessible event labels', () => {
    const { rerender } = render(<CommentaryFeed entries={[]} />);
    expect(screen.getByText('No commentary entries yet')).toBeInTheDocument();

    const entries: CommentaryEntry[] = [
      {
        id: 'e1',
        matchId: '42',
        minute: 18,
        eventType: 'goal',
        eventLabel: 'Goal',
        team: 'Arsenal',
        actor: 'Martin Odegaard',
        message: 'Low drive inside the near post.',
      },
      {
        id: 'e2',
        matchId: '42',
        minute: 45,
        extraTime: 2,
        eventType: 'yellow_card',
        eventLabel: 'Yellow card',
        team: 'Everton',
        actor: 'James Tarkowski',
        message: 'Late challenge on the touchline.',
      },
    ];

    rerender(<CommentaryFeed entries={entries} />);
    expect(screen.getByText("18'")).toBeInTheDocument();
    expect(screen.getByText("45+2'")).toBeInTheDocument();
    expect(screen.getByText('Goal')).toBeInTheDocument();
    expect(screen.getByText('Yellow card')).toBeInTheDocument();
    expect(screen.getByText('Low drive inside the near post.')).toBeInTheDocument();
  });
});

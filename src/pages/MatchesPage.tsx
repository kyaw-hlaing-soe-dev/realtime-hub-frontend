import { useMemo, useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import { MatchRow } from '../components/MatchRow';
import { MatchRowSkeleton } from '../components/MatchRowSkeleton';
import { EmptyState, ErrorBanner } from '../components/StateFeedback';
import { useRealtimeHub } from '../context/RealtimeContext';
import type { MatchStatus } from '../types/football';

type StatusFilter = 'all' | 'scheduled' | 'finished';

export function MatchesPage() {
  const {
    savedMatches,
    savedMatchesLoading,
    savedMatchesError,
    refreshSavedMatches,
  } = useRealtimeHub();

  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const filteredMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return savedMatches.filter((match) => {
      if (statusFilter !== 'all') {
        const matchesStatus: MatchStatus = match.status;
        if (matchesStatus !== statusFilter) return false;
      }
      if (!q) return true;
      return (
        match.homeTeam.name.toLowerCase().includes(q) ||
        match.awayTeam.name.toLowerCase().includes(q) ||
        match.competition.name.toLowerCase().includes(q)
      );
    });
  }, [savedMatches, query, statusFilter]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[#2A3730] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="type-page-title text-[#F2F6F3]">Matches</h1>
          <p className="mt-1 text-[14px] leading-[20px] text-[#A0ADA5]">
            Saved matches with full commentary logs and real-time event
            subscriptions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshSavedMatches()}
          disabled={savedMatchesLoading}
          className="inline-flex h-9 items-center gap-2 self-start rounded-[10px] border border-[#2A3730] bg-[#121A16] px-3 text-[13px] leading-[18px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A] disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw
            aria-hidden="true"
            className={`h-3.5 w-3.5 ${savedMatchesLoading ? 'animate-spin' : ''}`}
          />
          <span>Refresh</span>
        </button>
      </header>

      <section
        aria-label="Filter saved matches"
        className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#2A3730] bg-[#121A16] p-4 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1 sm:max-w-xs">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-[#A0ADA5]"
          />
          <input
            type="search"
            aria-label="Search saved matches by team or competition"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by team or league"
            className="h-9 w-full rounded-[10px] border border-[#2A3730] bg-[#0B100E] pr-3 pl-9 text-[14px] leading-[20px] text-[#F2F6F3] placeholder:text-[#A0ADA5] motion-interactive focus:border-[#B9F36A]"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by match status"
          className="flex flex-wrap items-center gap-1.5"
        >
          {(['all', 'scheduled', 'finished'] as const).map((option) => {
            const active = statusFilter === option;
            const label =
              option === 'all'
                ? 'All'
                : option === 'scheduled'
                  ? 'Scheduled'
                  : 'Finished';
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setStatusFilter(option)}
                className={`rounded-full border px-3 py-1 text-[12px] leading-[16px] font-medium motion-interactive ${
                  active
                    ? 'border-[#B9F36A]/50 bg-[#19231E] text-[#B9F36A]'
                    : 'border-[#2A3730] bg-[#0B100E] text-[#A0ADA5] hover:text-[#F2F6F3]'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </section>

      <section aria-label="Saved matches list">
        {savedMatchesLoading && savedMatches.length === 0 ? (
          <MatchRowSkeleton count={5} label="Loading saved matches" />
        ) : savedMatchesError && savedMatches.length === 0 ? (
          <ErrorBanner
            title="Could not load saved matches"
            message={savedMatchesError}
            onRetry={() => void refreshSavedMatches()}
          />
        ) : filteredMatches.length === 0 ? (
          <EmptyState
            title={
              savedMatches.length === 0
                ? 'No saved matches available'
                : 'No matches match your filter'
            }
            description={
              savedMatches.length === 0
                ? 'Saved matches appear here when added on the backend.'
                : 'Try clearing the search query or switching status filter.'
            }
            action={
              savedMatches.length > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    setStatusFilter('all');
                  }}
                  className="rounded-[10px] bg-[#B9F36A] px-4 py-2 text-[14px] leading-[20px] font-semibold text-[#0B100E] motion-interactive hover:opacity-90"
                >
                  Clear filters
                </button>
              ) : null
            }
          />
        ) : (
          <ul className="space-y-2">
            {filteredMatches.map((match) => (
              <li key={match.id}>
                <MatchRow match={match} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

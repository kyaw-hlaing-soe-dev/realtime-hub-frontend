import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays } from 'lucide-react';
import { useRealtimeHub } from '../context/RealtimeContext';
import { formatDataUpdated, getTodayDateKey } from '../lib/format';
import { ConnectionIndicator } from '../components/ConnectionIndicator';
import { FixtureList } from '../components/FixtureList';
import { MatchRow } from '../components/MatchRow';
import { MatchRowSkeleton } from '../components/MatchRowSkeleton';
import {
  EmptyState,
  ErrorBanner,
  StaleSnapshotNotice,
} from '../components/StateFeedback';

export function OverviewPage() {
  const {
    connectionState,
    reconnectSocket,
    fixturesSnapshot,
    fixturesLoading,
    fixturesError,
    isSnapshotStale,
    refreshTodayFixtures,
    savedMatches,
    savedMatchesLoading,
    savedMatchesError,
    refreshSavedMatches,
  } = useRealtimeHub();

  const todayKey = getTodayDateKey();
  const hasFixtures = fixturesSnapshot.fixtures.length > 0;
  const recentSavedMatches = savedMatches.slice(0, 6);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <header className="flex flex-col justify-between gap-4 border-b border-[#2A3730] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="type-page-title text-[#F2F6F3]">Match hub</h1>
          <p className="mt-1 text-[14px] leading-[20px] text-[#A0ADA5]">
            Today’s {fixturesSnapshot.leagueName} schedule and recently saved
            match streams.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <ConnectionIndicator state={connectionState} />
          <span className="tabular-nums-strict type-metadata rounded-full border border-[#2A3730] bg-[#121A16] px-3 py-1 text-[#A0ADA5]">
            {fixturesSnapshot.updatedAt ? (
              <time dateTime={fixturesSnapshot.updatedAt}>
                {formatDataUpdated(fixturesSnapshot.updatedAt)}
              </time>
            ) : (
              'Data updated —'
            )}
          </span>
        </div>
      </header>

      {/* Primary panel: Today's Premier League fixtures */}
      <section aria-labelledby="overview-today-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="overview-today-heading"
              className="type-section-title text-[#F2F6F3]"
            >
              Today’s {fixturesSnapshot.leagueName} fixtures
            </h2>
            <p className="type-metadata mt-0.5 text-[#A0ADA5]">
              Daily fixture snapshot from OpenFootball — scores reflect verified
              results only.
            </p>
          </div>
          <Link
            to="/fixtures"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#2A3730] bg-[#121A16] px-3 py-1.5 text-[12px] leading-[16px] font-medium text-[#B9F36A] motion-interactive hover:border-[#B9F36A]/50 hover:bg-[#19231E]"
          >
            <span>All fixtures</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isSnapshotStale && hasFixtures ? (
          <StaleSnapshotNotice
            message="WebSocket is reconnecting — showing the last known fixture snapshot."
            onReconnect={reconnectSocket}
          />
        ) : null}

        {fixturesLoading && !hasFixtures ? (
          <MatchRowSkeleton
            count={4}
            label={`Loading today's ${fixturesSnapshot.leagueName} fixtures`}
          />
        ) : fixturesError && !hasFixtures ? (
          <ErrorBanner
            title="Could not load today's fixtures"
            message={fixturesError}
            onRetry={() => void refreshTodayFixtures()}
          />
        ) : !hasFixtures ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No fixtures scheduled today"
            description={`There are no ${fixturesSnapshot.leagueName} fixtures scheduled for today.`}
            action={
              <Link
                to="/fixtures"
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-[#B9F36A] px-4 py-2 text-[14px] leading-[20px] font-semibold text-[#0B100E] motion-interactive hover:opacity-90"
              >
                <span>Choose another date</span>
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            }
          />
        ) : (
          <FixtureList
            fixtures={fixturesSnapshot.fixtures}
            fallbackDateKey={todayKey}
            isStale={isSnapshotStale}
            showDateHeaders={false}
          />
        )}
      </section>

      {/* Secondary panel: Recent saved matches */}
      <section aria-labelledby="overview-saved-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="overview-saved-heading"
              className="type-section-title text-[#F2F6F3]"
            >
              Recent saved matches
            </h2>
            <p className="type-metadata mt-0.5 text-[#A0ADA5]">
              Select a saved match to open its commentary timeline.
            </p>
          </div>
          <Link
            to="/matches"
            className="inline-flex items-center gap-1.5 rounded-[10px] border border-[#2A3730] bg-[#121A16] px-3 py-1.5 text-[12px] leading-[16px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A]"
          >
            <span>All saved matches</span>
            <ArrowRight aria-hidden="true" className="h-3.5 w-3.5" />
          </Link>
        </div>

        {savedMatchesLoading && savedMatches.length === 0 ? (
          <MatchRowSkeleton count={3} label="Loading saved matches" />
        ) : savedMatchesError && savedMatches.length === 0 ? (
          <ErrorBanner
            title="Could not load saved matches"
            message={savedMatchesError}
            onRetry={() => void refreshSavedMatches()}
          />
        ) : recentSavedMatches.length === 0 ? (
          <EmptyState
            title="No saved matches yet"
            description="Saved matches with commentary feeds will appear here once created."
          />
        ) : (
          <ul className="space-y-2">
            {recentSavedMatches.map((match) => (
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

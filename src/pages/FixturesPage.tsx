import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ApiError, fetchTodayFixtures } from '../api/client';
import { FixtureList } from '../components/FixtureList';
import { MatchRowSkeleton } from '../components/MatchRowSkeleton';
import {
  EmptyState,
  ErrorBanner,
  StaleSnapshotNotice,
} from '../components/StateFeedback';
import { useRealtimeHub } from '../context/RealtimeContext';
import {
  extractDateKey,
  formatDataUpdated,
  formatDateLabel,
  formatShortDateLabel,
  getTodayDateKey,
  shiftDateKey,
} from '../lib/format';
import type { FixturesSnapshot } from '../types/football';

export function FixturesPage() {
  const {
    fixturesSnapshot,
    fixturesLoading,
    fixturesError,
    isSnapshotStale,
    refreshTodayFixtures,
    activeLeagueId,
    setActiveLeagueId,
    availableCompetitions,
    reconnectSocket,
    settings,
    announce,
  } = useRealtimeHub();

  const todayKey = getTodayDateKey();
  const [selectedDate, setSelectedDate] = useState<string>(todayKey);
  const [customSnapshot, setCustomSnapshot] = useState<FixturesSnapshot | null>(
    null,
  );
  const [customLoading, setCustomLoading] = useState<boolean>(false);
  const [customError, setCustomError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const dateInputRef = useRef<HTMLInputElement | null>(null);
  const isTodaySelected = selectedDate === todayKey;

  const loadCustomDate = useCallback(
    async (dateKey: string, leagueId: number, signal?: AbortSignal) => {
      setCustomLoading(true);
      setCustomError(null);
      try {
        const snapshot = await fetchTodayFixtures({
          date: dateKey,
          league: leagueId,
          baseUrl: settings.apiBaseUrl,
          signal,
        });
        setCustomSnapshot(snapshot);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        const msg =
          error instanceof ApiError
            ? error.message
            : 'Unable to load fixtures for the selected date.';
        setCustomError(msg);
      } finally {
        setCustomLoading(false);
      }
    },
    [settings.apiBaseUrl],
  );

  useEffect(() => {
    if (isTodaySelected) {
      setCustomSnapshot(null);
      setCustomError(null);
      setCustomLoading(false);
      return;
    }

    const controller = new AbortController();
    void loadCustomDate(selectedDate, activeLeagueId, controller.signal);
    return () => controller.abort();
  }, [isTodaySelected, selectedDate, activeLeagueId, reloadNonce, loadCustomDate]);

  const activeSnapshot = isTodaySelected
    ? fixturesSnapshot
    : (customSnapshot ?? fixturesSnapshot);

  const filteredFixtures = useMemo(() => {
    return activeSnapshot.fixtures.filter((fixture) => {
      const matchesLeague =
        String(fixture.competition.id) === String(activeLeagueId) ||
        availableCompetitions.length <= 1;

      if (!matchesLeague) return false;

      if (isTodaySelected) {
        return true;
      }

      const fixtureLocalDate = extractDateKey(fixture.kickoffAt);
      const fixtureIsoPrefix = /^\d{4}-\d{2}-\d{2}/.test(fixture.kickoffAt)
        ? fixture.kickoffAt.slice(0, 10)
        : null;

      if (fixtureLocalDate || fixtureIsoPrefix) {
        return (
          fixtureLocalDate === selectedDate ||
          fixtureIsoPrefix === selectedDate
        );
      }
      return customSnapshot !== null;
    });
  }, [
    activeSnapshot.fixtures,
    activeLeagueId,
    availableCompetitions.length,
    selectedDate,
    isTodaySelected,
    customSnapshot,
  ]);

  const selectDate = (nextDate: string) => {
    setSelectedDate(nextDate);
    announce(`Selected fixtures date: ${formatDateLabel(nextDate, todayKey)}`);
  };

  const handleLeagueChange = (nextLeagueId: number) => {
    setActiveLeagueId(nextLeagueId);
    const chosen = availableCompetitions.find(
      (c) => Number(c.id) === nextLeagueId,
    );
    if (chosen) {
      announce(`Selected competition: ${chosen.name}`);
    }
  };

  const isLoading = isTodaySelected ? fixturesLoading : customLoading;
  const activeError = isTodaySelected ? fixturesError : customError;
  const showStale = isTodaySelected && isSnapshotStale;
  const updatedAt = activeSnapshot.updatedAt;
  const activeCompetition =
    availableCompetitions.find((c) => Number(c.id) === activeLeagueId) ??
    availableCompetitions[0] ?? {
      id: activeLeagueId,
      name: activeSnapshot.leagueName,
    };

  const retryLoad = () => {
    if (isTodaySelected) {
      void refreshTodayFixtures();
    } else {
      setReloadNonce((n) => n + 1);
    }
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    input.focus();
    if (typeof input.showPicker === 'function') {
      try {
        input.showPicker();
      } catch {
        // showPicker may reject when triggered outside direct user gesture in some browsers
      }
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col justify-between gap-4 border-b border-[#2A3730] pb-6 sm:flex-row sm:items-end">
        <div>
          <h1 className="type-page-title text-[#F2F6F3]">Fixtures</h1>
          <p className="mt-1 text-[14px] leading-[20px] text-[#A0ADA5]">
            Daily fixture schedule and verified final results grouped by date,
            competition, and matchday.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="type-metadata rounded-full border border-[#2A3730] bg-[#121A16] px-3 py-1 font-medium text-[#F2F6F3]">
            {activeCompetition.name}
          </span>
          <span className="tabular-nums-strict type-metadata rounded-full border border-[#2A3730] bg-[#121A16] px-3 py-1 text-[#A0ADA5]">
            {updatedAt ? (
              <time dateTime={updatedAt}>{formatDataUpdated(updatedAt)}</time>
            ) : (
              'Data updated —'
            )}
          </span>
        </div>
      </header>

      {/* Date and competition controls */}
      <section
        aria-label="Fixture filters"
        className="flex flex-col justify-between gap-4 rounded-[10px] border border-[#2A3730] bg-[#121A16] p-4 lg:flex-row lg:items-center"
      >
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => selectDate(shiftDateKey(selectedDate, -1))}
            aria-label="Previous day"
            className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 text-[13px] leading-[18px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A]"
          >
            <ChevronLeft aria-hidden="true" className="h-4 w-4" />
            <span>Prev</span>
          </button>

          <label className="relative inline-flex items-center">
            <span className="sr-only">Select fixture date</span>
            <Calendar
              aria-hidden="true"
              className="pointer-events-none absolute left-3 h-4 w-4 text-[#A0ADA5]"
            />
            <input
              ref={dateInputRef}
              type="date"
              aria-label="Select fixture date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  selectDate(e.target.value);
                }
              }}
              className="tabular-nums-strict h-9 rounded-[10px] border border-[#2A3730] bg-[#0B100E] pr-3 pl-9 text-[13px] leading-[18px] font-medium text-[#F2F6F3] motion-interactive focus:border-[#B9F36A]"
            />
          </label>

          <button
            type="button"
            onClick={() => selectDate(shiftDateKey(selectedDate, 1))}
            aria-label="Next day"
            className="inline-flex h-9 items-center gap-1 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 text-[13px] leading-[18px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A]"
          >
            <span>Next</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => selectDate(todayKey)}
            disabled={isTodaySelected}
            className={`h-9 rounded-[10px] border px-3 text-[13px] leading-[18px] font-medium motion-interactive ${
              isTodaySelected
                ? 'border-[#B9F36A]/40 bg-[#19231E] text-[#B9F36A]'
                : 'border-[#2A3730] bg-[#19231E] text-[#A0ADA5] hover:border-[#B9F36A]/50 hover:text-[#F2F6F3]'
            }`}
          >
            Today
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 lg:justify-end">
          <div className="text-[13px] leading-[18px] font-medium text-[#F2F6F3]">
            Showing:{' '}
            <span className="text-[#B9F36A]">
              {formatDateLabel(selectedDate, todayKey)}
            </span>
          </div>

          {availableCompetitions.length > 1 ? (
            <div className="flex items-center gap-2">
              <label
                htmlFor="fixtures-league-select"
                className="type-metadata text-[#A0ADA5]"
              >
                Competition
              </label>
              <select
                id="fixtures-league-select"
                value={String(activeLeagueId)}
                onChange={(e) => handleLeagueChange(Number(e.target.value))}
                className="h-9 rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-3 text-[13px] leading-[18px] font-medium text-[#F2F6F3] motion-interactive focus:border-[#B9F36A]"
              >
                {availableCompetitions.map((comp) => (
                  <option key={String(comp.id)} value={String(comp.id)}>
                    {comp.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      {/* Main list region */}
      <section aria-label="Fixtures list" className="space-y-4">
        {showStale && filteredFixtures.length > 0 ? (
          <StaleSnapshotNotice
            message="WebSocket connection is recovering — displaying the last known snapshot."
            onReconnect={reconnectSocket}
          />
        ) : null}

        {isLoading && filteredFixtures.length === 0 ? (
          <MatchRowSkeleton count={5} label="Loading fixtures" />
        ) : activeError && filteredFixtures.length === 0 ? (
          <ErrorBanner
            title="Could not load fixtures"
            message={activeError}
            onRetry={retryLoad}
          />
        ) : filteredFixtures.length === 0 ? (
          <EmptyState
            title={
              isTodaySelected
                ? 'No fixtures scheduled today'
                : `No fixtures scheduled for ${formatShortDateLabel(selectedDate, todayKey)}`
            }
            description={
              isTodaySelected
                ? `No ${activeCompetition.name} matches are scheduled on ${formatDateLabel(selectedDate, todayKey)}.`
                : `No ${activeCompetition.name} matches were found for ${formatDateLabel(selectedDate, todayKey)}.`
            }
            action={
              <>
                <button
                  type="button"
                  onClick={openDatePicker}
                  className="rounded-[10px] bg-[#B9F36A] px-4 py-2 text-[14px] leading-[20px] font-semibold text-[#0B100E] motion-interactive hover:opacity-90"
                >
                  Choose another date
                </button>
                {!isTodaySelected ? (
                  <button
                    type="button"
                    onClick={() => selectDate(todayKey)}
                    className="rounded-[10px] border border-[#2A3730] bg-[#19231E] px-4 py-2 text-[14px] leading-[20px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50"
                  >
                    Back to today
                  </button>
                ) : null}
              </>
            }
          />
        ) : (
          <FixtureList
            fixtures={filteredFixtures}
            fallbackDateKey={selectedDate}
            isStale={showStale}
            groupByMatchday
            showDateHeaders
          />
        )}
      </section>
    </div>
  );
}

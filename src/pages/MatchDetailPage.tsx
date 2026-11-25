import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import {
  ApiError,
  fetchMatchCommentary,
  fetchSavedMatchById,
} from '../api/client';
import { CommentaryFeed } from '../components/CommentaryFeed';
import { ErrorBanner } from '../components/StateFeedback';
import { StatusBadge } from '../components/StatusBadge';
import { useRealtimeHub } from '../context/RealtimeContext';
import {
  extractDateKey,
  formatDateLabel,
  formatKickoffTime,
  formatMatchdayLabel,
} from '../lib/format';
import { mergeCommentaryEntries } from '../lib/normalizers';
import type { CommentaryEntry, MatchItem } from '../types/football';

function TeamCrestLarge({
  crestUrl,
}: {
  crestUrl?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (!crestUrl || failed) return null;

  return (
    <img
      src={crestUrl}
      alt=""
      aria-hidden="true"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 rounded object-contain"
    />
  );
}

export function MatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const matchId = id ?? '';

  const {
    savedMatches,
    connectionState,
    subscribeToMatchCommentary,
    settings,
  } = useRealtimeHub();

  const cachedMatch = useMemo(
    () =>
      savedMatches.find(
        (m) => m.id === matchId || m.detailMatchId === matchId,
      ) ?? null,
    [savedMatches, matchId],
  );

  const [fetchedMatch, setFetchedMatch] = useState<MatchItem | null>(null);
  const [matchLoading, setMatchLoading] = useState<boolean>(!cachedMatch);
  const [matchError, setMatchError] = useState<string | null>(null);

  const [commentary, setCommentary] = useState<CommentaryEntry[]>([]);
  const [commentaryLoading, setCommentaryLoading] = useState<boolean>(true);
  const [commentaryError, setCommentaryError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState<number>(0);

  const match = cachedMatch ?? fetchedMatch;

  const loadDetail = useCallback(
    async (targetId: string, signal: AbortSignal) => {
      setCommentaryLoading(true);
      setCommentaryError(null);
      if (!cachedMatch) {
        setMatchLoading(true);
        setMatchError(null);
      }

      const [matchResult, commentaryResult] = await Promise.allSettled([
        cachedMatch
          ? Promise.resolve(cachedMatch)
          : fetchSavedMatchById(targetId, {
              baseUrl: settings.apiBaseUrl,
              signal,
            }),
        fetchMatchCommentary(targetId, 100, {
          baseUrl: settings.apiBaseUrl,
          signal,
        }),
      ]);

      if (signal.aborted) return;

      if (matchResult.status === 'fulfilled') {
        setFetchedMatch(matchResult.value);
        setMatchError(null);
      } else if (
        !(
          matchResult.reason instanceof DOMException &&
          matchResult.reason.name === 'AbortError'
        )
      ) {
        const msg =
          matchResult.reason instanceof ApiError
            ? matchResult.reason.message
            : 'Unable to load match information.';
        setMatchError(msg);
      }
      setMatchLoading(false);

      if (commentaryResult.status === 'fulfilled') {
        setCommentary(commentaryResult.value);
        setCommentaryError(null);
      } else if (
        !(
          commentaryResult.reason instanceof DOMException &&
          commentaryResult.reason.name === 'AbortError'
        )
      ) {
        const msg =
          commentaryResult.reason instanceof ApiError
            ? commentaryResult.reason.message
            : 'Unable to load commentary.';
        setCommentaryError(msg);
      }
      setCommentaryLoading(false);
    },
    [cachedMatch, settings.apiBaseUrl],
  );

  useEffect(() => {
    if (!matchId) return;
    const controller = new AbortController();
    void loadDetail(matchId, controller.signal);
    return () => controller.abort();
  }, [matchId, reloadNonce, loadDetail]);

  // Subscribe to match commentary WebSocket channel while detail view is open
  useEffect(() => {
    if (!matchId) return;
    return subscribeToMatchCommentary(matchId, (entry) => {
      setCommentary((prev) => mergeCommentaryEntries(prev, entry));
    });
  }, [matchId, subscribeToMatchCommentary]);

  const kickoffTime = match ? formatKickoffTime(match.kickoffAt) : 'TBD';
  const dateKey = match ? extractDateKey(match.kickoffAt) : null;
  const dateLabel = dateKey ? formatDateLabel(dateKey) : null;
  const matchdayLabel = match ? formatMatchdayLabel(match.matchday) : '';
  const hasScore =
    match !== null && match.homeScore !== null && match.awayScore !== null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/matches"
          className="inline-flex items-center gap-1.5 rounded-[10px] py-1 text-[13px] leading-[18px] font-medium text-[#A0ADA5] motion-interactive hover:text-[#B9F36A]"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          <span>Back to matches</span>
        </Link>
      </div>

      {/* Top scoreboard card */}
      <section
        aria-label="Match summary"
        className="rounded-[10px] border border-[#2A3730] bg-[#121A16] p-6"
      >
        {matchLoading && !match ? (
          <div role="status" aria-busy="true" className="space-y-4">
            <span className="sr-only">Loading match summary</span>
            <div className="h-4 w-48 animate-pulse rounded bg-[#19231E]" />
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
              <div className="ml-auto h-7 w-36 animate-pulse rounded bg-[#19231E]" />
              <div className="h-11 w-24 animate-pulse rounded-[10px] bg-[#19231E]" />
              <div className="h-7 w-36 animate-pulse rounded bg-[#19231E]" />
            </div>
          </div>
        ) : matchError && !match ? (
          <ErrorBanner
            title="Could not load match details"
            message={matchError}
            onRetry={() => setReloadNonce((n) => n + 1)}
          />
        ) : !match ? (
          <div className="space-y-2">
            <h1 className="type-page-title text-[#F2F6F3]">
              Match #{matchId}
            </h1>
            <p className="text-[14px] leading-[20px] text-[#A0ADA5]">
              Match metadata was not found in the saved match list. Commentary
              updates are still subscribed for this match ID.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="type-metadata flex flex-wrap items-center gap-2 text-[#A0ADA5]">
                <span className="font-medium text-[#F2F6F3]">
                  {match.competition.name}
                </span>
                {matchdayLabel ? (
                  <>
                    <span aria-hidden="true">•</span>
                    <span>{matchdayLabel}</span>
                  </>
                ) : null}
                {dateLabel ? (
                  <>
                    <span aria-hidden="true">•</span>
                    <time dateTime={match.kickoffAt || undefined}>
                      {dateLabel}, {kickoffTime}
                    </time>
                  </>
                ) : null}
              </div>

              <StatusBadge
                status={match.status}
                isLiveVerified={match.isLiveVerified}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2">
              <div className="flex min-w-0 items-center justify-end gap-3 text-right">
                <h1 className="text-[18px] leading-[24px] font-semibold text-[#F2F6F3] sm:text-[24px] sm:leading-[30px]">
                  {match.homeTeam.name}
                </h1>
                <TeamCrestLarge crestUrl={match.homeTeam.crestUrl} />
              </div>

              <div className="tabular-nums-strict inline-flex min-w-[96px] items-center justify-center gap-2 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-4 py-2 text-[28px] leading-[34px] font-semibold text-[#F2F6F3]">
                {hasScore ? (
                  <>
                    <span>{match.homeScore}</span>
                    <span aria-hidden="true" className="text-[#A0ADA5]">
                      –
                    </span>
                    <span>{match.awayScore}</span>
                  </>
                ) : (
                  <time
                    dateTime={match.kickoffAt || undefined}
                    className="text-[20px] leading-[28px]"
                  >
                    {kickoffTime}
                  </time>
                )}
              </div>

              <div className="flex min-w-0 items-center justify-start gap-3 text-left">
                <TeamCrestLarge crestUrl={match.awayTeam.crestUrl} />
                <span className="text-[18px] leading-[24px] font-semibold text-[#F2F6F3] sm:text-[24px] sm:leading-[30px]">
                  {match.awayTeam.name}
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Commentary timeline */}
      <section aria-labelledby="commentary-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="commentary-heading"
              className="type-section-title text-[#F2F6F3]"
            >
              Commentary
            </h2>
            <p className="type-metadata mt-0.5 text-[#A0ADA5]">
              {connectionState === 'connected'
                ? `Subscribed to live commentary channel for match ${matchId}.`
                : 'Showing saved commentary events.'}
            </p>
          </div>
        </div>

        {commentaryLoading && commentary.length === 0 ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading commentary"
            className="space-y-3"
          >
            <span className="sr-only">Loading commentary</span>
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                aria-hidden="true"
                className="h-20 animate-pulse rounded-[10px] border border-[#2A3730] bg-[#121A16]"
              />
            ))}
          </div>
        ) : commentaryError && commentary.length === 0 ? (
          <ErrorBanner
            title="Could not load commentary"
            message={commentaryError}
            onRetry={() => setReloadNonce((n) => n + 1)}
          />
        ) : (
          <CommentaryFeed entries={commentary} />
        )}
      </section>
    </div>
  );
}

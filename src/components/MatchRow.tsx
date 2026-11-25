import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { formatKickoffTime } from '../lib/format';
import type { MatchItem, TeamInfo } from '../types/football';
import { StatusBadge, getStatusLabel } from './StatusBadge';

export interface MatchRowProps {
  match: MatchItem;
  isStale?: boolean;
}

function TeamCrest({ team }: { team: TeamInfo }) {
  const [failed, setFailed] = useState(false);

  if (!team.crestUrl || failed) {
    return null;
  }

  return (
    <img
      src={team.crestUrl}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-5 w-5 shrink-0 rounded-sm object-contain"
    />
  );
}

function CenterScoreOrTime({ match }: { match: MatchItem }) {
  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const kickoff = formatKickoffTime(match.kickoffAt);

  if (hasScore) {
    return (
      <div
        className="tabular-nums-strict inline-flex min-w-[76px] items-center justify-center gap-1.5 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-2.5 py-1 text-[16px] leading-[22px] font-semibold text-[#F2F6F3]"
        aria-label={`Score ${match.homeScore} to ${match.awayScore}`}
      >
        <span>{match.homeScore}</span>
        <span aria-hidden="true" className="text-[#A0ADA5]">
          –
        </span>
        <span>{match.awayScore}</span>
      </div>
    );
  }

  return (
    <div
      className="tabular-nums-strict inline-flex min-w-[76px] items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-2.5 py-1 text-[14px] leading-[20px] font-semibold text-[#F2F6F3]"
      aria-label={`Kickoff ${kickoff}`}
    >
      <time dateTime={match.kickoffAt || undefined}>{kickoff}</time>
    </div>
  );
}

export function MatchRow({ match, isStale = false }: MatchRowProps) {
  const kickoff = formatKickoffTime(match.kickoffAt);
  const hasDetail = Boolean(match.detailMatchId);
  const detailPath = hasDetail
    ? `/matches/${encodeURIComponent(match.detailMatchId!)}`
    : null;
  const statusLabel = getStatusLabel(
    match.status,
    match.isLiveVerified,
    isStale,
  );

  const hasScore = match.homeScore !== null && match.awayScore !== null;
  const scoreSummary = hasScore
    ? `${match.homeScore} to ${match.awayScore}`
    : `kickoff ${kickoff}`;

  const content = (
    <div className="flex flex-col gap-3 px-4 py-3 md:grid md:grid-cols-[minmax(150px,190px)_1fr_auto] md:items-center md:gap-4">
      {/* Metadata row (stacked on narrow screens, left column on desktop) */}
      <div className="flex items-center justify-between gap-2 md:block">
        <div className="type-metadata flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[#A0ADA5]">
          <span className="truncate font-medium text-[#A0ADA5]">
            {match.competition.name}
          </span>
          <span aria-hidden="true" className="text-[#2A3730]">
            •
          </span>
          <time
            dateTime={match.kickoffAt || undefined}
            className="tabular-nums-strict text-[#A0ADA5]"
          >
            {kickoff}
          </time>
        </div>
        <div className="md:hidden">
          <StatusBadge
            status={match.status}
            isLiveVerified={match.isLiveVerified}
            isStale={isStale}
          />
        </div>
      </div>

      {/* Centered two-team score line */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <span className="type-team-name truncate text-[#F2F6F3]">
            {match.homeTeam.name}
          </span>
          <TeamCrest team={match.homeTeam} />
        </div>

        <CenterScoreOrTime match={match} />

        <div className="flex min-w-0 items-center justify-start gap-2 text-left">
          <TeamCrest team={match.awayTeam} />
          <span className="type-team-name truncate text-[#F2F6F3]">
            {match.awayTeam.name}
          </span>
        </div>
      </div>

      {/* Status badge & optional link affordance on desktop */}
      <div className="hidden items-center justify-end gap-2 md:flex">
        <StatusBadge
          status={match.status}
          isLiveVerified={match.isLiveVerified}
          isStale={isStale}
        />
        {hasDetail ? (
          <ChevronRight
            aria-hidden="true"
            className="h-4 w-4 text-[#A0ADA5] motion-interactive group-hover:translate-x-0.5 group-hover:text-[#B9F36A]"
          />
        ) : null}
      </div>
    </div>
  );

  if (detailPath) {
    return (
      <Link
        to={detailPath}
        aria-label={`${match.homeTeam.name} versus ${match.awayTeam.name}, ${scoreSummary}, ${statusLabel}, ${match.competition.name}. View match details`}
        className="group block rounded-[10px] border border-[#2A3730] bg-[#121A16] motion-interactive hover:border-[#B9F36A]/45 hover:bg-[#19231E]"
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      aria-label={`${match.homeTeam.name} versus ${match.awayTeam.name}, ${scoreSummary}, ${statusLabel}, ${match.competition.name}`}
      className="rounded-[10px] border border-[#2A3730] bg-[#121A16]"
    >
      {content}
    </div>
  );
}

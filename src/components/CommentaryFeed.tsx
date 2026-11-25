import {
  ArrowLeftRight,
  Clock,
  Flag,
  MessageSquare,
  ShieldAlert,
  Target,
  XCircle,
} from 'lucide-react';
import { formatMatchMinute } from '../lib/format';
import type { CommentaryEntry, CommentaryEventType } from '../types/football';
import { EmptyState } from './StateFeedback';

export interface CommentaryFeedProps {
  entries: CommentaryEntry[];
}

function EventIcon({ type }: { type: CommentaryEventType }) {
  switch (type) {
    case 'goal':
    case 'penalty':
      return <Target aria-hidden="true" className="h-3.5 w-3.5 text-[#B9F36A]" />;
    case 'own_goal':
    case 'missed_penalty':
      return <XCircle aria-hidden="true" className="h-3.5 w-3.5 text-[#FF8178]" />;
    case 'yellow_card':
      return (
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-2.5 rounded-[2px] border border-[#FACC15]/70 bg-[#FACC15]"
        />
      );
    case 'red_card':
      return (
        <span
          aria-hidden="true"
          className="inline-block h-3.5 w-2.5 rounded-[2px] border border-[#FF8178]/80 bg-[#FF8178]"
        />
      );
    case 'substitution':
      return (
        <ArrowLeftRight
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[#9DB8FF]"
        />
      );
    case 'var':
      return (
        <ShieldAlert
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[#9DB8FF]"
        />
      );
    case 'kickoff':
    case 'halftime':
    case 'fulltime':
      return <Flag aria-hidden="true" className="h-3.5 w-3.5 text-[#72D6A0]" />;
    default:
      return (
        <MessageSquare
          aria-hidden="true"
          className="h-3.5 w-3.5 text-[#A0ADA5]"
        />
      );
  }
}

function eventBadgeStyles(type: CommentaryEventType): string {
  switch (type) {
    case 'goal':
    case 'penalty':
      return 'border-[#B9F36A]/40 bg-[#B9F36A]/10 text-[#B9F36A]';
    case 'own_goal':
    case 'missed_penalty':
    case 'red_card':
      return 'border-[#FF8178]/40 bg-[#FF8178]/10 text-[#FF8178]';
    case 'yellow_card':
      return 'border-[#FACC15]/40 bg-[#FACC15]/10 text-[#F2F6F3]';
    case 'substitution':
    case 'var':
      return 'border-[#9DB8FF]/35 bg-[#9DB8FF]/10 text-[#9DB8FF]';
    case 'kickoff':
    case 'halftime':
    case 'fulltime':
      return 'border-[#72D6A0]/35 bg-[#72D6A0]/10 text-[#72D6A0]';
    default:
      return 'border-[#2A3730] bg-[#19231E] text-[#A0ADA5]';
  }
}

export function CommentaryFeed({ entries }: CommentaryFeedProps) {
  if (entries.length === 0) {
    return (
      <EmptyState
        icon={<Clock className="h-5 w-5" />}
        title="No commentary entries yet"
        description="Timeline events and match commentary will appear here chronologically as they arrive."
      />
    );
  }

  return (
    <ol
      aria-label="Match commentary timeline"
      className="relative space-y-3 border-l border-[#2A3730] pl-5"
    >
      {entries.map((entry) => {
        const minuteText = formatMatchMinute(entry.minute, entry.extraTime);

        return (
          <li
            key={entry.id}
            className="relative rounded-[10px] border border-[#2A3730] bg-[#121A16] p-4"
          >
            <span
              aria-hidden="true"
              className="absolute top-5 -left-[25px] h-2.5 w-2.5 rounded-full border-2 border-[#0B100E] bg-[#2A3730]"
            />

            <div className="flex flex-wrap items-center gap-2">
              <span className="tabular-nums-strict inline-flex min-w-[44px] items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#19231E] px-2 py-0.5 text-[12px] leading-[16px] font-semibold text-[#F2F6F3]">
                {minuteText}
              </span>

              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[12px] leading-[16px] font-medium ${eventBadgeStyles(entry.eventType)}`}
              >
                <EventIcon type={entry.eventType} />
                <span>{entry.eventLabel}</span>
              </span>

              {entry.team ? (
                <span className="text-[12px] leading-[16px] font-medium text-[#F2F6F3]">
                  {entry.team}
                </span>
              ) : null}

              {entry.actor ? (
                <span className="text-[12px] leading-[16px] text-[#A0ADA5]">
                  {entry.team ? `· ${entry.actor}` : entry.actor}
                </span>
              ) : null}
            </div>

            {entry.message ? (
              <p className="mt-2 text-[14px] leading-[20px] text-[#F2F6F3]">
                {entry.message}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

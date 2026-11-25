import { CheckCircle2, Clock, HelpCircle, Radio } from 'lucide-react';
import type { MatchStatus } from '../types/football';

export interface StatusBadgeProps {
  status: MatchStatus;
  isLiveVerified?: boolean;
  isStale?: boolean;
  className?: string;
}

export function getStatusLabel(
  status: MatchStatus,
  isLiveVerified: boolean = false,
  isStale: boolean = false,
): string {
  if (isStale && status === 'unknown') return 'Stale';
  if (status === 'live' && isLiveVerified) return 'Live';
  if (status === 'scheduled') return 'Scheduled';
  if (status === 'finished') return 'Finished';
  return 'Unknown';
}

export function StatusBadge({
  status,
  isLiveVerified = false,
  isStale = false,
  className = '',
}: StatusBadgeProps) {
  // Never mark unverified or OpenFootball fixtures as Live.
  const effectiveStatus: MatchStatus =
    status === 'live' && !isLiveVerified ? 'unknown' : status;

  if (effectiveStatus === 'live') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#FF6B6B]/40 bg-[#FF6B6B]/12 px-2.5 py-1 text-[12px] leading-[16px] font-medium text-[#F2F6F3] ${className}`}
      >
        <span
          aria-hidden="true"
          className="animate-verified-live h-2 w-2 rounded-full bg-[#FF6B6B]"
        />
        <Radio aria-hidden="true" className="h-3 w-3 text-[#FF8178]" />
        <span>Live</span>
      </span>
    );
  }

  if (effectiveStatus === 'scheduled') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#9DB8FF]/30 bg-[#9DB8FF]/10 px-2.5 py-1 text-[12px] leading-[16px] font-medium text-[#9DB8FF] ${className}`}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-[#9DB8FF]"
        />
        <Clock aria-hidden="true" className="h-3 w-3" />
        <span>Scheduled</span>
      </span>
    );
  }

  if (effectiveStatus === 'finished') {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border border-[#2A3730] bg-[#19231E] px-2.5 py-1 text-[12px] leading-[16px] font-medium text-[#A0ADA5] ${className}`}
      >
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-[#A0ADA5]"
        />
        <CheckCircle2 aria-hidden="true" className="h-3 w-3" />
        <span>Finished</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-[#2A3730] bg-[#19231E] px-2.5 py-1 text-[12px] leading-[16px] font-medium text-[#A0ADA5] ${className}`}
    >
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full border border-[#A0ADA5]"
      />
      <HelpCircle aria-hidden="true" className="h-3 w-3" />
      <span>{isStale ? 'Stale' : 'Unknown'}</span>
    </span>
  );
}

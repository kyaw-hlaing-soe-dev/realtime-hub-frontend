import type { ReactNode } from 'react';
import { AlertTriangle, CalendarX2, Info, RefreshCw } from 'lucide-react';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#121A16] px-6 py-8 text-center">
      <div
        aria-hidden="true"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#2A3730] bg-[#19231E] text-[#A0ADA5]"
      >
        {icon ?? <CalendarX2 className="h-5 w-5" />}
      </div>
      <h3 className="type-section-title text-[#F2F6F3]">{title}</h3>
      <p className="mt-1 max-w-md text-[14px] leading-[20px] text-[#A0ADA5]">
        {description}
      </p>
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export interface ErrorBannerProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  title = 'Unable to load data',
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorBannerProps) {
  return (
    <div
      role="alert"
      className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#FF8178]/40 bg-[#121A16] p-4 sm:flex-row sm:items-center"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 shrink-0 text-[#FF8178]"
        />
        <div>
          <p className="text-[14px] leading-[20px] font-medium text-[#F2F6F3]">
            {title}
          </p>
          <p className="mt-0.5 text-[14px] leading-[20px] text-[#A0ADA5]">
            {message}
          </p>
        </div>
      </div>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 py-2 text-[14px] leading-[20px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A]"
        >
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
          <span>{retryLabel}</span>
        </button>
      ) : null}
    </div>
  );
}

export interface StaleSnapshotNoticeProps {
  message: string;
  onReconnect?: () => void;
}

export function StaleSnapshotNotice({
  message,
  onReconnect,
}: StaleSnapshotNoticeProps) {
  return (
    <div
      role="status"
      className="flex flex-col justify-between gap-3 rounded-[10px] border border-[#9DB8FF]/30 bg-[#19231E] px-4 py-3 sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-2.5 text-[14px] leading-[20px] text-[#F2F6F3]">
        <Info aria-hidden="true" className="h-4 w-4 shrink-0 text-[#9DB8FF]" />
        <span>{message}</span>
      </div>
      {onReconnect ? (
        <button
          type="button"
          onClick={onReconnect}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-[10px] border border-[#2A3730] bg-[#121A16] px-3 py-1.5 text-[12px] leading-[16px] font-medium text-[#B9F36A] motion-interactive hover:border-[#B9F36A]/60"
        >
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          <span>Reconnect now</span>
        </button>
      ) : null}
    </div>
  );
}

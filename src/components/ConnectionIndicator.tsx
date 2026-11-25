import { Loader2, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import type { ConnectionState } from '../types/football';

export interface ConnectionIndicatorProps {
  state: ConnectionState;
  className?: string;
}

const STATE_CONFIG: Record<
  ConnectionState,
  {
    label: string;
    dotClass: string;
    textClass: string;
    borderClass: string;
    description: string;
  }
> = {
  connected: {
    label: 'Connected',
    dotClass: 'bg-[#72D6A0]',
    textClass: 'text-[#72D6A0]',
    borderClass: 'border-[#72D6A0]/35',
    description: 'WebSocket transport connected',
  },
  connecting: {
    label: 'Connecting',
    dotClass: 'bg-[#9DB8FF]',
    textClass: 'text-[#9DB8FF]',
    borderClass: 'border-[#9DB8FF]/35',
    description: 'Establishing WebSocket transport',
  },
  reconnecting: {
    label: 'Reconnecting',
    dotClass: 'bg-[#B9F36A]',
    textClass: 'text-[#B9F36A]',
    borderClass: 'border-[#B9F36A]/35',
    description: 'Retrying WebSocket connection',
  },
  offline: {
    label: 'Offline',
    dotClass: 'bg-[#FF8178]',
    textClass: 'text-[#FF8178]',
    borderClass: 'border-[#FF8178]/35',
    description: 'WebSocket transport offline',
  },
};

export function ConnectionIndicator({
  state,
  className = '',
}: ConnectionIndicatorProps) {
  const config = STATE_CONFIG[state];

  return (
    <div
      role="status"
      aria-label={`Socket status: ${config.label}`}
      title={config.description}
      className={`inline-flex items-center gap-2 rounded-full border bg-[#19231E] px-3 py-1 text-[12px] leading-[16px] font-medium text-[#F2F6F3] motion-interactive ${config.borderClass} ${className}`}
    >
      {state === 'connected' && (
        <Wifi
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 ${config.textClass}`}
        />
      )}
      {state === 'connecting' && (
        <Loader2
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 animate-spin ${config.textClass}`}
        />
      )}
      {state === 'reconnecting' && (
        <RefreshCw
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 animate-spin ${config.textClass}`}
        />
      )}
      {state === 'offline' && (
        <WifiOff
          aria-hidden="true"
          className={`h-3.5 w-3.5 shrink-0 ${config.textClass}`}
        />
      )}
      <span
        aria-hidden="true"
        className={`h-1.5 w-1.5 shrink-0 rounded-full ${config.dotClass}`}
      />
      <span>{config.label}</span>
    </div>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { Check, RefreshCw, X } from 'lucide-react';
import { useRealtimeHub } from '../context/RealtimeContext';
import { ConnectionIndicator } from './ConnectionIndicator';

export interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const {
    connectionState,
    settings,
    updateSettings,
    resetSettings,
    reconnectSocket,
    fixturesSnapshot,
  } = useRealtimeHub();

  const [apiBaseUrl, setApiBaseUrl] = useState(settings.apiBaseUrl);
  const [wsUrl, setWsUrl] = useState(settings.wsUrl);
  const [defaultLeagueId, setDefaultLeagueId] = useState(
    String(settings.defaultLeagueId),
  );
  const [savedFeedback, setSavedFeedback] = useState(false);

  useEffect(() => {
    if (!open) return;
    setApiBaseUrl(settings.apiBaseUrl);
    setWsUrl(settings.wsUrl);
    setDefaultLeagueId(String(settings.defaultLeagueId));
    setSavedFeedback(false);
  }, [open, settings]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const parsedLeague = Number(defaultLeagueId);
    updateSettings({
      apiBaseUrl: apiBaseUrl.trim(),
      wsUrl: wsUrl.trim() || settings.wsUrl,
      defaultLeagueId:
        Number.isFinite(parsedLeague) && parsedLeague > 0
          ? parsedLeague
          : settings.defaultLeagueId,
    });
    setSavedFeedback(true);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hub-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-[10px] border border-[#2A3730] bg-[#121A16] p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-[#2A3730] pb-4">
          <div>
            <h2
              id="hub-settings-title"
              className="type-section-title text-[#F2F6F3]"
            >
              Hub &amp; connection settings
            </h2>
            <p className="mt-1 text-[12px] leading-[16px] text-[#A0ADA5]">
              Configure WebSocket transport, HTTP base path, and default
              competition.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#19231E] text-[#A0ADA5] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#F2F6F3]"
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-4 py-3">
          <div className="space-y-1">
            <div className="text-[12px] leading-[16px] text-[#A0ADA5]">
              Transport status
            </div>
            <ConnectionIndicator state={connectionState} />
          </div>
          <button
            type="button"
            onClick={reconnectSocket}
            className="inline-flex items-center gap-2 rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 py-2 text-[12px] leading-[16px] font-medium text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#B9F36A]"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
            <span>Reconnect socket</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="settings-league-id"
              className="block text-[12px] leading-[16px] font-medium text-[#F2F6F3]"
            >
              Default league ID
            </label>
            <input
              id="settings-league-id"
              type="number"
              min={1}
              value={defaultLeagueId}
              onChange={(e) => {
                setDefaultLeagueId(e.target.value);
                setSavedFeedback(false);
              }}
              className="tabular-nums-strict mt-1.5 w-full rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-3 py-2 text-[14px] leading-[20px] text-[#F2F6F3] motion-interactive focus:border-[#B9F36A]"
            />
            <p className="mt-1 text-[12px] leading-[16px] text-[#A0ADA5]">
              Defaults to 39 (Premier League). Active snapshot:{' '}
              {fixturesSnapshot.leagueName}.
            </p>
          </div>

          <div>
            <label
              htmlFor="settings-ws-url"
              className="block text-[12px] leading-[16px] font-medium text-[#F2F6F3]"
            >
              WebSocket endpoint
            </label>
            <input
              id="settings-ws-url"
              type="text"
              value={wsUrl}
              onChange={(e) => {
                setWsUrl(e.target.value);
                setSavedFeedback(false);
              }}
              placeholder="ws://localhost:3000/ws"
              className="mt-1.5 w-full rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-3 py-2 text-[14px] leading-[20px] text-[#F2F6F3] motion-interactive focus:border-[#B9F36A]"
            />
          </div>

          <div>
            <label
              htmlFor="settings-api-base"
              className="block text-[12px] leading-[16px] font-medium text-[#F2F6F3]"
            >
              HTTP API base URL (optional)
            </label>
            <input
              id="settings-api-base"
              type="text"
              value={apiBaseUrl}
              onChange={(e) => {
                setApiBaseUrl(e.target.value);
                setSavedFeedback(false);
              }}
              placeholder="Same origin (/football, /matches)"
              className="mt-1.5 w-full rounded-[10px] border border-[#2A3730] bg-[#0B100E] px-3 py-2 text-[14px] leading-[20px] text-[#F2F6F3] motion-interactive focus:border-[#B9F36A]"
            />
          </div>

          <div className="rounded-[10px] border border-[#2A3730] bg-[#0B100E] p-3 text-[12px] leading-[16px] text-[#A0ADA5]">
            OpenFootball fixtures refresh daily with schedules and final scores.
            Socket connectivity tracks transport state only and never marks
            OpenFootball fixtures as live.
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                resetSettings();
                setSavedFeedback(true);
              }}
              className="rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 py-2 text-[14px] leading-[20px] font-medium text-[#A0ADA5] motion-interactive hover:text-[#F2F6F3]"
            >
              Reset defaults
            </button>

            <div className="flex items-center gap-3">
              {savedFeedback ? (
                <span
                  role="status"
                  className="inline-flex items-center gap-1 text-[12px] leading-[16px] font-medium text-[#72D6A0]"
                >
                  <Check aria-hidden="true" className="h-3.5 w-3.5" />
                  <span>Saved</span>
                </span>
              ) : null}
              <button
                type="submit"
                className="rounded-[10px] bg-[#B9F36A] px-4 py-2 text-[14px] leading-[20px] font-semibold text-[#0B100E] motion-interactive hover:opacity-90"
              >
                Save settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

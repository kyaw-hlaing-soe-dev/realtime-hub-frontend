import { useEffect, useState, type ReactNode } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AlertCircle, Menu, SlidersHorizontal, X } from 'lucide-react';
import { useRealtimeHub } from '../context/RealtimeContext';
import { ConnectionIndicator } from './ConnectionIndicator';
import { SettingsModal } from './SettingsModal';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', end: true },
  { to: '/fixtures', label: 'Fixtures', end: false },
  { to: '/matches', label: 'Matches', end: false },
] as const;

export interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const {
    connectionState,
    socketError,
    dismissSocketError,
    reconnectSocket,
    politeAnnouncement,
  } = useRealtimeHub();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-[#0B100E] text-[#F2F6F3]">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-[10px] focus:bg-[#B9F36A] focus:px-4 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-[#0B100E]"
      >
        Skip to main content
      </a>

      {/* Polite assistive technology live region for socket & snapshot updates */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {politeAnnouncement}
      </div>

      <header className="sticky top-0 z-30 border-b border-[#2A3730] bg-[#121A16]/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 py-3 md:px-8">
          <div className="flex items-center gap-6">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-[10px] py-1 text-[#F2F6F3] motion-interactive hover:text-[#B9F36A]"
            >
              <span
                aria-hidden="true"
                className="flex h-7 w-7 items-center justify-center rounded-[10px] border border-[#B9F36A]/40 bg-[#19231E]"
              >
                <svg
                  viewBox="0 0 20 20"
                  className="h-4 w-4 text-[#B9F36A]"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.75"
                >
                  <rect x="2.5" y="4" width="15" height="12" rx="2" />
                  <line x1="10" y1="4" x2="10" y2="16" />
                  <circle cx="10" cy="10" r="2.25" />
                </svg>
              </span>
              <span className="text-[16px] leading-[22px] font-semibold tracking-tight">
                Realtime Hub
              </span>
            </Link>

            <nav
              aria-label="Primary navigation"
              className="hidden items-center gap-1 md:flex"
            >
              {NAV_ITEMS.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `rounded-[10px] px-3 py-1.5 text-[14px] leading-[20px] font-medium motion-interactive ${
                      isActive
                        ? 'border border-[#B9F36A]/35 bg-[#19231E] text-[#B9F36A]'
                        : 'border border-transparent text-[#A0ADA5] hover:bg-[#19231E] hover:text-[#F2F6F3]'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <ConnectionIndicator state={connectionState} />

            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              aria-label="Open hub settings"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#19231E] text-[#A0ADA5] motion-interactive hover:border-[#B9F36A]/50 hover:text-[#F2F6F3]"
            >
              <SlidersHorizontal aria-hidden="true" className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-primary-nav"
              className="inline-flex h-9 w-9 items-center justify-center rounded-[10px] border border-[#2A3730] bg-[#19231E] text-[#F2F6F3] motion-interactive hover:border-[#B9F36A]/50 md:hidden"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Menu aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Compact mobile navigation menu */}
        {mobileMenuOpen ? (
          <nav
            id="mobile-primary-nav"
            aria-label="Mobile navigation"
            className="border-t border-[#2A3730] bg-[#121A16] px-4 py-3 md:hidden"
          >
            <ul className="flex flex-col gap-1">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `block rounded-[10px] px-3 py-2 text-[14px] leading-[20px] font-medium motion-interactive ${
                        isActive
                          ? 'border border-[#B9F36A]/35 bg-[#19231E] text-[#B9F36A]'
                          : 'border border-transparent text-[#A0ADA5] hover:bg-[#19231E] hover:text-[#F2F6F3]'
                      }`
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </header>

      {/* Non-blocking socket protocol error banner */}
      {socketError ? (
        <div className="mx-auto max-w-[1200px] px-4 pt-4 md:px-8 md:pt-6">
          <div
            role="status"
            className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-[#FF8178]/40 bg-[#121A16] px-4 py-3 text-[14px] leading-[20px]"
          >
            <div className="flex items-center gap-2.5">
              <AlertCircle
                aria-hidden="true"
                className="h-4 w-4 shrink-0 text-[#FF8178]"
              />
              <span className="text-[#F2F6F3]">{socketError}</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={reconnectSocket}
                className="rounded-[10px] border border-[#2A3730] bg-[#19231E] px-3 py-1 text-[12px] leading-[16px] font-medium text-[#B9F36A] motion-interactive hover:border-[#B9F36A]/60"
              >
                Reconnect
              </button>
              <button
                type="button"
                onClick={dismissSocketError}
                aria-label="Dismiss socket error"
                className="rounded-[10px] border border-[#2A3730] bg-[#19231E] p-1 text-[#A0ADA5] motion-interactive hover:text-[#F2F6F3]"
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main
        id="main-content"
        className="mx-auto max-w-[1200px] px-4 py-4 md:px-8 md:py-8"
      >
        {children}
      </main>

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

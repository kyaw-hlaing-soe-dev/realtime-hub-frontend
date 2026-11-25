import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  ApiError,
  fetchSavedMatches,
  fetchTodayFixtures,
} from '../api/client';
import { DEFAULT_LEAGUE_ID, DEFAULT_LEAGUE_NAME } from '../lib/normalizers';
import type {
  CommentaryEntry,
  CompetitionInfo,
  ConnectionState,
  FixturesSnapshot,
  MatchItem,
} from '../types/football';
import { RealtimeSocketClient, resolveWebSocketUrl } from '../ws/socketClient';

export interface RealtimeHubSettings {
  apiBaseUrl: string;
  wsUrl: string;
  defaultLeagueId: number;
}

const SETTINGS_STORAGE_KEY = 'realtime-hub:settings:v1';

function readStoredSettings(): RealtimeHubSettings {
  const defaultWs = resolveWebSocketUrl(
    import.meta.env.VITE_WS_URL || '/ws',
  );
  const defaultApi = import.meta.env.VITE_API_BASE_URL || '';

  const fallback: RealtimeHubSettings = {
    apiBaseUrl: defaultApi,
    wsUrl: defaultWs,
    defaultLeagueId: DEFAULT_LEAGUE_ID,
  };

  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<RealtimeHubSettings>;
    return {
      apiBaseUrl:
        typeof parsed.apiBaseUrl === 'string' ? parsed.apiBaseUrl : defaultApi,
      wsUrl:
        typeof parsed.wsUrl === 'string' && parsed.wsUrl.trim()
          ? parsed.wsUrl
          : defaultWs,
      defaultLeagueId:
        typeof parsed.defaultLeagueId === 'number' &&
        Number.isFinite(parsed.defaultLeagueId)
          ? parsed.defaultLeagueId
          : DEFAULT_LEAGUE_ID,
    };
  } catch {
    return fallback;
  }
}

export interface RealtimeContextValue {
  connectionState: ConnectionState;
  socketError: string | null;
  dismissSocketError: () => void;
  reconnectSocket: () => void;

  fixturesSnapshot: FixturesSnapshot;
  fixturesLoading: boolean;
  fixturesError: string | null;
  isSnapshotStale: boolean;
  refreshTodayFixtures: () => Promise<void>;

  savedMatches: MatchItem[];
  savedMatchesLoading: boolean;
  savedMatchesError: string | null;
  refreshSavedMatches: () => Promise<void>;

  availableCompetitions: CompetitionInfo[];
  activeLeagueId: number;
  setActiveLeagueId: (leagueId: number) => void;

  subscribeToMatchCommentary: (
    matchId: string,
    listener: (entry: CommentaryEntry) => void,
  ) => () => void;

  settings: RealtimeHubSettings;
  updateSettings: (next: Partial<RealtimeHubSettings>) => void;
  resetSettings: () => void;

  politeAnnouncement: string;
  announce: (message: string) => void;
}

const RealtimeContext = createContext<RealtimeContextValue | null>(null);

const INITIAL_SNAPSHOT: FixturesSnapshot = {
  fixtures: [],
  updatedAt: null,
  leagueId: DEFAULT_LEAGUE_ID,
  leagueName: DEFAULT_LEAGUE_NAME,
  availableCompetitions: [
    { id: DEFAULT_LEAGUE_ID, name: DEFAULT_LEAGUE_NAME },
  ],
};

function connectionAnnouncementText(state: ConnectionState): string {
  switch (state) {
    case 'connected':
      return 'Socket connected.';
    case 'connecting':
      return 'Connecting to socket.';
    case 'reconnecting':
      return 'Socket reconnecting. Showing last known snapshot.';
    case 'offline':
      return 'Socket offline.';
  }
}

export interface RealtimeProviderProps {
  children: ReactNode;
  initialSettings?: Partial<RealtimeHubSettings>;
  disableAutoConnect?: boolean;
}

export function RealtimeProvider({
  children,
  initialSettings,
  disableAutoConnect = false,
}: RealtimeProviderProps) {
  const [settings, setSettings] = useState<RealtimeHubSettings>(() => ({
    ...readStoredSettings(),
    ...initialSettings,
  }));

  const [connectionState, setConnectionState] = useState<ConnectionState>(
    disableAutoConnect ? 'offline' : 'connecting',
  );
  const [socketError, setSocketError] = useState<string | null>(null);

  const [fixturesSnapshot, setFixturesSnapshot] =
    useState<FixturesSnapshot>(INITIAL_SNAPSHOT);
  const [fixturesLoading, setFixturesLoading] = useState<boolean>(true);
  const [fixturesError, setFixturesError] = useState<string | null>(null);
  const [isSnapshotStale, setIsSnapshotStale] = useState<boolean>(false);

  const [savedMatches, setSavedMatches] = useState<MatchItem[]>([]);
  const [savedMatchesLoading, setSavedMatchesLoading] = useState<boolean>(true);
  const [savedMatchesError, setSavedMatchesError] = useState<string | null>(
    null,
  );

  const [activeLeagueId, setActiveLeagueIdState] = useState<number>(
    settings.defaultLeagueId,
  );
  const [politeAnnouncement, setPoliteAnnouncement] = useState<string>('');

  const socketClientRef = useRef<RealtimeSocketClient | null>(null);
  const activeLeagueIdRef = useRef<number>(activeLeagueId);
  activeLeagueIdRef.current = activeLeagueId;
  const commentaryListenersRef = useRef(
    new Map<string, Set<(entry: CommentaryEntry) => void>>(),
  );
  const lastAnnouncedSnapshotSigRef = useRef<string>('');
  const prevConnectionRef = useRef<ConnectionState | null>(null);

  const announce = useCallback((message: string) => {
    setPoliteAnnouncement(message);
  }, []);

  const refreshTodayFixtures = useCallback(async () => {
    setFixturesLoading(true);
    setFixturesError(null);
    try {
      const snapshot = await fetchTodayFixtures({
        league: activeLeagueId,
        baseUrl: settings.apiBaseUrl,
      });
      setFixturesSnapshot(snapshot);
      setIsSnapshotStale(false);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Failed to load today’s fixtures.';
      setFixturesError(msg);
    } finally {
      setFixturesLoading(false);
    }
  }, [activeLeagueId, settings.apiBaseUrl]);

  const refreshSavedMatches = useCallback(async () => {
    setSavedMatchesLoading(true);
    setSavedMatchesError(null);
    try {
      const matches = await fetchSavedMatches(20, {
        baseUrl: settings.apiBaseUrl,
      });
      setSavedMatches(matches);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      const msg =
        error instanceof ApiError
          ? error.message
          : 'Failed to load saved matches.';
      setSavedMatchesError(msg);
    } finally {
      setSavedMatchesLoading(false);
    }
  }, [settings.apiBaseUrl]);

  // Initial HTTP hydration
  useEffect(() => {
    void refreshTodayFixtures();
    void refreshSavedMatches();
  }, [refreshTodayFixtures, refreshSavedMatches]);

  // WebSocket transport lifecycle
  useEffect(() => {
    if (disableAutoConnect) return;

    const client = new RealtimeSocketClient({
      url: settings.wsUrl,
      league: activeLeagueIdRef.current,
      handlers: {
        onConnectionStateChange: (nextState) => {
          setConnectionState(nextState);
          if (nextState === 'reconnecting' || nextState === 'offline') {
            setIsSnapshotStale(true);
          }
          if (nextState === 'connected') {
            setSocketError(null);
          }
          if (
            prevConnectionRef.current !== null &&
            prevConnectionRef.current !== nextState
          ) {
            setPoliteAnnouncement(connectionAnnouncementText(nextState));
          }
          prevConnectionRef.current = nextState;
        },
        onWelcome: () => {
          setSocketError(null);
        },
        onFixturesSnapshot: (snapshot) => {
          setFixturesSnapshot(snapshot);
          setFixturesLoading(false);
          setFixturesError(null);
          setIsSnapshotStale(false);

          const sig = `${snapshot.leagueId}:${snapshot.fixtures.length}:${snapshot.updatedAt ?? ''}`;
          if (sig !== lastAnnouncedSnapshotSigRef.current) {
            lastAnnouncedSnapshotSigRef.current = sig;
            const countText =
              snapshot.fixtures.length === 0
                ? 'No fixtures scheduled today.'
                : `${snapshot.fixtures.length} ${snapshot.leagueName} fixtures loaded.`;
            setPoliteAnnouncement(`Fixture snapshot updated. ${countText}`);
          }
        },
        onFixturesUpdated: (snapshot) => {
          setFixturesSnapshot(snapshot);
          setFixturesLoading(false);
          setFixturesError(null);
          setIsSnapshotStale(false);

          const sig = `${snapshot.leagueId}:${snapshot.fixtures.length}:${snapshot.updatedAt ?? ''}`;
          if (sig !== lastAnnouncedSnapshotSigRef.current) {
            lastAnnouncedSnapshotSigRef.current = sig;
            setPoliteAnnouncement(
              `Fixtures refreshed (${snapshot.fixtures.length} matches).`,
            );
          }
        },
        onMatchCreated: (match) => {
          setSavedMatches((prev) => {
            const withoutDup = prev.filter((item) => item.id !== match.id);
            return [match, ...withoutDup].slice(0, 20);
          });
          setPoliteAnnouncement(
            `Match added: ${match.homeTeam.name} versus ${match.awayTeam.name}.`,
          );
        },
        onCommentary: (entry) => {
          const listeners = commentaryListenersRef.current.get(entry.matchId);
          if (!listeners) return;
          for (const listener of listeners) {
            listener(entry);
          }
        },
        onProtocolError: (message) => {
          setSocketError(message);
        },
      },
    });

    socketClientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      socketClientRef.current = null;
    };
  }, [settings.wsUrl, disableAutoConnect]); // intentionally keep league changes routed via setLeague without recreating socket

  useEffect(() => {
    socketClientRef.current?.setLeague(activeLeagueId);
  }, [activeLeagueId]);

  const setActiveLeagueId = useCallback((leagueId: number) => {
    setActiveLeagueIdState(leagueId);
  }, []);

  const subscribeToMatchCommentary = useCallback(
    (matchId: string, listener: (entry: CommentaryEntry) => void) => {
      const key = String(matchId);
      let set = commentaryListenersRef.current.get(key);
      if (!set) {
        set = new Set();
        commentaryListenersRef.current.set(key, set);
      }
      set.add(listener);
      socketClientRef.current?.subscribeMatch(key);

      return () => {
        const currentSet = commentaryListenersRef.current.get(key);
        if (currentSet) {
          currentSet.delete(listener);
          if (currentSet.size === 0) {
            commentaryListenersRef.current.delete(key);
          }
        }
        socketClientRef.current?.unsubscribeMatch(key);
      };
    },
    [],
  );

  const reconnectSocket = useCallback(() => {
    setSocketError(null);
    socketClientRef.current?.reconnectNow();
  }, []);

  const dismissSocketError = useCallback(() => {
    setSocketError(null);
  }, []);

  const updateSettings = useCallback((next: Partial<RealtimeHubSettings>) => {
    setSettings((prev) => {
      const merged = { ...prev, ...next };
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(
            SETTINGS_STORAGE_KEY,
            JSON.stringify(merged),
          );
        } catch {
          // Ignore storage quota errors
        }
      }
      if (next.defaultLeagueId !== undefined) {
        setActiveLeagueIdState(next.defaultLeagueId);
      }
      return merged;
    });
  }, []);

  const resetSettings = useCallback(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
    const fresh = readStoredSettings();
    setSettings(fresh);
    setActiveLeagueIdState(fresh.defaultLeagueId);
  }, []);

  const value = useMemo<RealtimeContextValue>(
    () => ({
      connectionState,
      socketError,
      dismissSocketError,
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
      availableCompetitions: fixturesSnapshot.availableCompetitions,
      activeLeagueId,
      setActiveLeagueId,
      subscribeToMatchCommentary,
      settings,
      updateSettings,
      resetSettings,
      politeAnnouncement,
      announce,
    }),
    [
      connectionState,
      socketError,
      dismissSocketError,
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
      activeLeagueId,
      setActiveLeagueId,
      subscribeToMatchCommentary,
      settings,
      updateSettings,
      resetSettings,
      politeAnnouncement,
      announce,
    ],
  );

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtimeHub(): RealtimeContextValue {
  const ctx = useContext(RealtimeContext);
  if (!ctx) {
    throw new Error('useRealtimeHub must be used within a RealtimeProvider');
  }
  return ctx;
}

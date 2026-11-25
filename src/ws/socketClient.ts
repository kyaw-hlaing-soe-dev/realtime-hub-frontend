import {
  DEFAULT_LEAGUE_ID,
  normalizeCommentaryEntry,
  normalizeFixturesSnapshot,
  normalizeMatchItem,
} from '../lib/normalizers';
import type {
  CommentaryEntry,
  ConnectionState,
  FixturesSnapshot,
  MatchItem,
  WsOutgoingMessage,
  WsRawMessage,
} from '../types/football';

export function resolveWebSocketUrl(
  pathOrUrl: string = '/ws',
  win: Pick<Window, 'location'> | undefined = typeof window !== 'undefined'
    ? window
    : undefined,
): string {
  if (/^wss?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl.replace(/^http/i, 'ws');
  }
  if (!win?.location) {
    return `ws://localhost:3000${pathOrUrl.startsWith('/') ? '' : '/'}${pathOrUrl}`;
  }
  const protocol = win.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const normalizedPath = pathOrUrl.startsWith('/')
    ? pathOrUrl
    : `/${pathOrUrl}`;
  return `${protocol}//${win.location.host}${normalizedPath}`;
}

export function computeReconnectDelayMs(
  attempt: number,
  options: { baseMs?: number; maxMs?: number; jitterRatio?: number } = {},
): number {
  const baseMs = options.baseMs ?? 1000;
  const maxMs = options.maxMs ?? 30000;
  const jitterRatio = options.jitterRatio ?? 0.2;
  const exponential = Math.min(maxMs, baseMs * Math.pow(2, Math.max(0, attempt)));
  if (jitterRatio <= 0) return exponential;
  const jitter = exponential * jitterRatio * Math.random();
  return Math.round(Math.min(maxMs, exponential + jitter));
}

export function toWireMatchId(matchId: string | number): string | number {
  if (typeof matchId === 'number') return matchId;
  const trimmed = matchId.trim();
  return /^\d+$/.test(trimmed) ? Number(trimmed) : trimmed;
}

export interface SocketLike {
  readonly readyState: number;
  onopen: ((ev: Event) => unknown) | null;
  onmessage: ((ev: MessageEvent) => unknown) | null;
  onerror: ((ev: Event) => unknown) | null;
  onclose: ((ev: CloseEvent) => unknown) | null;
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export type SocketFactory = (url: string) => SocketLike;

export interface RealtimeSocketHandlers {
  onConnectionStateChange?: (state: ConnectionState) => void;
  onWelcome?: () => void;
  onSubscribedFixtures?: (leagueId: number) => void;
  onFixturesSnapshot?: (snapshot: FixturesSnapshot) => void;
  onFixturesUpdated?: (snapshot: FixturesSnapshot) => void;
  onMatchCreated?: (match: MatchItem) => void;
  onCommentary?: (entry: CommentaryEntry) => void;
  onProtocolError?: (message: string) => void;
}

export interface RealtimeSocketOptions {
  url?: string;
  league?: number;
  socketFactory?: SocketFactory;
  handlers?: RealtimeSocketHandlers;
  baseReconnectMs?: number;
  maxReconnectMs?: number;
  jitterRatio?: number;
}

const WS_OPEN = 1;

export class RealtimeSocketClient {
  private url: string;
  private league: number;
  private socketFactory: SocketFactory;
  private handlers: RealtimeSocketHandlers;
  private baseReconnectMs: number;
  private maxReconnectMs: number;
  private jitterRatio: number;

  private socket: SocketLike | null = null;
  private state: ConnectionState = 'connecting';
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private manuallyClosed = false;
  private matchRefCounts = new Map<string, number>();

  private onlineListener = () => {
    if (!this.manuallyClosed && this.state !== 'connected') {
      this.reconnectAttempt = 0;
      this.openSocket();
    }
  };

  private offlineListener = () => {
    this.clearReconnectTimer();
    this.closeCurrentSocket(1000, 'Browser offline');
    this.setState('offline');
  };

  constructor(options: RealtimeSocketOptions = {}) {
    this.url = options.url ?? resolveWebSocketUrl('/ws');
    this.league = options.league ?? DEFAULT_LEAGUE_ID;
    this.socketFactory =
      options.socketFactory ?? ((url) => new WebSocket(url));
    this.handlers = options.handlers ?? {};
    this.baseReconnectMs = options.baseReconnectMs ?? 1000;
    this.maxReconnectMs = options.maxReconnectMs ?? 30000;
    this.jitterRatio = options.jitterRatio ?? 0.2;
  }

  getConnectionState(): ConnectionState {
    return this.state;
  }

  getLeague(): number {
    return this.league;
  }

  connect(): void {
    this.manuallyClosed = false;
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.onlineListener);
      window.addEventListener('offline', this.offlineListener);
    }

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setState('offline');
      return;
    }

    this.openSocket();
  }

  disconnect(): void {
    this.manuallyClosed = true;
    this.clearReconnectTimer();
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineListener);
      window.removeEventListener('offline', this.offlineListener);
    }

    if (this.socket && this.socket.readyState === WS_OPEN) {
      this.send({ type: 'unsubscribeFixtures', league: this.league });
      for (const matchId of this.matchRefCounts.keys()) {
        this.send({ type: 'unsubscribe', matchId: toWireMatchId(matchId) });
      }
    }

    this.closeCurrentSocket(1000, 'Client disconnected');
    this.setState('offline');
  }

  reconnectNow(): void {
    if (this.manuallyClosed) {
      this.connect();
      return;
    }
    this.clearReconnectTimer();
    this.closeCurrentSocket(1000, 'Manual reconnect');
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      this.setState('offline');
      return;
    }
    this.reconnectAttempt = 0;
    this.openSocket();
  }

  setUrl(nextUrl: string): void {
    if (nextUrl === this.url) return;
    this.url = nextUrl;
    if (!this.manuallyClosed) {
      this.reconnectNow();
    }
  }

  setLeague(nextLeague: number): void {
    if (nextLeague === this.league) return;
    const prevLeague = this.league;
    this.league = nextLeague;
    if (this.socket && this.socket.readyState === WS_OPEN) {
      this.send({ type: 'unsubscribeFixtures', league: prevLeague });
      this.send({ type: 'subscribeFixtures', league: nextLeague });
    }
  }

  subscribeMatch(matchId: string | number): void {
    const key = String(matchId);
    const currentCount = this.matchRefCounts.get(key) ?? 0;
    this.matchRefCounts.set(key, currentCount + 1);
    if (currentCount === 0 && this.socket && this.socket.readyState === WS_OPEN) {
      this.send({ type: 'subscribe', matchId: toWireMatchId(key) });
    }
  }

  unsubscribeMatch(matchId: string | number): void {
    const key = String(matchId);
    const currentCount = this.matchRefCounts.get(key) ?? 0;
    if (currentCount <= 1) {
      this.matchRefCounts.delete(key);
      if (this.socket && this.socket.readyState === WS_OPEN) {
        this.send({ type: 'unsubscribe', matchId: toWireMatchId(key) });
      }
    } else {
      this.matchRefCounts.set(key, currentCount - 1);
    }
  }

  private setState(nextState: ConnectionState): void {
    if (this.state === nextState) return;
    this.state = nextState;
    this.handlers.onConnectionStateChange?.(nextState);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private closeCurrentSocket(code?: number, reason?: string): void {
    const current = this.socket;
    if (!current) return;
    this.socket = null;
    current.onopen = null;
    current.onmessage = null;
    current.onerror = null;
    current.onclose = null;
    try {
      current.close(code, reason);
    } catch {
      // Ignore close errors on torn-down sockets
    }
  }

  private openSocket(): void {
    this.clearReconnectTimer();
    this.closeCurrentSocket();

    this.setState(this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting');

    let socket: SocketLike;
    try {
      socket = this.socketFactory(this.url);
    } catch {
      this.scheduleReconnect();
      return;
    }

    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) return;
      this.send({ type: 'subscribeFixtures', league: this.league });
      for (const matchId of this.matchRefCounts.keys()) {
        this.send({ type: 'subscribe', matchId: toWireMatchId(matchId) });
      }
    };

    socket.onmessage = (event: MessageEvent) => {
      if (this.socket !== socket) return;
      this.handleRawMessage(event.data);
    };

    socket.onerror = () => {
      if (this.socket !== socket) return;
      // Non-blocking error; onclose will schedule reconnect if socket terminates.
    };

    socket.onclose = () => {
      if (this.socket !== socket) return;
      this.socket = null;
      if (this.manuallyClosed) {
        this.setState('offline');
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        this.setState('offline');
        return;
      }
      this.scheduleReconnect();
    };
  }

  private scheduleReconnect(): void {
    this.clearReconnectTimer();
    this.setState('reconnecting');
    const delayMs = computeReconnectDelayMs(this.reconnectAttempt, {
      baseMs: this.baseReconnectMs,
      maxMs: this.maxReconnectMs,
      jitterRatio: this.jitterRatio,
    });
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyClosed) {
        this.openSocket();
      }
    }, delayMs);
  }

  private send(message: WsOutgoingMessage): void {
    if (!this.socket || this.socket.readyState !== WS_OPEN) return;
    try {
      this.socket.send(JSON.stringify(message));
    } catch {
      // Transport errors will surface via onclose/onerror
    }
  }

  private handleRawMessage(rawData: unknown): void {
    if (typeof rawData !== 'string') return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawData);
    } catch {
      return;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      typeof (parsed as WsRawMessage).type !== 'string'
    ) {
      return;
    }

    const msg = parsed as WsRawMessage;
    switch (msg.type) {
      case 'welcome': {
        this.reconnectAttempt = 0;
        this.setState('connected');
        this.handlers.onWelcome?.();
        break;
      }
      case 'subscribedFixtures': {
        this.reconnectAttempt = 0;
        this.setState('connected');
        const leagueNum =
          typeof msg.league === 'number' ? msg.league : this.league;
        this.handlers.onSubscribedFixtures?.(leagueNum);
        break;
      }
      case 'fixturesSnapshot': {
        this.reconnectAttempt = 0;
        this.setState('connected');
        const payload = msg.payload ?? msg.data ?? msg;
        const snapshot = normalizeFixturesSnapshot(payload, this.league);
        this.handlers.onFixturesSnapshot?.(snapshot);
        break;
      }
      case 'fixturesUpdated': {
        this.reconnectAttempt = 0;
        this.setState('connected');
        const payload = msg.payload ?? msg.data ?? msg;
        const snapshot = normalizeFixturesSnapshot(payload, this.league);
        const withFreshTime: FixturesSnapshot = {
          ...snapshot,
          updatedAt: snapshot.updatedAt ?? new Date().toISOString(),
        };
        this.handlers.onFixturesUpdated?.(withFreshTime);
        break;
      }
      case 'matchCreated': {
        const rawMatch = msg.match ?? msg.data ?? msg.payload ?? msg;
        const match = normalizeMatchItem(rawMatch, {
          defaultSource: 'saved',
          isSavedMatch: true,
        });
        if (match) {
          this.handlers.onMatchCreated?.(match);
        }
        break;
      }
      case 'commentary': {
        const rawEntry = msg.entry ?? msg.commentary ?? msg.data ?? msg.payload ?? msg;
        const fallbackMatchId =
          typeof msg.matchId === 'string' || typeof msg.matchId === 'number'
            ? String(msg.matchId)
            : undefined;
        const entry = normalizeCommentaryEntry(rawEntry, fallbackMatchId);
        if (entry) {
          this.handlers.onCommentary?.(entry);
        }
        break;
      }
      case 'error': {
        const errorMessage =
          typeof msg.message === 'string' && msg.message.trim()
            ? msg.message.trim()
            : typeof msg.error === 'string' && msg.error.trim()
              ? msg.error.trim()
              : 'WebSocket subscription error.';
        this.handlers.onProtocolError?.(errorMessage);
        break;
      }
      default:
        break;
    }
  }
}

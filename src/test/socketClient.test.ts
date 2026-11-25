import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  RealtimeSocketClient,
  type SocketLike,
} from '../ws/socketClient';

class MockSocket implements SocketLike {
  static instances: MockSocket[] = [];
  readonly url: string;
  readyState = 0; // CONNECTING
  sent: string[] = [];

  onopen: ((ev: Event) => unknown) | null = null;
  onmessage: ((ev: MessageEvent) => unknown) | null = null;
  onerror: ((ev: Event) => unknown) | null = null;
  onclose: ((ev: CloseEvent) => unknown) | null = null;

  constructor(url: string) {
    this.url = url;
    MockSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code: number = 1000, reason: string = ''): void {
    this.readyState = 3; // CLOSED
    this.onclose?.({ code, reason } as CloseEvent);
  }

  simulateOpen(): void {
    this.readyState = 1; // OPEN
    this.onopen?.(new Event('open'));
  }

  simulateMessage(payload: unknown): void {
    this.onmessage?.(
      new MessageEvent('message', { data: JSON.stringify(payload) }),
    );
  }

  simulateDrop(): void {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: 'Abnormal closure' } as CloseEvent);
  }
}

describe('RealtimeSocketClient', () => {
  beforeEach(() => {
    MockSocket.instances = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('subscribes to league 39 on open and marks connected on welcome', () => {
    const states: string[] = [];
    const snapshots: number[] = [];
    const errors: string[] = [];

    const client = new RealtimeSocketClient({
      url: 'ws://localhost/ws',
      league: 39,
      socketFactory: (url) => new MockSocket(url),
      handlers: {
        onConnectionStateChange: (s) => states.push(s),
        onFixturesSnapshot: (snap) => snapshots.push(snap.fixtures.length),
        onProtocolError: (msg) => errors.push(msg),
      },
    });

    client.connect();
    expect(client.getConnectionState()).toBe('connecting');

    const socket = MockSocket.instances[0]!;
    socket.simulateOpen();

    expect(socket.sent).toEqual([
      JSON.stringify({ type: 'subscribeFixtures', league: 39 }),
    ]);

    // Still connecting until welcome arrives
    expect(client.getConnectionState()).toBe('connecting');

    socket.simulateMessage({ type: 'welcome' });
    expect(client.getConnectionState()).toBe('connected');

    socket.simulateMessage({
      type: 'subscribedFixtures',
      league: 39,
    });

    socket.simulateMessage({
      type: 'fixturesSnapshot',
      fixtures: [
        {
          id: 'f1',
          homeTeam: 'Arsenal',
          awayTeam: 'Chelsea',
          status: 'scheduled',
          kickoffAt: '2026-11-25T19:45:00Z',
        },
      ],
    });
    expect(snapshots).toEqual([1]);

    socket.simulateMessage({ type: 'error', message: 'Rate limited' });
    expect(errors).toEqual(['Rate limited']);

    client.disconnect();
    expect(socket.sent).toContain(
      JSON.stringify({ type: 'unsubscribeFixtures', league: 39 }),
    );
    expect(states).toContain('connected');
  });

  it('reconnects with backoff and resubscribes fixtures and active commentary channels', () => {
    const client = new RealtimeSocketClient({
      url: 'ws://localhost/ws',
      league: 39,
      baseReconnectMs: 1000,
      maxReconnectMs: 8000,
      jitterRatio: 0,
      socketFactory: (url) => new MockSocket(url),
    });

    client.connect();
    const first = MockSocket.instances[0]!;
    first.simulateOpen();
    first.simulateMessage({ type: 'welcome' });

    // Open a match detail subscription
    client.subscribeMatch('123');
    expect(first.sent).toContain(
      JSON.stringify({ type: 'subscribe', matchId: 123 }),
    );

    // Drop transport
    first.simulateDrop();
    expect(client.getConnectionState()).toBe('reconnecting');

    // Advance timer for first reconnect attempt (1000ms)
    vi.advanceTimersByTime(1000);
    expect(MockSocket.instances).toHaveLength(2);

    const second = MockSocket.instances[1]!;
    second.simulateOpen();
    expect(second.sent).toEqual([
      JSON.stringify({ type: 'subscribeFixtures', league: 39 }),
      JSON.stringify({ type: 'subscribe', matchId: 123 }),
    ]);

    second.simulateMessage({ type: 'welcome' });
    expect(client.getConnectionState()).toBe('connected');

    client.unsubscribeMatch('123');
    expect(second.sent).toContain(
      JSON.stringify({ type: 'unsubscribe', matchId: 123 }),
    );

    client.disconnect();
  });
});

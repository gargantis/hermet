import { describe, expect, it } from 'vitest';
import { declaredUrls, roomConfig } from './room-config';

// Every key below that Trystero misses sends it to a host the app never
// declared, or to its 256 MiB receive budget.
const base = { appId: 'app', relays: ['wss://relay.example.test'], iceServers: [], maxReceiveBytes: 1024 };

describe('roomConfig', () => {
  it('passes exactly the declared relays, ICE servers and budget, under the keys Trystero reads', () => {
    const ice = [{ urls: ['stun:stun.example.test:3478'] }];
    expect(roomConfig({ ...base, iceServers: ice })).toEqual({
      appId: 'app',
      relayConfig: { urls: ['wss://relay.example.test'] },
      rtcConfig: { iceServers: ice },
      maxReceiveBytes: 1024,
      passive: false,
    });
  });

  it('sets iceServers even when empty, so Trystero adds no STUN servers of its own', () => {
    expect(roomConfig(base).rtcConfig).toEqual({ iceServers: [] });
  });

  it('refuses an empty relay list', () => {
    expect(() => roomConfig({ ...base, relays: [] })).toThrow();
  });

  it('makes a passive room, and rewrites mDNS to loopback only when asked', () => {
    const c = roomConfig({ ...base, passive: true, loopbackMdns: true });
    expect(c.passive).toBe(true);
    expect(c._test_only_mdnsHostFallbackToLoopback).toBe(true);
    expect(Object.keys(roomConfig(base))).not.toContain('_test_only_mdnsHostFallbackToLoopback');
  });
});

describe('declaredUrls', () => {
  it('lists the URLs of one kind of host, in file order', () => {
    const thirdParty = [
      { kind: 'signaling', url: 'wss://b.example.test' },
      { kind: 'stun', url: 'stun:s.example.test:3478' },
      { kind: 'signaling', url: 'wss://a.example.test' },
    ];
    expect(declaredUrls(thirdParty, 'signaling')).toEqual(['wss://b.example.test', 'wss://a.example.test']);
    expect(declaredUrls(thirdParty, 'link')).toEqual([]);
  });
});

// Trystero falls back on hosts an app never declared: its own Nostr relays
// when `relayConfig.urls` is missing (a misspelt key is enough), its own
// STUN servers when `iceServers` is unset, and a 256 MiB receive budget.
// roomConfig builds joinRoom's config from what the app declares only, as
// a literal typed against the library's JoinRoomConfig, so each app's tsc
// turns a misspelt key into a compile error. Type-only import: the app's
// one Trystero file stays the only runtime importer.
import type { JoinRoomConfig } from '@trystero-p2p/nostr';

/** The URLs third-party.json declares for one kind of host, in file order. */
export function declaredUrls(thirdParty: readonly { kind: string; url: string }[], kind: string): string[] {
  return thirdParty.filter((e) => e.kind === kind).map((e) => e.url);
}

export interface RoomConfigInput {
  appId: string;
  /** The signaling relays; never empty. */
  relays: readonly string[];
  /** Always set, even empty, so Trystero adds no STUN servers of its own. */
  iceServers: readonly RTCIceServer[];
  /** The room's receive budget: Trystero refuses a larger payload before buffering it. */
  maxReceiveBytes: number;
  passive?: boolean | undefined;
  /** Tests on one machine: mDNS host candidates fall back to loopback. */
  loopbackMdns?: boolean | undefined;
}

export function roomConfig(o: RoomConfigInput): JoinRoomConfig {
  // With no relays the room can meet no one.
  if (o.relays.length === 0) throw new Error('no signaling relays');
  const config: JoinRoomConfig = {
    appId: o.appId,
    relayConfig: { urls: [...o.relays] },
    rtcConfig: { iceServers: [...o.iceServers] },
    maxReceiveBytes: o.maxReceiveBytes,
    passive: o.passive ?? false,
  };
  if (o.loopbackMdns) config._test_only_mdnsHostFallbackToLoopback = true;
  return config;
}

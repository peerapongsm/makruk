// Room — Supabase Realtime transport for makruk online PvP: create/join a 2-player
// room, broadcast/receive NetMsg, presence-based join/leave, host color assignment.
//
// Thin on purpose: this module knows nothing about game rules. All move/turn
// integrity lives in `./session.ts`; this only moves bytes and tracks who's here.
// Not unit-mocked against real Supabase Realtime (low-value per the online-PvP
// plan) — verified live in the two-browser e2e (see repo plan, task 6).
import { REALTIME_SUBSCRIBE_STATES } from "@supabase/supabase-js";
import { supabase } from "../config/supabase";
import type { Player } from "../identity";
import type { Color } from "../makruk/types";
import { decode, encode, type NetMsg } from "./protocol";

export interface RoomHandle {
  roomId: string;
  send(msg: NetMsg): void;
  onMessage(cb: (msg: NetMsg) => void): void;
  onPeerJoin(cb: (peer: { peerId: string; nickname?: string }) => void): void;
  onPeerLeave(cb: () => void): void; // presence-leave → game ends
  leave(): void;
}

/** Presence payload each client tracks under its own `peerId` as the presence key. */
type PresenceMeta = { peerId: string; nickname: string };

/** Sole namespace boundary on this shared Supabase project — do not drop the prefix. */
function channelName(roomId: string): string {
  return `makruk:${roomId}`;
}

/** Long, unguessable room code (a UUID has 122 bits of randomness). */
function randomRoomId(): string {
  return crypto.randomUUID();
}

/**
 * Wires up the shared broadcast/presence-leave bindings and returns a `RoomHandle`
 * plus `emitPeerJoin` — an internal hook `createRoom`/`joinRoom` call from their own
 * `presence-join` binding, since the host and guest react to a peer joining
 * differently (host assigns colors + starts the game; guest just reports the peer).
 */
function makeHandle(
  roomId: string,
  me: Player,
  channel: ReturnType<typeof supabase.channel>
): { handle: RoomHandle; emitPeerJoin: (peer: { peerId: string; nickname?: string }) => void } {
  let messageCb: ((msg: NetMsg) => void) | undefined;
  let joinCb: ((peer: { peerId: string; nickname?: string }) => void) | undefined;
  let leaveCb: (() => void) | undefined;

  const handle: RoomHandle = {
    roomId,
    send(msg) {
      void channel.send({ type: "broadcast", event: "msg", payload: encode(msg) });
    },
    onMessage(cb) {
      messageCb = cb;
    },
    onPeerJoin(cb) {
      joinCb = cb;
    },
    onPeerLeave(cb) {
      leaveCb = cb;
    },
    leave() {
      void channel.unsubscribe();
    },
  };

  channel.on("broadcast", { event: "msg" }, (broadcast) => {
    // `broadcast.payload` is `encode`'s JSON *string* (see `send` below), not yet
    // parsed — and `decode` (by design, per protocol.test.ts) takes an already-parsed
    // value, not raw JSON text. `JSON.parse` can throw on a malformed/malicious peer
    // payload, where `decode` itself never does — so guard it here to preserve that
    // contract.
    let raw: unknown;
    try {
      raw = JSON.parse(broadcast.payload as string);
    } catch {
      return;
    }
    const msg = decode(raw);
    if (!msg) return;
    if (msg.peerId === me.peerId) return; // drop our own echo
    messageCb?.(msg);
  });

  channel.on<PresenceMeta>("presence", { event: "leave" }, ({ key }) => {
    if (key === me.peerId) return;
    leaveCb?.();
  });

  return { handle, emitPeerJoin: (peer) => joinCb?.(peer) };
}

/** Host: create a room, wait for the guest, assign colors, announce `start`. */
export function createRoom(me: Player): Promise<RoomHandle> {
  const roomId = randomRoomId();
  const channel = supabase.channel(channelName(roomId), {
    config: { presence: { key: me.peerId } },
  });
  const { handle, emitPeerJoin } = makeHandle(roomId, me, channel);

  return new Promise((resolve) => {
    let started = false;

    channel.on<PresenceMeta>("presence", { event: "join" }, ({ key, newPresences }) => {
      if (key === me.peerId || started) return;
      started = true;
      const peer = newPresences[0];
      emitPeerJoin({ peerId: key, nickname: peer?.nickname });
      // Host color: first-mover ("white") by default; a later task may add a toggle.
      const hostColor: Color = "white";
      handle.send({ t: "start", peerId: me.peerId, hostColor });
    });

    channel.subscribe((status) => {
      if (status !== REALTIME_SUBSCRIBE_STATES.SUBSCRIBED) return;
      void channel.track({ peerId: me.peerId, nickname: me.nickname } satisfies PresenceMeta).then(() => {
        resolve(handle);
      });
    });
  });
}

/**
 * Guest: join a room. Resolves `null` if the room is already full (host + 1 guest
 * already present). There's no separate "room doesn't exist" signal — this app is
 * broadcast/presence only (no rooms table), so an empty channel and a never-created
 * one look identical; a bad `roomId` just leaves the guest waiting for `start`.
 */
export function joinRoom(roomId: string, me: Player): Promise<RoomHandle | null> {
  const channel = supabase.channel(channelName(roomId), {
    config: { presence: { key: me.peerId } },
  });
  const { handle, emitPeerJoin } = makeHandle(roomId, me, channel);

  return new Promise((resolve) => {
    let decided = false;

    channel.on<PresenceMeta>("presence", { event: "join" }, ({ key, newPresences }) => {
      if (key === me.peerId) return;
      const peer = newPresences[0];
      emitPeerJoin({ peerId: key, nickname: peer?.nickname });
    });

    // The initial `sync` delivers the room's current presence state before we track
    // our own — the right moment to decide "room full" vs. "room joinable".
    channel.on("presence", { event: "sync" }, () => {
      if (decided) return;
      decided = true;

      const memberCount = Object.keys(channel.presenceState()).length;
      if (memberCount >= 2) {
        void channel.unsubscribe();
        resolve(null);
        return;
      }

      void channel.track({ peerId: me.peerId, nickname: me.nickname } satisfies PresenceMeta).then(() => {
        handle.send({ t: "hello", peerId: me.peerId, nickname: me.nickname });
        resolve(handle);
      });
    });

    channel.subscribe();
  });
}

/** Pure: maps host/guest + the host's chosen color onto `{ local, remote }`. */
export function assignColors(isHost: boolean, hostColor: Color): { local: Color; remote: Color } {
  const guestColor: Color = hostColor === "white" ? "black" : "white";
  return isHost ? { local: hostColor, remote: guestColor } : { local: guestColor, remote: hostColor };
}

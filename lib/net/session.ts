// Session — turn state machine + engine-validated move guard for makruk online PvP.
//
// This is the anti-cheat core: there is no server, so this client-side guard IS the
// entire security boundary against a modified/malicious peer's client. Every move
// applied through this module — local or remote — must pass BOTH:
//   1. the turn guard (it must actually be that color's turn right now), and
//   2. the engine's own legality check, via `legalMovesFrom` (never a try/catch
//      around `applyMove` for control flow — `applyMove` throws on illegal input).
//
// Read-only dependency on the engine (see ./README.md for its full recorded API) —
// nothing here mutates or reimplements engine logic; this is a thin wrapper.
import { applyMove, createInitialState, legalMovesFrom, resign } from "../makruk/engine";
import type { Color, GameState } from "../makruk/types";
import type { EngineMove, NetMsg } from "./protocol";

export interface Session {
  readonly localColor: Color;
  readonly game: GameState;
  readonly over: boolean;
  readonly result?: "win" | "lose" | "draw";
}

export function createSession(localColor: Color): Session {
  const game = createInitialState();
  return { localColor, game, ...deriveOutcome(game, localColor) };
}

/** Is it the local player's turn, per the engine's own game state? */
export function isLocalTurn(s: Session): boolean {
  return s.game.turn === s.localColor;
}

/** Guard: local turn + engine-legal, else reject. */
export function applyLocalMove(s: Session, move: EngineMove): { ok: boolean; s: Session } {
  if (!isLocalTurn(s)) return { ok: false, s };
  return applyGuardedMove(s, move);
}

/** Guard: it's fromPeer's turn + engine-legal, else reject. */
export function applyRemoteMove(
  s: Session,
  move: EngineMove,
  fromPeer: Color
): { ok: boolean; s: Session } {
  if (s.game.turn !== fromPeer) return { ok: false, s };
  return applyGuardedMove(s, move);
}

/** Dispatch an incoming net message onto the session. */
export function applyRemote(s: Session, msg: NetMsg, peerColor: Color): { ok: boolean; s: Session } {
  switch (msg.t) {
    case "move":
      return applyRemoteMove(s, msg.move, peerColor);
    case "resign": {
      const game = resign(s.game, peerColor);
      return { ok: true, s: { ...s, game, ...deriveOutcome(game, s.localColor) } };
    }
    case "count-declare":
      // Informational only. Per lib/net/README.md, the engine auto-detects and
      // tracks counting state (GameState.counting) inside `applyMove` itself —
      // there is no separate engine "declare counting" action to invoke, and a
      // peer's declaration carries no legality/security weight of its own.
      return { ok: true, s };
    case "hello":
    case "start":
      // Connection-layer messages (peer join / color assignment), not game state.
      // Nothing for the session to do with them.
      return { ok: true, s };
    default:
      return { ok: false, s };
  }
}

/** Turn-checked callers land here; this half is the shared engine-legality guard. */
function applyGuardedMove(s: Session, move: EngineMove): { ok: boolean; s: Session } {
  const legal = legalMovesFrom(s.game, move.from).some((m) => m.to === move.to);
  if (!legal) return { ok: false, s };
  const game = applyMove(s.game, { from: move.from, to: move.to });
  return { ok: true, s: { ...s, game, ...deriveOutcome(game, s.localColor) } };
}

/** Map the engine's own (color-neutral) result onto the local player's win/lose/draw. */
function deriveOutcome(game: GameState, localColor: Color): Pick<Session, "over" | "result"> {
  if (!game.result) return { over: false, result: undefined };
  const { winner } = game.result;
  const result = winner === null ? "draw" : winner === localColor ? "win" : "lose";
  return { over: true, result };
}

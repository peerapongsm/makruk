// Pure message codec for makruk online PvP, sent over Supabase Realtime broadcast
// payloads. Parameterized over the existing engine's own types (read-only import —
// see ./README.md for the full recorded engine API this module depends on).
//
// `decode` never throws: it validates shape/primitives and returns null on anything
// malformed or unrecognized. Full move legality is NOT checked here — that's the
// session layer's job (this only checks the move has the engine's Move shape).
import type { Color, CountingType, Move, Piece, PieceType } from "../makruk/types";

/** The engine's own move type, reused verbatim as the wire shape for "move" messages. */
export type EngineMove = Move;

/** Which counting rule a player is declaring — reuses the engine's CountingType. */
export type CountKind = CountingType;

export type NetMsg =
  | { t: "hello"; peerId: string; nickname: string }
  | { t: "start"; peerId: string; hostColor: Color } // host announces color assignment on 2nd join
  | { t: "move"; peerId: string; move: EngineMove }
  | { t: "count-declare"; peerId: string; kind: CountKind }
  | { t: "resign"; peerId: string };

export function encode(msg: NetMsg): string {
  return JSON.stringify(msg);
}

const PIECE_TYPES: readonly PieceType[] = ["khun", "met", "khon", "ma", "rua", "bia"];
const COLORS: readonly Color[] = ["white", "black"];
const COUNT_KINDS: readonly CountKind[] = ["board", "material"];

function isString(v: unknown): v is string {
  return typeof v === "string";
}

function isOneOf<T extends string>(v: unknown, values: readonly T[]): v is T {
  return typeof v === "string" && (values as readonly string[]).includes(v);
}

function isPiece(v: unknown): v is Piece {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (!isOneOf(p.type, PIECE_TYPES)) return false;
  if (!isOneOf(p.color, COLORS)) return false;
  if (p.promoted !== undefined && typeof p.promoted !== "boolean") return false;
  return true;
}

/** Lightweight structural guard for the engine's Move shape (not legality). */
function isEngineMove(v: unknown): v is EngineMove {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  if (typeof m.from !== "number" || typeof m.to !== "number") return false;
  if (!isPiece(m.piece)) return false;
  if (m.captured !== null && !isPiece(m.captured)) return false;
  if (typeof m.promotion !== "boolean") return false;
  return true;
}

export function decode(raw: unknown): NetMsg | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  switch (obj.t) {
    case "hello":
      if (isString(obj.peerId) && isString(obj.nickname)) {
        return { t: "hello", peerId: obj.peerId, nickname: obj.nickname };
      }
      return null;
    case "start":
      if (isString(obj.peerId) && isOneOf(obj.hostColor, COLORS)) {
        return { t: "start", peerId: obj.peerId, hostColor: obj.hostColor };
      }
      return null;
    case "move":
      if (isString(obj.peerId) && isEngineMove(obj.move)) {
        return { t: "move", peerId: obj.peerId, move: obj.move };
      }
      return null;
    case "count-declare":
      if (isString(obj.peerId) && isOneOf(obj.kind, COUNT_KINDS)) {
        return { t: "count-declare", peerId: obj.peerId, kind: obj.kind };
      }
      return null;
    case "resign":
      if (isString(obj.peerId)) {
        return { t: "resign", peerId: obj.peerId };
      }
      return null;
    default:
      return null;
  }
}

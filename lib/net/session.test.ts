import { describe, it, expect } from "vitest";
import { createSession, isLocalTurn, applyLocalMove, applyRemoteMove } from "./session";
import type { EngineMove } from "./protocol";

// Real engine moves for the standard start position (white moves first).
// Derived from lib/makruk/board.ts (initialBoard) + lib/makruk/moves.ts (pseudoMovesFrom):
//   - White เบี้ย (pawn) starts on row 2 (index row*8+col); a-file pawn = square 16.
//     Pawns move one step forward only (no double-step) -> a-file pawn's only legal
//     move is 16 -> 24 (row 3, same file).
//   - Black เบี้ย (pawn) starts on row 5; a-file pawn = square 40, forward (row-1) one
//     step -> 40 -> 32.
//   - Black เรือ (rook) starts on row 7 col 0 = square 56; rank 6 (row 6, square 48) is
//     empty and rank 5 (square 40) still holds black's own a-file pawn, so the rook's
//     only legal move is 56 -> 48 (a slide of exactly one square, blocked beyond that).
// Cross-checked against lib/makruk/perft.test.ts's depth-1 = 23 for the same position.

const whiteFirstPawnMove: EngineMove = {
  from: 16,
  to: 24,
  piece: { type: "bia", color: "white" },
  captured: null,
  promotion: false,
};

const blackFirstPawnMove: EngineMove = {
  from: 40,
  to: 32,
  piece: { type: "bia", color: "black" },
  captured: null,
  promotion: false,
};

// Illegal for white at the start position: legalMovesFrom(state, 16) only contains
// to=24 (one step); this claims a two-step jump to 32, which pseudoMovesFrom never
// generates (see moves.ts: pawns only get a single non-capturing forward step).
const illegalWhitePawnJump: EngineMove = {
  from: 16,
  to: 32,
  piece: { type: "bia", color: "white" },
  captured: null,
  promotion: false,
};

// Illegal for black once it's black's turn (after white's first move): the a-file
// rook's only legal slide is 56 -> 48; this claims sliding two squares to 40, which
// is occupied by black's own a-file pawn (blocked, not a legal target).
const illegalBlackRookSlide: EngineMove = {
  from: 56,
  to: 40,
  piece: { type: "rua", color: "black" },
  captured: null,
  promotion: false,
};

describe("session turn guard + engine validation", () => {
  it("assigns local color and reports whose turn", () => {
    const s = createSession("white");
    expect(isLocalTurn(s)).toBe(true);
  });

  it("rejects a local move when it is not our turn", () => {
    const s = createSession("black");
    const r = applyLocalMove(s, whiteFirstPawnMove);
    expect(r.ok).toBe(false); // not black's turn at start
  });

  it("rejects an illegal incoming move via the engine", () => {
    const s = createSession("white");
    const r = applyRemoteMove(s, illegalWhitePawnJump, "black");
    expect(r.ok).toBe(false);
  });

  it("rejects a remote move tagged with the wrong peer color even though the move itself is legal", () => {
    // Isolates the turn guard from the legality guard: after white's first move it
    // is black's turn, and blackFirstPawnMove IS legal for the actual mover (black).
    // Tagging it fromPeer: "white" must still be rejected on the turn check alone —
    // proving the turn guard, not incidental illegality, is what stops it.
    let s = createSession("white");
    s = applyLocalMove(s, whiteFirstPawnMove).s;
    const r = applyRemoteMove(s, blackFirstPawnMove, "white");
    expect(r.ok).toBe(false);
  });

  it("rejects an illegal move even when it is the mover's actual turn", () => {
    // Isolates the legality guard from the turn guard: turn matches (black to move
    // after white's first move), but the move itself is not engine-legal.
    let s = createSession("white");
    s = applyLocalMove(s, whiteFirstPawnMove).s;
    const r = applyRemoteMove(s, illegalBlackRookSlide, "black");
    expect(r.ok).toBe(false);
  });

  it("accepts a legal move and advances the turn", () => {
    const s = createSession("white");
    const r = applyLocalMove(s, whiteFirstPawnMove);
    expect(r.ok).toBe(true);
    expect(isLocalTurn(r.s)).toBe(false); // now the opponent's turn
  });

  it("rejects an out-of-turn remote move (opponent moving twice)", () => {
    let s = createSession("white");
    s = applyLocalMove(s, whiteFirstPawnMove).s;
    const r1 = applyRemoteMove(s, blackFirstPawnMove, "black");
    expect(r1.ok).toBe(true);
    const r2 = applyRemoteMove(r1.s, blackFirstPawnMove, "black");
    expect(r2.ok).toBe(false); // it's white's turn now
  });
});

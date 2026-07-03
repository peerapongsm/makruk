import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "./board";
import { allLegalMoves, applyMove, isInCheck, legalMovesFrom } from "./engine";
import { boardFrom, p, stateFrom } from "./testHelpers";

const sq = algebraicToSquare;

describe("legal move filter (pins/check)", () => {
  it("forbids moves that expose the own king to check", () => {
    const board = boardFrom({
      d1: p("khun", "white"),
      d2: p("rua", "white"),
      d8: p("rua", "black"),
      a8: p("khun", "black"),
    });
    const state = stateFrom(board, "white");
    const moves = legalMovesFrom(state, sq("d2")).map((m) => m.to);
    expect(moves.sort()).toEqual([sq("d3"), sq("d4"), sq("d5"), sq("d6"), sq("d7"), sq("d8")].sort());
    expect(moves).not.toContain(sq("e2"));
    expect(moves).not.toContain(sq("c2"));
  });

  it("isInCheck detects an attacked king", () => {
    const board = boardFrom({ d1: p("khun", "white"), d8: p("rua", "black") });
    expect(isInCheck(board, "white")).toBe(true);
  });

  it("a king may not move into check", () => {
    const board = boardFrom({ d4: p("khun", "white"), d8: p("rua", "black"), a1: p("khun", "black") });
    const moves = legalMovesFrom(stateFrom(board, "white"), sq("d4")).map((m) => m.to);
    expect(moves).not.toContain(sq("d5"));
    expect(moves).not.toContain(sq("d3"));
    expect(moves).toContain(sq("c4"));
    expect(moves).toContain(sq("e4"));
  });
});

describe("checkmate detection", () => {
  it("two รือ corner-mate the bare ขุน", () => {
    const board = boardFrom({
      a8: p("khun", "black"),
      a1: p("rua", "white"),
      b5: p("rua", "white"),
      c1: p("khun", "white"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("b5"), to: sq("b1") });
    expect(next.result).toEqual({ winner: "white", reason: "checkmate" });
  });
});

describe("stalemate detection (draw)", () => {
  it("bare ขุน with no legal moves and not in check is a draw", () => {
    const board = boardFrom({
      a8: p("khun", "black"),
      b3: p("rua", "white"),
      h1: p("rua", "white"),
      d1: p("khun", "white"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("h1"), to: sq("h7") });
    expect(next.result).toEqual({ winner: null, reason: "stalemate" });
    expect(isInCheck(next.board, "black")).toBe(false);
    expect(allLegalMoves(next)).toEqual([]);
  });
});

describe("promotion", () => {
  it("เบี้ย reaching the 6th own rank becomes เม็ด (promoted)", () => {
    const board = boardFrom({
      d5: p("bia", "white"),
      a1: p("khun", "white"),
      h8: p("khun", "black"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("d5"), to: sq("d6") });
    expect(next.board[sq("d6")]).toEqual({ type: "met", color: "white", promoted: true });
    expect(next.history[0].promotion).toBe(true);
  });
});

describe("threefold repetition", () => {
  it("draws when a position recurs a third time", () => {
    let state = stateFrom(boardFrom({ d4: p("khun", "white"), d6: p("khun", "black") }), "white");
    const cycle: [string, string][] = [
      ["d4", "d3"],
      ["d6", "d7"],
      ["d3", "d4"],
      ["d7", "d6"],
    ];
    // two full cycles = position recurs 3 times total (initial + after cycle 1 + after cycle 2)
    for (let i = 0; i < 7; i++) {
      const [from, to] = cycle[i % 4];
      state = applyMove(state, { from: sq(from), to: sq(to) });
      expect(state.result).toBeNull();
    }
    const [from, to] = cycle[7 % 4];
    state = applyMove(state, { from: sq(from), to: sq(to) });
    expect(state.result).toEqual({ winner: null, reason: "repetition" });
  });
});

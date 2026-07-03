import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "./board";
import { applyMove, currentCountingTally, positionKey } from "./engine";
import { boardFrom, p, stateFrom } from "./testHelpers";
import type { GameState } from "./types";

const sq = algebraicToSquare;

describe("นับศักดิ์หมาก (material counting)", () => {
  it("activates when the disadvantaged side is reduced to a bare ขุน, ceiling per tier (2 เรือ = 8)", () => {
    const board = boardFrom({
      a1: p("khun", "white"),
      h8: p("khun", "black"),
      a8: p("rua", "white"),
      h1: p("rua", "white"),
      b8: p("met", "black"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("a8"), to: sq("b8") });
    expect(next.counting).not.toBeNull();
    expect(next.counting?.type).toBe("material");
    expect(next.counting?.ceiling).toBe(8);
    expect(next.counting?.disadvantaged).toBe("black");
  });

  it("uses the one-ม้า ceiling (64) when that is the advantaged side's only non-king piece", () => {
    const board = boardFrom({
      a1: p("khun", "white"),
      h8: p("khun", "black"),
      d7: p("ma", "white"),
      b8: p("met", "black"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("d7"), to: sq("b8") }); // knight capture
    expect(next.counting?.type).toBe("material");
    expect(next.counting?.ceiling).toBe(64);
  });

  it("draws (counting-expired) once the ceiling is reached without checkmate", () => {
    const board = boardFrom({
      a1: p("khun", "white"),
      h8: p("khun", "black"),
      e1: p("rua", "white"),
      e2: p("rua", "white"),
    });
    let state: GameState = {
      board,
      turn: "white",
      history: [],
      counting: { type: "material", ceiling: 8, startCount: 4, startPly: 0, disadvantaged: "black" },
      result: null,
      positions: [positionKey(board, "white")],
    };
    expect(currentCountingTally(state)).toEqual({ count: 4, ceiling: 8 });

    state = applyMove(state, { from: sq("a1"), to: sq("b1") });
    expect(state.result).toBeNull();
    state = applyMove(state, { from: sq("h8"), to: sq("g8") });
    expect(state.result).toBeNull();
    state = applyMove(state, { from: sq("b1"), to: sq("a1") });
    expect(state.result).toBeNull();
    state = applyMove(state, { from: sq("g8"), to: sq("h8") });
    expect(state.result).toEqual({ winner: null, reason: "counting-expired" });
  });
});

describe("นับกระดาน (board counting)", () => {
  it("activates once neither side has any เบี้ย left, ceiling 64", () => {
    const board = boardFrom({
      a1: p("khun", "white"),
      h8: p("khun", "black"),
      a2: p("rua", "white"),
      b7: p("rua", "black"),
      c3: p("ma", "white"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("c3"), to: sq("b1") });
    expect(next.counting).not.toBeNull();
    expect(next.counting?.type).toBe("board");
    expect(next.counting?.ceiling).toBe(64);
  });

  it("does not activate while either side still has a เบี้ย", () => {
    const board = boardFrom({
      a1: p("khun", "white"),
      h8: p("khun", "black"),
      a2: p("rua", "white"),
      d7: p("bia", "black"),
    });
    const state = stateFrom(board, "white");
    const next = applyMove(state, { from: sq("a2"), to: sq("a3") });
    expect(next.counting).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { algebraicToSquare } from "./board";
import { allLegalMoves, applyMove } from "./engine";
import { boardFrom, p, stateFrom } from "./testHelpers";
import { chooseBotMove, DIFFICULTY } from "./bot";

const sq = algebraicToSquare;

describe("chooseBotMove", () => {
  it("always returns one of the legal moves", () => {
    const state = stateFrom(
      boardFrom({ a1: p("khun", "white"), h8: p("khun", "black"), d1: p("rua", "white") }),
      "white"
    );
    const legal = allLegalMoves(state).map((m) => `${m.from}-${m.to}`);
    const move = chooseBotMove(state, DIFFICULTY.medium);
    expect(move).not.toBeNull();
    expect(legal).toContain(`${move!.from}-${move!.to}`);
  });

  it("takes a free capture over a quiet move (material eval)", () => {
    const state = stateFrom(
      boardFrom({
        a1: p("khun", "white"),
        h8: p("khun", "black"),
        d4: p("rua", "white"),
        d7: p("met", "black"), // hanging: white's rook can capture it for free
      }),
      "white"
    );
    const move = chooseBotMove(state, DIFFICULTY.easy);
    expect(move).toEqual(expect.objectContaining({ from: sq("d4"), to: sq("d7") }));
  });

  it("plays checkmate-in-1 when available", () => {
    const state = stateFrom(
      boardFrom({
        a8: p("khun", "black"),
        a1: p("rua", "white"),
        b5: p("rua", "white"),
        c1: p("khun", "white"),
      }),
      "white"
    );
    const move = chooseBotMove(state, DIFFICULTY.hard)!;
    expect(move).not.toBeNull();
    const next = applyMove(state, move);
    expect(next.result).toEqual({ winner: "white", reason: "checkmate" });
  });

  it("returns null when there are no legal moves", () => {
    const state = stateFrom(
      boardFrom({
        a8: p("khun", "black"),
        b3: p("rua", "white"),
        h7: p("rua", "white"),
        d1: p("khun", "white"),
      }),
      "black" // stalemated
    );
    expect(chooseBotMove(state, DIFFICULTY.easy)).toBeNull();
  });
});

describe("difficulty presets", () => {
  it("matches spec: ง่าย=depth1+random, กลาง=depth2, ยาก=depth3", () => {
    expect(DIFFICULTY.easy).toEqual({ depth: 1, randomTiebreak: true });
    expect(DIFFICULTY.medium).toEqual({ depth: 2 });
    expect(DIFFICULTY.hard).toEqual({ depth: 3 });
  });
});

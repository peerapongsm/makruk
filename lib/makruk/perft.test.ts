import { describe, expect, it } from "vitest";
import { createInitialState, perft } from "./engine";

// Hand-derived from the movement rules (see board.ts / moves.ts comments), sourced from
// https://en.wikipedia.org/wiki/Makruk : from the initial position, White has
// 2 รือ moves + 2 ม้า moves + 6 โคน moves + 2 เม็ด moves + 3 ขุน moves + 8 เบี้ย moves = 23.
describe("perft from initial position", () => {
  const state = createInitialState();

  it("depth 1 = 23 legal moves", () => {
    expect(perft(state, 1)).toBe(23);
  });

  it("depth 2 grows and stays finite/deterministic", () => {
    const d2 = perft(state, 2);
    expect(d2).toBeGreaterThan(23);
    // symmetric starting position: black's replies mirror white's, so depth-2 = 23 * 23
    expect(d2).toBe(23 * 23);
  });

  it("depth 3 completes without error and grows further", () => {
    const d3 = perft(state, 3);
    expect(d3).toBeGreaterThan(perft(state, 2));
  });
});

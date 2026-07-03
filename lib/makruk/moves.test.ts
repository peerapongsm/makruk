import { describe, expect, it } from "vitest";
import { algebraicToSquare, emptyBoard, squareToAlgebraic } from "./board";
import { pseudoMovesFrom } from "./moves";
import { boardFrom, p } from "./testHelpers";
import type { Board, Piece } from "./types";

function destinations(board: Board, square: string): string[] {
  return pseudoMovesFrom(board, algebraicToSquare(square))
    .map((m) => squareToAlgebraic(m.to))
    .sort();
}

describe("ขุน (king) movement", () => {
  it("moves one step in any of 8 directions when unobstructed", () => {
    const board = boardFrom({ d4: p("khun", "white") });
    expect(destinations(board, "d4")).toEqual(
      ["c3", "c4", "c5", "d3", "d5", "e3", "e4", "e5"].sort()
    );
  });

  it("cannot move onto its own piece, can capture enemy piece", () => {
    const board = boardFrom({ d4: p("khun", "white"), d5: p("bia", "white"), e4: p("bia", "black") });
    const dest = destinations(board, "d4");
    expect(dest).not.toContain("d5");
    expect(dest).toContain("e4");
  });
});

describe("เม็ด (met) movement", () => {
  it("moves one step diagonally only, in all 4 directions", () => {
    const board = boardFrom({ d4: p("met", "white") });
    expect(destinations(board, "d4")).toEqual(["c3", "c5", "e3", "e5"].sort());
  });
});

describe("โคน (khon) movement", () => {
  it("moves one step diagonally (any direction) or one step straight forward", () => {
    const board = boardFrom({ d4: p("khon", "white") });
    // white forward = increasing rank
    expect(destinations(board, "d4")).toEqual(["c3", "c5", "d5", "e3", "e5"].sort());
  });

  it("forward direction depends on color", () => {
    const board = boardFrom({ d4: p("khon", "black") });
    expect(destinations(board, "d4")).toEqual(["c3", "c5", "d3", "e3", "e5"].sort());
  });

  it("cannot step straight backward", () => {
    const board = boardFrom({ d4: p("khon", "white") });
    expect(destinations(board, "d4")).not.toContain("d3");
  });
});

describe("ม้า (ma / knight) movement", () => {
  it("jumps in an L-shape and can jump over pieces", () => {
    const board = boardFrom({
      d4: p("ma", "white"),
      c4: p("bia", "white"),
      d5: p("bia", "white"),
      d3: p("bia", "white"),
      e4: p("bia", "white"),
    });
    expect(destinations(board, "d4")).toEqual(
      ["b3", "b5", "c2", "c6", "e2", "e6", "f3", "f5"].sort()
    );
  });
});

describe("เรือ (rua / rook) movement", () => {
  it("slides orthogonally until blocked, capturing the blocker if enemy", () => {
    const board = boardFrom({ d4: p("rua", "white"), d6: p("bia", "black"), f4: p("bia", "white") });
    const dest = destinations(board, "d4");
    expect(dest).toContain("d5");
    expect(dest).toContain("d6"); // capture
    expect(dest).not.toContain("d7"); // beyond the blocker
    expect(dest).toContain("e4");
    expect(dest).not.toContain("f4"); // own piece blocks before this square
    expect(dest).toContain("d1");
    expect(dest).toContain("a4");
  });
});

describe("เบี้ย (bia / pawn) movement", () => {
  it("moves one step forward only, no double-step, and cannot capture forward", () => {
    const board = boardFrom({ d3: p("bia", "white"), d4: p("bia", "black") });
    expect(destinations(board, "d3")).toEqual([]); // blocked dead ahead, cannot capture straight
  });

  it("captures one step diagonally forward only", () => {
    const board = boardFrom({ d3: p("bia", "white"), c4: p("bia", "black"), e4: p("met", "black") });
    expect(destinations(board, "d3")).toEqual(["c4", "d4", "e4"].sort());
  });

  it("cannot capture diagonally backward or move backward", () => {
    const board = boardFrom({ d3: p("bia", "white"), c2: p("bia", "black") });
    expect(destinations(board, "d3")).toEqual(["d4"]);
  });

  it("black pawns move toward rank 1", () => {
    const board = boardFrom({ d6: p("bia", "black") });
    expect(destinations(board, "d6")).toEqual(["d5"]);
  });

  it("promotes white bia reaching rank 6, and black bia reaching rank 3", () => {
    const whiteBoard = boardFrom({ d5: p("bia", "white") });
    const whiteMove = pseudoMovesFrom(whiteBoard, algebraicToSquare("d5")).find((m) => squareToAlgebraic(m.to) === "d6");
    expect(whiteMove?.promotion).toBe(true);

    const blackBoard = boardFrom({ d4: p("bia", "black") });
    const blackMove = pseudoMovesFrom(blackBoard, algebraicToSquare("d4")).find((m) => squareToAlgebraic(m.to) === "d3");
    expect(blackMove?.promotion).toBe(true);
  });

  it("does not promote before the 6th rank", () => {
    const board = boardFrom({ d4: p("bia", "white") });
    const move = pseudoMovesFrom(board, algebraicToSquare("d4")).find((m) => squareToAlgebraic(m.to) === "d5");
    expect(move?.promotion).toBe(false);
  });
});

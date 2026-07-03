import { describe, expect, it } from "vitest";
import {
  algebraicToSquare,
  countPieces,
  findKingSquare,
  initialBoard,
  rowColToSquare,
  squareToAlgebraic,
} from "./board";

describe("coordinate conversion", () => {
  it("round-trips algebraic <-> square", () => {
    for (const alg of ["a1", "h1", "a8", "h8", "d1", "e8"]) {
      expect(squareToAlgebraic(algebraicToSquare(alg))).toBe(alg);
    }
  });

  it("a1 is row0 col0, h8 is row7 col7", () => {
    expect(algebraicToSquare("a1")).toBe(rowColToSquare(0, 0));
    expect(algebraicToSquare("h8")).toBe(rowColToSquare(7, 7));
  });

  it("rejects invalid notation", () => {
    expect(() => algebraicToSquare("i1")).toThrow();
    expect(() => algebraicToSquare("a9")).toThrow();
  });
});

describe("initialBoard", () => {
  const board = initialBoard();

  it("has 16 pieces per side", () => {
    expect(countPieces(board, "white")).toBe(16);
    expect(countPieces(board, "black")).toBe(16);
  });

  it("places เบี้ย on rank 3 (white) and rank 6 (black)", () => {
    for (const file of ["a", "b", "c", "d", "e", "f", "g", "h"]) {
      expect(board[algebraicToSquare(`${file}3`)]).toEqual({ type: "bia", color: "white" });
      expect(board[algebraicToSquare(`${file}6`)]).toEqual({ type: "bia", color: "black" });
    }
  });

  it("places ขุน on e1 (white) and d8 (black), facing the opposing เม็ด", () => {
    expect(board[algebraicToSquare("e1")]).toEqual({ type: "khun", color: "white" });
    expect(board[algebraicToSquare("d1")]).toEqual({ type: "met", color: "white" });
    expect(board[algebraicToSquare("d8")]).toEqual({ type: "khun", color: "black" });
    expect(board[algebraicToSquare("e8")]).toEqual({ type: "met", color: "black" });
  });

  it("places รือ/ม้า/โคน symmetrically on the back rank", () => {
    expect(board[algebraicToSquare("a1")]).toEqual({ type: "rua", color: "white" });
    expect(board[algebraicToSquare("h1")]).toEqual({ type: "rua", color: "white" });
    expect(board[algebraicToSquare("b1")]).toEqual({ type: "ma", color: "white" });
    expect(board[algebraicToSquare("g1")]).toEqual({ type: "ma", color: "white" });
    expect(board[algebraicToSquare("c1")]).toEqual({ type: "khon", color: "white" });
    expect(board[algebraicToSquare("f1")]).toEqual({ type: "khon", color: "white" });
  });

  it("finds each king", () => {
    expect(findKingSquare(board, "white")).toBe(algebraicToSquare("e1"));
    expect(findKingSquare(board, "black")).toBe(algebraicToSquare("d8"));
  });
});

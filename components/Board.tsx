"use client";

import { FILES, squareToAlgebraic } from "@/lib/makruk";
import type { GameState, Move, Square } from "@/lib/makruk";
import { PieceIcon } from "./PieceIcon";

interface BoardProps {
  state: GameState;
  selected: Square | null;
  legalMoves: Move[];
  flipped: boolean;
  inCheck: boolean;
  onTapSquare: (square: Square) => void;
}

export function Board({ state, selected, legalMoves, flipped, inCheck, onTapSquare }: BoardProps) {
  const targetSquares = new Map(legalMoves.map((m) => [m.to, m]));

  const displaySquares: Square[] = [];
  for (let visualRow = 0; visualRow < 8; visualRow++) {
    const row = flipped ? visualRow : 7 - visualRow;
    for (let visualCol = 0; visualCol < 8; visualCol++) {
      const col = flipped ? 7 - visualCol : visualCol;
      displaySquares.push(row * 8 + col);
    }
  }

  return (
    <div className="board" role="grid" aria-label="กระดานหมากรุกไทย">
      {displaySquares.map((square) => {
        const row = Math.floor(square / 8);
        const col = square % 8;
        const isDark = (row + col) % 2 === 0;
        const piece = state.board[square];
        const isSelected = selected === square;
        const target = targetSquares.get(square);
        const isKingInCheckHere =
          inCheck && piece?.type === "khun" && piece.color === state.turn;

        const classes = [
          "board__square",
          isDark ? "board__square--dark" : "board__square--light",
          isSelected ? "board__square--selected" : "",
          target ? (target.captured ? "board__square--capture" : "board__square--target") : "",
          isKingInCheckHere ? "board__square--check" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <button
            key={square}
            type="button"
            role="gridcell"
            className={classes}
            aria-label={`ช่อง ${squareToAlgebraic(square)}${piece ? " มีหมาก" : ""}`}
            onClick={() => onTapSquare(square)}
          >
            {col === 0 && <span className="board__coord board__coord--rank">{row + 1}</span>}
            {row === 0 && <span className="board__coord board__coord--file">{FILES[col]}</span>}
            {piece && (
              <span className="board__piece">
                <PieceIcon piece={piece} />
              </span>
            )}
            {!piece && target && <span className="board__dot" aria-hidden="true" />}
          </button>
        );
      })}
    </div>
  );
}

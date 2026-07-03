"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyMove,
  createInitialState,
  DIFFICULTY,
  isInCheck,
  legalMovesFrom,
  resign,
} from "@/lib/makruk";
import type { Color, GameState, Move, Square } from "@/lib/makruk";
import { useBotWorker } from "@/hooks/useBotWorker";
import { HomeScreen } from "./HomeScreen";
import { GameScreen } from "./GameScreen";

export type Difficulty = "easy" | "medium" | "hard";
export type Mode = { kind: "hotseat" } | { kind: "bot"; difficulty: Difficulty };

const BOT_COLOR: Color = "black";
const HUMAN_COLOR: Color = "white";

export function MakrukApp() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [history, setHistory] = useState<GameState[]>([createInitialState()]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [thinking, setThinking] = useState(false);
  const { requestMove } = useBotWorker();

  const state = history[history.length - 1];

  const legalMoves = useMemo<Move[]>(
    () => (selected === null ? [] : legalMovesFrom(state, selected)),
    [state, selected]
  );

  const inCheck = useMemo(() => isInCheck(state.board, state.turn), [state]);

  const resetGame = useCallback(() => {
    setHistory([createInitialState()]);
    setSelected(null);
    setFlipped(false);
    setMode(null);
  }, []);

  const startHotseat = useCallback(() => {
    setHistory([createInitialState()]);
    setSelected(null);
    setFlipped(false);
    setMode({ kind: "hotseat" });
  }, []);

  const startBot = useCallback((difficulty: Difficulty) => {
    setHistory([createInitialState()]);
    setSelected(null);
    setFlipped(false);
    setMode({ kind: "bot", difficulty });
  }, []);

  const playMove = useCallback(
    (move: { from: Square; to: Square }) => {
      setHistory((prev) => {
        const current = prev[prev.length - 1];
        const next = applyMove(current, move);
        return [...prev, next];
      });
      setSelected(null);
    },
    []
  );

  const handleTapSquare = useCallback(
    (square: Square) => {
      if (state.result || thinking) return;
      if (mode?.kind === "bot" && state.turn !== HUMAN_COLOR) return;

      if (selected !== null) {
        const move = legalMoves.find((m) => m.to === square);
        if (move) {
          playMove({ from: move.from, to: move.to });
          return;
        }
      }

      const piece = state.board[square];
      if (piece && piece.color === state.turn) {
        setSelected(square);
      } else {
        setSelected(null);
      }
    },
    [state, selected, legalMoves, thinking, mode, playMove]
  );

  const undo = useCallback(() => {
    if (mode?.kind !== "hotseat") return;
    setHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setSelected(null);
  }, [mode]);

  const handleResign = useCallback(() => {
    const resigningColor = mode?.kind === "bot" ? HUMAN_COLOR : state.turn;
    setHistory((prev) => [...prev, resign(prev[prev.length - 1], resigningColor)]);
    setSelected(null);
  }, [mode, state]);

  // Bot's turn: ask the worker, then play whatever it returns.
  useEffect(() => {
    if (mode?.kind !== "bot" || state.result || state.turn !== BOT_COLOR) return;
    let cancelled = false;
    setThinking(true);
    requestMove(state, DIFFICULTY[mode.difficulty]).then((move) => {
      if (cancelled || !move) {
        setThinking(false);
        return;
      }
      setHistory((prev) => {
        const current = prev[prev.length - 1];
        if (current !== state) return prev; // stale response, board moved on
        return [...prev, applyMove(current, move)];
      });
      setThinking(false);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, state, requestMove]);

  if (!mode) {
    return <HomeScreen onStartHotseat={startHotseat} onStartBot={startBot} />;
  }

  return (
    <GameScreen
      state={state}
      mode={mode}
      selected={selected}
      legalMoves={legalMoves}
      inCheck={inCheck}
      flipped={flipped}
      thinking={thinking}
      canUndo={mode.kind === "hotseat" && history.length > 1}
      onTapSquare={handleTapSquare}
      onFlip={() => setFlipped((f) => !f)}
      onUndo={undo}
      onResign={handleResign}
      onNewGame={resetGame}
    />
  );
}

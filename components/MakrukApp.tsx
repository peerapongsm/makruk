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
import { useOnlineGame } from "@/hooks/useOnlineGame";
import { HomeScreen } from "./HomeScreen";
import { GameScreen } from "./GameScreen";
import { LobbyScreen } from "./LobbyScreen";
import { parseRoomIdFromSearch } from "./lobby-utils";
import type { RoomHandle } from "@/lib/net/room";

export type Difficulty = "easy" | "medium" | "hard";
export type Mode =
  | { kind: "hotseat" }
  | { kind: "bot"; difficulty: Difficulty }
  | { kind: "online"; colors: { local: Color; remote: Color }; opponentNickname: string };

const BOT_COLOR: Color = "black";
const HUMAN_COLOR: Color = "white";

export function MakrukApp() {
  const [mode, setMode] = useState<Mode | null>(null);
  const [history, setHistory] = useState<GameState[]>([createInitialState()]);
  const [selected, setSelected] = useState<Square | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [thinking, setThinking] = useState(false);
  // An invite link (`?room=`) should land straight in the lobby, skipping the picker.
  const [showLobby, setShowLobby] = useState(
    () => typeof window !== "undefined" && parseRoomIdFromSearch(window.location.search) !== null
  );
  const [onlineRoom, setOnlineRoom] = useState<RoomHandle | null>(null);
  const { requestMove } = useBotWorker();
  const onlineGame = useOnlineGame(
    mode?.kind === "online" ? onlineRoom : null,
    mode?.kind === "online" ? mode.colors : null
  );

  const state = history[history.length - 1];

  const legalMoves = useMemo<Move[]>(
    () => (selected === null ? [] : legalMovesFrom(state, selected)),
    [state, selected]
  );

  const resetGame = useCallback(() => {
    if (mode?.kind === "online") {
      onlineRoom?.leave();
      setOnlineRoom(null);
    }
    setHistory([createInitialState()]);
    setSelected(null);
    setFlipped(false);
    setMode(null);
  }, [mode, onlineRoom]);

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

  const startOnline = useCallback(() => setShowLobby(true), []);

  const handleOnlineStart = useCallback(
    (room: RoomHandle, colors: { local: Color; remote: Color }, opponentNickname: string) => {
      setOnlineRoom(room);
      setMode({ kind: "online", colors, opponentNickname });
      setShowLobby(false);
      setSelected(null);
      setFlipped(false);
    },
    []
  );

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
    if (showLobby) {
      return <LobbyScreen onStart={handleOnlineStart} onBack={() => setShowLobby(false)} />;
    }
    return <HomeScreen onStartHotseat={startHotseat} onStartBot={startBot} onStartOnline={startOnline} />;
  }

  // Online mode drives its board/turn state through useOnlineGame (session + room)
  // instead of the local `history` stack — pick whichever this render is in.
  const isOnline = mode.kind === "online";
  const displayState = isOnline ? onlineGame.state : state;
  const displaySelected = isOnline ? onlineGame.selected : selected;
  const displayLegalMoves = isOnline ? onlineGame.legalMoves : legalMoves;
  const displayInCheck = isInCheck(displayState.board, displayState.turn);

  return (
    <GameScreen
      state={displayState}
      mode={mode}
      selected={displaySelected}
      legalMoves={displayLegalMoves}
      inCheck={displayInCheck}
      flipped={flipped}
      thinking={thinking}
      opponentLeft={isOnline ? onlineGame.opponentLeft : false}
      canUndo={mode.kind === "hotseat" && history.length > 1}
      onTapSquare={isOnline ? onlineGame.onTapSquare : handleTapSquare}
      onFlip={() => setFlipped((f) => !f)}
      onUndo={undo}
      onResign={isOnline ? onlineGame.onResign : handleResign}
      onNewGame={resetGame}
    />
  );
}

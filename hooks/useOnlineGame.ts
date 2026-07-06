"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getOrCreatePlayer } from "@/lib/identity";
import { legalMovesFrom } from "@/lib/makruk";
import type { Color, GameState, Move, Square } from "@/lib/makruk";
import { applyLocalMove, applyRemote, createSession, isLocalTurn } from "@/lib/net/session";
import type { Session } from "@/lib/net/session";
import type { RoomHandle } from "@/lib/net/room";

export interface OnlineGame {
  state: GameState;
  selected: Square | null;
  legalMoves: Move[];
  /** Presence-leave fired for the peer — the game has ended locally; nothing more to sync. */
  opponentLeft: boolean;
  onTapSquare: (square: Square) => void;
  onResign: () => void;
}

const FALLBACK_COLOR: Color = "white";

/**
 * Drives one online game end to end, mirroring useBotWorker's "always call the
 * hook, no-op when inactive" shape (pass `room`/`colors` as null outside online
 * mode). Local taps go through session.ts's turn+legality guard before being
 * broadcast; incoming room messages go through the same guard before updating
 * the board — the guard is the entire anti-cheat boundary (see lib/net/session.ts).
 */
export function useOnlineGame(
  room: RoomHandle | null,
  colors: { local: Color; remote: Color } | null
): OnlineGame {
  const [session, setSession] = useState<Session>(() => createSession(colors?.local ?? FALLBACK_COLOR));
  const [selected, setSelected] = useState<Square | null>(null);
  const [opponentLeft, setOpponentLeft] = useState(false);

  // A new room (fresh online game) -> fresh session, wired to that room's messages.
  useEffect(() => {
    if (!room || !colors) return;
    setSession(createSession(colors.local));
    setSelected(null);
    setOpponentLeft(false);

    room.onMessage((msg) => {
      setSession((s) => {
        const r = applyRemote(s, msg, colors.remote);
        return r.ok ? r.s : s;
      });
    });
    room.onPeerLeave(() => setOpponentLeft(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room]);

  const legalMoves = useMemo<Move[]>(
    () => (selected === null ? [] : legalMovesFrom(session.game, selected)),
    [session, selected]
  );

  const onTapSquare = useCallback(
    (square: Square) => {
      if (!room || session.over || opponentLeft || !isLocalTurn(session)) return;

      if (selected !== null) {
        const move = legalMovesFrom(session.game, selected).find((m) => m.to === square);
        if (move) {
          const r = applyLocalMove(session, move);
          if (r.ok) {
            setSession(r.s);
            room.send({ t: "move", peerId: getOrCreatePlayer().peerId, move });
          }
          setSelected(null);
          return;
        }
      }

      const piece = session.game.board[square];
      if (piece && piece.color === session.game.turn) {
        setSelected(square);
      } else {
        setSelected(null);
      }
    },
    [room, session, selected, opponentLeft]
  );

  const onResign = useCallback(() => {
    if (!room || !colors || session.over) return;
    const peerId = getOrCreatePlayer().peerId;
    // Reuses applyRemote's "resign" case (same engine call the remote path takes),
    // just tagged with our own color instead of the peer's.
    const r = applyRemote(session, { t: "resign", peerId }, colors.local);
    if (r.ok) {
      setSession(r.s);
      room.send({ t: "resign", peerId });
    }
  }, [room, colors, session]);

  return {
    state: session.game,
    selected,
    legalMoves,
    opponentLeft,
    onTapSquare,
    onResign,
  };
}

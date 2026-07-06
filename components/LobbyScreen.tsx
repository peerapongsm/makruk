"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getNickname, getOrCreatePlayer, setNickname as persistNickname } from "@/lib/identity";
import { assignColors, createRoom, joinRoom } from "@/lib/net/room";
import type { RoomHandle } from "@/lib/net/room";
import type { Color } from "@/lib/makruk";
import { inviteLinkPath, parseRoomIdFromSearch, shortRoomCode } from "./lobby-utils";

interface LobbyScreenProps {
  /** Called once a 2nd player has joined and colors are assigned — hands the room off. */
  onStart: (
    room: RoomHandle,
    colors: { local: Color; remote: Color },
    opponentNickname: string
  ) => void;
  /** Leave the lobby entirely, back to the mode picker. */
  onBack: () => void;
}

type Phase =
  | { kind: "menu" }
  | { kind: "creating" }
  | { kind: "hosting"; room: RoomHandle }
  | { kind: "connecting" }
  | { kind: "waiting-start" }
  | { kind: "error"; message: string };

// There's no "room doesn't exist" signal from joinRoom (see lib/net/room.ts) — a bad
// roomId just leaves the guest waiting for a `start` that never comes. This timeout
// turns that silent hang into a clear Thai message instead.
const JOIN_TIMEOUT_MS = 20000;

export function LobbyScreen({ onStart, onBack }: LobbyScreenProps) {
  const [nickname, setNicknameInput] = useState(() => getNickname());
  const [roomIdFromUrl] = useState(() =>
    typeof window !== "undefined" ? parseRoomIdFromSearch(window.location.search) : null
  );
  const [phase, setPhase] = useState<Phase>({ kind: "menu" });
  const [copied, setCopied] = useState(false);

  const roomRef = useRef<RoomHandle | null>(null);
  const startedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Bumped on every new attempt/reset so a stale createRoom/joinRoom resolution
  // (e.g. the user hit "cancel" while it was in flight) can be told apart from
  // the still-current one and ignored instead of reviving a dead room.
  const attemptIdRef = useRef(0);

  const clearJoinTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const resetToMenu = useCallback(() => {
    attemptIdRef.current += 1;
    clearJoinTimeout();
    roomRef.current?.leave();
    roomRef.current = null;
    setPhase({ kind: "menu" });
  }, [clearJoinTimeout]);

  // Leave any open room on unmount, unless it was already handed off via onStart.
  useEffect(() => {
    return () => {
      attemptIdRef.current += 1;
      clearJoinTimeout();
      if (!startedRef.current) roomRef.current?.leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = useCallback(async () => {
    const trimmed = nickname.trim();
    if (!trimmed) return;
    persistNickname(trimmed);
    setPhase({ kind: "creating" });
    const attemptId = ++attemptIdRef.current;

    const room = await createRoom(getOrCreatePlayer());
    if (attemptIdRef.current !== attemptId) {
      room.leave();
      return;
    }
    roomRef.current = room;
    setPhase({ kind: "hosting", room });

    room.onPeerJoin((peer) => {
      if (attemptIdRef.current !== attemptId) return;
      startedRef.current = true;
      const colors = assignColors(true, "white");
      onStart(room, colors, peer.nickname?.trim() || "คู่ต่อสู้");
    });
  }, [nickname, onStart]);

  const attemptJoin = useCallback(
    async (roomId: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      persistNickname(trimmed);
      setPhase({ kind: "connecting" });
      const attemptId = ++attemptIdRef.current;

      const room = await joinRoom(roomId, getOrCreatePlayer());
      if (attemptIdRef.current !== attemptId) {
        room?.leave();
        return;
      }
      if (!room) {
        setPhase({ kind: "error", message: "ห้องเต็มแล้ว มีผู้เล่นครบ 2 คนแล้ว" });
        return;
      }
      roomRef.current = room;
      setPhase({ kind: "waiting-start" });

      room.onMessage((msg) => {
        if (msg.t !== "start" || attemptIdRef.current !== attemptId || startedRef.current) return;
        startedRef.current = true;
        clearJoinTimeout();
        const colors = assignColors(false, msg.hostColor);
        onStart(room, colors, "คู่ต่อสู้");
      });
      room.onPeerLeave(() => {
        if (attemptIdRef.current !== attemptId || startedRef.current) return;
        setPhase({ kind: "error", message: "คู่ต่อสู้ออกจากห้องแล้ว" });
      });

      timeoutRef.current = setTimeout(() => {
        if (attemptIdRef.current !== attemptId || startedRef.current) return;
        setPhase({
          kind: "error",
          message: "ไม่พบห้องนี้ หรือคู่ต่อสู้ยังไม่เข้าร่วม ลองตรวจสอบลิงก์เชิญอีกครั้ง",
        });
      }, JOIN_TIMEOUT_MS);
    },
    [clearJoinTimeout, onStart]
  );

  // Auto-attempt a join once on mount if the URL already names a room and we
  // already have a nickname to offer (first-time visitors type one manually below).
  useEffect(() => {
    if (roomIdFromUrl && nickname.trim()) {
      void attemptJoin(roomIdFromUrl, nickname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBack = useCallback(() => {
    resetToMenu();
    onBack();
  }, [resetToMenu, onBack]);

  const handleCopy = useCallback(async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable/denied — the link is still shown & selectable.
    }
  }, []);

  const canSubmit = nickname.trim().length > 0;

  return (
    <div className="page home">
      <h1>เล่นออนไลน์</h1>

      {phase.kind === "menu" && (
        <section className="home__section">
          <label className="lobby__label" htmlFor="lobby-nickname">
            ชื่อเล่นของคุณ
          </label>
          <input
            id="lobby-nickname"
            type="text"
            className="lobby__input"
            value={nickname}
            maxLength={20}
            placeholder="ชื่อเล่นของคุณ"
            onChange={(e) => setNicknameInput(e.target.value)}
          />

          {roomIdFromUrl ? (
            <>
              <p className="home__lede">รหัสห้อง: {shortRoomCode(roomIdFromUrl)}</p>
              <button
                type="button"
                className="home__mode-btn"
                disabled={!canSubmit}
                onClick={() => void attemptJoin(roomIdFromUrl, nickname)}
              >
                เข้าร่วมห้อง
              </button>
            </>
          ) : (
            <button
              type="button"
              className="home__mode-btn"
              disabled={!canSubmit}
              onClick={() => void handleCreate()}
            >
              สร้างห้อง
            </button>
          )}
        </section>
      )}

      {phase.kind === "creating" && <p className="lobby__status">กำลังสร้างห้อง…</p>}
      {phase.kind === "connecting" && <p className="lobby__status">กำลังเชื่อมต่อห้อง…</p>}
      {phase.kind === "waiting-start" && (
        <p className="lobby__status">เข้าร่วมห้องสำเร็จ กำลังรอเริ่มเกม…</p>
      )}

      {phase.kind === "hosting" && (
        <section className="home__section">
          <p className="lobby__code">{shortRoomCode(phase.room.roomId)}</p>
          <div className="lobby__invite">
            <span className="lobby__invite-link">
              {(typeof window !== "undefined" ? window.location.origin : "") +
                inviteLinkPath(phase.room.roomId)}
            </span>
            <button
              type="button"
              className="secondary"
              onClick={() =>
                void handleCopy(
                  (typeof window !== "undefined" ? window.location.origin : "") +
                    inviteLinkPath(phase.room.roomId)
                )
              }
            >
              {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
            </button>
          </div>
          <p className="lobby__status">รอคู่ต่อสู้…</p>
        </section>
      )}

      {(phase.kind === "hosting" || phase.kind === "waiting-start" || phase.kind === "connecting") && (
        <button type="button" className="danger" onClick={resetToMenu}>
          ยกเลิก
        </button>
      )}

      {phase.kind === "error" && (
        <section className="home__section">
          <p className="lobby__error">{phase.message}</p>
          <button type="button" className="home__mode-btn" onClick={resetToMenu}>
            ลองอีกครั้ง
          </button>
        </section>
      )}

      <button type="button" className="plain" onClick={handleBack}>
        ← กลับ
      </button>
    </div>
  );
}

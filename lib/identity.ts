// Player identity for makruk online PvP — a per-browser id + an editable nickname.
// No auth: `peerId` only needs to be stable enough (across a session) to tell "me"
// apart from "the other peer" (ignoring my own broadcast echoes, matching presence
// join/leave events to a name). Persisted in localStorage so a page refresh doesn't
// mint a new identity mid-game. Keys are namespaced `makruk:*` — this app may share
// a browser/origin with other project-365 apps.
export interface Player {
  peerId: string;
  nickname: string;
}

const PEER_ID_KEY = "makruk:peerId";
const NICKNAME_KEY = "makruk:nickname";

/** Reads this browser's persisted peerId, minting + storing a new one if absent. */
export function getOrCreatePeerId(): string {
  const existing = localStorage.getItem(PEER_ID_KEY);
  if (existing) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(PEER_ID_KEY, id);
  return id;
}

/** The player's editable display name (empty string if never set). */
export function getNickname(): string {
  return localStorage.getItem(NICKNAME_KEY) ?? "";
}

export function setNickname(nickname: string): void {
  localStorage.setItem(NICKNAME_KEY, nickname);
}

/** Convenience: the full `Player` this browser presents to a room. */
export function getOrCreatePlayer(): Player {
  return { peerId: getOrCreatePeerId(), nickname: getNickname() };
}

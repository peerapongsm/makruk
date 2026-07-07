// Pure helpers for the online-PvP lobby screen. Kept free of "@/..." and Supabase
// imports so they're safe to unit test without depending on module/alias resolution
// (see lib/net/README.md's "Import path" note — same rationale, applied here).

/** Pulls `?room=<id>` off a `location.search`-shaped string. Blank/absent -> null. */
export function parseRoomIdFromSearch(search: string): string | null {
  const id = new URLSearchParams(search).get("room");
  return id && id.trim() ? id : null;
}

/** Short, easy-to-read-aloud code for a room id (first 8 chars, uppercased). */
export function shortRoomCode(roomId: string): string {
  return roomId.slice(0, 8).toUpperCase();
}

/** The shareable path for a room's invite link (caller prefixes the origin). */
export function inviteLinkPath(roomId: string): string {
  return `/?room=${roomId}`;
}

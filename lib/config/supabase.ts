// Supabase client for makruk online PvP.
//
// Broadcast-only: this app uses Realtime channels (presence + broadcast), no tables,
// so there's no schema to provision. Channel names are namespaced `makruk:<roomId>`.
//
// This is a SHARED free-tier Supabase project used by three apps (makruk, torklon,
// pixel-canvas) — do not create tables or channels without a per-app prefix.
//
// Both values are public-safe (the anon key is designed to be exposed client-side;
// access control lives in RLS/channel policy, not secrecy of this key). Fall back to
// placeholders so a build without the env vars configured yet doesn't crash.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

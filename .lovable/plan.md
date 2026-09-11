# What to do next

Here's what I'd prioritise, based on what I found in the app right now. It's mostly reliability — the app has a huge feature surface, and the weak spots are in what happens when something goes wrong or when you switch devices.

## 1. Your chats don't come back on another device (real bug)

Chats are saved to your account in the background, but nothing ever loads them back. So if you sign in on your phone after chatting on your laptop, the history looks empty — and the empty local history then overwrites what was saved.

Fix:
- On sign-in, load your saved chats first and merge them with whatever is on the device (newest version of each chat wins).
- Only upload chats that actually changed, instead of re-uploading every chat on every save.
- Show a small "synced" indicator so you can tell it worked.

## 2. Nothing catches crashes

If any screen throws an error, the whole app goes white with no way back. Add a friendly error screen with "Reload" and "Back to chat" buttons, plus a per-panel guard so a broken workspace document can't take the chat down with it.

## 3. Failed replies are a dead end

When a reply fails (rate limit, no credits, network drop), you get a plain error line and have to retype. Add:
- A "Retry" button on the failed reply.
- A "Stop" button while it's generating.
- Clear wording for the common cases: out of credits, too many requests, connection lost.

## 4. Mobile polish pass

On a 390px-wide screen several areas still overflow or feel cramped: the chat header row, the workspace toolbar, and modal footers. Do a sweep on real phone width and fix the spill-over, tap target sizes and safe-area padding at the bottom.

## 5. One new feature: chat folders

You already have pinning, tags and archive. Folders on top of that would make the sidebar usable once you have a lot of chats: create a folder, drag chats into it, collapse/expand, and folders included in the ⌘K search.

## Technical notes

- `syncToCloud` in `src/lib/store.ts` upserts every conversation into `user_conversations` on each debounced call, and there is no read path anywhere in `src/` — add a `hydrateFromCloud` action called after `supabase.auth.getSession()` resolves, gated so it runs before the first local write-back, with `updated_at` as the merge tiebreak.
- No `ErrorBoundary` exists in the codebase; add one class component wrapping `<Routes>` in `App.tsx` and a lighter one around the workspace/playground panels.
- Retry/stop: `sendChatMessage` in `src/lib/chat-api.ts` already streams via fetch — thread an `AbortController` through it and store the last request payload so a failed bot message can be re-sent.
- Folders: extend the `Conversation` type with an optional `folderId`, plus a `folders` array in the store, persisted through the same localStorage + `user_app_settings` path.

## Not included

No changes to the AI model routing, tool protocol, GIF search, or the video studio — those are working and out of scope for this round.

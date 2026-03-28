
Goal: make chat reliably work with the chat-only ElevenLabs agent (`agent_5801kmspe84efe7te6t0821sktpv`) and remove deployment/config blockers.

What I found
- `app/tutor/TutorClient.js` already points to the correct chat agent ID.
- The chat callback only parses `agent_response_event`/`agent_response`, but your live logs show messages in `{ source: "ai", role: "agent", message: "..." }` format, so valid replies can be ignored.
- `textOnly` is currently passed to `startSession`; for this SDK pattern it should be configured on `useConversation(...)`.
- No explicit chat-session cleanup on unmount, which can leave conversations “ongoing” on ElevenLabs.
- `next.config.mjs` is already corrected (no `distDir`), so the remaining “dist not found” is Vercel project Output Directory config, not app code.

Implementation plan
1) Harden Tutor chat session setup (chat-only mode)
- File: `app/tutor/TutorClient.js`
- Move text-chat mode to hook config: `useConversation({ textOnly: true, ... })`.
- Start session with explicit `connectionType: 'websocket'` for text chat.
- Keep chat agent locked to `agent_5801...` (and optionally read `chatAgentId` from settings as override with safe fallback).
- Add a `connectingRef` guard so `startSession()` cannot run twice in parallel.

2) Fix incoming message parsing (primary chat bug)
- File: `app/tutor/TutorClient.js`
- Update `onMessage` parser to support all expected shapes:
  - `message.agent_response_event?.agent_response`
  - `message.agent_response`
  - `message.message` when `source === 'ai'`
- Normalize to one text extraction path before rendering/saving.

3) Prevent duplicate AI messages and stuck loading
- File: `app/tutor/TutorClient.js`
- Track last handled event id/content (`event_id`) in a ref and ignore duplicates.
- Ensure `setIsLoading(false)` runs after a valid AI response and on terminal error/disconnect paths so UI doesn’t hang.

4) Close sessions cleanly so ElevenLabs doesn’t stay “ongoing”
- File: `app/tutor/TutorClient.js`
- Add `useEffect` cleanup to call `conversation.endSession()` on component unmount/route leave.
- Reset connection refs/state in cleanup and disconnect handlers.

5) Keep call/chat agent separation explicit
- Files: `app/tutor/TutorClient.js`, `app/call/CallClient.js` (if needed)
- Ensure tutor uses chat agent only, call page uses call agent only (no cross-usage).
- (Optional) centralize defaults in a tiny shared constant helper to avoid drift.

6) Resolve deployment blockers
- Code side: keep `next.config.mjs` without `distDir`.
- Vercel side (required): set Project → Build & Output Settings → Output Directory to default/empty (`.next` behavior for Next.js), not `dist`.
- CSS lint error note: if your Vercel/project command includes a custom CSS lint step with empty file glob, remove/fix that command; `npm run build` for this Next app should not require a separate CSS file-list argument.

Technical details
- Root chat failure is event-shape mismatch, not wrong agent ID.
- Root “ongoing conversation” symptom is missing lifecycle cleanup.
- Root deploy “dist not found” is platform output-directory config mismatch, not Next build output.

Validation checklist (after changes)
1. `/tutor`: send “hi” and verify one AI reply appears in UI and DB `messages`.
2. Confirm no duplicate first reply (same `event_id` handled once).
3. Navigate away from `/tutor`; ElevenLabs conversation should end (not remain ongoing).
4. Redeploy on Vercel; build should complete with `.next` artifact and no `dist` output error.

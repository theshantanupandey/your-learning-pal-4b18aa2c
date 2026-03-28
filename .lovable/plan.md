

# Fix Build, Auth, DB Logging, ElevenLabs-Only Architecture

## Problems
1. **Build error**: Next.js outputs to `.next/`, but Lovable expects `dist/` — need to set `distDir: 'dist'` in `next.config.mjs`
2. **Phone OTP login**: User wants Twilio-based OTP auth via Supabase
3. **DB logging**: Chat messages (web tutor) and call transcripts (call page) should persist to Supabase
4. **Call disconnects immediately**: Likely a state/lifecycle bug in CallClient.js — `onDisconnect` callback references stale `state` variable
5. **Web tutor gives pre-loaded responses**: The `/api/chat` route falls back to `getDemoResponse()` when no Gemini key is found — but user wants ElevenLabs for chat too
6. **Use ElevenLabs agents for BOTH chat and call**: Drop Gemini chat API, Fish Audio, configurable TTS. Use ElevenLabs agent `agent_4001kmrcsfkpfbdsgb049vbvw37f` for everything

## Plan

### 1. Fix build output directory
**File: `next.config.mjs`** — Add `distDir: 'dist'` so the build output goes where Lovable expects.

### 2. Phone OTP Authentication with Twilio
- Enable Supabase Phone Auth provider (user configures in Supabase dashboard)
- Connect Twilio connector via `standard_connectors--connect`
- Create **login page** (`app/login/page.js`) with:
  - Phone number input (with +91 India prefix default)
  - "Send OTP" button → calls `supabase.auth.signInWithOtp({ phone })`
  - OTP verification input → calls `supabase.auth.verifyOtp({ phone, token, type: 'sms' })`
- Create **auth wrapper** component that checks session and redirects to `/login` if not authenticated
- Protect all pages except `/` and `/login`
- Supabase Phone provider needs Twilio SID, Auth Token, and Messaging Service SID configured in Supabase dashboard — will guide user through this

### 3. Store chat logs and call logs in Supabase
The DB already has `sessions` and `messages` tables with proper RLS.

**Web Tutor (`app/tutor/TutorClient.js`):**
- On topic select, create a `session` row (mode: 'chat')
- Each sent/received message → insert into `messages` table with `session_id`

**Call page (`app/call/CallClient.js`):**
- On call start, create a `session` row (mode: 'call')
- On each transcript message from ElevenLabs `onMessage`, insert into `messages` table
- On call end, update session status to 'completed'

### 4. Fix call auto-disconnect bug
**File: `app/call/CallClient.js`**
- The `onDisconnect` callback captures stale `state` via closure. Use a ref for state tracking.
- Ensure `conversation.startSession()` completes before any state transitions

### 5. ElevenLabs agent for BOTH chat and call
Replace the Gemini chat API with ElevenLabs text-only mode for the web tutor.

**Web Tutor (`app/tutor/TutorClient.js`):**
- Use `useConversation` with `textOnly: true` option
- `conversation.sendUserMessage(text)` to send messages
- `onMessage` callback to receive agent responses
- Remove `/api/chat` calls entirely
- Keep flashcard/quiz generation via Gemini (those are separate)

**Call page (`app/call/CallClient.js`):**
- Already uses ElevenLabs — just fix the disconnect bug

**Settings (`app/settings/page.js`):**
- Remove TTS provider section (Fish Audio, ElevenLabs TTS)
- Remove Gemini key section
- Keep only ElevenLabs Agent ID field (with default)
- Simplify drastically

### 6. Clean up unused files
- Remove `app/api/chat/route.js` (no longer needed)
- Remove `app/api/tts/route.js` (no longer needed)
- Remove `lib/voice.js` (no longer needed)
- Remove `lib/fishAudio.ts` if it exists
- Keep `app/api/flashcards/route.js` and `app/api/quiz/route.js` (still use Gemini for generation)

### 7. Update Providers
**File: `components/Providers.js`** — Already wraps with `ConversationProvider`, which is needed for the web tutor now too.

## Implementation Order
1. Fix `next.config.mjs` (distDir)
2. Connect Twilio, set up phone OTP login page + auth guard
3. Update settings page (simplify to ElevenLabs-only)
4. Rebuild web tutor with ElevenLabs text-only agent
5. Fix call page disconnect bug + add DB logging
6. Add DB logging to web tutor
7. Delete unused API routes and libs

## Technical Notes
- ElevenLabs `textOnly: true` mode sends text messages without audio — perfect for the chat interface
- The agent ID `agent_4001kmrcsfkpfbdsgb049vbvw37f` is a public agent, no server token needed
- Supabase phone auth requires Twilio credentials configured in Supabase Auth dashboard (not in code)
- The `messages` table has RLS requiring session ownership via `auth.uid()`, so auth must be in place first
- Flashcards and quiz generation still use Gemini via the existing API routes — those stay


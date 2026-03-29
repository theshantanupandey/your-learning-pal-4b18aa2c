

## Plan: Quiz scoring + Whiteboard + Call transcript fix + DB persistence

### 1. Fix Vercel build error
- **File**: `next.config.mjs` — already correct (no `distDir`). The fix is on Vercel side: set **Output Directory** to empty/default in Project Settings > Build & Output Settings.

### 2. Quiz: show score, save to DB, communicate to AI
- **File**: `app/tutor/TutorClient.js`
  - In `submitQuiz()`, after getting results, save to `quiz_attempts` table with `user_id`, `session_id`, `questions`, `answers`, `score_pct`, and `level` (topic-level).
  - After saving, send a contextual message to the AI stream: "Student scored X% on quiz. Weak areas: [list]." so the AI can respond with targeted feedback.
  - The quiz result UI already shows score — keep that, but also ensure the score message goes into the chat as a system-like student message that triggers an AI response.

### 3. Whiteboard for chat agent
- **File**: New component `components/Whiteboard.js`
  - Canvas-based drawing tool (HTML5 Canvas) with pen color, eraser, clear, and undo.
  - Positioned as a toggleable panel in the chat view (like flashcards/quiz panel).
  - "Send to AI" button that captures the canvas as a base64 PNG image.
- **File**: `app/tutor/TutorClient.js`
  - Add "Whiteboard" button in the chips area alongside Flashcards/Quiz.
  - When "Send to AI" is clicked, encode canvas to base64, send to the chat edge function as an image message.
- **File**: `supabase/functions/chat/index.ts`
  - Accept optional `image` field in request body. When present, include it as a multimodal content part (Gemini supports `image_url` with base64 data URIs) in the user message so the AI can see the equation/drawing.

### 4. Call transcript: fix visibility + save to DB
- **File**: `app/call/CallClient.js`
  - The `add()` function already saves messages to DB via `supabase.from('messages').insert(...)` — this is working.
  - The `onMessage` handler parses `user_transcript` and `agent_response` events. The issue may be that ElevenLabs sends messages in a different shape. Add fallback parsing for `message.message` when `source === 'ai'` or `source === 'user'` (same fix applied to tutor earlier).
  - Ensure the transcript `<div style={s.tList}>` auto-scrolls to the latest message by adding a ref and `scrollIntoView` effect.

### 5. Onboarding enforcement for chat
- **File**: `app/tutor/TutorClient.js`
  - On mount, check if the user has a profile in the `users` table. If not, redirect to `/login` (which handles onboarding).
  - Show a loading state while checking. This ensures new users always complete onboarding before chatting.
- **File**: `app/call/CallClient.js`
  - Same check: if no user profile exists, redirect to `/login` for onboarding before allowing calls.

### 6. Full DB persistence audit
- Chat messages: already saved via `saveMessage()` in TutorClient.
- Call messages: already saved via `add()` in CallClient.
- Quiz attempts: will be saved in step 2.
- Sessions: already created on topic select (chat) and call start.
- Whiteboard images: will be saved as messages with `content_type: 'image'` when sent to AI.

### Technical details
- Whiteboard uses plain HTML5 Canvas API — no extra dependencies needed.
- Gemini multimodal: the edge function will format image as `{ type: "image_url", image_url: { url: "data:image/png;base64,..." } }` in the messages array.
- The quiz → AI communication will use `sendMessage()` internally with a formatted score summary, triggering a streamed AI response with targeted re-teaching.
- Call transcript scroll fix: add `useEffect` watching `messages` to scroll the transcript container.


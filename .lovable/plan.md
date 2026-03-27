

# ElevenLabs Conversational AI Agent + Build Fix

## Problem
1. Build fails: no `build:dev` script in `package.json`
2. Voice call page (`/call`) uses manual STT/TTS pipeline that doesn't work well
3. Need to integrate ElevenLabs Conversational AI Agent (agent ID: `agent_4001kmrcsfkpfbdsgb049vbvw37f`) for a proper voice experience

## Plan

### 1. Fix build error
Add `"build:dev": "next build"` to `package.json` scripts.

### 2. Link ElevenLabs connector
Use `standard_connectors--connect` to link the existing `prod` ElevenLabs connection to the project, making the API key available as an environment variable.

### 3. Install ElevenLabs React SDK
Add `@elevenlabs/react` to dependencies for the `useConversation` hook.

### 4. Update Settings page (`app/settings/page.js`)
- Add a new section for "ElevenLabs Agent" with:
  - A toggle: "Use Lovable Connector" (default ON when connector is linked) vs "Use Custom API Key"
  - When custom: show API key input field and agent ID field
  - Agent ID defaults to `agent_4001kmrcsfkpfbdsgb049vbvw37f`
- Keep existing Gemini and TTS provider sections unchanged

### 5. Rebuild Call page (`app/call/page.js`) with ElevenLabs Agent
Replace the current manual STT + Gemini chat + Fish Audio TTS pipeline with the ElevenLabs `useConversation` React SDK:

- **Connection flow**: On "Start Call", request mic permission, then call `conversation.startSession({ agentId: "agent_4001kmrcsfkpfbdsgb049vbvw37f" })` using WebRTC (public agent, no server token needed)
- **If user has a custom API key**: Create a Supabase edge function or Next.js API route to generate a `conversationToken`, then use that token instead of the raw agent ID
- **UI stays similar**: Phone-style layout with the existing avatar, waveform, mute/end controls, and transcript panel
- **Transcript**: Use `onMessage` callback to capture `user_transcript` and `agent_response` events and display them in the transcript panel
- **Speaking indicator**: Use `conversation.isSpeaking` to drive the waveform animation
- **Status**: Map `conversation.status` to the existing idle/ringing/active/ended states

### 6. Keep fallback
If ElevenLabs is not configured (no connector, no custom key), fall back to the existing Gemini + Fish Audio pipeline so the app still works.

## Technical Details

- The ElevenLabs agent `agent_4001kmrcsfkpfbdsgb049vbvw37f` is a public agent, so it can be used directly with `agentId` without server-side token generation
- The `@elevenlabs/react` SDK handles WebRTC audio streaming, VAD, and playback internally
- No changes needed to the Web Tutor (`/tutor`) — it continues using Gemini chat + optional Fish Audio TTS
- Files changed: `package.json`, `app/call/page.js`, `app/settings/page.js`


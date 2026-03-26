

# VidyAI — Complete UI Revamp + Fish Audio Integration

## Summary

Redesign VidyAI from scratch with a clean, minimal Apple-inspired aesthetic, add Fish Audio TTS for cloned voice responses, add a Fish Audio API key field to settings, and include a simple progress overview on the home page.

---

## 1. Add Fish Audio API Key to Settings

**File: `src/lib/apiKeys.ts`**
- Add `fishAudio` field to `ApiKeyConfig`
- Add `getFishAudioKey()` helper

**File: `src/pages/ApiSettings.tsx`**
- Add a second card for Fish Audio API key input (same pattern as Gemini)

---

## 2. Complete UI Revamp — Clean Minimal Light

Aesthetic: Apple-inspired — generous whitespace, SF-style typography, soft shadows, subtle rounded corners, muted grays with a single accent color (indigo/blue). No gradients, no heavy borders.

### 2a. Global Styles & Layout Shell

**File: `src/index.css`**
- Set base font to `Inter` (add Google Fonts import)
- Light background `#FAFAFA`, text `#1A1A1A`
- Accent: indigo-600 (`#4F46E5`)

**File: `src/components/Layout.tsx`** (new)
- Shared layout with a minimal top nav bar: VidyAI logo (text), nav links (Web Tutor, Voice Tutor), settings gear icon
- Clean centered content area with max-width constraint

### 2b. Home Page Redesign

**File: `src/pages/Home.tsx`**
- Hero section: large "VidyAI" wordmark, one-line subtitle, no icon clutter
- Two mode cards: clean white cards with subtle hover lift, icon + title + one-line description + CTA button
- Simple progress overview card at bottom: "Continue where you left off" showing last topic/session (pulled from localStorage for now, can connect to Supabase later)
- Footer: settings link

### 2c. Web Tutor Redesign

**File: `src/pages/WebTutor.tsx`**
- **Setup screen**: Cleaner form with pill-style selectors for class/subject, minimal input for topic, prominent "Start" button
- **Chat screen**: 
  - Sidebar-less, full-width chat with generous spacing
  - Model messages: left-aligned, light gray background, clean markdown rendering
  - User messages: right-aligned, indigo background, white text
  - Input bar: fixed bottom, rounded pill input with mic button + send button
  - Assessment panel: clean card with flashcards (swipeable, no 3D flip — simple fade transition) and quiz with radio buttons

### 2d. Voice Tutor Redesign

**File: `src/pages/VoiceTutor.tsx`**
- Centered minimal layout: large circular avatar/waveform indicator
- Status text underneath (Connecting... / Listening... / Speaking...)
- Bottom controls: mute, end call — clean circular buttons
- Transcript area: subtle scrolling text below the avatar
- Integrate Fish Audio TTS for model responses (see section 3)

### 2e. API Settings Redesign

**File: `src/pages/ApiSettings.tsx`**
- Clean card-based layout for each API key
- Gemini card + Fish Audio card
- Minimal form with show/hide toggle

---

## 3. Fish Audio TTS Integration

Fish Audio will be called client-side using the user's API key (stored in localStorage). This avoids needing an edge function for a hackathon demo.

**File: `src/lib/fishAudio.ts`** (new)
- `synthesizeSpeech(text: string, voiceId: string, apiKey: string): Promise<Blob>`
- Calls Fish Audio TTS API: `POST https://api.fish.audio/v1/tts`
- Returns audio blob for playback

**Integration in VoiceTutor.tsx:**
- After receiving text from Gemini Live API transcription, send it to Fish Audio TTS
- Play the returned audio blob instead of (or alongside) Gemini's native audio
- This gives the cloned voice output

**Integration in WebTutor.tsx (optional):**
- Add a speaker icon on model messages to read them aloud via Fish Audio

---

## 4. New Component Structure

```text
src/
├── components/
│   ├── Layout.tsx           — shared nav + content wrapper
│   ├── ChatMessage.tsx      — single message bubble
│   ├── ChatInput.tsx        — input bar with mic + send
│   ├── FlashcardDeck.tsx    — flashcard carousel
│   ├── QuizPanel.tsx        — quiz questions + submit
│   ├── ProgressCard.tsx     — simple overview card
│   └── VoiceOrb.tsx         — animated circle for voice tutor
├── lib/
│   ├── apiKeys.ts           — updated with fishAudio
│   ├── fishAudio.ts         — Fish Audio TTS client
│   └── utils.ts
├── pages/
│   ├── Home.tsx
│   ├── WebTutor.tsx
│   ├── VoiceTutor.tsx
│   └── ApiSettings.tsx
└── App.tsx
```

---

## 5. Implementation Order

1. Update `apiKeys.ts` + `ApiSettings.tsx` — add Fish Audio key support
2. Create `Layout.tsx` and apply to all pages
3. Revamp `Home.tsx` with new design + progress card
4. Extract shared components (`ChatMessage`, `ChatInput`, `FlashcardDeck`, `QuizPanel`)
5. Revamp `WebTutor.tsx` using new components
6. Create `fishAudio.ts` TTS utility
7. Create `VoiceOrb.tsx` animated component
8. Revamp `VoiceTutor.tsx` with new design + Fish Audio TTS

---

## Technical Notes

- **Fish Audio API**: Direct client-side `fetch` to `https://api.fish.audio/v1/tts` with the user's API key in `Authorization: Bearer` header. The voice ID for the cloned voice will need to be configured (can add a field in settings or hardcode for hackathon).
- **No backend changes needed** for Fish Audio — it's a direct API call with the user's key.
- **Animations**: Use `framer-motion` (already installed as `motion`) for page transitions, card hover effects, and the voice orb pulse.
- **Typography**: Inter font via Google Fonts CDN link in `index.html`.
- **Responsive**: Mobile-first, works well at 375px+ and desktop 1129px.


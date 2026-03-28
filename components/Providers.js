'use client';
import { ConversationProvider } from '@elevenlabs/react';

export default function Providers({ children }) {
  return (
    <ConversationProvider>
      {children}
    </ConversationProvider>
  );
}

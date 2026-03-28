'use client';
import { ConversationProvider } from '@elevenlabs/react';
import AuthGuard from '@/components/AuthGuard';

export default function Providers({ children }) {
  return (
    <ConversationProvider>
      <AuthGuard>{children}</AuthGuard>
    </ConversationProvider>
  );
}

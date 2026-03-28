'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const PUBLIC_ROUTES = ['/', '/login'];

export default function AuthGuard({ children }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setReady(true);
    });
    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_ROUTES.includes(pathname);
    if (!session && !isPublic) {
      router.replace('/login');
    }
    if (session && pathname === '/login') {
      router.replace('/tutor');
    }
  }, [ready, session, pathname, router]);

  if (!ready) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#555', fontFamily: 'monospace' }}>
        Loading...
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(pathname);
  if (!session && !isPublic) return null;

  return children;
}

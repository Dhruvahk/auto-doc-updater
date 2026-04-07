'use client';

import App from '../src/App.jsx';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient.js';

export default function Page() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        router.replace('/login');
        return;
      }
      setReady(true);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setReady(false);
        router.replace('/login');
        return;
      }
      setReady(true);
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  if (!ready) return null;

  return (
    <>
      <App />
    </>
  );
}


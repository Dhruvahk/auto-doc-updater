'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../src/lib/supabaseClient.js';
import toast from 'react-hot-toast';

export default function SignOutButton() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  if (pathname === '/login') return null;

  async function onClick() {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message || 'Sign out failed');
      setLoading(false);
      return;
    }
    toast.success('Signed out');
    // Force navigation so UI does not wait for stale client state.
    window.location.href = '/login';
  }

  return (
    <button
      onClick={onClick}
      disabled={loading}
      style={{
        marginLeft: 'auto',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        background: 'var(--bg-card)',
        border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        padding: '6px 12px',
        color: 'var(--text-secondary)',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'var(--font-sans)',
        opacity: loading ? 0.7 : 1,
      }}
    >
      Sign out
    </button>
  );
}


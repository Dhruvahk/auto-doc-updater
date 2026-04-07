'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '../../src/lib/supabaseClient.js';
import { GitMerge, LogIn } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState('signin'); // signin | signup
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const suppressRedirectRef = useRef(false);

  const title = useMemo(
    () => (mode === 'signup' ? 'Create account' : 'Sign in'),
    [mode]
  );

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) router.replace('/');
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (suppressRedirectRef.current) return;
      if (session) router.replace('/');
    });

    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, [router]);

  async function upsertUserProfile(user) {
    if (!user?.id) return;
    const { error } = await supabase.from('user_profiles').upsert(
      {
        id: user.id,
        email: user.email || null,
        full_name: fullName.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
    if (error) {
      // Keep auth successful even if profile table isn't ready yet.
      console.warn('Profile upsert warning:', error.message);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return toast.error('Email is required.');
    if (!password) return toast.error('Password is required.');

    setStatusMsg('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        suppressRedirectRef.current = true;
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim() || null,
            },
          },
        });
        if (error) throw error;
        await upsertUserProfile(data?.user);
        if (data?.session) {
          await supabase.auth.signOut();
        }
        toast.success('Account created.');
        setStatusMsg('If email confirmation is enabled, check your inbox and confirm before signing in.');
        setMode('signin');
        setFullName('');
        setPassword('');
        suppressRedirectRef.current = false;
        return;
      }

      const { data: signInData, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;
      await upsertUserProfile(signInData?.user);

      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const msg =
          'No session found. If email confirmation is enabled, check your inbox/spam and confirm first.';
        toast.error(msg);
        setStatusMsg(msg);
        return;
      }
      toast.success('Signed in');
      router.replace('/');
    } catch (err) {
      const msg = err?.message || 'Auth failed';
      toast.error(msg);
      setStatusMsg(msg);
      suppressRedirectRef.current = false;
    } finally {
      setLoading(false);
    }
  }

  async function signInWithGoogle() {
    setStatusMsg('');
    setLoading(true);
    try {
      const redirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (error) throw error;
    } catch (err) {
      const msg = err?.message || 'Google sign-in failed';
      toast.error(msg);
      setStatusMsg(msg);
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={styles.header}>
        <div style={styles.logoBox}>
          <GitMerge size={18} color="#fff" />
        </div>
        <div>
          <h1 style={styles.h1}>Auto Doc Updater</h1>
          <p style={styles.subtitle}>Sign in to continue</p>
        </div>
      </div>

      <div
        style={{
          ...styles.card,
          transform: `perspective(1000px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg)`,
        }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const dx = (e.clientX - rect.left) / rect.width - 0.5;
          const dy = (e.clientY - rect.top) / rect.height - 0.5;
          setTilt({
            x: Math.max(-4, Math.min(4, dx * 5)),
            y: Math.max(-4, Math.min(4, -dy * 5)),
          });
        }}
        onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      >
        <div style={styles.cardTitleRow}>
          <LogIn size={16} color="var(--indigo)" />
          <span style={styles.cardTitle}>{title}</span>
        </div>

        <form onSubmit={onSubmit}>
          <button
            type="button"
            onClick={signInWithGoogle}
            disabled={loading}
            style={{ ...styles.btnOAuth, opacity: loading ? 0.7 : 1 }}
          >
            Continue with Google
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>or use email</span>
          </div>

          {mode === 'signup' && (
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full name</label>
              <input
                style={styles.input}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Dhruva HK"
                type="text"
                autoComplete="name"
                disabled={loading}
              />
            </div>
          )}

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              disabled={loading}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ ...styles.btnPrimary, opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Working...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {statusMsg && (
          <div style={styles.statusBox}>
            {statusMsg}
          </div>
        )}

        <div style={styles.switchRow}>
          <span style={styles.switchText}>
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
          </span>
          <button
            type="button"
            onClick={() => setMode(mode === 'signup' ? 'signin' : 'signup')}
            style={styles.linkBtn}
            disabled={loading}
          >
            {mode === 'signup' ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  header: {
    maxWidth: 560,
    margin: '0 auto 2.25rem',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoBox: {
    width: 36,
    height: 36,
    background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
    borderRadius: 10,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 10px 24px rgba(99,102,241,0.35)',
  },
  h1: { fontSize: 26, fontWeight: 700, letterSpacing: '-0.6px' },
  subtitle: { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  card: {
    maxWidth: 560,
    margin: '0 auto',
    background: 'rgba(18,24,42,0.4)',
    border: '1px solid rgba(148,163,184,0.24)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.7rem',
    boxShadow: '0 24px 56px rgba(2,6,23,0.42)',
    backdropFilter: 'blur(14px)',
    transition: 'transform 0.15s ease-out',
  },
  cardTitleRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 },
  cardTitle: { fontSize: 15, fontWeight: 500, color: 'var(--text-primary)' },
  fieldGroup: { marginBottom: 14 },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 500,
    color: 'var(--text-secondary)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    width: '100%',
    background: 'rgba(15,23,42,0.5)',
    border: '1px solid rgba(148,163,184,0.22)',
    borderRadius: 'var(--radius)',
    padding: '0 12px',
    height: 42,
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    outline: 'none',
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--indigo)',
    color: '#fff',
    border: 'none',
    borderRadius: 'var(--radius)',
    padding: '0 20px',
    height: 42,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    fontWeight: 500,
    width: '100%',
    marginTop: 6,
  },
  switchRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 14,
  },
  switchText: { fontSize: 13, color: 'var(--text-muted)' },
  linkBtn: {
    background: 'transparent',
    border: 'none',
    padding: 0,
    cursor: 'pointer',
    color: 'var(--indigo-hover)',
    fontSize: 13,
    fontWeight: 500,
    fontFamily: 'var(--font-sans)',
  },
  statusBox: {
    marginTop: 12,
    fontSize: 12,
    color: 'var(--text-secondary)',
    background: 'rgba(15,23,42,0.45)',
    border: '1px solid rgba(148,163,184,0.2)',
    borderRadius: 'var(--radius)',
    padding: '10px 12px',
    lineHeight: 1.5,
  },
  btnOAuth: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(15,23,42,0.52)',
    color: 'var(--text-primary)',
    border: '1px solid rgba(148,163,184,0.24)',
    borderRadius: 'var(--radius)',
    padding: '0 20px',
    height: 42,
    cursor: 'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize: 14,
    fontWeight: 500,
    width: '100%',
    marginBottom: 10,
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  dividerText: {
    fontSize: 12,
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
};


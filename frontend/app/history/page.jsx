'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '../../src/lib/supabaseClient.js';

export default function HistoryPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const userId = userRes?.user?.id;
      if (!userId) {
        setRows([]);
        setLoading(false);
        return;
      }

      const { data: runs } = await supabase
        .from('analysis_runs')
        .select('id, repo_url, pr_number, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      const runIds = (runs || []).map((r) => r.id);
      let suggestions = [];
      if (runIds.length > 0) {
        const { data } = await supabase
          .from('section_suggestions')
          .select('run_id, accepted')
          .in('run_id', runIds);
        suggestions = data || [];
      }

      const mapped = (runs || []).map((r) => {
        const related = suggestions.filter((s) => s.run_id === r.id);
        const accepted = related.filter((s) => s.accepted).length;
        return {
          ...r,
          sections: related.length,
          accepted
        };
      });
      if (!active) return;
      setRows(mapped);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, []);

  const empty = useMemo(() => !loading && rows.length === 0, [loading, rows.length]);

  return (
    <div style={{ minHeight: '100vh', padding: '2.5rem 1.5rem 4rem' }}>
      <div style={styles.header}>
        <h1 style={styles.h1}>Run History</h1>
        <Link href="/" style={styles.backLink}>Back to dashboard</Link>
      </div>

      <div style={styles.card}>
        {loading && <p style={styles.muted}>Loading...</p>}
        {empty && <p style={styles.muted}>No saved runs yet. Analyze a PR to build history.</p>}
        {!loading && rows.length > 0 && rows.map((r) => (
          <div key={r.id} style={styles.row}>
            <div style={{ flex: 1 }}>
              <div style={styles.repo}>{r.repo_url}</div>
              <div style={styles.meta}>
                PR #{r.pr_number} · {new Date(r.created_at).toLocaleString()}
              </div>
            </div>
            <div style={styles.badges}>
              <span style={styles.badge}>sections: {r.sections}</span>
              <span style={styles.badgeOk}>accepted: {r.accepted}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  header: {
    maxWidth: 980,
    margin: '0 auto 1rem',
    display: 'flex',
    alignItems: 'center'
  },
  h1: { fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px' },
  backLink: {
    marginLeft: 'auto',
    color: 'var(--text-secondary)',
    textDecoration: 'none',
    fontSize: 13,
    padding: '7px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid rgba(148,163,184,0.25)',
    background: 'rgba(18,24,42,0.45)',
  },
  card: {
    maxWidth: 980,
    margin: '0 auto',
    background: 'rgba(18,24,42,0.42)',
    border: '1px solid rgba(148,163,184,0.24)',
    borderRadius: 'var(--radius-lg)',
    padding: '1rem 1.2rem',
    backdropFilter: 'blur(10px)'
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 0',
    borderBottom: '1px solid rgba(148,163,184,0.15)'
  },
  repo: { fontSize: 14, color: 'var(--text-primary)' },
  meta: { fontSize: 12, color: 'var(--text-muted)', marginTop: 2 },
  muted: { color: 'var(--text-muted)', fontSize: 13 },
  badges: { display: 'flex', gap: 8 },
  badge: {
    fontSize: 11,
    color: 'var(--text-secondary)',
    border: '1px solid rgba(148,163,184,0.22)',
    borderRadius: 999,
    padding: '4px 9px'
  },
  badgeOk: {
    fontSize: 11,
    color: '#bbf7d0',
    border: '1px solid var(--green-border)',
    borderRadius: 999,
    padding: '4px 9px',
    background: 'rgba(34,197,94,0.08)'
  }
};


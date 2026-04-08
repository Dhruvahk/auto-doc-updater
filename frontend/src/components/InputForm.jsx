import { useEffect, useMemo, useState } from 'react';
import { GitPullRequest, Search } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.js';

const EXAMPLES = [
  { repo: 'https://github.com/expressjs/express', pr: '5765', label: 'expressjs/express' },
  { repo: 'https://github.com/axios/axios', pr: '6463', label: 'axios/axios' },
  { repo: 'https://github.com/vitejs/vite', pr: '17189', label: 'vitejs/vite' },
];

export default function InputForm({ onSubmit, loading }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [error, setError] = useState('');

  const [historyLoading, setHistoryLoading] = useState(true);
  const [runs, setRuns] = useState([]); // analysis_runs rows for the current user
  const [repoOptions, setRepoOptions] = useState([]); // [{ repoUrl, label, lastUsedAt, lastPrNumber }]
  const [prOptions, setPrOptions] = useState([]); // [{ prNumber, usedAt }]

  function formatRepoLabel(url) {
    try {
      const match = url
        .trim()
        .replace(/\.git$/, '')
        .match(/github\.com\/([^/]+)\/([^/]+)/);
      if (!match) return url;
      return `${match[1]}/${match[2]}`;
    } catch {
      return url;
    }
  }

  // Load saved run history (drives repo dropdown + recent PR dropdown).
  useEffect(() => {
    let cancelled = false;

    async function load() {
      setHistoryLoading(true);
      setError('');

      try {
        const { data: userRes } = await supabase.auth.getUser();
        const userId = userRes?.user?.id;
        if (!userId) {
          if (!cancelled) setRuns([]);
          return;
        }

        const { data } = await supabase
          .from('analysis_runs')
          .select('repo_url, pr_number, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(200);

        if (cancelled) return;
        const rows = data || [];
        setRuns(rows);

        // Repos: first time we see each repo in descending created_at order => most recent use.
        const repoMap = new Map();
        for (const r of rows) {
          if (!r?.repo_url || repoMap.has(r.repo_url)) continue;
          repoMap.set(r.repo_url, r);
        }

        const repos = Array.from(repoMap.entries()).map(([url, lastRun]) => ({
          repoUrl: url,
          label: formatRepoLabel(url),
          lastUsedAt: lastRun.created_at,
          lastPrNumber: lastRun.pr_number,
        }));

        // Sort by most recent usage
        repos.sort((a, b) => new Date(b.lastUsedAt) - new Date(a.lastUsedAt));
        setRepoOptions(repos);

        if (repos.length > 0) {
          setRepoUrl(repos[0].repoUrl);
          setPrNumber(String(repos[0].lastPrNumber));
        }
      } catch (e) {
        if (cancelled) return;
        setError(e?.message || 'Failed to load your history.');
        setRuns([]);
        setRepoOptions([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // PR options for the currently selected repo.
  useEffect(() => {
    if (!repoUrl) {
      setPrOptions([]);
      return;
    }

    const related = (runs || [])
      .filter((r) => r?.repo_url === repoUrl)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    // Deduplicate PR numbers (latest run for the same PR first).
    const seen = new Set();
    const unique = [];
    for (const r of related) {
      const num = r?.pr_number;
      if (num == null) continue;
      if (seen.has(num)) continue;
      seen.add(num);
      unique.push({ prNumber: num, usedAt: r.created_at });
      if (unique.length >= 6) break;
    }

    setPrOptions(unique);

    // Only auto-fill PR number when the repoUrl exactly matches a known repo option.
    // This prevents annoying overwrites while the user is typing/pasting a URL.
    const exactMatch = repoOptions.some(
      (r) => r.repoUrl === repoUrl.trim().replace(/\.git$/, '')
    );

    if (exactMatch) {
      if (unique.length > 0) {
        setPrNumber(String(unique[0].prNumber));
      } else {
        setPrNumber('');
      }
    }
  }, [repoUrl, runs, repoOptions]);

  const canShowExamples = useMemo(
    () => !historyLoading && repoOptions.length === 0,
    [historyLoading, repoOptions.length]
  );

  function validate() {
    if (!repoUrl.trim()) return 'GitHub repository URL is required.';
    if (!repoUrl.includes('github.com')) return 'Must be a github.com URL.';
    if (!prNumber.trim()) return 'PR number is required.';
    if (isNaN(Number(prNumber))) return 'PR number must be a number.';
    return '';
  }

  function handleSubmit(e) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    onSubmit(repoUrl.trim(), prNumber.trim());
  }

  function loadExample(ex) {
    setRepoUrl(ex.repo);
    setPrNumber(ex.pr);
    setError('');
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <GitPullRequest size={18} color="var(--indigo)" />
          <span style={styles.cardTitle}>Analyze a Pull Request</span>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Repository</label>
            {historyLoading && <div style={styles.skeleton}>Loading your repos...</div>}
            <input
              style={styles.input}
              type="text"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              list="repo-suggestions"
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <datalist id="repo-suggestions">
              {repoOptions.map((r) => (
                <option key={r.repoUrl} value={r.repoUrl}>
                  {r.label}
                </option>
              ))}
            </datalist>
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Pull Request Number</label>
            {historyLoading && <div style={styles.skeleton}>Loading PR suggestions...</div>}
            <input
              style={{ ...styles.input, maxWidth: 220 }}
              type="text"
              value={prNumber}
              onChange={(e) => setPrNumber(e.target.value)}
              placeholder="e.g. 1234"
              disabled={loading}
              list="pr-suggestions"
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
            <datalist id="pr-suggestions">
              {prOptions.map((p) => (
                <option key={p.prNumber} value={String(p.prNumber)}>
                  #{p.prNumber}
                </option>
              ))}
            </datalist>
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button
            type="submit"
            style={{ ...styles.btnPrimary, opacity: loading ? 0.6 : 1 }}
            disabled={loading}
          >
            {loading ? (
              <><span style={styles.spinner} /> Analyzing...</>
            ) : (
              <><Search size={14} /> Analyze PR</>
            )}
          </button>
        </form>

        {canShowExamples && (
          <div style={styles.examples}>
            <span style={styles.examplesLabel}>Try an example:</span>
            <div style={styles.chips}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.label}
                  style={styles.chip}
                  onClick={() => loadExample(ex)}
                  disabled={loading}
                  onMouseEnter={e => e.target.style.borderColor = 'var(--indigo)'}
                  onMouseLeave={e => e.target.style.borderColor = 'var(--border)'}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={styles.note}>
        <span style={{ color: 'var(--text-muted)' }}>ℹ</span>
        &nbsp;Only public repositories are supported. Your API key stays on the server.
      </div>
    </div>
  );
}

const styles = {
  wrapper: { maxWidth: 560, margin: '0 auto' },
  card: {
    background: 'var(--bg-card)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '1.5rem',
    marginBottom: 12,
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    marginBottom: '1.25rem'
  },
  cardTitle: {
    fontSize: 15, fontWeight: 500, color: 'var(--text-primary)'
  },
  fieldGroup: { marginBottom: 14 },
  label: {
    display: 'block', fontSize: 12, fontWeight: 500,
    color: 'var(--text-secondary)', marginBottom: 6,
    textTransform: 'uppercase', letterSpacing: '0.06em'
  },
  input: {
    width: '100%', background: 'var(--bg-input)',
    border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '0 12px', height: 40, color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s'
  },
  select: {
    width: '100%', background: 'var(--bg-input)',
    border: '0.5px solid var(--border)', borderRadius: 'var(--radius)',
    padding: '0 12px', height: 40, color: 'var(--text-primary)',
    fontFamily: 'var(--font-sans)', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s'
  },
  skeleton: {
    width: '100%',
    height: 40,
    borderRadius: 'var(--radius)',
    background: 'rgba(148,163,184,0.10)',
    border: '1px solid rgba(148,163,184,0.20)',
    display: 'flex',
    alignItems: 'center',
    padding: '0 12px',
    color: 'var(--text-muted)'
  },
  errorText: { fontSize: 13, color: 'var(--red)', marginBottom: 12 },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    background: 'var(--indigo)', color: '#fff',
    border: 'none', borderRadius: 'var(--radius)',
    padding: '0 20px', height: 40, cursor: 'pointer',
    fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
    transition: 'opacity 0.15s', marginTop: 4
  },
  spinner: {
    display: 'inline-block', width: 13, height: 13,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  },
  examples: { marginTop: '1.25rem', paddingTop: '1rem', borderTop: '0.5px solid var(--border)' },
  examplesLabel: { fontSize: 12, color: 'var(--text-muted)' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    background: 'var(--bg-input)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '4px 10px',
    color: 'var(--text-secondary)', cursor: 'pointer',
    transition: 'border-color 0.15s'
  },
  note: {
    fontSize: 12, color: 'var(--text-muted)',
    textAlign: 'center', lineHeight: 1.6
  }
};

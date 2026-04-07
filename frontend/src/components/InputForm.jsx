import { useState } from 'react';
import { GitPullRequest, Search } from 'lucide-react';

const EXAMPLES = [
  { repo: 'https://github.com/expressjs/express', pr: '5765', label: 'expressjs/express' },
  { repo: 'https://github.com/axios/axios', pr: '6463', label: 'axios/axios' },
  { repo: 'https://github.com/vitejs/vite', pr: '17189', label: 'vitejs/vite' },
];

export default function InputForm({ onSubmit, loading }) {
  const [repoUrl, setRepoUrl] = useState('');
  const [prNumber, setPrNumber] = useState('');
  const [error, setError] = useState('');

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
            <label style={styles.label}>GitHub Repository URL</label>
            <input
              style={styles.input}
              type="text"
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repo"
              disabled={loading}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>

          <div style={styles.fieldGroup}>
            <label style={styles.label}>Pull Request Number</label>
            <input
              style={{ ...styles.input, maxWidth: 180 }}
              type="text"
              value={prNumber}
              onChange={e => setPrNumber(e.target.value)}
              placeholder="e.g. 1234"
              disabled={loading}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
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

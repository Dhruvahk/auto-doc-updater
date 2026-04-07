import { useState } from 'react';
import InputForm from './components/InputForm.jsx';
import PipelineProgress from './components/PipelineProgress.jsx';
import SectionDiff from './components/SectionDiff.jsx';
import SummaryBar from './components/SummaryBar.jsx';
import { useAnalysis, STAGES } from './hooks/useAnalysis.js';
import { GitMerge, RotateCcw, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('diffs');
  const {
    stage, stageLabel, result, error,
    acceptedIds, rejectedIds,
    prCreating, createdPR, patchedReadme,
    go, accept, reject, acceptAll, resetAll, createPR, reset
  } = useAnalysis();

  const isRunning = [STAGES.FETCHING_PR, STAGES.FETCHING_README, STAGES.ANALYZING].includes(stage);
  const isDone = stage === STAGES.DONE;

  return (
    <div style={{ minHeight: '100vh', padding: '2rem 1.5rem 4rem' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logoBox}>
          <GitMerge size={18} color="#fff" />
        </div>
        <div>
          <h1 style={styles.h1}>Auto Doc Updater</h1>
          <p style={styles.subtitle}>LLM-powered README sync for GitHub pull requests</p>
        </div>
        {(isDone || error) && (
          <button onClick={reset} style={styles.resetBtn}>
            <RotateCcw size={13} /> New analysis
          </button>
        )}
      </header>

      <main style={styles.main}>

        {/* ── IDLE: show input form ── */}
        {stage === STAGES.IDLE && (
          <InputForm onSubmit={go} loading={false} />
        )}

        {/* ── RUNNING: show pipeline progress ── */}
        {isRunning && (
          <PipelineProgress stage={stage} label={stageLabel} />
        )}

        {/* ── ERROR ── */}
        {error && (
          <div style={styles.errorBox}>
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* ── DONE: show results ── */}
        {isDone && result && (
          <>
            <SummaryBar
              pr={result.pr}
              analysis={result.analysis}
              acceptedCount={acceptedIds.size}
              pendingCount={result.analysis.sections.length - acceptedIds.size - rejectedIds.size}
            />

            {/* Tabs */}
            <div style={styles.tabs}>
              {[
                ['diffs', 'Section diffs'],
                ['rawdiff', 'PR diff'],
                ['readme', 'README preview']
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  style={{
                    ...styles.tab,
                    background: activeTab === id ? 'var(--bg-hover)' : 'transparent',
                    color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── Tab: Section diffs ── */}
            {activeTab === 'diffs' && (
              <>
                <div style={styles.diffToolbar}>
                  <button
                    style={styles.btnAcceptAll}
                    onClick={acceptAll}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.16)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--green-bg)'}
                  >
                    ✓ Accept all
                  </button>
                  <button
                    style={styles.btnReset}
                    onClick={resetAll}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card)'}
                  >
                    Reset
                  </button>
                  <span style={styles.reviewHint}>
                    {acceptedIds.size} accepted · {rejectedIds.size} rejected · {result.analysis.sections.length - acceptedIds.size - rejectedIds.size} pending
                  </span>
                </div>

                {result.analysis.sections.map(s => (
                  <SectionDiff
                    key={s.id}
                    section={s}
                    accepted={acceptedIds.has(s.id)}
                    rejected={rejectedIds.has(s.id)}
                    onAccept={accept}
                    onReject={reject}
                  />
                ))}
              </>
            )}

            {/* ── Tab: Raw PR diff ── */}
            {activeTab === 'rawdiff' && (
              <div style={styles.codeCard}>
                <div style={styles.fileChips}>
                  {result.pr.files.slice(0, 20).map(f => (
                    <span key={f.filename} style={{
                      ...styles.fileChip,
                      background: f.status === 'added' ? 'var(--green-bg)' : f.status === 'removed' ? 'var(--red-bg)' : 'var(--amber-bg)',
                      borderColor: f.status === 'added' ? 'var(--green-border)' : f.status === 'removed' ? 'var(--red-border)' : 'var(--amber-border)',
                      color: f.status === 'added' ? 'var(--green)' : f.status === 'removed' ? 'var(--red)' : 'var(--amber)',
                    }}>
                      {f.status === 'added' ? '+' : f.status === 'removed' ? '-' : '~'} {f.filename.split('/').pop()}
                    </span>
                  ))}
                </div>
                <div style={styles.codeLabel}>Diff preview</div>
                <pre style={styles.codePre}>
                  {result.pr.diffText || 'No diff text available.'}
                </pre>
              </div>
            )}

            {/* ── Tab: README preview ── */}
            {activeTab === 'readme' && (
              <div style={styles.codeCard}>
                <div style={styles.readmeHint}>
                  {acceptedIds.size > 0
                    ? `Showing README with ${acceptedIds.size} accepted change(s) applied.`
                    : 'Accept sections on the "Section diffs" tab to see them applied here.'}
                </div>
                <pre style={{ ...styles.codePre, color: 'var(--text-primary)', maxHeight: 560 }}>
                  {(patchedReadme || result.readme.content).slice(0, 5000)}
                </pre>
              </div>
            )}

            {/* ── Create PR box ── */}
            <div style={{
              ...styles.prBox,
              borderColor: acceptedIds.size > 0 ? 'var(--green-border)' : 'var(--border)',
              background: acceptedIds.size > 0 ? 'var(--green-bg)' : 'var(--bg-card)'
            }}>
              <div style={{ flex: 1 }}>
                <p style={styles.prBoxTitle}>
                  {createdPR ? '✅ PR opened on GitHub' : '⬆ Open documentation PR on GitHub'}
                </p>
                <p style={styles.prBoxSub}>
                  {createdPR
                    ? `Branch: ${createdPR.branch} · ${createdPR.appliedCount} change(s) applied`
                    : acceptedIds.size === 0
                    ? 'Accept at least one section above to enable this.'
                    : `Will commit ${acceptedIds.size} change(s) to a new branch off "${result.pr.baseBranch}" and open a PR.`
                  }
                </p>
              </div>
              {createdPR ? (
                <a
                  href={createdPR.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={styles.btnViewPR}
                >
                  <ExternalLink size={13} /> View PR #{createdPR.prNumber}
                </a>
              ) : (
                <button
                  onClick={createPR}
                  disabled={acceptedIds.size === 0 || prCreating}
                  style={{
                    ...styles.btnCreatePR,
                    background: acceptedIds.size > 0 ? 'var(--green)' : 'var(--bg-hover)',
                    color: acceptedIds.size > 0 ? '#fff' : 'var(--text-muted)',
                    cursor: acceptedIds.size > 0 ? 'pointer' : 'not-allowed'
                  }}
                >
                  {prCreating ? (
                    <><span style={styles.spinner} /> Creating...</>
                  ) : (
                    '⬆ Open PR'
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

const styles = {
  header: {
    maxWidth: 860, margin: '0 auto 2.5rem',
    display: 'flex', alignItems: 'center', gap: 12
  },
  logoBox: {
    width: 36, height: 36, background: 'var(--indigo)',
    borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0
  },
  h1: { fontSize: 18, fontWeight: 600, letterSpacing: '-0.3px' },
  subtitle: { fontSize: 12, color: 'var(--text-muted)', marginTop: 1 },
  resetBtn: {
    marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6,
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 12px',
    color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
    fontFamily: 'var(--font-sans)'
  },
  main: { maxWidth: 860, margin: '0 auto' },
  errorBox: {
    background: 'var(--red-bg)', border: '0.5px solid var(--red-border)',
    borderRadius: 'var(--radius)', padding: '12px 16px',
    color: 'var(--red)', fontSize: 14, lineHeight: 1.6
  },
  tabs: {
    display: 'flex', gap: 2, margin: '1rem 0',
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius)', padding: 3
  },
  tab: {
    flex: 1, fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
    padding: '7px 12px', border: 'none', borderRadius: 8,
    cursor: 'pointer', transition: 'all 0.15s'
  },
  diffToolbar: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12
  },
  btnAcceptAll: {
    fontFamily: 'var(--font-sans)', fontSize: 13,
    background: 'var(--green-bg)', color: 'var(--green)',
    border: '0.5px solid var(--green-border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 14px',
    cursor: 'pointer', transition: 'background 0.15s'
  },
  btnReset: {
    fontFamily: 'var(--font-sans)', fontSize: 13,
    background: 'var(--bg-card)', color: 'var(--text-secondary)',
    border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '6px 14px',
    cursor: 'pointer', transition: 'background 0.15s'
  },
  reviewHint: {
    fontSize: 12, color: 'var(--text-muted)', marginLeft: 4
  },
  codeCard: {
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem'
  },
  fileChips: {
    display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14
  },
  fileChip: {
    fontFamily: 'var(--font-mono)', fontSize: 11,
    border: '0.5px solid', borderRadius: 4, padding: '3px 8px'
  },
  codeLabel: {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: 8
  },
  codePre: {
    fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
    wordBreak: 'break-word', maxHeight: 440, overflowY: 'auto'
  },
  readmeHint: {
    fontSize: 12, color: 'var(--text-muted)', marginBottom: 12
  },
  prBox: {
    marginTop: '1.5rem', border: '0.5px solid',
    borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem',
    display: 'flex', alignItems: 'center', gap: 14,
    transition: 'all 0.2s'
  },
  prBoxTitle: { fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' },
  prBoxSub: { fontSize: 12, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.5 },
  btnViewPR: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'var(--green)', color: '#fff',
    borderRadius: 'var(--radius-sm)', padding: '8px 16px',
    fontSize: 13, fontWeight: 500, textDecoration: 'none',
    whiteSpace: 'nowrap'
  },
  btnCreatePR: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    border: 'none', borderRadius: 'var(--radius-sm)', padding: '8px 16px',
    fontSize: 13, fontWeight: 500, fontFamily: 'var(--font-sans)',
    transition: 'all 0.15s', whiteSpace: 'nowrap'
  },
  spinner: {
    display: 'inline-block', width: 12, height: 12,
    border: '2px solid rgba(255,255,255,0.3)',
    borderTopColor: '#fff', borderRadius: '50%',
    animation: 'spin 0.6s linear infinite'
  }
};

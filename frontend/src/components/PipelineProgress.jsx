import { Check, GitBranch, BookOpen, Cpu, Layers } from 'lucide-react';
import { STAGES } from '../hooks/useAnalysis.js';

const STEPS = [
  { id: STAGES.FETCHING_PR, label: 'Fetch PR diff', icon: GitBranch },
  { id: STAGES.FETCHING_README, label: 'Read README', icon: BookOpen },
  { id: STAGES.ANALYZING, label: 'LLM analysis', icon: Cpu },
  { id: STAGES.DONE, label: 'Ready', icon: Layers },
];

const ORDER = [STAGES.FETCHING_PR, STAGES.FETCHING_README, STAGES.ANALYZING, STAGES.DONE];

export default function PipelineProgress({ stage, label }) {
  const currentIdx = ORDER.indexOf(stage);

  return (
    <div style={styles.wrapper}>
      <div style={styles.steps}>
        {STEPS.map((step, i) => {
          const stepIdx = ORDER.indexOf(step.id);
          const isDone = stepIdx < currentIdx;
          const isActive = stepIdx === currentIdx;
          const Icon = step.icon;

          return (
            <div key={step.id} style={styles.stepRow}>
              <div style={{
                ...styles.dot,
                ...(isDone ? styles.dotDone : {}),
                ...(isActive ? styles.dotActive : {}),
              }}>
                {isDone
                  ? <Check size={11} color="#fff" />
                  : <Icon size={11} color={isActive ? '#fff' : 'var(--text-muted)'} />
                }
              </div>
              <span style={{
                ...styles.stepLabel,
                color: isDone || isActive ? 'var(--text-primary)' : 'var(--text-muted)'
              }}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && (
                <div style={{
                  ...styles.connector,
                  background: isDone ? 'var(--indigo)' : 'var(--border)'
                }} />
              )}
            </div>
          );
        })}
      </div>

      <div style={styles.statusBar}>
        <span style={styles.statusDot} />
        <span style={styles.statusText}>{label}</span>
      </div>
    </div>
  );
}

const styles = {
  wrapper: { marginBottom: '1.5rem' },
  steps: {
    display: 'flex', alignItems: 'center', gap: 0,
    marginBottom: 14, flexWrap: 'wrap', rowGap: 8
  },
  stepRow: {
    display: 'flex', alignItems: 'center', gap: 6
  },
  dot: {
    width: 26, height: 26, borderRadius: '50%',
    background: 'var(--bg-input)', border: '0.5px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.2s'
  },
  dotActive: { background: 'var(--indigo)', borderColor: 'var(--indigo)' },
  dotDone: { background: 'var(--green)', borderColor: 'var(--green)' },
  stepLabel: { fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap' },
  connector: {
    width: 28, height: 1, margin: '0 2px', flexShrink: 0, transition: 'background 0.3s'
  },
  statusBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px',
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius)',
    fontSize: 13, color: 'var(--text-secondary)'
  },
  statusDot: {
    width: 7, height: 7, borderRadius: '50%', background: 'var(--amber)',
    animation: 'pulse 1s ease-in-out infinite',
    flexShrink: 0
  },
  statusText: { fontSize: 13, color: 'var(--text-secondary)' }
};

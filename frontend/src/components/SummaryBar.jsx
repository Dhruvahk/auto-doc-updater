import { FileCode, FileText, CheckCircle, Clock } from 'lucide-react';

export default function SummaryBar({ pr, analysis, acceptedCount, pendingCount }) {
  const metrics = [
    {
      icon: <FileCode size={16} color="var(--indigo)" />,
      value: pr.files.length,
      label: 'files changed'
    },
    {
      icon: <FileText size={16} color="var(--amber)" />,
      value: analysis.sections.length,
      label: 'sections affected'
    },
    {
      icon: <CheckCircle size={16} color="var(--green)" />,
      value: acceptedCount,
      label: 'accepted'
    },
    {
      icon: <Clock size={16} color="var(--text-muted)" />,
      value: pendingCount,
      label: 'pending'
    },
  ];

  return (
    <div>
      <div style={styles.summary}>
        <span style={styles.summaryText}>
          <span style={styles.prNum}>PR #{pr.number}</span>
          {' · '}
          <span style={styles.prTitle}>{pr.title}</span>
          {' by '}
          <code style={styles.author}>@{pr.author}</code>
        </span>
      </div>

      <div style={styles.grid}>
        {metrics.map(m => (
          <div key={m.label} style={styles.metric}>
            <div style={styles.metricIcon}>{m.icon}</div>
            <div style={styles.metricVal}>{m.value}</div>
            <div style={styles.metricLabel}>{m.label}</div>
          </div>
        ))}
      </div>

      {analysis.summary && (
        <div style={styles.analysisSummary}>
          <span style={styles.aiIcon}>✦</span>
          {analysis.summary}
        </div>
      )}
    </div>
  );
}

const styles = {
  summary: {
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '10px 14px', marginBottom: 10,
    fontSize: 13, lineHeight: 1.5
  },
  summaryText: { color: 'var(--text-secondary)' },
  prNum: { fontWeight: 600, color: 'var(--indigo)', fontFamily: 'var(--font-mono)' },
  prTitle: { color: 'var(--text-primary)' },
  author: { fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' },
  grid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 8, marginBottom: 10
  },
  metric: {
    background: 'var(--bg-card)', border: '0.5px solid var(--border)',
    borderRadius: 'var(--radius)', padding: '12px 14px',
    display: 'flex', flexDirection: 'column', gap: 4
  },
  metricIcon: { marginBottom: 2 },
  metricVal: { fontSize: 22, fontWeight: 600, lineHeight: 1 },
  metricLabel: { fontSize: 11, color: 'var(--text-muted)' },
  analysisSummary: {
    background: 'var(--indigo-bg)', border: '0.5px solid rgba(99,102,241,0.2)',
    borderRadius: 'var(--radius)', padding: '10px 14px',
    fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0,
    display: 'flex', gap: 8, lineHeight: 1.6
  },
  aiIcon: { color: 'var(--indigo)', flexShrink: 0, marginTop: 1 }
};

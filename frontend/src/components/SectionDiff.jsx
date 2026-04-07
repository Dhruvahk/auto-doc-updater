import { Check, X, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const IMPACT_COLORS = {
  high: { bg: 'var(--red-bg)', border: 'var(--red-border)', text: 'var(--red)' },
  medium: { bg: 'var(--amber-bg)', border: 'var(--amber-border)', text: 'var(--amber)' },
  low: { bg: 'var(--blue-bg)', border: 'rgba(59,130,246,0.25)', text: 'var(--blue)' },
};

const CHANGE_TYPE_ICONS = {
  update: '✏️',
  add: '➕',
  remove: '🗑️',
};

export default function SectionDiff({ section, accepted, rejected, onAccept, onReject, onSaveEdit }) {
  const [collapsed, setCollapsed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftText, setDraftText] = useState(section.newText || '');
  const impact = IMPACT_COLORS[section.impact] || IMPACT_COLORS.medium;

  const borderColor = accepted
    ? 'var(--green-border)'
    : rejected
    ? 'var(--red-border)'
    : 'var(--border)';

  return (
    <div style={{ ...styles.wrapper, borderColor, opacity: rejected ? 0.55 : 1 }}>
      {/* Header */}
      <div style={styles.header} onClick={() => setCollapsed(v => !v)}>
        <div style={styles.headerLeft}>
          <span style={styles.changeIcon}>{CHANGE_TYPE_ICONS[section.changeType]}</span>
          <code style={styles.heading}>{section.heading}</code>
        </div>
        <div style={styles.headerRight}>
          <span style={{ ...styles.impactBadge, background: impact.bg, color: impact.text, border: `0.5px solid ${impact.border}` }}>
            {section.impact} impact
          </span>
          <span style={styles.confidence}>{section.confidence}%</span>
          {collapsed ? <ChevronDown size={14} color="var(--text-muted)" /> : <ChevronUp size={14} color="var(--text-muted)" />}
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Reason */}
          <div style={styles.reason}>
            <span style={styles.reasonIcon}>💡</span>
            <span>{section.reason}</span>
          </div>

          {/* Diff panes */}
          <div style={styles.diffGrid}>
            <div style={styles.diffPane}>
              <div style={{ ...styles.paneLabel, color: 'var(--red)' }}>Before</div>
              <pre style={{ ...styles.pre, background: 'rgba(239,68,68,0.04)', borderColor: 'rgba(239,68,68,0.12)' }}>
                {section.oldText || '(empty)'}
              </pre>
            </div>
            <div style={styles.diffPane}>
              <div style={{ ...styles.paneLabel, color: 'var(--green)' }}>After (suggested)</div>
              {editing ? (
                <textarea
                  style={styles.textarea}
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                />
              ) : (
                <pre style={{ ...styles.pre, background: 'rgba(34,197,94,0.04)', borderColor: 'rgba(34,197,94,0.12)' }}>
                  {section.newText || '(empty)'}
                </pre>
              )}
            </div>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            {!accepted && !rejected && (
              <button
                style={styles.btnEdit}
                onClick={async () => {
                  if (editing) {
                    await onSaveEdit(section.id, draftText);
                    setEditing(false);
                    return;
                  }
                  setEditing(true);
                }}
              >
                {editing ? 'Save edit' : 'Edit'}
              </button>
            )}
            {accepted ? (
              <span style={styles.acceptedTag}><Check size={12} /> Accepted</span>
            ) : rejected ? (
              <span style={styles.rejectedTag}><X size={12} /> Rejected</span>
            ) : (
              <>
                <button
                  style={styles.btnAccept}
                  onClick={() => onAccept(section.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(34,197,94,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--green-bg)'}
                >
                  <Check size={13} /> Accept
                </button>
                <button
                  style={styles.btnReject}
                  onClick={() => onReject(section.id)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.18)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--red-bg)'}
                >
                  <X size={13} /> Reject
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const btnBase = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500,
  height: 32, padding: '0 14px', borderRadius: 'var(--radius-sm)',
  cursor: 'pointer', border: 'none', transition: 'background 0.15s'
};

const styles = {
  wrapper: {
    background: 'var(--bg-card)', border: '0.5px solid',
    borderRadius: 'var(--radius-lg)', marginBottom: 12,
    overflow: 'hidden', transition: 'border-color 0.2s, opacity 0.2s'
  },
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', cursor: 'pointer',
    borderBottom: '0.5px solid var(--border)',
    userSelect: 'none'
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 8 },
  headerRight: { display: 'flex', alignItems: 'center', gap: 10 },
  changeIcon: { fontSize: 14 },
  heading: {
    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 500,
    color: 'var(--text-primary)'
  },
  impactBadge: {
    fontSize: 11, fontWeight: 500, padding: '3px 8px',
    borderRadius: 20
  },
  confidence: { fontSize: 12, color: 'var(--text-muted)' },
  reason: {
    display: 'flex', gap: 8, padding: '10px 16px',
    fontSize: 13, color: 'var(--text-secondary)',
    borderBottom: '0.5px solid var(--border)',
    lineHeight: 1.5
  },
  reasonIcon: { flexShrink: 0, marginTop: 1 },
  diffGrid: {
    display: 'grid', gridTemplateColumns: '1fr 1fr',
    borderBottom: '0.5px solid var(--border)'
  },
  diffPane: { padding: 14 },
  paneLabel: {
    fontSize: 11, fontWeight: 500, textTransform: 'uppercase',
    letterSpacing: '0.06em', marginBottom: 8
  },
  pre: {
    fontFamily: 'var(--font-mono)', fontSize: 12, lineHeight: 1.7,
    color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
    border: '0.5px solid', borderRadius: 'var(--radius-sm)',
    padding: '10px 12px', minHeight: 60
  },
  textarea: {
    width: '100%',
    minHeight: 112,
    resize: 'vertical',
    background: 'rgba(34,197,94,0.04)',
    border: '0.5px solid rgba(34,197,94,0.12)',
    borderRadius: 'var(--radius-sm)',
    padding: '10px 12px',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    lineHeight: 1.7,
    outline: 'none'
  },
  actions: {
    display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px'
  },
  btnAccept: {
    ...btnBase, background: 'var(--green-bg)', color: 'var(--green)'
  },
  btnReject: {
    ...btnBase, background: 'var(--red-bg)', color: 'var(--red)'
  },
  btnEdit: {
    ...btnBase, background: 'var(--bg-input)', color: 'var(--text-secondary)'
  },
  acceptedTag: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: 'var(--green)', fontWeight: 500
  },
  rejectedTag: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    fontSize: 12, color: 'var(--red)', fontWeight: 500
  }
};

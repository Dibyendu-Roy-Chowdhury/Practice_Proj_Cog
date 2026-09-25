import React from 'react';

/**
 * StatusBadge — consolidated status indicator.
 * Replaces: Radio.Group status, span.status-badge, div.priority-badge
 *
 * variant: 'success' | 'warning' | 'error' | 'info' | 'neutral'
 */

const cfg = {
  success: {
    pill:   'bg-status-success-bg border-status-success-border text-status-success',
    dot:    'bg-status-success',
  },
  warning: {
    pill:   'bg-status-warning-bg border-status-warning-border text-status-warning',
    dot:    'bg-status-warning',
  },
  error: {
    pill:   'bg-status-error-bg border-status-error-border text-status-error',
    dot:    'bg-status-error',
  },
  info: {
    pill:   'bg-status-info-bg border-status-info-border text-status-info',
    dot:    'bg-status-info',
  },
  neutral: {
    pill:   'bg-surface-raised border-border text-ink-secondary',
    dot:    'bg-ink-tertiary',
  },
};

const StatusBadge = ({ variant = 'neutral', dot = false, children, className = '' }) => {
  const c = cfg[variant] || cfg.neutral;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border ${c.pill} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />}
      {children}
    </span>
  );
};

export default StatusBadge;

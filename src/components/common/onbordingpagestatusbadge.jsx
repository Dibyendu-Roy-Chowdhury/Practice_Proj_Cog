import React from 'react';

const cfg = {
  success: {
    pill: 'bg-status-success-bg border-status-success-border text-status-success',
    dot: 'bg-status-success',
  },
  warning: {
    pill: 'bg-status-warning-bg border-status-warning-border text-status-warning',
    dot: 'bg-status-warning',
  },
  pending: {
    pill: 'bg-status-error-bg border-status-error-border text-status-error',
    dot: 'bg-status-error',
  },
  neutral: {
    pill: 'bg-gray-50 border-gray-300 text-gray-600',
    dot: 'bg-gray-400',
  },
};

const StatusBadge = ({ variant = 'neutral', dot = false, dotColor, children, className = '', style = {}, ...props}) => {
  const c = cfg[variant] || cfg.neutral;
  return (
  <span{...props} style={style} 
     className={`inline-flex items-center gap-1.5 rounded-full border-2 px-3 py-0.5 ${c.pill} ${className}`}>
      {dot && (
        <span
          className={`w-2 h-2 rounded-full flex-shrink-0 ${!dotColor ? c.dot : ''}`}
          style={dotColor ? { backgroundColor: dotColor } : {}}
        />
      )}
      {children}
    </span>
  );
};

export default StatusBadge;
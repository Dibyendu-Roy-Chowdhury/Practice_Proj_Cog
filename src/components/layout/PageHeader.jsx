import React from 'react';

/**
 * PageHeader — top-of-page section with title, subtitle, and action slot.
 * Consistent across all pages.
 */
const PageHeader = ({ title, subtitle, actions, className = '' }) => (
  <div className={`flex items-start justify-between mb-6 ${className}`}>
    <div>
      {title && <h1 className="text-2xl font-bold text-ink-primary leading-tight">{title}</h1>}
      {subtitle && (
        <p className={`text-sm text-ink-secondary ${title ? 'mt-0.5' : ''}`}>{subtitle}</p>
      )}
    </div>
    {actions && (
      <div className="flex items-center gap-2 ml-4 flex-shrink-0">{actions}</div>
    )}
  </div>
);

export default PageHeader;

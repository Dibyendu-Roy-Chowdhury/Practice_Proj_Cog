import React from 'react';
import { isFeatureEnabled } from '../../config/featureGates';
import ErrorBoundary from './ErrorBoundary';

/**
 * Wraps a tab definition with feature gating.
 *
 * If the gate is OFF: returns null (tab is hidden entirely).
 * If the gate is ON: the tab renders normally, wrapped in an ErrorBoundary.
 *
 * Usage:
 *   gatedTab('insights.health', {
 *     key: 'health',
 *     name: 'Fleet Health',
 *     label: <span>...</span>,
 *     children: <FleetHealthTab />,
 *   })
 *
 * Use .filter(Boolean) on the resulting array to remove hidden tabs:
 *   const TABS = [gatedTab(...), gatedTab(...)].filter(Boolean);
 */
export const gatedTab = (gate, tabDef) => {
  const enabled = isFeatureEnabled(gate);
  const displayName = tabDef.name || tabDef.key;

  if (!enabled) return null;

  return {
    ...tabDef,
    children: (
      <ErrorBoundary label={displayName}>
        {tabDef.children}
      </ErrorBoundary>
    ),
  };
};

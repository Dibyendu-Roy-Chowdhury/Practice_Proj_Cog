import React from 'react';
import { isSubFeatureEnabled } from '../../config/featureGates';

/**
 * GatedAction — feature-flag wrapper for action buttons.
 * Renders children only when the named gate is enabled.
 * Usage: <GatedAction gate="registry.fleet.editAgent"><Button>Edit</Button></GatedAction>
 * NOTE: Role-based gating is handled separately via `userRole` prop on each component.
 */
/**
 * Wraps a sub-feature-gated action.
 *
 * If the gate is OFF: returns null (action is hidden entirely).
 * If the gate is ON: renders children normally.
 */
const GatedAction = ({ gate, children }) => {
  const enabled = isSubFeatureEnabled(gate);
  if (!enabled) return null;
  return <>{children}</>;
};

export default GatedAction;

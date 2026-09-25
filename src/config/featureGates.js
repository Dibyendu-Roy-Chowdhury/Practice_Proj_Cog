/**
 * VeriForge Ops — Feature Gate Configuration
 *
 * Controls which features are enabled in the current release.
 * Set a feature to `true` to enable it, `false` to show it as locked/coming-soon.
 *
 * NOTE: Gates marked `false` below fall into two categories:
 *   - "Not yet implemented" — UI surface does not exist; flipping to true will have no effect.
 *   - "Gated / coming soon" — implementation exists but is intentionally disabled for this release.
 * Check the inline comment on each gate before enabling.
 */

const DEPLOYMENT_PROFILE = 'customer-demo';

const FEATURE_GATES = {

  // ===== SHELL / MULTI-TENANT =====
  'shell.tenantSwitcher': true,   // LOB tenant switcher in sidebar + topbar badge
  'shell.envSwitcher':    true,   // Environment switcher (Production / Staging / Dev)
  // shell.personaToggle removed — Forge capabilities are always unlocked

  // ===== CORE (key '8') =====
  'core.overview': true,
  'core.quality': true,
  'core.cost': true,
  'core.roi': false,              // NOT IMPLEMENTED — no UI component exists yet

  // ===== INSIGHTS (key '1') =====
  'insights.health': true,
  'insights.fleet-events': true,
  'insights.signals': true,
  'insights.quality': true,
  'insights.guardrails': true,

  // ===== REGISTRY (key '7') =====
  'registry.fleet': true,
  'registry.prompts': true,
  'registry.tools': true,
  'registry.models': true,
  'registry.rag': true,
  'registry.evals': true,

  // ===== WORKBENCH (key '2') =====
  'workbench.troubleshoot': true,
  'workbench.runbooks': true,
  'workbench.overrides': true,
  'workbench.recovery': true,
  'workbench.experiments': true,
  'workbench.fine-tuning': true,
  'workbench.playground': true,

  // ===== FINOPS (key '12') =====
  'finops.usage': true,
  'finops.budgets': true,
  'finops.optimize': true,

  // ===== ADMIN (key '4') =====
  'admin.cicd': true,
  'admin.platform-config': true,
  'admin.apikeys': true,
  'admin.reports': true,
  'admin.assistant': true,
  'admin.orchestration': true,

  // ===== AGENT EVALUATION =====
  'eval.dashboard': true,            // Evaluation results dashboard
  'eval.suites': true,               // Test suite management
  'eval.trigger': true,              // Manually trigger an evaluation run
  'eval.history': true,              // Per-agent evaluation history

  // ===== COMPLIANCE =====
  'compliance.events': true,         // Compliance event log viewer
  'compliance.controls': true,       // Control map (ISO 42001 / NIST AI RMF / SOC2)
  'compliance.reports': true,        // Generate and download audit reports
  'compliance.export.csv': true,     // CSV export of compliance events

  // ===== MULTI-CLOUD STORAGE =====
  'cloudStorage.status': true,       // Cloud provider health dashboard
  'cloudStorage.records': true,      // Sync record viewer
  'cloudStorage.sync': true,         // Manual re-sync for failed records
};

/**
 * Sub-feature gates for granular control within an enabled tab.
 */
const SUB_FEATURE_GATES = {
  'registry.fleet.addAgent': true,
  'registry.fleet.editAgent': true,
  'registry.fleet.deleteAgent': false,
  'registry.fleet.rollback': true,
  'registry.fleet.runEval': true,

  'workbench.runbooks.execute': false,    // GATED — backend execution endpoint is a stub in alpha
  'workbench.runbooks.escalate': true,

  'insights.signals.embedding': true,
  'insights.signals.calibrate': true,

  'finops.optimize.whatif': false,        // NOT IMPLEMENTED — no UI component exists yet

  // Evaluation sub-features
  'eval.trigger.scheduled': false,        // Scheduled eval cron — not wired yet
  'eval.trigger.ci': true,               // CI-triggered evals supported via API

  // Compliance sub-features
  'compliance.reports.pdf': false,        // PDF export — not implemented yet

  // Cloud storage sub-features
  'cloudStorage.sync.auto-retry': false,  // Background auto-retry loop — not implemented yet
};

export const isFeatureEnabled = (featureKey) => {
  return FEATURE_GATES[featureKey] === true;
};

export const isSubFeatureEnabled = (subFeatureKey) => {
  return SUB_FEATURE_GATES[subFeatureKey] === true;
};

export const getRelease = () => DEPLOYMENT_PROFILE;

export { FEATURE_GATES, SUB_FEATURE_GATES };

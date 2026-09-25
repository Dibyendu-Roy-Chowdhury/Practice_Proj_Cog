/**
 * complianceTagger.js
 * Lightweight utility called by existing controllers at write-time.
 * Creates an immutable ComplianceEvent from any compliance-relevant action.
 */

const ComplianceEvent = require('../models/ComplianceEvent');
const { getControls, getEventSeverity, FRAMEWORKS } = require('../config/complianceControls');

let _counter = 0;

function nextCeId() {
  _counter++;
  return `CE-${String(Date.now()).slice(-8)}-${String(_counter).padStart(4, '0')}`;
}

/**
 * Create a ComplianceEvent for a given action.
 * Non-throwing — logs to stderr on failure so callers are never disrupted.
 *
 * @param {object} opts
 * @param {string}  opts.eventType     - key in CONTROL_MAP (e.g. 'guardrail.trigger')
 * @param {string}  opts.sourceModel   - Mongoose model name of origin record
 * @param {string}  opts.sourceId      - ID of origin record
 * @param {string}  [opts.agentId]
 * @param {string}  [opts.agentName]
 * @param {string}  [opts.tenantId]    - defaults to 'demo'
 * @param {object}  [opts.evidence]    - snapshot of originating record
 * @param {Date}    [opts.timestamp]   - defaults to now
 * @returns {Promise<string|null>}     - ce_id or null on failure
 */
async function tagComplianceEvent({ eventType, sourceModel, sourceId, agentId, agentName, tenantId, evidence, timestamp }) {
  try {
    const controls = getControls(eventType);
    if (!controls) {
      console.warn(`[complianceTagger] Unknown event type: ${eventType} — skipped`);
      return null;
    }
    const severity   = getEventSeverity(eventType);
    const frameworks = FRAMEWORKS.filter(f => controls[f] && controls[f].length > 0);
    const ce_id      = nextCeId();

    const doc = new ComplianceEvent({
      ce_id,
      event_type:   eventType,
      source_model: sourceModel,
      source_id:    sourceId,
      agent_id:     agentId   || undefined,
      agent_name:   agentName || undefined,
      timestamp:    timestamp || new Date(),
      severity,
      control_ids: {
        ISO42001:    controls.ISO42001    || [],
        NIST_AI_RMF: controls.NIST_AI_RMF || [],
        SOC2:        controls.SOC2        || [],
      },
      frameworks,
      evidence: evidence || undefined,
      tenant_id: tenantId || 'demo',
    });
    await doc.save();
    return ce_id;
  } catch (err) {
    console.error(`[complianceTagger] Failed to tag event "${eventType}": ${err.message}`);
    return null;
  }
}

module.exports = { tagComplianceEvent };

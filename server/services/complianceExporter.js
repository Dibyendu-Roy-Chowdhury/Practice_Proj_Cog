/**
 * complianceExporter.js
 * Generates audit-ready compliance reports from ComplianceEvent records.
 * Supports JSON and CSV output.
 */

const ComplianceEvent = require('../models/ComplianceEvent');

/**
 * Build a Mongoose query from report filters.
 */
function buildQuery({ tenantId, framework, eventType, severities, dateFrom, dateTo }) {
  const q = { tenant_id: tenantId || 'demo' };
  if (framework)   q.frameworks = framework;
  if (eventType)   q.event_type = eventType;
  if (severities && severities.length) q.severity = { $in: severities };
  if (dateFrom || dateTo) {
    q.timestamp = {};
    if (dateFrom) q.timestamp.$gte = new Date(dateFrom);
    if (dateTo)   q.timestamp.$lte = new Date(dateTo);
  }
  return q;
}

/**
 * Convert a ComplianceEvent document to a flat row for CSV.
 */
function toRow(ev) {
  return {
    ce_id:           ev.ce_id,
    event_type:      ev.event_type,
    source_model:    ev.source_model,
    source_id:       ev.source_id,
    agent_id:        ev.agent_id     || '',
    agent_name:      ev.agent_name   || '',
    timestamp:       ev.timestamp instanceof Date ? ev.timestamp.toISOString() : ev.timestamp,
    severity:        ev.severity,
    ISO42001:        (ev.control_ids?.ISO42001    || []).join('; '),
    NIST_AI_RMF:     (ev.control_ids?.NIST_AI_RMF || []).join('; '),
    SOC2:            (ev.control_ids?.SOC2        || []).join('; '),
    frameworks:      (ev.frameworks || []).join('; '),
    tenant_id:       ev.tenant_id,
    report_id:       ev.report_id || '',
  };
}

/**
 * Escape a CSV cell value.
 */
function csvCell(val) {
  const s = String(val === null || val === undefined ? '' : val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Generate a compliance report.
 *
 * @param {object} opts
 * @param {string}   opts.tenantId
 * @param {string}   [opts.framework]   - filter to one framework
 * @param {string}   [opts.eventType]
 * @param {string[]} [opts.severities]
 * @param {string}   [opts.dateFrom]    - ISO date string
 * @param {string}   [opts.dateTo]      - ISO date string
 * @param {'json'|'csv'} [opts.format]  - default 'json'
 * @param {string}   [opts.reportId]    - if provided, stamps events with this report_id
 * @returns {Promise<{ report_id: string, format: string, content: object|string, count: number }>}
 */
async function generateReport(opts = {}) {
  const { format = 'json', reportId } = opts;
  const query  = buildQuery(opts);
  const events = await ComplianceEvent.find(query).sort({ timestamp: -1 }).lean();

  const report_id = reportId || `RPT-${Date.now()}`;

  if (format === 'csv') {
    const HEADERS = ['ce_id','event_type','source_model','source_id','agent_id','agent_name',
                     'timestamp','severity','ISO42001','NIST_AI_RMF','SOC2','frameworks','tenant_id','report_id'];
    const rows  = events.map(ev => toRow({ ...ev, report_id }));
    const lines = [
      HEADERS.join(','),
      ...rows.map(r => HEADERS.map(h => csvCell(r[h])).join(',')),
    ];
    return { report_id, format: 'csv', content: lines.join('\n'), count: events.length };
  }

  // JSON format
  const content = {
    report_id,
    generated_at: new Date().toISOString(),
    tenant_id:    opts.tenantId || 'demo',
    filters: {
      framework:  opts.framework  || 'all',
      event_type: opts.eventType  || 'all',
      severities: opts.severities || 'all',
      date_from:  opts.dateFrom   || null,
      date_to:    opts.dateTo     || null,
    },
    total_events: events.length,
    summary: summarise(events),
    events: events.map(ev => ({ ...ev, report_id })),
  };
  return { report_id, format: 'json', content, count: events.length };
}

/**
 * Aggregate counts by framework, severity, and event type.
 */
function summarise(events) {
  const by_severity  = {};
  const by_event     = {};
  const by_framework = { ISO42001: 0, NIST_AI_RMF: 0, SOC2: 0 };

  for (const ev of events) {
    by_severity[ev.severity]   = (by_severity[ev.severity]   || 0) + 1;
    by_event[ev.event_type]    = (by_event[ev.event_type]    || 0) + 1;
    for (const f of (ev.frameworks || [])) {
      if (by_framework[f] !== undefined) by_framework[f]++;
    }
  }
  return { by_severity, by_event, by_framework };
}

module.exports = { generateReport };

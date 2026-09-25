const ComplianceEvent    = require('../models/ComplianceEvent');
const { generateReport } = require('../services/complianceExporter');
const { CONTROL_MAP, FRAMEWORKS } = require('../config/complianceControls');

// ── Events ────────────────────────────────────────────────────────────────────

exports.listEvents = async (req, res, next) => {
  try {
    const { framework, eventType, severity, dateFrom, dateTo, limit = 100 } = req.query;
    const query = { ...req.tenantFilter };
    if (framework)  query.frameworks = framework;
    if (eventType)  query.event_type = eventType;
    if (severity)   query.severity   = severity;
    if (dateFrom || dateTo) {
      query.timestamp = {};
      if (dateFrom) query.timestamp.$gte = new Date(dateFrom);
      if (dateTo)   query.timestamp.$lte = new Date(dateTo);
    }
    const events = await ComplianceEvent.find(query)
      .sort({ timestamp: -1 })
      .limit(Math.min(parseInt(limit, 10) || 100, 500))
      .lean();
    res.json({ status: 'success', count: events.length, events });
  } catch (err) { next(err); }
};

exports.getEvent = async (req, res, next) => {
  try {
    const ev = await ComplianceEvent.findOne({ ...req.tenantFilter, ce_id: req.params.ceId }).lean();
    if (!ev) return res.status(404).json({ error: 'Compliance event not found' });
    res.json({ status: 'success', event: ev });
  } catch (err) { next(err); }
};

// ── Reports ───────────────────────────────────────────────────────────────────

exports.generateReport = async (req, res, next) => {
  try {
    const { framework, eventType, severities, dateFrom, dateTo, format = 'json' } = req.body;
    if (!['json', 'csv'].includes(format)) {
      return res.status(400).json({ error: "format must be 'json' or 'csv'" });
    }
    const result = await generateReport({
      tenantId:   req.tenantId || 'demo',
      framework,
      eventType,
      severities: Array.isArray(severities) ? severities : (severities ? [severities] : undefined),
      dateFrom,
      dateTo,
      format,
    });
    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="compliance-report-${result.report_id}.csv"`);
      return res.send(result.content);
    }
    res.json({ status: 'success', ...result });
  } catch (err) { next(err); }
};

exports.downloadReportCsv = async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const events = await ComplianceEvent.find({ ...req.tenantFilter, report_id: reportId }).lean();
    if (!events.length) return res.status(404).json({ error: 'Report not found or no events' });
    const result = await generateReport({ tenantId: req.tenantId, format: 'csv', reportId });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="compliance-${reportId}.csv"`);
    res.send(result.content);
  } catch (err) { next(err); }
};

// ── Metadata ──────────────────────────────────────────────────────────────────

exports.getControlMap = (_req, res) => {
  res.json({ status: 'success', frameworks: FRAMEWORKS, controls: CONTROL_MAP });
};

exports.getSummary = async (req, res, next) => {
  try {
    const events = await ComplianceEvent.find({ ...req.tenantFilter }).lean();
    const by_severity  = {};
    const by_framework = { ISO42001: 0, NIST_AI_RMF: 0, SOC2: 0 };
    const by_event     = {};

    for (const ev of events) {
      by_severity[ev.severity] = (by_severity[ev.severity] || 0) + 1;
      by_event[ev.event_type]  = (by_event[ev.event_type]  || 0) + 1;
      for (const f of (ev.frameworks || [])) {
        if (by_framework[f] !== undefined) by_framework[f]++;
      }
    }
    res.json({ status: 'success', total: events.length, by_severity, by_framework, by_event });
  } catch (err) { next(err); }
};

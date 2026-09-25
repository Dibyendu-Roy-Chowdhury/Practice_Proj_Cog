const Alert = require('../models/Alert');

const rebase = (alerts) => {
  if (!alerts.length) return alerts;
  const times = alerts.map(a => new Date(a.timestamp).getTime()).filter(t => !isNaN(t));
  const offset = Date.now() - Math.max(...times);
  return alerts.map(a => {
    const t = new Date(a.timestamp);
    if (isNaN(t)) return a;
    const rebased = new Date(t.getTime() + offset);
    return { ...a, timestamp: rebased.toISOString().slice(0, 19).replace('T', ' ') };
  });
};

exports.getCritical = async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const query = { ...req.tenantFilter, severity: 'P1', resolved: false };
    if (agentId && agentId !== 'all') query.agent_id = agentId;
    const raw   = await Alert.find(query).sort({ timestamp: -1 }).lean();
    const alerts = rebase(raw.map(a => ({ id: a.alert_id, agentName: a.agentName, model_id: a.model_id, severity: a.severity, timestamp: a.timestamp, message: a.message })));
    res.json({ status: 'success', agentId, alerts });
  } catch (err) { next(err); }
};

exports.getWarnings = async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const query = { ...req.tenantFilter, severity: { $in: ['P2', 'P3'] }, resolved: false };
    if (agentId && agentId !== 'all') query.agent_id = agentId;
    const raw   = await Alert.find(query).sort({ timestamp: -1 }).lean();
    const alerts = rebase(raw.map(a => ({ id: a.alert_id, agentName: a.agentName, model_id: a.model_id, severity: a.severity, timestamp: a.timestamp, message: a.message })));
    res.json({ status: 'success', agentId, alerts });
  } catch (err) { next(err); }
};

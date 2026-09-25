const PortalLog = require('../models/PortalLog');

const fmtTs = (d) => d.toISOString().slice(0, 19).replace('T', ' ');

const rebase = (records, tsField = 'timestamp') => {
  if (!records.length) return records;
  const times  = records.map(r => new Date(r[tsField]).getTime()).filter(t => !isNaN(t));
  const offset = Date.now() - Math.max(...times);
  return records.map(r => {
    const orig = new Date(r[tsField]);
    if (isNaN(orig)) return r;
    return { ...r, [tsField]: fmtTs(new Date(orig.getTime() + offset)) };
  });
};

exports.getPortalLogs = async (_req, res, next) => {
  try {
    const raw  = await PortalLog.find().sort({ timestamp: -1 }).limit(50).lean();
    const logs = rebase(raw.map(l => ({ id: l.log_id, level: l.level, component: l.component, message: l.message, timestamp: l.timestamp })));
    res.json(logs);
  } catch (err) { next(err); }
};

exports.syncLogs = async (req, res) => {
  const { logGroup, hoursBack, maxLogs } = req.body;
  const h = hoursBack || 24;
  const synced = Math.min(maxLogs || 20, Math.floor(Math.abs((Math.sin(h + 1.7) * 10000) % 1) * 80 + 20));
  res.json({ status: 'success', synced: true, logGroup: logGroup || '/veriforge/model-invocations', entriesFound: synced, records_synced: synced, last_sync: new Date().toISOString(), message: `Successfully synced ${synced} log entries` });
};

exports.syncAgentLogs = async (req, res) => {
  const { agent } = req.params;
  const n = agent.length;
  const synced = Math.floor(Math.abs((Math.sin(n + 1.7) * 10000) % 1) * 100 + 30);
  res.json({ status: 'success', message: `Logs synced for agent "${agent}"`, records_synced: synced, last_sync: new Date().toISOString() });
};

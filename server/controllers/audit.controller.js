const { AUDIT_TRACES_STATIC } = require('../config/constants');
exports.getTraces = (req, res) => {
  const tenantId = req.tenantId || 'demo';
  const traces = tenantId === 'demo'
    ? AUDIT_TRACES_STATIC
    : AUDIT_TRACES_STATIC.filter(t => t.tenant_id === tenantId);
  res.json(traces);
};

const { KNOWN_TENANTS } = require('../middleware/tenantContext');

const TENANT_META = {
  'demo': {
    id: 'demo', name: 'VeriForge Platform Admin', industry: 'Platform',
    region: 'us-east-1', plan: 'Enterprise', status: 'Active',
  },
  'arcadia-health': {
    id: 'arcadia-health', name: 'Arcadia Health AI',
    industry: 'Clinical AI · HIPAA · ISO 42001',
    region: 'us-east-1', plan: 'Enterprise', status: 'Active',
  },
  'zenith-capital': {
    id: 'zenith-capital', name: 'Zenith Capital AI',
    industry: 'Algo Trading · SEC · SOC 2',
    region: 'us-east-1', plan: 'Enterprise', status: 'Active',
  },
};

exports.listTenants = (_req, res) => {
  res.json({ status: 'success', tenants: Object.values(TENANT_META) });
};

exports.getTenant = (req, res) => {
  const { tenantId } = req.params;
  if (!KNOWN_TENANTS.has(tenantId)) {
    return res.status(404).json({ error: `Tenant '${tenantId}' not found` });
  }
  res.json({ status: 'success', tenant: TENANT_META[tenantId] });
};

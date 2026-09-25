const Deployment = require('../models/Deployment');

exports.getDeployments = async (_req, res, next) => {
  try {
    const raw = await Deployment.find().sort({ date: -1 }).lean();
    if (raw.length) {
      res.json(raw.map(d => ({ id: d.deployment_id, name: d.name, version: d.version, model: d.model, env: d.env, date: d.date, by: d.deployed_by, status: d.status })));
    } else {
      res.json([
        { id: 'DEP-001', name: 'Concierge Agent',              version: 'v2.1', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',    env: 'Production', date: '2026-03-20', by: 'admin@veritas.demo',  status: 'Live'    },
        { id: 'DEP-002', name: 'Public Research Agent',        version: 'v1.3', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',   env: 'Production', date: '2026-03-18', by: 'devops@veritas.demo', status: 'Live'    },
        { id: 'DEP-003', name: 'Insurance Underwriting Agent', version: 'v2.0', model: 'anthropic.claude-3-opus-20240229-v1:0',       env: 'Production', date: '2026-03-24', by: 'admin@veritas.demo',  status: 'Live'    },
        { id: 'DEP-004', name: 'Shipment Insight Agent',       version: 'v1.1', model: 'amazon.nova-pro-v1:0',                        env: 'Staging',    date: '2026-03-23', by: 'devops@veritas.demo', status: 'Staging' },
        { id: 'DEP-005', name: 'Workforce Planning and Recruitment',     version: 'v1.2', model: 'anthropic.claude-sonnet-4-5',                 env: 'Production', date: '2026-04-22', by: 'admin@veritas.demo',  status: 'Live'    },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getTimeline = (_req, res) => {
  const bases = [0,0,0,1,0,0,0,0,1,0,0,0,0,1,0,0,1,0,0,0,0,2,0,0,1,0,0,3,1,0];
  const today = new Date();
  const data  = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 29 + i);
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, deployments: bases[i] ?? 0 };
  });
  res.json(data);
};

exports.getEnvironments = (_req, res) => res.json([
  { env: 'Production',  agents: ['Concierge Agent', 'Public Research Agent', 'Insurance Underwriting Agent', 'Shipment Insight Agent', 'Workforce Planning and Recruitment'], lastDeploy: 'today',      dotColor: '#10B981' },
  { env: 'Staging',     agents: [],                                                                                                                                                                                                   lastDeploy: '1 day ago',  dotColor: '#10B981' },
  { env: 'Development', agents: [],                                                                                                                                                                                                   lastDeploy: '—',          dotColor: '#94A3B8' },
]);

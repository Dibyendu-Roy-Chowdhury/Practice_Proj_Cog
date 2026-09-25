const DailyCostMetric = require('../models/DailyCostMetric');
const AgentCostMetric = require('../models/AgentCostMetric');
const Alert           = require('../models/Alert');
const Agent           = require('../models/Agent');

// Static data that has no MongoDB collection
const TOKEN_USAGE = {
  total_input_tokens: 2514000, total_output_tokens: 1238000,
  total_tokens: 3752000, period: 'last_30_days', total_cost_usd: 3232,
  by_agent: [
    { agent: 'Concierge Agent',              input: 680000, output: 320000, cost: 856 },
    { agent: 'Insurance Underwriting Agent', input: 490000, output: 246000, cost: 635 },
    { agent: 'Public Research Agent',        input: 544000, output: 272000, cost: 704 },
    { agent: 'Shipment Insight Agent',       input: 384000, output: 192000, cost: 498 },
    { agent: 'Workforce Planning and Recruitment',     input: 416000, output: 208000, cost: 539 },
  ],
};

const MODEL_BREAKDOWN = [
  { model: 'Claude Sonnet 4.5 (Bedrock)',  requests: 2800, tokens: 624000,  cost_usd: 539,  pct: 16.7 },
  { model: 'Claude 3.5 Haiku (Bedrock)',   requests: 5200, tokens: 1000000, cost_usd: 856,  pct: 26.5 },
  { model: 'Claude 3.5 Sonnet (Bedrock)',  requests: 3600, tokens: 816000,  cost_usd: 704,  pct: 21.8 },
  { model: 'Claude 3 Opus (Bedrock)',      requests: 2100, tokens: 736000,  cost_usd: 635,  pct: 19.6 },
  { model: 'Amazon Nova Pro',              requests: 1900, tokens: 576000,  cost_usd: 498,  pct: 15.4 },
];

exports.getTokenUsage = (_req, res) => res.json(TOKEN_USAGE);

const generateCostData30 = () => {
  const now = new Date();
  const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  let cost = 107.0, tokens = 1_100_000;
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (29 - i));
    const drift = (Math.random() - 0.44) * 0.08;
    cost   = Math.max(10,       cost   * (1 + drift));
    tokens = Math.max(400_000,  tokens * (1 + drift * 0.9));
    return { date: fmtDate(d), cost: parseFloat(cost.toFixed(2)), tokens: Math.round(tokens) };
  });
};

exports.getDailyCostMetrics = async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const query = agentId ? { agent_id: agentId } : {};
    const rows = await DailyCostMetric.find(query).sort({ date_iso: 1 }).lean();
    const data = rows.length
      ? rows.map(r => ({ date: r.date, cost: r.cost, tokens: r.tokens }))
      : generateCostData30();
    res.json({ status: 'success', agentId, data });
  } catch (err) { next(err); }
};

exports.getModelBreakdown = (_req, res) => res.json({ status: 'success', breakdown: MODEL_BREAKDOWN });

exports.getCommandCentreMetrics = async (_req, res, next) => {
  try {
    const [costs, criticalCount, warningCount, agents] = await Promise.all([
      AgentCostMetric.find().lean(),
      Alert.countDocuments({ severity: 'P1', resolved: false }),
      Alert.countDocuments({ severity: 'P2', resolved: false }),
      Agent.find().select('status').lean(),
    ]);
    const activeAgents = agents.filter(a => a.status === 'Active').length;
    res.json({
      status: 'success',
      agentCosts: costs.length ? costs : [
        { agent_id: 'agent-001', agent: 'Concierge Agent',              cost_today: 3.42, cost_7d: 21.80, cost_30d: 89.40 },
        { agent_id: 'agent-002', agent: 'Public Research Agent',        cost_today: 2.18, cost_7d: 14.20, cost_30d: 58.10 },
        { agent_id: 'agent-003', agent: 'Insurance Underwriting Agent', cost_today: 1.87, cost_7d: 12.60, cost_30d: 51.30 },
        { agent_id: 'agent-005', agent: 'Shipment Insight Agent',       cost_today: 1.64, cost_7d: 10.40, cost_30d: 43.20 },
        { agent_id: 'agent-009', agent: 'Palantir Log Analysis Agent',             cost_today: 0.94, cost_7d:  6.20, cost_30d: 25.80 },
      ],
      criticalCount: criticalCount || 5,
      warningCount:  warningCount  || 5,
      activeAgents: activeAgents || 8, totalAgents: agents.length || 9,
      costDelta: '+4.2',
      healthScore: 88,
      tokenEfficiency: 94,
    });
  } catch (err) { next(err); }
};

exports.getModelIntegrityMetrics = (_req, res) => res.json({
  healthScore: 94, healthTrend: +2.1,
  hallucinationRate: 0.8, hallucinationThreshold: 2.0,
  p99Latency: 1.2, p99LatencyBaseline: 1.4,
  safetyViolations: 0, safetyViolationsBaseline: 3,
});

exports.getDriftVelocity = (_req, res) => res.json([
  { date: '3/16', velocity: 0.8 }, { date: '3/17', velocity: 1.2 }, { date: '3/18', velocity: 0.6 },
  { date: '3/19', velocity: 2.1 }, { date: '3/20', velocity: 3.4 }, { date: '3/21', velocity: 2.8 },
  { date: '3/22', velocity: 1.9 }, { date: '3/23', velocity: 2.4 }, { date: '3/24', velocity: 1.5 },
  { date: '3/25', velocity: 1.1 },
]);

exports.getProviderSuccess = (_req, res) => res.json([
  { name: 'Claude Sonnet (Bedrock)', episodes: 38, successRate: 98.1 },
  { name: 'Claude Opus (Bedrock)',   episodes: 29, successRate: 97.6 },
  { name: 'Amazon Nova Pro',         episodes: 21, successRate: 94.7 },
  { name: 'Claude Haiku (Bedrock)',  episodes: 12, successRate: 96.2 },
]);

exports.getCapitalEfficiency = (_req, res) => res.json({
  mtdBurn: 3232.47, mtdBurnTrend: +13.5,
  avgCostPer1kTokens: 0.621, tokenCostTarget: 0.650,
  projectedMonthly: 4210.00, monthlyBudget: 5000.00,
  optimizationSavings: 385, savingsSource: 'Model routing to Haiku + prompt compression',
});

exports.getSpendByDept = (_req, res) => res.json([
  { dept: 'Customer Service',    spend: 312.40 },
  { dept: 'Finance & Analytics', spend: 248.80 },
  { dept: 'IT Operations',       spend: 167.20 },
  { dept: 'HR Automation',       spend: 89.60  },
  { dept: 'Legal & Compliance',  spend: 29.32  },
]);

exports.getTokenWaste = (_req, res) => res.json([
  { type: 'Prompt Tokens',      tokens: 4820000, pct: 68, color: '#000048' },
  { type: 'Completion Tokens',  tokens: 1698000, pct: 24, color: '#00B5E2' },
  { type: 'Wasted / Redundant', tokens:  567000, pct:  8, color: '#EF4444' },
]);

exports.getTrajectoryScore = (_req, res) => res.json({
  status: 'success',
  agentId: 'all',
  dimensions: [
    { dim: "Model Reliability", score: 86, desc: "Fleet composite reliability baseline." },
    { dim: "Cost Efficiency", score: 91, desc: "Token efficiency and waste reduction." },
    { dim: "Safety & Guardrails", score: 72, desc: "Guardrails enforcement and alert count." },
    { dim: "Latency SLA", score: 80, desc: "p95 latency within SLA bounds." },
    { dim: "Guardrail Coverage", score: 78, desc: "Interceptor coverage across active agents." }
  ]
});

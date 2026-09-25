const CircuitBreaker      = require('../models/CircuitBreaker');
const EpisodeCost         = require('../models/EpisodeCost');
const AnomalyDistribution = require('../models/AnomalyDistribution');
const { tagComplianceEvent } = require('../services/complianceTagger');

exports.getCircuitBreakers = async (req, res, next) => {
  try {
    const raw = await CircuitBreaker.find(req.tenantFilter).lean();
    if (raw.length) {
      // Tag any Triggered circuit breakers that have not yet been tagged
      raw.filter(cb => cb.status === 'Triggered').forEach(cb => {
        tagComplianceEvent({
          eventType: 'circuit_breaker.triggered', sourceModel: 'CircuitBreaker', sourceId: cb.cb_id,
          agentId: cb.agent_id, agentName: cb.agent, tenantId: req.tenantId,
          evidence: { cb_id: cb.cb_id, type: cb.type, threshold: cb.threshold, current: cb.current },
        });
      });
      res.json(raw.map(cb => ({ id: cb.cb_id, agent: cb.agent, model: cb.model, type: cb.type, threshold: cb.threshold, current: cb.current, status: cb.status })));
    } else {
      res.json([
        { id: 'CB-001', agent: 'Concierge Agent',              model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Cost',    threshold: 0.50, current: 0.21, status: 'Armed'     },
        { id: 'CB-002', agent: 'Shipment Insight Agent',       model: 'amazon.nova-pro-v1:0',                      type: 'Loop',    threshold: 3,    current: 3,    status: 'Triggered' },
        { id: 'CB-003', agent: 'Insurance Underwriting Agent', model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'Latency', threshold: 5000, current: 1200, status: 'Armed'     },
        { id: 'CB-004', agent: 'Public Research Agent',        model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Cost',    threshold: 0.25, current: 0.11, status: 'Disabled'  },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getEpisodeCosts = async (req, res, next) => {
  try {
    const raw = await EpisodeCost.find(req.tenantFilter).lean();
    if (raw.length) {
      res.json(raw.map(e => ({ id: e.episode_id, agent: e.agent, tokens: e.tokens, tools: e.tools, compute: e.compute, llm: e.llm, total: e.total, status: e.status })));
    } else {
      res.json([
        { id: 'EP-001', agent: 'Concierge Agent',              tokens: 12480, tools: 8,  compute: 0.024, llm: 0.187, total: 0.211, status: 'Completed'   },
        { id: 'EP-002', agent: 'Insurance Underwriting Agent', tokens: 3200,  tools: 2,  compute: 0.008, llm: 0.048, total: 0.056, status: 'Completed'   },
        { id: 'EP-003', agent: 'Insurance Underwriting Agent', tokens: 28900, tools: 15, compute: 0.041, llm: 0.434, total: 0.475, status: 'Auto-Killed' },
        { id: 'EP-004', agent: 'Public Research Agent',        tokens: 6700,  tools: 5,  compute: 0.012, llm: 0.101, total: 0.113, status: 'Completed'   },
        { id: 'EP-005', agent: 'Concierge Agent',              tokens: 9100,  tools: 6,  compute: 0.018, llm: 0.137, total: 0.155, status: 'In Progress' },
        { id: 'EP-006', agent: 'Shipment Insight Agent',       tokens: 1800,  tools: 1,  compute: 0.004, llm: 0.027, total: 0.031, status: 'Completed'   },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getToolCosts = (_req, res) => res.json([
  { tool: 'Code Execute',   cost: 0.213 }, { tool: 'Web Search',     cost: 0.156 },
  { tool: 'API Call',       cost: 0.098 }, { tool: 'Database Query', cost: 0.087 },
  { tool: 'Email Send',     cost: 0.034 }, { tool: 'File Read',      cost: 0.012 },
]);

exports.getCostTrend = (_req, res) => res.json([
  { date: '3/12', Heavy: 0.182, Light: 0.091, 'Tool Compute': 0.034 },
  { date: '3/13', Heavy: 0.205, Light: 0.108, 'Tool Compute': 0.041 },
  { date: '3/14', Heavy: 0.178, Light: 0.082, 'Tool Compute': 0.028 },
  { date: '3/15', Heavy: 0.231, Light: 0.119, 'Tool Compute': 0.047 },
  { date: '3/16', Heavy: 0.196, Light: 0.095, 'Tool Compute': 0.039 },
  { date: '3/17', Heavy: 0.143, Light: 0.071, 'Tool Compute': 0.022 },
  { date: '3/18', Heavy: 0.167, Light: 0.084, 'Tool Compute': 0.031 },
  { date: '3/19', Heavy: 0.224, Light: 0.112, 'Tool Compute': 0.053 },
  { date: '3/20', Heavy: 0.251, Light: 0.126, 'Tool Compute': 0.060 },
  { date: '3/21', Heavy: 0.198, Light: 0.099, 'Tool Compute': 0.042 },
  { date: '3/22', Heavy: 0.176, Light: 0.088, 'Tool Compute': 0.035 },
  { date: '3/23', Heavy: 0.219, Light: 0.110, 'Tool Compute': 0.049 },
  { date: '3/24', Heavy: 0.241, Light: 0.121, 'Tool Compute': 0.057 },
  { date: '3/25', Heavy: 0.188, Light: 0.094, 'Tool Compute': 0.038, HeavyForecast: 0.188, LightForecast: 0.094, 'Tool Compute Forecast': 0.038 },
  { date: '3/26', HeavyForecast: 0.203, LightForecast: 0.102, 'Tool Compute Forecast': 0.041 },
  { date: '3/27', HeavyForecast: 0.215, LightForecast: 0.108, 'Tool Compute Forecast': 0.043 },
  { date: '3/28', HeavyForecast: 0.224, LightForecast: 0.112, 'Tool Compute Forecast': 0.045 },
]);

exports.getAnomalyDistribution = async (_req, res, next) => {
  try {
    const raw = await AnomalyDistribution.find().sort({ day_order: 1 }).lean();
    if (raw.length) {
      res.json(raw.map(d => ({ day: d.day, 'Token Spike': d.token_spike, 'ReAct Loop': d.react_loop, 'Tool Abuse': d.tool_abuse, 'Prompt Injection': d.prompt_injection, 'Hallucination': d.hallucination, 'Memory Overflow': d.memory_overflow })));
    } else {
      res.json([
        { day: 'Mon', 'Token Spike': 4, 'ReAct Loop': 2, 'Tool Abuse': 3, 'Prompt Injection': 1, 'Hallucination': 2, 'Memory Overflow': 1 },
        { day: 'Tue', 'Token Spike': 6, 'ReAct Loop': 3, 'Tool Abuse': 2, 'Prompt Injection': 2, 'Hallucination': 3, 'Memory Overflow': 2 },
        { day: 'Wed', 'Token Spike': 5, 'ReAct Loop': 4, 'Tool Abuse': 5, 'Prompt Injection': 3, 'Hallucination': 1, 'Memory Overflow': 0 },
        { day: 'Thu', 'Token Spike': 8, 'ReAct Loop': 2, 'Tool Abuse': 3, 'Prompt Injection': 1, 'Hallucination': 4, 'Memory Overflow': 2 },
        { day: 'Fri', 'Token Spike': 7, 'ReAct Loop': 5, 'Tool Abuse': 4, 'Prompt Injection': 4, 'Hallucination': 2, 'Memory Overflow': 1 },
        { day: 'Sat', 'Token Spike': 3, 'ReAct Loop': 1, 'Tool Abuse': 2, 'Prompt Injection': 0, 'Hallucination': 1, 'Memory Overflow': 0 },
        { day: 'Sun', 'Token Spike': 5, 'ReAct Loop': 3, 'Tool Abuse': 3, 'Prompt Injection': 2, 'Hallucination': 3, 'Memory Overflow': 1 },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getModelRoutingRules = (_req, res) => res.json([
  { id: 'RR-001', agent: 'Concierge Agent',              taskType: 'Client Request Routing',   condition: 'token_est > 1000 OR complex_join',  model: 'Heavy', lastTriggered: '2 min ago'  },
  { id: 'RR-002', agent: 'Concierge Agent',              taskType: 'Parameter Extraction',     condition: 'token_est < 500 AND no_reasoning',  model: 'Light', lastTriggered: '8 min ago'  },
  { id: 'RR-003', agent: 'Insurance Underwriting Agent', taskType: 'Risk Scoring',             condition: 'steps > 5 OR symbolic_math',        model: 'Heavy', lastTriggered: '15 min ago' },
  { id: 'RR-004', agent: 'Public Research Agent',        taskType: 'Source Lookup',            condition: 'intent=lookup AND entities < 3',    model: 'Light', lastTriggered: '4 min ago'  },
  { id: 'RR-005', agent: 'Shipment Insight Agent',       taskType: 'All Tasks',                condition: 'default',                           model: 'Auto',  lastTriggered: '1 min ago'  },
]);

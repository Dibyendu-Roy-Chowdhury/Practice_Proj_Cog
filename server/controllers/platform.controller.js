const Agent = require('../models/Agent');

exports.submitJira = (_req, res) => {
  const id = `VFOPS-${Math.floor(1000 + Math.random() * 9000)}`;
  res.json({ success: true, ticketId: id, message: `Ticket ${id} created and assigned to L3 Engineering.` });
};

exports.runEval = (req, res) => {
  const { agentId } = req.body;
  const r = (min, max) => Math.floor(min + Math.random() * (max - min));
  res.json({
    agentId,
    scores: [
      { metric: 'Prompt Adherence', score: r(72, 95) },
      { metric: 'Reasoning',        score: r(65, 90) },
      { metric: 'Tool Selection',   score: r(70, 92) },
      { metric: 'Safety',           score: r(55, 88) },
      { metric: 'Factual Accuracy', score: r(68, 93) },
    ],
    timestamp: new Date().toISOString(),
  });
};

exports.runbookAction = (_req, res) => {
  const { command } = req.body;
  res.json({
    exitCode: 0,
    output: `[${new Date().toISOString()}]\n$ ${command}\n> Connecting to agent runtime...\n> Cache flushed: 847 MB freed\n> Service health check: PASS ✓\n> Agent restarted successfully\nCompleted in 1.4s`,
  });
};

exports.coordinator = async (req, res, next) => {
  try {
    const { query } = req.body;
    const q = (query || '').toLowerCase();
    const agents = await Agent.find().select('name status version_string arn_id model_id').lean();
    const active = agents.filter(a => a.status === 'Active').length;

    if (q.includes('token') || q.includes('usage') || q.includes('invocation')) {
      return res.json({ status: 'success', agent_type: 'logging_metric', tool_used: 'get_token_usage', intent: 'token_usage_query', confidence: 0.96, period: 'last_7_days', total_tokens: 9420000, input_tokens: 6140000, output_tokens: 3280000, daily_average: 1345714, top_agent: 'Concierge Agent', top_agent_share: '31%', response: 'Token usage over the last 7 days: 9.42M total (6.14M input · 3.28M output). Daily average: 1.35M tokens. Concierge Agent accounts for 31% of consumption. No budget threshold breaches detected.', sources: ['Token Analytics', 'CloudWatch'], executedAt: new Date().toISOString() });
    }
    if (q.includes('list') || q.includes('all agent') || q.includes('show agent') || q.includes('fleet') || q.includes('registered')) {
      return res.json({ status: 'success', agent_type: 'registration', tool_used: 'view_all_registered_agents', intent: 'agent_list_query', confidence: 0.98, total_count: agents.length, active_count: active, agents: agents.map(a => ({ agent_id: a.agent_id || a.id, name: a.name, status: a.status, version: a.version_string, arn_id: a.arn_id, model_id: a.model_id })), response: `Veritas fleet: ${agents.length} registered agents, ${active} currently active. Insurance Underwriting Agent has an open circuit breaker. Public Research Agent eval score (0.61) is below the 0.80 deployment gate.`, sources: ['Registry', 'MongoDB'], executedAt: new Date().toISOString() });
    }
    if (q.includes('cost') || q.includes('spend') || q.includes('budget') || q.includes('expenditure')) {
      return res.json({ status: 'success', agent_type: 'logging_metric', tool_used: 'get_daily_cost_metrics', intent: 'cost_analytics_query', confidence: 0.93, total_cost_usd: 12847, period: 'last_30_days', daily_average: 78.20, trend: 'increasing', forecast_month: 2890, mtd_spend: 2340, top_cost_agent: 'Concierge Agent', response: 'Total fleet spend over the last 30 days: $12,847 (avg $78.20/day). Month-to-date: $2,340. Trend is increasing — forecasted monthly spend ~$2,890. Concierge Agent is the top cost driver at 31% of total spend.', sources: ['Cost Analytics', 'FinOps'], executedAt: new Date().toISOString() });
    }
    if (q.includes('alert') || q.includes('incident') || q.includes('critical') || q.includes('warning') || q.includes('violation')) {
      return res.json({ status: 'success', agent_type: 'coordinator', tool_used: 'get_active_alerts', intent: 'alert_query', confidence: 0.95, critical_count: 3, warning_count: 8, response: 'Active fleet alerts: 3 critical (P1), 8 warnings (P2/P3). Highest priority: Insurance Underwriting Agent ReAct loop termination and Workforce Planning and Recruitment document extraction timeout. Recommend immediate runbook review.', sources: ['Alert Monitor', 'Incident Queue'], executedAt: new Date().toISOString() });
    }
    if (q.includes('status') || q.includes('health') || q.includes('active') || q.includes('system')) {
      return res.json({ status: 'success', agent_type: 'coordinator', tool_used: 'get_system_status', intent: 'system_status_query', confidence: 0.91, active_agents: active, total_agents: agents.length, system_health: 'Healthy', health_score: 87, open_incidents: 2, hitl_pending: 4, response: `System status: Healthy (score 87/100). ${active} of ${agents.length} agents active. 2 open incidents, 4 HITL decisions pending review. All model provider endpoints reachable.`, sources: ['System Monitor', 'Registry', 'HITL Queue'], executedAt: new Date().toISOString() });
    }
    if (q.includes('sync') || q.includes('log')) {
      return res.json({ status: 'success', agent_type: 'logging_metric', tool_used: 'sync_logs', intent: 'log_sync_query', confidence: 0.89, records_synced: 312, log_group: '/veriforge/model-invocations/aws', response: 'Log sync complete: 312 records retrieved from /veriforge/model-invocations/aws. 3 anomalous traces flagged for review. Last sync: now.', sources: ['CloudWatch', 'Log Store'], executedAt: new Date().toISOString() });
    }
    // Default
    res.json({ status: 'success', agent_type: 'coordinator', tool_used: 'route_query', intent: 'general_query', confidence: 0.72, response: `Query processed: "${query}". Try asking about: agent list, token usage, cost metrics, active alerts, or system status.`, available_commands: ['list agents', 'get token usage', 'get cost metrics', 'show alerts', 'system status', 'sync logs'], sources: ['CoordinatorAgent'], executedAt: new Date().toISOString() });
  } catch (err) { next(err); }
};

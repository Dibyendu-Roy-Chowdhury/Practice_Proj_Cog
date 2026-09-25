const PortalLog = require('../models/PortalLog');

module.exports = async function seedPortalLogs() {
  await PortalLog.deleteMany({});
  const now = Date.now();
  // Rebase to "now"
  const base = new Date('2026-03-25T11:03:00.000Z').getTime();
  const offset = now - base;
  const rebase = (ts) => new Date(new Date(ts).getTime() + offset);

  await PortalLog.insertMany([
    { log_id: 1,  level: 'INFO',    timestamp: rebase('2026-03-25 08:47:00'), action: 'User authentication',   message: 'User alex.chen@veritas.demo authenticated from 10.12.45.91 (MFA: TOTP)' },
    { log_id: 2,  level: 'INFO',    timestamp: rebase('2026-03-25 09:02:00'), action: 'User authentication',   message: 'User priya.sharma@veritas.demo authenticated from 192.168.1.100' },
    { log_id: 3,  level: 'INFO',    timestamp: rebase('2026-03-25 09:15:00'), action: 'Agent deployment',      message: 'Concierge Agent v2.1 deployed to production by admin@veritas.demo — model: anthropic.claude-3-5-haiku-20241022-v1:0' },
    { log_id: 4,  level: 'INFO',    timestamp: rebase('2026-03-25 09:30:00'), action: 'Log sync completed',    message: 'Synced 312 records from /veriforge/model-invocations/aws (Concierge Agent)' },
    { log_id: 5,  level: 'WARNING', timestamp: rebase('2026-03-25 10:12:00'), action: 'API rate limit',        message: 'Rate limit at 88% for client Veritas Solutions — 72 requests in last 60s (limit: 100/min)' },
    { log_id: 6,  level: 'INFO',    timestamp: rebase('2026-03-25 10:18:00'), action: 'API request',           message: 'POST /api/agents/agent-001/invoke responded 200 in 1,847ms (user: alex.chen@veritas.demo)' },
    { log_id: 7,  level: 'INFO',    timestamp: rebase('2026-03-25 10:45:00'), action: 'Configuration update',  message: 'Token budget updated: Concierge Agent daily limit → 500,000 (was 400,000) by admin@veritas.demo' },
    { log_id: 8,  level: 'ERROR',   timestamp: rebase('2026-03-25 11:03:00'), action: 'Agent failure',         message: 'Insurance Underwriting Agent invocation failed — HTTP 503 from Claude Opus endpoint (retry 3/3)' },
    { log_id: 9,  level: 'INFO',    timestamp: rebase('2026-03-25 11:22:00'), action: 'Auto-remediation',      message: 'Self-healing rule sh-003 triggered: Public Research Agent switched to claude-3-haiku-fallback after 7 rate limit errors' },
    { log_id: 10, level: 'INFO',    timestamp: rebase('2026-03-25 11:45:00'), action: 'Audit export',          message: 'Audit trace export completed: 1,284 records exported for agent-003 by admin@veritas.demo' },
    { log_id: 11, level: 'WARNING', timestamp: rebase('2026-03-25 12:15:00'), action: 'Memory pressure',       message: 'Insurance Underwriting Agent heap at 78% on vf-undr-prod-2 — self-healing watchdog monitoring' },
    { log_id: 12, level: 'INFO',    timestamp: rebase('2026-03-25 12:30:00'), action: 'HITL decision',         message: 'HITL request AUTH-001 approved by admin@veritas.demo — Workforce Planning and Recruitment compliance report submission authorised' },
    { log_id: 13, level: 'INFO',    timestamp: rebase('2026-03-25 13:00:00'), action: 'Log sync completed',    message: 'Synced 487 records from /veriforge/model-invocations/aws (Public Research Agent, Insurance Underwriting Agent)' },
    { log_id: 14, level: 'ERROR',   timestamp: rebase('2026-03-25 13:44:00'), action: 'Circuit breaker',       message: 'Circuit breaker CB-002 triggered: Shipment Insight Agent ReAct loop count reached threshold 3' },
    { log_id: 15, level: 'INFO',    timestamp: rebase('2026-03-25 14:20:00'), action: 'Agent deployment',      message: 'Public Research Agent v1.3 deployed to Production by admin@veritas.demo — model: anthropic.claude-3-5-sonnet-20241022-v2:0' },
  ]);
};

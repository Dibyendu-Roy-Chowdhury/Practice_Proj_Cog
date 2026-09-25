const AgentEvaluation = require('../models/AgentEvaluation');
const AgentTestSuite  = require('../models/AgentTestSuite');
const { buildEvalMetrics } = require('../services/evaluationScorer');

// ─── Evaluations ─────────────────────────────────────────────────────────────

exports.listEvals = async (req, res, next) => {
  try {
    const { agentId, status, limit = 50 } = req.query;
    const query = { ...req.tenantFilter };
    if (agentId && agentId !== 'all') query.agent_id = agentId;
    if (status) query.status = status;
    const evals = await AgentEvaluation.find(query)
      .sort({ started_at: -1 })
      .limit(Math.min(parseInt(limit, 10) || 50, 200))
      .lean();
    res.json({ status: 'success', evals });
  } catch (err) { next(err); }
};

exports.getEval = async (req, res, next) => {
  try {
    const ev = await AgentEvaluation.findOne({ ...req.tenantFilter, eval_id: req.params.evalId }).lean();
    if (!ev) return res.status(404).json({ error: 'Evaluation not found' });
    res.json({ status: 'success', eval: ev });
  } catch (err) { next(err); }
};

exports.listEvalsByAgent = async (req, res, next) => {
  try {
    const evals = await AgentEvaluation.find({ ...req.tenantFilter, agent_id: req.params.agentId })
      .sort({ started_at: -1 })
      .limit(100)
      .lean();
    res.json({ status: 'success', evals });
  } catch (err) { next(err); }
};

exports.getSummary = async (req, res, next) => {
  try {
    const completed = await AgentEvaluation.find({ ...req.tenantFilter, status: 'completed' }).lean();
    const byAgent = {};
    for (const ev of completed) {
      if (!byAgent[ev.agent_id]) {
        byAgent[ev.agent_id] = { agent_id: ev.agent_id, count: 0, composite: 0, hallucination: 0, factual_accuracy: 0, toxicity: 0, latency_ms: 0 };
      }
      const b = byAgent[ev.agent_id];
      b.count++;
      b.composite        += ev.metrics?.composite_score        || 0;
      b.hallucination    += ev.metrics?.hallucination_score    || 0;
      b.factual_accuracy += ev.metrics?.factual_accuracy       || 0;
      b.toxicity         += ev.metrics?.toxicity_score         || 0;
      b.latency_ms       += ev.metrics?.latency_ms             || 0;
    }
    const summary = Object.values(byAgent).map(b => ({
      agent_id:       b.agent_id,
      eval_count:     b.count,
      avg_composite:  parseFloat((b.composite        / b.count).toFixed(4)),
      avg_hallucination: parseFloat((b.hallucination / b.count).toFixed(4)),
      avg_factual_accuracy: parseFloat((b.factual_accuracy / b.count).toFixed(4)),
      avg_toxicity:   parseFloat((b.toxicity          / b.count).toFixed(4)),
      avg_latency_ms: parseFloat((b.latency_ms        / b.count).toFixed(1)),
    }));
    res.json({ status: 'success', summary });
  } catch (err) { next(err); }
};

exports.triggerEval = async (req, res, next) => {
  try {
    const ALLOWED = ['agent_id', 'suite_id', 'episode_id', 'eval_type', 'model_id',
                     'hallucination_score', 'toxicity_score', 'guardrail_bypass_attempts',
                     'latency_ms', 'token_cost_usd', 'test_results', 'notes'];
    const body = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!body.agent_id) return res.status(400).json({ error: 'agent_id is required' });

    const count   = await AgentEvaluation.countDocuments();
    const eval_id = `eval-${String(count + 1).padStart(4, '0')}`;
    const tenantId = req.tenantId || 'demo';
    const username = req.user?.username || 'system';
    const now = new Date();

    const { metrics, test_results } = buildEvalMetrics({
      testResults:               body.test_results || [],
      hallucination_score:       body.hallucination_score       || 0,
      toxicity_score:            body.toxicity_score            || 0,
      guardrail_bypass_attempts: body.guardrail_bypass_attempts || 0,
      latency_ms:                body.latency_ms                || 0,
      token_cost_usd:            body.token_cost_usd            || 0,
    });

    const doc = new AgentEvaluation({
      eval_id,
      agent_id:     body.agent_id,
      episode_id:   body.episode_id  || undefined,
      suite_id:     body.suite_id    || undefined,
      eval_type:    body.eval_type   || 'manual',
      model_id:     body.model_id    || undefined,
      status:       'completed',
      metrics,
      test_results,
      triggered_by: username,
      started_at:   now,
      completed_at: now,
      notes:        body.notes || '',
      tenant_id:    tenantId,
    });
    await doc.save();
    res.status(201).json({ status: 'success', eval_id, composite_score: metrics.composite_score });
  } catch (err) { next(err); }
};

// ─── Test Suites ─────────────────────────────────────────────────────────────

exports.listSuites = async (req, res, next) => {
  try {
    const { agentId } = req.query;
    const query = { ...req.tenantFilter };
    if (agentId && agentId !== 'all') query.agent_id = agentId;
    const suites = await AgentTestSuite.find(query).sort({ created_at: -1 }).lean();
    res.json({ status: 'success', suites });
  } catch (err) { next(err); }
};

exports.getSuite = async (req, res, next) => {
  try {
    const suite = await AgentTestSuite.findOne({ ...req.tenantFilter, suite_id: req.params.suiteId }).lean();
    if (!suite) return res.status(404).json({ error: 'Test suite not found' });
    res.json({ status: 'success', suite });
  } catch (err) { next(err); }
};

exports.createSuite = async (req, res, next) => {
  try {
    const ALLOWED = ['name', 'description', 'agent_id', 'cases'];
    const body = Object.fromEntries(Object.entries(req.body).filter(([k]) => ALLOWED.includes(k)));
    if (!body.name)     return res.status(400).json({ error: 'name is required' });
    if (!body.agent_id) return res.status(400).json({ error: 'agent_id is required' });

    const count    = await AgentTestSuite.countDocuments();
    const suite_id = `suite-${String(count + 1).padStart(3, '0')}`;
    const suite = new AgentTestSuite({
      ...body,
      suite_id,
      created_by: req.user?.username || 'system',
      tenant_id:  req.tenantId || 'demo',
    });
    await suite.save();
    res.status(201).json({ status: 'success', suite_id });
  } catch (err) { next(err); }
};

const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

exports.getCausalTrace = (_req, res) => res.json({
  dagNodes: [
    { id: 'orchestrator', label: 'Orchestrator', model: 'Claude Opus (Bedrock)'   },
    { id: 'researcher',   label: 'Researcher',   model: 'Claude Sonnet (Bedrock)' },
    { id: 'writer',       label: 'Writer',        model: 'Claude Haiku (Bedrock)' },
    { id: 'validator',    label: 'Validator',     model: 'Amazon Nova Pro'         },
  ],
  dagEdges: [
    { event: 'research_request', tokens: '~320 tokens', latency: '1.2s' },
    { event: 'draft_content',    tokens: '~580 tokens', latency: '2.1s' },
    { event: 'validate_output',  tokens: '~210 tokens', latency: '0.8s' },
  ],
  diffEvents: [
    { ts: '14:32:07', agent: 'Orchestrator', before: [{ key: 'status', val: '"idle"', changed: false },{ key: 'task', val: 'null', changed: false },{ key: 'context', val: '[]', changed: false }], after: [{ key: 'status', val: '"running"', changed: true, added: false },{ key: 'task', val: '"research_brief"', changed: true, added: false },{ key: 'context', val: '["ep-001-ctx"]', changed: true, added: false }], fullBefore: '{\n  "status": "idle",\n  "task": null,\n  "context": []\n}', fullAfter: '{\n  "status": "running",\n  "task": "research_brief",\n  "context": ["ep-001-ctx"]\n}' },
    { ts: '14:32:19', agent: 'Researcher', before: [{ key: 'sources', val: '[]', changed: false },{ key: 'tokens', val: '0', changed: false },{ key: 'status', val: '"idle"', changed: false }], after: [{ key: 'sources', val: '["web", "db"]', changed: false },{ key: 'tokens', val: '320', changed: true, added: false },{ key: 'status', val: '"complete"', changed: true, added: false }], fullBefore: '{\n  "sources": [],\n  "tokens": 0,\n  "status": "idle"\n}', fullAfter: '{\n  "sources": ["web", "db"],\n  "tokens": 320,\n  "status": "complete"\n}' },
    { ts: '14:32:41', agent: 'Validator', before: [{ key: 'score', val: 'null', changed: false },{ key: 'passed', val: 'false', changed: false },{ key: 'errors', val: '[]', changed: false }], after: [{ key: 'score', val: '91', changed: true, added: false },{ key: 'passed', val: 'true', changed: true, added: false },{ key: 'feedback', val: '"looks good"', changed: false, added: true }], fullBefore: '{\n  "score": null,\n  "passed": false,\n  "errors": []\n}', fullAfter: '{\n  "score": 91,\n  "passed": true,\n  "errors": [],\n  "feedback": "looks good"\n}' },
  ],
});

exports.getSemanticDrift = (_req, res) => {
  const baselineDate = fmtDate(new Date(Date.now() - 53 * 24 * 60 * 60 * 1000));
  const currentDate  = fmtDate(new Date());
  res.json({
    agentId: 'agent-003', agentName: 'Insurance Underwriting Agent',
    driftScore: 0.74, status: 'HIGH',
    baselineDate, currentDate,
    dimensions: [
      { label: 'Topic Distribution',   baseline: 92, current: 61 },
      { label: 'Embedding Similarity', baseline: 97, current: 71 },
      { label: 'Prompt Complexity',    baseline: 45, current: 78 },
      { label: 'Response Length Δ',    baseline: 61, current: 83 },
    ],
    recommendation: 'Realign baseline embeddings with current traffic patterns via context calibration.',
  });
};

exports.calibrate = (_req, res) => res.json({ success: true, newDriftScore: 0.18, message: 'Drift reduced 0.74 → 0.18. Baseline recalibrated.' });

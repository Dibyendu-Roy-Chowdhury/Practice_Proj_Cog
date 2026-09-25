const OP_OUTPUTS = {
  health:  ['→ Resolving agent endpoint...','→ HTTP GET /health → 200 OK  (31ms)','→ Process: PID 18442 — Running','→ Memory: 1.24 GB / 2.0 GB (62%)  — Nominal','→ CPU: 19%  (5-min rolling avg)','→ Queue depth: 3 pending  — within SLA','→ Last response p95: 1.21s','✓ Health check PASSED'],
  restart: ['→ Sending SIGTERM to agent process...','→ Draining in-flight requests (grace 30s)...','→ Agent process exited cleanly  (code 0)','→ Scheduling replacement pod...','→ New pod: vf-agent-7d9f2c  — Pending → Running','→ Liveness probe: PASS  (attempt 1)','→ Readiness probe: PASS','✓ Agent restarted — new pod healthy'],
  flush:   ['→ Connecting to agent cache endpoint...','→ Acquiring cache write lock...','→ Flushing L1 prompt cache:  412 MB freed','→ Flushing L2 embedding cache:  287 MB freed','→ Flushing session context store:  148 MB freed','→ Total reclaimed: 847 MB','→ Cache lock released — agent resumed','✓ Cache flush complete'],
  scale:   ['→ Fetching current replica count...','→ Current: 2 replicas  →  Target: 4 replicas','→ Scaling deployment vf-agents in namespace: agents','→ Pod vf-agent-prod-3: Pending → Running  (14s)','→ Pod vf-agent-prod-4: Pending → Running  (18s)','→ HPA updated: min 2 / max 6 / current 4','→ Load balancer updated — traffic redistributed','✓ Scale-out complete — 4/4 replicas ready'],
  rotate:  ['→ Initiating credential rotation...','→ Generating new API key (256-bit entropy)...','→ Provisioning key with provider IAM...','→ New key fingerprint: sha256:ab7f...c3e1','→ Updating secret in Vault / K8s secret store...','→ Old key revoked — effective immediately','→ Agent restarted with new credentials','✓ Key rotation complete'],
  isolate: ['→ Sending isolation signal to agent supervisor...','→ PATCH /api/agents/{id}/status  →  {"status":"Inactive"}','→ In-flight requests cancelled (3 terminated)','→ Tool call queue flushed','→ Agent network egress blocked at gateway','→ Status update logged to audit trail','✓ Agent isolated — all traffic halted'],
  export:  ['→ Opening audit log export stream...','→ Fetching invocation records  (window: 2h)...','→ Records found: 1,284 events','→ Filtering sensitive fields: PII masked','→ Writing JSONL to /exports/forensics-20260326.jsonl','→ SHA-256: a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6','→ Export manifest created','✓ Forensic export complete — 1,284 records'],
  apply:   ['→ Preparing configuration patch...','→ PATCH /api/agents/{id}/governance','→   cost_threshold: $0.50 → $0.20','→   loop_kill_count: 5 → 2','→   hitl_on_high_risk: true','→ Config validated — no schema errors','→ Agent reloading with new policy...','✓ Configuration applied — effective immediately'],
  validate:['→ Initialising smoke test suite...','→ Test 1/5: Agent invocation  → PASS  (1.2s)','→ Test 2/5: Tool call routing  → PASS  (0.8s)','→ Test 3/5: Audit log write  → PASS  (0.3s)','→ Test 4/5: Cost attribution  → PASS  (0.5s)','→ Test 5/5: HITL queue write  → PASS  (0.4s)','→ All 5/5 smoke tests passed','✓ Platform validation complete'],
  baseline:['→ Querying metrics API (window: 15m, granularity: 1m)...','→ p50 latency:  1.08s','→ p95 latency:  3.41s  ⚠ above 3.0s SLA threshold','→ p99 latency:  6.72s','→ Requests/min: 142','→ Error rate:   1.8%','→ Affected agents: Concierge Agent, Insurance Underwriting Agent','✓ Baseline captured — proceeding to step 2'],
  default: ['→ Executing operation...','→ Connecting to platform runtime...','→ Operation dispatched to agent supervisor','→ Awaiting confirmation signal...','→ Signal received — operation acknowledged','✓ Step completed successfully'],
};

const pickOutput = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('health') || t.includes('diagnos') || t.includes('verify') || t.includes('check')) return OP_OUTPUTS.health;
  if (t.includes('restart') || t.includes('shutdown') || t.includes('reboot'))                       return OP_OUTPUTS.restart;
  if (t.includes('flush') || t.includes('cache') || t.includes('purge'))                             return OP_OUTPUTS.flush;
  if (t.includes('scale') || t.includes('replicas'))                                                  return OP_OUTPUTS.scale;
  if (t.includes('rotate') || t.includes('revoke') || t.includes('credential') || t.includes('key')) return OP_OUTPUTS.rotate;
  if (t.includes('isolat') || t.includes('suspend') || t.includes('halt'))                           return OP_OUTPUTS.isolate;
  if (t.includes('export') || t.includes('forensic') || t.includes('capture') || t.includes('snapshot')) return OP_OUTPUTS.export;
  if (t.includes('apply') || t.includes('patch') || t.includes('config') || t.includes('tighten'))   return OP_OUTPUTS.apply;
  if (t.includes('validat') || t.includes('smoke') || t.includes('confirm') || t.includes('stable')) return OP_OUTPUTS.validate;
  if (t.includes('baseline') || t.includes('metric') || t.includes('measure') || t.includes('analys')) return OP_OUTPUTS.baseline;
  return OP_OUTPUTS.default;
};

exports.executeOpTask = async (req, res) => {
  const latency = 1000 + Math.random() * 2000;
  await new Promise(r => setTimeout(r, Math.min(latency, 200))); // Don't actually wait full latency in API
  const { taskKey, title } = req.body;
  res.json({ taskKey, status: 'success', timestamp: new Date().toISOString(), duration: Math.round(latency), lines: pickOutput(title || taskKey) });
};

exports.fleetReboot = async (req, res) => {
  const { environment, agents } = req.body;
  res.json({ environment, restarted: agents, healthy: agents, failed: [], timestamp: new Date().toISOString() });
};

exports.cachePurge = async (req, res) => {
  const { providers } = req.body;
  res.json({ providers, bytesPurged: Math.floor(500 + Math.random() * 2000), timestamp: new Date().toISOString() });
};

exports.rotateKey = async (req, res) => {
  const { keyId } = req.body;
  res.json({ keyId, newFingerprint: `sha256:${Math.random().toString(36).slice(2,10)}...${Math.random().toString(36).slice(2,6)}`, rotatedAt: new Date().toISOString() });
};

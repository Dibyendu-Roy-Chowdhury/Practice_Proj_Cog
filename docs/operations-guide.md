# VeriForge Ops — Operations Guide

## 1. Executable Runbooks

### 1.1 Runbook Library

All runbooks are stored in the `RUNBOOKS_MOCK` map in `src/services/API_services.js` and served by `getRunbook(id)`. The `Runbooks` page component (`pages/Runbooks.jsx`) fetches and renders them.

| Runbook ID | Title | Severity | Personas |
|------------|-------|----------|----------|
| `agent-restart` | Agent Restart | P2 | L1, L2 |
| `cost-overrun` | Cost Overrun | P2 | L2, Platform Eng |
| `hitl-escalation` | Human Escalation | P2 | L1, L2, L3 |
| `perf-degradation` | Latency Degradation | P1 | L2, L3, Platform Eng |
| `memory-leak` | Memory Pressure | P1 | L2, L3, Platform Eng |
| `security-breach` | Security Incident | P1 | L3, Platform Eng |
| `zeroops-recovery` | Platform Recovery | P1 | L3, Platform Eng |
| `rag-retrieval-degradation` | RAG Retrieval Degradation | P2 | L2, L3, Platform Eng |
| `fine-tuning-failure-recovery` | Fine-Tuning Job Failure Recovery | P2 | L3, Platform Eng |
| `model-drift-response` | Model Drift Response | P1 | L2, L3, Platform Eng |
| `multi-agent-workflow-failure` | Multi-Agent Workflow Failure | P1 | L2, L3, Platform Eng |

#### Runbook Trigger Conditions

| Runbook ID | Triggers |
|------------|---------|
| `agent-restart` | Agent pod unresponsive >2 min; health check failure rate >50% over 5 min; ReAct iteration limit exceeded; OOM kill detected |
| `cost-overrun` | MTD spend >15% over budget; single agent token spend >2x weekly avg; unexpected Opus usage spike; daily rate projects >120% of monthly budget |
| `hitl-escalation` | Agent confidence below threshold on high-risk action; HITL queue depth >10 for >15 min; >3 consecutive rejections from same agent; regulatory action flagged |
| `perf-degradation` | p95 latency >3x baseline for >5 consecutive min; time-to-first-token >4s on Sonnet; SLA breach >10% of requests; provider API latency spike confirmed |
| `memory-leak` | Agent heap usage >85% for >10 min; memory growth >50MB/hour; OOM kill signal; GC pause >500ms |
| `security-breach` | Prompt injection detected; anomalous data exfiltration pattern; credential rotation alert; agent accessing out-of-scope resources |
| `zeroops-recovery` | Control plane unreachable >5 min; multiple agents reporting simultaneous failures; orchestration layer unresponsive; DB connection pool exhausted |
| `rag-retrieval-degradation` | Retrieval precision <0.65 for >15 min; vector index staleness >6 hours; embedding service error rate >5%; grounding failures spike >20% above baseline |
| `fine-tuning-failure-recovery` | Job exits with non-zero status; training loss diverges; OOM during fine-tuning; dataset validation fails at job start |
| `model-drift-response` | Eval gate score <0.75; semantic drift score >85/100; embedding distance >25% above calibrated baseline; RLHF reward degrades >0.15 in 24h |
| `multi-agent-workflow-failure` | Workflow chain breaks at any handoff; context window overflow during agent-to-agent context passing; completion rate <90%; consensus threshold not reached after 3 rounds |

### 1.2 Adding a Step / Creating a Runbook

To add a new runbook:

1. Add an entry to `RUNBOOKS_MOCK` in `src/services/API_services.js` using the schema:
   ```js
   'my-runbook-id': {
     title: 'My Runbook',
     severity: 'P2',                    // 'P1' | 'P2' | 'P3'
     personas: ['L2'],                  // array of role labels
     triggers: ['Trigger condition...'],
     steps: [
       { title: 'Step 1 title', desc: 'Step 1 description.' }
     ],
     escalation: ['Escalation condition...'],
   }
   ```
2. Add the runbook ID to the Runbook Library table above in this file.
3. The runbook will be automatically available in Workbench > Runbooks.

---

## 2. Self-Healing Rules

### 2.1 Shipping Rules

Self-healing rules are served by `getSelfHealingRules()` from `GET /api/healing/rules`. The mock fallback returns `SELF_HEALING_RULES_MOCK` — a pre-seeded set of 7 rules covering common recovery scenarios. Rules are created and managed in **Workbench > Incident Recovery > Self-Healing Policies**.

The `getInterventionLog()` function returns the history of automated interventions from `GET /api/healing/interventions`.

### 2.2 Intervention Log

Interventions are logged via `GET /api/healing/interventions`. Each intervention record includes the rule that fired, the agent targeted, the action taken, and the outcome.

### 2.3 Adding a New Rule

New self-healing rules are created through the `SelfHealing` component UI in **Workbench > Incident Recovery > Self-Healing Policies**. The component POSTs to the backend API. When the backend is unavailable, the component operates in display-only mode.

---

## 3. Circuit Breaker Management

Circuit breakers are displayed in:

1. **Registry > Agent Registry** — the `circuit_breaker` column on each agent row shows `Closed` / `Half-Open` / `Open` state.

Circuit breaker states in the Veritas mock fleet:

| Agent | Circuit Breaker State |
|-------|-----------------------|
| Concierge Agent | Closed |
| Public Research Agent | Open |
| Insurance Underwriting Agent | Closed |
| Shipment Insight Agent | Closed |
| Workforce Planning and Recruitment | Closed |

To tighten a circuit breaker threshold during a latency incident, follow the `perf-degradation` runbook step 3: reduce circuit breaker timeout from 5s to 2s to fail-fast and trigger fallback routing.

---

## 4. Model Routing Overrides

The `ModelRouting` component has been removed from the UI. Mesh-level routing rules (inter-agent) are managed exclusively via the `getMeshRoutingRules()` and `updateMeshRoutingRule({ id, enabled })` API functions.

Available routing policies in the agent registry:
- `latency-first`
- `cost-first`
- `round-robin`
- `quality-first`
- `Adaptive`
- `Weighted`
- `Least Latency`

To activate a model routing override during a provider outage, follow the `perf-degradation` runbook step 4 and call `getMeshRoutingRules()` directly.

---

## 5. Fleet Operations

> **Note:** The Fleet Operations UI (Fleet Reboot, Cache Purge, API Key Rotation) has been removed from the Admin Settings page. The API functions (`executeFleetReboot`, `executeProviderCachePurge`, `rotateApiKey`) remain available in `API_services.js` but have no UI surface.

Fleet operations were previously available in **Admin > Access & API Keys** as inline components in `pages/OperatorWorkbench.jsx`. They called backend APIs directly (no mock fallback — the real backend must be running for these operations).

### Fleet Reboot (`FleetRebootCard`)

Gracefully restarts all agent instances in a target environment. In-flight requests are drained before shutdown.

API: `executeFleetReboot({ environment: string, agents: string[] })`

Target environments and agents:
- **Production:** Concierge Agent, Public Research Agent, Insurance Underwriting Agent, Shipment Insight Agent, Workforce Planning and Recruitment
- **Dev:** (none)

Return: `{ restarted: string[], healthy: string[], failed: string[] }`

All reboot operations are logged to the session operation log via `logOp({ action: 'Fleet Reboot', target: '<env> (<n> agents)' })`.

### Cache Purge (`CachePurgeCard`)

Clears the prompt-completion cache for selected model providers. Use after context calibration or to force fresh inference.

API: `executeProviderCachePurge({ providers: string[] })`

Available providers: `aws-bedrock`, `azure-openai`, `gcp-vertex`, `openai`

Return: `{ bytesPurged: number, providers: string[] }`

### Key Rotation (`KeyRotationCard`)

Rotates API credentials for a provider in-place without restarting agents. The new key material is hot-swapped at the next invocation.

API: `rotateApiKey({ keyId: string, provider: string })`

Return: `{ newFingerprint: string }`

Pre-configured keys in the mock fleet:

| Provider | Key ID | Status |
|----------|--------|--------|
| AWS Bedrock | `AKIA****PDPV` | Healthy (expires 13 days) |
| Azure OpenAI | `azk-****-4f2a` | Healthy (expires 48 days) |
| GCP Vertex AI | `SA-****@cog.iam` | Expiring Soon (expires 5 days) |
| OpenAI | `sk-****-abc3` | Healthy (expires 82 days) |
| Jira API | `jira-****-9f1e` | Expired |

---

## 6. Escalation Workflow

The escalation path in the Veritas fleet:

```
L1 Analyst
  └─ Can: approve/reject HITL decisions within authority threshold
  └─ Escalates to L2: if HITL requires higher authority or queue depth > 10

L2 Operator
  └─ Can: run most runbooks, override model routing, initiate agent restart
  └─ Escalates to L3: for compliance/regulatory HITL, security incidents, persistent failures

L3 Engineer / Platform Eng
  └─ Can: all operations including security incident response, fine-tuning, infrastructure recovery
  └─ Escalates externally: vendor SLA for provider outages, legal/compliance for data exfiltration
```

HITL decisions are logged in the HITL history with the approving principal and tier:
- `Auto (L1)` — automated approval within L1 authority
- `Sarah K. (L2)`, `Mark T. (L3)`, `Rachel C. (L3)` — human approvals in the Veritas mock dataset

---

## 7. Incident Management

### Alert Rules

Alerts are generated from two sources in `API_services.js`:

**Critical (`getCriticalAlerts`)** — categories that create P1 or P2 incidents:
- Loop Detection
- Latency Spike
- Memory Overflow
- Orchestration Failure
- Eval Gate Failure
- Model Training Failure

**Warning (`getWarningAlerts`)** — categories that generate P2/P3 warnings:
- Token Spike
- Latency Spike
- Quality Regression
- Hallucination
- Embedding Drift
- RAG Retrieval Failure
- Context Window Overflow
- Feedback Sentiment Spike
- Memory Overflow

Anomaly threshold: score >= `75` (`FLEET_CONSTANTS.ANOMALY_THRESHOLD`) auto-creates an incident.

### Incident Lifecycle Statuses

Incidents are managed in **Workbench > Incident Recovery > Self-Healing Policies** via the `SelfHealing` component. The `IncidentManager` component has been removed.

Typical lifecycle:
```
Open → Investigating → Mitigating → Resolved → Post-Mortem
```

---

## Cross-References

- API functions (`getSelfHealingRules`, `getInterventionLog`, `getRunbook`, etc.): `docs/technical-specs.md`
- Trust interceptors and security incidents: `docs/security-compliance.md`
- Module navigation (Workbench tabs, Admin tabs): `docs/architecture.md`

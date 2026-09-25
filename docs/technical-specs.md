# VeriForge Ops — Technical Specifications

## 1. Service Layer Architecture

All API communication is centralised in `src/services/API_services.js`. There is no React Query, Redux, or other state management layer — each component fetches directly from the service file using `useEffect`.

**`BASE_URL`** resolves to `process.env.REACT_APP_API_URL` or `<protocol>//<hostname>:4000`.

**`apiFetch(path, options)`** — attaches `Authorization: Bearer <token>` from `sessionStorage.getItem('access_token')`. Throws on network error or non-2xx response.

**`apiFetchSafe(path, options)`** — wraps `apiFetch`; returns `null` instead of throwing. Use this when a component null-guards and shows an empty state.

**`isNetworkError(e)`** — returns `true` for `TypeError` or messages containing `'Failed to fetch'` / `'NetworkError'`.

**`isApiUnavailable(e)`** — returns `true` for network failures AND HTTP 4xx/5xx. Used by MLOps functions that have no backend yet.

---

## 2. Function Catalogue

### Category: Auth

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `login(username, password)` | `username: string`, `password: string` | `{ access_token, username, role }` |
| `validateToken(token)` | `token: string` | `{ valid: boolean }` |
| `logout(token)` | `token: string` | `{ message: string }` |

### Category: Agent Registry

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getAgents()` | — | `{ status, agents: Agent[] }` |
| `registerAgent(agentData)` | `agentData: AgentInput` | `{ status, message, id }` |
| `updateAgent(agentId, agentData)` | `agentId: string`, `agentData: Partial<AgentInput>` | `{ status, message }` |
| `updateAgentStatus(agentId, status)` | `agentId: string`, `status: 'Active' \| 'Inactive'` | `{ status, message }` |
| `rollbackAgentVersion(agentId, targetVersion)` | `agentId: string`, `targetVersion: string` | `{ status, message }` |
| `getAgentVersionHistory(agentId)` | `agentId: string` | `{ version_history: VersionEntry[] }` |

### Category: Log Sync / Diagnostics

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `syncModelLogs({ logGroup, hoursBack, maxLogs, crossAccountCredentials })` | object | `{ status, message, synced: number }` |
| `syncBedrockLogs` | alias for `syncModelLogs` | same |
| `syncAgentSpecificLogs(agentName)` | `agentName: string` | `{ status, message, synced: number }` |

### Category: Metrics — Token Usage

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getTokenUsage()` | — | `{ status, summary: TokenSummary, by_agent: AgentTokenRow[] }` |
| `getCommandCentreMetrics()` | — | `{ status, agentCosts, criticalCount, warningCount, activeAgents, totalAgents, costDelta, healthScore, tokenEfficiency }` |
| `getDailyCostMetrics(agentId?)` | `agentId?: string` | `{ status, agentId, data: CostRow[] }` |
| `getModelBreakdown(agentId?)` | `agentId?: string` | `{ status, agentId, models: ModelCostRow[] }` |

### Category: Alerts

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getCriticalAlerts(agentId?)` | `agentId?: string` | `{ status, alerts: Alert[] }` |
| `getWarningAlerts(agentId?)` | `agentId?: string` | `{ status, alerts: Alert[] }` |

### Category: Query Interface

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `callAgentOpsAgent(query)` | `query: string` | `{ status, agent_type, tool_used, intent, confidence, response, available_commands, sources, executedAt }` |

### Category: Admin — User Management

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getUsers()` | — | `{ status, users: User[] }` |

### Category: XOps — Predictive Intelligence

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getXOpsStatus()` | — | XOps status object or `null` |
| `getAnomalyFeed()` | — | `AnomalyEvent[]` |
| `getPrecursorAlerts()` | — | precursor alert data or `null` |
| `getRemediationQueue()` | — | remediation queue or `null` |

### Category: HITL Console

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getHitlQueue()` | — | `HitlItem[]` |
| `getHitlHistory()` | — | `HitlHistoryItem[]` |

### Category: Cost Governance

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getEpisodeCosts()` | — | episode cost data or `null` |
| `getCircuitBreakers()` | — | circuit breaker data or `null` |
| `getToolCostData()` | — | tool cost data or `null` |
| `getCostTrendData()` | — | cost trend data or `null` |
| `getAnomalyDistribution()` | — | `AnomalyDistRow[]` (7 days x anomaly type) |

### Category: Governed CI/CD

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getCICDPipelineData()` | — | pipeline data or `null` |

### Category: Self-Healing

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getSelfHealingRules()` | — | self-healing rules or `null` |
| `getInterventionLog()` | — | intervention log or `null` |

### Category: Trust & Security

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getTrustInterceptors()` | — | `TrustInterceptor[]` |
| `updateInterceptorActive(id, active)` | `id: string`, `active: boolean` | `{ id: string, active: boolean } \| null` |
| `getHallucinationTrend()` | — | hallucination trend data or `null` |

### Category: Agent Mesh

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getMeshTopology()` | — | mesh topology or `null` |
| `getInterAgentMessages()` | — | `InterAgentMessage[]` |
| `getLoopDetections()` | — | `LoopDetection[]` |
| `getMeshSemanticConsistency()` | — | `SemanticConsistencyChain[]` |
| `getMeshQuarantineList()` | — | quarantine list or `null` |
| `quarantineAgent({ agent_id, agent_name, reason })` | object | `{ status, message }` |
| `liftQuarantine({ agent_id })` | object | `{ status, message }` |
| `getMeshRoutingRules()` | — | routing rules or `null` |
| `updateMeshRoutingRule({ id, enabled })` | object | `{ status, message }` |

### Category: Routing Rules (Model Governance)

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getRoutingRules()` | — | model routing rules or `null` |

### Category: Deployments

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getDeployments()` | — | deployment list or `null` |
| `getDeploymentTimeline()` | — | deployment timeline or `null` |
| `getEnvironmentSummary()` | — | environment summary or `null` |

### Category: Runbooks

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getRunbook(id)` | `id: string` | `Runbook \| null` |

### Category: Causal Tracing / Semantic Drift

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getCausalTrace(episodeId?)` | `episodeId?: string` | causal trace or `null` |
| `getSemanticDriftData()` | — | semantic drift data or `null` |
| `applyContextCalibration()` | — | `{ newDriftScore, message }` (throws on failure — not safe-wrapped) |

### Category: Command Centre — Model Integrity

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getModelIntegrityMetrics()` | — | `{ healthScore, healthTrend, hallucinationRate, hallucinationThreshold, p99Latency, p99LatencyBaseline, safetyViolations, safetyViolationsBaseline }` or `null` |
| `getDriftVelocity()` | — | `{ date, velocity }[]` or `null` |
| `getProviderSuccessDistribution()` | — | `{ name, episodes, successRate }[]` or `null` |

### Category: Command Centre — Capital Efficiency

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getCapitalEfficiencyMetrics()` | — | `{ mtdBurn, mtdBurnTrend, avgCostPer1kTokens, tokenCostTarget, projectedMonthly, monthlyBudget, optimizationSavings, savingsSource }` or `null` |
| `getSpendByDepartment()` | — | `{ dept, spend }[]` or `null` |
| `getTokenWasteBreakdown()` | — | `{ type, tokens, pct, color }[]` or `null` |

### Category: Platform Actions

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `executeRunbookAction({ command })` | `{ command: string }` | action result |
| `submitJiraTicket(context)` | `context: object` | Jira ticket result |

### Category: Ops Execution

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `executeOpTask(taskKey, params?)` | `taskKey: string`, `params?: object` | `{ lines: string[] }` |
| `executeFleetReboot({ environment, agents })` | `{ environment: string, agents: string[] }` | `{ restarted: string[], healthy: string[], failed: string[] }` |
| `executeProviderCachePurge({ providers })` | `{ providers: string[] }` | `{ bytesPurged: number, providers: string[] }` |
| `rotateApiKey({ keyId, provider })` | `{ keyId: string, provider: string }` | `{ newFingerprint: string }` |

### Category: Portal Logs / Audit Traces

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getPortalLogs()` | — | `Log[]` |
| `getAuditTraces()` | — | rebased `AuditTraces` object keyed by agent name |

### Category: Embedding Analytics

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getEmbeddingDrift()` | — | `{ status, data: EmbeddingDriftRow[] }` |
| `getClusterCoherence()` | — | `{ status, data: { agent, score, trend }[] }` |
| `getEmbeddingDimContribution(agentId?)` | `agentId?: string` (default: `'Concierge Agent'`) | `{ status, agent, data: DimContribution[] }` |
| `getNNAnomalies()` | — | `{ status, data: NNAnomaly[] }` |
| `getCrossAgentOverlap()` | — | `{ status, data: OverlapRow[] }` |

### Category: Token & Context Window Analytics

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getContextWindowUtilization()` | — | `{ status, data: { agent, windowSize, avgUtil, p95Util, model }[] }` |
| `getTokenBreakdown(agentId?)` | `agentId?: string` (default: `'Concierge Agent'`) | `{ status, agent, data: TokenBreakdownHour[] }` |
| `getContextOverflowEvents()` | — | `{ status, data: ContextOverflowEvent[] }` |
| `getTokenEfficiencyScores()` | — | `{ status, data: { agent, score, outputQuality, costPerToken, ctxEfficiency }[] }` |

### Category: Tool Usage Analytics

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getToolCallMatrix()` | — | `{ status, tools: string[], data: ToolMatrixRow[] }` |
| `getToolSuccessRates()` | — | `{ status, data: { tool, success, retry, timeout, error, agent }[] }` |
| `getToolLatencyDistribution()` | — | `{ status, data: { tool, p50, p75, p90, p95 }[] }` |
| `getToolChainPatterns()` | — | `{ status, data: { agent, chain, freq, avgLatency }[] }` |
| `getUnusedTools()` | — | `{ status, data: { agent, tool, lastUsed, registered }[] }` |

### Category: Guardrail Analytics

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getInterceptorFireRate()` | — | `{ status, data: InterceptorFireRateRow[] }` (30 days) |
| `getGuardrailFalsePositives()` | — | `{ status, data: { interceptor, total, fp, fpRate, trend }[] }` |
| `getInterceptorLatency()` | — | `{ status, data: { interceptor, agent, latencyMs }[] }` |
| `getTopBlockedPatterns()` | — | `{ status, data: { category, interceptor, count7d, agentsAffected, lastSeen }[] }` |
| `getGuardrailCoverageMap()` | — | `{ status, data: { agent, pii, injection, credential, semantic, toxicity, allowlist }[] }` |

### Category: Model Registry

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getModelRegistry()` | — | `{ status, data: ModelRegistryEntry[] }` |

### Category: RAG Pipelines

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getRAGPipelines()` | — | `{ status, data: RAGPipeline[] }` |
| `getRAGRetrievalFailures()` | — | `{ status, data: RAGRetrievalFailure[] }` |
| `getRAGIndexHealth()` | — | `{ status, data: RAGIndexHealth[] }` |

### Category: Agent Memory

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getAgentMemoryStatus()` | — | `{ status, data: AgentMemoryStatus[] }` |
| `getMemoryConflicts()` | — | `{ status, data: MemoryConflict[] }` |

### Category: Experiments

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getExperiments()` | — | `{ status, data: Experiment[] }` |

### Category: Fine-Tuning Ops

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getFineTuneJobs()` | — | `{ status, data: FineTuneJob[] }` |
| `getFineTuneDatasets()` | — | `{ status, data: FineTuneDataset[] }` |

### Category: Model Cost Comparison

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getModelCostComparison()` | — | `{ status, data: ModelCostQualityRow[] }` |
| `getModelSubstitutionRecs()` | — | `{ status, data: SubstitutionRec[] }` |

### Category: Eval Suite Manager

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getEvalSuites()` | — | `{ status, data: EvalSuite[] }` |

### Category: Feedback & RLHF

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getFeedbackStream()` | — | `{ status, data: FeedbackEntry[] }` |
| `getPreferencePairs()` | — | `{ status, data: PreferencePair[] }` |
| `getFeedbackKPIs()` | — | `{ status, data: { total30d, positiveRate, negativeRate, avgRating, coverage } }` |

### Category: Orchestration Monitor

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getOrchestrationWorkflows()` | — | `{ status, templates, delegations }` |
| `getHandoffFailures()` | — | `{ status, data: HandoffFailure[] }` |
| `getOrchestrationKPIs()` | — | `{ status, data: { workflows24h, avgDuration, successRate, avgAgentsPerWf, handoffFailRate } }` |

### Category: MLOps Health Summary

| Function | Parameters | Return Shape |
|----------|------------|-------------|
| `getMLOpsHealthSummary()` | — | MLOps health summary object or `null` |

---

## 3. Data Schemas

### Agent

```json
{
  "id": "agent-001",
  "agent_id": "agent-001",
  "name": "Concierge Agent",
  "desc": "Customer-facing concierge agent for client queries, account management, and service routing across the Veritas platform.",
  "model_id": "anthropic.claude-3-5-haiku-20241022-v1:0",
  "version_string": "v3.2",
  "change_type": "minor",
  "status": "Active",
  "cloud_provider": "AWS",
  "cloud_region": "us-east-1",
  "environment": "production",
  "routing_policy": "Round Robin",
  "circuit_breaker": "Closed"
}
```

### Alert

```json
{
  "id": "CA-001",
  "agentId": "agent-003",
  "msg": "Insurance Underwriting Agent — ReAct loop terminated after 5 iterations (rule: sh-001)",
  "time": "2h ago",
  "severity": "P1",
  "category": "Loop Detection"
}
```

### HITL Queue Item

```json
{
  "id": "HITL-4821",
  "risk": "Critical",
  "agent": "Insurance Underwriting Agent",
  "tool": "execute_underwriting_decision",
  "waitMs": 48000,
  "reasoning": "Agent proposes approving a high-risk underwriting policy for client VRT-0042 based on inferred risk profile. Confidence: 0.87. No explicit approval instruction was provided."
}
```

### Trust Interceptor

```json
{
  "id": "prompt_injection",
  "name": "Prompt Injection Guard",
  "active": true,
  "desc": "Detects and blocks adversarial prompt injection attempts before they reach the model.",
  "events": 47
}
```

### Runbook

```json
{
  "title": "Agent Restart",
  "severity": "P2",
  "personas": ["L1", "L2"],
  "triggers": ["Agent pod unresponsive for > 2 minutes"],
  "steps": [
    { "title": "Diagnose current agent state", "desc": "Pull recent logs and last health check result." }
  ],
  "escalation": ["If agent fails to restart after 3 attempts — escalate to L2"]
}
```

### Veritas Agent Fleet Reference

The complete 5-agent mock roster with model IDs, versions, cloud providers, regions, and environments is in `README.md` § Agent Fleet. The mock data constant is `AGENTS_MOCK` in `API_services.js`.

**Veritas Fleet (AWS Bedrock):**
| ID | Name | Model |
|----|------|-------|
| agent-001 | Concierge Agent | `anthropic.claude-3-5-haiku-20241022-v1:0` |
| agent-002 | Public Research Agent | `anthropic.claude-3-5-sonnet-20241022-v2:0` |
| agent-003 | Insurance Underwriting Agent | `anthropic.claude-3-opus-20240229-v1:0` |
| agent-005 | Shipment Insight Agent | `amazon.nova-pro-v1:0` |
| agent-009 | Workforce Planning and Recruitment | `anthropic.claude-sonnet-4-5` |

---

## 4. State Management

VeriForge Ops uses React's built-in `useState` and `useEffect` exclusively — no Redux, Zustand, or React Query.

- **Global navigation state** lives in `AppShell` (`selectedKey`, `navParams`).
- **Global context** is provided by `TriageModeContext` (mounted at the top of `App.js`), `EnvironmentContext`, and `TenantContext` (all use `useState` internally).
- **Per-component data** is fetched on mount with `useEffect` → service function → `useState` setter.
- **Session operation log** is written to a module-level array in `src/utils/opHistory.js` via `logOp({ action, target })` and read by `OpHistoryBar` via the `vfo:op` custom DOM event.

There is no shared cache. If two components need the same data, they each fetch independently.

---

## Cross-References

- Architecture and navigation: `docs/architecture.md`
- Developer setup and component reference: `docs/developer-guide.md`
- Runbook and self-healing schemas: `docs/operations-guide.md`
- Security interceptors: `docs/security-compliance.md`

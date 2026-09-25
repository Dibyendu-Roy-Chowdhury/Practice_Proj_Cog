# VeriForge Ops — Security & Compliance Reference

## 1. Trust & Security Interceptors

Trust interceptors are served by `getTrustInterceptors()` from `GET /api/trust/interceptors`. The mock fallback is `TRUST_INTERCEPTORS_MOCK` in `API_services.js`. Interceptors are displayed in **Insights > Safety & Monitoring > Active Safety Measures** via the `TrustSecurity` component.

| ID | Name | Active | Description | Events (mock) |
|----|------|--------|-------------|---------------|
| `prompt_injection` | Prompt Injection Guard | true | Detects and blocks adversarial prompt injection attempts before they reach the model. | 47 |
| `pii_redaction` | PII Redaction | true | Automatically redacts PII (names, emails, card numbers) from inputs and model outputs. | 312 |
| `credential_guard` | Credential Guard | true | Prevents API keys, secrets, and credentials from leaking through agent tool calls. | 8 |
| `output_filtering` | Output Filtering | true | Screens generated responses against policy rules before delivering to downstream systems. | 94 |
| `rag_grounding_guard` | RAG Grounding Guard | true | Validates that retrieved context chunks are factually grounded before prompt injection. | 56 |
| `compliance_screen` | Compliance Screen | true | Enforces MiFID II, GDPR, and AML content policies on every agent response. | 23 |

All 6 interceptors are active by default in the Veritas fleet.

The interceptor enable/disable Switch in `TrustSecurity` persists changes to the backend via `PATCH /api/trust/interceptors/:id` with `{ active: boolean }`. The backend controller (`trust.controller.js`) performs a `findOneAndUpdate` on the `TrustInterceptor` MongoDB model. Toggle state is **Live** — not local-only.

### Guardrail Coverage by Agent

From `getGuardrailCoverageMap()`:

| Agent | PII | Injection | Credential | Semantic | Toxicity | Allowlist |
|-------|-----|-----------|------------|----------|----------|-----------|
| Concierge Agent | yes | yes | yes | yes | yes | yes |
| Public Research Agent | yes | yes | yes | yes | yes | yes |
| Insurance Underwriting Agent | no | yes | yes | no | no | yes |
| Shipment Insight Agent | yes | yes | no | yes | yes | no |
| Workforce Planning and Recruitment | yes | yes | yes | yes | yes | yes |

### False Positive Rates

From `getGuardrailFalsePositives()`:

| Interceptor | Total Events | False Positives | FP Rate | Trend |
|-------------|-------------|-----------------|---------|-------|
| PII Redaction | 4,821 | 48 | 1.0% | -0.2% |
| Prompt Injection Shield | 412 | 31 | 7.5% | +1.1% |
| Semantic Consistency | 284 | 42 | 14.8% | +2.3% |
| Output Toxicity Filter | 138 | 6 | 4.3% | -0.5% |
| Credential Guard | 89 | 2 | 2.2% | 0.0% |
| Allowlist Enforcement | 2,341 | 14 | 0.6% | -0.1% |

---

## 2. Hallucination Control Blocks

Hallucination monitoring is provided by:

- `getHallucinationTrend()` — returns trend data from `GET /api/trust/hallucination-trend`.

Hallucination monitoring is surfaced in **Insights > Safety & Monitoring** via the `TrustSecurity` component only. The `ModelIntegrityWidget` and `Core > Agent Quality` tab have been removed.

The Shipment Insight Agent has a known hallucination score of `0.34`, above the acceptable threshold of `0.20` (from `WARNING_ALERTS_MOCK`).

---

## 3. Human-in-the-Loop Authorization

HITL decisions are managed in **Workbench > Manual Overrides > HITL Console** via the `HitlConsole` component. The queue is served by `getHitlQueue()`.

### Risk Tiers

| Risk Level | Examples | Authority |
|------------|---------|-----------|
| Critical | Execute trade order, send regulatory report | L3 sign-off required |
| High | Modify client profile, launch fine-tune job | L2 or L3 |
| Medium | Escalate compliance flag, archive contract | L1 or L2 |
| Low | Routine notifications, read-only queries | Auto (L1) |

### Current HITL Queue (Veritas Mock)

| ID | Risk | Agent | Tool | Wait Time |
|----|------|-------|------|-----------|
| HITL-4822 | Critical | Workforce Planning and Recruitment | `submit_compliance_report` | 12s |
| HITL-4821 | Critical | Insurance Underwriting Agent | `execute_underwriting_decision` | 48s |
| HITL-4820 | High | Public Research Agent | `publish_research_report` | 2m 4s |
| HITL-4819 | High | Concierge Agent | `modify_client_profile` | 3m 30s |

### SLA Windows

- **Critical:** Immediate escalation to L3.
- **High:** Review within 5 minutes.
- **Medium:** Review within 15 minutes.
- **Low:** Auto-approved or reviewed within 1 hour.

Queues >10 pending decisions for >15 minutes trigger the `hitl-escalation` runbook.

**State persistence:** Dismissed HITL items persist to `localStorage('vf_hitl_dismissed')`. Committed risk thresholds persist to `localStorage('vf_hitl_thresholds')`.

---

## 4. Audit Trail

The audit trail is served by `getAuditTraces()`. It attempts `GET /api/audit/traces`; if the backend is unavailable or returns an empty result, it falls back to `MOCK_AUDIT_TRACES` defined in `API_services.js`. All timestamps in the mock data are anchored to the current time so traces are always recent.

Each trace contains:
- `agent` — the agent that generated the trace
- `started_at` / `ended_at` — ISO timestamps (rebased to now)
- `thought_steps` — array of `{ timestamp, content }` reasoning steps (also rebased)

Portal logs are available from `getPortalLogs()` (`GET /api/logs`).

The compliance audit trail is displayed in **Workbench > Troubleshooting > Compliance & Audit Trail** via the `Logs` component.

---

## 5. Organization Policies

The Veritas fleet enforces the following regulatory policies via the `Compliance Screen` interceptor:

- **MiFID II** — investment advice and trade documentation requirements.
- **GDPR** — data subject privacy and right to erasure.
- **AML (Anti-Money Laundering)** — transaction monitoring and suspicious activity reporting.

Compliance policies are enforced at the fleet level through the 6 trust interceptors. The **Workforce Planning and Recruitment** serves as the primary compliance authoring and documentation agent. All 5 agents participate in compliance enforcement through the active interceptors.

Governance limits per agent (from `GovernanceTab`):
- Budget cap (monthly): $2,500 — hard limit, kills agent on breach
- Token limit (daily): 500,000 — soft limit, alerts at 80%
- Max retries: 3 per request
- Timeout: 30 seconds

---

## 6. Blast Radius Containment

Blast radius is limited by three mechanisms:

### Circuit Breakers

Each agent has a circuit breaker state (`Closed` / `Half-Open` / `Open`). The Public Research Agent's circuit breaker is currently `Open` in the mock fleet, meaning all inbound routing to the Public Research Agent is suspended.

### Agent Quarantine

`quarantineAgent({ agent_id, agent_name, reason })` immediately suspends an agent from processing new requests. The quarantine list is managed via the mesh API:
- List: `getMeshQuarantineList()`
- Lift: `liftQuarantine({ agent_id })`

### Scope Restriction

Tool bindings restrict each agent to a defined set of tools. The `Credential Guard` interceptor prevents credentials from leaking through tool calls. The `Output Filtering` interceptor screens all outputs before they reach downstream systems.

For security incidents, follow the `security-breach` runbook, which requires:
1. Immediate agent isolation (suspend from new requests)
2. Forensic trace export
3. Scope and blast radius assessment
4. Credential rotation for all keys the agent had access to
5. L3 sign-off before re-enabling

---

## 7. Access Control Summary

### Application-Level RBAC

VeriForge Ops uses a two-role model. Sessions use `sessionStorage` for `access_token` and `role`; `username` is stored in `localStorage`:

| Role | `userRole` | Capabilities |
|------|-----------|-------------|
| `admin` | `'admin'` | Full access — all modules, all write operations, fine-tuning jobs, admin configuration |
| `viewer` | `'user'` | Read access — write-destructive operations (`FineTuningOps` launch, etc.) are gated |

Role is set on login via `sessionStorage.setItem('role', role)` and read by `App.js` on mount. `userRole` is forwarded from `App` → `AppShell` → pages → components.

The profile dropdown renders:
- `'Administrator'` when `userRole === 'admin'`
- `'Viewer'` for all other values

### Component-Level Role Gating

`userRole` is passed as a prop to:
- `AgentInsights` (key `'1'`)
- `AgentOpsWorkbench` (key `'2'`) — gates write-destructive actions
- `OperatorWorkbench` (key `'4'`)
- `Failsafe` / Registry (key `'7'`) — gates write actions

### Demo Credentials

| Username | Password | Role | Display Name |
|----------|----------|------|-------------|
| `admin` | `admin123` | admin | admin |
| `senthil` | `dsxops` | admin | Senthil |
| `user` | `user123` | user | user |
| `viewer` | `viewer123` | user | viewer |

---

## Cross-References

- API functions (`getTrustInterceptors`, `getHitlQueue`, `getAuditTraces`, etc.): `docs/technical-specs.md`
- HITL runbook: `docs/operations-guide.md` § 1.1 Runbook Library (`hitl-escalation`)
- Security breach runbook: `docs/operations-guide.md` § 1.1 Runbook Library (`security-breach`)
- Navigation to Safety & Monitoring tab: `docs/architecture.md` § Tab Map — Insights

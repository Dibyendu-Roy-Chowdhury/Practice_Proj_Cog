# VeriForge Ops — Business Requirements Document

**Version:** 1.0  
**Date:** June 2026  
**Author:** Cognizant AI & Data Business Unit  
**Classification:** Internal — Confidential  
**Document Status:** Approved — Alpha Release

---

## 1. Executive Summary

Enterprises are deploying autonomous AI agents at scale across production environments — yet lack the operational tooling to manage them reliably. Failures are invisible until they cascade. Cost overruns go undetected until month-end. Security violations occur without audit trail. Compliance requirements cannot be demonstrated.

**VeriForge Ops** addresses this gap as an enterprise-grade **Agentic Operations Platform (AgentOps)** that provides a single operational surface for fleet-wide observability, cost governance, safety guardrails, and lifecycle management of AI agent fleets — enabling the shift from *"Experimental AI"* to *"Industrial AI"*.

---

## 2. Business Context

### 2.1 Problem Statement

| Problem Domain | Current State (Without VeriForge Ops) | Business Impact |
|----------------|---------------------------------------|-----------------|
| **Fleet Visibility** | No unified view of agent health, performance, or failures across providers | Incidents undetected until business impact; MTTR measured in hours/days |
| **Cost Governance** | Token costs distributed across cloud bills; no per-agent attribution | Budget overruns, no ability to optimize or forecast |
| **Safety & Compliance** | No systematic guardrailing; PII leakage, prompt injection, hallucinations unmonitored | Regulatory exposure (GDPR, MiFID II), reputational risk |
| **Operational Response** | No runbooks, no self-healing, no HITL workflow | Manual, ad-hoc incident response; high-risk agent actions executed without review |
| **Agent Lifecycle** | Agents deployed without version tracking, rollback capability, or model governance | Inability to audit changes; no recovery path from bad deployments |
| **Multi-Agent Complexity** | No visibility into inter-agent dependencies, loops, or cascade failures | Silent failures in agentic pipelines |

### 2.2 Business Drivers

1. **Enterprise AI Adoption:** Organisations are moving from single-agent pilots to multi-agent production fleets; the management gap is now critical.
2. **Regulatory Pressure:** Financial services (MiFID II, AML), healthcare (HIPAA), and general data privacy (GDPR) require auditability of AI decision-making.
3. **Cost Accountability:** Cloud AI inference costs are unpredictable; executives require per-agent, per-model cost attribution.
4. **Risk Management:** Autonomous agents executing high-stakes actions (financial, medical, legal) require human oversight at defined risk thresholds.
5. **Operational Maturity:** AI operations must mature to match enterprise IT operations standards (ITIL-aligned runbooks, SLA-tracked incidents, change management).

### 2.3 Target Market & Personas

| Industry Vertical | Key Use Cases | Representative Agents |
|-------------------|--------------|----------------------|
| **Financial Services (BFSI)** | Insurance underwriting, compliance screening, research | Underwriting Agent, Compliance Agent |
| **Insurance** | Policy evaluation, claims processing, risk scoring | Policy Agent, Claims Agent |
| **Logistics / Supply Chain** | Shipment tracking, ETA prediction, delay flagging | Shipment Insight Agent |
| **Healthcare** | Protocol authoring, clinical research, documentation | Workforce Planning and Recruitment |
| **Retail** | Customer service, inventory, demand forecasting | Concierge Agent |

---

## 3. Stakeholders

### 3.1 Primary Stakeholders

| Role | Stakeholder | Business Interest |
|------|-------------|------------------|
| **Executive Sponsor** | CIO / CTO | Fleet health score, risk posture, ROI of AI investments |
| **Platform Owner** | Head of AI Engineering | Platform capability, deployment reliability, model governance |
| **Operations Lead** | Director of AI Ops | Incident management, SLA compliance, runbook efficacy |
| **Security Lead** | CISO / Security Architect | Guardrail coverage, audit trail completeness, regulatory compliance |
| **Finance Lead** | FinOps Manager | Cost attribution, budget adherence, optimization ROI |

### 3.2 Secondary Stakeholders

| Role | Stakeholder | Business Interest |
|------|-------------|------------------|
| **Platform Engineer** | DevOps / MLOps Engineer | Agent registry, CI/CD pipeline, deployment workflows |
| **Operations Engineer** | AI Ops Analyst | Monitoring, troubleshooting, runbook execution |
| **Security Analyst** | Trust & Safety Engineer | Interceptor tuning, false positive reduction |
| **FinOps Analyst** | Cloud Cost Analyst | Spend breakdown, optimization recommendations |

---

## 4. Business Requirements

### 4.1 BR-1: Fleet Observability

**Requirement:** The platform must provide real-time, unified visibility into the health and performance of all AI agents in the fleet from a single interface.

**Business Justification:** Operations teams currently lack a consolidated view, leading to delayed incident detection and increased MTTR.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-1.1 | Display a composite Fleet Health Score for the entire agent fleet | Must Have | Score updates on data refresh; reflects TSR, cost efficiency, behavioral compliance, availability |
| BR-1.2 | Show per-agent performance metrics (task success rate, latency p99, hallucination rate, anomaly score) | Must Have | Metrics visible per agent; industry-benchmark indicators shown |
| BR-1.3 | Provide a real-time alert feed for critical and warning events | Must Have | Alerts appear within the polling interval; critical alerts visually distinguished |
| BR-1.4 | Display fleet-wide event telemetry with filtering by agent, severity, and time range | Should Have | Events filterable; timestamps accurate |
| BR-1.5 | Show KPI dashboard: active agents, tasks completed, MTD spend, hallucination rate, task success rate | Must Have | All 6 primary KPIs visible on landing screen |
| BR-1.6 | Surface anomaly scores with automatic incident creation when threshold exceeded | Must Have | Anomaly score ≥75 auto-creates incident; threshold configurable |

### 4.2 BR-2: Cost Governance (FinOps)

**Requirement:** The platform must provide granular attribution of AI inference costs and support optimization decision-making.

**Business Justification:** Cloud AI costs are a growing P&L line item. Without attribution, there is no accountability or optimization lever.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-2.1 | Display 30-day MTD token spend attributed by agent, model, and token type (input/output) | Must Have | Per-agent breakdown visible; total reconciles with fleet total |
| BR-2.2 | Show daily cost trend over rolling 30-day window | Must Have | Line chart with daily data points; incident markers on spike days |
| BR-2.3 | Provide per-episode (per-invocation) cost attribution | Should Have | Episode cost visible in agent detail view |
| BR-2.4 | Surface token waste patterns and cost optimization recommendations | Must Have | At least 3 actionable recommendations per fleet |
| BR-2.5 | Support multi-model cost comparison to inform routing decisions | Should Have | Side-by-side cost comparison across models for same agent |
| BR-2.6 | Support per-agent and fleet-level budget threshold alerts | Should Have | Alert triggered when agent exceeds configured spend threshold |
| BR-2.7 | Track tool-level cost attribution within agents | Nice to Have | Cost breakdown by agent capability/tool type |

### 4.3 BR-3: Safety & Guardrails

**Requirement:** The platform must enforce, monitor, and report on AI safety controls to protect against prompt injection, PII leakage, hallucination, and policy violations.

**Business Justification:** Regulatory obligations (GDPR, MiFID II, AML) and reputational risk require demonstrable, auditable AI safety controls.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-3.1 | Enforce and monitor at least 6 trust interceptor categories | Must Have | Prompt Injection Guard, PII Redaction, Credential Guard, Output Filtering, RAG Grounding, Compliance Screen all operational |
| BR-3.2 | Display event counts per interceptor with trend analysis | Must Have | Count + trend visible per interceptor; false positive rate tracked |
| BR-3.3 | Monitor hallucination rates per agent with configurable threshold alerts | Must Have | Threshold default 0.20; breach creates visible alert |
| BR-3.4 | Show per-agent guardrail coverage matrix | Should Have | Matrix shows which interceptors are active per agent |
| BR-3.5 | Redact PII in all platform log displays | Must Have | Emails, API keys, card numbers, phone numbers masked in UI |
| BR-3.6 | Provide compliance screening for MiFID II, GDPR, and AML | Must Have | Compliance Screen interceptor active; violation count tracked |
| BR-3.7 | Track RAG grounding quality per agent | Should Have | Grounding score / groundedness validation count visible |

### 4.4 BR-4: Operational Response (Workbench)

**Requirement:** The platform must provide structured operational tooling for incident investigation, remediation, and recovery.

**Business Justification:** Ad-hoc incident response is slow and error-prone. Structured runbooks and self-healing reduce MTTR and operator toil.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-4.1 | Provide an agent-scoped investigation desk with log context and signal correlation | Must Have | Operator can select agent and view correlated logs, alerts, and signals in one view |
| BR-4.2 | Maintain a runbook library with escalation paths (L1 → L2 → L3) | Must Have | Runbooks browsable by type; escalation path documented |
| BR-4.3 | Support one-click Jira escalation from incident view | Should Have | Jira ticket created with incident context pre-populated |
| BR-4.4 | Provide a Human-in-the-Loop (HITL) queue for risk-gated agent actions | Must Have | Queue shows pending requests with risk tier, SLA countdown, action context |
| BR-4.5 | Enforce SLA timers per HITL risk tier: Critical (immediate), High (5 min), Medium (15 min), Low (1 hr) | Must Have | SLA timer visible; overdue requests highlighted |
| BR-4.6 | Support configurable self-healing rules for known failure modes | Should Have | Rules can be enabled/disabled; intervention history logged |
| BR-4.7 | Provide an incident recovery view with status management | Must Have | Incident lifecycle (open → investigating → resolved) trackable |

### 4.5 BR-5: Agent Lifecycle Management (Registry)

**Requirement:** The platform must provide full lifecycle management for AI agents including registration, versioning, deployment tracking, and rollback.

**Business Justification:** Unmanaged agent deployments create unauditable changes and make recovery from bad deployments impossible.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-5.1 | Maintain an agent registry with status tracking (Active/Staging/Draining/Inactive) | Must Have | All registered agents visible; status changes logged |
| BR-5.2 | Store complete version history per agent with configuration snapshots | Must Have | Prior versions browsable; diff between versions visible |
| BR-5.3 | Support one-click rollback to any prior agent version | Must Have | Rollback completes with audit log entry; confirmaton required |
| BR-5.4 | Track deployment timeline per agent including environment and deployer | Must Have | Deployment history visible; environment (prod/staging/dev) labeled |
| BR-5.5 | Maintain a model registry across all supported cloud providers and foundation models | Must Have | 40+ models catalogued across AWS Bedrock, Azure OpenAI, Vertex AI, OpenAI, Meta, Mistral |
| BR-5.6 | Support model routing rules to govern model selection per agent | Should Have | Rules configurable; routing policy visible per agent |

### 4.6 BR-6: Signals, Drift & Predictive Intelligence

**Requirement:** The platform must detect quality degradation and behavioral drift before it becomes a customer-facing incident.

**Business Justification:** Early signal detection shortens MTTR and prevents escalation of quality issues to production outages.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-6.1 | Detect and surface anomaly scores with automated threshold-based alerting | Must Have | Score visible per agent; alert created ≥75 threshold |
| BR-6.2 | Detect semantic drift (>20% shift from baseline embedding) | Should Have | Drift percentage visible; alert on breach |
| BR-6.3 | Enforce eval gate: flag agents with quality score below 0.80 | Must Have | Gate threshold configurable; breaching agents highlighted |
| BR-6.4 | Surface precursor alerts for upstream failure signals | Should Have | Precursor feed visible; linked to downstream agent |
| BR-6.5 | Provide circuit breaker state per agent with trigger count | Should Have | Circuit breaker status visible; auto-disable on repeated failures |
| BR-6.6 | Detect ReAct loops and cascade failure patterns in multi-agent meshes | Nice to Have | Loop detection event appears in fleet events feed |

### 4.7 BR-7: Multi-Agent Mesh Visibility

**Requirement:** The platform must provide visibility into inter-agent communication, dependencies, and routing within multi-agent pipelines.

**Business Justification:** Multi-agent architectures create complex dependency graphs; failures propagate silently without mesh visibility.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-7.1 | Visualize agent mesh topology showing dependencies and communication patterns | Should Have | Topology diagram reflects actual agent relationships |
| BR-7.2 | Monitor inter-agent message queue between agents | Should Have | Message queue visible; message payload browsable |
| BR-7.3 | Support agent quarantine to isolate unhealthy agents from the fleet | Must Have | Quarantine action available; quarantined agent removed from active routing |
| BR-7.4 | Track semantic consistency across chain-of-thought agent pipelines | Nice to Have | Consistency score visible per pipeline run |

### 4.8 BR-8: Audit & Compliance

**Requirement:** The platform must maintain a complete, tamper-evident audit trail of all platform actions, agent decisions, and safety interventions.

**Business Justification:** Regulatory examination requirements (GDPR, MiFID II, SOC 2) and internal governance policies require demonstrable audit capability.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-8.1 | Log all user actions with timestamp, username, and change detail | Must Have | Audit log browsable; no gaps in timeline |
| BR-8.2 | Maintain causal traces for agent execution (agent, model, duration, span count) | Must Have | Trace visible per agent execution; linking to input/output |
| BR-8.3 | Log all HITL decisions with reviewer, timestamp, and rationale | Must Have | Decision history complete; reviewer identity recorded |
| BR-8.4 | Log all self-healing interventions | Should Have | Intervention log visible; rule triggered + action taken recorded |
| BR-8.5 | Support compliance log export | Should Have | Export available for audit evidence packages |

### 4.9 BR-9: Platform Administration

**Requirement:** The platform must provide secure, role-governed administrative controls for user management, system configuration, and platform operations.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-9.1 | Provide role-based access control with at minimum admin and read-only user roles | Must Have | RBAC enforced on all destructive and write operations |
| BR-9.2 | Support fleet-level operational controls: fleet reboot, cache purge, API key rotation | Must Have | Operations available to admin; confirmation required; action logged |
| BR-9.3 | Support environment switching (production / staging / development) | Should Have | Environment context visible; data scoped accordingly |
| BR-9.4 | Support multi-tenant operation for managed service / SaaS deployment | Should Have | Tenant switcher available; data isolation enforced |
| BR-9.5 | Provide an AI assistant for natural language queries over fleet health, cost, and agent status | Nice to Have | Assistant returns accurate, scoped answers; no hallucination on structured data |

### 4.10 BR-10: Resilience & Offline Capability

**Requirement:** The platform must remain operational for monitoring and decision-making even when the backend or cloud provider is temporarily unavailable.

| ID | Requirement | Priority | Acceptance Criteria |
|----|-------------|----------|---------------------|
| BR-10.1 | Automatic fallback to last-known demo/cached data when backend is unreachable | Must Have | "Offline — Demo Data Active" banner displayed; all pages remain functional |
| BR-10.2 | Offline HITL queue management (approve/reject) with sync on reconnect | Should Have | Queue actions persisted locally; synced on backend restore |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-P1 | Page load time (first meaningful paint) | < 2 seconds on 10 Mbps connection |
| NFR-P2 | API response time (p95) | < 500ms for all read endpoints |
| NFR-P3 | Data refresh latency | ≤ 30 seconds for metric updates |
| NFR-P4 | HITL SLA accuracy | Timer deviation ≤ 1 second |

### 5.2 Security

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-S1 | Authentication | JWT-based, short-lived tokens (configurable expiry) |
| NFR-S2 | Password storage | bcrypt hash; no plaintext storage |
| NFR-S3 | PII protection | Auto-masking in all log displays; no PII in API responses |
| NFR-S4 | HTTP security | Helmet.js: CSP, HSTS, frameguard, referrer-policy |
| NFR-S5 | OWASP compliance | OWASP Top 10 mitigated; injection prevention enforced |
| NFR-S6 | Secrets management | All credentials in Kubernetes Secrets; no hardcoded secrets in code |
| NFR-S7 | Container security | Non-root runtime user in all containers |

### 5.3 Availability & Reliability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-A1 | Platform availability | 99.9% uptime (excluding planned maintenance) |
| NFR-A2 | Backend redundancy | Minimum 2 backend pod replicas in production |
| NFR-A3 | Database durability | MongoDB with persistent volume claim; no in-memory only storage |
| NFR-A4 | Health endpoint | `/health` endpoint available; used by Kubernetes liveness probes |
| NFR-A5 | Graceful degradation | Platform functional in read-only mode when backend unreachable |

### 5.4 Compliance

| ID | Requirement | Regulation |
|----|-------------|-----------|
| NFR-C1 | Data privacy controls | GDPR Article 25 (privacy by design) |
| NFR-C2 | Financial AI oversight | MiFID II (AI-assisted financial decisions require audit trail) |
| NFR-C3 | Anti-money laundering screening | AML directives (agent compliance screening active) |
| NFR-C4 | Audit trail completeness | SOC 2 Type II (all user actions logged) |

### 5.5 Scalability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-SC1 | Agent fleet scale | Support up to 500 registered agents |
| NFR-SC2 | Concurrent users | Support up to 100 concurrent dashboard users |
| NFR-SC3 | Data retention | Audit logs retained for minimum 90 days |
| NFR-SC4 | Horizontal scaling | Backend pods auto-scalable via Kubernetes HPA |

### 5.6 Usability

| ID | Requirement | Target |
|----|-------------|--------|
| NFR-U1 | Time to insight | Operator reaches relevant agent signal within 3 clicks from landing page |
| NFR-U2 | Deep linking | Any module/tab navigable via cross-module programmatic link (`onNavigate`) |
| NFR-U3 | Offline indicator | Clear "Offline — Demo Data Active" banner when backend unreachable |
| NFR-U4 | RBAC transparency | Locked features show clear "Admin required" messaging, not silent failures |

---

## 6. Feature Prioritization (MoSCoW)

### Must Have (v1.0-alpha)
- Fleet Health Score + KPI dashboard (BR-1.1, BR-1.5)
- Real-time alert feed (BR-1.3)
- Anomaly score with auto-incident creation (BR-1.6)
- MTD cost attribution by agent and model (BR-2.1, BR-2.2)
- Cost optimization recommendations (BR-2.4)
- 6 trust interceptors with event monitoring (BR-3.1, BR-3.2)
- Hallucination rate monitoring (BR-3.3)
- PII redaction in logs (BR-3.5)
- Compliance screening (BR-3.6)
- Agent investigation desk (BR-4.1)
- Runbook library (BR-4.2)
- HITL queue with SLA timers (BR-4.4, BR-4.5)
- Incident recovery management (BR-4.7)
- Agent registry with versioning and status (BR-5.1, BR-5.2)
- Rollback capability (BR-5.3)
- Deployment timeline (BR-5.4)
- Model registry (BR-5.5)
- Eval gate monitoring (BR-6.3)
- Agent quarantine (BR-7.3)
- Complete audit trail (BR-8.1, BR-8.2, BR-8.3)
- RBAC (BR-9.1)
- Fleet operational controls (BR-9.2)
- Offline fallback (BR-10.1)

### Should Have (v1.1)
- Episode-level cost attribution (BR-2.3)
- Multi-model cost comparison (BR-2.5)
- Budget threshold alerts (BR-2.6)
- Guardrail coverage matrix (BR-3.4)
- RAG grounding tracking (BR-3.7)
- Jira escalation (BR-4.3)
- Self-healing rules (BR-4.6)
- Model routing rules (BR-5.6)
- Semantic drift detection (BR-6.2)
- Precursor alerts (BR-6.4)
- Circuit breaker status (BR-6.5)
- Mesh topology visualization (BR-7.1)
- Inter-agent message monitoring (BR-7.2)
- Intervention logging (BR-8.4)
- Compliance log export (BR-8.5)
- Environment switching (BR-9.3)
- Multi-tenant support (BR-9.4)
- HITL offline queue (BR-10.2)

### Nice to Have (v1.2+)
- Tool-level cost attribution (BR-2.7)
- What-if cost analysis
- ReAct loop detection (BR-6.6)
- Semantic chain-of-thought consistency (BR-7.4)
- AI assistant (BR-9.5)
- Vite migration (tech infrastructure)

---

## 7. Assumptions

| # | Assumption |
|---|-----------|
| A-1 | The platform is a management console, not an agent execution runtime — it observes and governs agents deployed externally. |
| A-2 | Agents are already deployed on supported cloud providers (AWS Bedrock, Azure OpenAI, GCP Vertex AI) and emit telemetry consumable by VeriForge Ops. |
| A-3 | The Veritas Solutions demo scenario serves as the reference implementation for all alpha feature validation. |
| A-4 | Multi-tenant data isolation is the responsibility of the API layer; the frontend renders data scoped to the authenticated tenant. |
| A-5 | HITL actions are advisory in alpha — the platform raises requests and records decisions, but does not directly block agent execution in v1.0. |
| A-6 | Runbook execution in alpha is read-only (browse and reference); automated execution is a v1.1 capability. |

---

## 8. Constraints

| # | Constraint | Impact |
|---|-----------|--------|
| C-1 | Build toolchain (CRA) is deprecated — Vite migration required before v1.0 GA | Technical debt; no upstream security patches |
| C-2 | No React Router — browser history/back button not supported | UX limitation; deep links must be shared as app state |
| C-3 | HITL queue persistence is client-side (localStorage) in alpha | Multi-device/multi-operator queue synchronization not supported in alpha |
| C-4 | Cloud log sync requires customer-configured IAM/RBAC on source cloud accounts | Customer onboarding step required before live data |
| C-5 | Feature gates are configuration-time only (no runtime admin toggle) | Gate changes require redeployment |

---

## 9. Out of Scope (v1.0-alpha)

| Item | Rationale |
|------|-----------|
| Agent execution runtime | VeriForge Ops is an observation/governance layer only |
| LLM fine-tuning controls | Post-GA capability |
| Real-time WebSocket streaming | Polling-based in alpha; WebSocket in roadmap |
| Native mobile application | Browser-first; responsive mobile support post-GA |
| On-premises deployment (non-Kubernetes) | Kubernetes required; bare-metal not supported in alpha |
| PagerDuty / Slack integration | Webhook integration in v1.1 |
| What-if cost modelling | Feature gate: `finops.optimize.whatif` — UI stub only |
| Automated runbook execution | Gated: `workbench.runbooks.execute` — browse only in alpha |

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Agent Fleet** | The collection of all AI agents registered and managed within VeriForge Ops |
| **AgentOps** | Agentic Operations — the discipline of managing AI agent fleets in production |
| **Fleet Health Score** | Composite metric (TSR × weight + Cost Efficiency + Behavioral Compliance + Availability) representing overall fleet status |
| **HITL** | Human-in-the-Loop — the process of routing agent actions to human reviewers at defined risk thresholds |
| **Eval Gate** | Minimum quality evaluation score (default: 0.80) required for an agent to be promoted to production |
| **Anomaly Score** | A numerical score (0–100) representing detected anomalous behaviour; ≥75 triggers auto-incident creation |
| **Semantic Drift** | A >20% shift from an agent's established embedding baseline, indicating context contamination or capability degradation |
| **Trust Interceptor** | A runtime guardrail that monitors, filters, or blocks specific categories of AI agent input/output |
| **Circuit Breaker** | An auto-disable mechanism that prevents a failing agent from continuing to execute when repeated failures are detected |
| **MTD Spend** | Month-to-date token inference spend, aggregated across all agents in the fleet |
| **Runbook** | A structured incident remediation procedure with defined escalation paths (L1 → L2 → L3) |
| **Self-Healing Rule** | A pre-configured auto-remediation action triggered by specific agent failure conditions |
| **Mesh** | The inter-agent communication and dependency network in a multi-agent pipeline |
| **Golden Thread** | The cross-module deep-link navigation chain enabling operators to follow a signal from detection to resolution without context switching |
| **Veritas** | The reference demo fleet name used in the platform's mock data scenario |
| **RBAC** | Role-Based Access Control — the mechanism governing user access by assigned role (admin / user) |
| **TSR** | Task Success Rate — the percentage of agent task completions that meet quality thresholds |

---

*Document maintained by Cognizant AI & Data BU — VeriForge Ops Product Team*

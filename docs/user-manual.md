# VeriForge Ops — Alpha User Manual

**Version:** 1.0-Alpha  
**Audience:** Alpha evaluation users  
**Platform:** VeriForge Ops — Enterprise Agentic Operations Platform  
**Demo Fleet:** Veritas

---

## Table of Contents

1. [Overview](#1-overview)
2. [Getting Started](#2-getting-started)
3. [Navigation & Shell](#3-navigation--shell)
4. [Core — Fleet Dashboard](#4-core--fleet-dashboard)
5. [Insights — Fleet Observability](#5-insights--fleet-observability)
6. [FinOps — Cost & Spend](#6-finops--cost--spend)
7. [Workbench — Operations & Remediation](#7-workbench--operations--remediation)
8. [Registry — Agent & Model Catalogue](#8-registry--agent--model-catalogue)
9. [Admin — Settings & AI Assistant](#9-admin--settings--ai-assistant)
10. [Cross-Module Workflows](#10-cross-module-workflows)
11. [Role-Based Access](#11-role-based-access)
12. [Known Alpha Limitations](#12-known-alpha-limitations)

---

## 1. Overview

VeriForge Ops is a single-pane-of-glass operations platform for managing, monitoring, and governing fleets of autonomous AI agents in enterprise production environments. It closes the **observe → govern → act** loop before issues become incidents.

### What VeriForge Ops Covers

| Capability | What You Can Do |
|-----------|----------------|
| **Fleet Observability** | Monitor health scores, latency, error rates, anomaly signals, and guardrail events across all agents in real time |
| **Cost Governance** | Track token spend by agent and model, view 30-day cost trends, and act on optimization recommendations |
| **Incident Operations** | Investigate agent failures with correlated logs, traces, and HITL decisions in one view |
| **Runbooks** | Step-by-step operational playbooks for the most common failure modes — P1 to P3 severity |
| **Human-in-the-Loop** | Review and authorize high-risk agent actions before they execute, with SLA countdown timers |
| **Self-Healing** | Automated recovery rules that fire on threshold breaches — with full intervention history |
| **Agent Registry** | View agent configurations, version history, and lifecycle status across the fleet |
| **Safety & Compliance** | Monitor guardrails, policy interceptors, and compliance events for MiFID II, GDPR, and AML |
| **AI Assistant** | Natural-language interface to query fleet state, cost data, and active alerts |

### Demo Fleet — Veritas

All data in this alpha build is scoped to the Veritas demo fleet: 5 production agents, all active on AWS Bedrock.

| Agent | Role | Model | Provider |
|-------|------|-------|----------|
| Concierge Agent | Customer-facing concierge, account queries, service routing | Claude 3.5 Haiku | AWS Bedrock |
| Public Research Agent | Public data research, regulatory filings, market intelligence | Claude 3.5 Sonnet | AWS Bedrock |
| Insurance Underwriting Agent | Underwriting decisions, risk assessment, policy evaluation | Claude 3 Opus | AWS Bedrock |
| Shipment Insight Agent | Logistics tracking, shipment analytics, supply chain insights | Amazon Nova Pro | AWS Bedrock |
| Workforce Planning and Recruitment | Contract generation, compliance document pipeline | Claude Sonnet 4.5 | AWS Bedrock |

---

## 2. Getting Started

### Accessing the Platform

Open VeriForge Ops in your browser. You will be presented with the login screen.

### Signing In

1. Enter your **Username** and **Password**
2. Click **Sign In** (or press `Enter`)

**Demo Credentials**

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | Administrator (full access) |
| `viewer` | `viewer123` | Viewer (read-only) |

> **Note:** Use the `admin` account to access all write operations, approve HITL decisions, and commit policy changes.

### After Login

You will land on the **Core** module (Fleet Dashboard). The platform is ready to use — all data is pre-loaded for the Veritas fleet.

---

## 3. Navigation & Shell

### Sidebar

The sidebar on the left contains six main modules. Click any icon to navigate.

| Icon | Module | Purpose |
|------|--------|---------|
| Grid | **Core** | Fleet health overview and agent status |
| Eye | **Insights** | Observability — health, events, signals, guardrails |
| Banknote | **FinOps** | Token spend analysis and cost optimization |
| Wrench | **Workbench** | Troubleshooting, runbooks, HITL, self-healing |
| Bot | **Registry** | Agent registry and model catalogue |
| Sliders | **Admin** | Settings and AI Assistant |

**Collapse the sidebar** by clicking the toggle arrow at the bottom of the sidebar. The sidebar shrinks to icon-only mode (56px), giving more space to the content area.

**Quick Links** (sidebar footer) — three one-click shortcuts:
- **Fleet Events** → Insights › Fleet Events
- **Signals & Drift** → Insights › Signals & Drift
- **Runbooks** → Workbench › Runbooks

### Top Bar

| Element | Description |
|---------|-------------|
| **Breadcrumb** | Shows the current module name |
| **Search** (`Ctrl+K` / `Cmd+K`) | Global search across all sections, tabs, and features |
| **Notifications bell** | Shows unread fleet events and alerts. Click a notification to mark it read. "Mark all as read" clears the badge. Read/unread state is persisted across sessions. |
| **Help panel** (`?` icon) | Opens contextual tips for the current module |
| **Profile** | Displays your username, role badge, and Sign Out option |

### Global Search

Press `Ctrl+K` (Windows) or `Cmd+K` (Mac) to open the search bar at any time. Type any section name, feature name, or tab label. Results are grouped by module. Press `Enter` or click a result to navigate directly.

---

## 4. Core — Fleet Dashboard

**Nav key:** Core (grid icon)

The Core module is the executive starting point. It shows the aggregate health of the entire Veritas fleet at a glance.

### Fleet Health Score

The large score tile at the top is the **Platform Health Score** — a weighted composite of 8 dimensions:

| Dimension | Weight |
|-----------|--------|
| Task Success Rate | 25% |
| Cost Efficiency | 15% |
| Behavioral Compliance | 15% |
| Eval Suite Pass Rate | 15% |
| Agent Availability | 10% |
| Embedding Drift Health | 10% |
| HITL Resolution Rate | 5% |
| Feedback Sentiment | 5% |

The score is out of 100. Below 80 is considered at-risk. Click any dimension row to drill down directly to the relevant module tab.

### KPI Grid & Lifetime Stats

Below the health score, the dashboard shows:
- **KPI Grid** — 6 fleet-level metrics: Registered Agents, Active Agents, Tasks Completed, Fleet Cost (MTD), Hallucination Rate, Task Success Rate. Each tile is clickable and navigates to the relevant detail tab.
- **Lifetime Usage Statistics** — Total Fleet Cost, Total Tokens Processed, Total Agent Invocations, Avg Cost per Successful Task

### Charts

- **Budget vs Spend** — monthly bar chart comparing budget to actual spend (Nov 2025–May 2026), with a dashed forecast line for the current month
- **Model Latency by Provider** — 7-day line chart showing average model call latency (ms) per Bedrock model (Claude 3.5 Haiku, Claude 3.5 Sonnet, Claude 3 Opus, Amazon Nova Pro)

### MLOps Health Summary & Alerts

Four summary cards show current fleet health signals (Models Registered, Guardrails Active, HITL Queue depth, Anomaly Score). Below them, the **Agent Behavioral Alerts** section shows Critical and Warning alerts from the last 7 days. Click any alert to open Workbench › Troubleshooting.

---

## 5. Insights — Fleet Observability

**Nav key:** Insights (eye icon)

Insights has four tabs covering every dimension of fleet observability.

---

### 5.1 Fleet Health

Shows performance metrics across the entire fleet over the last 7 days.

**KPI Strip** (top row):
- p50 Latency, p99 Latency, Throughput (req/hr), Success Rate

**Charts:**
- **Latency by Agent** — multi-line chart showing each agent's latency trend over 7 days. Hover over the March 28–29 spikes to see incident annotations.
- **Throughput — Daily Requests** — stacked bar chart showing request volume per agent per day
- **Error Rate by Category** — horizontal bar chart breaking errors into: Tool Timeout, Model Error, Guardrail Block, Timeout, Rate Limit

---

### 5.2 Fleet Events

A unified event feed combining alerts, anomalies, HITL decisions, and self-healing actions from all 5 agents.

**Filtering:**
- **Category pills** (top) — filter by: All / Alert / Anomaly / HITL Decision / Self-Healing
- **Agent dropdown** — scope the feed to a single agent

**Event Types and What They Mean:**

| Category | Badge Color | What It Means |
|----------|------------|---------------|
| Alert | Red (P1) / Amber (P2) | Active fleet alert requiring attention |
| Anomaly | Orange | Anomaly score fired above threshold |
| HITL Decision | Blue | A human approved or rejected an agent action |
| Self-Healing | Green | An automated recovery rule fired and resolved an issue |

**Actions per event:**
- **Investigate** — jumps to Workbench › Troubleshooting for that agent, pre-loaded with its context

The footer shows the total count: "Showing N of M fleet events."

---

### 5.3 Signals & Drift

Real-time anomaly detection and predictive intelligence for the fleet.

#### Anomaly Feed Table

Rows represent detected anomalies with:
- **Agent** — which agent triggered the anomaly
- **Category** — type of anomaly (Loop Detection, Token Spike, Embedding Drift, etc.)
- **Score** — 0–100 risk score (≥80 = P1, ≥60 = P2, <60 = P3)
- **Action** — what was done: Auto-Remediated, HITL Escalated, Under Observation, No Action
- **Timestamp**

> Anomalies with a score ≥ 75 show an **"Investigate in Workbench →"** link. Clicking it opens Troubleshooting pre-filtered to that agent.

**Current demo anomalies to explore:**
- Concierge Agent — Quality Regression, score 79 (HITL Escalated)
- Public Research Agent — Token Spike, score 82 (Auto-Remediated)
- Public Research Agent — Loop Detection, score 88 (Auto-Remediated)

#### Anomaly Distribution Chart

Line chart showing anomaly frequency by category across the week. Useful for identifying recurring patterns.

#### Precursor Alerts & Remediation Queue

Scroll down below the anomaly feed to see:
- **Precursor Alerts** — early-warning signals before they escalate to P1
- **Remediation Queue** — active automated remediation tasks with progress bars

---

### 5.4 Safety & Monitoring

Policy enforcement and compliance monitoring for the fleet.

#### Active Safety Measures

Six interceptors are shown as cards. Each card shows:
- **Name** — the interceptor's function
- **Events today** — how many times it fired
- **Toggle switch** — enable or disable the interceptor (persisted to the database)

| Interceptor | What It Does |
|-------------|-------------|
| Prompt Injection Guard | Detects and blocks adversarial prompt injection attempts |
| PII Redaction | Automatically redacts names, emails, and card numbers from inputs and outputs |
| Credential Guard | Prevents API keys and secrets from leaking through tool calls |
| Output Filtering | Screens responses against policy rules before delivery to downstream systems |
| RAG Grounding Guard | Validates retrieved context chunks are factually grounded before use |
| Compliance Screen | Enforces MiFID II, GDPR, and AML policies on every agent response |

> **Compliance Screen** has an expandable drill-down. Click **"View compliance events (6)"** to see a table of the latest compliance violations with framework (MiFID II / GDPR / AML), rule, agent, severity, and detail.

> **Toggle behaviour:** Enabling/disabling a guardrail immediately persists to the database. The change survives page refreshes.

---

## 6. FinOps — Cost & Spend

**Nav key:** FinOps (banknote icon)

FinOps has two tabs for spend visibility and cost reduction.

---

### 6.1 Spend Analysis

**Agent selector** — choose a specific agent or view fleet-wide data.

**KPI Strip:**
- Avg Latency, Success Rate, Hallucination Rate, Error Rate

**Charts:**
- **Daily Cost Trend** — 30-day area chart in USD. Shows spend trajectory per agent.
- **Token Volume Trend** — 30-day area chart of token consumption
- **Model Usage Breakdown** — horizontal bar chart of tokens and requests by model
- **Trajectory Score** — horizontal bar chart scoring the agent across 6 quality dimensions

**Alert Tables (bottom of page):**

Two side-by-side tables show **Critical Alerts** and **Warning Alerts** for the selected agent:
- **Agent** — which agent triggered the alert
- **Message** — short description of the alert condition (hover to see full text if truncated)
- **Time** — when the alert fired

> These tables pull from the same live alert API as the Fleet Events feed.

---

### 6.2 Cost Optimization

Recommendations for reducing fleet spend, grouped by agent and opportunity type.

Each recommendation card shows:
- The **agent** and **recommendation** (e.g., "Switch to claude-3-haiku for low-complexity queries")
- **Estimated saving** (monthly USD)
- An action button — currently shown as **coming soon** (feature in Beta)

---

## 7. Workbench — Operations & Remediation

**Nav key:** Workbench (wrench icon)

The Workbench is the investigation and remediation desk. It has four tabs.

---

### 7.1 Troubleshooting

The primary investigation surface. Select an agent to open a full investigation session.

#### Selecting an Agent

On first arrival, you see a prompt with a dropdown. Select any of the 5 Veritas agents to begin. You can also arrive here from a Fleet Events "Investigate" button — in that case the agent is pre-selected and a "Troubleshooting Session Opened" notification appears.

Once an agent is selected, the view shows:
- **Investigation banner** (amber) — confirms which agent is in scope; includes a switcher and "Clear" button
- **Live Log Stream** (left column)
- **Investigation Context** (right column)
- **Trace Analysis** (below)
- **Compliance & Audit Trail** (below)

#### Live Log Stream

Shows the last 15 log entries for the selected agent, rebased to current time.

**Controls:**
- **Level filter** — ALL / INFO / WARN / ERROR
- **Search box** — text search on log message content
- **Error/Warn count badges** — at-a-glance count of each level in the current view

> **PII masking** is active — personal identifiers in log messages are automatically masked.

> **Click an ERROR line** to open the **Remediation Drawer** — this looks up and displays the matching runbook for that error type, with steps you can review.

**Log sync buttons** (at the bottom):
- **Fetch Logs** — syncs the latest logs from the CloudWatch log group

#### Investigation Context Panel

The right column aggregates related context for the selected agent:
- **Related Alerts** — current P1/P2 alerts for this agent
- **HITL Decisions** — pending and recent human-in-the-loop decisions for this agent
- **Suggested Runbooks** — runbooks relevant to the current alert pattern

Links:
- **Open in HITL** → jumps to Manual Overrides tab, filtered to this agent
- **Escalate to Jira** → opens an escalation modal to raise a Jira ticket

#### Trace Analysis

Displays the audit trace table for the selected agent — showing session IDs, thought steps, model used, duration, and token counts for recent invocations.

#### Compliance & Audit Trail

A paginated table of the last 50 portal log entries with log level, message, request ID, and timestamp. Two sync options at the top:
- **Sync All Logs** — pulls from the CloudWatch log group
- **Sync Agent Logs** — pulls logs scoped to the selected agent only

---

### 7.2 Runbooks

A library of 11 operational playbooks covering the most common failure scenarios.

#### Using the Runbooks

1. Select a runbook from the **left sidebar** — categories are sorted by severity
2. The detail view opens on the right, showing:
   - **Severity badge** (P1 / P2 / P3)
   - **Personas** — which team role should use this runbook (L1 / L2 / L3 / Platform Eng)
   - **Triggers** — the conditions that activate this runbook
   - **Steps** — numbered steps with title, description, command, and verify/rollback notes
   - **Escalation path** — when and to whom to escalate
3. Use the **Persona filter** (ALL / L1 / L2 / L3) to show only runbooks relevant to your role
4. Use the **Agent selector** at the top to scope runbook execution to a specific agent

> **Step execution** is gated in this alpha build — steps show a "Step execution available in Beta" tooltip. You can read all steps and use them as a reference guide.

**Jira Escalation** — the **"Create Jira Ticket"** button at the top of any runbook opens a pre-filled escalation form. Fill in the agent name, trace ID, severity, and error log, then click "Raise Incident" to generate a ticket reference (e.g., `VFOPS-4821`).

#### Available Runbooks

| Runbook | Severity | Audience |
|---------|----------|---------|
| Agent Restart | P2 | L1, L2 |
| Cost Overrun | P2 | L2, Platform Eng |
| Human Escalation | P2 | L1, L2, L3 |
| Latency Degradation | P1 | L2, L3, Platform Eng |
| Memory Pressure | P1 | L2, L3, Platform Eng |
| Security Incident | P1 | L3, Platform Eng |
| Platform Recovery | P1 | L3, Platform Eng |
| RAG Retrieval Degradation | P2 | L2, L3, Platform Eng |
| Fine-Tuning Job Failure | P2 | L3, Platform Eng |
| Model Drift Response | P1 | L2, L3, Platform Eng |
| Multi-Agent Workflow Failure | P1 | L2, L3, Platform Eng |

---

### 7.3 Manual Overrides (HITL Console)

The Human-in-the-Loop console for reviewing and authorising high-risk agent actions before they execute.

#### Approval Queue

Each pending item shows:
- **SLA Ring** — circular countdown timer. Green → amber → red as time runs out. Shows "BREACHED" if the SLA window has elapsed. A breach fires an auto-escalation toast notification.
- **Risk tier badge** — Critical (red) / High (amber) / Medium (blue) / Low (green)
- **Agent → Tool** — which agent is requesting which tool execution
- **Reasoning** — the agent's stated rationale for the action (shown in a dark code block)
- **Elapsed / SLA remaining** — time since the request was created, and time left before breach

**SLA windows by risk tier:**

| Risk | SLA Window |
|------|-----------|
| Critical | 3 minutes |
| High | 5 minutes |
| Medium | 15 minutes |
| Low | 30 minutes |

**Actions** (admin role required):
- **Approve** — authorises the agent action; logs decision to the Immutable Audit Trail
- **Reject** — denies the action; agent execution is suspended pending review
- **Escalate** — sends the item to the next tier (L2 → L3)

> Dismissed items persist across page refreshes — a rejected item will not reappear when you return to this tab.

**Current demo queue items:**
- `HITL-4822` — Workforce Planning and Recruitment → `submit_compliance_report` (Critical)
- `HITL-4821` — Insurance Underwriting Agent → `execute_underwriting_decision` (Critical)
- `HITL-4820` — Public Research Agent → `publish_research_report` (High)
- `HITL-4819` — Concierge Agent → `modify_client_profile` (High)

#### Approval History

Below the queue, a table shows all past HITL decisions with timestamp, agent, protocol, decision (Approved / Rejected), and the principal who decided.

#### Risk Threshold Configuration

On the left side of the page, the **Risk Thresholds** panel lets you configure per-agent policy thresholds for:
- **Protocol Risk Threshold** — minimum risk level that triggers a HITL review
- **Cost Alert** — per-request cost cap before alerting
- **Loop Detection** — max ReAct iterations before circuit break
- **Escalation Path** — default escalation tier (L1 → L2 → L3 → Auto)

Currently configurable for: Workforce Planning and Recruitment and Insurance Underwriting Agent.

Click **Commit Policy** to save thresholds. Committed values persist across page refreshes.

---

### 7.4 Incident Recovery

The self-healing and automated recovery management tab.

#### Self-Healing Rules

Seven active rules are displayed as a table showing: rule name, trigger condition, action taken, severity, and how many times it fired in the last 24 hours.

| Rule | Condition | Action |
|------|-----------|--------|
| OOM Auto-Restart | heap_usage > 85% | Restart container and flush memory cache |
| ReAct Loop Circuit Break | loop_iterations ≥ 3 | Terminate loop and escalate to HITL |
| Token Budget Hard Stop | daily_tokens ≥ 95% cap | Suspend agent and notify FinOps |
| Latency SLA Fallback | p95_latency > 5000ms | Reroute to backup model (Haiku / Flash) |
| Hallucination Guard | hallucination_rate > 0.25 | Flag response and request human review |
| Tool Failure Retry | tool_error_rate > 10% | Retry with exponential backoff (max 3) |
| Idle Agent Scale-Down | idle_time > 30 min | Scale to 0 replicas (disabled by default) |

**Toggle** (Enable/Disable) — click the switch to enable or disable a rule. Disabling a P1-severity rule requires confirming a warning modal.

#### Intervention Log

A table of every automated recovery action that has fired, showing: intervention ID, rule name, agent targeted, full action description, and timestamp. The **Override** button marks an intervention as manually overridden.

**Recent demo interventions to explore:**
- Workforce Planning and Recruitment — Initial Warm-Up Guard fired and auto-resolved
- Public Research Agent — ReAct Loop Circuit Break (HITL entry created)
- Public Research Agent — OOM Auto-Restart (container restarted)
- Concierge Agent — Latency SLA Fallback (rerouted to haiku, overridden)

---

## 8. Registry — Agent & Model Catalogue

**Nav key:** Registry (bot icon)

The Registry has two tabs for tracking agents and models across their full lifecycle.

---

### 8.1 Agent Registry

A full table of all registered agents showing: agent name, description, model, version, status, environment, routing policy, and circuit breaker state.

**Circuit Breaker states:**
- **Closed** — normal operation
- **Half-Open** — testing recovery
- **Open** — suspended (Public Research Agent is currently Open)

**Per-agent actions (Actions column):**

- **Status toggle** — switch the agent between Active and Inactive
- **Version History** — opens a drawer showing every version of the agent with: version string, change type (create / major / minor / patch), changed fields, date, and who made the change

**KPI bar** above the table shows: total agents enrolled, active count, and fleet health summary.

**Agent detail panel** — clicking a row selects the agent and shows its full configuration on the right side.

---

### 8.2 Model Registry

Cards for each model available to the fleet, showing: model name, provider, version, parameter count, lifecycle status, and benchmark scores (Accuracy, Latency, Safety, Cost Efficiency).

**Lifecycle status badges:**
- Active, Evaluating, Deprecated, Retired

**Model Detail Drawer** — click any card to open the full spec sheet: context window size, input/output pricing, training data cutoff, capabilities, and a benchmark comparison table.

---

## 9. Admin — Settings & AI Assistant

**Nav key:** Admin (sliders icon)

Admin has two tabs: Settings and AI Assistant.

---

### 9.1 Settings

Displays platform configuration and access control.

**Users** — a table of all enrolled principals for the Veritas fleet:

| Column | Description |
|--------|-------------|
| Username | Login identifier |
| Email | Contact address |
| Role | Platform Admin / L2 Operator / L1 Analyst / etc. |
| Status | Active / Inactive |
| Last Login | Relative time of last session |
| Enrolled Since | Account creation date |

**Role Permissions** — a table mapping each RBAC role to its permission scope and agent access:

| Role | Permissions |
|------|-------------|
| Platform Admin | All Access |
| Agent Operator | View, Edit Agents, View Logs |
| Analytics Viewer | View Dashboard, View Logs |
| FinOps Analyst | View Cost, Export Reports |
| Security Auditor | View Audit, View Trust |

---

### 9.2 AI Assistant

A natural-language query interface for the fleet. Type any question about agents, costs, alerts, or system status and the CoordinatorAgent returns a structured response.

#### How to Use

1. Type your query in the text area — or click one of the **example chips** to populate it
2. Press `Ctrl+Enter` or click **Execute**
3. The result appears below as a syntax-highlighted code block with:
   - **Intent tag** — the detected query type (Agent List, Cost Analytics, Alert Query, etc.)
   - **Tool used** — which backend tool was invoked
   - **Confidence** — the routing confidence score
   - **Response text** — the natural-language answer
   - **Sources** — which data sources were queried

**Example queries to try:**

| Query | What It Returns |
|-------|----------------|
| `List all registered agents` | Full fleet roster with status, version, and model |
| `Get token usage for the last 7 days` | Total tokens, input/output split, top agent by consumption |
| `Show critical alerts` | Active P1/P2 alerts with affected agents and descriptions |
| `What is the system status?` | Fleet health score, open incidents, HITL queue depth |
| `Get cost metrics for last 30 days` | MTD spend, daily average, trend, and top cost agent |
| `Sync model invocation logs` | Log sync result with record count and log group |

**Query history** — previous queries appear below the input as a scrollable list showing timestamp, intent badge, and a chevron to re-expand any past result.

---

## 10. Cross-Module Workflows

These are the primary investigation flows that span multiple modules. VeriForge Ops is designed so each step links directly to the next without manual navigation.

---

### Workflow A — Respond to a P1 Alert

1. **Core** — see the amber alert banner for Public Research Agent (anomaly score 79)
2. Click **Investigate** → arrives at **Workbench › Troubleshooting**, agent pre-selected
3. Review the **Live Log Stream** — look for ERROR lines with "ReAct loop" or "OOM" messages
4. Click an ERROR log line → **Remediation Drawer** opens with the matching runbook
5. Switch to **Workbench › Runbooks** and select **Agent Restart** or **Latency Degradation**
6. Follow the steps as a reference guide
7. Check **Workbench › Incident Recovery** → confirm the self-healing rule already fired (`ReAct Loop Circuit Break — INT-0091`)
8. Return to **Insights › Fleet Events** to confirm the anomaly is resolved

---

### Workflow B — Investigate a HITL Decision

1. **Insights › Fleet Events** — see HITL Decision event for Insurance Underwriting Agent → `execute_underwriting_decision`
2. Click **Investigate** to arrive at **Workbench › Manual Overrides**
3. Find `HITL-4821` in the Approval Queue — review the reasoning text
4. Note the SLA ring — if it hits 0, an auto-escalation toast fires
5. Click **Approve** (admin role required) — the item dismisses and the decision is logged
6. Scroll down to **Approval History** to confirm the decision appears in the log

---

### Workflow C — Track Spend and Act on Optimization

1. **FinOps › Spend Analysis** — select Concierge Agent from the agent dropdown
2. Review the 30-day cost trend chart — note the upward slope
3. Check the **Critical / Warning Alert** tables — look for token usage warnings
4. Switch to **FinOps › Cost Optimization** — read the recommendations for this agent
5. Cross-reference with **Workbench › Incident Recovery** → Token Budget Hard Stop rule (SH-003) has fired 5 times

---

### Workflow D — Audit a Compliance Event

1. **Insights › Safety & Monitoring** — scroll to the **Compliance Screen** interceptor card (23 events today)
2. Click **"View compliance events (6)"** to expand the compliance event table
3. Note the compliance violation by Insurance Underwriting Agent — "Response contained underwriting recommendation without required risk disclosure"
4. Use the AI Assistant: type `"Show active policy violations"` to get a fleet-level summary
5. Open **Workbench › Troubleshooting** for Insurance Underwriting Agent → **Compliance & Audit Trail** tab for the detailed portal log

---

### Workflow E — Review Agent Versions and History

1. **Registry › Agent Registry** — find the Workforce Planning and Recruitment row
2. Click **Version History** in the Actions column
3. The drawer shows the agent was created today (v1.0), deployed to production, and has a HITL submission pending
4. Return to **Workbench › Manual Overrides** to see the pending `submit_compliance_report` request (HITL-4822)

---

## 11. Role-Based Access

VeriForge Ops uses two application-level roles.

| Role | Access Level | Key Restrictions |
|------|-------------|-----------------|
| **Administrator** (`admin`) | Full access to all modules and all write operations | None |
| **Viewer** (`user` / `viewer`) | Read-only access | Cannot approve/reject HITL decisions, cannot commit risk policy thresholds, cannot toggle agent status |

**Where role gating is visible:**
- **Workbench › HITL Console** — Approve, Reject, and Escalate buttons are disabled for Viewer
- **Workbench › HITL Thresholds** — Commit Policy button is disabled for Viewer
- **Registry › Agent Registry** — Status toggle is disabled for Viewer

The **profile dropdown** (top-right) shows your current role as either "Administrator" or "Viewer."

---

## 12. Known Alpha Limitations

The following are known constraints in the 1.0-alpha build. They are documented here so evaluators can set accurate expectations.

### Data & Persistence

| Area | Limitation |
|------|------------|
| **All fleet data** | Scoped to the Veritas demo fleet. No live agent connections. |
| **Self-healing rule toggles** | UI toggle updates local state only — not persisted to the database in this build |
| **HITL Approve/Reject decisions** | Dismissed from the queue and logged locally — not written to backend HITL history API |
| **Runbook execution** | Step execution is disabled — buttons show "Step execution available in Beta" tooltip |
| **Notification read/unread** | Persisted to browser localStorage (survives refresh; does not sync across devices or browsers) |
| **HITL dismissed items & thresholds** | Persisted to browser localStorage (survives refresh; does not sync across devices) |

### Features Not Yet Available

| Feature | Status |
|---------|--------|
| Trace Analysis (Audit tab in Troubleshooting) | Populated with mock session data — live backend trace storage pending |
| Cost Optimization "Apply" buttons | Coming in Beta |
| Runbook step execution | Coming in Beta |
| FinOps ROI tab | Not yet implemented |
| Anomaly Scoring export | Planned for Beta |
| Reports & Analytics download | Planned for GA |

### Performance & Environment

| Item | Note |
|------|------|
| **Backend connectivity** | If the API server is unreachable, all data automatically falls back to the Veritas demo mock dataset. The UI remains fully functional. |
| **Session timeout** | Sessions expire after 1 hour of inactivity. Sign in again to resume. |
| **Browser support** | Chrome 110+ and Edge 110+ recommended. Firefox is functional but not validated for this alpha. |

---

## Appendix A — Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` / `Cmd+K` | Open global search |
| `Ctrl+Enter` | Submit query in AI Assistant |
| `Esc` | Close search, dropdowns, drawers |
| `↑` / `↓` | Navigate search results |
| `Enter` | Select highlighted search result |

---

## Appendix B — Alert Severity Reference

| Severity | Label | Color | Meaning |
|----------|-------|-------|---------|
| P1 | Critical | Red | Immediate action required — SLA breach risk |
| P2 | High | Amber | Elevated risk — action within 5 minutes |
| P3 | Medium | Blue | Advisory — review within 15 minutes |
| — | Warning | Orange | Below P2 threshold — monitor |

---

## Appendix C — Anomaly Score Reference

| Score Range | Tier | Automatic Action |
|-------------|------|-----------------|
| ≥ 80 | P1 | Auto-creates incident; HITL entry may be raised |
| 60–79 | P2 | Logged; remediation queue entry created |
| 75+ | Any | "Investigate in Workbench" link appears in anomaly table |
| < 60 | P3 | Logged; no automatic action |
| < 75 | — | Auto-remediation threshold; self-healing rules may fire |

---

*VeriForge Ops Alpha — Cognizant AI Practice Engineering*  
*Document version 1.0 · May 2026*

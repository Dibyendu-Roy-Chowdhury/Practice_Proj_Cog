# VeriForge Ops — Enterprise Agentic Operations Platform

VeriForge Ops is a single-pane-of-glass operations platform for managing, monitoring, and governing fleets of autonomous AI agents in enterprise production environments. It provides fleet-wide observability (health, signals, guardrails & safety), cost governance (token spend, optimization), operational tooling (runbooks, incident recovery, self-healing), and lifecycle management (registry, model registry) — embodying the shift from *"Experimental AI"* to *"Industrial AI"*.

---

## Module Architecture

| Nav Key | Module Name | Tab Count | Responsibility |
|---------|-------------|-----------|----------------|
| `8` | Core | 1 | Fleet health score and executive overview |
| `1` | Insights | 4 | Fleet-wide observability: health, telemetry, signals & drift, guardrails & safety |
| `12` | FinOps | 2 | Token spend analysis and cost optimization |
| `2` | Workbench | 4 | Agent investigation desk, runbooks, manual overrides, incident recovery |
| `7` | Registry | 2 | Agent registry and model registry |
| `4` | Admin | 2 | Platform settings and AI assistant |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd server && npm install && cd ..
```

> Run `npm install` in both the root and `server/` directories before starting. Skipping either step will cause missing-module errors at runtime.

### Production Build

```bash
npm run build
```

### Test

```bash
npm test
```

---

## Demo Data Story — Veritas Solutions

The application ships with a complete mock data story for **Veritas Solutions**, an insurance & logistics organisation with a 5-agent fleet (all active in production on AWS Bedrock). When the backend API is unreachable, all API functions fall back to this mock data automatically.

### Agent Fleet

| Name | Role | Provider | Model ID | Agent ID | Status | Scenario |
|------|------|----------|----------|----------|--------|---------|
| Workforce Planning and Recruitment | Compliance & regulatory pipeline | AWS Bedrock | `anthropic.claude-sonnet-4-5` | agent-009 | Active | Deployed recently; quality regression detected 1h after go-live; first HITL submission pending (Critical) |
| Concierge Agent | Client-facing service & routing | AWS Bedrock | `anthropic.claude-3-5-haiku-20241022-v1:0` | agent-001 | Active | Highest volume (247 delegations/day); delegates to all downstream agents |
| Insurance Underwriting Agent | Policy evaluation & risk scoring | AWS Bedrock | `anthropic.claude-3-opus-20240229-v1:0` | agent-003 | Active | Anomaly score 79 — **above threshold 75**; circuit breaker near trigger; token spike scenario |
| Public Research Agent | Research, retrieval & summarisation | AWS Bedrock | `anthropic.claude-3-5-sonnet-20241022-v2:0` | agent-002 | Active | Eval score 0.61 — **below gate threshold 0.80**; quality regression scenario |
| Shipment Insight Agent | Logistics tracking & supply chain | AWS Bedrock | `amazon.nova-pro-v1:0` | agent-005 | Active | Highest cost-efficiency; ETA prediction and delay flagging |

### Reference KPIs (`FLEET_CONSTANTS`)

| Constant | Value | Meaning |
|----------|-------|---------|
| `TOTAL_AGENTS` | 5 | 5 agents enrolled |
| `ACTIVE_AGENTS` | 5 | 5 active agents in production |
| `ANOMALY_THRESHOLD` | 75 | Score at which an incident is auto-created |
| `EVAL_GATE_THRESHOLD` | 0.80 | Minimum passing eval score for deployment promotion |
| `MTD_SPEND_USD` | 2340 | Month-to-date fleet spend in USD |
| `FLEET_NAME` | `'Veritas'` | Fleet display name |

### MTD Spend Breakdown by Agent

| Agent | MTD Cost |
|-------|---------|
| Concierge Agent | $420 |
| Insurance Underwriting Agent | $620 |
| Workforce Planning and Recruitment | $390 |
| Public Research Agent | $510 |
| Shipment Insight Agent | $400 |
| **Fleet Total** | **$2,340** |

### Active Demo Scenarios

| Signal | Agent | Value | Threshold | Surface |
|--------|-------|-------|-----------|---------|
| Quality regression | Public Research Agent | Eval 0.61 | Gate 0.80 | Insights → Signals & Drift |
| Anomaly score | Insurance Underwriting Agent | Score 79 | Threshold 75 | Insights → Signals & Drift |
| Fresh deployment + regression | Workforce Planning and Recruitment | Deployed recently; eval 0.87 | Gate 0.80 | Registry → Agent Registry; HITL |
| HITL pending (Critical) | Workforce Planning and Recruitment | submit_compliance_report | 3-min SLA | Workbench → Manual Overrides |
| Hallucination breach | Concierge Agent | Rate 0.34 | Threshold 0.20 | Insights → Guardrails |

---

## Tech Stack

| Package | Version | Purpose |
|---------|---------|---------|
| `react` | ^19.2.3 | UI framework |
| `react-dom` | ^19.2.3 | DOM rendering |
| `antd` | ^6.3.7 | Component library (Ant Design v6) |
| `@ant-design/icons` | ^6.2.2 | Ant Design icon set |
| `lucide-react` | ^1.14.0 | Supplemental icon set |
| `recharts` | ^2.15.4 | Charting library |
| `tailwindcss` | ^3.4.19 | Utility-first CSS |
| `prism-react-renderer` | ^2.4.1 | Syntax highlighting for code blocks |
| `@radix-ui/react-tooltip` | ^1.2.8 | Accessible tooltip primitive |
| `react-scripts` | 5.0.1 | CRA build toolchain |
| `web-vitals` | ^2.1.4 | Performance measurement |

---

## Authentication

### Roles

| Role | `userRole` value | Description |
|------|-----------------|-------------|
| Admin | `'admin'` | Full access — all modules, write operations, fine-tuning, admin settings |
| Viewer | `'user'` | Read access — write-destructive operations are gated |

Sessions use `sessionStorage` for `access_token` and `role`. The `username` is stored in `localStorage`. Role is read by `App.js` on mount.

### Demo Credentials

| Username | Password | Role |
|----------|----------|------|
| `admin` | `admin123` | admin |
| `senthil` | `dsxops` | admin |
| `user` | `user123` | user |
| `viewer` | `viewer123` | user |

---

## Documentation

| File | Contents |
|------|----------|
| `docs/architecture.md` | Navigation model, tab map, context system, sidebar design |
| `docs/developer-guide.md` | Project structure, context hooks, design system, component reference, module inventory |
| `docs/technical-specs.md` | Full API function catalogue, data schemas, state management |
| `docs/operations-guide.md` | Runbook library, self-healing rules, fleet operations, escalation workflow |
| `docs/security-compliance.md` | Trust interceptors, hallucination control, HITL, audit trail, RBAC |

---

## Deployment / Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `REACT_APP_API_URL` | `http://<hostname>:4000` | Backend API base URL |
| `REACT_APP_SSO_USER` | `Senthil` | SSO mock username |
| `REACT_APP_SSO_DISPLAY` | `Senthil` | SSO mock display name |
| `REACT_APP_SSO_EMAIL` | `senthil@veritas.demo` | SSO mock email |

When `REACT_APP_API_URL` is not set, the frontend auto-detects the current hostname and targets port `4000`. All API functions fall back to local mock data when the backend returns a network error or HTTP 4xx/5xx.

---

---

## Build Toolchain — Roadmap Note (L-6)

VeriForge Ops currently uses **Create React App (`react-scripts@5.0.1`)**, which was archived by the React team in 2023. The CRA toolchain is functional for the 1.0-alpha release but is no longer maintained upstream, meaning security patches will not be backported.

**Planned migration path (post-alpha):** Migrate to [Vite](https://vitejs.dev/) with `@vitejs/plugin-react`. Key steps:

1. Replace `react-scripts` with `vite` + `@vitejs/plugin-react`
2. Move `public/index.html` → `index.html` (root); update asset references
3. Replace `REACT_APP_*` env vars with `VITE_*` and update `import.meta.env` references
4. Update `tailwind.config.js` `content` glob to include `./index.html`
5. Validate build output; adjust `npm run build` scripts and CI pipeline

This migration is not a blocking item for alpha but should be scheduled before the 1.0.0 GA release to ensure a supportable, performant build pipeline.

---

*Maintained by the Cognizant AI Practice Engineering team.*

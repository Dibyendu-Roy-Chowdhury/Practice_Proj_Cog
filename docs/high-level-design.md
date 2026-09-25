# VeriForge Ops — High-Level Design Document

**Version:** 1.0  
**Date:** June 2026  
**Author:** Cognizant AI & Data Business Unit  
**Classification:** Internal — Confidential

---

## 1. Executive Summary

VeriForge Ops is an enterprise-grade, single-pane-of-glass **Agentic Operations Platform (AgentOps)** built to manage, monitor, govern, and remediate fleets of autonomous AI agents deployed across enterprise production environments. It bridges the gap between experimental AI deployments and **Industrial-scale AI Operations**, providing platform engineering and operations teams with a unified control surface across the full agent lifecycle.

---

## 2. System Context

### 2.1 Context Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         ENTERPRISE ENVIRONMENT                           │
│                                                                          │
│  ┌────────────┐   ┌────────────┐   ┌────────────┐   ┌────────────────┐  │
│  │  Platform  │   │ Operations │   │  Security  │   │  Executive /   │  │
│  │  Engineer  │   │  Engineer  │   │   Analyst  │   │  CIO / CTO     │  │
│  └─────┬──────┘   └─────┬──────┘   └─────┬──────┘   └───────┬────────┘  │
│        │                │                │                   │           │
│        └────────────────┴────────────────┴───────────────────┘           │
│                                    │                                      │
│                        ┌───────────▼────────────┐                        │
│                        │                        │                        │
│                        │     VERIFORGE OPS      │                        │
│                        │  (Browser / Web App)   │                        │
│                        │                        │                        │
│                        └───────────┬────────────┘                        │
│                                    │ HTTPS / REST API                    │
│                        ┌───────────▼────────────┐                        │
│                        │   VeriForge Ops API    │                        │
│                        │   (Node.js/Express)    │                        │
│                        └──┬────────┬────────┬───┘                        │
│                           │        │        │                            │
│              ┌────────────┘        │        └────────────┐              │
│              │                     │                     │              │
│   ┌──────────▼──────┐  ┌───────────▼──────┐  ┌──────────▼──────────┐  │
│   │    MongoDB       │  │  Cloud Provider  │  │   AI Agent Fleet    │  │
│   │  (Persistence)   │  │  Log Sources     │  │  (AWS/Azure/GCP)    │  │
│   │                  │  │  (CloudWatch,    │  │                     │  │
│   │  - Agents        │  │   Azure Monitor, │  │  - Concierge        │  │
│   │  - Users         │  │   Vertex Logs)   │  │  - Underwriting     │  │
│   │  - Alerts        │  └──────────────────┘  │  - Research         │  │
│   │  - Audit Logs    │                         │  - Shipment         │  │
│   │  - HITL Queue    │                         │  - Protocol Auth    │  │
│   └──────────────────┘                         └─────────────────────┘  │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Key Actors

| Actor | Role | Primary Modules |
|-------|------|----------------|
| **Platform Engineer** | Manages agent lifecycle, deployments, model routing | Registry, Workbench |
| **Operations Engineer** | Monitors fleet health, executes runbooks, handles HITL | Core, Insights, Workbench |
| **Security Analyst** | Reviews guardrails, trust interceptors, compliance | Insights (Safety), Admin |
| **FinOps Analyst** | Tracks spend, optimizes costs, sets budgets | FinOps |
| **Executive / CIO** | Reviews fleet health score, KPIs, risk posture | Core |
| **AI Admin** | Manages platform config, users, system settings | Admin |

---

## 3. Architectural Overview

### 3.1 High-Level Architecture Diagram

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        VERIFORGE OPS PLATFORM                           ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                          ║
║  ┌─────────────────────────────────────────────────────────────────┐    ║
║  │                     PRESENTATION LAYER                          │    ║
║  │                    React 19 SPA (CRA)                           │    ║
║  │                                                                 │    ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │    ║
║  │  │  Core    │  │ Insights │  │ FinOps   │  │  Workbench    │  │    ║
║  │  │ Module   │  │ Module   │  │ Module   │  │  Module       │  │    ║
║  │  │          │  │ (4 tabs) │  │ (2 tabs) │  │  (4 tabs)     │  │    ║
║  │  └──────────┘  └──────────┘  └──────────┘  └───────────────┘  │    ║
║  │  ┌──────────┐  ┌──────────┐                                    │    ║
║  │  │ Registry │  │  Admin   │                                    │    ║
║  │  │ Module   │  │ Module   │                                    │    ║
║  │  │ (2 tabs) │  │ (2 tabs) │                                    │    ║
║  │  └──────────┘  └──────────┘                                    │    ║
║  │                                                                 │    ║
║  │  ┌─────────────────────────────────────────────────────────┐   │    ║
║  │  │              AppShell (State-based Navigation)          │   │    ║
║  │  │   EnvironmentCtx │ TenantCtx │ PersonaCtx │ TriageCtx   │   │    ║
║  │  └─────────────────────────────────────────────────────────┘   │    ║
║  │                                                                 │    ║
║  │  ┌──────────────────────┐   ┌────────────────────────────────┐ │    ║
║  │  │  API Services Layer  │   │  Mock Data Fallback Engine     │ │    ║
║  │  │  (API_services.js)   │   │  (mock_data.js — Veritas demo) │ │    ║
║  │  └──────────┬───────────┘   └────────────────────────────────┘ │    ║
║  └─────────────┼───────────────────────────────────────────────────┘    ║
║                │ HTTPS REST / JSON                                       ║
║  ┌─────────────▼───────────────────────────────────────────────────┐    ║
║  │                       API LAYER                                 │    ║
║  │                  Node.js 18 / Express 4                         │    ║
║  │                                                                 │    ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    ║
║  │  │   Auth   │  │  Agents  │  │ Metrics  │  │    HITL      │   │    ║
║  │  │  Router  │  │  Router  │  │  Router  │  │   Router     │   │    ║
║  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │    ║
║  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │    ║
║  │  │   Mesh   │  │   Ops    │  │  Trust   │  │   Runbooks   │   │    ║
║  │  │  Router  │  │  Router  │  │  Router  │  │   Router     │   │    ║
║  │  └──────────┘  └──────────┘  └──────────┘  └──────────────┘   │    ║
║  │  [ + 11 more route groups: Governance, Healing, XOps, Causal,  │    ║
║  │    Logs, Audit, Deploy, CICD, Admin, Platform, Alerts ]        │    ║
║  │                                                                 │    ║
║  │  ┌─────────────────────────────────────────────────────────┐   │    ║
║  │  │    Middleware: JWT Auth │ RBAC │ Helmet │ CORS │ Morgan  │   │    ║
║  │  └─────────────────────────────────────────────────────────┘   │    ║
║  └─────────────┬───────────────────────────────────────────────────┘    ║
║                │                                                         ║
║  ┌─────────────▼───────────────────────────────────────────────────┐    ║
║  │                     DATA LAYER                                  │    ║
║  │                  MongoDB (Mongoose ODM)                         │    ║
║  │                                                                 │    ║
║  │  Core: Agent │ User │ Session │ Deployment                      │    ║
║  │  Monitoring: Alert │ Anomaly │ CircuitBreaker │ PortalLog        │    ║
║  │  HITL: HitlQueue │ HitlHistory │ TrustInterceptor               │    ║
║  │  Mesh: MeshRoutingRule │ MeshQuarantine │ InterAgentMessage      │    ║
║  │  Ops: Runbook │ SelfHealingRule │ InterventionLog               │    ║
║  │  Cost: AgentCostMetric │ DailyCostMetric │ EpisodeCost           │    ║
║  └─────────────────────────────────────────────────────────────────┘    ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
```

### 3.2 Deployment Architecture Diagram

```
                         ┌─────────────────────┐
                         │   User Browser      │
                         │   (HTTPS:443)       │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  GKE Ingress        │
                         │  (LoadBalancer)     │
                         │  External IP        │
                         └──────┬──────┬───────┘
                                │      │
              ┌─────────────────┘      └─────────────────┐
              │                                           │
   ┌──────────▼──────────┐                  ┌────────────▼────────────┐
   │  Frontend Service   │                  │  Backend Service        │
   │  (NodePort 8080)    │                  │  (ClusterIP 4000)       │
   └──────────┬──────────┘                  └────────────┬────────────┘
              │                                           │
   ┌──────────▼──────────┐                  ┌────────────▼────────────┐
   │  Frontend Pods (x2) │                  │  Backend Pods (x2)      │
   │  nginx:unprivileged │                  │  node:18-alpine         │
   │  Port 8080          │                  │  Port 4000              │
   │  Namespace:         │                  │  Namespace:             │
   │  veriforgeops       │                  │  veriforgeops           │
   └─────────────────────┘                  └────────────┬────────────┘
                                                         │
                                            ┌────────────▼────────────┐
                                            │  MongoDB StatefulSet    │
                                            │  (x1 replica)           │
                                            │  PersistentVolumeClaim  │
                                            │  Port 27017             │
                                            └─────────────────────────┘

   CI/CD Pipeline:
   ┌──────────┐    push    ┌──────────────┐  build  ┌────────────┐  deploy ┌──────┐
   │  GitHub  │──────────▶│  Cloud Build │────────▶│    GCR     │────────▶│ GKE  │
   │  main    │            │  (GCP)       │         │ (Registry) │         │      │
   └──────────┘            └──────────────┘         └────────────┘         └──────┘

   Secrets/Config:
   ┌────────────────────────────────────────────────────────┐
   │  Kubernetes Secrets: MONGO_URI, JWT_SECRET, API Keys   │
   │  ConfigMap: NODE_ENV, PORT, ALLOWED_ORIGINS, etc.      │
   └────────────────────────────────────────────────────────┘
```

---

## 4. Module Architecture

### 4.1 Module Map

```
┌──────────────────────────────────────────────────────────┐
│                    VERIFORGE OPS MODULES                 │
├────────────┬─────────────────────────────────────────────┤
│  NAV KEY   │  MODULE (Tabs)                              │
├────────────┼─────────────────────────────────────────────┤
│    [8]     │  CORE                                       │
│            │  └── Fleet health score + KPI dashboard     │
├────────────┼─────────────────────────────────────────────┤
│    [1]     │  INSIGHTS                                   │
│            │  ├── Tab 1: Fleet Health (per-agent metrics)│
│            │  ├── Tab 2: Fleet Events (telemetry feed)   │
│            │  ├── Tab 3: Signals & Drift (anomaly/drift) │
│            │  └── Tab 4: Safety & Guardrails (trust)     │
├────────────┼─────────────────────────────────────────────┤
│   [12]     │  FINOPS                                     │
│            │  ├── Tab 1: Spend Analysis                  │
│            │  └── Tab 2: Cost Optimization               │
├────────────┼─────────────────────────────────────────────┤
│    [2]     │  WORKBENCH                                  │
│            │  ├── Tab 1: Troubleshooting (investigation) │
│            │  ├── Tab 2: Runbooks (remediation)          │
│            │  ├── Tab 3: Manual Overrides (HITL queue)   │
│            │  └── Tab 4: Incident Recovery (self-heal)   │
├────────────┼─────────────────────────────────────────────┤
│    [7]     │  REGISTRY                                   │
│            │  ├── Tab 1: Agent Registry                  │
│            │  └── Tab 2: Model Registry + Routing        │
├────────────┼─────────────────────────────────────────────┤
│    [4]     │  ADMIN                                      │
│            │  ├── Tab 1: Platform Settings + Users       │
│            │  └── Tab 2: AI Assistant                    │
└────────────┴─────────────────────────────────────────────┘
```

### 4.2 The Golden Thread (Cross-Module Navigation Flow)

```
  SIGNAL DETECTED                          RESOLUTION
       │                                       ▲
       ▼                                       │
┌─────────────┐   drill-down   ┌──────────────┐  self-heal / HITL
│    CORE     │───────────────▶│   INSIGHTS   │──────────────────┐
│  Health     │                │  Signals &   │                  │
│  Score KPI  │                │  Drift tab   │                  ▼
└─────────────┘                └──────┬───────┘    ┌──────────────────┐
                                      │             │   WORKBENCH      │
                             WorkbenchCTA           │  Troubleshoot /  │
                                      └───────────▶ │  HITL / Recover  │
                                                    └──────────────────┘
                                                           │
                                                    ┌──────▼───────┐
                                                    │   REGISTRY   │
                                                    │  Rollback /  │
                                                    │  Re-deploy   │
                                                    └──────────────┘
```

---

## 5. Component Architecture

### 5.1 Frontend Component Hierarchy

```
App.js
├── ConfigProvider (Ant Design theme)
├── EnvironmentContext.Provider
├── TenantContext.Provider
├── PersonaContext.Provider
└── AppShell.jsx  ← State machine: selectedKey + navParams
    ├── Sidebar (nav keys 8,1,12,2,7,4)
    ├── TopBar (environment switcher, tenant switcher, user menu)
    └── <Page> (lazy-loaded per nav key)
        ├── PageHeader.jsx
        └── [Module-specific Tabs & Components]
            ├── Common: MetricCard, KpiBar, Badge, CodeBlock, EmptyState
            ├── Charts: Recharts (LineChart, BarChart, PieChart, AreaChart)
            └── Feature: IncidentWarRoom, AgentMesh, RunbookExecution
```

### 5.2 Backend Component Hierarchy

```
server.js  ← Entry point (port 4000)
└── app.js  ← Express app
    ├── Middleware Stack
    │   ├── helmet()          — Security headers
    │   ├── cors()            — Origin allowlist
    │   ├── express.json()    — Body parsing
    │   └── morgan()          — HTTP logging
    ├── Public Routes
    │   └── /api/auth/*  ← auth.routes.js → auth.controller.js
    ├── Protected Routes (JWT middleware)
    │   ├── /api/agents/*     → agents.controller.js
    │   ├── /api/metrics/*    → metrics.controller.js
    │   ├── /api/alerts/*     → alerts.controller.js
    │   ├── /api/hitl/*       → hitl.controller.js
    │   ├── /api/mesh/*       → mesh.controller.js
    │   ├── /api/governance/* → governance.controller.js
    │   ├── /api/healing/*    → healing.controller.js
    │   ├── /api/trust/*      → trust.controller.js
    │   ├── /api/xops/*       → xops.controller.js
    │   ├── /api/causal/*     → causal.controller.js
    │   ├── /api/logs/*       → logs.controller.js
    │   ├── /api/audit/*      → audit.controller.js
    │   ├── /api/deploy/*     → deploy.controller.js
    │   ├── /api/cicd/*       → cicd.controller.js
    │   ├── /api/runbooks/*   → runbooks.controller.js
    │   ├── /api/ops/*        → ops.controller.js
    │   ├── /api/platform/*   → platform.controller.js
    │   └── /api/admin/*      → admin.controller.js (requireAdmin)
    └── Error Handler Middleware
```

---

## 6. Data Architecture

### 6.1 Data Model Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      CORE ENTITIES                           │
│                                                              │
│  ┌──────────────┐        ┌──────────────┐                    │
│  │    User      │        │    Agent     │                    │
│  │──────────────│        │──────────────│                    │
│  │ username     │        │ agent_id     │                    │
│  │ password     │        │ name         │                    │
│  │ role         │        │ provider     │                    │
│  │ status       │        │ model_id     │                    │
│  └──────┬───────┘        │ status       │                    │
│         │                │ version      │                    │
│  ┌──────▼───────┐        │ version_hist │                    │
│  │   Session    │        └──────┬───────┘                    │
│  │──────────────│               │                            │
│  │ token        │     ┌─────────┼─────────┐                  │
│  │ user_id      │     │         │         │                  │
│  │ expires_at   │     ▼         ▼         ▼                  │
│  └──────────────┘  Alert  Anomaly  Deployment               │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                   MONITORING ENTITIES                        │
│                                                              │
│  Agent ──┬──▶ Alert (critical / warning)                     │
│           ├──▶ Anomaly (score, type, timestamp)              │
│           ├──▶ CircuitBreaker (state, trigger count)         │
│           ├──▶ AgentCostMetric (MTD, model, tokens)          │
│           ├──▶ EpisodeCost (per-invocation cost)             │
│           └──▶ DailyCostMetric (fleet 30-day trend)          │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  GOVERNANCE ENTITIES                         │
│                                                              │
│  Agent ──┬──▶ HitlQueue (pending HITL, risk tier, SLA)      │
│           ├──▶ HitlHistory (decisions, reviewer, timestamp)  │
│           ├──▶ TrustInterceptor (type, status, event count)  │
│           └──▶ SelfHealingRule (trigger, action, enabled)    │
│                                                              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                  MESH / MULTI-AGENT ENTITIES                 │
│                                                              │
│  Agent ──┬──▶ MeshRoutingRule (model selection policy)       │
│           ├──▶ MeshQuarantine (isolated agent, reason)       │
│           └──▶ InterAgentMessage (source, target, payload)   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 API Data Flow

```
   Browser                 API Server               MongoDB
      │                        │                       │
      │  GET /api/agents       │                       │
      │───────────────────────▶│                       │
      │                        │  Agent.find({})       │
      │                        │──────────────────────▶│
      │                        │◀──────────────────────│
      │◀───────────────────────│                       │
      │  [{ agent_id, ... }]   │                       │
      │                        │                       │
      │  [Backend unreachable] │                       │
      │  ← Mock fallback ─────▶│ (API_services.js      │
      │  ← MOCK_AGENTS ────────│  catches network err) │
```

---

## 7. Security Architecture

### 7.1 Security Layers

```
┌─────────────────────────────────────────────────────────┐
│                   SECURITY ARCHITECTURE                 │
│                                                         │
│  LAYER 1: Transport                                     │
│  ├── HTTPS/TLS (GKE Ingress termination)                │
│  └── HSTS enforcement                                   │
│                                                         │
│  LAYER 2: Network                                       │
│  ├── CORS origin allowlist (env-configured)             │
│  └── Kubernetes NetworkPolicy (namespace isolation)     │
│                                                         │
│  LAYER 3: HTTP Headers (Helmet.js)                      │
│  ├── Content-Security-Policy (script-src, object-src)   │
│  ├── X-Frame-Options (frameguard)                       │
│  └── Referrer-Policy                                    │
│                                                         │
│  LAYER 4: Authentication                               │
│  ├── JWT (jsonwebtoken, exp + signature)                │
│  ├── bcryptjs password hashing                          │
│  └── Session persistence (MongoDB, expiring)            │
│                                                         │
│  LAYER 5: Authorization (RBAC)                          │
│  ├── role: 'admin' — full access                        │
│  ├── role: 'user'  — read-only                          │
│  └── requireAdmin middleware on destructive endpoints   │
│                                                         │
│  LAYER 6: AI Guardrails (Trust Interceptors)            │
│  ├── Prompt Injection Guard                             │
│  ├── PII Redaction (emails, keys, cards, phones)        │
│  ├── Credential Guard                                   │
│  ├── Output Filtering (policy violations)               │
│  ├── RAG Grounding Guard                                │
│  └── Compliance Screen (MiFID II, GDPR, AML)            │
│                                                         │
│  LAYER 7: Human-in-the-Loop (HITL)                      │
│  ├── Critical — L3 sign-off (immediate)                 │
│  ├── High     — L2/L3 review (5-min SLA)                │
│  ├── Medium   — L1/L2 review (15-min SLA)               │
│  └── Low      — Auto-approved or 1-hr review            │
│                                                         │
│  LAYER 8: Audit                                         │
│  ├── PortalLog — all user actions timestamped           │
│  ├── Causal trace — agent execution traces              │
│  └── PII masking in all log output                      │
└─────────────────────────────────────────────────────────┘
```

### 7.2 RBAC Matrix

| Action | admin | user |
|--------|-------|------|
| View all modules | ✓ | ✓ |
| Register / update agent | ✓ | ✗ |
| Rollback agent version | ✓ | ✗ |
| Execute runbooks | ✓ | ✗ |
| Approve HITL requests | ✓ | ✗ |
| Manage users | ✓ | ✗ |
| Rotate API keys | ✓ | ✗ |
| Configure routing rules | ✓ | ✗ |
| View audit logs | ✓ | ✓ |
| View cost / spend | ✓ | ✓ |
| View guardrail status | ✓ | ✓ |

---

## 8. Integration Architecture

### 8.1 Cloud Provider Integrations

```
┌──────────────────────────────────────────────────────────────┐
│              CLOUD PROVIDER INTEGRATION LAYER                │
│                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   AWS Bedrock   │  │  Azure OpenAI    │  │  GCP       │  │
│  │─────────────────│  │──────────────────│  │ Vertex AI  │  │
│  │ Claude 3/3.5    │  │ GPT-4/4-Turbo    │  │────────────│  │
│  │  - Haiku        │  │ GPT-3.5          │  │ Gemini 1.5 │  │
│  │  - Sonnet v2    │  │ Mistral          │  │  Pro/Flash │  │
│  │  - Opus         │  └──────────────────┘  │ Gemini 2.0 │  │
│  │ Claude Sonnet   │                         │ PaLM 2     │  │
│  │  4.5            │  ┌──────────────────┐  └────────────┘  │
│  │ Amazon Nova Pro │  │  OpenAI (Direct) │                  │
│  └─────────────────┘  │──────────────────│  ┌────────────┐  │
│                        │ GPT-4o           │  │ Meta /     │  │
│  ┌─────────────────┐  │ GPT-4 Turbo      │  │ Mistral    │  │
│  │  CloudWatch     │  │ GPT-4o Mini      │  │────────────│  │
│  │  (Log Sync)     │  └──────────────────┘  │ LLaMA 3    │  │
│  └─────────────────┘                         │ 70B / 8B   │  │
│                                              │ Mistral    │  │
│  Log sources feed /api/logs/* endpoints      │ Large / 7B │  │
│  Model providers feed Agent Registry         └────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### 8.2 External System Integrations (Planned/Demo)

| System | Integration Type | Purpose |
|--------|-----------------|---------|
| **Jira** | REST API (outbound) | Incident escalation from Workbench |
| **CloudWatch** | Log streaming (inbound) | Agent log sync |
| **Azure Monitor** | Log streaming (inbound) | Agent log sync |
| **Vertex Logging** | Log streaming (inbound) | Agent log sync |
| **PagerDuty** | Webhook (planned) | Alert escalation |
| **Slack** | Webhook (planned) | HITL notifications |

---

## 9. Feature Gate Architecture

```
┌──────────────────────────────────────────────────────────┐
│                  FEATURE GATE SYSTEM                     │
│               (src/config/featureGates.js)               │
│                                                          │
│  Deployment Profiles                                     │
│  ├── 'customer-demo'  — full feature set for demos       │
│  ├── 'alpha'          — subset, some gates closed        │
│  └── 'production'     — gates toggled per customer       │
│                                                          │
│  Gate Categories                                         │
│  ├── Module-level gates (core.overview, insights.health) │
│  ├── Tab-level gates  (finops.optimize.whatif → LOCKED)  │
│  └── Action-level    (registry.fleet.deleteAgent → LOCKED│
│                        workbench.runbooks.execute → LOCKED│
│                        in alpha)                         │
│                                                          │
│  UI Enforcement                                          │
│  ├── gatedTab()      — tab renders as "Coming Soon"      │
│  ├── GatedAction     — button disabled with tooltip      │
│  └── LockedFeature   — full panel replaced with lock UI  │
└──────────────────────────────────────────────────────────┘
```

---

## 10. Key Design Decisions

### 10.1 Decision Log

| # | Decision | Rationale | Trade-off |
|---|----------|-----------|-----------|
| D-1 | State-based navigation (no React Router) | Simpler deep linking via `onNavigate(key, params)`; no URL management | No bookmarkable URLs, browser back button not supported |
| D-2 | Centralized API service layer (`API_services.js`) | Single fallback point; mock/real data switching in one place | Large file (2,555 lines), risk of becoming a god object |
| D-3 | Mock-first fallback engine | Demo without a running backend; sales demos offline | Mock drift — mock data may not stay in sync with schema changes |
| D-4 | MongoDB over relational DB | Flexible schema for diverse agent telemetry; JSON-native | No joins — denormalized data, some redundancy |
| D-5 | JWT + Session hybrid | Stateless JWT for scalability + DB session for revocation | Slight overhead on session lookup per request |
| D-6 | No external state management (Redux/Zustand) | Keeps complexity low for 1.0-alpha scope | Cross-component state sharing is ad-hoc via contexts |
| D-7 | Feature gates over code removal | Safely ship partial features to demo; toggle by profile | Gates must be cleaned up before GA — tech debt accumulation |
| D-8 | Create React App (CRA) as build tool | Fast initial setup | CRA archived in 2023; Vite migration needed before GA |

---

## 11. Non-Functional Requirements (Technical)

| Attribute | Target | Implementation |
|-----------|--------|----------------|
| **Availability** | 99.9% | GKE multi-pod, health endpoint `/health` |
| **Scalability** | Horizontal pod autoscaling | Kubernetes HPA on backend pods |
| **Security** | OWASP Top 10 mitigated | Helmet, JWT, bcrypt, CORS, RBAC |
| **Observability** | Full audit trail | PortalLog, causal traces, Morgan HTTP logs |
| **Data Privacy** | PII protected | Auto-masking in logs, client-side redaction display |
| **Compliance** | MiFID II, GDPR, AML | Compliance Screen interceptor |
| **Performance** | <2s page load | Lazy-loaded bundles, Nginx gzip |
| **Portability** | Multi-cloud | Kubernetes + Docker; AWS/Azure/GCP model support |

---

## 12. Technology Stack Summary

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Frontend Framework | React | 19.2.3 | With hooks, lazy loading |
| UI Component Library | Ant Design | 6.3.7 | Full theming via tokens |
| CSS Framework | Tailwind CSS | 3.4.19 | Utility-first, 8px grid |
| Data Visualization | Recharts | 2.15.4 | Line, Bar, Pie, Area charts |
| Build Tool | Create React App | 5.0.1 | **Deprecation risk — migrate to Vite** |
| Backend Framework | Express | 4.18.3 | REST API, middleware-first |
| Runtime | Node.js | 18 LTS | Alpine image in production |
| Database | MongoDB | 7.x | Via Mongoose 8.3.4 ODM |
| Authentication | jsonwebtoken + bcryptjs | 9.0.2 / 2.4.3 | JWT + session hybrid |
| Container | Docker | Multi-stage | Non-root runtime user |
| Orchestration | Kubernetes (GKE) | — | Namespace: veriforgeops |
| CI/CD | Google Cloud Build | — | GCR image registry |
| Web Server | Nginx (unprivileged) | — | Port 8080, gzip enabled |

---

*Document maintained by Cognizant AI & Data BU — VeriForge Ops Engineering Team*

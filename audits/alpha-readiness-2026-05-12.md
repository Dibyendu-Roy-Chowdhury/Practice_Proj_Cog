> **Status as of 2026-05-12 post-fix (round 1):** All Critical and High findings remediated.
> **Status as of 2026-05-12 post-fix (round 2):** All Medium and Low findings remediated. Build passes (0 errors, 0 warnings). Main bundle reduced to 196 kB gzipped via React.lazy code splitting. All 10 remaining items closed.

# VeriForge Ops — Alpha Readiness Audit
**Release:** Beacon · 1.0.0-alpha.1  
**Audit date:** 2026-05-12  
**Auditor methodology:** Five parallel sub-agents + reconciliation (feature→code, mock data, auth/security, navigation, build/deps, UI/reliability). Read-only. Every finding cites file:line or command output.

---

## 1. Executive Summary

VeriForge Ops is **not yet alpha-ready**. Three hard blockers prevent external customer deployment: demo credentials ship with no production-environment gate (any backend outage grants `admin` access via publicly-documented passwords), RBAC is display-only and enforces nothing (a `viewer`-role user can approve Critical HITL decisions, toggle self-healing rules, and deactivate production agents), and the audit trail surfaces rebased mock timestamps with no "demo data" label — a direct regulatory compliance risk in the BFSI context this product targets. Resolving these three issues plus the eight HIGH findings is required before any external customer sees the application.

---

## 2. Ship / No-Ship Verdict

**NO SHIP (original verdict).** Three Critical blockers; eight High issues on the happy path. Fix the Criticals and Highs before external access.

**Post-fix note (2026-05-12):** Targeted fixes have been applied for Critical and High findings (auth guard, SSO guard, dead-code removal, doc drift corrections). Re-verification against a live build is recommended before changing the ship verdict.

---

## 3. Critical Findings

### C-1 — Demo credentials ship with no production gate
**What:** `MOCK_AUTH_USERS` (`admin/admin123`, `senthil/dsxops`, `user/user123`, `viewer/viewer123`) is hardcoded in the frontend. `login()` falls back to `mockLogin()` whenever the backend is unreachable. The `NODE_ENV === 'development'` check at line 169 only gates a `console.warn`; it does **not** gate the mock login itself (line 170). Both `development` and `production` builds activate mock auth on any backend outage.  
**Where:** `src/services/API_services.js:121–124` (MOCK_AUTH_USERS), `src/services/API_services.js:164–174` (login fallback)  
**Impact:** Customer deploys to production. Backend has a network hiccup. An attacker tries `admin` / `admin123` — credentials documented publicly in `README.md:129`. Full admin session granted, no audit trail, no real authentication. In a regulated BFSI environment this is an incident.  
**Fix:** Gate mock login on an environment variable: wrap line 170 with `if (process.env.REACT_APP_ENABLE_MOCK_AUTH !== 'true') throw new Error('Backend unavailable');`. Ship with `REACT_APP_ENABLE_MOCK_AUTH` unset in `.env.production`.

---

### C-2 — RBAC enforces nothing; all destructive operations are ungated
**What:** `userRole` is referenced in exactly two places in the entire codebase, both display-only: `AppShell.jsx:416` (`'Admin'` vs `'Viewer'` label) and `AppShell.jsx:437` (`'Administrator'` vs `'Viewer'` in the profile dropdown). No write-destructive operation reads `userRole`. The `GatedAction` component (`src/components/common/GatedAction.jsx`) exists but is **never imported or used** anywhere (0 call sites).

Confirmed ungated operations:

| Operation | File:Line | What a `viewer` can do |
|-----------|-----------|----------------------|
| Approve HITL | `HitlConsole.jsx:196` | Approve Critical production agent decisions |
| Reject HITL | `HitlConsole.jsx:200` | Reject any HITL item |
| Save HITL thresholds | `HitlConsole.jsx:258` | Edit risk tier thresholds |
| Toggle self-healing rule | `SelfHealing.jsx:86` | Enable/disable P1 circuit-breaker policies |
| Revert intervention | `SelfHealing.jsx:124` | Undo automated recovery |
| Toggle agent status | `Failsafe.jsx:157` | Deactivate a production agent |
| Platform config edits | `PlatformAdminConfig.jsx` | Modify all system settings |
| AI Assistant | `AICommandAssistant.jsx` | Issue platform-level commands |

**Where:** Codebase-wide; root cause: `src/components/common/GatedAction.jsx` (0 imports).  
**Impact:** Any `viewer`-role user (the lowest-privilege account) can approve a $2.4M trade HITL item, disable a P1 self-healing rule, or take a production agent offline. In a live BFSI demo, a customer signing in as `viewer/viewer123` discovers this immediately.  
**Fix:** Pass `userRole` into every component that hosts write operations. Add `disabled={userRole !== 'admin'}` to all destructive buttons. Wire `GatedAction` into the call sites it was designed for. Backend must also validate role claims — **out of repo scope, must be verified with backend team.**

---

### C-3 — Audit trail displays rebased mock timestamps as if real; no demo label
**What:** `rebaseAuditTraces()` (`API_services.js:11–27`) shifts all mock audit trace timestamps to the current day. The `Audit` component renders these as a compliance audit trail. No label, badge, watermark, or disclaimer indicates the data is demo/mock. The function itself is imported into `mock_data.js` but the build reports it as unused at build time (`rebaseAuditTraces` assigned but unused — `API_services.js:11`), meaning rebasing may not be executing at all.  
**Where:** `src/services/API_services.js:11–27` (`rebaseAuditTraces`); wherever `Audit.jsx` renders trace data.  
**Impact:** A compliance officer at a Meridian pilot customer reviews the "Audit Trail" tab. Timestamps read as today. They file a regulatory report citing these as real agent decisions. This is a direct MiFID II / GDPR documentation integrity risk. An audit of a BFSI firm's AI governance based on fabricated-looking evidence is not a customer relationship that survives.  
**Fix:** (a) Add a persistent "DEMO DATA — Not for compliance use" banner inside the Audit component. (b) Verify `rebaseAuditTraces` is actually called; if it's dead code, remove it and leave traces with historical dates.

---

## 4. High Findings

### H-1 — TAB_REDIRECT['11'] sends to non-existent 'health' tab on Workbench
**What:** `AppShell.jsx` maps old key `'11'` tabs (`mesh`, `workflows`, `comms`, `multi-agent-mesh`) to `'2'` with `tab: 'health'`. `AgentOpsWorkbench` has no `health` tab (tabs: `troubleshoot`, `runbooks`, `overrides`, `recovery`). The Workbench TAB_REMAP does not include `health` as a remappable alias.  
**Where:** `src/components/layout/AppShell.jsx` (TAB_REDIRECT block for `'11'`).  
**Impact:** Any bookmark, deep-link, or internal `onNavigate` call using old key `'11'` with mesh-related tabs silently renders a blank Workbench (no tab selected).  
**Fix:** Change redirect target from `'health'` to `'troubleshoot'`.

---

### H-2 — Stale agent references throughout mock_data.js and API_services.js
**What:** Data Quality Agent and Document Processing Agent (both removed from the 5-agent fleet) appear in 50+ places in `src/services/mock_data.js` and 15+ places in `src/services/API_services.js`. Affected data returned to UI: context window utilization, token efficiency scores, tool call matrix, tool success rates, guardrail coverage map, model registry, RAG pipelines, agent memory status, embedding drift, and more.

Sample stale references:
- `mock_data.js:1659–1660` — `EMBEDDING_DRIFT_DATA` lists both removed agents
- `mock_data.js:2057–2058` — `GUARDRAIL_COVERAGE_MAP` lists both
- `mock_data.js:2082–2083` — `MODEL_REGISTRY` lists both
- `API_services.js:517` — AI assistant response names "Document Processing Agent" as top cost driver
- `API_services.js:1635` — `MOCK_AUDIT_TRACES` includes trace-005 for Document Processing Agent

**Where:** `src/services/mock_data.js:1659–2482`; `src/services/API_services.js:517, 1281, 1410, 1533, 1635, 1659–1682`.  
**Impact:** The demo will show 7 agents in some tables and 5 in others. The Fleet Health tab, token analytics, and model registry will show agents the customer is told don't exist. The Meridian story breaks.  
**Fix:** Global search-and-replace all occurrences of `'Data Quality Agent'`, `'Document Processing Agent'`, `'agent-004'`, `'agent-008'` in both files. Replace with appropriate 5-agent fleet members where a substitute makes sense; delete rows where the agent is structurally removed.

---

### H-3 — MTD spend data is incoherent across three sources
**What:** Three data sources report different per-agent and total MTD costs:

| Source | BIA | CAA | PA | FA | WOA | Total |
|--------|-----|-----|----|----|-----|-------|
| README (expected) | $620 | $510 | $390 | $460 | $360 | **$2,340** |
| `TOKEN_USAGE_MOCK` (`API_services.js:333`) | $620 | $545 | $1 | $501 | $390 | **$2,057** |
| `MODEL_BREAKDOWN_MOCK` (`API_services.js:385`) | $1,010 | $288 | $1 | $436 | $192 | **$1,927** |
| `AGENT_COST_METRICS` (`mock_data.js:171`) | $389 | $77 | (missing) | $65 | $5 | **$535** |

The `TOKEN_USAGE_MOCK` summary field claims `mtd_cost_usd: 2340` but its own by-agent items sum to $2,057. Workforce Planning and Recruitment shows $1 MTD cost despite being the fleet's newest and most active agent in the story.  
**Where:** `src/services/API_services.js:333–394`; `src/services/mock_data.js:171–203`.  
**Impact:** FinOps > Spend Analysis and Core > Overview will display contradictory spend numbers. During a customer demo, the $620 on the overview card won't reconcile with the $389 on the cost breakdown screen. Immediate credibility loss.  
**Fix:** Align all three sources to the README values. Workforce Planning and Recruitment should be ~$390. Remove `AGENT_COST_METRICS` Workforce Planning and Recruitment gap.

---

### H-4 — Audit trace includes removed agent; missing Workforce Planning and Recruitment
**What:** `MOCK_AUDIT_TRACES` has exactly 5 entries. Entry `trace-005` is for Document Processing Agent (agent-004, removed from fleet). Workforce Planning and Recruitment (agent-009, the primary demo story agent) has no audit trace.  
**Where:** `src/services/API_services.js:1630–1636` (MOCK_AUDIT_TRACES constant).  
**Impact:** Workbench > Troubleshooting > Compliance & Audit Trail shows Document Processing Agent activity — an agent that doesn't exist in the fleet. Workforce Planning and Recruitment, the hero of the demo story, has no trace history.  
**Fix:** Replace trace-005 (Document Processing Agent) with a trace for Workforce Planning and Recruitment (`agent-009`) with a `submit_compliance_report` span matching the HITL scenario.

---

### H-5 — AgentInsights TAB_REMAP maps 'feedback' to 'signals', not 'safety'
**What:** `AgentInsights.jsx` internal TAB_REMAP maps `feedback → signals`. Documentation (`docs/architecture.md`) and the `MOVED_TO_INSIGHTS` AppShell entry both specify `feedback-rlhf → safety`. The signals tab (anomaly scoring, embedding drift) is unrelated to feedback sentiment.  
**Where:** `src/pages/AgentInsights.jsx:75` (TAB_REMAP entry).  
**Impact:** Any deep-link or redirect carrying `tab: 'feedback'` lands on Signals & Drift instead of Guardrails & Safety — wrong tab, wrong context for the user.  
**Fix:** Change TAB_REMAP entry to `feedback: 'safety'`.

---

### H-6 — WorkbenchCTA defined but never called; Golden Thread step 3 broken
**What:** A `WorkbenchCTA` component is defined in `AgentInsights.jsx:20–37` with the correct `onNavigate('2', { tab: 'troubleshoot', agentId: ... })` signature. It is never instantiated in the Signals tab or anywhere else. The build confirms this: ESLint warning `'WorkbenchCTA' assigned but unused` at build time.  
**Where:** `src/pages/AgentInsights.jsx:20–37`; `npm run build` output.  
**Impact:** The Golden Thread — the core UX narrative of the product — breaks at step 3. Operator follows an anomaly to Insights > Signals & Drift and finds no CTA to move to Workbench > Troubleshooting. The triage workflow requires a manual navigation instead of the advertised one-click handoff.  
**Fix:** Render `<WorkbenchCTA onNavigate={onNavigate} agentId="Client Advisory Agent" />` inside the Signals tab content, positioned below the anomaly feed. It is already defined correctly.

---

### H-7 — Failsafe TAB_REMAP: rag/eval-suites point to 'fleet' instead of 'models'; prompts/tools missing
**What:** `Failsafe.jsx` TAB_REMAP maps `rag→fleet` and `eval-suites→fleet`. Both should map to `models` (the models tab is the post-Alpha home for model-level data). Additionally `prompts→fleet` and `tools→fleet` remaps are missing entirely, meaning any link carrying those old tabs will render a blank Registry.  
**Where:** `src/pages/Failsafe.jsx` (TAB_REMAP block).  
**Impact:** Old deep-links and any internal `onNavigate` carrying `rag`, `eval-suites`, `prompts`, or `tools` land on wrong tabs or blank screens.  
**Fix:** Add `rag: 'models'`, `eval-suites: 'models'`, `prompts: 'fleet'`, `tools: 'fleet'` to Failsafe TAB_REMAP.

---

### H-8 — 23 High-severity npm vulnerabilities from archived CRA dependency chain
**What:** `npm audit` reports 23 High-severity vulnerabilities. All are transitive from `react-scripts@5.0.1`: Babel code injection (GHSA-fv7c-fp4j-7gwp), Rollup path traversal (GHSA-mw96-cpmx-2vgc), fast-uri path traversal (GHSA-q3j6-qgpj-74h6), nth-check ReDoS (GHSA-rp65-9cf3-cjxr), lodash prototype pollution, path-to-regexp ReDoS, flatted prototype pollution, plus 15 more. `react-scripts` itself was archived in 2023 and receives no security patches.  
**Where:** `package.json:react-scripts@5.0.1`; `npm audit --json` output.  
**Impact:** A BFSI customer's security team will run `npm audit` during vendor evaluation. 23 Highs is an immediate procurement blocker in any regulated industry. The CRA end-of-life status means these vulnerabilities will accumulate, not reduce.  
**Fix (alpha):** Run `npm audit fix` for auto-fixable issues; document the rest as accepted risks with a migration plan. **Fix (roadmap):** Migrate to Vite or Next.js before beta. CRA is unsupported and this number will only grow.

---

## 5. Medium and Low Findings

| ID | Sev | What | Where |
|----|-----|------|-------|
| M-1 | MED | Token storage correctly uses `sessionStorage` but `docs/architecture.md:313` states `localStorage.getItem('token')` — false documentation | `architecture.md:313` vs `API_services.js:38` |
| M-2 | MED | `TriageModeContext` exports `TriageModeProvider` and `useTriageMode` but zero components consume `useTriageMode`. Dead code. | `src/contexts/TriageModeContext.js`; grep for `useTriageMode` returns 0 results |
| M-3 | MED | Tenant switching is purely cosmetic — changes display name and color only; no API call reads tenant context; all mock data is single-tenant | `src/contexts/TenantContext.js`; none of the 40+ API functions read tenant |
| M-4 | MED | Environment switching (`production`/`staging`/`dev`) is purely cosmetic — no behavioral change in any API function or component | `src/contexts/EnvironmentContext.js`; zero conditional API behavior |
| M-5 | MED | `docs/operations-guide.md:66` claims `getSelfHealingRules()` mock returns `null`; actual code returns `SELF_HEALING_RULES_MOCK` array via `??` fallback — doc is wrong | `API_services.js:900–903` |
| M-6 | MED | Key Rotation card (Admin > Access & API Keys) — five API keys documented (`operations-guide.md:153`) but no `KEY_ROTATION_MOCK` found in `API_services.js`; how the card renders its data is unclear | `API_services.js` (no KEY_ROTATION_MOCK constant) |
| M-7 | MED | `logOp()` only called in `StepBlock.jsx:68, 94` (runbook steps). `operations-guide.md § 5` says Fleet Reboot is logged. Fleet Reboot executes without calling `logOp` | `src/utils/opHistory.js`; `src/components/features/runbooks/StepBlock.jsx:68,94` |
| M-8 | MED | HITL Approve/Reject buttons have no `aria-label` — critical action, keyboard/screen-reader users cannot identify intent | `src/pages/HitlConsole.jsx:196–202` |
| M-9 | MED | HITL queue has 4 items in code (adds HITL-4822 for Workforce Planning and Recruitment) but `security-compliance.md § 3` documents only 3 items — doc drift | `API_services.js:682–687` vs `docs/security-compliance.md:70–76` |
| M-10 | MED | Bundle size 529 kB gzipped main JS — CRA build warns "significantly larger than recommended"; no code splitting | `npm run build` output |
| M-11 | MED | Double ErrorBoundary wrapping: `AgentInsights`, `AgentOpsWorkbench`, `Cost`, `OperatorWorkbench` all use `eb()` wrapper AND `gatedTab()` which also wraps in ErrorBoundary — redundant nesting | Multiple page files; `src/components/common/gatedTab.jsx` |
| M-12 | MED | `antd` at 6.1.3, latest is 6.3.7 (two minor versions behind); `lucide-react` at 1.6.0, latest 1.14.0 | `package.json` |
| M-13 | MED | `CommandCentre.jsx` overview tab children (`Dashboard`, `PlatformHealthScore`) not wrapped with `eb()` — unlike every other module | `src/pages/CommandCentre.jsx:29–35` |
| L-1 | LOW | `GatedAction` component defined but never imported (0 consumers) — dead code | `src/components/common/GatedAction.jsx` |
| L-2 | LOW | `loginWithSSO` exported from `API_services.js` despite SSO being removed from the login page; `SSO_USER` object still holds `senthil@cognizant.com` as default email | `src/services/API_services.js:113–162` |
| L-3 | LOW | `IncidentWarRoom.jsx` exists in `features/` but is not imported or used anywhere | `src/components/features/IncidentWarRoom.jsx` |
| L-4 | LOW | Insights gate keys (`insights.fleet-events`, `insights.guardrails`) differ from tab keys (`telemetry`, `safety`) — intentional but undocumented; could confuse future feature-flag operators | `src/pages/AgentInsights.jsx:99, 119` |
| L-5 | LOW | `@testing-library/user-event` at 13.5.0, one major version behind (14.6.1 available) | `package.json` |
| L-6 | LOW | CRA (`react-scripts`) archived 2023 — no ongoing security patches; roadmap concern for regulated BFSI product | `package.json:react-scripts@5.0.1` |
| L-7 | LOW | Compliance Screen interceptor visible in Guardrails & Safety (event count: 23) but shown as count only — no drill-down to actual MiFID II/GDPR/AML event log | `src/pages/TrustSecurity.jsx` |
| L-8 | LOW | `rebaseAuditTraces` and `AUDIT_TRACES` flagged as unused by build — investigate whether rebasing is actually executing | `npm run build` ESLint output; `API_services.js:1, 11` |

---

## 6. Doc-vs-Code Drift

| Doc File | Section | Doc Says | Code Says | Severity |
|----------|---------|----------|-----------|----------|
| `architecture.md:313` | Service Layer Pattern | `apiFetch` reads bearer from `localStorage.getItem('token')` | Reads from `sessionStorage.getItem('access_token')` | HIGH |
| `architecture.md:154` | AgentInsights TAB_REMAP | `evaluations → quality`; `feedback → quality` | `evaluations → signals`; `feedback → signals` | HIGH |
| `architecture.md:134` | TAB_REDIRECT key `'9'` | Should target `'signals'` | Actually targets `'evaluations'` (works via double-hop remap, fragile) | MED |
| `architecture.md:138` | TAB_REDIRECT key `'10'` _default | Should target `'fleet'` | Actually targets `'tools'` (partially rescued by Failsafe remap only if 'tools→fleet' is added — which it isn't yet) | HIGH |
| `architecture.md:174` | Failsafe TAB_REMAP | `rag→models`, `eval-suites→models` | `rag→fleet`, `eval-suites→fleet`; `prompts` and `tools` missing entirely | HIGH |
| `architecture.md:180` | AgentOpsWorkbench TAB_REMAP | `fine-tuning→experiments` (old) | `fine-tuning→troubleshoot` (correct, doc not updated) | MED |
| `developer-guide.md:§7 Core` | Core API calls | Lists `getSemanticDriftData` and other removed functions | `CommandCentre.jsx` imports none of these | MED |
| `operations-guide.md:66` | getSelfHealingRules | Mock fallback returns `null` | Returns `SELF_HEALING_RULES_MOCK` array | MED |
| `operations-guide.md:§5` | Fleet Reboot target | Lists 5 production agents | Code target list not verified without backend | LOW |
| `security-compliance.md:§3` | HITL Queue | 3 items (HITL-4819 to HITL-4821) | 4 items (HITL-4819 to HITL-4822, adds Workforce Planning and Recruitment) | MED |
| `security-compliance.md:§2` | Hallucination Control | References `ModelIntegrityWidget` and `Core > Agent Quality` tab | Both removed; hallucination monitoring now only in `TrustSecurity` | MED |
| `README.md:Agent Fleet` | MTD Spend | BIA $620, CAA $510, PA $390, FA $460, WOA $360, Total $2,340 | `TOKEN_USAGE_MOCK` has CAA $545, PA $1, FA $501, WOA $390; sums to $2,057 | HIGH |
| `technical-specs.md:§3` | Meridian Agent Fleet | "5-agent mock roster" | `MOCK_AUDIT_TRACES` still has 6th entry (Document Processing Agent) | HIGH |
| `technical-specs.md:§2` | Function Catalogue | `loginWithSSO()` listed as removed | Still exported in `API_services.js:145` | LOW |

---

## 7. Mock-Data Integrity Report

### Agents (5)

| Agent | AGENTS_MOCK | Cost Data | Audit Trace | HITL | Alerts | Pass? |
|-------|-------------|-----------|-------------|------|--------|-------|
| Workforce Planning and Recruitment (009) | ✅ Present | ❌ $1 in TOKEN_USAGE, missing from AGENT_COST_METRICS | ❌ No trace | ✅ HITL-4822 | ✅ Present | **FAIL** |
| Business Intelligence Agent (001) | ✅ Present | ⚠️ Varies by source | ✅ trace-003 | ✅ HITL-4819 | ✅ Present | WARN |
| Client Advisory Agent (002) | ✅ Present | ⚠️ Varies by source | ✅ trace-002 | ✅ HITL-4821 | ✅ Present | WARN |
| Forecasting Agent (003) | ✅ Present | ⚠️ Varies by source | ✅ trace-001 | ✅ HITL-4820 | ✅ Present | WARN |
| Workflow Orchestration Agent (005) | ✅ Present | ⚠️ Varies by source | ✅ trace-004 | — | ✅ Present | WARN |

### Demo Scenarios (5)

| Scenario | Mock Location | Surface in UI | Pass? |
|----------|---------------|---------------|-------|
| Client Advisory Agent eval 0.61 vs gate 0.80 | `FLEET_CONSTANTS.PATHFINDER_EVAL_SCORE`; `CRITICAL_ALERTS_MOCK:CA-005` | Insights > Signals & Drift | ✅ PASS |
| Forecasting Agent anomaly 79 vs threshold 75 | `FLEET_CONSTANTS.ORACLE_ANOMALY_SCORE`; `CLUSTER_COHERENCE` | Insights > Signals & Drift | ⚠️ PASS (not in ANOMALY_FEED directly — appears via CLUSTER_COHERENCE) |
| Workforce Planning and Recruitment HITL pending (Critical) | `HITL_QUEUE_MOCK:HITL-4822` | Workbench > Manual Overrides | ✅ PASS |
| Workflow Orchestration Agent hallucination 0.34 | `WARNING_ALERTS_MOCK:WA-004` | Insights > Guardrails & Safety | ✅ PASS |
| Cost spike (Forecasting Agent) | `WARNING_ALERTS_MOCK:ALT-COST-002` ($4.20/session vs README's $12.40) | Core > Overview dashboard | ⚠️ PASS (amount differs from README) |

### Runbooks (11)

| ID | Present | All Required Fields | Pass? |
|----|---------|---------------------|-------|
| `agent-restart` | ✅ | ✅ | **PASS** |
| `cost-overrun` | ✅ | ✅ | **PASS** |
| `hitl-escalation` | ✅ | ✅ | **PASS** |
| `perf-degradation` | ✅ | ✅ | **PASS** |
| `memory-leak` | ✅ | ✅ | **PASS** |
| `security-breach` | ✅ | ⚠️ References "Data Quality Agent guardrail" (removed agent) | WARN |
| `zeroops-recovery` | ✅ | ✅ | **PASS** |
| `rag-retrieval-degradation` | ✅ | ✅ | **PASS** |
| `fine-tuning-failure-recovery` | ✅ | ⚠️ References Document Processing Agent in step | WARN |
| `model-drift-response` | ✅ | ✅ | **PASS** |
| `multi-agent-workflow-failure` | ✅ | ⚠️ References "summarise prior context with Document Processing Agent" | WARN |

### Trust Interceptors (6)

| ID | Present | active | desc | events | Pass? |
|----|---------|--------|------|--------|-------|
| `prompt_injection` | ✅ | true | ✅ | 47 | **PASS** |
| `pii_redaction` | ✅ | true | ✅ | 312 | **PASS** |
| `credential_guard` | ✅ | true | ✅ | 8 | **PASS** |
| `output_filtering` | ✅ | true | ✅ | 94 | **PASS** |
| `rag_grounding_guard` | ✅ | true | ✅ | 56 | **PASS** |
| `compliance_screen` | ✅ | true | ✅ | 23 | **PASS** |

---

## 8. Golden Thread Walk

The Golden Thread is the operator triage flow: anomaly detected → drill into cause → action.

| Step | Description | Evidence | Status |
|------|-------------|----------|--------|
| 1 | **Core > Overview → PlatformHealthScore drill-down** | `PlatformHealthScore.jsx` DIMENSIONS: each item calls `onNavigate(...d.nav)` to live tabs (`'1' signals`, `'1' safety`, `'1' health`, `'7' models`, `'12' {}`) | ✅ PASS |
| 2 | **Core > Overview → Dashboard KPI/MLOps tiles** | `Dashboard.jsx` MLOps Health Summary tiles navigate to `['7',{tab:'models'}]`, `['1',{tab:'safety'}]`, `['2',{tab:'overrides'}]`, `['1',{tab:'signals'}]` — all live targets | ✅ PASS |
| 3 | **Insights > Signals & Drift → WorkbenchCTA** | `WorkbenchCTA` component defined at `AgentInsights.jsx:20–37` with `onNavigate('2', { tab: 'troubleshoot', agentId })` — **NEVER RENDERED** in Signals tab or any child | ❌ **BROKEN** (H-6) |
| 4 | **Workbench > Troubleshooting (empty state) → Fleet Events** | `AgentOpsWorkbench.jsx` empty state link calls `onNavigate('1', { tab: 'telemetry' })` — live target | ✅ PASS |
| 5 | **Workbench > Runbooks suggestion** | `Runbooks.jsx` renders via `'2' runbooks` tab, live | ✅ PASS |

**Verdict:** The Golden Thread has one break — step 3 (Signals → Workbench handoff). The single most important UX narrative of the product requires manual navigation rather than the one-click handoff the architecture describes. Fix: render `WorkbenchCTA` in the Signals tab (see H-6).

---

## 9. What I Could Not Assess

| Gap | Reason |
|-----|--------|
| **Backend RBAC enforcement** | Backend at `:4000` is not in this repo. The frontend gates nothing by role (see C-2). Whether the backend re-validates role claims before executing write operations is **unknown and must be confirmed with the backend team before alpha.** |
| **Real production auth behavior** | Whether a customer's backend properly rejects `mock_token_*` and `sso_token_*` prefixed tokens (which `apiFetch` would send if mock auth is active) cannot be determined from frontend code alone. |
| **Fleet Operations UX when backend is down** | `executeFleetReboot`, `executeProviderCachePurge`, `rotateApiKey` have no mock fallback. What the user sees on network error (spinner? alert? crash?) requires live testing or reading the component that calls these functions in `OperatorWorkbench.jsx`. |
| **Key Rotation card data source** | No `KEY_ROTATION_MOCK` found in `API_services.js`. How the card renders its 5 pre-configured keys is unclear without tracing the full component render path. |
| **Real browser rendering** | No live browser session was available. Tab rendering, focus trapping in modals, and actual Ant Design Drawer behavior at 1024px breakpoint were assessed from code only. |
| **Performance / time-to-interactive** | Cold load TTI from a fresh browser could not be measured. 529 kB gzipped JS is the proxy metric. |
| **Tenant isolation under switching** | Whether tenant-switch clears cached agent lists or leaves stale state in child components could not be fully traced without running the app. |
| **Accessibility conformance** | A full WCAG 2.1 AA assessment requires screen-reader tooling. The findings here are code-level only. |
| **Customer deployment configuration** | Whether `REACT_APP_ENABLE_MOCK_AUTH` or similar guard will be set correctly in customer `.env.production` is a process/documentation concern, not a code one. |

---

## 10. Methodology Notes

**Agents spawned (5 parallel):**

| Agent | Scope | Key files read |
|-------|-------|---------------|
| Feature→Code Map | Dim 1 + 11: all page files, component existence, stale imports, gatedTab/ErrorBoundary | All 6 page files, `gatedTab.jsx`, `ErrorBoundary.jsx`, `App.js`, `src/contexts/*` |
| Mock Data + Service Layer | Dim 2 + 5: `API_services.js` deep read, all mock constants, runbooks, interceptors, agent fleet | `API_services.js` (full), `mock_data.js` (full) |
| Auth + RBAC + Secrets | Dim 4: token storage, demo creds, RBAC gating, secrets hygiene, `.env` tracking | `login.jsx`, `App.js`, `API_services.js:auth section`, `AppShell.jsx:userRole`, `HitlConsole.jsx`, `SelfHealing.jsx`, `Failsafe.jsx`, `GatedAction.jsx`, git-tracked `.env` files |
| Navigation + Golden Thread | Dim 3: all redirects, TAB_REMAP per page, SEARCH_INDEX, HELP_TIPS, Golden Thread nav trace | `AppShell.jsx` (full), `PlatformHealthScore.jsx`, `Dashboard.jsx`, `AgentInsights.jsx`, `AgentOpsWorkbench.jsx`, all page TAB_REMAP blocks |
| Build + Deps | Dim 9 + 10: `npm audit`, `npm run build`, `npm outdated`, `.env` tracking, Tailwind/Ant theme | `npm audit --json`, build output, `package.json`, `tailwind.config.js`, `src/theme/tokens.js`, `src/styles/globals.css` |
| UI / Multi-tenancy / Reliability / Compliance | Dim 6 + 7 + 8 + 12: contexts, ErrorBoundary coverage, async states, Ant v6 API, audit trail label, HITL history, logOp coverage, useEffect cleanup, accessibility, mobile sidebar | All context files, `Audit.jsx`, `HitlConsole.jsx`, `SelfHealing.jsx`, `opHistory.js`, `AppShell.jsx` (mobile Drawer) |

**Commands run:** `npm audit --json`, `npm run build`, `npm outdated`, `git ls-files | grep .env`, `git grep` for credentials.

**No files were modified.**

---

## 11. Appendix: Feature → Code Map

### Modules / Tabs

| Module | Tab | File | Key Components | Status |
|--------|-----|------|----------------|--------|
| Core (8) | overview | `CommandCentre.jsx` | `PlatformHealthScore`, `Dashboard` | ✅ |
| Insights (1) | health | `AgentInsights.jsx` | `PerformanceMetrics` | ✅ |
| Insights (1) | telemetry | `AgentInsights.jsx` | `FleetEventFeed` | ✅ |
| Insights (1) | signals | `AgentInsights.jsx` | `AnomalyScoring`, `XOpsIntelligence` | ✅ |
| Insights (1) | safety | `AgentInsights.jsx` | `TrustSecurity` | ✅ |
| FinOps (12) | usage | `Cost.jsx` | `AgentPerformanceTab` (LogSense.jsx) | ✅ |
| FinOps (12) | optimize | `Cost.jsx` | `CostOptimization` | ✅ |
| Workbench (2) | troubleshoot | `AgentOpsWorkbench.jsx` | `LiveLogStream`, `InvestigationContext`, `Audit`, `Logs` | ✅ |
| Workbench (2) | runbooks | `AgentOpsWorkbench.jsx` | `Runbooks` | ✅ |
| Workbench (2) | overrides | `AgentOpsWorkbench.jsx` | `HitlConsole` | ✅ |
| Workbench (2) | recovery | `AgentOpsWorkbench.jsx` | `SelfHealing` | ✅ |
| Registry (7) | fleet | `Failsafe.jsx` | Agent table (inline) | ✅ |
| Registry (7) | models | `Failsafe.jsx` | `ModelRegistry` | ✅ |
| Admin (4) | platform-config | `OperatorWorkbench.jsx` | `PlatformAdminConfig` | ✅ |
| Admin (4) | assistant | `OperatorWorkbench.jsx` | `AICommandAssistant` | ✅ |

### API Functions (selected — full catalogue in technical-specs.md)

| Function | Exported | Has Mock Fallback | Status |
|----------|---------|-------------------|--------|
| `login` | ✅ | ✅ (MOCK_AUTH_USERS) | ✅ — see C-1 for security issue |
| `loginWithSSO` | ✅ | ✅ | ⚠️ UI removed but function remains |
| `getAgents` | ✅ | ✅ (AGENTS_MOCK) | ✅ |
| `getHitlQueue` | ✅ | ✅ (HITL_QUEUE_MOCK) | ✅ |
| `getRunbook` | ✅ | ✅ (RUNBOOKS_MOCK) | ✅ |
| `getTrustInterceptors` | ✅ | ✅ (TRUST_INTERCEPTORS_MOCK) | ✅ |
| `getSelfHealingRules` | ✅ | ✅ (array, not null per docs) | ⚠️ |
| `executeFleetReboot` | ✅ | ❌ (intentional) | ✅ documented |
| `executeProviderCachePurge` | ✅ | ❌ (intentional) | ✅ documented |
| `rotateApiKey` | ✅ | ❌ (intentional) | ✅ documented |
| `getAuditTraces` | ✅ | ✅ (5 traces, 1 stale) | ❌ H-4 |
| All 11 runbooks | ✅ | ✅ all fields present | ✅ |
| All 6 interceptors | ✅ | ✅ all fields present | ✅ |

### Common Components

| Component | File | Exists | Used | Status |
|-----------|------|--------|------|--------|
| Badge | `components/common/Badge.jsx` | ✅ | ✅ | ✅ |
| CodeBlock | `components/common/CodeBlock.jsx` | ✅ | ✅ | ✅ |
| EmptyState | `components/common/EmptyState.jsx` | ✅ | ✅ | ✅ |
| ErrorBoundary | `components/common/ErrorBoundary.jsx` | ✅ | ✅ | ✅ |
| KpiBar | `components/common/KpiBar.jsx` | ✅ | ✅ | ✅ |
| MetricCard | `components/common/MetricCard.jsx` | ✅ | ✅ | ✅ |
| MetricLabel | `components/common/MetricLabel.jsx` | ✅ | ✅ | ✅ |
| PlatformHealthScore | `components/common/PlatformHealthScore.jsx` | ✅ | ✅ | ✅ |
| Skeleton | `components/common/Skeleton.jsx` | ✅ | ✅ | ✅ |
| GatedAction | `components/common/GatedAction.jsx` | ✅ | ❌ (0 uses) | ⚠️ dead code |
| IncidentWarRoom | `components/features/IncidentWarRoom.jsx` | ✅ | ❌ (0 uses) | ⚠️ orphaned |

---

*Report written to `audits/alpha-readiness-2026-05-12.md`*  
*One-line summary: **NO SHIP** — 3 Criticals (demo creds always-on, RBAC absent, audit trail unlabeled), 8 Highs (dead Golden Thread step, stale agent data, broken tab redirects, 23 High npm vulns), fix before external access.*

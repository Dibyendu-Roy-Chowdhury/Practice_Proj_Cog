# VeriForge Ops — Developer Guide

## 1. Project Structure

```
src/
├── App.js                        — auth state, context providers, ConfigProvider
├── index.js                      — ReactDOM root; import order: antd reset → globals.css
├── theme/tokens.js               — antTheme object passed to Ant Design ConfigProvider
├── assets/cog_white_logo.png     — Cognizant logo (sidebar brand area)
├── contexts/
│   ├── EnvironmentContext.js     — env ('production' | 'staging' | 'dev')
│   └── TenantContext.js          — multi-tenant switcher
├── components/
│   ├── layout/
│   │   ├── AppShell.jsx          — shell, sidebar, topbar, navigation state machine
│   │   └── PageHeader.jsx        — page title + action bar
│   ├── common/                   — shared primitives (see § Component Reference)
│   └── features/                 — domain-specific sub-components
│       ├── IncidentWarRoom.jsx
│       ├── mesh/                 — AgentMesh sub-components
│       └── runbooks/             — Runbook step renderer components
├── pages/                        — one file per module/page (see § Module & Tab Inventory)
├── services/
│   └── API_services.js           — all API calls with mock fallbacks; FLEET_CONSTANTS export
├── styles/
│   └── globals.css               — Tailwind directives + Ant Design component overrides
└── utils/
    ├── opHistory.js              — logOp() / getOps() — session operation log
    └── toast.js                  — toast notification helper (toast.info / toast.error)
```

---

## 2. Navigation & Routing

VeriForge Ops does not use React Router. All navigation is state-based and managed in `AppShell`.

The single navigation function signature is:

```js
onNavigate(key: string, params?: { tab?: string, agentId?: string, modelId?: string, action?: string })
```

Pass `onNavigate` as a prop from `AppShell` down through every page and component that needs cross-module linking. Components call it directly — no routing library required.

Page content is resolved by an inline conditional in `AppShell`:

```jsx
if (selectedKey === '8')  return <CommandCentre ... />;
if (selectedKey === '1')  return <AgentInsights ... />;
if (selectedKey === '2')  return <AgentOpsWorkbench ... />;
if (selectedKey === '4')  return <OperatorWorkbench ... />;
if (selectedKey === '7')  return <Failsafe ... />;
if (selectedKey === '12') return <Cost ... />;
return <CommandCentre ... />;   // fallback
```

Each page receives `navParams` and reads `navParams.tab` to set its initial active tab via `useState`.

Backwards-compatibility redirects (`KEY_REDIRECT`, `TAB_REDIRECT`, `MOVED_TO_INSIGHTS`) are applied inside `handleNavigate` before state is set. See `docs/architecture.md` § Backwards-Compatibility Redirects for the full redirect table.

---

## 3. Global Contexts

### `EnvironmentContext`

```js
import { useEnvironment } from '../contexts/EnvironmentContext';
const { env, setEnv } = useEnvironment();
// env default: 'production'
// valid values: 'production' | 'staging' | 'dev'
```

### `TenantContext`

```js
import { useTenant, TENANTS } from '../contexts/TenantContext';
const { tenant, setTenantId } = useTenant();
// tenant: { id: string, name: string, shortName: string, color: string, bg: string, industry: string }
// default tenant id: 'demo'
```

---

## 4. Data Layer

### API Service Pattern

Every exported function in `src/services/API_services.js` follows this structure:

```js
export const myFunction = async (param) => {
  try {
    return await apiFetch('/api/path');        // real backend
  } catch (e) {
    if (isApiUnavailable(e)) return MOCK_DATA; // mock fallback
    throw e;                                    // propagate unexpected errors
  }
};
```

`isApiUnavailable(e)` returns `true` for both network failures and HTTP 4xx/5xx responses. `apiFetchSafe(path)` is used for functions where `null` is an acceptable return (the component null-guards and shows a graceful empty state).

### Mock Fallback

When the backend is unreachable, all functions return deterministic mock data seeded from the Veritas demo scenario. No special configuration is required — mock fallback is automatic.

### `FLEET_CONSTANTS`

```js
import { FLEET_CONSTANTS } from '../services/API_services';
// FLEET_CONSTANTS.TOTAL_AGENTS      = 5
// FLEET_CONSTANTS.ACTIVE_AGENTS     = 5
// FLEET_CONSTANTS.MTD_SPEND_USD     = 2340
// FLEET_CONSTANTS.EVAL_GATE_THRESHOLD = 0.80
// FLEET_CONSTANTS.ANOMALY_THRESHOLD = 75
// FLEET_CONSTANTS.FLEET_NAME        = 'Veritas'
```

All components that display fleet-level KPIs must derive values from `FLEET_CONSTANTS`, not hardcode them.

---

## 5. Design System

### Color Tokens

Use Tailwind classes where possible (`text-navy`, `bg-surface-raised`, etc.). For inline styles, use these exact hex values:

| Purpose | Hex |
|---------|-----|
| Navy (primary/brand) | `#000048` |
| Cyan (accent) | `#00B5E2` |
| Ink primary (body text) | `#101828` |
| Ink secondary | `#475467` |
| Ink tertiary (labels) | `#98A2B3` |
| Surface (card bg) | `#FFFFFF` |
| Surface raised (table header) | `#F2F4F7` |
| Border | `#E2E8F0` |
| Success | `#10B981` or `#12B76A` |
| Warning | `#F59E0B` or `#F79009` |
| Error | `#EF4444` or `#F04438` |
| Info | `#0BA5EC` |

### Typography

Base font size: `13px` (`text-base`). Page headings use `22px`, `fontWeight: 800`, `letterSpacing: '-0.02em'`.

### Shared Primitive Components (inline in page files)

These are defined as local constants inside individual page files — they are not exported from `src/components/common/`.

**`SH` (Section Header)** — used in `CommandCentre.jsx` and `OperatorWorkbench.jsx`:
```jsx
const SH = ({ children, style }) => (
  <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: '0.07em', ...style }}>
    {children}
  </p>
);
```

**`SectionDivider`** — used in `AgentInsights.jsx`, `AgentOpsWorkbench.jsx`, `Cost.jsx`:
```jsx
const SectionDivider = ({ title }) => (
  <div style={{ padding: '16px 24px 8px', borderTop: '1px solid #E2E8F0', marginTop: 4 }}>
    <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.08em', color: '#94A3B8' }}>{title}</span>
  </div>
);
```

**`cardStyle`** — used in `OperatorWorkbench.jsx`:
```js
const cardStyle = {
  background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8,
  boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: '20px 24px', marginBottom: 16
};
```

### Chart Conventions

All charts use `recharts`. Tooltip style:
```js
const chartTooltipStyle = {
  contentStyle: { background: '#0F172A', border: '1px solid #1E293B', borderRadius: 6, fontSize: 11, color: '#e2e8f0' },
  labelStyle: { color: '#94A3B8', fontWeight: 700 },
};
```

Provider color palette: `['#000048', '#00B5E2', '#10B981', '#F59E0B']`.

---

## 6. Component Reference

### `src/components/common/`

| Component | Props | Purpose |
|-----------|-------|---------|
| `Badge` (`Badge.jsx`) | `variant: 'success' \| 'neutral'`, `dot?: boolean`, `children` | Status badge with optional animated dot |
| `CodeBlock` | `code: string`, `language?: string` | Prism syntax-highlighted code block |
| `EmptyState` | `icon`, `title`, `body` | Centered empty-state illustration |
| `ErrorBoundary` | `label: string`, `compact?: boolean`, `children` | React class component; catches render errors and shows retry UI |
| `KpiBar` | `tiles: Array<{ label, value, accent?, trend?, trendLabel?, sub? }>` | Horizontal row of KPI tiles |
| `MetricCard` | `title`, `value`, `sub?`, `badge?` | Single metric display card |
| `MetricLabel` | `label`, `value` | Compact label/value pair |
| `PlatformHealthScore` | `onNavigate` | Composite fleet health score widget with drill-down links |
| `Skeleton` | `height?`, `width?`, `count?` | Shimmer loading placeholder |

### `src/components/layout/`

| Component | Props | Purpose |
|-----------|-------|---------|
| `AppShell` | `onLogout: () => void`, `userRole: string` | Top-level shell — sidebar, topbar, page switcher, help panel |
| `PageHeader` | `title: string`, `subtitle?: string`, `actions?: ReactNode` | Standardised page header with title, subtitle, and action slot |

### `src/components/features/`

| Component | Purpose |
|-----------|---------|
| `IncidentWarRoom` | Full incident war-room view with active incident timeline |
| `mesh/LoopDetectionPanel` | Displays active ReAct loop detection events |
| `mesh/MeshTopologyGraph` | Visual force-directed graph of agent-to-agent connections |
| `mesh/RelayChainStepper` | Step-by-step view of a multi-agent relay chain |
| `mesh/SemanticConsistencyChart` | Semantic similarity heatmap across a multi-hop chain |
| `runbooks/RemediationDrawer` | Side drawer for executing a runbook step |
| `runbooks/StepBlock` | Renders a single runbook step card |

---

## 7. Module & Tab Inventory

### Core (key `'8'`) — `pages/CommandCentre.jsx`

**Subtitle:** None
**API functions called:** None (all direct API calls removed from CommandCentre)

| Tab | Key | Key onNavigate calls |
|-----|-----|---------------------|
| Overview | `overview` | via `PlatformHealthScore` drill-down and Dashboard KPI tiles → live tabs in Insights/Registry/FinOps |

---

### Insights (key `'1'`) — `pages/AgentInsights.jsx`

**Subtitle:** "Fleet-wide observability — monitor health, detect signals, and track guardrails."
**API functions called:** `getContextWindowUtilization`, `getToolSuccessRates`

| Tab | Key | Child components | Key onNavigate calls |
|-----|-----|-----------------|---------------------|
| Fleet Health | `health` | `PerformanceMetrics` | — |
| Fleet Events | `telemetry` | `FleetEventFeed` | `onNavigate('2', { tab: 'troubleshoot' })` |
| Signals & Drift | `signals` | `AnomalyScoring`, `XOpsIntelligence`, anomaly feed, distribution chart, precursor alerts, remediation queue | `onNavigate('2', { tab: 'troubleshoot', agentId: 'Concierge Agent' })` |
| Safety & Monitoring | `safety` | `TrustSecurity` | — |

---

### FinOps (key `'12'`) — `pages/Cost.jsx`

**Subtitle:** "Token spend, cost attribution, and optimization recommendations across the Veritas fleet"
**Props received:** `navParams`

| Tab | Key | Child components |
|-----|-----|-----------------|
| Spend Analysis | `usage` | `AgentPerformanceTab` (from `LogSense.jsx`) |
| Cost Optimization | `optimize` | `CostOptimization` |

---

### Workbench (key `'2'`) — `pages/AgentOpsWorkbench.jsx`

**Subtitle:** "The ER Room — troubleshoot and remediate."
**Props received:** `navParams`, `onNavigate`, `userRole`
**API functions called:** `getAgents` (in `TroubleshootingTab`)

| Tab | Key | Child components | Key onNavigate calls |
|-----|-----|-----------------|---------------------|
| Troubleshooting | `troubleshoot` | `LiveLogStream`, `InvestigationContext`, `Audit`, `Logs` | `onNavigate('1', { tab: 'telemetry' })` (empty state link) |
| Runbooks | `runbooks` | `Runbooks` | — |
| Manual Overrides | `overrides` | `HitlConsole` | — |
| Incident Recovery | `recovery` | `SelfHealing` | — |

The `TroubleshootingTab` requires an agent to be selected. It displays a 2-column layout: `LiveLogStream` (left) + `InvestigationContext` (right), followed by `Audit` (trace analysis) and `Logs` (compliance & audit trail).

**Note:** Runbook step execution is feature-gated off (`workbench.runbooks.execute: false`) — the Execute button shows a "Step execution available in Beta" tooltip and is disabled.

---

### Registry (key `'7'`) — `pages/Failsafe.jsx`

**Subtitle:** `<n> agents enrolled`
**Props received:** `navParams`, `onNavigate`, `userRole`
**API functions called:** `getAgents`, `updateAgentStatus`, `getAgentVersionHistory`

| Tab | Key | Child components |
|-----|-----|-----------------|
| Agent Registry | `fleet` | Agent table (read-only, status toggle + version history) |
| Models | `models` | `ModelRegistry` |

---

### Admin (key `'4'`) — `pages/OperatorWorkbench.jsx`

**Subtitle:** "Platform administration — settings and AI assistant."
**Props received:** `navParams`, `onNavigate`, `userRole`

| Tab | Key | Child components |
|-----|-----|-----------------|
| Settings | `platform-config` | `PlatformAdminConfig` — shows Users table (live `getUsers()` API) and Role Permissions table (hardcoded RBAC roles) only. SSO Config, System Settings, Demo Contexts, and Fleet Operations (Fleet Reboot, Cache Purge, API Key Rotation) have been removed. |
| AI Assistant | `assistant` | `AICommandAssistant` |

---

## 8. Authentication & Role-Gating

`App.js` manages `isLoggedIn` and `userRole` state. Sessions use `sessionStorage` for `access_token` and `role`. On mount it reads `sessionStorage.getItem('access_token')` and `sessionStorage.getItem('role')`. The `username` is stored in `localStorage`. On logout, session keys are removed from `sessionStorage`.

`userRole` is passed as a prop to `AppShell`, then forwarded to `AgentInsights`, `AgentOpsWorkbench`, `OperatorWorkbench`, and `Failsafe`. Components use `userRole === 'admin'` checks to gate write-destructive operations.

The profile dropdown renders `'Administrator'` for `admin` and `'Viewer'` for any other role value.

---

## 9. Adding a New Page

1. Create `src/pages/MyPage.jsx`. Accept `{ navParams, onNavigate, userRole }` as props.
2. Add an entry to `NAV_ITEMS` in `AppShell.jsx` with a new unique key (e.g., `'13'`).
3. Add the key to `PAGE_LABELS` in `AppShell.jsx`.
4. Add entries to `SEARCH_INDEX` for the new page and its tabs.
5. Add a condition in the `pageContent` resolver in `AppShell.jsx`:
   ```jsx
   if (selectedKey === '13') return <MyPage navParams={navParams} onNavigate={handleNavigate} />;
   ```
6. Add contextual help tips to `HELP_TIPS['13']`.

---

## 10. Adding a New API Function

1. Define a mock data constant (`MY_MOCK`).
2. Export an async function:
   ```js
   export const myFunction = async (param) => {
     try {
       return await apiFetch(`/api/my-path?param=${param}`);
     } catch (e) {
       if (isApiUnavailable(e)) return MY_MOCK;
       throw e;
     }
   };
   ```
3. If the component can gracefully handle `null`, use `apiFetchSafe` instead of `apiFetch`.
4. Add the function to the Function Catalogue in `docs/technical-specs.md`.

---

## 11. Ant Design Override System

All Ant Design component overrides live in `src/styles/globals.css`. The override sections are:

| Section | Classes targeted |
|---------|----------------|
| Table | `.ant-table-thead`, `.ant-table-tbody` |
| Form labels | `.ant-form-item-label` |
| Inputs | `.ant-input`, `.ant-input-affix-wrapper` |
| Select | `.ant-select-selector`, `.ant-select-dropdown`, `.ant-select-item` |
| Buttons | `.ant-btn-primary`, `.ant-btn-default`, `.ant-btn-text`, `.ant-btn` |
| Card | `.ant-card`, `.ant-card-head`, `.ant-card-body` |
| Tabs | `.vfo-tabs .ant-tabs-tab`, `.vfo-tabs .ant-tabs-ink-bar` |
| Modal | `.ant-modal-content`, `.ant-modal-header`, `.ant-modal-footer` |
| Tags | `.ant-tag` |
| Tooltip | `.ant-tooltip-inner` |
| Switch | `.ant-switch` |
| Checkbox | `.ant-checkbox-checked` |
| Pagination | `.ant-pagination-item` |
| Spin | `.ant-spin-dot-item` |
| Drawer | `.ant-drawer-body` |
| Message | `.ant-message-notice-content` |
| Radio button | `.ant-radio-button-wrapper-checked` |

Global custom classes: `.vfo-card` (standard card surface with hover shadow), `.vfo-shimmer` (animated skeleton), `.vfo-code-block` (monospaced log/code display), `.vfo-page-enter` (fade-in page transition).

Tailwind's `preflight` is disabled (`corePlugins: { preflight: false }`) to prevent conflicts with Ant Design's own CSS reset.

---

## Cross-References

- Tab map and navigation redirects: `docs/architecture.md`
- API function catalogue: `docs/technical-specs.md`
- Runbook and self-healing data: `docs/operations-guide.md`
- Security and RBAC: `docs/security-compliance.md`

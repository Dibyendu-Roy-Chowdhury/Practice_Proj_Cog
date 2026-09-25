# VeriForge Ops — Architecture Reference

## Single-Pane-of-Glass Philosophy

VeriForge Ops presents one surface for all agentic operations: monitoring, investigation, remediation, configuration, and governance. Every module is reachable by nav key without leaving the shell. Cross-module navigation is handled programmatically via `onNavigate(key, params)`, which carries tab context and agent context across page boundaries.

---

## The Golden Thread

The Golden Thread is the deep-link chain that lets an operator follow a signal from detection to resolution without manual context switching:

```
Core (overview)
  └─ PlatformHealthScore drill-down → onNavigate to live tabs in Insights/Registry/FinOps
  └─ Dashboard KPI tiles → onNavigate to live tabs

Insights › Signals & Drift
  └─ WorkbenchCTA → onNavigate('2', { tab: 'troubleshoot', agentId: 'Concierge Agent' })

Workbench › Troubleshooting (empty state)
  └─ "Insights → Fleet Events" → onNavigate('1', { tab: 'telemetry' })
```

---

## Application Architecture

### Top-Level Structure

```
veriforgeops/
├── public/
├── src/
│   ├── App.js                  — auth state, context providers, ConfigProvider
│   ├── index.js                — ReactDOM root, CSS import order
│   ├── theme/
│   │   └── tokens.js           — Ant Design theme token overrides (antTheme)
│   ├── assets/
│   │   └── cog_white_logo.png  — Cognizant logo used in sidebar
│   ├── contexts/
│   │   ├── EnvironmentContext.js  — env state ('production' | 'staging' | 'dev')
│   │   └── TenantContext.js       — tenant switcher (demo, bfsi-alpha, ins-beta, retail-gx, health-dx)
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.jsx    — shell, sidebar, topbar, routing state machine
│   │   │   └── PageHeader.jsx  — page title + actions bar
│   │   ├── common/
│   │   │   ├── Badge.jsx            — StatusBadge component
│   │   │   ├── CodeBlock.jsx        — Prism-based code renderer
│   │   │   ├── EmptyState.jsx       — empty state placeholder
│   │   │   ├── ErrorBoundary.jsx    — React error boundary (class component)
│   │   │   ├── KpiBar.jsx           — horizontal KPI tile row
│   │   │   ├── MetricCard.jsx       — single metric card
│   │   │   ├── MetricLabel.jsx      — label + value pair
│   │   │   ├── PlatformHealthScore.jsx — fleet health score composite widget
│   │   │   └── Skeleton.jsx         — shimmer placeholder
│   │   └── features/
│   │       ├── IncidentWarRoom.jsx
│   │       ├── mesh/
│   │       │   ├── LoopDetectionPanel.jsx
│   │       │   ├── MeshTopologyGraph.jsx
│   │       │   ├── RelayChainStepper.jsx
│   │       │   └── SemanticConsistencyChart.jsx
│   │       └── runbooks/
│   │           ├── RemediationDrawer.jsx
│   │           └── StepBlock.jsx
│   ├── pages/
│   │   └── [all page-level components — see Tab Map below]
│   ├── services/
│   │   └── API_services.js     — all API calls + mock fallbacks
│   ├── styles/
│   │   └── globals.css         — Ant Design overrides + Tailwind directives
│   └── utils/
│       ├── opHistory.js        — session operation log (logOp / getOps)
│       └── toast.js            — toast notification helper
├── tailwind.config.js
└── package.json
```

---

## Navigation & State Model

### AppShell State

All navigation state lives in `AppShell`:

```jsx
const [selectedKey,  setSelectedKey]  = useState('8');   // active module key
const [navParams,    setNavParams]    = useState({});     // { tab, agentId, modelId, ... }
const [isMobile,     setIsMobile]     = useState(false);  // <1024px breakpoint
const [drawerOpen,   setDrawerOpen]   = useState(false);  // mobile nav drawer
const [navCollapsed, setNavCollapsed] = useState(false);  // sidebar collapsed (56px) vs expanded (200px)
const [helpOpen,     setHelpOpen]     = useState(false);  // contextual help panel
```

`onNavigate(key, params)` is the single function passed down to every page and component. It resolves redirects and sets state.

### Page Key Map

| Key | Page Component | File |
|-----|----------------|------|
| `'8'` | `CommandCentre` | `pages/CommandCentre.jsx` |
| `'1'` | `AgentInsights` | `pages/AgentInsights.jsx` |
| `'2'` | `AgentOpsWorkbench` | `pages/AgentOpsWorkbench.jsx` |
| `'4'` | `OperatorWorkbench` | `pages/OperatorWorkbench.jsx` |
| `'7'` | `Failsafe` | `pages/Failsafe.jsx` |
| `'12'` | `Cost` | `pages/Cost.jsx` |

Any unresolved key falls back to `CommandCentre`.

### Backwards-Compatibility Redirects

**`KEY_REDIRECT`** — old page keys that now map to new ones:

| Old Key | New Key | Old Module |
|---------|---------|------------|
| `'3'` | `'2'` | Remediation → Workbench |
| `'5'` | `'4'` | (merged into Admin) |
| `'6'` | `'4'` | (merged into Admin) |
| `'9'` | `'1'` | (merged into Insights) |
| `'10'` | `'7'` | (merged into Registry) |
| `'11'` | `'2'` | (merged into Workbench) |

**`TAB_REDIRECT`** — old tab names within redirected pages:

| Old Key | Old Tab | New Key | New Tab |
|---------|---------|---------|---------|
| `'3'` | `incidents`, `alerts-incidents` | `'2'` | `recovery` |
| `'3'` | `hitl`, `hitl-remediation` | `'2'` | `overrides` |
| `'3'` | `runbooks` | `'2'` | `runbooks` |
| `'3'` | `selfhealing` | `'2'` | `recovery` |
| `'9'` | `eval-runs`, `benchmarks`, `benchmarking`, `datasets`, `playground`, `auto-eval`, `datasets-playground` | `'1'` | `signals` |
| `'11'` | `mesh`, `workflows`, `comms`, `multi-agent-mesh` | `'2'` | `health` |
| `'5'`, `'6'` | `_default` | `'4'` | `platform-config` |
| `'10'` | `agents`, `deployments`, `routing` | `'7'` | `fleet` |
| `'10'` | `_default` | `'7'` | `fleet` |

**`MOVED_TO_INSIGHTS`** — tabs moved from Admin (`'4'`) to Insights (`'1'`):

| Old Tab (on key `'4'`) | New Tab (on key `'1'`) |
|------------------------|------------------------|
| `feedback-rlhf` | `safety` |

**`AgentInsights` internal `TAB_REMAP`**:

| Incoming tab | Resolved tab |
|-------------|-------------|
| `token-context` | `health` |
| `tool-analytics` | `health` |
| `orchestration` | `health` |
| `evaluations` | `signals` |
| `feedback` | `safety` |

**`AgentOpsWorkbench` internal `TAB_REMAP`**:

| Incoming tab | Resolved tab |
|-------------|-------------|
| `fine-tuning` | `troubleshoot` |
| `experiments` | `troubleshoot` |
| `prompt-playground` | `troubleshoot` |

**`Failsafe` (Registry) internal `TAB_REMAP`**:

| Incoming tab | Resolved tab |
|-------------|-------------|
| `lifecycle` | `fleet` |
| `memory` | `fleet` |
| `deployments` | `fleet` |
| `routing` | `fleet` |
| `prompts` | `fleet` |
| `tools` | `fleet` |
| `rag` | `models` |
| `eval-suites` | `models` |

---

### Tab Map per Module

#### Core (key `'8'`) — `CommandCentre.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `overview` | Overview | `PlatformHealthScore`, `Dashboard` |

#### Insights (key `'1'`) — `AgentInsights.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `health` | Fleet Health | `PerformanceMetrics` |
| `telemetry` | Fleet Events | `FleetEventFeed` |
| `signals` | Signals & Drift | `AnomalyScoring`, `XOpsIntelligence`, anomaly feed, distribution chart, precursor alerts, remediation queue |
| `safety` | Safety & Monitoring | `TrustSecurity` |

#### FinOps (key `'12'`) — `Cost.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `usage` | Spend Analysis | `AgentPerformanceTab` (from `LogSense.jsx`) |
| `optimize` | Cost Optimization | `CostOptimization` |

#### Workbench (key `'2'`) — `AgentOpsWorkbench.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `troubleshoot` | Troubleshooting | `LiveLogStream`, `InvestigationContext`, `Audit`, `Logs` |
| `runbooks` | Runbooks | `Runbooks` |
| `overrides` | Manual Overrides | `HitlConsole` |
| `recovery` | Incident Recovery | `SelfHealing` |

#### Registry (key `'7'`) — `Failsafe.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `fleet` | Agent Registry | Agent table (read-only, status toggle + version history) |
| `models` | Models | `ModelRegistry` |

#### Admin (key `'4'`) — `OperatorWorkbench.jsx`

| Tab Key | Label | Child Components |
|---------|-------|-----------------|
| `platform-config` | Settings | `PlatformAdminConfig` — Users table (live API) and Role Permissions table (hardcoded) only. SSO Config, System Settings, Demo Contexts, and Fleet Operations have been removed. |
| `assistant` | AI Assistant | `AICommandAssistant` |

---

## Sidebar Design

### Navigation Items (`NAV_ITEMS`)

| Key | Icon | Label | Position |
|-----|------|-------|----------|
| `'8'` | `LayoutDashboard` | Core | Top group |
| `'1'` | `Eye` | Insights | Top group |
| `'12'` | `Banknote` | FinOps | Top group |
| — | — | *divider* | — |
| `'2'` | `Wrench` | Workbench | Bottom group |
| `'7'` | `Bot` | Registry | Bottom group |
| `'4'` | `SlidersHorizontal` | Admin | Bottom group |

### Quick Links (`QUICK_ACTIONS`)

Rendered in the sidebar footer above the Sign Out button:

| Label | Navigates To |
|-------|-------------|
| Fleet Events | key `'1'`, tab `telemetry` |
| Signals & Drift | key `'1'`, tab `signals` |
| Runbooks | key `'2'`, tab `runbooks` |

### Sidebar Design Tokens (`SB`)

| Token | Value |
|-------|-------|
| `bg` | `#000048` |
| `divider` | `rgba(255,255,255,0.07)` |
| `groupLabel` | `rgba(148,163,184,0.75)` |
| `itemRest` | `rgba(203,213,225,0.72)` |
| `itemActive` | `#ffffff` |
| `itemActiveBg` | `rgba(255,255,255,0.05)` |
| `itemAccent` | `#00B5E2` (active left border) |
| `itemHoverBg` | `rgba(255,255,255,0.05)` |
| `itemHoverFg` | `rgba(255,255,255,0.92)` |

Collapsed width: `56px`. Expanded width: `200px`. Mobile: sidebar becomes an Ant Design `Drawer` (width 200px, left placement).

---

## Global Contexts

### `EnvironmentContext` (`src/contexts/EnvironmentContext.js`)

```js
const { env, setEnv } = useEnvironment();
// env: 'production' | 'staging' | 'dev'  (default: 'production')
```

### `TenantContext` (`src/contexts/TenantContext.js`)

```js
const { tenant, setTenantId } = useTenant();
// tenant: { id, name, shortName, color, bg, industry }
```

Available tenants:

| id | name | industry |
|----|------|---------|
| `demo` | Cognizant Demo | Internal |
| `bfsi-alpha` | BFSI Client Alpha | Banking & Finance |
| `ins-beta` | Insurance Client Beta | Insurance |
| `retail-gx` | Retail Client Gamma | Retail & Commerce |
| `health-dx` | HealthCare Client Delta | Healthcare |

Default tenant: `demo`.

Context nesting order in `App.js`:
```
TriageModeProvider  (provider mounted but no UI surface currently uses triage mode)
  └── TenantProvider
        └── EnvironmentProvider
              └── ConfigProvider (Ant Design theme)
                    └── AppShell | Login
```

---

## Service Layer Pattern

All API calls live in `src/services/API_services.js`. Each exported function:

1. Attempts a real `fetch` via `apiFetch(path, options)` which attaches the `Authorization: Bearer <token>` header from `sessionStorage.getItem('access_token')`.
2. Catches network errors (`TypeError`, `Failed to fetch`) — or HTTP 4xx/5xx — via `isApiUnavailable()`.
3. Returns deterministic mock data on failure, so the UI is always functional without a backend.

The `apiFetchSafe` wrapper returns `null` (instead of throwing) for components that display a graceful empty-state.

`BASE_URL` resolves to `process.env.REACT_APP_API_URL` or `<protocol>//<hostname>:4000`.

---

## Design Tokens

### Brand Colors (from `tailwind.config.js`)

| Token | Hex | Use |
|-------|-----|-----|
| `navy.DEFAULT` | `#000048` | Primary brand, sidebar bg, primary buttons |
| `navy.light` | `#0a0a6e` | Hover state for primary |
| `cyan.DEFAULT` | `#00B5E2` | Accent, active sidebar border, links |
| `ink.primary` | `#101828` | Body text |
| `ink.secondary` | `#475467` | Secondary text |
| `ink.tertiary` | `#98A2B3` | Labels, placeholders |
| `status.success` | `#12B76A` | Success states |
| `status.warning` | `#F79009` | Warning states |
| `status.error` | `#F04438` | Error states |
| `status.info` | `#0BA5EC` | Info states |
| `surface.DEFAULT` | `#FFFFFF` | Card surface |
| `surface.raised` | `#F2F4F7` | Raised surface, table headers |

### Typography Scale (from `tailwind.config.js`)

| Class | Size | Line Height |
|-------|------|-------------|
| `text-xs` | 11px | 16px |
| `text-sm` | 12px | 18px |
| `text-base` | 13px | 20px |
| `text-md` | 14px | 22px |
| `text-lg` | 16px | 24px |
| `text-xl` | 20px | 28px |
| `text-2xl` | 24px | 32px |

Font families: `Inter` (sans), `JetBrains Mono` (mono).

### Spacing Tokens

| Token | Value |
|-------|-------|
| `sidebar` | 240px |
| `topbar` | 56px |

---

## Error Boundary Pattern

All tab children in `AgentInsights`, `AgentOpsWorkbench`, `Cost`, and `OperatorWorkbench` are wrapped with the `eb(label, child)` helper:

```jsx
const eb = (label, child) => <ErrorBoundary label={label}>{child}</ErrorBoundary>;
```

`ErrorBoundary` (`src/components/common/ErrorBoundary.jsx`) is a React class component that catches render-time errors, logs them with the label, and renders a recoverable error UI instead of a white screen. The `compact` prop renders a smaller inline error strip.

---

## Cross-References

- Component props: see `docs/developer-guide.md` § Component Reference
- API functions: see `docs/technical-specs.md` § Function Catalogue
- Runbooks: see `docs/operations-guide.md` § Runbook Library
- Security interceptors: see `docs/security-compliance.md` § Trust & Security Interceptors

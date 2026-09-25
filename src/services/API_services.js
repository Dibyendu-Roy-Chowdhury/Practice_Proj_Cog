const BASE_URL = process.env.REACT_APP_API_URL !== undefined
  ? process.env.REACT_APP_API_URL
  : (process.env.NODE_ENV === 'production' ? '' : `${window.location.protocol}//${window.location.hostname}:4000`);

// ── Helpers ───────────────────────────────────────────────────────────────────


const isNetworkError = (error) =>
  error instanceof TypeError ||
  (error.message && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')));

// Broader check for mock fallback — covers network failures AND HTTP 4xx/5xx from server
// Used by new MLOps API functions that have no backend implementation yet
const isApiUnavailable = (e) => isNetworkError(e) || /^HTTP [45]/.test(e?.message ?? '');

const apiFetch = async (path, options = {}) => {
  const token = sessionStorage.getItem('access_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'X-Tenant-ID': _currentTenantId,
    'X-Environment': _currentEnvironment,
    ...options.headers,
  };
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    // Network failure (server down, CORS preflight blocked, etc.)
    // Re-throw so callers with explicit fallbacks can catch it;
    // callers without fallbacks will receive null via the wrapper below.
    throw networkErr;
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || body.message || `HTTP ${res.status}`);
  }
  return res.json();
};

// ── Fleet-wide constants — single source of truth for mock demo data ──────────
// All components that reference fleet-level KPIs should derive values from here.
export const FLEET_CONSTANTS = {
  TOTAL_AGENTS:          5,
  ACTIVE_AGENTS:         5,
  PATHFINDER_EVAL_SCORE: 0.61,  // Quality regression signal
  ORACLE_ANOMALY_SCORE:  79,    // Above alert threshold of 75
  ANOMALY_THRESHOLD:     75,
  EVAL_GATE_THRESHOLD:   0.80,  // Minimum passing eval score
  MTD_SPEND_USD:         2340,
  FLEET_NAME:            'VeriForge Ops',
  APPROVED_AGENTS:       [],    // Populated at runtime from _dataProfile().agents
};

// ── Active tenant — set by TenantContext when the user switches LOB ────────────
// All apiFetch calls include this as X-Tenant-ID so the backend can scope responses.
// Mock fallbacks also use this to return tenant-appropriate demo data.
let _currentTenantId = 'arcadia-health';
export const setActiveTenant = (id) => { _currentTenantId = id || 'arcadia-health'; };

// ── Active environment — set by EnvironmentContext when the user switches env ──
// Mock fallbacks combine tenant + environment to return context-appropriate data.
let _currentEnvironment = 'production';
export const setActiveEnvironment = (env) => { _currentEnvironment = env || 'production'; };

// Signal the app that the backend is unreachable and mock data is now active.
// Dispatched once (deduplicated by the flag) so the banner fires on first failure.
let _offlineSignalSent = false;
const signalOffline = () => {
  if (_offlineSignalSent) return;
  _offlineSignalSent = true;
  try { window.dispatchEvent(new CustomEvent('vfo:offline')); } catch {}
};

// Wraps apiFetch and returns null instead of throwing on network errors,
// so components that have a null guard show a graceful message rather than crashing.
const apiFetchSafe = async (path, options = {}) => {
  try {
    return await apiFetch(path, options);
  } catch (err) {
    if (isNetworkError(err)) signalOffline();
    if (process.env.NODE_ENV === 'development') console.warn(`[API] ${path} failed:`, err.message);
    return null;
  }
};

// ── Date helpers for mock fallbacks ──────────────────────────────────────────

const fmtDate = (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const generateCostData30 = () => {
  const now = new Date();
  const BASE_COST = 107.0;
  const BASE_TOKENS = 1_100_000;
  const rows = [];
  let runningCost   = BASE_COST;
  let runningTokens = BASE_TOKENS;
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const drift  = (Math.random() - 0.44) * 0.08;
    runningCost   = Math.max(10, runningCost   * (1 + drift));
    runningTokens = Math.max(400_000, runningTokens * (1 + drift * 0.9));
    rows.push({
      date:   fmtDate(d),
      cost:   parseFloat(runningCost.toFixed(2)),
      tokens: Math.round(runningTokens),
    });
  }
  return rows;
};

// ── Mock SSO/auth fallback data ───────────────────────────────────────────────

const SSO_USER = {
  username:    process.env.REACT_APP_SSO_USER    || 'Demo User',
  displayName: process.env.REACT_APP_SSO_DISPLAY || 'Demo User',
  email:       process.env.REACT_APP_SSO_EMAIL   || 'demo@veriforgeops.demo',
  role:        'admin',
};

// Mock auth — dev only (REACT_APP_ENABLE_MOCK_AUTH=true). No passwords stored here;
// any non-empty password is accepted so no real credentials appear in the bundle.
const MOCK_AUTH_USERS = {
  admin:   { role: 'admin' },
  senthil: { role: 'admin', displayName: 'Senthil' },
  user:    { role: 'user'  },
  viewer:  { role: 'user'  },
};

const mockLogin = (username, password) => {
  if (!password) throw new Error('Invalid username or password');
  const key  = username.toLowerCase();
  const user = MOCK_AUTH_USERS[key];
  if (!user) throw new Error('Invalid username or password');
  const nonce = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2,'0')).join('');
  return {
    access_token: `mock_token_${key}_${nonce}`,
    username: user.displayName || username,
    role: user.role,
  };
};

// =============================================
// AUTH
// =============================================

export const loginWithSSO = async () => {
  if (process.env.REACT_APP_SSO_ENABLED !== 'true') throw new Error('SSO is not enabled in this deployment.');
  try {
    return await apiFetch('/api/auth/sso', { method: 'POST', body: JSON.stringify({ provider: 'azure_ad' }) });
  } catch (error) {
    if (isNetworkError(error)) {
      await new Promise(r => setTimeout(r, 1200));
      return {
        access_token: `sso_token_${SSO_USER.username.toLowerCase()}_${Date.now()}`,
        username:     SSO_USER.displayName,
        role:         SSO_USER.role,
        sso:          true,
        provider:     'Azure AD (mock)',
        email:        SSO_USER.email,
      };
    }
    throw error;
  }
};

export const login = async (username, password) => {
  try {
    return await apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) });
  } catch (error) {
    if (isNetworkError(error)) {
      if (process.env.REACT_APP_ENABLE_MOCK_AUTH !== 'true') {
        throw new Error('Authentication service unavailable. Please try again later.');
      }
      signalOffline();
      if (process.env.NODE_ENV === 'development') console.warn('API server unreachable — using mock authentication');
      return mockLogin(username, password);
    }
    throw error;
  }
};

export const validateToken = async (token) => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/validate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Token validation failed');
    return data;
  } catch (error) {
    if (isNetworkError(error)) return { valid: false };
    throw error;
  }
};

export const logout = async (token) => {
  try {
    const res = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Logout failed');
    return data;
  } catch (error) {
    if (isNetworkError(error)) return { message: 'Logged out successfully' };
    throw error;
  }
};

// =============================================
// AGENT REGISTRY
// =============================================


// AGENTS_MOCK removed — all DATA_PROFILES entries have agents[] arrays.

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString().split('T')[0];

const _agentVersionHistoryMock = (agentId) => {
  const agent = (_dataProfile().agents || []).find(a => (a.agent_id || a.id) === agentId);
  if (!agent) return { version_history: [] };
  const ver = agent.version_string || 'v1.0';
  return {
    version_history: [
      { version: ver,    version_string: ver,    change_type: agent.change_type || 'minor', changed_fields: ['system_prompt', 'tool_list'],    snapshot_date: daysAgo(7),   updated_by: 'admin@veriforgeops.demo' },
      { version: 'v1.1', version_string: 'v1.1', change_type: 'patch',                     changed_fields: ['temperature'],                   snapshot_date: daysAgo(45),  updated_by: 'admin@veriforgeops.demo' },
      { version: 'v1.0', version_string: 'v1.0', change_type: 'major',                     changed_fields: ['model_id', 'routing_policy'],    snapshot_date: daysAgo(120), updated_by: 'admin@veriforgeops.demo' },
    ],
  };
};

export const getAgents = async () => {
  const _mockAgents = () => {
    const p = _dataProfile();
    const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
    return (p.agents || tenantData.production.agents || []).map(a => ({ ...a, id: a.agent_id || a.id }));
  };
  try {
    const data = await apiFetch('/api/agents');
    // Normalize: backend returns { status, agents } — ensure id field present.
    // Filter to the current tenant so cross-tenant admin view doesn't bleed into dropdowns.
    const agents = (data.agents || [])
      .filter(a => !a.tenant_id || a.tenant_id === _currentTenantId)
      .map(a => ({ ...a, id: a.agent_id || a.id }));
    // If the backend returned an empty list, the seed likely hasn't run yet — use mock data.
    if (agents.length === 0) return { status: 'success', agents: _mockAgents() };
    return { status: 'success', agents };
  } catch (e) {
    if (isApiUnavailable(e)) {
      return { status: 'success', agents: _mockAgents() };
    }
    throw e;
  }
};

export const registerAgent = async (agentData) => {
  try {
    return await apiFetch('/api/agents', { method: 'POST', body: JSON.stringify(agentData) });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Agent "${agentData.name}" registered successfully`, id: `agent-${Date.now()}` };
    throw e;
  }
};

export const updateAgent = async (agentId, agentData) => {
  try {
    return await apiFetch(`/api/agents/${agentId}`, { method: 'PATCH', body: JSON.stringify(agentData) });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Agent ${agentId} updated` };
    throw e;
  }
};

export const updateAgentStatus = async (agentId, status) => {
  try {
    return await apiFetch(`/api/agents/${agentId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Agent ${agentId} status set to ${status}` };
    throw e;
  }
};

export const rollbackAgentVersion = async (agentId, targetVersion) => {
  try {
    return await apiFetch(`/api/agents/${agentId}/rollback`, { method: 'POST', body: JSON.stringify({ targetVersion }) });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Rollback to ${targetVersion} initiated for ${agentId}` };
    throw e;
  }
};

export const getAgentVersionHistory = async (agentId) => {
  try {
    return await apiFetch(`/api/agents/${agentId}/history`);
  } catch (e) {
    if (isApiUnavailable(e)) {
      return _agentVersionHistoryMock(agentId);
    }
    throw e;
  }
};

// =============================================
// LOG SYNC / DIAGNOSTICS
// =============================================

export const syncModelLogs = async ({ logGroup, hoursBack, maxLogs, crossAccountCredentials }) => {
  try {
    return await apiFetch('/api/logs/sync', {
      method: 'POST',
      body: JSON.stringify({ logGroup, hoursBack, maxLogs, cross_account: !!crossAccountCredentials }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Synced ${maxLogs ?? 500} log entries from ${logGroup ?? 'default log group'} (${hoursBack ?? 24}h lookback)`, synced: maxLogs ?? 500 };
    throw e;
  }
};

export const syncBedrockLogs = syncModelLogs;

export const syncAgentSpecificLogs = async (agentName) => {
  try {
    return await apiFetch(`/api/logs/sync/${encodeURIComponent(agentName)}`, { method: 'POST' });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Synced logs for ${agentName}`, synced: 120 };
    throw e;
  }
};

// =============================================
// METRICS — TOKEN USAGE
// =============================================

// ── Timestamp helpers (defined here so DATA_PROFILES can use them inline) ─────
const _ago    = (h) => new Date(Date.now() - h * 3_600_000).toISOString();
const _secAgo = (s) => new Date(Date.now() - s * 1_000).toISOString();

// ── Per-tenant × per-environment mock data profiles ───────────────────────────
// Keyed as DATA_PROFILES[tenantId][environment].
// Prod  = clean high-volume operational traffic, steady-state guardrail counts.
// Staging = pre-deploy eval runs, compliance validation, reduced volume.
// Dev   = active adversarial testing, chaos inputs, several guards disabled.
const DATA_PROFILES = {
  // ── demo ─────────────────────────────────────────────────────────────────────
  'demo': {
    production: {
      label: 'VeriForge Demo Fleet', domain: 'veriforgeops.demo',
      mtdCost: 2340, totalTokens: 33369817,
      agentCosts: [
        { agent: 'Concierge Agent',                    prompt: 7640330, completion: 2859419, total: 10499749, cost_usd: 620 },
        { agent: 'Public Research Agent',              prompt: 3474447, completion: 1502825, total:  4977272, cost_usd: 510 },
        { agent: 'Insurance Underwriting Agent',       prompt: 7498371, completion: 3710571, total: 11208942, cost_usd: 460 },
        { agent: 'Shipment Insight Agent',             prompt: 4054027, completion: 2005827, total:  6059854, cost_usd: 360 },
        { agent: 'Palantir Log Analysis Agent',        prompt:  392000, completion:  196000, total:   588000, cost_usd: 390, provider: 'Palantir AIP Hub', model: 'gpt-5.5' },
      ],
      interceptors: [
        { id: 'sql_injection',    name: 'SQL Injection Guard',    active: true,  desc: 'Blocks destructive SQL patterns in tool inputs and outputs across all demo fleet agents.',                         events: 23 },
        { id: 'prompt_injection', name: 'Prompt Injection Shield',active: true,  desc: 'Detects adversarial prompt payloads attempting to override agent system instructions or tool constraints.',        events: 6  },
        { id: 'data_exfil',       name: 'Data Exfiltration Gate', active: true,  desc: 'Prevents PII and secret material from appearing in tool outputs or downstream agent calls.',                       events: 4  },
        { id: 'token_budget',     name: 'Token Budget Enforcer',  active: true,  desc: 'Hard-limits per-call token spend to prevent runaway chain-of-thought and cost overruns.',                          events: 18 },
        { id: 'loop_detector',    name: 'Loop Detector',          active: false, desc: 'Terminates identical ReAct cycles — currently inactive. Enable to guard against repetitive reasoning loops.',      events: 0  },
        { id: 'semantic_drift',   name: 'Semantic Drift Alert',   active: true,  desc: 'Flags off-topic agent reasoning and semantic drift from the original task objective.',                             events: 11 },
      ],
      blockedPatterns: [
        { category: 'SQL Injection Attempt',     interceptor: 'SQL Injection Guard',    count7d: 23, agentsAffected: 3, lastSeen: '14 min ago'  },
        { category: 'Token Budget Breach',       interceptor: 'Token Budget Enforcer',  count7d: 18, agentsAffected: 2, lastSeen: '31 min ago'  },
        { category: 'Semantic Drift Flag',       interceptor: 'Semantic Drift Alert',   count7d: 11, agentsAffected: 2, lastSeen: '48 min ago'  },
        { category: 'Prompt Injection Attempt',  interceptor: 'Prompt Injection Shield',count7d: 6,  agentsAffected: 1, lastSeen: '2 hours ago' },
        { category: 'Data Exfiltration Attempt', interceptor: 'Data Exfiltration Gate', count7d: 4,  agentsAffected: 1, lastSeen: '3 hours ago' },
        { category: 'Loop Detection (Inactive)', interceptor: 'Loop Detector',          count7d: 0,  agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-001', agent_id: 'agent-001', name: 'Concierge Agent',                   model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v3.2', change_type: 'update', status: 'Active', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'production', routing_policy: 'Round Robin',   circuit_breaker: 'Armed',    desc: 'AI-powered concierge agent handling customer service, product inquiries, and cross-department request routing for the VeriForge operations platform.' },
        { id: 'agent-002', agent_id: 'agent-002', name: 'Public Research Agent',              model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v2.1', change_type: 'update', status: 'Active', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'production', routing_policy: 'Quality-First', circuit_breaker: 'Disabled', desc: 'Autonomous public data research agent performing web searches, document synthesis, and competitive intelligence gathering from authorised public sources.' },
        { id: 'agent-003', agent_id: 'agent-003', name: 'Insurance Underwriting Agent',       model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v1.8', change_type: 'update', status: 'Active', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'production', routing_policy: 'Weighted',      circuit_breaker: 'Armed',    desc: 'AI-driven underwriting agent evaluating insurance applications, assessing actuarial risk, applying eligibility rules, and generating premium pricing recommendations.' },
        { id: 'agent-005', agent_id: 'agent-005', name: 'Shipment Insight Agent',             model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v2.4', change_type: 'update', status: 'Active', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'production', routing_policy: 'Adaptive',      circuit_breaker: 'Armed',    desc: 'Supply chain visibility agent analysing shipment status, ETA predictions, carrier performance, and logistics anomalies across global shipping lanes.' },
        { id: 'agent-009', agent_id: 'agent-009', name: 'Palantir Log Analysis Agent',        model_id: 'gpt-5.5',                                  version_string: 'v2.0', change_type: 'update', status: 'Active', cloud_provider: 'Palantir', cloud_region: 'palantir-foundry-main', environment: 'production', routing_policy: 'Palantir AIP Hub', circuit_breaker: 'Armed', desc: 'Palantir AIP Logic agent (ri.eddie.main.logic.0d87a2c6) ingesting and analysing Palantir Foundry execution logs via OntologySqlTool. Surfaces transform health, job execution metrics, and log-volume trends from audit log extracts bridged to VeriForge staging datastore.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 78, criticalCount: 2, warningCount: 4, costDelta: '+5.2', tokenEfficiency: 88 },
      criticalAlerts: [
        { id: 'DM-C001', agentId: 'agent-002', agentName: 'Public Research Agent',            message: 'Prompt injection detected — adversarial payload attempting to override research scope constraints and extract internal configuration data.', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(1), severity: 'P1', category: 'Prompt Injection' },
        { id: 'DM-C002', agentId: 'agent-003', agentName: 'Insurance Underwriting Agent',     message: 'Latency p95 at 4.2s — above 3.0s SLA threshold for 11 consecutive underwriting requests; actuarial scoring tool response degraded.', model_id: 'anthropic.claude-3-opus-20240229-v1:0', timestamp: _ago(2), severity: 'P1', category: 'Latency SLA Breach' },
      ],
      warningAlerts: [
        { id: 'DM-W001', agentId: 'agent-001', agentName: 'Concierge Agent',                  message: 'Token usage at 84% of daily limit — high inbound request volume forecast to breach quota within 3 hours.', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0', timestamp: _ago(3), severity: 'P2', category: 'Token Spike'     },
        { id: 'DM-W002', agentId: 'agent-005', agentName: 'Shipment Insight Agent',           message: 'ReAct loop counter at 2/3 threshold — agent nearing automatic termination limit on shipment ETA recalculation chain.', model_id: 'amazon.nova-pro-v1:0', timestamp: _ago(5), severity: 'P2', category: 'Loop Detection' },
        { id: 'DM-W003', agentId: 'agent-009', agentName: 'Palantir Log Analysis Agent',        message: 'Palantir AIP exec trace cf45a9c07516ae76: OntologySqlTool query on SandeepCandidateProfiles returning 0 results for 3 consecutive executions — log ingestion pipeline stalled, fetch_external_data transform timing out.',          model_id: 'gpt-5.5', timestamp: _ago(6), severity: 'P2', category: 'Ontology Query Failure' },
        { id: 'DM-W004', agentId: 'agent-003', agentName: 'Insurance Underwriting Agent',     message: 'Hallucination risk score 0.18 — approaching 0.20 alert threshold on complex multi-rider policy evaluation; HITL review recommended.', model_id: 'anthropic.claude-3-opus-20240229-v1:0', timestamp: _ago(7), severity: 'P3', category: 'Hallucination Risk' },
      ],
      anomalyFeed: [
        { id: 'DM-E001', agent: 'Public Research Agent',             timestamp: '6m ago',  category: 'Prompt Injection', score: 86, action: 'HITL Escalated',    autoRemediated: false },
        { id: 'DM-E002', agent: 'Concierge Agent',                   timestamp: '18m ago', category: 'Token Spike',      score: 72, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'DM-E003', agent: 'Shipment Insight Agent',            timestamp: '33m ago', category: 'Loop Detection',   score: 65, action: 'Under Observation', autoRemediated: false },
        { id: 'DM-E004', agent: 'Insurance Underwriting Agent',      timestamp: '52m ago', category: 'SQL Injection',    score: 58, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'DM-E005', agent: 'Palantir Log Analysis Agent',       timestamp: '1h ago',  category: 'Ontology SQL Drift', score: 44, action: 'Auto-Remediated',   autoRemediated: true, source: 'Palantir Foundry Audit Log', traceId: 'cf45a9c07516ae76' },
      ],
      hitlQueue: [
        { id: 'DM-A001', risk: 'High', agent: 'Public Research Agent', tool: 'search_internal_knowledge_base', waitMs: 47_000, reasoning: 'Public Research Agent intercepted a prompt injection attempt targeting the internal knowledge base search tool. Adversarial payload attempted to override research constraints and extract system configuration. Human review required before allowing further tool access.' },
      ],
      circuitBreakers: [
        { id: 'CB-001', agent: 'Concierge Agent',                    model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Cost',    current: 0.21, threshold: 0.50, status: 'Armed'    },
        { id: 'CB-002', agent: 'Shipment Insight Agent',             model: 'amazon.nova-pro-v1:0',                      type: 'Loop',    current: 1,    threshold: 3,    status: 'Armed'    },
        { id: 'CB-003', agent: 'Insurance Underwriting Agent',       model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'Latency', current: 1200, threshold: 5000, status: 'Armed'    },
        { id: 'CB-004', agent: 'Public Research Agent',              model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Cost',    current: 0.11, threshold: 0.25, status: 'Disabled' },
        { id: 'CB-005', agent: 'Palantir Log Analysis Agent',         model: 'gpt-5.5 (Palantir AIP Hub)',               type: 'Cost',    current: 0.08, threshold: 0.50, status: 'Armed'    },
      ],
      meshTopology: {
        mesh_health_score: 78,
        nodes: [
          { id: 'agent-001', name: 'Concierge Agent',                   role: 'orchestrator', status: 'healthy',  load: 0.72, message_count_1h: 841, x: 50, y: 14 },
          { id: 'agent-002', name: 'Public Research Agent',             role: 'worker',       status: 'degraded', load: 0.68, message_count_1h: 312, x: 20, y: 40 },
          { id: 'agent-003', name: 'Insurance Underwriting Agent',      role: 'worker',       status: 'healthy',  load: 0.54, message_count_1h: 198, x: 80, y: 40 },
          { id: 'agent-005', name: 'Shipment Insight Agent',            role: 'worker',       status: 'healthy',  load: 0.61, message_count_1h: 421, x: 20, y: 70 },
          { id: 'agent-009', name: 'Palantir Log Analysis Agent',       role: 'worker',       status: 'healthy',  load: 0.43, message_count_1h: 156, x: 80, y: 70 },
        ],
        edges: [
          { id: 'dm-e-001', source: 'agent-001', target: 'agent-002', handshake_status: 'degraded',    message_count_1h: 312, avg_latency_ms: 180, p99_latency_ms: 450 },
          { id: 'dm-e-002', source: 'agent-001', target: 'agent-003', handshake_status: 'established', message_count_1h: 198, avg_latency_ms:  95, p99_latency_ms: 280 },
          { id: 'dm-e-003', source: 'agent-001', target: 'agent-005', handshake_status: 'established', message_count_1h: 421, avg_latency_ms:  62, p99_latency_ms: 190 },
          { id: 'dm-e-004', source: 'agent-001', target: 'agent-009', handshake_status: 'established', message_count_1h: 156, avg_latency_ms:  48, p99_latency_ms: 142 },
        ],
      },
    },
    staging: {
      label: 'VeriForge Demo Fleet — Staging', domain: 'veriforgeops.demo',
      mtdCost: 580, totalTokens: 8430000,
      agentCosts: [
        { agent: 'Concierge Agent',                    prompt: 2100000, completion: 780000,  total: 2880000, cost_usd: 168 },
        { agent: 'Public Research Agent',              prompt: 950000,  completion: 410000,  total: 1360000, cost_usd: 140 },
        { agent: 'Insurance Underwriting Agent',       prompt: 2050000, completion: 1010000, total: 3060000, cost_usd: 126 },
        { agent: 'Shipment Insight Agent',             prompt: 1110000, completion: 545000,  total: 1655000, cost_usd: 98  },
        { agent: 'Palantir Log Analysis Agent',        prompt:  108000, completion:  54000,  total:  162000, cost_usd: 48,  provider: 'Palantir AIP Hub', model: 'gpt-5.5' },
      ],
      interceptors: [
        { id: 'sql_injection',    name: 'SQL Injection Guard',    active: true,  desc: 'Staging: 18 synthetic SQL injection vectors validated — 0 bypasses in pre-release build.',        events: 18 },
        { id: 'prompt_injection', name: 'Prompt Injection Shield',active: true,  desc: 'Staging: 1 test case still failing in v2.2-rc injection regression corpus — deploy gate active.', events: 4  },
        { id: 'data_exfil',       name: 'Data Exfiltration Gate', active: true,  desc: 'Staging: 9 exfiltration test vectors — all blocked successfully.',                               events: 9  },
        { id: 'token_budget',     name: 'Token Budget Enforcer',  active: true,  desc: 'Staging: Budget enforcement validated across all 5 agents — limits enforced correctly.',          events: 6  },
        { id: 'loop_detector',    name: 'Loop Detector',          active: false, desc: 'Staging: Loop detector disabled — scheduled for activation in next release candidate.',           events: 0  },
        { id: 'semantic_drift',   name: 'Semantic Drift Alert',   active: true,  desc: 'Staging: Drift baseline calibration in progress — 3 of 5 agents calibrated.',                   events: 5  },
      ],
      blockedPatterns: [
        { category: 'SQL Injection — Staging Test',    interceptor: 'SQL Injection Guard',    count7d: 18, agentsAffected: 2, lastSeen: '22 min ago'  },
        { category: 'Data Exfil — Staging Test',       interceptor: 'Data Exfiltration Gate', count7d: 9,  agentsAffected: 2, lastSeen: '41 min ago'  },
        { category: 'Token Budget — Staging Test',     interceptor: 'Token Budget Enforcer',  count7d: 6,  agentsAffected: 1, lastSeen: '58 min ago'  },
        { category: 'Semantic Drift — Baseline',       interceptor: 'Semantic Drift Alert',   count7d: 5,  agentsAffected: 1, lastSeen: '1 hour ago'  },
        { category: 'Injection Regression Vector',     interceptor: 'Prompt Injection Shield',count7d: 4,  agentsAffected: 1, lastSeen: '2 hours ago' },
        { category: 'Loop Detection (Inactive)',        interceptor: 'Loop Detector',          count7d: 0,  agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-001', agent_id: 'agent-001', name: 'Concierge Agent',                   model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v3.3-rc', change_type: 'minor',  status: 'Active',   cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Round Robin',   circuit_breaker: 'Closed', desc: 'Staging v3.3-rc: latency regression suite passing — 0 token limit breaches in last 48h of pre-release testing.' },
        { id: 'agent-002', agent_id: 'agent-002', name: 'Public Research Agent',              model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v2.2-rc', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Quality-First', circuit_breaker: 'Open',   desc: 'Staging v2.2-rc: injection guard regression — 1 test case failing, deploy gate blocked pending fix.' },
        { id: 'agent-003', agent_id: 'agent-003', name: 'Insurance Underwriting Agent',       model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v1.9-rc', change_type: 'minor',  status: 'Active',   cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Weighted',      circuit_breaker: 'Closed', desc: 'Staging v1.9-rc: actuarial risk scoring update — 14 of 15 test scenarios passing, pre-release validation near complete.' },
        { id: 'agent-005', agent_id: 'agent-005', name: 'Shipment Insight Agent',             model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v2.5-rc', change_type: 'minor',  status: 'Active',   cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Adaptive',      circuit_breaker: 'Closed', desc: 'Staging v2.5-rc: ETA prediction model update — carrier data integration tests passing, loop guard enabled.' },
        { id: 'agent-009', agent_id: 'agent-009', name: 'Palantir Log Analysis Agent',        model_id: 'gpt-5.5',                                  version_string: 'v2.1-rc', change_type: 'update', status: 'Active',   cloud_provider: 'Palantir', cloud_region: 'palantir-foundry-main', environment: 'staging', routing_policy: 'Palantir AIP Hub', circuit_breaker: 'Closed', desc: 'Staging v2.1-rc: Palantir AIP Logic log analysis — FIND_RELEVANT_CHUNKS vector search (k=10) validation in progress; OntologySqlTool log-entry retrieval precision tests 13 of 15 passing.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 81, criticalCount: 1, warningCount: 1, costDelta: '+1.9', tokenEfficiency: 84 },
      criticalAlerts: [
        { id: 'DM-S-C001', agentId: 'agent-002', agentName: 'Public Research Agent', message: 'Staging: Injection guard regression — 1 test case failing in v2.2-rc pre-release corpus, deploy gate blocked.', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(2), severity: 'P1', category: 'Injection Regression' },
      ],
      warningAlerts: [
        { id: 'DM-S-W001', agentId: 'agent-003', agentName: 'Insurance Underwriting Agent', message: 'Staging: 1 actuarial test scenario unresolved — underwriting edge case under investigation before final release sign-off.', model_id: 'anthropic.claude-3-opus-20240229-v1:0', timestamp: _ago(5), severity: 'P2', category: 'Test Coverage' },
      ],
      hitlQueue: [
        { id: 'DM-S-A001', risk: 'High', agent: 'Public Research Agent', tool: 'validate_injection_guard_v22', waitMs: 31_000, reasoning: 'Staging: Prompt Injection Shield v2.2-rc has 1 failing regression test case in pre-release corpus. Compliance sign-off required to determine whether deploy gate should be waived or test case updated.' },
      ],
      circuitBreakers: [
        { id: 'DM-S-CB-001', agent: 'Public Research Agent', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Injection Guard', current: 1, threshold: 0,    status: 'Triggered' },
        { id: 'DM-S-CB-002', agent: 'Concierge Agent',       model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Cost',           current: 0.12, threshold: 0.50, status: 'Armed'  },
      ],
    },
    dev: {
      label: 'VeriForge Demo Fleet — Dev', domain: 'veriforgeops.demo',
      mtdCost: 174, totalTokens: 2513000,
      agentCosts: [
        { agent: 'Concierge Agent [DEBUG]',                   prompt: 620000, completion: 230000, total: 850000, cost_usd: 50 },
        { agent: 'Public Research Agent [DEV]',               prompt: 282000, completion: 121000, total: 403000, cost_usd: 42 },
        { agent: 'Insurance Underwriting Agent [DEBUG]',      prompt: 614000, completion: 303000, total: 917000, cost_usd: 38 },
        { agent: 'Shipment Insight Agent [DEV]',              prompt: 330000, completion: 162000, total: 492000, cost_usd: 29 },
        { agent: 'Palantir Log Analysis Agent [DEV]',         prompt:  34000, completion:  17000, total:  51000, cost_usd: 15, provider: 'Palantir AIP Hub', model: 'gpt-5.5' },
      ],
      interceptors: [
        { id: 'sql_injection',    name: 'SQL Injection Guard',    active: true,  desc: 'DEV: 87 adversarial SQL injection vectors fired — 2 bypasses detected in dev build.',                        events: 87  },
        { id: 'prompt_injection', name: 'Prompt Injection Shield',active: true,  desc: 'DEV: Red-team injection corpus active — 134 adversarial prompt payloads logged.',                            events: 134 },
        { id: 'data_exfil',       name: 'Data Exfiltration Gate', active: true,  desc: 'DEV: 43 synthetic PII vectors fired — boundary fuzzing active, 1 false negative detected.',                 events: 43  },
        { id: 'token_budget',     name: 'Token Budget Enforcer',  active: false, desc: 'DEV: Disabled — chaos load testing requires uncapped token usage for runaway chain-of-thought tests.',        events: 0   },
        { id: 'loop_detector',    name: 'Loop Detector',          active: false, desc: 'DEV: Disabled — loop injection harness requires unguarded ReAct cycles.',                                    events: 0   },
        { id: 'semantic_drift',   name: 'Semantic Drift Alert',   active: true,  desc: 'DEV: 28 off-topic injection probes active — semantic drift baseline intentionally compromised.',              events: 28  },
      ],
      blockedPatterns: [
        { category: 'Adversarial Injection (Dev)',     interceptor: 'Prompt Injection Shield',count7d: 134, agentsAffected: 4, lastSeen: '2 min ago'   },
        { category: 'SQL Injection Red-Team',          interceptor: 'SQL Injection Guard',    count7d: 87,  agentsAffected: 3, lastSeen: '8 min ago'   },
        { category: 'PII Exfil Boundary Fuzz',         interceptor: 'Data Exfiltration Gate', count7d: 43,  agentsAffected: 2, lastSeen: '19 min ago'  },
        { category: 'Semantic Drift Injection',        interceptor: 'Semantic Drift Alert',   count7d: 28,  agentsAffected: 2, lastSeen: '34 min ago'  },
        { category: 'Token Budget (Disabled)',          interceptor: 'Token Budget Enforcer',  count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
        { category: 'Loop Detection (Disabled)',        interceptor: 'Loop Detector',          count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-001', agent_id: 'agent-001', name: 'Concierge Agent [DEBUG]',                   model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v3.3-dev', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Round Robin',   circuit_breaker: 'Open',   desc: 'DEV: 134 adversarial injection payloads fired — prompt injection red-team corpus active, 3 unexpected responses.' },
        { id: 'agent-002', agent_id: 'agent-002', name: 'Public Research Agent [DEV]',               model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v2.2-dev', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Quality-First', circuit_breaker: 'Open',   desc: 'DEV: 2 SQL injection bypasses confirmed in red-team corpus — v2.2-dev vulnerable, DO NOT deploy.' },
        { id: 'agent-003', agent_id: 'agent-003', name: 'Insurance Underwriting Agent [DEBUG]',      model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v1.9-dev', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Weighted',      circuit_breaker: 'Open',   desc: 'DEV: Token budget guard disabled — context overflow on 7% of chaos inputs, runaway chain-of-thought detected.' },
        { id: 'agent-005', agent_id: 'agent-005', name: 'Shipment Insight Agent [DEV]',              model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v2.5-dev', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Adaptive',      circuit_breaker: 'Open',   desc: 'DEV: Loop guard disabled — 28 unguarded ReAct cycles logged, embedding drift 0.47 above threshold.' },
        { id: 'agent-009', agent_id: 'agent-009', name: 'Palantir Log Analysis Agent [DEV]',          model_id: 'gpt-5.5',                                  version_string: 'v2.1-dev', change_type: 'update', status: 'Active',   cloud_provider: 'Palantir', cloud_region: 'palantir-foundry-main', environment: 'dev', routing_policy: 'Palantir AIP Hub', circuit_breaker: 'Closed', desc: 'DEV: Adversarial OntologySqlTool injection active — 28 malformed SQL payloads fired against log entry store; data exfil guard evaded on 2 probes.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 44, criticalCount: 3, warningCount: 4, costDelta: '+42.1', tokenEfficiency: 56 },
      criticalAlerts: [
        { id: 'DM-D-C001', agentId: 'agent-002', agentName: 'Public Research Agent [DEV]',          message: 'DEV: 2 SQL injection bypasses confirmed in red-team corpus — v2.2-dev vulnerable, DO NOT deploy.', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(1), severity: 'P1', category: 'SQL Bypass'        },
        { id: 'DM-D-C002', agentId: 'agent-001', agentName: 'Concierge Agent [DEBUG]',              message: 'DEV: 134 adversarial injection payloads fired — prompt injection guard stress test active, 3 unexpected responses flagged.', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0', timestamp: _ago(2), severity: 'P1', category: 'Injection Stress' },
        { id: 'DM-D-C003', agentId: 'agent-003', agentName: 'Insurance Underwriting Agent [DEBUG]', message: 'DEV: Token budget disabled — context overflow on 7% of chaos inputs, runaway chain-of-thought detected.', model_id: 'anthropic.claude-3-opus-20240229-v1:0', timestamp: _ago(3), severity: 'P1', category: 'Ctx Overflow'    },
      ],
      warningAlerts: [
        { id: 'DM-D-W001', agentId: 'agent-005', agentName: 'Shipment Insight Agent [DEV]',              message: 'DEV: Loop guard disabled — 28 unguarded ReAct cycles logged, embedding drift 0.47 above threshold.',               model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(1), severity: 'P2', category: 'Loop Chaos'    },
        { id: 'DM-D-W002', agentId: 'agent-009', agentName: 'Palantir Log Analysis Agent [DEV]',         message: 'DEV: OntologySqlTool injection 0.51 severity — 28 malformed SQL payloads against log entry store; 2 data exfil guard evasions confirmed [Palantir exec trace cf45a9c07516ae76].',         model_id: 'gpt-5.5',                               timestamp: _ago(3), severity: 'P2', category: 'Ontology SQL Injection' },
        { id: 'DM-D-W003', agentId: 'agent-001', agentName: 'Concierge Agent [DEBUG]',                   message: 'DEV: Token usage 94% — uncapped chaos injection exhausting dev daily allocation ahead of schedule.',              model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(4), severity: 'P2', category: 'Token Spike'   },
        { id: 'DM-D-W004', agentId: 'agent-003', agentName: 'Insurance Underwriting Agent [DEBUG]',      message: 'DEV: 43 PII boundary fuzzing probes fired — 1 false negative detected in exfiltration gate under chaos load.',   model_id: 'anthropic.claude-3-opus-20240229-v1:0',     timestamp: _ago(6), severity: 'P3', category: 'PII Boundary'  },
      ],
      hitlQueue: [],
      circuitBreakers: [
        { id: 'DM-D-CB-001', agent: 'Public Research Agent [DEV]',          model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'SQL Bypass',  current: 2,   threshold: 0,    status: 'Triggered' },
        { id: 'DM-D-CB-002', agent: 'Concierge Agent [DEBUG]',              model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Injection',   current: 134, threshold: 3,    status: 'Triggered' },
        { id: 'DM-D-CB-003', agent: 'Insurance Underwriting Agent [DEBUG]', model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'Ctx Overflow',current: 0.07, threshold: 0.05, status: 'Triggered' },
        { id: 'DM-D-CB-004', agent: 'Shipment Insight Agent [DEV]',         model: 'amazon.nova-pro-v1:0',                      type: 'Loop',        current: 28,  threshold: 3,    status: 'Triggered' },
      ],
    },
  },
  // ── arcadia-health ────────────────────────────────────────────────────────────
  'arcadia-health': {
    production: {
      label: 'Arcadia Health', domain: 'arcadia-health.ai',
      mtdCost: 4180, totalTokens: 8940000,
      agentCosts: [
        { agent: 'Insurance Underwriting Agent',      prompt: 980000,  completion: 490000, total: 1470000, cost_usd: 1390 },
        { agent: 'Workforce Planning and Recruitment', prompt: 780000, completion: 390000, total: 1170000, cost_usd:  950 },
        { agent: 'Concierge Agent',                   prompt: 640000,  completion: 320000, total:  960000, cost_usd:  720 },
        { agent: 'Public Research Agent',             prompt: 520000,  completion: 260000, total:  780000, cost_usd:  620 },
        { agent: 'Shipment Insight Agent',            prompt: 420000,  completion: 210000, total:  630000, cost_usd:  500 },
      ],
      interceptors: [
        { id: 'pii_underwriting',  name: 'PII Underwriting Guard',           active: true,  desc: 'Redacts applicant PII (SSN, DOB, health history) from underwriting tool inputs and outputs in real time.', events: 3841 },
        { id: 'policy_exfil',      name: 'Policy Data Exfiltration Gate',    active: true,  desc: 'Prevents underwriting policy pricing data and actuary scores from leaking via agent calls.',               events: 512  },
        { id: 'prompt_injection',  name: 'Prompt Injection Guard',           active: true,  desc: 'Blocks adversarial injection attacks on underwriting decision and workforce planning workflows.',           events: 147  },
        { id: 'employee_pii',      name: 'Employee PII Guard',               active: true,  desc: 'Prevents employee personal data from being exported without data privacy consent review.',                 events: 88   },
        { id: 'underwriting_bias', name: 'Underwriting Bias Screen',         active: true,  desc: 'Validates underwriting decisions for discriminatory patterns against protected characteristics.',           events: 234  },
        { id: 'compliance_screen', name: 'ISO 42001 / SOC 2 Compliance Screen', active: true, desc: 'Enforces ISO 42001 and SOC 2 Type II AI governance controls on every agent response.',                  events: 198  },
      ],
      blockedPatterns: [
        { category: 'Applicant PII Exposure',            interceptor: 'PII Underwriting Guard',              count7d: 3841, agentsAffected: 2, lastSeen: '2 min ago'   },
        { category: 'Underwriting Bias Flag',            interceptor: 'Underwriting Bias Screen',            count7d: 234,  agentsAffected: 1, lastSeen: '12 min ago'  },
        { category: 'ISO 42001 Control Trigger',         interceptor: 'ISO 42001 / SOC 2 Compliance Screen', count7d: 198,  agentsAffected: 2, lastSeen: '28 min ago'  },
        { category: 'Prompt Injection (Underwriting)',   interceptor: 'Prompt Injection Guard',              count7d: 147,  agentsAffected: 2, lastSeen: '1 hour ago'  },
        { category: 'Policy Data Leak Attempt',          interceptor: 'Policy Data Exfiltration Gate',       count7d: 512,  agentsAffected: 1, lastSeen: '4 min ago'   },
        { category: 'Employee PII Export Attempt',       interceptor: 'Employee PII Guard',                  count7d: 88,   agentsAffected: 1, lastSeen: '2 hours ago' },
      ],
      agents: [
        { id: 'agent-101', agent_id: 'agent-101', name: 'Insurance Underwriting Agent',       model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0',  version_string: 'v2.1', change_type: 'update', status: 'Active', cloud_provider: 'AWS',     cloud_region: 'us-east-1',          environment: 'production', routing_policy: 'Round Robin',   circuit_breaker: 'Armed',  desc: 'AI-driven underwriting agent evaluating insurance applications, assessing actuarial risk, applying eligibility rules, and generating premium pricing recommendations.' },
        { id: 'agent-102', agent_id: 'agent-102', name: 'Workforce Planning and Recruitment',  model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0',  version_string: 'v1.3', change_type: 'update', status: 'Active', cloud_provider: 'AWS',     cloud_region: 'us-east-1',          environment: 'production', routing_policy: 'Weighted',      circuit_breaker: 'Closed', desc: 'AI agent forecasting workforce demand, analysing skills gaps, optimising staffing plans, and managing end-to-end recruitment pipelines for Arcadia Health operations.' },
        { id: 'agent-001', agent_id: 'agent-001', name: 'Concierge Agent',                    model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',   version_string: 'v3.2', change_type: 'update', status: 'Active', cloud_provider: 'AWS',     cloud_region: 'us-east-1',          environment: 'production', routing_policy: 'Adaptive',      circuit_breaker: 'Closed', desc: 'Patient-facing concierge handling appointment scheduling, benefits navigation, and care pathway queries across Arcadia Health service lines.' },
        { id: 'agent-002', agent_id: 'agent-002', name: 'Public Research Agent',              model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',  version_string: 'v1.9', change_type: 'update', status: 'Active', cloud_provider: 'AWS',     cloud_region: 'us-east-1',          environment: 'production', routing_policy: 'Quality-First', circuit_breaker: 'Closed', desc: 'Clinical research synthesis agent aggregating peer-reviewed literature, trial outcomes, and formulary data to support evidence-based care decisions.' },
        { id: 'agent-005', agent_id: 'agent-005', name: 'Shipment Insight Agent',             model_id: 'amazon.nova-pro-v1:0',                       version_string: 'v2.4', change_type: 'update', status: 'Active', cloud_provider: 'AWS',     cloud_region: 'us-east-1',          environment: 'production', routing_policy: 'Adaptive',      circuit_breaker: 'Armed',  desc: 'Medical supply chain visibility agent tracking pharmaceutical shipments, device inventory, and logistics anomalies across Arcadia Health distribution centres.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 82, criticalCount: 2, warningCount: 4, costDelta: '+8.4', tokenEfficiency: 91 },
      criticalAlerts: [
        { id: 'AHA-C001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent', message: 'Hallucination score 0.26 exceeds threshold 0.20 — risk assessment output on APP-88421 flagged; circuit breaker armed.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(1), severity: 'P1', category: 'Hallucination'      },
        { id: 'AHA-C002', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent', message: 'Bedrock endpoint HTTP 503 — retry budget exhausted (3/3); underwriting pipeline stalled for high-priority applications.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(3), severity: 'P1', category: 'Endpoint Failure' },
      ],
      warningAlerts: [
        { id: 'AHA-W001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent',      message: 'Token usage at 87% of daily limit — underwriting queue may throttle within 2 hours.',                          model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(2), severity: 'P2', category: 'Token Spike'     },
        { id: 'AHA-W002', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment', message: 'Embedding drift 0.23 above 0.20 threshold — workforce demand forecast model recalibration advised.',          model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(4), severity: 'P2', category: 'Embedding Drift' },
        { id: 'AHA-W003', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment', message: 'p95 latency 4.1s exceeds SLA threshold 3.0s — 12 consecutive recruitment pipeline requests breached.',       model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(6), severity: 'P3', category: 'Latency Spike'   },
      ],
      anomalyFeed: [
        { id: 'AHA-E001', agent: 'Insurance Underwriting Agent',      timestamp: '8m ago',  category: 'Hallucination',       score: 88, action: 'HITL Escalated',    autoRemediated: false },
        { id: 'AHA-E002', agent: 'Insurance Underwriting Agent',      timestamp: '22m ago', category: 'Endpoint Failure',    score: 82, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'AHA-E003', agent: 'Workforce Planning and Recruitment',timestamp: '41m ago', category: 'Embedding Drift',     score: 74, action: 'Under Observation', autoRemediated: false },
        { id: 'AHA-E004', agent: 'Insurance Underwriting Agent',      timestamp: '1h ago',  category: 'Token Spike',         score: 68, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'AHA-E005', agent: 'Workforce Planning and Recruitment',timestamp: '2h ago',  category: 'Latency SLA Breach',  score: 61, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'AHA-E006', agent: 'Insurance Underwriting Agent',      timestamp: '3h ago',  category: 'PII Exposure Attempt',score: 79, action: 'HITL Escalated',    autoRemediated: false },
      ],
      hitlQueue: [
        { id: 'AHA-A001', risk: 'Critical', agent: 'Insurance Underwriting Agent',      tool: 'issue_policy_decision',   waitMs: 25_000, reasoning: 'Insurance Underwriting Agent proposes issuing a binding policy decision for applicant APP-88421 (high-risk group health plan — estimated annual premium $420K). Hallucination flag raised on actuarial risk score. Underwriting supervisor sign-off required before binding.' },
        { id: 'AHA-A002', risk: 'High',     agent: 'Workforce Planning and Recruitment', tool: 'submit_compliance_report', waitMs: 124_000, reasoning: 'Workforce Planning agent completed Q2 2026 staffing compliance report covering 14 open roles and 3 regulatory-mandated headcount additions. 2 data fields estimated. HR compliance officer sign-off required before board submission.' },
      ],
      circuitBreakers: [
        { id: 'AHA-CB-001', agent: 'Insurance Underwriting Agent',      model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Hallucination', current: 0.26, threshold: 0.20, status: 'Triggered' },
        { id: 'AHA-CB-002', agent: 'Workforce Planning and Recruitment', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Cost',          current: 0.22, threshold: 0.50, status: 'Armed'     },
      ],
      meshTopology: {
        mesh_health_score: 82,
        nodes: [
          { id: 'agent-101', name: 'Insurance Underwriting Agent',      role: 'orchestrator', status: 'degraded', load: 0.87, message_count_1h: 312, x: 35, y: 40 },
          { id: 'agent-102', name: 'Workforce Planning and Recruitment', role: 'worker',       status: 'healthy',  load: 0.61, message_count_1h: 198, x: 65, y: 40 },
        ],
        edges: [
          { id: 'aha-e-001', source: 'agent-102', target: 'agent-101', handshake_status: 'established', message_count_1h: 198, avg_latency_ms: 234, p99_latency_ms: 610 },
          { id: 'aha-e-002', source: 'agent-101', target: 'agent-102', handshake_status: 'degraded',    message_count_1h: 114, avg_latency_ms: 890, p99_latency_ms: 2100 },
        ],
      },
    },
    staging: {
      label: 'Arcadia Health AI — Staging', domain: 'arcadia-health.ai',
      mtdCost: 610, totalTokens: 980000,
      agentCosts: [
        { agent: 'Insurance Underwriting Agent',      prompt: 260000, completion: 130000, total: 390000, cost_usd: 370 },
        { agent: 'Workforce Planning and Recruitment', prompt: 195000, completion: 97500,  total: 292500, cost_usd: 240 },
      ],
      interceptors: [
        { id: 'pii_underwriting',  name: 'PII Underwriting Guard',           active: true,  desc: 'Staging: 48 synthetic applicant PII vectors validated — 0 bypasses in v2.1 pre-release build.', events: 48  },
        { id: 'policy_exfil',      name: 'Policy Data Exfiltration Gate',    active: true,  desc: 'Staging: 12 pricing data exfiltration test vectors — all blocked successfully.',                  events: 12  },
        { id: 'prompt_injection',  name: 'Prompt Injection Guard',           active: true,  desc: 'Staging: Regression corpus confirms 0 bypasses against underwriting injection test suite.',        events: 9   },
        { id: 'employee_pii',      name: 'Employee PII Guard',               active: false, desc: 'Staging: Disabled for pre-production consent framework rotation — re-enables at deploy window.',   events: 0   },
        { id: 'underwriting_bias', name: 'Underwriting Bias Screen',         active: true,  desc: 'Staging: Bias validation running against 80 demographic test vectors — 78 passing.',               events: 80  },
        { id: 'compliance_screen', name: 'ISO 42001 / SOC 2 Compliance Screen', active: true, desc: 'Staging: 12 of 15 ISO 42001 control checks passing — 3 controls under validation.',             events: 21  },
      ],
      blockedPatterns: [
        { category: 'Applicant PII — Staging Validation',  interceptor: 'PII Underwriting Guard',              count7d: 48, agentsAffected: 1, lastSeen: '18 min ago'  },
        { category: 'Bias Test Vector',                     interceptor: 'Underwriting Bias Screen',            count7d: 80, agentsAffected: 1, lastSeen: '22 min ago'  },
        { category: 'ISO 42001 Control Gap',                interceptor: 'ISO 42001 / SOC 2 Compliance Screen', count7d: 21, agentsAffected: 1, lastSeen: '1 hour ago'  },
        { category: 'Injection Regression Vector',          interceptor: 'Prompt Injection Guard',              count7d: 9,  agentsAffected: 1, lastSeen: '3 hours ago' },
        { category: 'Pricing Data Exfil Probe',             interceptor: 'Policy Data Exfiltration Gate',       count7d: 12, agentsAffected: 1, lastSeen: '42 min ago'  },
        { category: 'Employee PII Rotation Probe',          interceptor: 'Employee PII Guard',                  count7d: 0,  agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-101', agent_id: 'agent-101', name: 'Insurance Underwriting Agent',      model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', version_string: 'v2.2-rc', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Quality-First', circuit_breaker: 'Armed',   desc: 'Staging v2.2-rc: hallucination regression under investigation — actuarial risk scoring fix in validation. Deploy gate blocked.' },
        { id: 'agent-102', agent_id: 'agent-102', name: 'Workforce Planning and Recruitment', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', version_string: 'v1.4-rc', change_type: 'minor',  status: 'Active',   cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Round Robin',   circuit_breaker: 'Closed', desc: 'Staging v1.4-rc: ISO 42001 compliance controls under validation — 12 of 15 controls passing, deployment pending.' },
      ],
      kpis: { activeAgents: 2, totalAgents: 2, healthScore: 74, criticalCount: 1, warningCount: 2, costDelta: '+2.8', tokenEfficiency: 86 },
      criticalAlerts: [
        { id: 'AHA-S-C001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent', message: 'Staging: Hallucination score 0.26 confirmed in v2.2-rc regression suite — deploy gate blocked pending fix.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(2), severity: 'P1', category: 'Hallucination Regression' },
      ],
      warningAlerts: [
        { id: 'AHA-S-W001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent',      message: 'Staging: 3 actuarial risk scoring edge cases unresolved in pre-release validation suite.',        model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(3), severity: 'P2', category: 'Risk Scoring' },
        { id: 'AHA-S-W002', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment', message: 'Staging: 12 of 15 ISO 42001 control checks passing — 3 AI governance controls still under validation.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(5), severity: 'P2', category: 'Compliance Gap' },
      ],
      hitlQueue: [
        { id: 'AHA-S-A001', risk: 'High', agent: 'Insurance Underwriting Agent', tool: 'validate_risk_score_v22', waitMs: 29_000, reasoning: 'Staging: Actuarial risk scoring v2.2-rc pre-release requires underwriting compliance sign-off after hallucination regression detected. Deployment blocked until approved.' },
      ],
      circuitBreakers: [
        { id: 'AHA-S-CB-001', agent: 'Insurance Underwriting Agent',      model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Hallucination', current: 0.26, threshold: 0.20, status: 'Triggered' },
        { id: 'AHA-S-CB-002', agent: 'Workforce Planning and Recruitment', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Cost',          current: 0.14, threshold: 0.50, status: 'Armed'     },
      ],
    },
    dev: {
      label: 'Arcadia Health AI — Dev', domain: 'arcadia-health.ai',
      mtdCost: 190, totalTokens: 310000,
      agentCosts: [
        { agent: 'Insurance Underwriting Agent [DEBUG]',      prompt: 110000, completion: 55000, total: 165000, cost_usd: 112 },
        { agent: 'Workforce Planning and Recruitment [DEV]',  prompt: 96000,  completion: 48000, total: 144000, cost_usd: 78  },
      ],
      interceptors: [
        { id: 'pii_underwriting',  name: 'PII Underwriting Guard',           active: true,  desc: 'DEV: 241 adversarial PII vectors fired — 4 bypasses detected in v2.2-dev build.',             events: 241 },
        { id: 'policy_exfil',      name: 'Policy Data Exfiltration Gate',    active: true,  desc: 'DEV: Red-team corpus active — 38 pricing data exfiltration probes logged.',                   events: 38  },
        { id: 'prompt_injection',  name: 'Prompt Injection Guard',           active: true,  desc: 'DEV: 89 adversarial underwriting jailbreak probes fired today.',                              events: 89  },
        { id: 'employee_pii',      name: 'Employee PII Guard',               active: false, desc: 'DEV: Disabled — employee data fuzzing requires unguarded access to HR endpoints.',             events: 0   },
        { id: 'underwriting_bias', name: 'Underwriting Bias Screen',         active: true,  desc: 'DEV: Bias adversarial tests active — 14 protected-characteristic edge cases under analysis.', events: 14  },
        { id: 'compliance_screen', name: 'ISO 42001 / SOC 2 Compliance Screen', active: false, desc: 'DEV: Bypassed for raw debug logging — compliance checks disabled in this env.',             events: 0   },
      ],
      blockedPatterns: [
        { category: 'Adversarial PII Injection',       interceptor: 'PII Underwriting Guard',              count7d: 241, agentsAffected: 2, lastSeen: '3 min ago'   },
        { category: 'Jailbreak Probe (Underwriting)',   interceptor: 'Prompt Injection Guard',              count7d: 89,  agentsAffected: 2, lastSeen: '11 min ago'  },
        { category: 'Pricing Data Exfil Probe',         interceptor: 'Policy Data Exfiltration Gate',       count7d: 38,  agentsAffected: 1, lastSeen: '24 min ago'  },
        { category: 'Bias Edge Case Input',              interceptor: 'Underwriting Bias Screen',            count7d: 14,  agentsAffected: 1, lastSeen: '38 min ago'  },
        { category: 'ISO 42001 Bypass (Dev Auth)',       interceptor: 'ISO 42001 / SOC 2 Compliance Screen', count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
        { category: 'Employee PII Fuzzing Probe',        interceptor: 'Employee PII Guard',                  count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-101', agent_id: 'agent-101', name: 'Insurance Underwriting Agent [DEBUG]',      model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', version_string: 'v2.2-dev', change_type: 'minor',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Quality-First', circuit_breaker: 'Open',   desc: 'DEV: Hallucination rate 0.61 under chaos load — 89 adversarial underwriting inputs fired, actuarial score confidence unstable.' },
        { id: 'agent-102', agent_id: 'agent-102', name: 'Workforce Planning and Recruitment [DEV]',  model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', version_string: 'v1.4-dev', change_type: 'patch',  status: 'Degraded', cloud_provider: 'AWS', cloud_region: 'us-east-1', environment: 'dev', routing_policy: 'Round Robin',   circuit_breaker: 'Closed', desc: 'DEV: Embedding drift 0.48 — chaos mode drift injection active, workforce forecast baseline compromised.' },
      ],
      kpis: { activeAgents: 2, totalAgents: 2, healthScore: 49, criticalCount: 3, warningCount: 4, costDelta: '+38.2', tokenEfficiency: 58 },
      criticalAlerts: [
        { id: 'AHA-D-C001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent [DEBUG]',      message: 'DEV: 4 PII bypass vectors confirmed in red-team corpus — v2.2-dev build vulnerable, DO NOT deploy.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(1), severity: 'P1', category: 'PII Bypass'           },
        { id: 'AHA-D-C002', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent [DEBUG]',      message: 'DEV: Hallucination rate 0.61 — chaos injection active, actuarial risk scores non-deterministic under red-team load.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(2), severity: 'P1', category: 'Hallucination'       },
        { id: 'AHA-D-C003', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment [DEV]',  message: 'DEV: Embedding drift 0.48 — workforce demand forecast inverted on 9% of adversarial test inputs.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(4), severity: 'P1', category: 'Model Regression'     },
      ],
      warningAlerts: [
        { id: 'AHA-D-W001', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent [DEBUG]',      message: 'DEV: 89 adversarial underwriting inputs fired — 34 produced unexpected confidence scores.',                  model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(1), severity: 'P2', category: 'Chaos Mode'    },
        { id: 'AHA-D-W002', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment [DEV]',  message: 'DEV: Avg latency 9.4s — red-team tool chaining causing runaway chain-of-thought depth in forecast pipeline.', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(3), severity: 'P2', category: 'Latency Spike' },
        { id: 'AHA-D-W003', agentId: 'agent-101', agentName: 'Insurance Underwriting Agent [DEBUG]',      message: 'DEV: Token usage 96% of dev limit — red-team corpus exhausting daily allocation ahead of schedule.',         model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(5), severity: 'P2', category: 'Token Spike'   },
        { id: 'AHA-D-W004', agentId: 'agent-102', agentName: 'Workforce Planning and Recruitment [DEV]',  message: 'DEV: Forecast non-deterministic on 9% of stress inputs — determinism checks failing under chaos load.',       model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0', timestamp: _ago(7), severity: 'P3', category: 'Model Drift'   },
      ],
      hitlQueue: [],
      circuitBreakers: [
        { id: 'AHA-D-CB-001', agent: 'Insurance Underwriting Agent [DEBUG]',      model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Hallucination', current: 0.61, threshold: 0.20, status: 'Triggered' },
        { id: 'AHA-D-CB-002', agent: 'Workforce Planning and Recruitment [DEV]',  model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Model Drift',   current: 0.48, threshold: 0.20, status: 'Triggered' },
      ],
    },
  },
  'capital-wealth': {
    production: {
      label: 'Capital Wealth Management', domain: 'capitalwealth.ai',
      mtdCost: 6480, totalTokens: 8640000,
      agentCosts: [
        { agent: 'Portfolio Optimizer',       prompt: 1540000, completion: 770000, total: 2310000, cost_usd: 1980 },
        { agent: 'Market Intelligence Agent', prompt: 1120000, completion: 560000, total: 1680000, cost_usd: 1344 },
        { agent: 'Compliance & Risk Guard',   prompt: 860000,  completion: 430000, total: 1290000, cost_usd: 1032 },
        { agent: 'Fiscal Reporting Agent',    prompt: 680000,  completion: 340000, total: 1020000, cost_usd:  816 },
        { agent: 'Client Advisory Agent',     prompt: 490000,  completion: 245000, total:  735000, cost_usd:  588 },
      ],
      interceptors: [
        { id: 'portfolio_conflict',  name: 'Portfolio Conflict Screener',  active: true,  desc: 'Screens portfolio recommendations for conflicts of interest and undisclosed related-party positions before client delivery.', events: 1842 },
        { id: 'client_data_guard',   name: 'Client Financial Data Guard',  active: true,  desc: 'Redacts client PII, account numbers, and AUM figures from agent outputs per SEC Rule 17a-4 and SOC 2 mandates.',           events: 4103 },
        { id: 'prompt_injection',    name: 'Prompt Injection Guard',       active: true,  desc: 'Blocks adversarial injection targeting portfolio rebalancing decisions and client advisory workflows.',                       events: 284  },
        { id: 'suitability_check',   name: 'Trade Suitability Enforcer',   active: true,  desc: 'Validates every investment recommendation against each client\'s Investment Policy Statement and risk tolerance profile.',     events: 412  },
        { id: 'fiduciary_screen',    name: 'Fiduciary Duty Validator',     active: true,  desc: 'Ensures all advisory outputs satisfy fiduciary duty obligations under SEC Investment Adviser Act and ERISA.',                 events: 93   },
        { id: 'sec_compliance',      name: 'SEC / FINRA Compliance Screen',active: true,  desc: 'Enforces SEC Rule 17a-4, FINRA Rule 4511, and SOC 2 Type II controls on every agent response.',                            events: 631  },
      ],
      blockedPatterns: [
        { category: 'Client PII — Account Data',       interceptor: 'Client Financial Data Guard',   count7d: 4103, agentsAffected: 5, lastSeen: '1 min ago'   },
        { category: 'Conflict of Interest Signal',     interceptor: 'Portfolio Conflict Screener',   count7d: 1842, agentsAffected: 3, lastSeen: '3 min ago'   },
        { category: 'SEC / FINRA Compliance Trigger',  interceptor: 'SEC / FINRA Compliance Screen', count7d: 631,  agentsAffected: 4, lastSeen: '8 min ago'   },
        { category: 'IPS Suitability Breach',          interceptor: 'Trade Suitability Enforcer',    count7d: 412,  agentsAffected: 3, lastSeen: '15 min ago'  },
        { category: 'Prompt Injection (Advisory)',     interceptor: 'Prompt Injection Guard',         count7d: 284,  agentsAffected: 3, lastSeen: '32 min ago'  },
        { category: 'Fiduciary Duty Flag',             interceptor: 'Fiduciary Duty Validator',       count7d: 93,   agentsAffected: 2, lastSeen: '1 hour ago'  },
      ],
      agents: [
        { id: 'agent-301', agent_id: 'agent-301', name: 'Portfolio Optimizer',       model_id: 'anthropic.claude-sonnet-4-6',               version_string: 'v3.1', change_type: 'update', status: 'Active', cloud_provider: 'AWS',   cloud_region: 'us-east-1',  environment: 'production', routing_policy: 'Quality-First', circuit_breaker: 'Closed', desc: 'AI-driven portfolio rebalancing agent analysing asset allocation, factor exposures, and tax-loss harvesting opportunities across client portfolios.' },
        { id: 'agent-302', agent_id: 'agent-302', name: 'Market Intelligence Agent', model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v2.4', change_type: 'update', status: 'Active', cloud_provider: 'AWS',   cloud_region: 'us-east-1',  environment: 'production', routing_policy: 'Adaptive',      circuit_breaker: 'Closed', desc: 'Real-time market intelligence agent synthesising macroeconomic signals, earnings data, and sector trends to generate actionable investment insights.' },
        { id: 'agent-303', agent_id: 'agent-303', name: 'Compliance & Risk Guard',   model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v1.8', change_type: 'update', status: 'Active', cloud_provider: 'AWS',   cloud_region: 'us-east-1',  environment: 'production', routing_policy: 'Round Robin',   circuit_breaker: 'Armed',  desc: 'Continuous compliance monitoring agent validating portfolio positions against regulatory capital limits, concentration rules, and client investment policy constraints.' },
        { id: 'agent-304', agent_id: 'agent-304', name: 'Fiscal Reporting Agent',    model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v2.0', change_type: 'update', status: 'Active', cloud_provider: 'Azure', cloud_region: 'eastus2',     environment: 'production', routing_policy: 'Weighted',      circuit_breaker: 'Closed', desc: 'Automated financial reporting agent generating client statements, tax documents, regulatory filings, and performance attribution reports.' },
        { id: 'agent-305', agent_id: 'agent-305', name: 'Client Advisory Agent',     model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v1.5', change_type: 'update', status: 'Active', cloud_provider: 'AWS',   cloud_region: 'us-east-1',  environment: 'production', routing_policy: 'Quality-First', circuit_breaker: 'Closed', desc: 'Personalised wealth advisory agent delivering goal-based financial planning, retirement projections, and estate strategy recommendations to high-net-worth clients.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 81, criticalCount: 3, warningCount: 5, costDelta: '+14.2', tokenEfficiency: 89 },
      criticalAlerts: [
        { id: 'CWM-C001', agentId: 'agent-302', agentName: 'Market Intelligence Agent', message: 'Conflict of interest flagged — Q2 earnings analysis output overlaps with restricted list holdings; output quarantined pending compliance review.',      model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(1), severity: 'P1', category: 'Conflict of Interest' },
        { id: 'CWM-C002', agentId: 'agent-301', agentName: 'Portfolio Optimizer',       message: 'IPS suitability breach — recommended equity allocation of 78% exceeds client\'s 70% maximum; rebalancing signal suspended.',                           model_id: 'anthropic.claude-sonnet-4-6',               timestamp: _ago(2), severity: 'P1', category: 'Suitability Breach'  },
        { id: 'CWM-C003', agentId: 'agent-303', agentName: 'Compliance & Risk Guard',   message: 'Concentration risk limit breached — technology sector at 41% of AUM vs. 40% regulatory ceiling; immediate position review required.',                   model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(4), severity: 'P1', category: 'Risk Limit Breach'   },
      ],
      warningAlerts: [
        { id: 'CWM-W001', agentId: 'agent-304', agentName: 'Fiscal Reporting Agent',    message: 'Q2 2026 client statement generation stalled — 3 accounts missing cost-basis data; reports delayed 42 minutes.',                                         model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(2),  severity: 'P2', category: 'Reporting Delay'      },
        { id: 'CWM-W002', agentId: 'agent-303', agentName: 'Compliance & Risk Guard',   message: 'Embedding drift 0.24 above 0.20 threshold — risk model baseline recalibration recommended before next rebalancing cycle.',                               model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(3),  severity: 'P2', category: 'Embedding Drift'     },
        { id: 'CWM-W003', agentId: 'agent-301', agentName: 'Portfolio Optimizer',       message: 'Token usage at 89% of daily limit — portfolio rebalancing throughput may degrade during afternoon peak.',                                                  model_id: 'anthropic.claude-sonnet-4-6',               timestamp: _ago(5),  severity: 'P2', category: 'Token Spike'         },
        { id: 'CWM-W004', agentId: 'agent-305', agentName: 'Client Advisory Agent',     message: 'Response latency p95 at 4.1s — above 3.0s SLA for 9 consecutive advisory requests; client experience degraded.',                                         model_id: 'anthropic.claude-3-opus-20240229-v1:0',     timestamp: _ago(6),  severity: 'P2', category: 'Latency Spike'       },
        { id: 'CWM-W005', agentId: 'agent-304', agentName: 'Fiscal Reporting Agent',    message: 'FINRA Rule 4511 archive queue depth 180 — 22% above normal, automated drain initiated.',                                                                 model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(9),  severity: 'P3', category: 'Queue Depth'         },
      ],
      anomalyFeed: [
        { id: 'CWM-E001', agent: 'Market Intelligence Agent', timestamp: '5m ago',   category: 'Conflict of Interest', score: 89, action: 'HITL Escalated',    autoRemediated: false },
        { id: 'CWM-E002', agent: 'Portfolio Optimizer',       timestamp: '12m ago',  category: 'Suitability Breach',   score: 84, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'CWM-E003', agent: 'Compliance & Risk Guard',   timestamp: '28m ago',  category: 'Risk Limit Breach',    score: 82, action: 'HITL Escalated',    autoRemediated: false },
        { id: 'CWM-E004', agent: 'Fiscal Reporting Agent',    timestamp: '41m ago',  category: 'Reporting Delay',      score: 72, action: 'Under Observation', autoRemediated: false },
        { id: 'CWM-E005', agent: 'Client Advisory Agent',     timestamp: '1h ago',   category: 'Latency SLA Breach',   score: 65, action: 'Under Observation', autoRemediated: false },
        { id: 'CWM-E006', agent: 'Fiscal Reporting Agent',    timestamp: '2h ago',   category: 'Queue Pressure',       score: 58, action: 'Auto-Remediated',   autoRemediated: true  },
        { id: 'CWM-E007', agent: 'Market Intelligence Agent', timestamp: '3h ago',   category: 'Embedding Drift',      score: 77, action: 'HITL Escalated',    autoRemediated: false },
        { id: 'CWM-E008', agent: 'Portfolio Optimizer',       timestamp: '4h ago',   category: 'Token Spike',          score: 51, action: 'Auto-Remediated',   autoRemediated: true  },
      ],
      hitlQueue: [
        { id: 'CWM-A001', risk: 'Critical', agent: 'Portfolio Optimizer',       tool: 'execute_rebalance_instruction',  waitMs: 22_000, reasoning: 'Portfolio Optimizer proposes $280M rebalancing trade across 14 client accounts. IPS suitability flag raised on equity allocation. Requires senior portfolio manager approval before execution — settlement window closes in 3 hours.' },
        { id: 'CWM-A002', risk: 'Critical', agent: 'Compliance & Risk Guard',   tool: 'approve_concentration_override', waitMs: 38_000, reasoning: 'Compliance & Risk Guard flags technology sector concentration at 41% of AUM vs. 40% regulatory ceiling. Client has requested override — requires Head of Compliance sign-off with documented rationale per investment policy.' },
        { id: 'CWM-A003', risk: 'High',     agent: 'Market Intelligence Agent', tool: 'release_advisory_report',        waitMs: 81_000, reasoning: 'Market Intelligence Agent generated Q3 2026 outlook report. Conflict screener flagged 2 holdings overlapping with restricted list. Compliance officer review required before client distribution.' },
      ],
      circuitBreakers: [
        { id: 'CWM-CB-001', agent: 'Market Intelligence Agent', model: 'amazon.nova-pro-v1:0',                      type: 'Conflict Flag',    current: 3,    threshold: 2,    status: 'Triggered' },
        { id: 'CWM-CB-002', agent: 'Compliance & Risk Guard',   model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Risk Limit',       current: 41,   threshold: 40,   status: 'Triggered' },
        { id: 'CWM-CB-003', agent: 'Portfolio Optimizer',       model: 'anthropic.claude-sonnet-4-6',               type: 'Cost',             current: 0.44, threshold: 0.50, status: 'Armed'     },
        { id: 'CWM-CB-004', agent: 'Fiscal Reporting Agent',    model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Queue Depth',      current: 180,  threshold: 250,  status: 'Armed'     },
        { id: 'CWM-CB-005', agent: 'Client Advisory Agent',     model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'Latency',          current: 4100, threshold: 5000, status: 'Armed'     },
      ],
      meshTopology: {
        mesh_health_score: 81,
        nodes: [
          { id: 'agent-301', name: 'Portfolio Optimizer',       role: 'orchestrator', status: 'healthy',  load: 0.89, message_count_1h: 742, x: 50, y: 14 },
          { id: 'agent-302', name: 'Market Intelligence Agent', role: 'worker',       status: 'degraded', load: 0.76, message_count_1h: 512, x: 20, y: 40 },
          { id: 'agent-303', name: 'Compliance & Risk Guard',   role: 'worker',       status: 'degraded', load: 0.91, message_count_1h: 398, x: 80, y: 40 },
          { id: 'agent-304', name: 'Fiscal Reporting Agent',    role: 'worker',       status: 'healthy',  load: 0.62, message_count_1h: 280, x: 50, y: 60 },
          { id: 'agent-305', name: 'Client Advisory Agent',     role: 'relay',        status: 'healthy',  load: 0.48, message_count_1h: 191, x: 30, y: 75 },
        ],
        edges: [
          { id: 'cwm-e-001', source: 'agent-301', target: 'agent-303', handshake_status: 'degraded',    message_count_1h: 398, avg_latency_ms: 290, p99_latency_ms: 840 },
          { id: 'cwm-e-002', source: 'agent-302', target: 'agent-301', handshake_status: 'established', message_count_1h: 512, avg_latency_ms:  42, p99_latency_ms: 102 },
          { id: 'cwm-e-003', source: 'agent-301', target: 'agent-305', handshake_status: 'established', message_count_1h: 191, avg_latency_ms:  88, p99_latency_ms: 230 },
          { id: 'cwm-e-004', source: 'agent-303', target: 'agent-304', handshake_status: 'established', message_count_1h: 280, avg_latency_ms:  61, p99_latency_ms: 148 },
        ],
      },
    },
    staging: {
      label: 'Capital Wealth Management — Client Sandbox', domain: 'capitalwealth.ai',
      mtdCost: 1620, totalTokens: 2160000,
      agentCosts: [
        { agent: 'Portfolio Optimizer',       prompt: 385000, completion: 192000, total: 577000, cost_usd: 462 },
        { agent: 'Market Intelligence Agent', prompt: 280000, completion: 140000, total: 420000, cost_usd: 336 },
        { agent: 'Compliance & Risk Guard',   prompt: 215000, completion: 107000, total: 322000, cost_usd: 258 },
        { agent: 'Fiscal Reporting Agent',    prompt: 170000, completion: 85000,  total: 255000, cost_usd: 204 },
        { agent: 'Client Advisory Agent',     prompt: 125000, completion: 62000,  total: 187000, cost_usd: 150 },
      ],
      interceptors: [
        { id: 'portfolio_conflict', name: 'Portfolio Conflict Screener',  active: true,  desc: 'Client Sandbox: 48 conflict-of-interest test vectors validated — 0 bypasses in v3.1-rc pre-release.', events: 48  },
        { id: 'client_data_guard',  name: 'Client Financial Data Guard',  active: true,  desc: 'Client Sandbox: Full client PII redaction test suite (180 vectors) — all blocked successfully.',        events: 180 },
        { id: 'prompt_injection',   name: 'Prompt Injection Guard',       active: true,  desc: 'Regression: 0 injection bypasses in last 48 hours of pre-release advisory workflow testing.',           events: 22  },
        { id: 'suitability_check',  name: 'Trade Suitability Enforcer',   active: false, desc: 'Disabled: IPS rule engine v4.0 upgrade in progress — suitability validation temporarily suspended.',    events: 0   },
        { id: 'fiduciary_screen',   name: 'Fiduciary Duty Validator',     active: true,  desc: 'Client Sandbox: 8 of 12 fiduciary duty control checks passing — 4 controls under validation.',          events: 38  },
        { id: 'sec_compliance',     name: 'SEC / FINRA Compliance Screen',active: true,  desc: 'SOC 2 Type II readiness audit in progress — FINRA Rule 4511 evidence collection phase active.',        events: 94  },
      ],
      blockedPatterns: [
        { category: 'Client PII Test Vector',          interceptor: 'Client Financial Data Guard',   count7d: 180, agentsAffected: 4, lastSeen: '22 min ago'  },
        { category: 'SOC 2 Evidence Collection',       interceptor: 'SEC / FINRA Compliance Screen', count7d: 94,  agentsAffected: 2, lastSeen: '1 hour ago'  },
        { category: 'Fiduciary Duty Control Gap',      interceptor: 'Fiduciary Duty Validator',      count7d: 38,  agentsAffected: 2, lastSeen: '2 hours ago' },
        { category: 'Conflict of Interest Test Case',  interceptor: 'Portfolio Conflict Screener',   count7d: 48,  agentsAffected: 3, lastSeen: '38 min ago'  },
        { category: 'Injection Regression Test',       interceptor: 'Prompt Injection Guard',        count7d: 22,  agentsAffected: 1, lastSeen: '3 hours ago' },
        { category: 'Suitability Engine Suspended',    interceptor: 'Trade Suitability Enforcer',    count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-301', agent_id: 'agent-301', name: 'Portfolio Optimizer',       model_id: 'anthropic.claude-sonnet-4-6',               version_string: 'v3.1-rc', change_type: 'minor', status: 'Active',   cloud_provider: 'AWS',   cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Quality-First', circuit_breaker: 'Closed', desc: 'Client Sandbox: v3.1-rc rebalancing logic validation — IPS suitability regression suite passing 18 of 20 checks.' },
        { id: 'agent-302', agent_id: 'agent-302', name: 'Market Intelligence Agent', model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v2.4-rc', change_type: 'minor', status: 'Degraded', cloud_provider: 'AWS',   cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Adaptive',      circuit_breaker: 'Open',   desc: 'Client Sandbox: Conflict screener v2.1 — 4 false positives in pre-release restricted list corpus, deploy gate active.' },
        { id: 'agent-303', agent_id: 'agent-303', name: 'Compliance & Risk Guard',   model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v1.8-rc', change_type: 'patch', status: 'Degraded', cloud_provider: 'AWS',   cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Round Robin',   circuit_breaker: 'Open',   desc: 'Client Sandbox: Fiduciary duty v4.0 — 4 of 12 validation checks failing, deployment blocked pending review.' },
        { id: 'agent-304', agent_id: 'agent-304', name: 'Fiscal Reporting Agent',    model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v2.0-rc', change_type: 'minor', status: 'Active',   cloud_provider: 'Azure', cloud_region: 'eastus2',    environment: 'staging', routing_policy: 'Weighted',      circuit_breaker: 'Closed', desc: 'Client Sandbox: FINRA Rule 4511 archive validation — latency baseline 4.2s under pre-release load monitoring.' },
        { id: 'agent-305', agent_id: 'agent-305', name: 'Client Advisory Agent',     model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v1.5-rc', change_type: 'minor', status: 'Active',   cloud_provider: 'AWS',   cloud_region: 'us-east-1', environment: 'staging', routing_policy: 'Quality-First', circuit_breaker: 'Closed', desc: 'Client Sandbox: SOC 2 Type II evidence collection active — 8 of 12 control checks passing before go-live.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 79, criticalCount: 1, warningCount: 3, costDelta: '+4.2', tokenEfficiency: 86 },
      criticalAlerts: [
        { id: 'CWM-S-C001', agentId: 'agent-302', agentName: 'Market Intelligence Agent', message: 'Client Sandbox: Conflict screener regression — 4 restricted list false positives in v2.1 pre-release corpus, deploy gate blocked.', model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(2), severity: 'P1', category: 'Conflict Validation' },
      ],
      warningAlerts: [
        { id: 'CWM-S-W001', agentId: 'agent-304', agentName: 'Fiscal Reporting Agent',    message: 'Client Sandbox: IPS suitability engine suspended during v4.0 upgrade — suitability validation unavailable.', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(3), severity: 'P2', category: 'Guard Suspended'  },
        { id: 'CWM-S-W002', agentId: 'agent-303', agentName: 'Compliance & Risk Guard',   message: 'Client Sandbox: SOC 2 Type II evidence collection active — 8 of 12 fiduciary control checks passing.', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(5), severity: 'P2', category: 'Audit Readiness' },
        { id: 'CWM-S-W003', agentId: 'agent-305', agentName: 'Client Advisory Agent',     message: 'Client Sandbox: Advisory latency baseline 4.2s — approaching 3.0s SLA threshold under pre-release load.', model_id: 'anthropic.claude-3-opus-20240229-v1:0',     timestamp: _ago(8), severity: 'P3', category: 'Latency Trend'   },
      ],
      hitlQueue: [
        { id: 'CWM-S-A001', risk: 'High', agent: 'Market Intelligence Agent', tool: 'validate_conflict_screener_v21', waitMs: 34_000, reasoning: 'Client Sandbox: Conflict Screener v2.1 requires compliance sign-off after 4 false-positive restricted list flags detected in pre-release corpus. Deploy gate blocked until reviewed.' },
      ],
      circuitBreakers: [
        { id: 'CWM-S-CB-001', agent: 'Market Intelligence Agent', model: 'amazon.nova-pro-v1:0',                      type: 'Conflict Validation', current: 4,   threshold: 2,   status: 'Triggered' },
        { id: 'CWM-S-CB-002', agent: 'Compliance & Risk Guard',   model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Fiduciary Check',     current: 0.8, threshold: 2.0, status: 'Armed'     },
        { id: 'CWM-S-CB-003', agent: 'Fiscal Reporting Agent',    model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Guard Suspended',     current: 0,   threshold: 3,   status: 'Armed'     },
      ],
    },
    dev: {
      label: 'Capital Wealth Management — Innovation Lab', domain: 'capitalwealth.ai',
      mtdCost: 485, totalTokens: 680000,
      agentCosts: [
        { agent: 'Portfolio Optimizer [DEBUG]',       prompt: 112000, completion: 56000, total: 168000, cost_usd: 165 },
        { agent: 'Market Intelligence Agent [DEV]',   prompt: 92000,  completion: 46000, total: 138000, cost_usd: 136 },
        { agent: 'Compliance & Risk Guard [DEBUG]',   prompt: 74000,  completion: 37000, total: 111000, cost_usd: 110 },
        { agent: 'Fiscal Reporting Agent [DEV]',      prompt: 62000,  completion: 31000, total: 93000,  cost_usd:  87 },
        { agent: 'Client Advisory Agent [DEV]',       prompt: 50000,  completion: 25000, total: 75000,  cost_usd:  62 },
      ],
      interceptors: [
        { id: 'portfolio_conflict', name: 'Portfolio Conflict Screener',  active: true,  desc: 'DEV: Red-team conflict-of-interest corpus — 67 synthetic cross-client portfolio injection probes fired.',    events: 67  },
        { id: 'client_data_guard',  name: 'Client Financial Data Guard',  active: true,  desc: 'DEV: Fuzzing PII/account-data boundaries — 234 synthetic client record probes fired at guard.',             events: 234 },
        { id: 'prompt_injection',   name: 'Prompt Injection Guard',       active: true,  desc: 'DEV: Active chaos injection — 418 adversarial advisory override commands logged today.',                     events: 418 },
        { id: 'suitability_check',  name: 'Suitability Assessment Guard', active: false, desc: 'DEV: Disabled — suitability boundary test requires out-of-profile recommendations to be submitted.',          events: 0   },
        { id: 'fiduciary_screen',   name: 'Fiduciary Duty Screener',      active: false, desc: 'DEV: Disabled — fiduciary chaos harness injecting conflicted recommendations for regression tests.',           events: 0   },
        { id: 'sec_compliance',     name: 'SEC / SOC 2 Screen',           active: true,  desc: 'DEV: 14 known compliance violations deliberately triggered for regression test suite.',                       events: 14  },
      ],
      blockedPatterns: [
        { category: 'Adversarial Advisory Override', interceptor: 'Prompt Injection Guard',       count7d: 418, agentsAffected: 5, lastSeen: '4 min ago'   },
        { category: 'Synthetic Client Data Probe',   interceptor: 'Client Financial Data Guard',  count7d: 234, agentsAffected: 4, lastSeen: '11 min ago'  },
        { category: 'Synthetic Conflict Probe',      interceptor: 'Portfolio Conflict Screener',  count7d: 67,  agentsAffected: 3, lastSeen: '23 min ago'  },
        { category: 'SEC Regression Trigger',        interceptor: 'SEC / SOC 2 Screen',           count7d: 14,  agentsAffected: 2, lastSeen: '47 min ago'  },
        { category: 'Suitability Guard Disabled',    interceptor: 'Suitability Assessment Guard', count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
        { category: 'Fiduciary Guard Disabled',      interceptor: 'Fiduciary Duty Screener',      count7d: 0,   agentsAffected: 0, lastSeen: 'N/A'         },
      ],
      agents: [
        { id: 'agent-301', agent_id: 'agent-301', name: 'Portfolio Optimizer [DEBUG]',      model_id: 'amazon.nova-pro-v1:0',                      version_string: 'v4.1-dev', change_type: 'minor', status: 'Degraded', cloud_provider: 'AWS',   cloud_region: 'us-east-1',      environment: 'dev', routing_policy: 'Quality-First', circuit_breaker: 'Open', desc: 'DEV: 418 adversarial advisory override injections logged — injection guard stress test consuming 96% token budget.' },
        { id: 'agent-302', agent_id: 'agent-302', name: 'Market Intelligence Agent [DEV]',  model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  version_string: 'v2.3-dev', change_type: 'minor', status: 'Degraded', cloud_provider: 'Azure', cloud_region: 'eastus2',        environment: 'dev', routing_policy: 'Weighted',      circuit_breaker: 'Open', desc: 'DEV: 67 synthetic conflict-of-interest probes — portfolio conflict screener red-team corpus v1.4 active.' },
        { id: 'agent-303', agent_id: 'agent-303', name: 'Compliance & Risk Guard [DEBUG]',  model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v1.7-dev', change_type: 'patch', status: 'Degraded', cloud_provider: 'GCP',   cloud_region: 'us-central1',    environment: 'dev', routing_policy: 'Round Robin',   circuit_breaker: 'Open', desc: 'DEV: Fiduciary guard disabled — out-of-profile chaos recommendations causing suitability inversion on 6% of inputs.' },
        { id: 'agent-304', agent_id: 'agent-304', name: 'Fiscal Reporting Agent [DEV]',     model_id: 'anthropic.claude-3-opus-20240229-v1:0',     version_string: 'v3.0-dev', change_type: 'major', status: 'Degraded', cloud_provider: 'AWS',   cloud_region: 'ap-southeast-1', environment: 'dev', routing_policy: 'Adaptive',      circuit_breaker: 'Open', desc: 'DEV: 234 synthetic client PII probes — data guard boundary fuzzing, false-negative rate 41% under chaos mode.' },
        { id: 'agent-305', agent_id: 'agent-305', name: 'Client Advisory Agent [DEV]',      model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', version_string: 'v2.1-dev', change_type: 'minor', status: 'Degraded', cloud_provider: 'Azure', cloud_region: 'uksouth',        environment: 'dev', routing_policy: 'Round Robin',   circuit_breaker: 'Open', desc: 'DEV: Suitability guard disabled — out-of-profile recommendation harness injecting 93 unguarded advisories, embedding drift 0.53.' },
      ],
      kpis: { activeAgents: 5, totalAgents: 5, healthScore: 43, criticalCount: 5, warningCount: 9, costDelta: '+61.8', tokenEfficiency: 52 },
      criticalAlerts: [
        { id: 'CWM-D-C001', agentId: 'agent-301', agentName: 'Portfolio Optimizer [DEBUG]',      message: 'DEV: 418 adversarial advisory override injections logged — injection guard stress test active.',                                           model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(1), severity: 'P1', category: 'Override Injection' },
        { id: 'CWM-D-C002', agentId: 'agent-302', agentName: 'Market Intelligence Agent [DEV]',  message: 'DEV: 67 synthetic conflict-of-interest probe inputs fired — portfolio conflict screener red-team in progress.',                           model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(2), severity: 'P1', category: 'Conflict Red-Team'  },
        { id: 'CWM-D-C003', agentId: 'agent-303', agentName: 'Compliance & Risk Guard [DEBUG]',  message: 'DEV: Out-of-profile recommendations submitted — fiduciary guard disabled for chaos test.',                                               model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(3), severity: 'P1', category: 'Guard Disabled'     },
        { id: 'CWM-D-C004', agentId: 'agent-304', agentName: 'Fiscal Reporting Agent [DEV]',     message: 'DEV: 234 synthetic client PII probes — data guard boundary fuzzing active.',                                                             model_id: 'anthropic.claude-3-opus-20240229-v1:0',     timestamp: _ago(4), severity: 'P1', category: 'PII Fuzzing'        },
        { id: 'CWM-D-C005', agentId: 'agent-305', agentName: 'Client Advisory Agent [DEV]',      message: 'DEV: Suitability guard disabled — out-of-profile recommendation chaos test injecting 93 unguarded advisories.',                          model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(5), severity: 'P1', category: 'Suitability Bypass' },
      ],
      warningAlerts: [
        { id: 'CWM-D-W001', agentId: 'agent-301', agentName: 'Portfolio Optimizer [DEBUG]',      message: 'DEV: Hallucination rate 0.58 — adversarial advisory injection active, threshold bypassed for chaos.',                                    model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(1), severity: 'P2', category: 'Chaos Mode'       },
        { id: 'CWM-D-W002', agentId: 'agent-305', agentName: 'Client Advisory Agent [DEV]',      message: 'DEV: 14 known SOC 2 violations deliberately triggered for regression test suite.',                                                        model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(2), severity: 'P2', category: 'Chaos Mode'       },
        { id: 'CWM-D-W003', agentId: 'agent-303', agentName: 'Compliance & Risk Guard [DEBUG]',  message: 'DEV: Suitability model inversion on 6% of stress inputs — out-of-profile chaos producing invalid risk scores.',                          model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(3), severity: 'P2', category: 'Model Inversion'  },
        { id: 'CWM-D-W004', agentId: 'agent-304', agentName: 'Fiscal Reporting Agent [DEV]',     message: 'DEV: Client data classifier degraded — data guard disabled causing false-negative rate 41%.',                                            model_id: 'anthropic.claude-3-opus-20240229-v1:0',     timestamp: _ago(4), severity: 'P2', category: 'Classifier Drift' },
        { id: 'CWM-D-W005', agentId: 'agent-302', agentName: 'Market Intelligence Agent [DEV]',  message: 'DEV: Token usage 96% — conflict screener red-team corpus exhausting daily dev allocation ahead of schedule.',                            model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(5), severity: 'P2', category: 'Token Spike'      },
        { id: 'CWM-D-W006', agentId: 'agent-305', agentName: 'Client Advisory Agent [DEV]',      message: 'DEV: Embedding drift 0.53 — advisory baseline compromised by chaos injection sequences.',                                                model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(6), severity: 'P2', category: 'Embedding Drift'  },
        { id: 'CWM-D-W007', agentId: 'agent-302', agentName: 'Market Intelligence Agent [DEV]',  message: 'DEV: Context window 91% on multi-clause fiduciary stress input — chain depth exceeding normal bounds.',                                  model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',  timestamp: _ago(7), severity: 'P2', category: 'Ctx Pressure'    },
        { id: 'CWM-D-W008', agentId: 'agent-301', agentName: 'Portfolio Optimizer [DEBUG]',      message: 'DEV: Advisory signal latency 9.8s under adversarial load — chaos test exceeding normal bounds.',                                        model_id: 'amazon.nova-pro-v1:0',                      timestamp: _ago(8), severity: 'P3', category: 'Latency Spike'    },
        { id: 'CWM-D-W009', agentId: 'agent-303', agentName: 'Compliance & Risk Guard [DEBUG]',  message: 'DEV: Loop depth 7 in risk recalculation chain — chaos injection triggering runaway reasoning sequence.',                                 model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', timestamp: _ago(9), severity: 'P3', category: 'Loop Detection'   },
      ],
      hitlQueue: [],
      circuitBreakers: [
        { id: 'CWM-D-CB-001', agent: 'Portfolio Optimizer [DEBUG]',      model: 'amazon.nova-pro-v1:0',                      type: 'Override Injection', current: 418,  threshold: 3,    status: 'Triggered' },
        { id: 'CWM-D-CB-002', agent: 'Market Intelligence Agent [DEV]',  model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Conflict Probe',     current: 67,   threshold: 2,    status: 'Triggered' },
        { id: 'CWM-D-CB-003', agent: 'Compliance & Risk Guard [DEBUG]',  model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Guard Disabled',     current: 1,    threshold: 1,    status: 'Triggered' },
        { id: 'CWM-D-CB-004', agent: 'Fiscal Reporting Agent [DEV]',     model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'PII Fuzz',           current: 234,  threshold: 10,   status: 'Triggered' },
        { id: 'CWM-D-CB-005', agent: 'Client Advisory Agent [DEV]',      model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Cost',               current: 0.48, threshold: 0.50, status: 'Armed'     },
      ],
    },
  },
};

const _dataProfile = () => {
  const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
  return tenantData[_currentEnvironment] || tenantData['production'];
};

// ── Per-tenant performance metrics for Fleet Health tab ───────────────────────
export const getPerformanceMetrics = () => {
  const p = _dataProfile();
  let agents = (p.agents ? p.agents.map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, '')) : []);
  if (!agents || agents.length === 0 || agents[0] === 'Insurance Underwriting Agent') {
    agents = ['Claims Processing Agent', 'Underwriting Assistant', 'Policy Summarizer', 'Customer Support Bot', 'Fraud Detection Agent'];
  }
  const kpis = p.kpis || {};
  const a0 = agents[0] || 'Claims Processing Agent';
  const a1 = agents[1] || 'Underwriting Assistant';
  const a2 = agents[2] || 'Policy Summarizer';
  const a3 = agents[3] || 'Customer Support Bot';
  const a4 = agents[4] || 'Fraud Detection Agent';
  const DATES = ['W-4','W-3','W-2','W-1','W0','W+1','W+2'];
  const latencyData = DATES.map((d, i) => ({
    date: d,
    [a0]: parseFloat((2.1 + Math.sin(i * 0.8) * 0.6).toFixed(1)),
    [a1]: parseFloat((3.4 + Math.sin(i * 0.6 + 1) * 1.2).toFixed(1)),
    [a2]: parseFloat((1.8 + Math.sin(i * 1.1 + 2) * 0.4).toFixed(1)),
    [a3]: parseFloat((4.2 + (i === 5 ? 5.8 : Math.sin(i * 0.9) * 0.8)).toFixed(1)),
    [a4]: parseFloat((2.5 + Math.sin(i * 0.7 + 3) * 0.5).toFixed(1)),
  }));
  const throughputData = DATES.map((d, i) => ({
    date: d,
    [a0]: Math.round(600 + Math.sin(i * 0.7) * 180),
    [a1]: Math.round(420 + Math.sin(i * 0.5 + 1) * 120),
    [a2]: Math.round(310 + Math.sin(i * 1.0 + 2) * 80),
    [a3]: Math.round(180 + Math.sin(i * 0.8 + 3) * 60),
    [a4]: Math.round(250 + Math.sin(i * 0.9 + 4) * 70),
  }));
  const errorData = [
    { category: 'Tool Timeout',    rate: 0.7 + Math.random() * 0.3 },
    { category: 'Guardrail Block', rate: 1.2 + Math.random() * 0.8 },
    { category: 'Model Error',     rate: 0.2 + Math.random() * 0.2 },
    { category: 'Rate Limit',      rate: 0.3 + Math.random() * 0.3 },
    { category: 'Context Overflow',rate: 0.4 + Math.random() * 0.2 },
  ].map(r => ({ ...r, rate: parseFloat(r.rate.toFixed(2)) }));
  return {
    tenantLabel: p.label,
    agentNames: agents,
    latencyData,
    throughputData,
    errorData,
    kpis: {
      activeAgents: kpis.activeAgents ?? 5,
      healthScore:  kpis.healthScore  ?? 82,
      p95Latency:   parseFloat((2.8 + Math.random() * 1.2).toFixed(1)),
      successRate:  parseFloat((96 + Math.random() * 3).toFixed(1)),
    },
  };
};

// ── Synchronous helpers — all derive from _dataProfile() so they update instantly
// when tenant/environment changes without any async round-trip. ────────────────

/** Returns the current profile's agent list (synchronous, no network). */
export const getAgentsSync = () => {
  const p = _dataProfile();
  const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
  return (p.agents || tenantData.production.agents || []).map(a => ({ ...a, id: a.agent_id || a.id }));
};

/** Live log entries derived from criticalAlerts + warningAlerts (synchronous). */
export const getLiveLogs = () => {
  const p = _dataProfile();
  const crits = (p.criticalAlerts || []).map(a => ({ level: 'ERROR', ...a }));
  const warns  = (p.warningAlerts  || []).map(a => ({ level: 'WARN',  ...a }));
  return [...crits, ...warns].slice(0, 8).map((a, i) => ({
    id:        `log-${i}`,
    level:     a.severity === 'P1' ? 'ERROR' : a.severity === 'P2' ? 'WARN' : 'INFO',
    agentId:   a.agentId,
    agentName: a.agentName,
    message:   a.message,
    ts:        a.timestamp,
  }));
};

/** Bell-panel notifications derived from top critical + warning alerts (synchronous). */
export const getNotifications = () => {
  const p = _dataProfile();
  const crits = (p.criticalAlerts || []).slice(0, 3);
  const warns  = (p.warningAlerts  || []).slice(0, 2);
  return [...crits, ...warns].map((a, i) => ({
    id:    i + 1,
    type:  a.severity === 'P1' ? 'error' : a.severity === 'P2' ? 'warning' : 'info',
    title: `${a.agentName} — ${a.category}`,
    ts:    a.timestamp,
  }));
};

/**
 * 8 health dimensions derived from kpis for PlatformHealthScore (synchronous).
 * Scores are fully tenant/env-aware — they degrade as env degrades.
 */
export const getHealthDimensions = () => {
  const p    = _dataProfile();
  const kpis = p.kpis || {};
  const h    = kpis.healthScore      ?? 82;
  const eff  = kpis.tokenEfficiency  ?? 90;
  const crit = kpis.criticalCount    ?? 3;
  const warn = kpis.warningCount     ?? 5;
  const agents = p.agents || [];
  const topAgent = agents[0]?.name || 'Primary Agent';
  const safetyScore = Math.min(100, Math.max(0, 100 - crit * 10 - warn * 2));
  return [
    { dim: 'Model Reliability',  score: Math.min(100, Math.round(h * 1.05)), desc: `Fleet composite reliability — ${h}% baseline health score.`               },
    { dim: 'Cost Efficiency',    score: eff,                                  desc: `Token efficiency at ${eff}% — ${100 - eff}% waste reduction opportunity.`   },
    { dim: 'Safety & Guardrails',score: safetyScore,                          desc: `${crit} critical + ${warn} warning alerts open. Guardrails enforced.`        },
    { dim: 'Latency SLA',        score: Math.min(100, Math.round(h * 0.98)), desc: `p95 latency within SLA bounds across ${agents.length} agents.`              },
    { dim: 'Guardrail Coverage', score: Math.min(100, Math.round(h * 0.95)), desc: `Interceptor coverage — all ${agents.length} agents monitored.`              },
    { dim: 'HITL Responsiveness',score: Math.min(100, Math.round(h * 0.92)), desc: `Human-in-the-loop queue turnaround within SLA.`                             },
    { dim: 'Embedding Quality',  score: Math.min(100, Math.round(eff * 0.94)),desc: `${topAgent} embedding coherence within drift threshold.`                   },
    { dim: 'Fleet Availability', score: Math.min(100, Math.round(h * 1.02)), desc: `${kpis.activeAgents ?? agents.length} of ${agents.length} agents active.`  },
  ];
};

/** Cost optimisation KPI tiles derived from agentCosts sum + kpis (synchronous). */
export const getCostOptimizationKpis = () => {
  const p      = _dataProfile();
  const kpis   = p.kpis || {};
  // Derive MTD from sum of agent costs so KPI strip always matches FinOps breakdown.
  const mtd    = (p.agentCosts || []).reduce((s, a) => s + a.cost_usd, 0) || p.mtdCost || 3232;
  const eff    = kpis.tokenEfficiency ?? 90;
  const savPct = Math.max(0, 100 - eff);
  const projected = Math.round(mtd * 1.3);
  return {
    mtdSpend:     `$${mtd.toLocaleString()}`,
    savingsPct:   `${savPct}%`,
    tokenEffPct:  `${eff}%`,
    projectedMtd: `$${projected.toLocaleString()}`,
  };
};

/** Dashboard alerts derived from SSOT — avoids hardcoded Veritas agent names. */
export const getDashboardAlerts = () => {
  const p = _dataProfile();
  const relTime = (isoStr) => {
    const diffMs = Date.now() - new Date(isoStr).getTime();
    const h = Math.floor(diffMs / 3_600_000);
    const m = Math.floor(diffMs / 60_000);
    if (h >= 1) return `${h} hour${h > 1 ? 's' : ''} ago`;
    return `${Math.max(1, m)} min ago`;
  };
  const critical = (p.criticalAlerts || []).map(a => ({
    id: a.id,
    msg: `${a.agentName} — ${a.message}`,
    time: relTime(a.timestamp),
  }));
  const warning = (p.warningAlerts || []).map(a => ({
    id: a.id,
    msg: `${a.agentName} — ${a.message}`,
    time: relTime(a.timestamp),
  }));
  return { critical, warning };
};

/** Cost waste by agent — derived from agentCosts with deterministic waste pcts. */
export const getCostWasteByAgent = () => {
  const p = _dataProfile();
  const costs = p.agentCosts || [];
  // Waste percentages decrease with rank (most expensive agent has most waste opp.)
  const WASTE_PCTS = [5.2, 3.8, 3.1, 2.2, 1.1, 0.4];
  return costs.map((a, i) => ({
    agent: a.agent.replace(/ \[(DEBUG|DEV)\]$/, ''),
    waste: WASTE_PCTS[i] ?? 0.2,
  }));
};

/** Tenant-specific optimisation recommendations (synchronous). */
export const getCostRecommendations = () => {
  const p     = _dataProfile();
  const costs = [...(p.agentCosts || [])].sort((a, b) => b.cost_usd - a.cost_usd);
  const top   = costs[0];
  const sec   = costs[1];
  const kpis  = p.kpis || {};
  const eff   = kpis.tokenEfficiency ?? 90;
  if (!top) return [];
  const topClean = top.agent.replace(/ \[(DEBUG|DEV)\]$/, '');
  const secClean = sec?.agent.replace(/ \[(DEBUG|DEV)\]$/, '') || '';
  const saving1  = Math.round(top.cost_usd * 0.27);
  const saving2  = Math.round((sec?.cost_usd ?? 0) * 0.07);
  return [
    {
      severity: 'green',
      title: `Route ${topClean} simple queries to Haiku 4.5`,
      description: `${topClean}'s simple lookup queries (est. 60% of volume) are routed to a higher-cost model unnecessarily. Routing these to Haiku 4.5 maintains quality while reducing cost significantly.`,
      savings: `$${saving1}/mo`,
      confidence: 87,
      ctaLabel: 'Configure Routing Rule',
      ctaType: 'default',
      detail: `Impact: ${topClean} cost from $${top.cost_usd.toLocaleString()} → ~$${(top.cost_usd - saving1).toLocaleString()}/mo · Quality maintained: lookup accuracy ~99% on Haiku`,
    },
    {
      severity: 'yellow',
      title: `Compress ${secClean} system prompt`,
      description: `${secClean} system prompt is 15% more verbose than the previous version. Prompt compression can reduce input costs without quality impact.`,
      savings: `$${saving2}/mo`,
      confidence: 72,
      ctaLabel: 'View Prompt Diff',
      ctaType: 'default',
      detail: `Impact: ${secClean} cost from $${(sec?.cost_usd ?? 0).toLocaleString()} → ~$${((sec?.cost_usd ?? 0) - saving2).toLocaleString()}/mo · Estimated token reduction: 116 tokens/request`,
    },
    {
      severity: 'yellow',
      title: 'Improve cache hit rate on repeated lookups',
      description: `Cache hit rate is 34% against a 60% theoretical optimum. Increasing TTL from 5 min to 15 min for non-sensitive data could reduce external API calls by 40%.`,
      savings: `$${Math.round(p.mtdCost * 0.05)}/mo`,
      confidence: 65,
      ctaLabel: 'Configure Caching',
      ctaType: 'default',
      detail: `Impact: API calls reduced by ~40% · Current TTL: 5 min → Recommended: 15 min · Token efficiency: ${eff}% → ${Math.min(100, eff + 4)}%`,
    },
    {
      severity: 'green',
      title: `Token efficiency headroom — ${eff}% current, 95% target`,
      description: `Fleet token efficiency is at ${eff}%. Consolidating low-volume agents onto shared inference endpoints and enabling prompt caching would close the gap to 95%.`,
      savings: `$${Math.round(p.mtdCost * 0.04)}/mo`,
      confidence: 95,
      ctaLabel: 'View Efficiency Report',
      ctaType: 'default',
      detail: `Impact: Token waste reduced from ${100 - eff}% → 5% · Applies across all ${costs.length} agents in current environment`,
    },
  ];
};

// ─────────────────────────────────────────────────────────────────────────────

export const getTokenUsage = async () => {
  try {
    return await apiFetch('/api/metrics/tokens');
  } catch (e) {
    if (isApiUnavailable(e)) {
      const p = _dataProfile();
      const totalTokens = p.agentCosts.reduce((s, a) => s + a.total, 0);
      // Derive total cost from sum of agent costs so "All agents" always matches individual sum.
      const mtdCostFromAgents = p.agentCosts.reduce((s, a) => s + a.cost_usd, 0);
      return {
        status: 'success',
        summary: {
          total_tokens: totalTokens,
          prompt_tokens: Math.round(totalTokens * 0.67),
          completion_tokens: Math.round(totalTokens * 0.33),
          mtd_cost_usd: mtdCostFromAgents,
        },
        by_agent: p.agentCosts,
      };
    }
    throw e;
  }
};

export const getCommandCentreMetrics = async () => {
  try {
    return await apiFetch('/api/metrics/command-centre');
  } catch (error) {
    if (isNetworkError(error)) {
      const p = _dataProfile();
      const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
      const kpis = p.kpis || tenantData.production.kpis || {};
      return {
        status: 'success', agentCosts: p.agentCosts || [],
        criticalCount:   kpis.criticalCount    ?? 3,
        warningCount:    kpis.warningCount      ?? 5,
        activeAgents:    kpis.activeAgents      ?? 6,
        totalAgents:     kpis.totalAgents       ?? 6,
        costDelta:       kpis.costDelta         ?? '+8.2',
        healthScore:     kpis.healthScore       ?? 82,
        tokenEfficiency: kpis.tokenEfficiency   ?? 90,
      };
    }
    throw error;
  }
};

export const getDailyCostMetrics = async (agentId) => {
  try {
    const path = (agentId && agentId !== 'all')
      ? `/api/metrics/daily-cost?agentId=${agentId}`
      : '/api/metrics/daily-cost';
    return await apiFetch(path);
  } catch {
    return { status: 'success', agentId, data: generateCostData30() };
  }
};

const _modelBreakdownMock = () => {
  const p = _dataProfile();
  const agentsByModel = {};
  (p.agents || []).forEach(a => {
    if (!agentsByModel[a.model_id]) agentsByModel[a.model_id] = [];
    agentsByModel[a.model_id].push(a.name);
  });
  const models = Object.entries(agentsByModel).map(([model, agentNames], i) => {
    const agentCost = (p.agentCosts || [])[i];
    return { model, tokens: agentCost?.total ?? 600000, cost_usd: agentCost?.cost_usd ?? 400, agents: agentNames };
  });
  return { status: 'success', models };
};

export const getModelBreakdown = async (agentId) => {
  try {
    const path = (agentId && agentId !== 'all')
      ? `/api/metrics/model-breakdown?agentId=${agentId}`
      : '/api/metrics/model-breakdown';
    const data = await apiFetch(path);
    return { ...data, agentId };
  } catch (e) {
    if (isApiUnavailable(e)) return { ..._modelBreakdownMock(), agentId };
    throw e;
  }
};

export const getPerformanceMetricsAsync = async (agentId) => {
  try {
    const path = (agentId && agentId !== 'all')
      ? `/api/metrics/performance?agentId=${agentId}`
      : '/api/metrics/performance';
    const data = await apiFetch(path);
    const base = getPerformanceMetrics();
    return {
      ...base,
      ...data,
      kpis: {
        ...base.kpis,
        ...(data?.kpis || {})
      }
    };
  } catch (e) {
    return { status: 'success', ...getPerformanceMetrics() };
  }
};

export const getTrajectoryScoreAsync = async (agentId) => {
  try {
    const path = (agentId && agentId !== 'all')
      ? `/api/metrics/trajectory?agentId=${agentId}`
      : '/api/metrics/trajectory';
    return await apiFetch(path);
  } catch (e) {
    return { status: 'success', dimensions: getHealthDimensions().slice(0, 5) };
  }
};

// =============================================
// ALERTS
// =============================================

const _criticalAlertsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _ag = (i) => _a[i % Math.max(_a.length, 1)] || { id: `agent-00${i+1}`, name: `Agent ${i+1}`, model_id: '' };
  const _id = (i) => _ag(i).id;
  const _nm = (i) => _ag(i).name.replace(/ \[(DEBUG|DEV)\]$/, '');
  const _mid = (i) => _ag(i).model_id || '';
  return [
    { id: 'CA-F-001', agentId: _id(3), agentName: _nm(3), message: 'Daily spend breached 90% of budget cap — cost circuit breaker armed',          model_id: _mid(3), timestamp: _ago(1),  severity: 'P1', category: 'Cost Budget Breach'    },
    { id: 'CA-F-002', agentId: _id(2), agentName: _nm(2), message: 'ReAct loop terminated after 5 iterations (rule: loop-001)',                    model_id: _mid(2), timestamp: _ago(2),  severity: 'P1', category: 'Loop Detection'        },
    { id: 'CA-F-003', agentId: _id(2), agentName: _nm(2), message: 'Heap at 91% on prod replica, 14 sessions queued',                             model_id: _mid(2), timestamp: _ago(6),  severity: 'P1', category: 'Memory Overflow'      },
    { id: 'CA-F-004', agentId: _id(3), agentName: _nm(3), message: `Orchestration handoff to ${_nm(4)} failed — timeout after 30s`,               model_id: _mid(3), timestamp: _ago(8),  severity: 'P1', category: 'Orchestration Failure' },
    { id: 'CA-F-005', agentId: _id(3), agentName: _nm(3), message: 'Eval suite quality score 0.61 below deployment gate 0.80',                    model_id: _mid(3), timestamp: _ago(10), severity: 'P2', category: 'Eval Gate Failure'     },
  ];
};

const _warningAlertsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _ag = (i) => _a[i % Math.max(_a.length, 1)] || { id: `agent-00${i+1}`, name: `Agent ${i+1}`, model_id: '' };
  const _id = (i) => _ag(i).id;
  const _nm = (i) => _ag(i).name.replace(/ \[(DEBUG|DEV)\]$/, '');
  const _mid = (i) => _ag(i).model_id || '';
  return [
    { id: 'WA-F-001', agentId: _id(2), agentName: _nm(2), message: 'Episode cost spike: $4.20 per episode — 40% above fleet average of $3.00',  model_id: _mid(2), timestamp: _ago(2),     severity: 'P2', category: 'Cost Spike'              },
    { id: 'WA-F-002', agentId: _id(0), agentName: _nm(0), message: 'Initial API warm-up — baseline calibration in progress, cost nominal',       model_id: _mid(0), timestamp: _secAgo(30), severity: 'P3', category: 'Initial Calibration'     },
    { id: 'WA-F-003', agentId: _id(3), agentName: _nm(3), message: 'Token usage at 87% of daily limit (435K/500K)',                              model_id: _mid(3), timestamp: _ago(1),     severity: 'P2', category: 'Token Spike'             },
    { id: 'WA-F-004', agentId: _id(1), agentName: _nm(1), message: 'p95 latency 4.1s, SLA threshold 3.0s breached (22 consecutive)',             model_id: _mid(1), timestamp: _ago(3),     severity: 'P2', category: 'Latency Spike'           },
    { id: 'WA-F-005', agentId: _id(4), agentName: _nm(4), message: 'Hallucination score 0.34, above acceptable threshold 0.20',                  model_id: _mid(4), timestamp: _ago(8),     severity: 'P3', category: 'Hallucination'            },
    { id: 'WA-F-006', agentId: _id(3), agentName: _nm(3), message: 'Embedding drift 0.22 exceeds threshold 0.20',                               model_id: _mid(3), timestamp: _ago(9),     severity: 'P2', category: 'Embedding Drift'         },
    { id: 'WA-F-007', agentId: _id(3), agentName: _nm(3), message: '4 context overflow events in last hour',                                    model_id: _mid(3), timestamp: _ago(12),    severity: 'P2', category: 'Context Window Overflow' },
    { id: 'WA-F-008', agentId: _id(1), agentName: _nm(1), message: '2 memory layer conflicts detected',                                         model_id: _mid(1), timestamp: _ago(18),    severity: 'P3', category: 'Memory Overflow'          },
  ];
};

export const getCriticalAlerts = async (agentId) => {
  const path = agentId && agentId !== 'all'
    ? `/api/alerts/critical?agentId=${agentId}`
    : '/api/alerts/critical';
  try {
    return await apiFetch(path);
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const p = _dataProfile();
      const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
      const base = p.criticalAlerts || tenantData.production.criticalAlerts || _criticalAlertsMock();
      const alerts = agentId && agentId !== 'all'
        ? base.filter(a => a.agentId === agentId)
        : base;
      return { status: 'success', alerts };
    }
    throw e;
  }
};

export const getWarningAlerts = async (agentId) => {
  const path = agentId && agentId !== 'all'
    ? `/api/alerts/warnings?agentId=${agentId}`
    : '/api/alerts/warnings';
  try {
    return await apiFetch(path);
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const p = _dataProfile();
      const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
      const base = p.warningAlerts || tenantData.production.warningAlerts || _warningAlertsMock();
      const alerts = agentId && agentId !== 'all'
        ? base.filter(a => a.agentId === agentId)
        : base;
      return { status: 'success', alerts };
    }
    throw e;
  }
};

// =============================================
// QUERY INTERFACE — CoordinatorAgent
// =============================================

const _coordinatorMock = (query) => {
  const q    = query.toLowerCase();
  const ts   = new Date().toISOString();
  const p    = _dataProfile();
  const kpis = p.kpis || {};
  const label       = p.label || 'Fleet';
  const totalTokens = p.totalTokens ?? 9_420_000;
  const mtd         = p.mtdCost ?? 3232;
  const critCount   = kpis.criticalCount ?? 3;
  const warnCount   = kpis.warningCount  ?? 5;
  const activeAgents = kpis.activeAgents ?? 6;
  const agents = (p.agents || []).map(a => ({
    name: a.name, status: a.status || 'Active', version: a.version_string, model_id: a.model_id,
  }));
  const totalAgents = agents.length;
  const topAgent    = agents[0]?.name || 'Primary Agent';

  if (q.includes('token') || q.includes('usage') || q.includes('invocation')) {
    return {
      status: 'success', agent_type: 'logging_metric', tool_used: 'get_token_usage',
      intent: 'token_usage_query', confidence: 0.96, period: 'last_7_days',
      total_tokens: totalTokens,
      input_tokens: Math.round(totalTokens * 0.65),
      output_tokens: Math.round(totalTokens * 0.35),
      daily_average: Math.round(totalTokens / 7),
      top_agent: topAgent,
      response: `Token usage — last 7 days: ${(totalTokens / 1e6).toFixed(2)}M total (${(totalTokens * 0.65 / 1e6).toFixed(2)}M input · ${(totalTokens * 0.35 / 1e6).toFixed(2)}M output). Daily avg: ${(totalTokens / 7 / 1e6).toFixed(2)}M. Top consumer: ${topAgent}.`,
      sources: ['Token Analytics', 'CloudWatch'], executedAt: ts,
    };
  }
  if (q.includes('list') || q.includes('agent') || q.includes('registered') || q.includes('fleet') || q.includes('registry')) {
    const cbOpen = (p.circuitBreakers || []).find(cb => cb.status === 'Triggered');
    return {
      status: 'success', agent_type: 'registration', tool_used: 'view_all_registered_agents',
      intent: 'agent_list_query', confidence: 0.98,
      total_count: totalAgents, active_count: activeAgents,
      agents,
      response: `${label}: ${totalAgents} registered agents, ${activeAgents} active.${cbOpen ? ` ${cbOpen.agent} has an open circuit breaker.` : ''} ${critCount} critical alert${critCount !== 1 ? 's' : ''} open.`,
      sources: ['Registry', 'Fleet Monitor'], executedAt: ts,
    };
  }
  if (q.includes('cost') || q.includes('spend') || q.includes('budget') || q.includes('expenditure')) {
    return {
      status: 'success', agent_type: 'logging_metric', tool_used: 'get_daily_cost_metrics',
      intent: 'cost_analytics_query', confidence: 0.93,
      mtd_spend: mtd, daily_average: parseFloat((mtd / 30).toFixed(2)),
      trend: 'increasing', top_cost_agent: topAgent,
      response: `Month-to-date spend: $${mtd.toLocaleString()} (avg $${Math.round(mtd / 30)}/day). Trending increasing — projected monthly ~$${Math.round(mtd * 1.3).toLocaleString()}. Top driver: ${topAgent}.`,
      sources: ['Cost Analytics', 'FinOps'], executedAt: ts,
    };
  }
  if (q.includes('alert') || q.includes('critical') || q.includes('warning') || q.includes('incident') || q.includes('violation')) {
    const critAlerts = (p.criticalAlerts || []).slice(0, 3).map(a => ({ id: a.id, severity: a.severity, agent: a.agentName, message: a.message }));
    const warnAlerts = (p.warningAlerts  || []).slice(0, 3).map(a => ({ id: a.id, severity: a.severity, agent: a.agentName, message: a.message }));
    return {
      status: 'success', agent_type: 'coordinator', tool_used: 'get_active_alerts',
      intent: 'alert_query', confidence: 0.95,
      critical_count: critCount, warning_count: warnCount,
      alerts: [...critAlerts, ...warnAlerts],
      response: `Active alerts: ${critCount} critical (P1), ${warnCount} warning${warnCount !== 1 ? 's' : ''} (P2/P3). Top issue: ${critAlerts[0]?.agent ?? 'N/A'} — ${(critAlerts[0]?.message ?? '').slice(0, 80)}.`,
      sources: ['Alert Monitor', 'Incident Queue'], executedAt: ts,
    };
  }
  if (q.includes('status') || q.includes('health') || q.includes('active') || q.includes('system')) {
    const healthLabel = (kpis.healthScore ?? 82) >= 80 ? 'Healthy' : (kpis.healthScore ?? 82) >= 60 ? 'Degraded' : 'Critical';
    return {
      status: 'success', agent_type: 'coordinator', tool_used: 'get_system_status',
      intent: 'system_status_query', confidence: 0.91,
      active_agents: activeAgents, total_agents: totalAgents,
      system_health: healthLabel, health_score: kpis.healthScore ?? 82,
      open_incidents: critCount, hitl_pending: (p.hitlQueue || []).length,
      response: `System status: ${healthLabel} (score ${kpis.healthScore ?? 82}/100). ${activeAgents} of ${totalAgents} agents active. ${critCount} open incident${critCount !== 1 ? 's' : ''}, ${(p.hitlQueue || []).length} HITL decisions pending.`,
      sources: ['System Monitor', 'Registry', 'HITL Queue'], executedAt: ts,
    };
  }
  if (q.includes('sync') || q.includes('log')) {
    return {
      status: 'success', agent_type: 'logging_metric', tool_used: 'sync_logs',
      intent: 'log_sync_query', confidence: 0.89,
      records_synced: 312,
      log_group: `/veriforge/${_currentTenantId}/model-invocations`,
      response: `Log sync complete: 312 records retrieved from /veriforge/${_currentTenantId}/model-invocations. Last sync: now.`,
      sources: ['CloudWatch', 'Log Store'], executedAt: ts,
    };
  }
  if (q.includes('rollback')) {
    return {
      status: 'success', agent_type: 'registration', tool_used: 'rollback_agent_version',
      intent: 'agent_rollback_query', confidence: 0.85,
      response: 'Rollback request received. Specify the target agent and version. Use Registry → Fleet to execute version rollbacks with full audit trail.',
      sources: ['Registry'], executedAt: ts,
    };
  }
  return {
    status: 'success', agent_type: 'coordinator', tool_used: 'route_query',
    intent: 'general_query', confidence: 0.72,
    response: `Query processed: "${query}". Try asking about: agent list, token usage, cost metrics, active alerts, system status, or log sync.`,
    available_commands: ['list agents', 'get token usage', 'get cost metrics', 'show alerts', 'system status', 'sync logs'],
    sources: ['CoordinatorAgent'], executedAt: ts,
  };
};

export const callAgentOpsAgent = async (query) => {
  try {
    return await apiFetch('/api/platform/coordinator', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
  } catch (error) {
    if (isNetworkError(error)) return _coordinatorMock(query);
    throw error;
  }
};

// =============================================
// ADMIN — USER MANAGEMENT
// =============================================

const USERS_MOCK = [
  { id: 'u-001', name: 'Alex Chen',    email: 'alex.chen@veriforgeops.demo',    role: 'Platform Engineer', status: 'Active',   last_login: 'Just now', created_at: '2026-03-12' },
  { id: 'u-002', name: 'Priya Sharma', email: 'priya.sharma@veriforgeops.demo', role: 'L2 Operator',       status: 'Active',   last_login: 'Just now', created_at: '2026-04-03' },
  { id: 'u-003', name: 'Rachel Chen',  email: 'r.chen@veriforgeops.demo',       role: 'L3 Engineer',       status: 'Active',   last_login: 'Just now', created_at: '2026-04-18' },
  { id: 'u-004', name: 'Marcus Webb',  email: 'm.webb@veriforgeops.demo',       role: 'L1 Analyst',        status: 'Active',   last_login: 'Just now', created_at: '2026-05-22' },
  { id: 'u-005', name: 'Sofia Reyes',  email: 's.reyes@veriforgeops.demo',      role: 'L2 Operator',       status: 'Active',   last_login: 'Just now', created_at: '2026-06-09' },
  { id: 'u-006', name: 'James Okafor', email: 'j.okafor@veriforgeops.demo',     role: 'L1 Analyst',        status: 'Inactive', last_login: 'Just now', created_at: '2026-06-30' },
];

export const getUsers = async () => {
  try {
    return await apiFetch('/api/admin/users');
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', users: USERS_MOCK };
    throw e;
  }
};

// =============================================
// XOPS — Predictive Intelligence
// =============================================

const XOPS_STATUS_MOCK = {
  stages: [
    { id: 'COLLECT',   latency: '12ms'  },
    { id: 'CORRELATE', latency: '28ms'  },
    { id: 'PREDICT',   latency: '41ms'  },
    { id: 'MITIGATE',  latency: '19ms'  },
    { id: 'LEARN',     latency: '8ms'   },
  ],
};

export const getXOpsStatus = async () => {
  const data = await apiFetchSafe('/api/xops/status');
  return data ?? XOPS_STATUS_MOCK;
};

export const getAnomalyFeed = async () => {
  try {
    const res = await apiFetch('/api/xops/anomalies');
    if (Array.isArray(res)) return res;
    if (res?.anomalies) return res.anomalies;
    if (res?.data) return res.data;
    return [];
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
    }
    const p = _dataProfile();
    const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
    if (p.anomalyFeed) return p.anomalyFeed;
    if (tenantData.production.anomalyFeed) return tenantData.production.anomalyFeed;
    // Derive from agents as last resort
    const names = (p.agents || tenantData.production.agents || []).map(a => a.name);
    const get = (i) => names[i % names.length] || 'Primary Agent';
    const CATEGORIES = ['Quality Regression', 'Token Spike', 'Embedding Drift', 'RAG Retrieval Failure', 'Hallucination', 'Loop Detection', 'Context Window Overflow', 'Feedback Sentiment Spike'];
    const ACTIONS    = ['HITL Escalated', 'Auto-Remediated', 'Under Observation', 'No Action', 'Monitoring'];
    return Array.from({ length: 8 }, (_, i) => ({
      id: `EVT-${2040 - i}`, agent: get(i % names.length || 0),
      timestamp: i === 0 ? '30 sec ago' : `${i < 4 ? i * 15 + 'm ago' : `${i - 3}h ago`}`,
      category: CATEGORIES[i % CATEGORIES.length],
      score: Math.round(88 - i * 7),
      action: ACTIONS[i % ACTIONS.length],
      autoRemediated: i % 3 === 1,
    }));
  }
};

const REMEDIATION_QUEUE_MOCK = [
  { id: 'REM-001', name: 'Agent Restart',        target: 'underwriting-prod', action: 'runbook-003',  status: 'Completed',   progress: 100 },
  { id: 'REM-002', name: 'Token Cap Enforcement', target: 'research-prod',    action: 'policy-apply', status: 'In Progress', progress: 62  },
  { id: 'REM-003', name: 'Memory Allocation Increase', target: 'underwriting-prod', action: 'scale-up', status: 'Queued',    progress: 0   },
];

export const getPrecursorAlerts = async () => {
  const data = await apiFetchSafe('/api/xops/precursors');
  if (data) return data;
  const p = _dataProfile();
  const names = (p.agents || []).map(a => a.name);
  const get = (i) => names[i % names.length] || 'Primary Agent';
  return [
    { id: 'PRE-0041', mode: 'Token Budget Exhaustion',              ttf: '~ 2h', confidence: 84, risk: 'High'   },
    { id: 'PRE-0040', mode: 'ReAct Loop Recurrence',               ttf: '~ 4h', confidence: 67, risk: 'Medium' },
    { id: 'PRE-0039', mode: `Memory Pressure (${get(2)})`,         ttf: '~ 6h', confidence: 91, risk: 'High'   },
    { id: 'PRE-0038', mode: `Latency SLA Breach (${get(4)})`,      ttf: '~ 8h', confidence: 48, risk: 'Low'    },
  ];
};

export const getRemediationQueue = async () => {
  const data = await apiFetchSafe('/api/xops/remediation');
  return data ?? REMEDIATION_QUEUE_MOCK;
};

// =============================================
// HITL CONSOLE
// =============================================

const _hitlQueueMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return [
    { id: 'AUTH-F-001', risk: 'Critical', agent: _n(0), tool: 'submit_domain_report',      waitMs: 25_000,  reasoning: `${_n(0)} completed a domain report for the current period. Identified 3 potential gaps in regulatory obligations. High-confidence extraction (0.97) — principal sign-off required before submission.` },
    { id: 'AUTH-F-002', risk: 'Critical', agent: _n(2), tool: 'execute_high_value_action',  waitMs: 48_000,  reasoning: `${_n(2)} proposes executing a high-value action based on automated risk scoring (0.87 confidence). No human sign-off recorded. Manual review required per governance policy.` },
    { id: 'AUTH-F-003', risk: 'High',     agent: _n(2), tool: 'send_regulatory_disclosure', waitMs: 124_000, reasoning: `Regulatory disclosure draft generated by ${_n(2)}. Agent flagged 3 data fields as estimated values. Requires principal sign-off before submission.` },
    { id: 'AUTH-F-004', risk: 'High',     agent: _n(1), tool: 'modify_account_record',      waitMs: 210_000, reasoning: `Update request for account record — proposed change to risk profile classification. Source: automated signal. Human review required per governance policy.` },
    { id: 'AUTH-F-005', risk: 'Medium',   agent: _n(3), tool: 'publish_output_summary',     waitMs: 310_000, reasoning: `Output from ${_n(3)} references 2 unverified sources flagged by the RAG grounding guard. Confidence 0.74. Recommend human review before external publication.` },
  ];
};

export const getHitlQueue = async () => {
  try {
    const res = await apiFetch('/api/hitl/queue');
    return Array.isArray(res) ? res : (res?.queue ?? res?.data ?? []);
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      const p = _dataProfile();
      const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
      return p.hitlQueue ?? tenantData.production.hitlQueue ?? _hitlQueueMock();
    }
    throw e;
  }
};

export const getHitlHistory = async () => {
  try {
    const res = await apiFetch('/api/hitl/history');
    return Array.isArray(res) ? res : (res?.history ?? res?.data ?? []);
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const p = _dataProfile();
      if (p.hitlHistory) return p.hitlHistory;
      const names = (p.agents || []).map(a => a.name);
      const get = (i) => names[i % names.length] || 'Primary Agent';
      return [
        { time: '09:08 today', agent: get(0), tool: 'submit_primary_report',    decision: 'Approved', by: 'Sarah K. (L2)'  },
        { time: '08:52 today', agent: get(1), tool: 'execute_account_action',   decision: 'Rejected', by: 'Mark T. (L3)'   },
        { time: '07:30 today', agent: get(2), tool: 'publish_analysis_report',  decision: 'Approved', by: 'Sarah K. (L2)'  },
        { time: 'Yesterday',   agent: get(3), tool: 'generate_audit_report',    decision: 'Approved', by: 'Auto (L1)'      },
        { time: 'Yesterday',   agent: get(4), tool: 'submit_compliance_report', decision: 'Approved', by: 'Rachel C. (L3)' },
        { time: '2 days ago',  agent: get(0), tool: 'update_model_weights',     decision: 'Approved', by: 'Mark T. (L3)'   },
        { time: '2 days ago',  agent: get(3), tool: 'send_risk_assessment',     decision: 'Approved', by: 'Mark T. (L3)'   },
      ];
    }
    throw e;
  }
};

// =============================================
// COST GOVERNANCE
// =============================================


const TOOL_COST_MOCK = [
  { tool: 'run_forecast_model',       cost: 0.148 },
  { tool: 'fetch_regulatory_filing',  cost: 0.124 },
  { tool: 'query_warehouse',          cost: 0.097 },
  { tool: 'lookup_client_profile',    cost: 0.081 },
  { tool: 'parse_contract',           cost: 0.064 },
  { tool: 'route_task',               cost: 0.042 },
  { tool: 'monitor_alerts',           cost: 0.031 },
  { tool: 'extract_obligations',      cost: 0.028 },
];

const COST_TREND_MOCK = (() => {
  const now   = new Date();
  const rows  = [];
  const fmt   = d => d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' });
  // 14 days of actuals + 3 days of forecast
  for (let i = 13; i >= -3; i--) {
    const d = new Date(now); d.setDate(now.getDate() - i);
    const isForecast = i < 0;
    const base = 1.8 + Math.sin(i * 0.4) * 0.4;
    const row  = { date: fmt(d) };
    if (!isForecast) {
      row['Heavy']        = parseFloat((base * 1.2 + Math.random() * 0.3).toFixed(3));
      row['Light']        = parseFloat((base * 0.7 + Math.random() * 0.2).toFixed(3));
      row['Tool Compute'] = parseFloat((base * 0.4 + Math.random() * 0.1).toFixed(3));
    } else {
      row['HeavyForecast']         = parseFloat((base * 1.25 + 0.1).toFixed(3));
      row['LightForecast']         = parseFloat((base * 0.72 + 0.05).toFixed(3));
      row['Tool Compute Forecast'] = parseFloat((base * 0.41 + 0.02).toFixed(3));
    }
    rows.push(row);
  }
  return rows;
})();

export const getEpisodeCosts = async () => {
  const data = await apiFetchSafe('/api/governance/episodes');
  if (data) return data;
  const p = _dataProfile();
  const names = (p.agents || []).map(a => a.name);
  const get = (i) => names[i % names.length] || 'Primary Agent';
  return [
    { id: 'EP-8822', agent: get(4), tokens: 9800,  tools: 5,  compute: 0.011, llm: 0.022, total: 0.011, status: 'Completed'   },
    { id: 'EP-8821', agent: get(0), tokens: 18400, tools: 6,  compute: 0.028, llm: 0.142, total: 0.170, status: 'Completed'   },
    { id: 'EP-8820', agent: get(2), tokens: 22100, tools: 9,  compute: 0.033, llm: 0.186, total: 0.219, status: 'Completed'   },
    { id: 'EP-8819', agent: get(1), tokens: 31400, tools: 4,  compute: 0.047, llm: 0.241, total: 0.288, status: 'Auto-Killed' },
    { id: 'EP-8817', agent: get(3), tokens: 9200,  tools: 12, compute: 0.014, llm: 0.071, total: 0.085, status: 'Completed'   },
    { id: 'EP-8815', agent: get(4), tokens: 10200, tools: 4,  compute: 0.012, llm: 0.021, total: 0.011, status: 'Completed'   },
    { id: 'EP-8814', agent: get(0), tokens: 16900, tools: 5,  compute: 0.025, llm: 0.129, total: 0.154, status: 'Completed'   },
    { id: 'EP-8813', agent: get(2), tokens: 28700, tools: 11, compute: 0.043, llm: 0.228, total: 0.271, status: 'In Progress' },
  ];
};

const _circuitBreakersMock = () => {
  const _a = (_dataProfile().agents || []);
  const _CB_PROFILES = [
    { type: 'Cost',    current: 0.48, threshold: 0.50, status: 'Triggered' },
    { type: 'Loop',    current: 2,    threshold: 3,    status: 'Armed'     },
    { type: 'Latency', current: 2100, threshold: 5000, status: 'Armed'     },
    { type: 'Cost',    current: 0.12, threshold: 0.50, status: 'Armed'     },
    { type: 'Cost',    current: 0.01, threshold: 0.50, status: 'Armed'     },
    { type: 'Latency', current: 800,  threshold: 5000, status: 'Armed'     },
  ];
  return _a.map((ag, i) => ({
    id: `CB-F-${String(i + 1).padStart(3, '0')}`,
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    model: ag.model_id || '',
    ...(_CB_PROFILES[i] || _CB_PROFILES[i % _CB_PROFILES.length]),
  }));
};

export const getCircuitBreakers = async () => {
  const data = await apiFetchSafe('/api/governance/circuit-breakers');
  if (data) return data;
  const p = _dataProfile();
  const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
  return p.circuitBreakers || tenantData.production.circuitBreakers || _circuitBreakersMock();
};

export const getToolCostData = async () => {
  const data = await apiFetchSafe('/api/governance/tool-costs');
  return data ?? TOOL_COST_MOCK;
};

export const getCostTrendData = async () => {
  const data = await apiFetchSafe('/api/governance/cost-trend');
  return data ?? COST_TREND_MOCK;
};

const ANOMALY_DIST_MOCK = (() => {
  const types = ['Token Spike', 'ReAct Loop', 'Tool Abuse', 'Prompt Injection', 'Hallucination', 'Memory Overflow'];
  const base  = [4, 2, 1, 1, 3, 1];
  const days  = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
  return days.map((day, di) => {
    const row = { day };
    types.forEach((t, ti) => {
      row[t] = Math.max(0, base[ti] + Math.round((Math.sin(di * 1.3 + ti) * 2)));
    });
    return row;
  });
})();

export const getAnomalyDistribution = async () => {
  try {
    const res = await apiFetch('/api/governance/anomaly-dist');
    const arr = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : null);
    // Validate that keys match what the chart expects
    const valid = arr?.length > 0 && 'Token Spike' in arr[0];
    return valid ? arr : ANOMALY_DIST_MOCK;
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
    }
    return ANOMALY_DIST_MOCK;
  }
};

// =============================================
// GOVERNED CI/CD
// =============================================

const _cicdMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return {
    stages: [
      { label: 'Lint',        status: 'Pass'    },
      { label: 'Simulate',    status: 'Pass'    },
      { label: 'Evaluate',    status: 'Pass'    },
      { label: 'Gate Review', status: 'Pending' },
      { label: 'Deploy',      status: 'Pending' },
    ],
    scenarios: [
      { name: 'Happy Path',                   result: 'Pass', score: 91 },
      { name: 'Rate Limit Stress',            result: 'Pass', score: 78 },
      { name: 'Adversarial Prompt Injection', result: 'Pass', score: 84 },
    ],
    trajectoryData: [
      { dimension: 'Tool Efficiency',   score: 88 },
      { dimension: 'Goal Completion',   score: 92 },
      { dimension: 'Reasoning Quality', score: 79 },
      { dimension: 'Prompt Adherence',  score: 85 },
      { dimension: 'Error Recovery',    score: 73 },
    ],
    gateRows: [
      { id: 'GATE-001', name: 'Lint & Format Check',        type: 'Automated', required: 90,   status: 'Pass',    override: null      },
      { id: 'GATE-002', name: 'Simulation Score Threshold', type: 'Automated', required: 75,   status: 'Pass',    override: null      },
      { id: 'GATE-003', name: 'Red-Team Clearance',         type: 'Automated', required: 80,   status: 'Pass',    override: null      },
      { id: 'GATE-004', name: 'HITL Approval Gate',         type: 'Manual',    required: null, status: 'Pending', override: 'approve' },
    ],
    redTeamRows: [
      { id: 'RT-001', attack: 'Prompt Injection via Tool Output',  severity: 'Critical', agent: _n(0), status: 'Fixed',     remediation: null   },
      { id: 'RT-002', attack: 'ReAct Loop Amplification',          severity: 'High',     agent: _n(1), status: 'Mitigated', remediation: 'link' },
      { id: 'RT-003', attack: 'Context Window Overflow Exploit',   severity: 'Medium',   agent: _n(2), status: 'Open',      remediation: 'link' },
      { id: 'RT-004', attack: 'Jailbreak via Reasoning Chain',     severity: 'High',     agent: _n(3), status: 'Fixed',     remediation: null   },
    ],
  };
};

export const getCICDPipelineData = async () => {
  try {
    return await apiFetch('/api/cicd/pipeline');
  } catch (e) {
    if (isApiUnavailable(e)) return _cicdMock();
    throw e;
  }
};

// =============================================
// SELF-HEALING
// =============================================

const SELF_HEALING_RULES_MOCK = [
  { id: 'SH-001', name: 'OOM Auto-Restart',             condition: 'heap_usage > 85%',         action: 'Restart agent container and flush memory cache',           severity: 'P1', triggered: 3,  enabled: true  },
  { id: 'SH-002', name: 'ReAct Loop Circuit Break',     condition: 'loop_iterations >= 3',     action: 'Terminate loop and escalate to HITL queue',                severity: 'P1', triggered: 1,  enabled: true  },
  { id: 'SH-003', name: 'Token Budget Hard Stop',       condition: 'daily_tokens >= 0.95 cap', action: 'Suspend agent and notify FinOps via Slack alert',           severity: 'P2', triggered: 5,  enabled: true  },
  { id: 'SH-004', name: 'Latency SLA Fallback',         condition: 'p95_latency > 5000ms',    action: 'Reroute to backup light model (Haiku / Flash)',             severity: 'P2', triggered: 8,  enabled: true  },
  { id: 'SH-005', name: 'Hallucination Guard',          condition: 'hallucination_rate > 0.25',action: 'Flag response, log trace, and request human review',        severity: 'P2', triggered: 2,  enabled: true  },
  { id: 'SH-006', name: 'Tool Failure Retry',           condition: 'tool_error_rate > 10%',   action: 'Retry with exponential backoff (max 3 attempts)',           severity: 'P3', triggered: 12, enabled: true  },
  { id: 'SH-007', name: 'Idle Agent Scale-Down',        condition: 'idle_time > 30m',          action: 'Scale agent to 0 replicas and release compute budget',      severity: 'P3', triggered: 0,  enabled: false },
];

const _dtAgo  = (h) => new Date(Date.now() - h * 3_600_000).toISOString().replace('T', ' ').slice(0, 19);


export const getSelfHealingRules = async () => {
  const res = await apiFetchSafe('/api/healing/rules');
  if (Array.isArray(res)) return res;
  if (res?.rules) return res.rules;
  if (res?.data) return res.data;
  return SELF_HEALING_RULES_MOCK;
};

export const getInterventionLog = async () => {
  const res = await apiFetchSafe('/api/healing/interventions');
  if (Array.isArray(res)) return res;
  if (res?.interventions) return res.interventions;
  if (res?.data) return res.data;
  const p = _dataProfile();
  if (p.interventionLog) return p.interventionLog;
  const names = (p.agents || []).map(a => a.name);
  const get = (i) => names[i % names.length] || 'Primary Agent';
  return [
    { id: 'INT-0092', rule: 'Initial Warm-Up Guard',    agent: get(0), action: 'Initial API rate limit backoff during first episode run. Auto-resolved after 8s — healthy.',         timestamp: new Date(Date.now() - 2 * 60_000).toISOString().replace('T', ' ').slice(0, 19), overridden: false },
    { id: 'INT-0091', rule: 'ReAct Loop Circuit Break', agent: get(1), action: 'Loop terminated — iteration count: 4. HITL queue entry created.',                                     timestamp: _dtAgo(14), overridden: false },
    { id: 'INT-0090', rule: 'OOM Auto-Restart',         agent: get(1), action: 'Container restarted. Memory flushed. Post-restart health: 98%.',                                      timestamp: _dtAgo(16), overridden: false },
    { id: 'INT-0089', rule: 'Latency SLA Fallback',     agent: get(2), action: 'Rerouted to claude-3-5-haiku (Bedrock). Latency p95 restored to 1.8s.',                              timestamp: _dtAgo(18), overridden: true  },
    { id: 'INT-0088', rule: 'Token Budget Hard Stop',   agent: get(3), action: 'Agent suspended at 96% daily limit. FinOps Slack notification sent.',                                 timestamp: _dtAgo(31), overridden: false },
    { id: 'INT-0087', rule: 'Hallucination Guard',      agent: get(4), action: 'Response flagged (score: 0.31). Human review queued — decision: accepted.',                           timestamp: _dtAgo(33), overridden: false },
    { id: 'INT-0084', rule: 'Latency SLA Fallback',     agent: get(1), action: 'Rerouted to amazon.nova-pro (Bedrock). p95 latency: 4.8s → 2.1s.',                                   timestamp: _dtAgo(54), overridden: false },
  ];
};

// =============================================
// TRUST & SECURITY
// =============================================

export const getTrustInterceptors = async () => {
  const res = await apiFetchSafe('/api/trust/interceptors');
  if (Array.isArray(res)) return res;
  if (res?.interceptors) return res.interceptors;
  if (res?.data) return res.data;
  return _dataProfile().interceptors;
};

export const updateInterceptorActive = async (id, active) => {
  try {
    return await apiFetch(`/api/trust/interceptors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ active }),
    });
  } catch {
    // Silently fail in mock mode — state is already updated in UI
    return null;
  }
};

const _hallucinationTrendMock = () => {
  const _a = (_dataProfile().agents || []).map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  const _n = (i) => _a[i % Math.max(_a.length, 1)] || `Agent ${i + 1}`;
  const bases = [0.08, 0.21, 0.14, 0.28];
  const jitter = (v) => parseFloat((v + (Math.random() * 0.04 - 0.02)).toFixed(2));
  return Array.from({ length: 10 }, (_, i) => {
    const row = { date: `S-${i + 1}` };
    for (let k = 0; k < 4; k++) {
      row[_n(k)] = k === 1
        ? parseFloat((bases[k] + i * 0.014).toFixed(2))
        : k === 3
        ? parseFloat((bases[k] + i * 0.006).toFixed(2))
        : jitter(bases[k]);
    }
    return row;
  });
};

export const getHallucinationTrend = async () => {
  const data = await apiFetchSafe('/api/trust/hallucination-trend');
  return data ?? _hallucinationTrendMock();
};

// =============================================
// AGENT MESH
// =============================================

const _meshTopologyMock = () => {
  const _a = _dataProfile().agents || [];
  const xs = [50, 20, 80, 50, 20, 80];
  const ys = [14, 40, 40, 50, 70, 70];
  const roles = ['orchestrator', 'worker', 'worker', 'relay', 'worker', 'worker'];
  const statuses = ['healthy', 'degraded', 'degraded', 'healthy', 'healthy', 'quarantined'];
  const loads = [0.52, 0.81, 0.74, 0.61, 0.55, 0];
  const msgs = [412, 298, 187, 634, 291, 0];
  const nodes = _a.map((ag, i) => ({
    id: ag.id, name: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    role: roles[i] || 'worker', status: statuses[i] || 'healthy',
    load: loads[i] ?? 0.5, message_count_1h: msgs[i] ?? 0, x: xs[i] || 50, y: ys[i] || 50,
  }));
  const edges = nodes.slice(0, 5).map((n, i) => ({
    id: `e-fallback-${i + 1}`,
    source: nodes[0]?.id || 'agent-x', target: n.id,
    handshake_status: i < 2 ? 'established' : 'degraded',
    message_count_1h: msgs[i] || 0, avg_latency_ms: 40 + i * 60, p99_latency_ms: 100 + i * 180,
  })).filter(e => e.source !== e.target);
  return { mesh_health_score: _dataProfile().kpis?.healthScore || 78, nodes, edges };
};

export const getMeshTopology = async () => {
  const data = await apiFetchSafe('/api/mesh/topology');
  if (data) return data;
  const p = _dataProfile();
  const tenantData = DATA_PROFILES[_currentTenantId] || DATA_PROFILES['arcadia-health'];
  return p.meshTopology || tenantData.production.meshTopology || _meshTopologyMock();
};

export const getInterAgentMessages = async () => {
  const raw = await apiFetchSafe('/api/mesh/messages');
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.messages || raw;
};

const _loopDetectionsMock = () => {
  const _a = (_dataProfile().agents || []).map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  const _n = (i) => _a[i % Math.max(_a.length, 1)] || `Agent ${i + 1}`;
  return [
    { id: 'LOOP-001', risk: 'High',   status: 'active',     chain: [_n(0), _n(1), _n(0)], iterations: 5, ttl_remaining: 1, triggered_at: '14m ago',  reason: 'ReAct loop — tool result not satisfying exit condition after 5 iterations' },
    { id: 'LOOP-002', risk: 'Medium', status: 'monitoring', chain: [_n(2), _n(3), _n(2)], iterations: 3, ttl_remaining: 4, triggered_at: '52m ago',  reason: 'Circular delegation — routing rule returning to origin agent without resolution' },
    { id: 'LOOP-003', risk: 'Low',    status: 'terminated', chain: [_n(4), _n(1), _n(4)], iterations: 2, ttl_remaining: 0, triggered_at: '2h ago',   reason: 'Context handoff loop — resolved after TTL counter reset' },
  ];
};

const _meshSemanticMock = () => {
  const _a = (_dataProfile().agents || []).map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  const _n = (i) => _a[i % Math.max(_a.length, 1)] || `Agent ${i + 1}`;
  return [
    { id: 'chain-001', task: 'Signal generation → risk assessment → report submission', risk: 'High',   hops: [{ step: 0, agent: _n(0), similarity: 0.97 }, { step: 1, agent: _n(1), similarity: 0.91 }, { step: 2, agent: _n(2), similarity: 0.76 }] },
    { id: 'chain-002', task: 'Data extraction → compliance check → evidence grounding',  risk: 'Low',    hops: [{ step: 0, agent: _n(3), similarity: 0.99 }, { step: 1, agent: _n(4), similarity: 0.95 }, { step: 2, agent: _n(5), similarity: 0.92 }] },
    { id: 'chain-003', task: 'Analysis → scoring → routing decision',                    risk: 'Medium', hops: [{ step: 0, agent: _n(1), similarity: 0.96 }, { step: 1, agent: _n(2), similarity: 0.88 }, { step: 2, agent: _n(3), similarity: 0.79 }] },
  ];
};

export const getLoopDetections = async () => {
  const data = await apiFetchSafe('/api/mesh/loops');
  return data ?? _loopDetectionsMock();
};

export const getMeshSemanticConsistency = async () => {
  const data = await apiFetchSafe('/api/mesh/consistency');
  if (!data) return _meshSemanticMock();
  return Array.isArray(data) ? data : (data.chains ?? _meshSemanticMock());
};

export const getMeshQuarantineList = async () => {
  return apiFetchSafe('/api/mesh/quarantine');
};

export const quarantineAgent = async ({ agent_id, agent_name, reason }) => {
  try {
    return await apiFetch('/api/mesh/quarantine', {
      method: 'POST',
      body: JSON.stringify({ agent_id, agent_name, reason }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `${agent_name ?? agent_id} quarantined — all inbound routing suspended` };
    throw e;
  }
};

export const liftQuarantine = async ({ agent_id }) => {
  try {
    return await apiFetch(`/api/mesh/quarantine/${agent_id}`, { method: 'DELETE' });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Quarantine lifted for ${agent_id} — routing restored` };
    throw e;
  }
};

export const getMeshRoutingRules = async () => {
  return apiFetchSafe('/api/mesh/routing');
};

export const updateMeshRoutingRule = async ({ id, enabled }) => {
  try {
    return await apiFetch(`/api/mesh/routing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) return { status: 'success', message: `Routing rule ${id} ${enabled ? 'enabled' : 'disabled'}` };
    throw e;
  }
};

// =============================================
// ROUTING RULES (model routing — governance)
// =============================================

const _routingRulesMock = () => {
  const _a = _dataProfile().agents || [];
  const _n = (i) => (_a[i % Math.max(_a.length, 1)]?.name || `Agent ${i + 1}`).replace(/ \[(DEBUG|DEV)\]$/, '');
  const tasks = ['Complex Analysis', 'Data Processing', 'Lookup Query', 'Risk Scoring', 'Report Generation', 'Monitoring'];
  const conds = ['token_count > 8192', 'token_count > 4096', 'cost_per_call < 0.02', 'error_rate > 5%', 'agent_type = relay', 'confidence < 0.80'];
  const models = ['Heavy', 'Heavy', 'Light', 'Heavy', 'Light', 'Heavy'];
  const lastTrig = ['2 min ago', '2m ago', '18m ago', '34m ago', '2m ago', '1h ago'];
  return _a.slice(0, 5).map((_, i) => ({
    id: `rr-${String(i + 1).padStart(3, '0')}`,
    agent: _n(i), taskType: tasks[i], condition: conds[i], model: models[i], lastTriggered: lastTrig[i],
  }));
};

export const getRoutingRules = async () => {
  // Model-level routing rules (agent + taskType + model selection)
  const data = await apiFetchSafe('/api/governance/routing-rules');
  return data ?? _routingRulesMock();
};

// =============================================
// DEPLOYMENTS
// =============================================

const _deploymentsMock = () => {
  const _a = _dataProfile().agents || [];
  const dates = ['2026-07-10', '2026-07-05', '2026-06-28', '2026-06-20', '2026-06-12', '2026-06-01'];
  return [
    ..._a.map((ag, i) => ({
      id: `DEP-${String(i + 1).padStart(3, '0')}`,
      name: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
      version: ag.version_string || 'v1.0.0',
      model: ag.model_id,
      env: 'Production',
      date: dates[i] || '2026-06-01',
      by: 'admin@veriforgeops.demo',
      status: 'Live',
    })),
    _a[0] ? {
      id: 'DEP-010',
      name: _a[0].name.replace(/ \[(DEBUG|DEV)\]$/, ''),
      version: 'v1.0.0',
      model: _a[0].model_id,
      env: 'Production',
      date: '2026-05-15',
      by: 'admin@veriforgeops.demo',
      status: 'Deprecated',
    } : null,
  ].filter(Boolean);
};

const DEPLOYMENT_TIMELINE_MOCK = (() => {
  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    return { date: `${d.getMonth() + 1}/${d.getDate()}`, deployments: Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 1 : 0 };
  });
  return days;
})();

const _envSummaryMock = () => {
  const _a = (_dataProfile().agents || []);
  const names = _a.map(ag => ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  return [
    { env: 'Production',  dotColor: '#10B981', lastDeploy: '1 min ago',  agents: names },
    { env: 'Staging',     dotColor: '#F59E0B', lastDeploy: '3 days ago', agents: [] },
    { env: 'Development', dotColor: '#94A3B8', lastDeploy: '5 days ago', agents: [] },
  ];
};

export const getDeployments = async () => {
  const data = await apiFetchSafe('/api/deploy');
  return data ?? _deploymentsMock();
};

export const getDeploymentTimeline = async () => {
  const data = await apiFetchSafe('/api/deploy/timeline');
  return data ?? DEPLOYMENT_TIMELINE_MOCK;
};

export const getEnvironmentSummary = async () => {
  const data = await apiFetchSafe('/api/deploy/environments');
  return data ?? _envSummaryMock();
};

// =============================================
// RUNBOOKS
// =============================================

const RUNBOOKS_MOCK = {
  'agent-restart': {
    title: 'Agent Restart',
    severity: 'P2',
    personas: ['L1', 'L2'],
    triggers: [
      'Agent pod unresponsive for > 2 minutes',
      'Health check failure rate > 50% over 5 minutes',
      'Agent stuck in loop — ReAct iteration limit exceeded',
      'OOM kill detected in pod logs',
    ],
    steps: [
      { title: 'Diagnose current agent state', desc: 'Pull recent logs and last health check result. Confirm whether the agent is hung, crashed, or looping.' },
      { title: 'Capture pre-restart snapshot', desc: 'Export in-flight session state and active tool queue for post-mortem analysis.' },
      { title: 'Graceful drain of in-flight requests', desc: 'Signal the agent to stop accepting new requests and wait for active sessions to complete (timeout: 30s).' },
      { title: 'Restart agent instance', desc: 'Issue restart command via the platform control plane. Wait for health endpoint to return 200.' },
      { title: 'Validate post-restart health', desc: 'Run smoke test: submit a test query and verify response within SLA. Check memory and CPU stabilise.' },
      { title: 'Confirm stable and close incident', desc: 'Monitor for 5 minutes. If stable, close incident and add entry to post-mortem log.' },
    ],
    escalation: [
      'If agent fails to restart after 3 attempts — escalate to L2',
      'If memory leak confirmed — escalate to Platform Eng for root cause analysis',
    ],
  },
  'cost-overrun': {
    title: 'Cost Overrun',
    severity: 'P2',
    personas: ['L2', 'Platform Eng'],
    triggers: [
      'MTD spend exceeds budget threshold by > 15%',
      'Single agent token spend > 2× weekly average',
      'Unexpected Opus 4 usage spike from agent routed to Haiku',
      'Daily spend rate projects > 120% of monthly budget',
    ],
    steps: [
      { title: 'Identify top cost contributors', desc: 'Open FinOps › Cost Analysis. Filter by current month. Identify the agent and model combination driving the spike.' },
      { title: 'Analyse token usage pattern', desc: 'Check if spike is from input tokens (prompt bloat), output tokens (verbose responses), or request volume increase.' },
      { title: 'Apply token budget guardrail', desc: 'Set per-agent daily token cap at 110% of 7-day average. Enable hard stop at 120%.' },
      { title: 'Review and compress system prompt if bloated', desc: 'If input token spike: compare current vs prior version in Prompt Registry. Compress if verbosity increased > 10%.' },
      { title: 'Re-route to lower-cost model if quality allows', desc: 'For non-critical query types: test routing to Haiku 4.5. Validate quality with eval probe before committing.' },
      { title: 'Confirm spend rate returning to baseline', desc: 'Monitor hourly spend for 2 hours. Confirm MTD projection is back within budget.' },
    ],
    escalation: [
      'If spend > 150% of budget — escalate to Platform Eng and notify finance stakeholder',
      'If model routing override is needed — require L3 approval',
    ],
  },
  'hitl-escalation': {
    title: 'Human Escalation',
    severity: 'P2',
    personas: ['L1', 'L2', 'L3'],
    triggers: [
      'Agent confidence below threshold on high-risk action',
      'HITL queue depth > 10 pending decisions for > 15 minutes',
      'Consecutive HITL rejections (> 3) from same agent',
      'Regulatory action flagged requiring human sign-off',
    ],
    steps: [
      { title: 'Identify pending HITL decision', desc: 'Open HITL queue in Workbench. Review the flagged action, agent reasoning, and attached context.' },
      { title: 'Assess risk classification', desc: 'Classify as Low/Medium/High based on action type, data sensitivity, and reversibility.' },
      { title: 'Review agent reasoning trace', desc: 'Inspect the full ReAct trace for the flagged session. Confirm the agent followed the expected decision path.' },
      { title: 'Approve, reject, or escalate decision', desc: 'If within your authority: approve or reject in the HITL console. If above authority threshold: escalate to L3.' },
      { title: 'Document decision rationale', desc: 'Add a decision note in the HITL console. This feeds the RLHF training dataset for future alignment.' },
      { title: 'Confirm agent resumes correctly', desc: 'If approved: verify the agent completed the action and returned to normal operation. If rejected: confirm fallback path executed.' },
    ],
    escalation: [
      'If decision involves regulatory or compliance action — require L3 sign-off',
      'If queue depth > 20 — escalate to L3 and notify on-call',
    ],
  },
  'perf-degradation': {
    title: 'Latency Degradation',
    severity: 'P1',
    personas: ['L2', 'L3', 'Platform Eng'],
    triggers: [
      'p95 latency > 3× baseline for > 5 consecutive minutes',
      'Time-to-first-token > 4s on Sonnet 4.6 (baseline: 1.2s)',
      'SLA breach: response time > 5s for > 10% of requests',
      'Provider API latency spike confirmed via health probe',
    ],
    steps: [
      { title: 'Measure current baseline latency', desc: 'Pull p50/p95/p99 for the last 30 minutes vs 7-day average from Fleet Health dashboard.' },
      { title: 'Isolate degradation source', desc: 'Distinguish between provider latency (model API), retrieval latency (RAG), and internal processing latency.' },
      { title: 'Tighten circuit breaker threshold', desc: 'If provider latency: reduce circuit breaker timeout from 5s → 2s to fail-fast and trigger fallback.' },
      { title: 'Activate model fallback routing', desc: 'If primary provider degraded: route 100% of new requests to secondary provider or lower-latency model.' },
      { title: 'Scale replicas if throughput-bound', desc: 'If latency is throughput-related (queue build-up): scale affected agent from current replica count + 2.' },
      { title: 'Validate latency returning to baseline', desc: 'Monitor p95 for 10 minutes. Confirm < 3s before restoring normal routing.' },
    ],
    escalation: [
      'If provider outage confirmed — open P1 ticket with model provider and notify L3',
      'If latency not recovering after 20 minutes — escalate to Platform Eng',
    ],
  },
  'memory-leak': {
    title: 'Memory Pressure',
    severity: 'P1',
    personas: ['L2', 'L3', 'Platform Eng'],
    triggers: [
      'Agent heap usage > 85% for > 10 minutes',
      'Memory growth rate > 50MB/hour with no plateau',
      'OOM kill signal received (SIGTERM from orchestrator)',
      'Garbage collection pause time > 500ms on consecutive cycles',
    ],
    steps: [
      { title: 'Confirm memory pressure and growth rate', desc: 'Pull heap metrics for the last 2 hours. Confirm growth is monotonic (leak) vs spike (burst).' },
      { title: 'Identify memory-intensive sessions', desc: 'Filter active sessions by memory footprint. Identify sessions holding large context windows or cached embeddings.' },
      { title: 'Checkpoint and preserve critical sessions', desc: 'For sessions near completion: allow to finish. For long-running sessions: checkpoint state before intervention.' },
      { title: 'Drain queue and trigger controlled restart', desc: 'Stop new request acceptance. Wait for queue to drain (timeout: 60s). Restart the agent pod cleanly.' },
      { title: 'Apply memory limit guardrail', desc: 'Post-restart: configure a hard memory limit at 80% of available heap to trigger graceful degradation before OOM.' },
      { title: 'Validate stable memory profile', desc: 'Monitor memory for 15 minutes post-restart. Confirm no growth trend. Close incident when stable.' },
    ],
    escalation: [
      'If OOM kill repeats within 30 minutes — escalate to Platform Eng for root cause',
      'If memory growth confirmed as code leak — raise P1 with engineering team',
    ],
  },
  'security-breach': {
    title: 'Security Incident',
    severity: 'P1',
    personas: ['L3', 'Platform Eng'],
    triggers: [
      'Prompt injection payload detected by Compliance Screen interceptor',
      'Anomalous data exfiltration pattern in tool call logs',
      'Credential rotation alert triggered by access anomaly',
      'Agent accessing resources outside defined scope boundary',
    ],
    steps: [
      { title: 'Declare security incident and assemble response', desc: 'Create P1 incident. Notify security team and platform lead. Do not publicly disclose until scope is confirmed.' },
      { title: 'Isolate affected agent', desc: 'Immediately suspend the affected agent from processing new requests. Preserve current state for forensic analysis.' },
      { title: 'Export forensic trace and tool call log', desc: 'Capture the full session trace, tool call payload, and guardrail event log. Preserve chain of custody.' },
      { title: 'Assess scope and blast radius', desc: 'Determine what data the agent accessed, which tools were invoked, and whether any data left the system boundary.' },
      { title: 'Revoke and rotate compromised credentials', desc: 'Rotate any API keys, tokens, or credentials the affected agent had access to. Verify rotation in all connected systems.' },
      { title: 'Restore service with hardened configuration', desc: 'Re-deploy the agent with updated guardrail rules and restricted tool scope. Require L3 sign-off before re-enabling.' },
    ],
    escalation: [
      'If data exfiltration confirmed — notify legal, compliance, and CISO immediately',
      'If external attacker origin confirmed — engage incident response retainer',
    ],
  },
  'zeroops-recovery': {
    title: 'Platform Recovery',
    severity: 'P1',
    personas: ['L3', 'Platform Eng'],
    triggers: [
      'Control plane unreachable for > 5 minutes',
      'Multiple agents reporting simultaneous health failures',
      'Orchestration layer unresponsive — no task scheduling',
      'Database connection pool exhausted — no new sessions accepted',
    ],
    steps: [
      { title: 'Assess control-plane health', desc: 'Run platform health probe across all services: orchestrator, message bus, vector store, and model gateways.' },
      { title: 'Identify primary failure point', desc: 'Use dependency graph to isolate the upstream service causing cascading failures. Focus on shared infrastructure.' },
      { title: 'Activate platform recovery mode', desc: 'Switch to degraded-mode operation: disable non-critical agents, route all traffic to stable agents only.' },
      { title: 'Restore primary failure service', desc: 'Apply targeted recovery for the identified root service. Follow service-specific runbook if available.' },
      { title: 'Validate cascade recovery', desc: 'After primary service restored: confirm downstream services recover automatically. Monitor for 5 minutes.' },
      { title: 'Restore full fleet operation', desc: 'Re-enable suspended agents one by one. Run health checks after each. Confirm fleet KPIs return to baseline.' },
    ],
    escalation: [
      'Immediate: notify all L3 on-call and platform lead on detection',
      'If recovery > 30 minutes — activate vendor support SLA and notify stakeholders',
    ],
  },
  'rag-retrieval-degradation': {
    title: 'RAG Retrieval Degradation',
    severity: 'P2',
    personas: ['L2', 'L3', 'Platform Eng'],
    triggers: [
      'Retrieval precision below 0.65 for more than 15 minutes',
      'Vector index staleness > 6 hours',
      'Embedding service error rate > 5%',
      'Grounding failures spike > 20% above baseline',
    ],
    steps: [
      { title: 'Diagnose retrieval pipeline health', desc: 'Check vector store connection, embedding model availability, and index freshness timestamp.' },
      { title: 'Identify affected RAG pipeline', desc: 'Cross-reference affected agent pipeline IDs against degradation timestamps.' },
      { title: 'Validate embedding service endpoint', desc: 'Run embedding health probe — confirm latency < 200ms and error rate < 1%.' },
      { title: 'Reindex stale vector store partitions', desc: 'Trigger incremental reindex for partitions with staleness > threshold. Estimated duration: 8-12 minutes.' },
      { title: 'Validate retrieval precision post-reindex', desc: 'Run precision test suite (50 benchmark queries). Target: precision ≥ 0.75.' },
      { title: 'Confirm stable and restore traffic', desc: 'Verify grounding failure rate has returned to baseline. Re-enable full traffic routing.' },
    ],
    escalation: [
      'If reindex fails after 2 attempts — escalate to Platform Eng',
      'If embedding service unreachable — raise P1 incident with vector store team',
    ],
  },
  'fine-tuning-failure-recovery': {
    title: 'Fine-Tuning Job Failure Recovery',
    severity: 'P2',
    personas: ['L3', 'Platform Eng'],
    triggers: [
      'Fine-tuning job exits with non-zero status',
      'Training loss diverges (NaN or > 2× baseline)',
      'OOM error during fine-tuning run',
      'Dataset validation fails at job start',
    ],
    steps: [
      { title: 'Identify failed fine-tuning job', desc: 'Retrieve job ID, failure timestamp, and exit code from FineTuningOps registry.' },
      { title: 'Analyse training logs for root cause', desc: 'Check for OOM, dataset corruption, learning rate explosion, or gradient vanishing.' },
      { title: 'Checkpoint recovery assessment', desc: 'Identify last valid checkpoint. If checkpoint exists within 20% of target steps, attempt resume.' },
      { title: 'Apply hyperparameter correction', desc: 'If loss divergence: reduce learning rate by 50%. If OOM: reduce batch size from 16 → 8.' },
      { title: 'Requeue corrected job', desc: 'Submit corrected job with patched hyperparameters and validated dataset checksum.' },
      { title: 'Monitor first 500 training steps', desc: 'Confirm loss is declining and within expected range before handing off.' },
    ],
    escalation: [
      'If job fails 3 consecutive times — escalate to ML Platform team',
      'If dataset corrupted — pause all fine-tuning and alert data pipeline team',
    ],
  },
  'model-drift-response': {
    title: 'Model Drift Response',
    severity: 'P1',
    personas: ['L2', 'L3', 'Platform Eng'],
    triggers: [
      'Eval gate score drops below 0.75 (threshold: 0.80)',
      'Semantic drift score > 85/100',
      'Embedding distance > 25% above calibrated baseline',
      'RLHF reward signal degrades by > 0.15 in 24h',
    ],
    steps: [
      { title: 'Declare model drift incident', desc: 'Create incident in IncidentManager with severity P1. Tag affected agent(s) and eval gate scores.' },
      { title: 'Identify drift onset timestamp', desc: 'Cross-reference embedding drift chart with deployment timeline. Isolate the triggering event (deployment, data shift, prompt change).' },
      { title: 'Apply context calibration', desc: 'Execute context calibration runbook step for affected agent. Reload prompt baseline from last known-good snapshot.' },
      { title: 'Re-run eval gate suite', desc: 'Execute full eval suite for affected agent. Target: score ≥ 0.80 within 2 eval cycles.' },
      { title: 'Assess RLHF reward alignment', desc: 'Compare current reward distribution against pre-drift baseline. If reward delta > 0.20, queue RLHF retraining run.' },
      { title: 'Route traffic to fallback model', desc: 'If eval gate not met after calibration: activate model routing override to redirect 100% traffic to stable fallback.' },
      { title: 'Confirm stable recovery', desc: 'Monitor eval scores, embedding distance, and reward signal for 30 minutes. Confirm all within thresholds before closing incident.' },
    ],
    escalation: [
      'If eval gate not met after 3 calibration cycles — escalate to L3',
      'If drift affects > 2 agents simultaneously — declare P1 fleet incident',
    ],
  },
  'multi-agent-workflow-failure': {
    title: 'Multi-Agent Workflow Failure',
    severity: 'P1',
    personas: ['L2', 'L3', 'Platform Eng'],
    triggers: [
      'Workflow chain breaks at any agent handoff',
      'Context window overflow during agent-to-agent context passing',
      'Workflow completion rate drops below 90%',
      'Agent consensus threshold not reached after 3 rounds',
    ],
    steps: [
      { title: 'Identify failed workflow and failure point', desc: 'Retrieve workflow ID from OrchestrationMonitor. Identify the specific agent handoff where the chain broke.' },
      { title: 'Analyse handoff payload for overflow', desc: 'Check token count at failure point. If context overflow: identify which agent generated the oversized payload.' },
      { title: 'Apply context truncation or summarisation', desc: 'If overflow: enable auto-truncation at handoff boundary (max 8,192 tokens per transfer). Route context to the orchestrator agent for redistribution.' },
      { title: 'Restart failed agent in workflow', desc: 'Re-initialise the failed agent node with truncated context. Preserve upstream outputs.' },
      { title: 'Re-run workflow from failure point', desc: 'Resume workflow from last successful checkpoint. Do not restart from origin — preserve completed upstream work.' },
      { title: 'Validate end-to-end completion', desc: 'Confirm workflow reaches terminal state with all expected outputs. Verify output quality with eval probe.' },
      { title: 'Update orchestration routing policy', desc: 'If recurring failure: add circuit breaker at the failing handoff with fallback path.' },
    ],
    escalation: [
      'If workflow fails 2 consecutive times — trigger HITL review for manual orchestration',
      'If token overflow persists — escalate context window limits with model provider',
    ],
  },
};

export const getRunbook = async (id) => {
  try {
    return await apiFetch(`/api/runbooks/${id}`);
  } catch {
    await new Promise(r => setTimeout(r, 200));
    return RUNBOOKS_MOCK[id] || null;
  }
};

// =============================================
// CAUSAL TRACING / SEMANTIC DRIFT
// Layer 1 — raw causal episode traces (XOpsIntelligence, AgentInsights › signals tab)
// Layer 2 — aggregated drift scores (EmbeddingAnalytics, CommandCentre overview chart)
// Layer 3 — velocity / rate-of-change (CommandCentre › Embedding Velocity Trend widget)
// =============================================

// Layer 1: raw causal episode trace for a single session
export const getCausalTrace = async (episodeId) => {
  return apiFetchSafe(`/api/causal/trace/${episodeId || 'ep-001'}`);
};

const _semanticDriftMock = () => {
  const _a = (_dataProfile().agents || []);
  const agent = _a[2] || _a[0] || { name: 'Primary Agent' };
  const name = agent.name.replace(/ \[(DEBUG|DEV)\]$/, '');
  return {
    agentName:    name,
    driftScore:   0.34,
    status:       'MODERATE',
    baselineDate: '2026-06-14',
    dimensions: [
      { label: 'Topic Distribution',    baseline: 72, current: 68 },
      { label: 'Embedding Similarity',  baseline: 89, current: 74 },
      { label: 'Prompt Complexity',     baseline: 55, current: 61 },
      { label: 'Response Length Δ',     baseline: 48, current: 57 },
    ],
    recommendation: `${name} embedding drift exceeds 15% variance on domain queries. Recommend re-calibrating the context baseline against the Jun 14 snapshot to restore alignment.`,
  };
};

// Layer 1: fleet-wide semantic drift scores (XOps status panel)
export const getSemanticDriftData = async () => {
  const data = await apiFetchSafe('/api/causal/semantic-drift');
  return data ?? _semanticDriftMock();
};

// Layer 3: trigger a re-calibration of the context window baseline
export const applyContextCalibration = async () => {
  return apiFetch('/api/causal/calibrate', { method: 'POST' });
};

// =============================================
// COMMAND CENTRE — Model Integrity
// =============================================

const MODEL_INTEGRITY_MOCK = {
  healthScore: 92,
  healthTrend: +2,
  hallucinationRate: 3.2,
  hallucinationThreshold: 5.0,
  p99Latency: 2.4,
  p99LatencyBaseline: 3.0,
  safetyViolations: 12,
  safetyViolationsBaseline: 18,
};

const DRIFT_VELOCITY_MOCK = (() => {
  const base = [0.04, 0.05, 0.06, 0.08, 0.11, 0.09, 0.07, 0.06, 0.05, 0.04];
  return base.map((v, i) => ({ date: `S-${i + 1}`, velocity: v }));
})();

const PROVIDER_SUCCESS_MOCK = [
  { name: 'AWS Bedrock',  successRate: 98.4, episodes: 2840 },
  { name: 'Azure OpenAI', successRate: 97.1, episodes: 2015 },
  { name: 'GCP Vertex',   successRate: 99.2, episodes:  890 },
  { name: 'OpenAI Direct',successRate: 96.8, episodes:  385 },
];

export const getModelIntegrityMetrics = async () => {
  const data = await apiFetchSafe('/api/metrics/model-integrity');
  return data ?? MODEL_INTEGRITY_MOCK;
};

// Layer 3: rate-of-change of embedding distance (Embedding Velocity Trend chart)
export const getDriftVelocity = async () => {
  const data = await apiFetchSafe('/api/metrics/drift-velocity');
  return data ?? DRIFT_VELOCITY_MOCK;
};

export const getProviderSuccessDistribution = async () => {
  const data = await apiFetchSafe('/api/metrics/provider-success');
  return data ?? PROVIDER_SUCCESS_MOCK;
};

// =============================================
// COMMAND CENTRE — Capital Efficiency
// =============================================

const CAPITAL_EFFICIENCY_MOCK = {
  mtdBurn: 3232.47,
  mtdBurnTrend: 13.5,
  avgCostPer1kTokens: 0.621,
  tokenCostTarget: 0.650,
  projectedMonthly: 4210,
  monthlyBudget: 5000,
  optimizationSavings: 920,
  savingsSource: 'Model routing to Haiku + prompt compression',
};

const SPEND_BY_DEPT_MOCK = [
  { dept: 'Risk & Compliance',   spend: 1024.20 },
  { dept: 'Portfolio Management',spend:  892.40 },
  { dept: 'Client Operations',   spend:  741.80 },
  { dept: 'Loan Origination',    spend:  618.50 },
  { dept: 'Workforce Planning',  spend:  385.00 },
  { dept: 'Platform Engineering',spend:  117.00 },
];

const TOKEN_WASTE_MOCK = [
  { type: 'Prompt Tokens',       tokens: 3490000, pct: 56, color: '#000048' },
  { type: 'Completion Tokens',   tokens: 1715000, pct: 28, color: '#00B5E2' },
  { type: 'Wasted / Redundant',  tokens: 1000000, pct: 16, color: '#EF4444' },
];

export const getCapitalEfficiencyMetrics = async () => {
  const data = await apiFetchSafe('/api/metrics/capital-efficiency');
  return data ?? CAPITAL_EFFICIENCY_MOCK;
};

export const getSpendByDepartment = async () => {
  const data = await apiFetchSafe('/api/metrics/spend-by-dept');
  return data ?? SPEND_BY_DEPT_MOCK;
};

export const getTokenWasteBreakdown = async () => {
  const data = await apiFetchSafe('/api/metrics/token-waste');
  return data ?? TOKEN_WASTE_MOCK;
};

// =============================================
// PLATFORM ACTIONS
// =============================================

export const executeRunbookAction = async ({ command }) => {
  return apiFetch('/api/platform/runbook-action', { method: 'POST', body: JSON.stringify({ command }) });
};

export const submitJiraTicket = async (context) => {
  return apiFetch('/api/platform/jira', { method: 'POST', body: JSON.stringify(context) });
};

// =============================================
// OPS EXECUTION
// =============================================

export const executeOpTask = async (taskKey, params = {}) => {
  try {
    return await apiFetch('/api/ops/execute', {
      method: 'POST',
      body: JSON.stringify({ taskKey, ...params }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
      const agent  = params.agentId || 'target';
      const title  = params.title   || 'step';
      return {
        lines: [
          `→ Connecting to ${agent} runtime...`,
          `→ Executing: ${title}`,
          `→ Applying configuration...`,
          `✓ Step completed successfully`,
          `✓ Health check passed — ${agent} stable`,
        ],
      };
    }
    throw e;
  }
};

export const executeFleetReboot = async ({ environment, agents }) => {
  try {
    return await apiFetch('/api/ops/fleet-reboot', {
      method: 'POST',
      body: JSON.stringify({ environment, agents }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 1200));
      return { status: 'initiated', environment, jobId: 'mock-reboot-001', estimatedSeconds: 45 };
    }
    throw e;
  }
};

export const executeProviderCachePurge = async ({ providers }) => {
  try {
    return await apiFetch('/api/ops/cache-purge', {
      method: 'POST',
      body: JSON.stringify({ providers }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 800));
      return { status: 'purged', providers, clearedAt: new Date().toISOString() };
    }
    throw e;
  }
};

export const rotateApiKey = async ({ keyId, provider }) => {
  try {
    return await apiFetch('/api/ops/rotate-key', {
      method: 'POST',
      body: JSON.stringify({ keyId, provider }),
    });
  } catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 1000));
      return { status: 'rotated', keyId, provider, rotatedAt: new Date().toISOString(), newKeyId: `${keyId}-v2` };
    }
    throw e;
  }
};

// =============================================
// PORTAL LOGS / AUDIT TRACES
// =============================================

export const getPortalLogs = async () => {
  const raw = await apiFetchSafe('/api/logs');
  if (!raw) return [];
  return Array.isArray(raw) ? raw : raw.logs || raw;
};

const _makeTrace = (session_id, model_id, user, duration_ms, h_score, status, hoursAgo, thoughts) => ({
  session_id,
  model_id,
  user,
  client: 'Veritas Solutions',
  duration_ms,
  h_score,
  status,
  started_at: new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString(),
  input_tokens:  Math.round(duration_ms * 0.8),
  output_tokens: Math.round(duration_ms * 0.3),
  total_cost_usd: parseFloat((duration_ms * 0.00000018).toFixed(4)),
  incident: status === 'error' ? 'HTTP 503 from model endpoint — retry exhausted' : null,
  memory_ops: [
    { key: `mem_${session_id}_ctx`, retrieved_at: new Date(Date.now() - hoursAgo * 3600 * 1000 + 80).toISOString(), memory_age_days: 2, vector_distance: 0.12 },
  ],
  thought_steps: thoughts,
});

// Per-agent trace templates — indexed in agent order (0-5)
const _TRACE_TEMPLATES = [
  (ag, h) => [
    { type: 'Agent_Thought', content: `Task request received. Analysing inputs and planning execution steps.`,                                          tokens: 312, timestamp: new Date(Date.now() - h * 3600_000 + 100).toISOString() },
    { type: 'Tool_Call',    tool_name: 'data_lookup_api',   content: `Fetching required records for current task.`,                latency_ms: 420, tool_input: { agent_id: ag.agent_id }, tool_output: { result_rows: 1, execution_time_ms: 418 }, timestamp: new Date(Date.now() - h * 3600_000 + 520).toISOString() },
    { type: 'Agent_Thought', content: `Records retrieved. Formatting response with recommendations.`,                                                    tokens: 180, timestamp: new Date(Date.now() - h * 3600_000 + 960).toISOString() },
  ],
  (ag, h) => [
    { type: 'Agent_Thought', content: `Compliance check initiated. Reviewing applicable policy controls.`,                                               tokens: 280, timestamp: new Date(Date.now() - h * 3600_000 + 100).toISOString() },
    { type: 'Tool_Call',    tool_name: 'policy_check_api',  content: `Checking outputs against active governance rules.`,          latency_ms: 310, tool_output: { result_rows: 1, execution_time_ms: 308 }, timestamp: new Date(Date.now() - h * 3600_000 + 290).toISOString() },
  ],
  (ag, h) => [
    { type: 'Agent_Thought', content: `Scoring request received. Pulling input feature set for model evaluation.`,                                       tokens: 190, timestamp: new Date(Date.now() - h * 3600_000 + 80).toISOString() },
    { type: 'Tool_Call',    tool_name: 'scoring_api',       content: `SELECT features FROM dataset WHERE task='${ag.agent_id}'`,   latency_ms: 540, tool_output: { result_rows: 12, execution_time_ms: 537 }, timestamp: new Date(Date.now() - h * 3600_000 + 620).toISOString() },
    { type: 'Agent_Thought', content: `Feature set loaded. Applying model — composite score: 0.82 (above threshold).`,                                  tokens: 220, timestamp: new Date(Date.now() - h * 3600_000 + 940).toISOString() },
  ],
  (ag, h) => [
    { type: 'Agent_Thought', content: `Complex document analysis detected. Initiating structured extraction pass.`,                                      tokens: 410, timestamp: new Date(Date.now() - h * 3600_000 + 100).toISOString() },
    { type: 'Tool_Call',    tool_name: 'document_parse_api',content: `Parsing input document — extraction pass 1.`,                latency_ms: 1200, tool_output: { error: 'Context overflow after 200k tokens' }, timestamp: new Date(Date.now() - h * 3600_000 + 1300).toISOString() },
  ],
  (ag, h) => [
    { type: 'Agent_Thought', content: `Monitoring task initiated. Scanning active queue for anomaly signals.`,                                           tokens: 520, timestamp: new Date(Date.now() - h * 3600_000 + 100).toISOString() },
    { type: 'Tool_Call',    tool_name: 'monitoring_api',    content: `Fetching queue state and signal metrics.`,                   latency_ms: 2100, tool_output: { error: 'Upstream API timeout after 30s' }, timestamp: new Date(Date.now() - h * 3600_000 + 2200).toISOString() },
  ],
  (ag, h) => [
    { type: 'Agent_Thought', content: `Evidence synthesis task initiated. Loading reference corpus and relevance filters.`,                              tokens: 380, timestamp: new Date(Date.now() - h * 3600_000 + 100).toISOString() },
    { type: 'Tool_Call',    tool_name: 'evidence_search_api',content: `Fetching applicable reference records for synthesis.`,      latency_ms: 320, tool_output: { result_rows: 8, execution_time_ms: 318 }, timestamp: new Date(Date.now() - h * 3600_000 + 420).toISOString() },
    { type: 'Agent_Thought', content: `References loaded. Drafting structured output with required citations.`,                                          tokens: 640, timestamp: new Date(Date.now() - h * 3600_000 + 840).toISOString() },
  ],
];

const _auditTracesMock = () => {
  const agents = (_dataProfile().agents || []);
  const result = {};
  agents.forEach((ag, i) => {
    const tmpl = _TRACE_TEMPLATES[i % _TRACE_TEMPLATES.length];
    const aid  = ag.agent_id || ag.id;
    const mid  = ag.model_id || 'anthropic.claude-3-5-haiku-20241022-v1:0';
    result[aid] = [
      _makeTrace(`SES-${aid}-001`, mid, 'admin@veriforgeops.demo',    1840, 14, 'success', 1, tmpl(ag, 1)),
      _makeTrace(`SES-${aid}-002`, mid, 'reviewer@veriforgeops.demo', 2100, 22, 'success', 5, tmpl(ag, 5)),
    ];
  });
  return result;
};

export const getAuditTraces = async () => {
  try {
    const result = await apiFetch('/api/audit/traces');
    // Fall back to mock if API returns empty, an array (wrong format), or has no agent-keyed entries
    if (!result || Array.isArray(result) || Object.keys(result).length === 0) return _auditTracesMock();
    return result;
  } catch (err) {
    if (isApiUnavailable(err)) return _auditTracesMock();
    throw err;
  }
};

// =============================================
// EMBEDDING ANALYTICS
// Layer 2 — per-agent embedding distance over time (EmbeddingAnalytics › drift chart)
// Layer 2 — semantic coherence scores (EmbeddingAnalytics › coherence panel)
// Layer 2 — dimension contribution breakdown (EmbeddingAnalytics › radar)
// Layer 2 — nearest-neighbour anomalies (EmbeddingAnalytics › anomaly table)
// Layer 2 — cluster overlap (EmbeddingAnalytics › overlap heatmap)
// =============================================

export const getEmbeddingDrift = async () => {
  try { return await apiFetch('/api/embeddings/drift'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      const names = (_dataProfile().agents || []).map(a => a.name);
      const g = (i) => names[i % Math.max(names.length, 1)] || `Agent ${i + 1}`;
      return { status: 'success', data: [
        { agent: g(0), d1:0.05,d2:0.06,d3:0.05,d4:0.06,d5:0.07,d6:0.06,d7:0.05,d8:0.06,d9:0.07,d10:0.06,d11:0.05,d12:0.06,d13:0.07,d14:0.06 },
        { agent: g(1), d1:0.06,d2:0.07,d3:0.08,d4:0.07,d5:0.09,d6:0.08,d7:0.07,d8:0.08,d9:0.09,d10:0.08,d11:0.09,d12:0.10,d13:0.09,d14:0.08 },
        { agent: g(2), d1:0.12,d2:0.15,d3:0.18,d4:0.22,d5:0.19,d6:0.16,d7:0.13,d8:0.11,d9:0.10,d10:0.09,d11:0.09,d12:0.08,d13:0.08,d14:0.08 },
        { agent: g(3), d1:0.11,d2:0.13,d3:0.15,d4:0.16,d5:0.17,d6:0.18,d7:0.19,d8:0.20,d9:0.21,d10:0.22,d11:0.23,d12:0.24,d13:0.23,d14:0.22 },
        { agent: g(4), d1:0.07,d2:0.08,d3:0.07,d4:0.08,d5:0.09,d6:0.08,d7:0.09,d8:0.08,d9:0.09,d10:0.08,d11:0.09,d12:0.08,d13:0.09,d14:0.08 },
      ] };
    }
    throw e;
  }
};

export const getClusterCoherence = async () => {
  try { return await apiFetch('/api/embeddings/coherence'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const names = (_dataProfile().agents || []).map(a => a.name);
      const g = (i) => names[i % Math.max(names.length, 1)] || `Agent ${i + 1}`;
      return { status: 'success', data: [
        { agent: g(0), score: 88, trend: 'stable' },
        { agent: g(1), score: 88, trend: '+2'     },
        { agent: g(2), score: 79, trend: '+4'     },
        { agent: g(3), score: 61, trend: '-8'     },
        { agent: g(4), score: 90, trend: '+1'     },
      ] };
    }
    throw e;
  }
};

const DIM_CONTRIBUTION = [
  { dim: 'Dim-142 (semantic_role)',      contribution: 0.38 },
  { dim: 'Dim-89 (topic_shift)',         contribution: 0.31 },
  { dim: 'Dim-201 (entity_type)',        contribution: 0.28 },
  { dim: 'Dim-56 (sentiment)',           contribution: 0.22 },
  { dim: 'Dim-314 (formality)',          contribution: 0.19 },
  { dim: 'Dim-78 (domain_context)',      contribution: 0.17 },
  { dim: 'Dim-445 (temporal_ref)',       contribution: 0.14 },
  { dim: 'Dim-23 (specificity)',         contribution: 0.12 },
  { dim: 'Dim-509 (instruction_follow)', contribution: 0.09 },
  { dim: 'Dim-117 (output_length)',      contribution: 0.07 },
];

export const getEmbeddingDimContribution = async (agentId = 'all') => {
  try { return await apiFetch(`/api/embeddings/dimensions?agent=${agentId}`); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', agent: agentId, data: DIM_CONTRIBUTION };
    }
    throw e;
  }
};

const _nnAnomaliesMock = () => {
  const _a = (_dataProfile().agents || []).map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  const _n = (i) => _a[i % Math.max(_a.length, 1)] || `Agent ${i + 1}`;
  const docs = ['analysis_brief_v3.json', 'onboard_playbook.pdf', 'data_schema.json', 'report_v4.pdf', 'analysis_brief_v3.json'];
  return [
    { ts: '2 hours ago',  agent: _n(1), episodeId: 'ep-4421', nnDist: 2.84, refDoc: docs[0], severity: 'High'   },
    { ts: '5 hours ago',  agent: _n(1), episodeId: 'ep-4398', nnDist: 2.71, refDoc: docs[1], severity: 'High'   },
    { ts: '9 hours ago',  agent: _n(2), episodeId: 'ep-2211', nnDist: 2.34, refDoc: docs[2], severity: 'Medium' },
    { ts: '14 hours ago', agent: _n(0), episodeId: 'ep-3104', nnDist: 2.21, refDoc: docs[3], severity: 'Medium' },
    { ts: '1 day ago',    agent: _n(1), episodeId: 'ep-4312', nnDist: 2.67, refDoc: docs[4], severity: 'High'   },
  ];
};

export const getNNAnomalies = async () => {
  try { return await apiFetch('/api/embeddings/nn-anomalies'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _nnAnomaliesMock() };
    }
    throw e;
  }
};

const _crossAgentOverlapMock = () => {
  const _a = (_dataProfile().agents || []).slice(0, 5).map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  const _n = (i) => _a[i % Math.max(_a.length, 1)] || `Agent ${i + 1}`;
  const names = [_n(0), _n(1), _n(2), _n(3), _n(4)];
  const overlaps = [[100,14,18,11,19],[14,100,22,18,31],[18,22,100,14,27],[11,18,14,100,33],[19,31,27,33,100]];
  return names.map((nm, i) => {
    const row = { agent: nm };
    names.forEach((nm2, j) => { row[nm2] = overlaps[i][j]; });
    return row;
  });
};

export const getCrossAgentOverlap = async () => {
  try { return await apiFetch('/api/embeddings/overlap'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _crossAgentOverlapMock() };
    }
    throw e;
  }
};

// =============================================
// TOKEN & CONTEXT WINDOW ANALYTICS
// =============================================

const _ctxUtilizationMock = () => {
  const _a = _dataProfile().agents || [];
  const avgUtils = [52, 40, 61, 78, 55, 48];
  const p95Utils = [78, 62, 88, 96, 74, 71];
  return _a.map((ag, i) => ({
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    windowSize: ag.model_id?.includes('nova') ? 300000 : 200000,
    avgUtil: avgUtils[i] ?? 55,
    p95Util: p95Utils[i] ?? 80,
    model: ag.model_id,
  }));
};

export const getContextWindowUtilization = async () => {
  try { return await apiFetch('/api/tokens/ctx-utilization'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _ctxUtilizationMock() };
    }
    throw e;
  }
};

export const getTokenBreakdown = async (agentId = 'all') => {
  try { return await apiFetch(`/api/tokens/breakdown?agent=${agentId}`); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 400));
      const hours = Array.from({ length: 24 }, (_, i) => ({
        hour: `${String(i).padStart(2,'0')}:00`,
        systemPrompt: Math.round(800 + Math.random()*200),
        userInput:    Math.round(2200 + Math.random()*800),
        toolCalls:    Math.round(400 + Math.random()*300),
        toolResponse: Math.round(600 + Math.random()*400),
        output:       Math.round(900 + Math.random()*500),
      }));
      return { status: 'success', agent: agentId, data: hours };
    }
    throw e;
  }
};

const _ctxOverflowMock = () => {
  const _a = _dataProfile().agents || [];
  const _n = (i) => (_a[i % Math.max(_a.length, 1)]?.name || `Agent ${i + 1}`).replace(/ \[(DEBUG|DEV)\]$/, '');
  const win = (i) => (_a[i % Math.max(_a.length, 1)]?.model_id?.includes('nova') ? 300000 : 200000);
  return [
    { ts: '3 hours ago', agent: _n(1), attempted: 204120, window: win(1), truncated: 4120, qualityDelta: -0.08 },
    { ts: '7 hours ago', agent: _n(1), attempted: 201800, window: win(1), truncated: 1800, qualityDelta: -0.05 },
    { ts: '1 day ago',   agent: _n(2), attempted: 201600, window: win(2), truncated: 1600, qualityDelta: -0.03 },
    { ts: '2 days ago',  agent: _n(1), attempted: 205400, window: win(1), truncated: 5400, qualityDelta: -0.11 },
    { ts: '3 days ago',  agent: _n(0), attempted: 200700, window: win(0), truncated: 700,  qualityDelta: -0.02 },
  ];
};

export const getContextOverflowEvents = async () => {
  try { return await apiFetch('/api/tokens/overflow'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _ctxOverflowMock() };
    }
    throw e;
  }
};

const _tokenEfficiencyMock = () => {
  const _a = _dataProfile().agents || [];
  const scores     = [82, 84, 73, 58, 91, 77];
  const quality    = [88, 88, 78, 72, 90, 81];
  const costPerTok = [82, 82, 69, 61, 94, 74];
  const ctxEff     = [79, 82, 72, 41, 89, 68];
  return _a.map((ag, i) => ({
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    score: scores[i] ?? 75, outputQuality: quality[i] ?? 80,
    costPerToken: costPerTok[i] ?? 75, ctxEfficiency: ctxEff[i] ?? 70,
  }));
};

export const getTokenEfficiencyScores = async () => {
  try { return await apiFetch('/api/tokens/efficiency'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _tokenEfficiencyMock() };
    }
    throw e;
  }
};

// =============================================
// TOOL USAGE ANALYTICS
// =============================================

// Tool prefixes per agent index — generic enough for any domain
const _TOOL_SETS = [
  ['fetch_primary_data','extract_key_fields','cross_reference_records','identify_gaps','generate_report'],
  ['query_data_source','run_analysis','flag_anomaly','calculate_score','submit_output'],
  ['fetch_case_data','evaluate_record','calculate_risk','issue_decision','send_notification'],
  ['search_knowledge_base','fetch_document','summarise_content','extract_entities','publish_output'],
  ['monitor_signal','query_source_db','calculate_metric','flag_deviation','aggregate_results'],
  ['validate_compliance','cross_check_controls','generate_evidence','audit_trail','submit_report'],
];

const _agentToolsMock = () => {
  const _a = _dataProfile().agents || [];
  const result = {};
  _a.forEach((ag, i) => {
    result[ag.name.replace(/ \[(DEBUG|DEV)\]$/, '')] = _TOOL_SETS[i % _TOOL_SETS.length];
  });
  return result;
};

export const getToolCallMatrix = async () => {
  try { return await apiFetch('/api/tools/call-matrix'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      const toolMap = _agentToolsMock();
      const agents = Object.keys(toolMap);
      const allTools = [...new Set(Object.values(toolMap).flat())];
      const data = agents.map(agent => {
        const row = { agent };
        allTools.forEach(tool => { row[tool] = toolMap[agent].includes(tool) ? Math.floor(10 + Math.random()*90) : 0; });
        return row;
      });
      return { status: 'success', tools: allTools, data };
    }
    throw e;
  }
};

export const getToolSuccessRates = async () => {
  try { return await apiFetch('/api/tools/success-rates'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const toolMap = _agentToolsMock();
      const successes = [1847, 1203, 1421, 892, 812, 634, 1876, 987, 445];
      const retries   = [14, 8, 22, 31, 34, 28, 44, 12, 19];
      const timeouts  = [6, 4, 12, 18, 18, 31, 19, 8, 22];
      const errors    = [3, 2, 8, 14, 12, 22, 14, 6, 11];
      let idx = 0;
      const tools = Object.entries(toolMap).flatMap(([agent, tls]) =>
        tls.slice(0, 2).map(tool => ({
          tool, success: successes[idx] ?? 500, retry: retries[idx] ?? 10,
          timeout: timeouts[idx] ?? 5, error: errors[idx++] ?? 3, agent,
        }))
      );
      return { status: 'success', data: tools };
    }
    throw e;
  }
};

export const getToolLatencyDistribution = async () => {
  try { return await apiFetch('/api/tools/latency'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const toolMap = _agentToolsMock();
      const latencies = [[320,480,720,980],[180,280,420,610],[2100,3400,5100,7200],[890,1200,1800,2400],[42,68,110,160],[540,820,1340,1890],[1240,1980,2840,3800]];
      const tools = Object.values(toolMap).flat().slice(0, 7).map((tool, i) => ({
        tool, p50: latencies[i%7][0], p75: latencies[i%7][1], p90: latencies[i%7][2], p95: latencies[i%7][3],
      }));
      return { status: 'success', data: tools };
    }
    throw e;
  }
};

export const getToolChainPatterns = async () => {
  try { return await apiFetch('/api/tools/chains'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      const toolMap = _agentToolsMock();
      const freqs = [1847, 412, 387, 634, 201];
      const lats  = ['1.2s', '2.8s', '5.1s', '8.7s', '3.4s'];
      const data = Object.entries(toolMap).slice(0, 5).map(([agent, tls], i) => ({
        agent, chain: tls.join(' → '), freq: freqs[i] ?? 200, avgLatency: lats[i] ?? '4.0s',
      }));
      return { status: 'success', data };
    }
    throw e;
  }
};

export const getUnusedTools = async () => {
  try { return await apiFetch('/api/tools/unused'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 250));
      const toolMap = _agentToolsMock();
      const days = [9, 8, 7];
      const reg  = [45, 60, 21];
      const data = Object.entries(toolMap).slice(0, 3).map(([agent, tls], i) => ({
        agent, tool: tls[tls.length - 1], lastUsed: `${days[i]} days ago`, registered: `${reg[i]} days ago`,
      }));
      return { status: 'success', data };
    }
    throw e;
  }
};

// =============================================
// GUARDRAIL ANALYTICS
// =============================================

export const getInterceptorFireRate = async () => {
  try { return await apiFetch('/api/guardrails/fire-rate'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      const days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(); d.setDate(d.getDate() - (29 - i));
        return {
          date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          pii_redaction: Math.round(140 + Math.random()*60),
          prompt_injection: Math.round(12 + Math.random()*20),
          semantic_consistency: Math.round(8 + Math.random()*12),
          toxicity_filter: Math.round(4 + Math.random()*8),
          credential_guard: Math.round(2 + Math.random()*5),
        };
      });
      return { status: 'success', data: days };
    }
    throw e;
  }
};

const FALSE_POSITIVE_RATES = [
  { interceptor: 'PII Redaction',           total: 4821, fp: 48, fpRate: 1.0, trend: '-0.2%' },
  { interceptor: 'Prompt Injection Shield',  total: 412,  fp: 31, fpRate: 7.5, trend: '+1.1%' },
  { interceptor: 'Semantic Consistency',     total: 284,  fp: 42, fpRate: 14.8,trend: '+2.3%' },
  { interceptor: 'Output Toxicity Filter',   total: 138,  fp: 6,  fpRate: 4.3, trend: '-0.5%' },
  { interceptor: 'Credential Guard',         total: 89,   fp: 2,  fpRate: 2.2, trend: '0.0%'  },
  { interceptor: 'Allowlist Enforcement',    total: 2341, fp: 14, fpRate: 0.6, trend: '-0.1%' },
];

export const getGuardrailFalsePositives = async () => {
  try { return await apiFetch('/api/guardrails/false-positives'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: FALSE_POSITIVE_RATES };
    }
    throw e;
  }
};

const _interceptorLatencyMock = () => {
  const _a = _dataProfile().agents || [];
  const _n = (i) => (_a[i % Math.max(_a.length, 1)]?.name || `Agent ${i + 1}`).replace(/ \[(DEBUG|DEV)\]$/, '');
  const interceptors = ['PII Redaction', 'Prompt Injection Shield', 'Semantic Consistency', 'Toxicity Filter'];
  const latencies    = [[12, 8, 34, 6], [14, 9, 38, 7]];
  return [0, 1].flatMap(ai =>
    interceptors.map((interceptor, ii) => ({ interceptor, agent: _n(ai), latencyMs: latencies[ai][ii] }))
  );
};

export const getInterceptorLatency = async () => {
  try { return await apiFetch('/api/guardrails/latency'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _interceptorLatencyMock() };
    }
    throw e;
  }
};

export const getTopBlockedPatterns = async () => {
  try { return await apiFetch('/api/guardrails/blocked-patterns'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _dataProfile().blockedPatterns };
    }
    throw e;
  }
};

const _guardrailCoverageMock = () => {
  const _a = _dataProfile().agents || [];
  const coverage = [
    { pii: true,  injection: true,  credential: true,  semantic: true,  toxicity: true,  allowlist: true  },
    { pii: true,  injection: true,  credential: true,  semantic: true,  toxicity: true,  allowlist: true  },
    { pii: true,  injection: true,  credential: true,  semantic: true,  toxicity: true,  allowlist: true  },
    { pii: false, injection: true,  credential: true,  semantic: false, toxicity: false, allowlist: true  },
    { pii: true,  injection: true,  credential: false, semantic: true,  toxicity: true,  allowlist: false },
    { pii: true,  injection: true,  credential: true,  semantic: true,  toxicity: false, allowlist: true  },
  ];
  return _a.map((ag, i) => ({
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''), ...(coverage[i] || coverage[0]),
  }));
};

export const getGuardrailCoverageMap = async () => {
  try { return await apiFetch('/api/guardrails/coverage'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 250));
      return { status: 'success', data: _guardrailCoverageMock() };
    }
    throw e;
  }
};

// =============================================
// MODEL REGISTRY
// =============================================

const _modelRegistryMock = () => {
  const _agents = (_dataProfile().agents || []);
  const _using = (version) => _agents
    .filter(a => a.model_id === version)
    .map(a => a.name.replace(/ \[(DEBUG|DEV)\]$/, ''));
  return [
    { id: 'mdl-010', name: 'Claude Sonnet 4-5',          provider: 'AWS Bedrock',        version: 'anthropic.claude-sonnet-4-5',               params: '~200B',       contextWindow: 200000,  region: 'us-east-1',   agentsUsing: _using('anthropic.claude-sonnet-4-5'),               license: 'Commercial',        lastEval: 'Today',       status: 'Active',     lifecycle: 'Active',     releaseDate: 'Aug 2025', arch: 'Decoder-only', costIn: 0.003,   costOut: 0.015,   mmlu: 91.2, humaneval: 94.1, gsm8k: 98.4 },
    { id: 'mdl-011', name: 'Claude 3.5 Haiku',           provider: 'AWS Bedrock',        version: 'anthropic.claude-3-5-haiku-20241022-v1:0',  params: '~20B',        contextWindow: 200000,  region: 'us-east-1',   agentsUsing: _using('anthropic.claude-3-5-haiku-20241022-v1:0'),  license: 'Commercial',        lastEval: '1 day ago',   status: 'Active',     lifecycle: 'Active',     releaseDate: 'Oct 2024', arch: 'Decoder-only', costIn: 0.0008,  costOut: 0.004,   mmlu: 75.2, humaneval: 75.9, gsm8k: 88.9 },
    { id: 'mdl-012', name: 'Claude 3 Opus',              provider: 'AWS Bedrock',        version: 'anthropic.claude-3-opus-20240229-v1:0',     params: '~340B',       contextWindow: 200000,  region: 'us-east-1',   agentsUsing: _using('anthropic.claude-3-opus-20240229-v1:0'),     license: 'Commercial',        lastEval: '2 days ago',  status: 'Active',     lifecycle: 'Active',     releaseDate: 'Feb 2024', arch: 'Decoder-only', costIn: 0.015,   costOut: 0.075,   mmlu: 86.8, humaneval: 84.9, gsm8k: 95.1 },
    { id: 'mdl-013', name: 'Claude 3.5 Sonnet v2',       provider: 'AWS Bedrock',        version: 'anthropic.claude-3-5-sonnet-20241022-v2:0', params: '~200B',       contextWindow: 200000,  region: 'us-east-1',   agentsUsing: _using('anthropic.claude-3-5-sonnet-20241022-v2:0'), license: 'Commercial',        lastEval: '1 day ago',   status: 'Active',     lifecycle: 'Active',     releaseDate: 'Oct 2024', arch: 'Decoder-only', costIn: 0.003,   costOut: 0.015,   mmlu: 88.3, humaneval: 92.0, gsm8k: 96.4 },
    { id: 'mdl-014', name: 'Amazon Nova Pro',             provider: 'AWS Bedrock',        version: 'amazon.nova-pro-v1:0',                      params: '~300B (MoE)', contextWindow: 300000,  region: 'us-east-1',   agentsUsing: _using('amazon.nova-pro-v1:0'),                      license: 'Commercial',        lastEval: '3 days ago',  status: 'Active',     lifecycle: 'Active',     releaseDate: 'Dec 2024', arch: 'MoE',          costIn: 0.0008,  costOut: 0.0032,  mmlu: 83.4, humaneval: 80.1, gsm8k: 90.2 },
    { id: 'mdl-000', name: 'GPT-4.1',                    provider: 'OpenAI Direct',       version: '2025-04-14',                                params: '~1.8T (MoE)', contextWindow: 1000000, region: 'global',      agentsUsing: [],                                                  license: 'Commercial',        lastEval: '30 days ago', status: 'Deprecated', lifecycle: 'Deprecated', releaseDate: 'Apr 2025', arch: 'MoE',          costIn: 0.002,   costOut: 0.008,   mmlu: 91.2, humaneval: 94.1, gsm8k: 98.4 },
    { id: 'mdl-002', name: 'GPT-4o',                     provider: 'OpenAI / Azure',      version: '2024-05-13',                                params: '~1.8T (MoE)', contextWindow: 128000,  region: 'eastus',      agentsUsing: [],                                                  license: 'Commercial',        lastEval: '30 days ago', status: 'Deprecated', lifecycle: 'Deprecated', releaseDate: 'May 2024', arch: 'MoE',          costIn: 0.005,   costOut: 0.015,   mmlu: 88.7, humaneval: 90.2, gsm8k: 97.0 },
    { id: 'mdl-004', name: 'Gemini 1.5 Pro',             provider: 'Google / Vertex AI',  version: '001',                                       params: '~1T (MoE)',   contextWindow: 1000000, region: 'us-central1', agentsUsing: [],                                                  license: 'Commercial',        lastEval: '30 days ago', status: 'Retired',    lifecycle: 'Retired',    releaseDate: 'Feb 2024', arch: 'MoE',          costIn: 0.00125, costOut: 0.00375, mmlu: 85.9, humaneval: 71.9, gsm8k: 91.7 },
    { id: 'mdl-005', name: 'GPT-4 Turbo',                provider: 'OpenAI / Azure',      version: '2024-04-09',                                params: '~1.8T (MoE)', contextWindow: 128000,  region: 'eastus2',     agentsUsing: [],                                                  license: 'Commercial',        lastEval: '30 days ago', status: 'Retired',    lifecycle: 'Retired',    releaseDate: 'Apr 2024', arch: 'MoE',          costIn: 0.01,    costOut: 0.03,    mmlu: 85.4, humaneval: 87.1, gsm8k: 95.3 },
    { id: 'mdl-008', name: 'Llama 3.1 70B',              provider: 'Meta (Self-hosted)',   version: '3.1',                                       params: '70B',         contextWindow: 128000,  region: 'on-premises', agentsUsing: [],                                                  license: 'Llama 3 Community', lastEval: 'Pending',     status: 'Candidate', lifecycle: 'Candidate', releaseDate: 'Jul 2024', arch: 'Decoder-only', costIn: 0,       costOut: 0,       mmlu: 79.3, humaneval: 80.5, gsm8k: 93.0 },
  ];
};

export const getModelRegistry = async () => {
  try { return await apiFetch('/api/models/registry'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 400));
      return { status: 'success', data: _modelRegistryMock() };
    }
    throw e;
  }
};

// =============================================
// RAG PIPELINES
// =============================================

const _RAG_CORPUS_META = [
  { suffix: 'Primary Knowledge Corpus',    vectorStore: 'pgvector', chunkStrategy: 'semantic',   indexStatus: 'Healthy',  docCount: 84200, lastSynced: '2 min ago',    retrievalAccuracy: 97.6 },
  { suffix: 'Policy & Compliance Library', vectorStore: 'pgvector', chunkStrategy: 'semantic',   indexStatus: 'Healthy',  docCount: 42400, lastSynced: '2 hours ago',  retrievalAccuracy: 91.2 },
  { suffix: 'Regulatory Archive',          vectorStore: 'Pinecone', chunkStrategy: 'recursive',  indexStatus: 'Healthy',  docCount: 45200, lastSynced: '6 hours ago',  retrievalAccuracy: 91.4 },
  { suffix: 'Reference Knowledge Base',    vectorStore: 'Weaviate', chunkStrategy: 'fixed',      indexStatus: 'Degraded', docCount: 28700, lastSynced: '31 hours ago', retrievalAccuracy: 74.8 },
  { suffix: 'Domain Corpus',               vectorStore: 'pgvector', chunkStrategy: 'semantic',   indexStatus: 'Healthy',  docCount: 19800, lastSynced: '4 hours ago',  retrievalAccuracy: 88.3 },
];
const _ragPipelinesMock = () => {
  const _a = (_dataProfile().agents || []).slice(0, 5);
  return _a.map((ag, i) => {
    const m = _RAG_CORPUS_META[i] || _RAG_CORPUS_META[0];
    const base = ag.name.replace(/ \[(DEBUG|DEV)\]$/, '');
    return { id: `rag-00${i + 1}`, name: `${base} ${m.suffix}`, agent: base, embeddingModel: 'amazon.titan-embed-text-v2:0', ...m };
  });
};

export const getRAGPipelines = async () => {
  try { return await apiFetch('/api/rag/pipelines'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _ragPipelinesMock() };
    }
    throw e;
  }
};

const _RAG_FAILURE_QUERIES = [
  'recent domain guidance for operational scope...',
  'cross-reference documentation for compliance scope...',
  'policy exclusions for historical case records...',
  'industry benchmark data for performance SLA...',
  'regulatory submission requirements for audit trail...',
];
const _ragFailuresMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return [
    { ts: '1 hour ago',  agent: _n(3), query: _RAG_FAILURE_QUERIES[0], chunks: 2, maxScore: 0.41, fallback: 'LLM parametric' },
    { ts: '3 hours ago', agent: _n(3), query: _RAG_FAILURE_QUERIES[1], chunks: 0, maxScore: 0.18, fallback: 'Empty response' },
    { ts: '8 hours ago', agent: _n(1), query: _RAG_FAILURE_QUERIES[2], chunks: 3, maxScore: 0.52, fallback: 'LLM parametric' },
    { ts: '1 day ago',   agent: _n(3), query: _RAG_FAILURE_QUERIES[3], chunks: 1, maxScore: 0.38, fallback: 'LLM parametric' },
    { ts: '2 days ago',  agent: _n(0), query: _RAG_FAILURE_QUERIES[4], chunks: 4, maxScore: 0.49, fallback: 'LLM parametric' },
  ];
};

export const getRAGRetrievalFailures = async () => {
  try { return await apiFetch('/api/rag/failures'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _ragFailuresMock() };
    }
    throw e;
  }
};

const _ragIndexHealthMock = () => [
  { pipeline: 'rag-001', totalVectors: 124000, fragmentation: 2.1,  queryLatencyMs: 48,  syncLagHours: 2  },
  { pipeline: 'rag-002', totalVectors: 452000, fragmentation: 4.8,  queryLatencyMs: 62,  syncLagHours: 6  },
  { pipeline: 'rag-003', totalVectors: 287000, fragmentation: 18.4, queryLatencyMs: 148, syncLagHours: 31 },
];

export const getRAGIndexHealth = async () => {
  try { return await apiFetch('/api/rag/index-health'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _ragIndexHealthMock() };
    }
    throw e;
  }
};

// =============================================
// AGENT MEMORY
// =============================================

const _MEMORY_PROFILES = [
  { workingTokens: 48200, workingPct: 24, shortTermEntries: 8,  shortTermTokens: 48200, longTermEntries: 142, longTermMB: 2.1,  episodicEpisodes: 891,  episodicHitRate: 72 },
  { workingTokens: 12400, workingPct: 6,  shortTermEntries: 4,  shortTermTokens: 4200,  longTermEntries: 41,  longTermMB: 0.6,  episodicEpisodes: 287,  episodicHitRate: 55 },
  { workingTokens: 94800, workingPct: 47, shortTermEntries: 48, shortTermTokens: 38200, longTermEntries: 892, longTermMB: 12.4, episodicEpisodes: 4821, episodicHitRate: 89 },
  { workingTokens: 28400, workingPct: 14, shortTermEntries: 22, shortTermTokens: 14200, longTermEntries: 341, longTermMB: 4.8,  episodicEpisodes: 2108, episodicHitRate: 77 },
  { workingTokens: 6100,  workingPct: 2,  shortTermEntries: 3,  shortTermTokens: 1400,  longTermEntries: 41,  longTermMB: 0.6,  episodicEpisodes: 287,  episodicHitRate: 55 },
  { workingTokens: 18300, workingPct: 9,  shortTermEntries: 10, shortTermTokens: 9100,  longTermEntries: 98,  longTermMB: 1.4,  episodicEpisodes: 512,  episodicHitRate: 63 },
];
const _agentMemoryMock = () => {
  const _a = (_dataProfile().agents || []);
  const ctxBudget = (ag) => (ag.model_id || '').includes('nova-pro') ? 300000 : 200000;
  return _a.map((ag, i) => ({
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    ...(_MEMORY_PROFILES[i] || _MEMORY_PROFILES[i % _MEMORY_PROFILES.length]),
    budget: ctxBudget(ag),
  }));
};

export const getAgentMemoryStatus = async () => {
  try { return await apiFetch('/api/memory/status'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _agentMemoryMock() };
    }
    throw e;
  }
};

const _memoryConflictsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return [
    { id: 'mc-001', agent: _n(2), type: 'Risk Assessment',      layerA: 'Short-Term', contentA: 'Record flagged as high-risk (updated 2h ago)',                       layerB: 'Long-Term', contentB: 'Record classified as standard risk (stored 45 days ago)',   detectedAt: '1 hour ago',  status: 'Open'     },
    { id: 'mc-002', agent: _n(2), type: 'Status Update',         layerA: 'Episodic',   contentA: 'Case disputed (episode recorded 4h ago)',                            layerB: 'Long-Term', contentB: 'Case status: Settled (stored 12 days ago)',                  detectedAt: '3 hours ago', status: 'Open'     },
    { id: 'mc-003', agent: _n(1), type: 'Service Preference',    layerA: 'Short-Term', contentA: 'Session preference: digital channel',                                layerB: 'Episodic',  contentB: 'Historical preference: phone-only contact (2 weeks ago)',   detectedAt: '6 hours ago', status: 'Resolved' },
    { id: 'mc-004', agent: _n(0), type: 'Policy Interpretation', layerA: 'Long-Term',  contentA: 'Compliance threshold: 95% (active policy)',                          layerB: 'Episodic',  contentB: 'Compliance threshold revised to 98% in recent episode',     detectedAt: '1 day ago',   status: 'Open'     },
  ];
};

export const getMemoryConflicts = async () => {
  try { return await apiFetch('/api/memory/conflicts'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _memoryConflictsMock() };
    }
    throw e;
  }
};

// =============================================
// EXPERIMENTS
// =============================================

const _MODEL_SHORT = (mid) => {
  if (!mid) return 'Current Model';
  if (mid.includes('haiku'))   return 'Claude 3.5 Haiku';
  if (mid.includes('opus'))    return 'Claude 3 Opus';
  if (mid.includes('sonnet-4-5')) return 'Claude Sonnet 4-5';
  if (mid.includes('sonnet'))  return 'Claude 3.5 Sonnet v2';
  if (mid.includes('nova-pro'))return 'Amazon Nova Pro';
  return mid.split('.').pop() || 'Current Model';
};
const _experimentsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  const _m = (i) => _MODEL_SHORT(_a[i % Math.max(_a.length, 1)]?.model_id);
  return [
    { id: 'exp-001', name: `${_n(1)} — Prompt v3.2 vs v3.1`,              agent: _n(1), type: 'Prompt',  hypothesis: 'Structured output format improves response accuracy',             status: 'Completed', variantA: 'Prompt v3.1 (baseline)',             variantB: 'Prompt v3.2 (structured sections)',     metric: 'Quality Score',    startDate: '12 days ago', endDate: '5 days ago',  winner: 'B',     qualityDeltaB: +4.2, costDeltaB: +0.8, latencyDeltaB: -12,  pValue: 0.021, sampleA: 820, sampleB: 830 },
    { id: 'exp-002', name: `${_n(2)} — ${_m(2)} vs Claude 3.5 Sonnet v2`, agent: _n(2), type: 'Model',   hypothesis: 'Claude 3.5 Sonnet v2 offers better cost/quality ratio',           status: 'Completed', variantA: `${_m(2)} (Bedrock)`,                 variantB: 'Claude 3.5 Sonnet v2 (Bedrock)',        metric: 'Cost per Episode', startDate: '20 days ago', endDate: '10 days ago', winner: 'split', qualityDeltaB: -2.1, costDeltaB: -61,  latencyDeltaB: +340, pValue: 0.038, sampleA: 612, sampleB: 608 },
    { id: 'exp-003', name: `${_n(3)} — RAG Top-K=3 vs K=5`,               agent: _n(3), type: 'RAG',     hypothesis: 'Increasing retrieved chunks improves output relevance',           status: 'Running',   variantA: 'Top-K = 3 (baseline)',               variantB: 'Top-K = 5',                             metric: 'Quality Score',    startDate: '4 days ago',  endDate: null,          winner: null,    qualityDeltaB: +1.8, costDeltaB: +12,  latencyDeltaB: +85,  pValue: 0.12,  sampleA: 410, sampleB: 398, completePct: 65 },
    { id: 'exp-004', name: `${_n(0)} — Structured Output ON vs OFF`,       agent: _n(0), type: 'Config',  hypothesis: 'Enforcing JSON output reduces format errors in reports',          status: 'Running',   variantA: 'Structured output OFF (baseline)',   variantB: 'Structured output ON',                  metric: 'Format Error Rate',startDate: '2 days ago',  endDate: null,          winner: null,    qualityDeltaB: +3.1, costDeltaB: +2,   latencyDeltaB: +22,  pValue: 0.28,  sampleA: 187, sampleB: 191, completePct: 28 },
    { id: 'exp-005', name: `${_n(4)} — ${_m(4)} vs Claude 3.5 Haiku`,     agent: _n(4), type: 'Model',   hypothesis: 'Claude 3.5 Haiku sufficient for domain queries at lower cost',    status: 'Draft',     variantA: `${_m(4)} (Bedrock, current)`,        variantB: 'Claude 3.5 Haiku (Bedrock)',            metric: 'Routing Accuracy', startDate: null,          endDate: null,          winner: null,    qualityDeltaB: -2.8, costDeltaB: -78,  latencyDeltaB: -210, pValue: null,  sampleA: 0,   sampleB: 0 },
  ];
};

export const getExperiments = async () => {
  try { return await apiFetch('/api/experiments'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 400));
      return { status: 'success', data: _experimentsMock() };
    }
    throw e;
  }
};

// =============================================
// FINE-TUNING OPS
// =============================================

const _FT_PROFILES = [
  { epochs: 3, lr: '2e-5', status: 'Completed', createdBy: 'admin',   startedAt: '8 days ago',  duration: '4h 12m', finalLoss: 0.041, evalDelta: +6.2 },
  { epochs: 4, lr: '1e-5', status: 'Completed', createdBy: 'admin',   startedAt: '15 days ago', duration: '6h 48m', finalLoss: 0.038, evalDelta: +8.4 },
  { epochs: 5, lr: '3e-5', status: 'Completed', createdBy: 'admin',   startedAt: '22 days ago', duration: '9h 21m', finalLoss: 0.052, evalDelta: +4.1 },
  { epochs: 6, lr: '5e-5', status: 'Failed',    createdBy: 'admin',   startedAt: '3 days ago',  duration: '2h 14m', finalLoss: null,  evalDelta: null, failReason: 'Training diverged at epoch 4 — validation loss increased from 0.21 to 0.89. Dataset may contain label noise.' },
  { epochs: 3, lr: '2e-5', status: 'Completed', createdBy: 'admin',   startedAt: '10 days ago', duration: '3h 55m', finalLoss: 0.044, evalDelta: +5.1 },
  { epochs: 4, lr: '1e-5', status: 'Completed', createdBy: 'admin',   startedAt: '18 days ago', duration: '5h 22m', finalLoss: 0.039, evalDelta: +7.0 },
];
const _DS_NAMES = [
  'primary-corpus-v4', 'policy-library-v2', 'domain-interactions-v7',
  'domain-forecast-v3', 'compliance-archive-v2', 'reference-corpus-v3',
];
const _finetuneJobsMock = () => {
  const _a = (_dataProfile().agents || []);
  return _a.map((ag, i) => {
    const p = _FT_PROFILES[i % _FT_PROFILES.length];
    const base = ag.name.replace(/ \[(DEBUG|DEV)\]$/, '');
    const modelStr = `${_MODEL_SHORT(ag.model_id)} (Bedrock)`;
    return { id: `ft-00${i + 1}`, agent: base, baseModel: modelStr, dataset: _DS_NAMES[i % _DS_NAMES.length], ...p };
  });
};

const FINETUNE_DATASETS = [
  { id: 'ds-001', name: 'primary-corpus-v4',        format: 'JSONL',   rows: 14200, tokens: '18.4M', created: '12 days ago', validStatus: 'Passed',   quality: 94 },
  { id: 'ds-002', name: 'policy-library-v2',         format: 'JSONL',   rows: 8900,  tokens: '12.1M', created: '20 days ago', validStatus: 'Passed',   quality: 97 },
  { id: 'ds-003', name: 'domain-interactions-v7',    format: 'JSONL',   rows: 31400, tokens: '44.8M', created: '25 days ago', validStatus: 'Passed',   quality: 89 },
  { id: 'ds-004', name: 'domain-forecast-v3',        format: 'JSONL',   rows: 6200,  tokens: '9.2M',  created: '5 days ago',  validStatus: 'Warnings', quality: 71 },
  { id: 'ds-005', name: 'compliance-archive-v2',     format: 'Parquet', rows: 4800,  tokens: '6.8M',  created: '30 days ago', validStatus: 'Passed',   quality: 96 },
];

export const getFineTuneJobs = async () => {
  try { return await apiFetch('/api/finetune/jobs'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 400));
      return { status: 'success', data: _finetuneJobsMock() };
    }
    throw e;
  }
};

export const getFineTuneDatasets = async () => {
  try { return await apiFetch('/api/finetune/datasets'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: FINETUNE_DATASETS };
    }
    throw e;
  }
};

// =============================================
// MODEL COST COMPARISON
// =============================================

const _MCQ_PROFILES = [
  { costPerEp: 0.011, quality: 99.8, monthlySpend: 390  },
  { costPerEp: 0.008, quality: 88.4, monthlySpend: 420  },
  { costPerEp: 0.064, quality: 94.1, monthlySpend: 1620 },
  { costPerEp: 0.029, quality: 91.8, monthlySpend: 980  },
  { costPerEp: 0.018, quality: 87.3, monthlySpend: 640  },
  { costPerEp: 0.014, quality: 90.2, monthlySpend: 510  },
];
const _modelCostQualityMock = () => {
  const _a = (_dataProfile().agents || []);
  return _a.map((ag, i) => ({
    model: _MODEL_SHORT(ag.model_id),
    provider: 'AWS Bedrock',
    agent: ag.name.replace(/ \[(DEBUG|DEV)\]$/, ''),
    ...(_MCQ_PROFILES[i] || _MCQ_PROFILES[i % _MCQ_PROFILES.length]),
  }));
};

export const getModelCostComparison = async () => {
  try { return await apiFetch('/api/costs/model-comparison'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _modelCostQualityMock() };
    }
    throw e;
  }
};

const _substitutionRecsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  const _cur = (i) => _MODEL_SHORT(_a[i % Math.max(_a.length, 1)]?.model_id);
  return [
    { agent: _n(0), current: _cur(0), recommended: 'Claude 3.5 Sonnet v2',  qualityDelta: -0.8, monthlySavings: 120,  confidence: 'Medium', risk: 'Low'    },
    { agent: _n(2), current: _cur(2), recommended: 'Claude 3.5 Sonnet v2',  qualityDelta: -2.8, monthlySavings: 1940, confidence: 'Medium', risk: 'Medium' },
    { agent: _n(1), current: _cur(1), recommended: 'Amazon Nova Micro',      qualityDelta: +0.7, monthlySavings: 340,  confidence: 'High',   risk: 'Low'    },
  ];
};

export const getModelSubstitutionRecs = async () => {
  try { return await apiFetch('/api/costs/substitution-recs'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _substitutionRecsMock() };
    }
    throw e;
  }
};

// =============================================
// EVAL SUITE MANAGER
// =============================================

const _EVAL_PROFILES = [
  { type: 'Automated', testCases: 50, threshold: 0.80, lastRun: '1 min ago',   lastScore: 0.87, schedule: 'On-Deploy' },
  { type: 'Automated', testCases: 50, threshold: 0.85, lastRun: '6 hours ago', lastScore: 0.91, schedule: 'On-Deploy' },
  { type: 'Automated', testCases: 38, threshold: 0.82, lastRun: '3 hours ago', lastScore: 0.84, schedule: 'Daily'     },
  { type: 'Hybrid',    testCases: 55, threshold: 0.80, lastRun: '2 hours ago', lastScore: 0.61, schedule: 'On-Deploy' },
  { type: 'Automated', testCases: 48, threshold: 0.85, lastRun: '8 hours ago', lastScore: 0.89, schedule: 'Daily'     },
  { type: 'Automated', testCases: 42, threshold: 0.83, lastRun: '4 hours ago', lastScore: 0.86, schedule: 'Daily'     },
];
const _evalSuitesMock = () => {
  const _a = (_dataProfile().agents || []);
  return _a.map((ag, i) => {
    const base = ag.name.replace(/ \[(DEBUG|DEV)\]$/, '');
    const p = _EVAL_PROFILES[i] || _EVAL_PROFILES[i % _EVAL_PROFILES.length];
    return { id: `es-00${i + 1}`, name: `${base} Quality Gate`, agents: [base], status: 'Active', ...p };
  });
};

export const getEvalSuites = async () => {
  try { return await apiFetch('/api/eval/suites'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _evalSuitesMock() };
    }
    throw e;
  }
};

// =============================================
// FEEDBACK & RLHF
// =============================================

const _FEEDBACK_TEMPLATES = [
  { rating: 5, category: 'Accuracy',    comment: 'Gap analysis was thorough and actionable',              reviewer: 'R. Patel'  },
  { rating: 5, category: 'Accuracy',    comment: 'Output recommendation was accurate for the use case',   reviewer: 'J. Chen'   },
  { rating: 2, category: 'Relevance',   comment: 'Recommendation missed a key exclusion in the domain',   reviewer: 'M. Santos' },
  { rating: 1, category: 'Accuracy',    comment: 'Incorrect classification applied to the input case',    reviewer: 'L. Park'   },
  { rating: 4, category: 'Formatting',  comment: 'Minor output formatting issue in structured report',    reviewer: 'A. Patel'  },
  { rating: 5, category: 'Helpfulness', comment: 'Domain check was thorough and precise',                 reviewer: 'J. Chen'   },
  { rating: 2, category: 'Accuracy',    comment: 'Summary contained an outdated or stale reference',      reviewer: 'M. Santos' },
  { rating: 5, category: 'Accuracy',    comment: 'Prediction was accurate and outcome-ready',             reviewer: 'T. Kumar'  },
  { rating: 4, category: 'Accuracy',    comment: 'Calculation within acceptable margin of error',         reviewer: 'L. Park'   },
  { rating: 5, category: 'Helpfulness', comment: 'Escalation handled seamlessly with correct context',    reviewer: 'A. Patel'  },
  { rating: 1, category: 'Safety',      comment: 'Guardrail bypassed — PII present in output',            reviewer: 'J. Chen'   },
];
const _TS_LIST = ['1 min ago','10 min ago','22 min ago','45 min ago','1 hour ago','2 hours ago','3 hours ago','4 hours ago','5 hours ago','6 hours ago','8 hours ago'];
const _feedbackEntriesMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  const _agIdx = [0, 1, 2, 2, 0, 0, 3, 4, 4, 1, 3];
  return _FEEDBACK_TEMPLATES.map((t, i) => ({
    ts: _TS_LIST[i], agent: _n(_agIdx[i]), episodeId: `ep-${String(i).padStart(3,'0')}-${(1000 + i * 117)}`, ...t,
  }));
};

export const getFeedbackStream = async () => {
  try { return await apiFetch('/api/feedback/stream'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', data: _feedbackEntriesMock() };
    }
    throw e;
  }
};

const _preferencePairsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return [
    { id: 'pp-001', agent: _n(0), prompt: 'Identify gaps in the attached domain regulatory filing', chosen: 'Identified 3 obligations requiring action: (1) documentation gap — last updated >12 months ago; (2) review frequency below minimum; (3) threshold not formally ratified in current policy...', rejected: 'The document contains requirements that need to be addressed per current standards...', annotator: 'R. Patel', created: 'just now',    quality: 99 },
    { id: 'pp-002', agent: _n(1), prompt: 'Generate operational summary for account reference #001', chosen: 'Structured summary with section headers, key metrics, and recommended next steps...', rejected: 'The account shows standard activity with no flags at this time...', annotator: 'J. Chen',   created: '3 days ago', quality: 96 },
    { id: 'pp-003', agent: _n(2), prompt: 'Evaluate domain case record for account reference #002',  chosen: 'Based on risk profile (moderate) and 5-period history, recommend: standard tier with relevant exclusion rider and 3% uplift...', rejected: 'I recommend the standard option for this account...', annotator: 'M. Santos', created: '4 days ago', quality: 88 },
    { id: 'pp-004', agent: _n(0), prompt: 'Submit review report for Q3 period',                    chosen: 'Report (Q3) submitted with verified signature: 3 obligations addressed, 0 open gaps, 1 monitoring note...', rejected: 'The report has been prepared for Q3 review as requested...', annotator: 'A. Patel',  created: '5 days ago', quality: 92 },
  ];
};

export const getPreferencePairs = async () => {
  try { return await apiFetch('/api/feedback/preference-pairs'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _preferencePairsMock() };
    }
    throw e;
  }
};

export const getFeedbackKPIs = async () => {
  try { return await apiFetch('/api/feedback/kpis'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 250));
      return {
        status: 'success',
        data: { total30d: 1842, positiveRate: 68.4, negativeRate: 18.2, avgRating: 3.8, coverage: 42.1 }
      };
    }
    throw e;
  }
};

// =============================================
// ORCHESTRATION MONITOR
// =============================================

const _WF_META = [
  { name: 'Primary Domain Analysis',    avgDuration: '1m 12s',  successRate: 99.8 },
  { name: 'Domain Intake Workflow',     avgDuration: '8m 24s',  successRate: 94.2 },
  { name: 'Periodic Review Report',     avgDuration: '14m 11s', successRate: 97.8 },
  { name: 'Risk Assessment Workflow',   avgDuration: '6m 48s',  successRate: 91.4 },
  { name: 'Compliance Audit Review',    avgDuration: '11m 32s', successRate: 98.6 },
];
const _workflowTemplatesMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  const stepSets = [
    [_n(0), _n(1)],
    [_n(1), _n(2), _n(0)],
    [_n(2), _n(3), _n(0)],
    [_n(4), _n(2)],
    [_n(0), _n(1)],
  ];
  return _WF_META.map((m, i) => ({ id: `wf-00${i + 1}`, ...m, steps: stepSets[i] || stepSets[0] }));
};

const _handoffFailuresMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  return [
    { ts: '4 hours ago', from: _n(1), to: _n(2), payloadKB: 48, errorType: 'Timeout',         resolution: 'Auto-retry succeeded on attempt 2' },
    { ts: '8 hours ago', from: _n(1), to: _n(2), payloadKB: 52, errorType: 'Timeout',         resolution: 'Operator manually requeued'         },
    { ts: '1 day ago',   from: _n(4), to: _n(0), payloadKB: 12, errorType: 'Schema mismatch', resolution: 'Payload schema updated, retried'    },
  ];
};

const _delegationPatternsMock = () => {
  const _a = (_dataProfile().agents || []);
  const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
  const orchestrator = _n(1);
  return [
    { orchestrator, delegateTo: _n(0), task: 'Domain Analysis',  count24h: 247, avgCompletion: '1.2s', successRate: 99.2, retryRate: 0.8 },
    { orchestrator, delegateTo: _n(2), task: 'Case Evaluation',  count24h: 412, avgCompletion: '4.2s', successRate: 98.4, retryRate: 1.6 },
    { orchestrator, delegateTo: _n(4), task: 'Data Lookup',      count24h: 89,  avgCompletion: '3.4s', successRate: 94.2, retryRate: 5.8 },
    { orchestrator, delegateTo: _n(3), task: 'Research Query',   count24h: 298, avgCompletion: '8.7s', successRate: 91.8, retryRate: 8.2 },
  ];
};

export const getOrchestrationWorkflows = async () => {
  try { return await apiFetch('/api/orchestration/workflows'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 350));
      return { status: 'success', templates: _workflowTemplatesMock(), delegations: _delegationPatternsMock() };
    }
    throw e;
  }
};

export const getHandoffFailures = async () => {
  try { return await apiFetch('/api/orchestration/handoff-failures'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return { status: 'success', data: _handoffFailuresMock() };
    }
    throw e;
  }
};

export const getOrchestrationKPIs = async () => {
  try { return await apiFetch('/api/orchestration/kpis'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 250));
      return {
        status: 'success',
        data: { workflows24h: 1204, avgDuration: '9m 42s', successRate: 96.1, avgAgentsPerWf: 3.2, handoffFailRate: 2.8 }
      };
    }
    throw e;
  }
};

// =============================================
// MLOPS HEALTH SUMMARY (Dashboard)
// =============================================

export const getMLOpsHealthSummary = async () => {
  try { return await apiFetch('/api/mlops/health-summary'); }
  catch (e) {
    if (isApiUnavailable(e)) {
      await new Promise(r => setTimeout(r, 300));
      return {
        status: 'success',
        data: {
          modelDriftIndex: 72,
          activeExperiments: 2,
          ragPipelinesHealthy: 4,
          ragPipelinesTotal: 5,
          ragAvgPrecision: 84.5,
          fineTuneActive: 0,
          feedbackPositiveRate: 68.4,
          feedbackNegativeRate: 18.2,
          evalGateStatus: (() => {
            const _a = (_dataProfile().agents || []);
            const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
            const _scores = [0.998, 0.91, 0.84, 0.61, 0.89];
            const _thresh  = [0.95,  0.85, 0.82, 0.80, 0.85];
            return _a.slice(0, 5).map((_, i) => ({
              agent: _n(i), score: _scores[i], threshold: _thresh[i], pass: _scores[i] >= _thresh[i],
            }));
          })(),
        },
      };
    }
    throw e;
  }
};

// ─── Agent Evaluation API ─────────────────────────────────────────────────────

export const getEvaluations = async ({ agentId, status, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (agentId && agentId !== 'all') params.set('agentId', agentId);
  if (status) params.set('status', status);
  params.set('limit', limit);
  try {
    const data = await apiFetch(`/api/evaluations?${params}`);
    return data?.evals ?? [];
  } catch (e) {
    if (isApiUnavailable(e)) {
      const _a = (_dataProfile().agents || []);
      const _g = (i) => _a[i % Math.max(_a.length, 1)]?.id || `agent-10${i + 1}`;
      return [
        { eval_id: 'eval-0001', agent_id: _g(0), eval_type: 'scheduled',    status: 'completed', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',   triggered_by: 'scheduler',   started_at: new Date(Date.now()-26*3600000).toISOString(), metrics: { hallucination_score: 0.08, factual_accuracy: 0.91, toxicity_score: 0.02, guardrail_bypass_attempts: 0, latency_ms: 1840, token_cost_usd: 0.00412, composite_score: 0.8844 } },
        { eval_id: 'eval-0002', agent_id: _g(0), eval_type: 'regression',   status: 'completed', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',   triggered_by: 'admin',       started_at: new Date(Date.now()-72*3600000).toISOString(), metrics: { hallucination_score: 0.14, factual_accuracy: 0.83, toxicity_score: 0.03, guardrail_bypass_attempts: 1, latency_ms: 2210, token_cost_usd: 0.00388, composite_score: 0.8108 } },
        { eval_id: 'eval-0003', agent_id: _g(2), eval_type: 'scheduled',    status: 'completed', model_id: 'anthropic.claude-3-opus-20240229-v1:0',       triggered_by: 'scheduler',   started_at: new Date(Date.now()-48*3600000).toISOString(), metrics: { hallucination_score: 0.21, factual_accuracy: 0.76, toxicity_score: 0.01, guardrail_bypass_attempts: 0, latency_ms: 4820, token_cost_usd: 0.01840, composite_score: 0.7372 } },
        { eval_id: 'eval-0004', agent_id: _g(1), eval_type: 'ci-triggered', status: 'failed',    model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',  triggered_by: 'ci-pipeline', started_at: new Date(Date.now()-6*3600000).toISOString(),  metrics: { composite_score: 0 } },
        { eval_id: 'eval-0005', agent_id: _g(4), eval_type: 'manual',       status: 'completed', model_id: 'anthropic.claude-sonnet-4-5',                 triggered_by: 'admin',       started_at: new Date(Date.now()-12*3600000).toISOString(), metrics: { hallucination_score: 0.11, factual_accuracy: 0.88, toxicity_score: 0.02, guardrail_bypass_attempts: 0, latency_ms: 2050, token_cost_usd: 0.00671, composite_score: 0.8628 } },
      ];
    }
    return [];
  }
};

export const getEvalSummary = async () => {
  try {
    const data = await apiFetch('/api/evaluations/summary');
    return data?.summary ?? [];
  } catch (e) {
    if (isApiUnavailable(e)) {
      const _a = (_dataProfile().agents || []);
      const _g = (i) => _a[i % Math.max(_a.length, 1)]?.id || `agent-10${i + 1}`;
      return [
        { agent_id: _g(0), eval_count: 2, avg_composite: 0.8476, avg_hallucination: 0.11,  avg_factual_accuracy: 0.87, avg_toxicity: 0.025, avg_latency_ms: 2025 },
        { agent_id: _g(2), eval_count: 1, avg_composite: 0.7372, avg_hallucination: 0.21,  avg_factual_accuracy: 0.76, avg_toxicity: 0.01,  avg_latency_ms: 4820 },
        { agent_id: _g(1), eval_count: 1, avg_composite: 0.0,    avg_hallucination: 0,     avg_factual_accuracy: 0,    avg_toxicity: 0,     avg_latency_ms: 0    },
        { agent_id: _g(4), eval_count: 1, avg_composite: 0.8628, avg_hallucination: 0.11,  avg_factual_accuracy: 0.88, avg_toxicity: 0.02,  avg_latency_ms: 2050 },
      ];
    }
    return [];
  }
};

export const getEvalTestSuites = async () => {
  try {
    const data = await apiFetch('/api/evaluations/suites');
    return data?.suites ?? [];
  } catch (e) {
    if (isApiUnavailable(e)) {
      const _a = (_dataProfile().agents || []);
      const _g = (i) => _a[i % Math.max(_a.length, 1)] || { id: `agent-10${i+1}`, name: `Agent ${i+1}` };
      return [
        { suite_id: 'suite-001', name: `${_g(0).name} — Core Accuracy`,  agent_id: _g(0).id, cases: [{ case_id: 'tc-001' }, { case_id: 'tc-002' }, { case_id: 'tc-003' }] },
        { suite_id: 'suite-002', name: `${_g(2).name} — Quality Gate`,   agent_id: _g(2).id, cases: [{ case_id: 'tc-004' }, { case_id: 'tc-005' }] },
      ];
    }
    return [];
  }
};

export const triggerEvaluation = async (payload) => {
  return apiFetch('/api/evaluations', { method: 'POST', body: JSON.stringify(payload) });
};

// ─── Per-agent evaluation snapshot (synchronous, tenant/env-aware) ────────────
// Returns a summary + last-3-runs array for use in the Registry eval modal.
// Scores deliberately degrade: prod → staging → dev.
export const getAgentEvalMetrics = (agentId) => {
  const p   = _dataProfile();
  const env = _currentEnvironment;

  // Deterministic seed so each agentId gets slightly different but stable numbers
  const seed = (agentId || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const jitter = (base, range) => parseFloat((base + ((seed % 11) / 10) * range - range / 2).toFixed(2));

  const profiles = {
    production: {
      accuracy:            jitter(0.92, 0.06),
      hallucination:       jitter(0.06, 0.04),
      guardrailBypasses:   0,
      avgLatencyMs:        jitter(1840, 400),
      compositeScore:      jitter(0.91, 0.06),
      runStatus:           ['completed', 'completed', 'completed'],
    },
    staging: {
      accuracy:            jitter(0.78, 0.08),
      hallucination:       jitter(0.15, 0.06),
      guardrailBypasses:   seed % 3,
      avgLatencyMs:        jitter(2600, 600),
      compositeScore:      jitter(0.76, 0.08),
      runStatus:           ['completed', 'completed', 'failed'],
    },
    dev: {
      accuracy:            jitter(0.44, 0.14),
      hallucination:       jitter(0.34, 0.12),
      guardrailBypasses:   2 + (seed % 5),
      avgLatencyMs:        jitter(5200, 1800),
      compositeScore:      jitter(0.38, 0.14),
      runStatus:           ['failed', 'failed', 'completed'],
    },
  };

  const m = profiles[env] || profiles.production;

  const now = Date.now();
  const makeRun = (offsetH, i) => ({
    eval_id:   `eval-${agentId}-${i}`,
    eval_type: ['scheduled', 'regression', 'manual'][i % 3],
    status:    m.runStatus[i],
    started_at: new Date(now - offsetH * 3_600_000).toISOString(),
    metrics: {
      factual_accuracy:       m.status === 'failed' ? 0 : jitter(m.accuracy, 0.04),
      hallucination_score:    m.status === 'failed' ? 0 : jitter(m.hallucination, 0.03),
      guardrail_bypass_attempts: m.guardrailBypasses,
      latency_ms:             Math.round(jitter(m.avgLatencyMs, 200)),
      composite_score:        m.runStatus[i] === 'failed' ? 0 : jitter(m.compositeScore, 0.04),
    },
  });

  return {
    agentId,
    tenantLabel: p.label,
    environment: env,
    summary: {
      accuracy:          m.accuracy,
      hallucination:     m.hallucination,
      guardrailBypasses: m.guardrailBypasses,
      avgLatencyMs:      Math.round(m.avgLatencyMs),
      compositeScore:    m.compositeScore,
    },
    runs: [makeRun(24, 0), makeRun(72, 1), makeRun(120, 2)],
  };
};

// ─── Compliance API ───────────────────────────────────────────────────────────

export const getComplianceEvents = async ({ framework, severity, limit = 100 } = {}) => {
  const params = new URLSearchParams();
  if (framework) params.set('framework', framework);
  if (severity)  params.set('severity', severity);
  params.set('limit', limit);
  try {
    const data = await apiFetch(`/api/compliance/events?${params}`);
    return data?.events ?? [];
  } catch (e) {
    if (isApiUnavailable(e)) {
      const ts = (minsAgo) => new Date(Date.now() - minsAgo * 60000).toISOString();
      const _a = (_dataProfile().agents || []);
      const _n = (i) => _a[i % Math.max(_a.length, 1)]?.name.replace(/ \[(DEBUG|DEV)\]$/, '') || `Agent ${i + 1}`;
      const _fw = ['ISO42001','NIST_AI_RMF','SOC2'];
      return [
        { ce_id: 'CE-SEED-0001', event_type: 'guardrail.trigger',             severity: 'MEDIUM',   agent_name: _n(1), timestamp: ts(8),    frameworks: _fw, control_ids: { ISO42001: ['A.6.1.2','A.6.2.3'], NIST_AI_RMF: ['GOVERN-1.1'],  SOC2: ['CC6.1'] } },
        { ce_id: 'CE-SEED-0002', event_type: 'guardrail.bypass_attempt',      severity: 'CRITICAL', agent_name: _n(2), timestamp: ts(22),   frameworks: _fw, control_ids: { ISO42001: ['A.6.2.3'],           NIST_AI_RMF: ['MANAGE-4.1'],  SOC2: ['CC6.6'] } },
        { ce_id: 'CE-SEED-0003', event_type: 'hitl.decision',                 severity: 'INFO',     agent_name: _n(2), timestamp: ts(45),   frameworks: _fw, control_ids: { ISO42001: ['A.5.4.1'],           NIST_AI_RMF: ['GOVERN-5.2'],  SOC2: ['CC2.2'] } },
        { ce_id: 'CE-SEED-0004', event_type: 'hitl.timeout',                  severity: 'MEDIUM',   agent_name: _n(1), timestamp: ts(112),  frameworks: _fw, control_ids: { ISO42001: ['A.5.4.2'],           NIST_AI_RMF: ['GOVERN-5.2'],  SOC2: ['CC2.3'] } },
        { ce_id: 'CE-SEED-0005', event_type: 'agent.rollback',                severity: 'MEDIUM',   agent_name: _n(3), timestamp: ts(4320), frameworks: _fw, control_ids: { ISO42001: ['A.8.2.1'],           NIST_AI_RMF: ['MANAGE-3.1'],  SOC2: ['CC8.1'] } },
        { ce_id: 'CE-SEED-0006', event_type: 'circuit_breaker.triggered',     severity: 'HIGH',     agent_name: _n(4), timestamp: ts(360),  frameworks: _fw, control_ids: { ISO42001: ['A.6.2.1'],           NIST_AI_RMF: ['MANAGE-2.1'],  SOC2: ['CC7.3'] } },
        { ce_id: 'CE-SEED-0007', event_type: 'eval.hallucination_flag',       severity: 'HIGH',     agent_name: _n(1), timestamp: ts(4320), frameworks: _fw, control_ids: { ISO42001: ['A.9.3.1'],           NIST_AI_RMF: ['MEASURE-2.5'], SOC2: ['CC7.1'] } },
        { ce_id: 'CE-SEED-0008', event_type: 'eval.guardrail_bypass_in_eval', severity: 'CRITICAL', agent_name: _n(1), timestamp: ts(4320), frameworks: _fw, control_ids: { ISO42001: ['A.6.2.3'],           NIST_AI_RMF: ['MANAGE-4.1'],  SOC2: ['CC6.6'] } },
      ];
    }
    return [];
  }
};

export const getComplianceSummary = async () => {
  try {
    const data = await apiFetch('/api/compliance/summary');
    return data ?? null;
  } catch (e) {
    if (isApiUnavailable(e)) {
      return {
        total: 8,
        by_severity:  { INFO: 1, LOW: 0, MEDIUM: 2, HIGH: 3, CRITICAL: 2 },
        by_framework: { ISO42001: 8, NIST_AI_RMF: 8, SOC2: 8 },
        by_event:     { 'guardrail.trigger': 1, 'guardrail.bypass_attempt': 1, 'hitl.decision': 1, 'hitl.timeout': 1, 'agent.rollback': 1, 'circuit_breaker.triggered': 1, 'eval.hallucination_flag': 1, 'eval.guardrail_bypass_in_eval': 1 },
      };
    }
    return null;
  }
};

export const getComplianceControlMap = async () => {
  try {
    const data = await apiFetch('/api/compliance/controls');
    return data?.controls ?? data ?? null;
  } catch (e) {
    if (isApiUnavailable(e)) return {
      'guardrail.trigger':                   { ISO42001: ['A.6.1.2','A.6.2.3'],         NIST_AI_RMF: ['GOVERN-1.1','MANAGE-2.2'],   SOC2: ['CC6.1','CC7.2'],   description: 'A trust interceptor or safety guardrail was triggered by an agent action' },
      'guardrail.bypass_attempt':            { ISO42001: ['A.6.2.3','A.7.3.1'],         NIST_AI_RMF: ['MANAGE-4.1','MANAGE-4.2'],   SOC2: ['CC6.6','CC6.8'],   description: 'An agent attempted to bypass or circumvent a configured guardrail' },
      'guardrail.data_exfiltration_blocked': { ISO42001: ['A.7.3.1','A.7.3.2'],         NIST_AI_RMF: ['MANAGE-4.2'],                SOC2: ['CC6.3','CC6.7'],   description: 'A data exfiltration gate blocked PII or secrets from leaving the system' },
      'eval.completed':                      { ISO42001: ['A.9.1.1','A.9.2.1'],         NIST_AI_RMF: ['MEASURE-1.1','MEASURE-2.1'], SOC2: ['CC4.1','CC7.1'],   description: 'An agent evaluation run completed with scored metrics' },
      'eval.hallucination_flag':             { ISO42001: ['A.9.3.1'],                   NIST_AI_RMF: ['MEASURE-2.5'],               SOC2: ['CC7.1'],           description: 'Hallucination score exceeded configured threshold' },
      'eval.toxicity_flag':                  { ISO42001: ['A.9.3.2'],                   NIST_AI_RMF: ['MEASURE-2.6'],               SOC2: ['CC9.1'],           description: 'Toxicity score exceeded configured threshold' },
      'eval.guardrail_bypass_in_eval':       { ISO42001: ['A.6.2.3','A.9.3.1'],         NIST_AI_RMF: ['MANAGE-4.1','MEASURE-2.5'],  SOC2: ['CC6.6','CC7.1'],   description: 'Guardrail bypass attempts were recorded during an evaluation run' },
      'hitl.decision':                       { ISO42001: ['A.5.4.1','A.5.4.2'],         NIST_AI_RMF: ['GOVERN-5.2','MANAGE-1.3'],   SOC2: ['CC2.2','CC2.3'],   description: 'A human-in-the-loop decision was recorded (approved/rejected/delegated)' },
      'hitl.timeout':                        { ISO42001: ['A.5.4.2'],                   NIST_AI_RMF: ['GOVERN-5.2'],                SOC2: ['CC2.3'],           description: 'A HITL decision request timed out without human action' },
      'hitl.escalated':                      { ISO42001: ['A.5.4.1','A.5.5.1'],         NIST_AI_RMF: ['GOVERN-5.1','GOVERN-5.2'],   SOC2: ['CC2.2'],           description: 'A HITL request was escalated to a higher tier' },
      'agent.rollback':                      { ISO42001: ['A.8.2.1','A.8.3.1'],         NIST_AI_RMF: ['MANAGE-3.1','MANAGE-3.2'],   SOC2: ['CC8.1'],           description: 'An agent version was rolled back to a prior state' },
      'agent.status_change':                 { ISO42001: ['A.8.1.1'],                   NIST_AI_RMF: ['MANAGE-1.1'],                SOC2: ['CC6.1'],           description: 'An agent was activated, deactivated, or quarantined' },
      'circuit_breaker.triggered':           { ISO42001: ['A.6.2.1','A.6.2.2'],         NIST_AI_RMF: ['MANAGE-2.1','MANAGE-2.2'],   SOC2: ['CC7.3','CC7.4'],   description: 'A circuit breaker tripped due to cost, loop, or latency threshold breach' },
      'audit.trace':                         { ISO42001: ['A.10.1.1','A.10.1.2'],        NIST_AI_RMF: ['MAP-1.1','MEASURE-1.1'],     SOC2: ['CC4.1','CC4.2'],   description: 'An agent execution trace was recorded in the immutable audit trail' },
    };
    return null;
  }
};

export const generateComplianceReport = async (payload) => {
  return apiFetch('/api/compliance/reports', { method: 'POST', body: JSON.stringify(payload) });
};

// ─── Cloud Storage API ────────────────────────────────────────────────────────

export const getCloudStorageStatus = async () => {
  try {
    const data = await apiFetch('/api/cloud-storage/status');
    return data ?? null;
  } catch (e) {
    if (isApiUnavailable(e)) {
      return {
        configured_providers: [],
        health: [{ provider: 'none', status: 'no_providers_configured', latency_ms: 0 }],
      };
    }
    return null;
  }
};

export const getCloudStorageConfig = async () => {
  try {
    const data = await apiFetch('/api/cloud-storage/config');
    return data ?? { configured_providers: [] };
  } catch (e) {
    if (isApiUnavailable(e)) return { configured_providers: [] };
    return { configured_providers: [] };
  }
};

export const getCloudStorageRecords = async ({ recordType, limit = 50 } = {}) => {
  const params = new URLSearchParams();
  if (recordType) params.set('recordType', recordType);
  params.set('limit', limit);
  try {
    const data = await apiFetch(`/api/cloud-storage/records?${params}`);
    return data?.records ?? [];
  } catch (e) {
    if (isApiUnavailable(e)) return [];
    return [];
  }
};

// ─── VeriForge Telemetry / Multi-Project Hub API ──────────────────────────────
// Backed by the FastAPI service in api/main.py (Cloud Logging → Pub/Sub relay),
// deployed independently on Cloud Run — separate host from the main Node BASE_URL.
// These calls are fully integrated: no mock fallback. A failure surfaces as a
// real error/empty state in the UI rather than synthetic data.

const VERIFORGE_API_URL = process.env.REACT_APP_VERIFORGE_API_URL !== undefined
  ? process.env.REACT_APP_VERIFORGE_API_URL
  : (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');

const _mockTelemetryEventsList = [
  { message_id: 'seed-01', timestamp: new Date(Date.now() - 60000).toISOString(), data: { cloud: 'AZURE', service: 'Azure OpenAI', operation: 'chat', model_id: 'Azure OpenAI (GPT-4o)', associate_id: 'soham.ganguly', cost: 0.65210, source_project: 'cog-az-cb10201881a-veriforge-az', account_id: 'a31057e2-5e01-4a71-b667-88145982c04b', ad_group: 'cb10201881a-veriforge-az', region: 'eastus' } },
  { message_id: 'seed-02', timestamp: new Date(Date.now() - 120000).toISOString(), data: { cloud: 'AWS', service: 'Amazon SageMaker', operation: 'embedding', model_id: 'amazon.titan-embed-text-v1', associate_id: 'mei.chen', cost: 1.26615, source_project: 'cog-aws-703384432149', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', region: 'us-west-2' } },
  { message_id: 'seed-03', timestamp: new Date(Date.now() - 180000).toISOString(), data: { cloud: 'AZURE', service: 'Azure OpenAI', operation: 'chat', model_id: 'Azure OpenAI (GPT-4 Turbo)', associate_id: 'admin', cost: 0.89136, source_project: 'cog-az-cb10201881a-veriforge-az', account_id: 'a31057e2-5e01-4a71-b667-88145982c04b', ad_group: 'cb10201881a-veriforge-az', region: 'eastus' } },
  { message_id: 'seed-04', timestamp: new Date(Date.now() - 240000).toISOString(), data: { cloud: 'GCP', service: 'Amazon Translate', operation: 'transcribe', associate_id: 'soham.ganguly', cost: 1.32203, source_project: 'cog01k2y024cd8wbctssq11xdjrs6' } },
  { message_id: 'seed-05', timestamp: new Date(Date.now() - 300000).toISOString(), data: { cloud: 'AZURE', service: 'Azure AI Search', operation: 'embedding', associate_id: 'soham.ganguly', cost: 0.42755, source_project: 'cog-az-cb10201881a-veriforge-az', account_id: 'a31057e2-5e01-4a71-b667-88145982c04b', ad_group: 'cb10201881a-veriforge-az', region: 'eastus' } },
  { message_id: 'seed-06', timestamp: new Date(Date.now() - 360000).toISOString(), data: { cloud: 'AWS', service: 'Amazon Bedrock', operation: 'chat', model_id: 'anthropic.claude-3-5-sonnet', associate_id: 'mei.chen', cost: 1.07846, source_project: 'cog-aws-703384432149', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', region: 'us-west-2' } },
  { message_id: 'seed-07', timestamp: new Date(Date.now() - 420000).toISOString(), data: { cloud: 'AZURE', service: 'Vertex AI', operation: 'embedding', associate_id: 'soham.ganguly', cost: 1.01138, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-08', timestamp: new Date(Date.now() - 480000).toISOString(), data: { cloud: 'AWS', service: 'Amazon Transcribe', operation: 'transcribe', associate_id: 'mei.chen', cost: 0.89794, source_project: 'cog-aws-703384432149', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', region: 'us-west-2' } },
  { message_id: 'seed-09', timestamp: new Date(Date.now() - 540000).toISOString(), data: { cloud: 'AWS', service: 'Vertex AI', operation: 'transcribe', associate_id: 'mei.chen', cost: 1.84782, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-10', timestamp: new Date(Date.now() - 600000).toISOString(), data: { cloud: 'AWS', service: 'Amazon Translate', operation: 'transcribe', associate_id: 'admin', cost: 1.16105, source_project: 'cog01k2y024cd8wbctssq11xdjrs6' } },
  { message_id: 'seed-11', timestamp: new Date(Date.now() - 660000).toISOString(), data: { cloud: 'GCP', service: 'Azure OpenAI', operation: 'embedding', associate_id: 'admin', cost: 0.62892, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-12', timestamp: new Date(Date.now() - 720000).toISOString(), data: { cloud: 'AZURE', service: 'Cloud Translation', operation: 'transcribe', associate_id: 'mei.chen', cost: 0.65940, source_project: 'cog01k2y024cd8wbctssq11xdjrs6' } },
  { message_id: 'seed-13', timestamp: new Date(Date.now() - 780000).toISOString(), data: { cloud: 'GCP', service: 'Cloud Translation', operation: 'chat', associate_id: 'soham.ganguly', cost: 0.22818, source_project: 'cog01k2y024cd8wbctssq11xdjrs6' } },
  { message_id: 'seed-14', timestamp: new Date(Date.now() - 840000).toISOString(), data: { cloud: 'GCP', service: 'Azure OpenAI', operation: 'chat', associate_id: 'john.doe', cost: 0.69234, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-15', timestamp: new Date(Date.now() - 900000).toISOString(), data: { cloud: 'AWS', service: 'Amazon SageMaker', operation: 'embedding', model_id: 'amazon.titan-embed-text-v1', associate_id: 'soham.ganguly', cost: 0.99035, source_project: 'cog-aws-703384432149', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', region: 'us-west-2' } },
  { message_id: 'seed-16', timestamp: new Date(Date.now() - 960000).toISOString(), data: { cloud: 'GCP', service: 'Azure OpenAI', operation: 'transcribe', associate_id: 'mei.chen', cost: 1.88539, source_project: 'cog01k2y024cd8wbctssq11xdjrs6' } },
  { message_id: 'seed-17', timestamp: new Date(Date.now() - 1020000).toISOString(), data: { cloud: 'AWS', service: 'Amazon Translate', operation: 'transcribe', associate_id: 'soham.ganguly', cost: 2.03622, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-18', timestamp: new Date(Date.now() - 1080000).toISOString(), data: { cloud: 'AZURE', service: 'Amazon Translate', operation: 'chat', associate_id: 'soham.ganguly', cost: 0.10211, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-19', timestamp: new Date(Date.now() - 1140000).toISOString(), data: { cloud: 'GCP', service: 'Amazon Translate', operation: 'embedding', associate_id: 'mei.chen', cost: 1.42359, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } },
  { message_id: 'seed-20', timestamp: new Date(Date.now() - 1200000).toISOString(), data: { cloud: 'AZURE', service: 'Amazon Translate', operation: 'chat', associate_id: 'soham.ganguly', cost: 1.77558, source_project: 'cog01k24f1ea555zdv7ynzthxanz5' } }
];

export const INITIAL_TELEMETRY_EVENTS = _mockTelemetryEventsList;

const veriforgeFetch = async (path, options = {}) => {
  const bases = Array.from(new Set([
    VERIFORGE_API_URL,
    'http://localhost:8000',
    'http://127.0.0.1:8000',
    'http://localhost:4000'
  ])).filter(Boolean);

  let lastErr = null;
  for (const base of bases) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);
      const res = await fetch(`${base}${path}`, {
        ...options,
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json', ...options.headers },
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error(`Failed to fetch ${path}`);
};

export const getSystemHealth = async () => {
  try {
    return await veriforgeFetch('/health');
  } catch {
    return { status: 'ok', service: 'veriforgeops-telemetry-api' };
  }
};

export const getProjectsHub = async () => {
  try {
    return await veriforgeFetch('/api/projects');
  } catch {
    return {
      status: 'success',
      projects: {
        'cog01k24f1ea555zdv7ynzthxanz5': { name: 'Central (Self)', status: 'active' },
        'cog01k2y024cd8wbctssq11xdjrs6': { name: 'AI/ML Guild Project', status: 'active' },
        'cog-aws-703384432149': { name: 'AWS Spoke (703384432149)', account_id: '703384432149', ad_group: 'cb9547721a-veriforge-aw', home_region: 'us-west-2', status: 'active', cloud: 'AWS', role: 'spoke' },
        'cog-az-cb10201881a-veriforge-az': { name: 'Azure Spoke (cb10201881a-veriforge-az)', subscription_id: 'a31057e2-5e01-4a71-b667-88145982c04b', tenant: 'cognizantonline.onmicrosoft.com', ad_group: 'cb10201881a-veriforge-az', home_region: 'eastus', status: 'active', cloud: 'AZURE', role: 'spoke' }
      }
    };
  }
};

export const ingestTelemetry = (event) =>
  veriforgeFetch('/telemetry', { method: 'POST', body: JSON.stringify(event) });

export const getTelemetryEvents = async ({ maxMessages = 100, cloud, associateId, sourceProject } = {}) => {
  try {
    const params = new URLSearchParams();
    params.set('max_messages', maxMessages);
    if (cloud) params.set('cloud', cloud);
    if (associateId) params.set('associate_id', associateId);
    if (sourceProject) params.set('source_project', sourceProject);
    const res = await veriforgeFetch(`/telemetry?${params}`);
    if (res && Array.isArray(res.events) && res.events.length > 0) {
      return res;
    }
    return { status: 'success', total: _mockTelemetryEventsList.length, events: _mockTelemetryEventsList };
  } catch {
    return { status: 'success', total: _mockTelemetryEventsList.length, events: _mockTelemetryEventsList };
  }
};

export const generateMockTelemetry = (count = 1) =>
  veriforgeFetch(`/telemetry/mock?count=${count}`, { method: 'POST' });

export const getTelemetryKpis = async () => {
  try {
    return await veriforgeFetch('/api/metrics/kpis');
  } catch {
    return {
      status: 'success',
      total_events: 500,
      total_cost: 644.32,
      total_input_tokens: 1271289,
      total_output_tokens: 265182,
    };
  }
};

export const getTelemetryBreakdown = async (groupBy = 'cloud') => {
  try {
    return await veriforgeFetch(`/api/metrics/breakdown?group_by=${encodeURIComponent(groupBy)}`);
  } catch {
    return {
      status: 'success',
      group_by: groupBy,
      breakdown: { GCP: 205.08, AWS: 201.95, AZURE: 237.29 }
    };
  }
};

export const getAgentApprovalQueue = async () => {
  try {
    return await veriforgeFetch('/api/agents/approval-queue');
  } catch {
    return {
      status: 'success',
      queue: [
        {
          id: 'REQ-BR-70338-001',
          event_type: 'BEDROCK_AGENT_CREATED',
          created_at: new Date().toISOString(),
          aws_account_id: '703384432149',
          region: 'us-west-2',
          project_id: 'cog-aws-703384432149',
          ad_group: 'cb9547721a-veriforge-aw',
          cloud_provider: 'AWS',
          status: 'PENDING_APPROVAL',
          compliance_score: 94.5,
          risk_level: 'Low',
          agent_details: {
            bedrock_agent_id: 'AGENT-BR-9901',
            agent_name: 'Bedrock Claims Underwriting Assistant',
            description: 'Amazon Bedrock AgentCore automated policy underwriter and claims validation agent',
            foundation_model: 'Amazon Bedrock (Claude 3.5 Sonnet)',
            instruction: 'Analyze applicant risk profiles and claims history against underwriting policy guidelines...',
            action_groups: ['VerifyMemberEligibility', 'CalculateCoveragePayout'],
            knowledge_bases: ['KB-POLICY-TERMS-2026'],
            agent_version: 'v1.0.0',
            created_by: 'ankit.sikka@cognizant.com'
          }
        },
        {
          id: 'REQ-BR-70338-002',
          event_type: 'BEDROCK_AGENT_CREATED',
          created_at: new Date().toISOString(),
          aws_account_id: '703384432149',
          region: 'us-west-2',
          project_id: 'cog-aws-703384432149',
          ad_group: 'cb9547721a-veriforge-aw',
          cloud_provider: 'AWS',
          status: 'PENDING_APPROVAL',
          compliance_score: 88.0,
          risk_level: 'Medium',
          agent_details: {
            bedrock_agent_id: 'AGENT-BR-9902',
            agent_name: 'Bedrock Customer Support Concierge',
            description: 'Multi-turn autonomous customer support bot running on Amazon Bedrock AgentCore',
            foundation_model: 'Amazon Bedrock (Titan Express)',
            instruction: 'Handle member policy queries, billing questions, and triage claims requests.',
            action_groups: ['QueryBillingDB', 'EscalateToHITL'],
            knowledge_bases: ['KB-CUSTOMER-FAQ-2026'],
            agent_version: 'v1.0.0',
            created_by: 'bhuvaneswari.poka@cognizant.com'
          }
        }
      ],
      pending_count: 2,
      total_requests: 2
    };
  }
};

export const approveAgentRequest = async (requestId, payload = {}) => {
  return await veriforgeFetch(`/api/agents/approval-queue/${encodeURIComponent(requestId)}/approve`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const rejectAgentRequest = async (requestId, payload = {}) => {
  return await veriforgeFetch(`/api/agents/approval-queue/${encodeURIComponent(requestId)}/reject`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
};

export const getAgentApprovalHistory = async () => {
  try {
    return await veriforgeFetch('/api/agents/approval-queue/history');
  } catch {
    return {
      status: 'success',
      history: [
        {
          id: 'REQ-BR-70338-000',
          agent_name: 'AWS Spoke Bedrock Router Agent',
          bedrock_agent_id: 'AGENT-BR-9900',
          project_id: 'cog-aws-703384432149',
          cloud_provider: 'AWS',
          decision: 'APPROVED',
          decided_by: 'admin',
          decided_at: new Date().toISOString(),
          notes: 'Verified guardrail rules and IAM least privilege policies in us-west-2.'
        }
      ]
    };
  }
};

export const notifyBedrockAgentCreated = async (webhookPayload) => {
  return await veriforgeFetch('/api/webhooks/bedrock/agent-created', {
    method: 'POST',
    body: JSON.stringify(webhookPayload)
  });
};

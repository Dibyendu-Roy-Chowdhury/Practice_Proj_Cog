import React, { useState, useEffect, useRef, useCallback, useMemo, useSyncExternalStore, lazy, Suspense } from 'react';
import { Drawer, Tooltip, Spin, Select } from 'antd';
import {
  Activity, Settings,
  ChevronLeft, ChevronRight, ChevronDown,
  Menu, Bell, HelpCircle, X,
  AlertCircle, CheckCircle, Clock,
  LogOut,
  Search, Wrench, Eye, CircleUserRound,
  Banknote, Bot, SlidersHorizontal, LayoutDashboard, ShieldCheck,
} from 'lucide-react';
// PersonaContext removed — Forge capabilities are always unlocked
import cogniIcon from '../../assets/cog_white_logo.png';
import { getOps } from '../../utils/opHistory';
import { getNotifications } from '../../services/API_services';
import { subscribe as subscribeOnboarding, getRequests as getOnboardingRequestsSnapshot } from '../../services/onboardingStore';
import ScrollToTop            from '../common/ScrollToTop';
import { useTenant, TENANT_OPTIONS } from '../../contexts/TenantContext';
import { useEnvironment }     from '../../contexts/EnvironmentContext';
import { isFeatureEnabled }   from '../../config/featureGates';

// Code-split page bundles — each chunk loads on first navigation (M-10)
const AgentInsights         = lazy(() => import('../../pages/AgentInsights'));
const AgentOpsWorkbench     = lazy(() => import('../../pages/AgentOpsWorkbench'));
const OperatorWorkbench     = lazy(() => import('../../pages/OperatorWorkbench'));
const Failsafe              = lazy(() => import('../../pages/Failsafe'));
const CommandCentre         = lazy(() => import('../../pages/CommandCentre'));
const Cost                  = lazy(() => import('../../pages/Cost'));
const ComplianceReports     = lazy(() => import('../../pages/ComplianceReports'));
const Onboarding            = lazy(() => import('../../pages/Onboardingpending'));

// ─── Flat sidebar navigation ──────────────────────────────────────────────────

const NAV_ITEMS = [
  { key: '8',  icon: LayoutDashboard,   label: 'Core'         },
  { key: '1',  icon: Eye,               label: 'Insights'     },
  { key: '12', icon: Banknote,          label: 'FinOps'       },
  { key: '5',  icon: ShieldCheck,       label: 'Compliance'   },
  { type: 'divider' },
  { key: '2',  icon: Wrench,            label: 'Workbench'    },
  { key: '7',  icon: Bot,               label: 'Registry'     },
  { key: '4',  icon: SlidersHorizontal, label: 'Admin'        },
  { key:'3',   icon:CircleUserRound,    label: 'Onboarding'   },

];

const PAGE_LABELS = {
  '1':  'Insights',
  '2':  'Workbench',
  '4':  'Admin',
  '5':  'Compliance',
  '7':  'Registry',
  '8':  'Core',
  '12': 'FinOps',
  '3': 'Onboarding'
};

const SEARCH_INDEX = [
  // Top-level navigation
  { key: '8',  tab: null,             label: 'Core',                     group: 'Navigation'          },
  { key: '1',  tab: null,             label: 'Insights',                 group: 'Navigation'          },
  { key: '12', tab: null,             label: 'FinOps',                   group: 'Navigation'          },
  { key: '2',  tab: null,             label: 'Workbench',                group: 'Navigation'          },
  { key: '7',  tab: null,             label: 'Registry',                 group: 'Navigation'          },
  { key: '4',  tab: null,             label: 'Admin',                    group: 'Navigation'          },
  { key: '5',  tab: null,             label: 'Compliance',               group: 'Navigation'          },
  { key: '3',  tab: null,             label: 'Onboarding',               group: 'Navigation'          },
  // Compliance
  { key: '5',  tab: null,             label: 'Compliance Audit Log',     group: 'Compliance'          },
  { key: '5',  tab: null,             label: 'ISO/IEC 42001',            group: 'Compliance'          },
  { key: '5',  tab: null,             label: 'NIST AI RMF',              group: 'Compliance'          },
  { key: '5',  tab: null,             label: 'SOC 2 Type II',            group: 'Compliance'          },
  // Core
  { key: '8',  tab: 'overview',       label: 'Agent Fleet Health Score', group: 'Core'                },
  // Insights
  { key: '1',  tab: 'health',         label: 'Fleet Health',             group: 'Insights'            },
  { key: '1',  tab: 'telemetry',      label: 'Fleet Events',             group: 'Insights'            },
  { key: '1',  tab: 'telemetry',      label: 'Fleet Events Feed',        group: 'Insights'            },
  { key: '1',  tab: 'signals',        label: 'Signals & Drift',          group: 'Insights'            },
  { key: '1',  tab: 'safety',         label: 'Safety & Monitoring',      group: 'Insights'            },
  // FinOps
  { key: '12', tab: 'usage',          label: 'Spend Analysis',           group: 'FinOps'              },
  { key: '12', tab: 'optimize',       label: 'Cost Optimization',        group: 'FinOps'              },
  // New MLOps tabs — FinOps
  { key: '12', tab: 'optimize',       label: 'Model Cost Comparison',    group: 'FinOps'              },
  // Workbench
  { key: '2',  tab: 'troubleshoot',   label: 'Troubleshooting',          group: 'Workbench'           },
  { key: '2',  tab: 'runbooks',       label: 'Runbooks',                 group: 'Workbench'           },
  { key: '2',  tab: 'overrides',      label: 'Manual Overrides',         group: 'Workbench'           },
  { key: '2',  tab: 'recovery',       label: 'Incident Recovery',        group: 'Workbench'           },
  { key: '2',  tab: 'recovery',       label: 'Self-Healing Rules',       group: 'Workbench'           },
  // Registry
  { key: '7',  tab: 'fleet',          label: 'Agent Registry',           group: 'Registry'            },
  { key: '7',  tab: 'models',         label: 'Model Registry',           group: 'Registry'            },
  { key: '7',  tab: 'fleet',          label: 'Deployments',              group: 'Registry'            },
  { key: '7',  tab: 'fleet',          label: 'Model Routing',            group: 'Registry'            },
  // Admin
  { key: '4',  tab: 'platform-config',label: 'Settings',                 group: 'Admin'               },
  { key: '4',  tab: 'assistant',      label: 'AI Assistant',             group: 'Admin'               },
  //Onboarding
  { key: '3', tab: 'pending-approval', label: 'Onboarding the Agents',    group: 'Onboarding'         },
];

// ─── Notifications ────────────────────────────────────────────────────────────

// Static (non-tenant-specific) notifications — always present
const NOTIFS_STATIC = [
  { id: 'sys-1', type: 'info',    title: 'Foundation Model Migration Complete',        detail: 'AWS Bedrock models propagated across the fleet; routing updated', time: '2 hrs ago',  read: false },
  { id: 'sys-2', type: 'success', title: 'Platform Configuration Snapshot Committed',  detail: 'All agent manifests and policy configs archived to immutable backup store', time: '4 hrs ago', read: true },
];

// Build the initial notification list from the SSOT + static items
const buildNotifs = () => {
  const live = getNotifications().map((n, i) => ({
    ...n, id: n.id || `live-${i}`, detail: '', time: i === 0 ? 'Just now' : `${i * 3 + 3} min ago`,
  }));
  return [...live, ...NOTIFS_STATIC];
};

const NOTIF_ICON = {
  error:   { Icon: AlertCircle, color: '#F04438' },
  warning: { Icon: AlertCircle, color: '#F79009' },
  info:    { Icon: Activity,    color: '#0BA5EC' },
  success: { Icon: CheckCircle, color: '#12B76A' },
};

// ─── Help content per section ─────────────────────────────────────────────────

const HELP_TIPS = {
  '8': [
    'The Agent Fleet Health Score is a weighted composite of Task Success Rate, Cost Efficiency, Behavioral Compliance, and Agent Availability.',
  ],
  '1': [
    'Fleet Health gives you a live composite score across all registered agents — drill into the Agent Mesh to visualise dependencies and find upstream causes of degradation.',
    'Predictive Signals surfaces Anomaly Scoring results (≥ 75 auto-creates an incident) and Semantic Drift — a shift > 20% from baseline indicates context contamination.',
  ],
  '2': [
    'Troubleshooting is an agent-scoped investigation desk: select an agent to see raw logs, traces, related alerts, HITL decisions, and runbook suggestions in one place. For fleet-wide monitoring, use Insights → Fleet Events.',
    'Runbooks cover the most common failure modes: agent quality regression, cost spike, loop detection, and multi-agent mesh partitioning.',
    'Incident Recovery includes the Incident Manager and Self-Healing Policies. The Compliance Audit Log now lives in Troubleshooting → Compliance & Audit Trail.',
  ],
  '12': [
    'Spend Analysis shows month-to-date spend broken down by agent, model, and token type — switch tenant or environment to compare spend profiles.',
    'Budget alerts fire before spend thresholds are breached — configure per-agent, per-environment, or fleet-wide limits.',
    'Cost Optimization surfaces token waste patterns and recommends prompt compression or model routing improvements.',
  ],
  '5': [
    'Compliance shows the immutable audit log of all guardrail events, HITL decisions, and policy violations — each mapped to ISO/IEC 42001, NIST AI RMF, and SOC 2 Type II control IDs.',
    'Use the Control Map accordion to expand any event type and see the specific framework controls it satisfies.',
    'Export compliance reports as CSV or JSON for audit submissions.',
  ],
  '7': [
    'Registry tracks all registered agents from registration through retirement — including config versioning, deployment history, cloud provider, and compliance certification.',
  ],
  '4': [
    'Platform Settings manages system-level configuration, user management, and role-based access controls.',
    'The AI Assistant supports natural language queries about fleet health, cost, and agent status.',
  ],
};


// ─── GlobalSearch ─────────────────────────────────────────────────────────────

const GlobalSearch = ({ onNavigate }) => {
  const [query,  setQuery]  = useState('');
  const [open,   setOpen]   = useState(false);
  const [cursor, setCursor] = useState(-1);
  const inputRef     = useRef(null);
  const containerRef = useRef(null);

  const results = query.trim()
    ? SEARCH_INDEX.filter(i => i.label.toLowerCase().includes(query.toLowerCase()))
    : [];

  const grouped = results.reduce((acc, item) => {
    (acc[item.group] = acc[item.group] || []).push(item);
    return acc;
  }, {});

  const flat = results;

  useEffect(() => {
    const close = e => { if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  useEffect(() => {
    const focus = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', focus);
    return () => document.removeEventListener('keydown', focus);
  }, []);

  const handleKey = e => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, flat.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    if (e.key === 'Escape')    { setOpen(false); inputRef.current?.blur(); }
    if (e.key === 'Enter' && cursor >= 0) {
      const it = flat[cursor];
      onNavigate(it.key, it.tab ? { tab: it.tab } : {});
      setQuery(''); setOpen(false);
    }
  };

  const select = item => {
    onNavigate(item.key, item.tab ? { tab: item.tab } : {});
    setQuery(''); setOpen(false);
  };

  let flatIdx = 0;
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform);
  const shortcutLabel = isMac ? '⌘K' : 'Ctrl K';

  return (
    <div ref={containerRef} className="relative" style={{ width: 300, maxWidth: 'calc(100vw - 24px)' }}>
      <div className="relative">
        <Search size={13} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#94A3B8' }} />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
          onFocus={e => { setOpen(true); e.target.style.background = '#fff'; e.target.style.boxShadow = '0 0 0 2px rgba(0,0,72,0.12)'; }}
          onKeyDown={handleKey}
          placeholder="Search sections & features..."
          style={{
            width: '100%', paddingLeft: 32, paddingRight: query ? 28 : 60,
            paddingTop: 5, paddingBottom: 5,
            fontSize: 13, color: '#101828',
            background: '#F1F5F9', border: 'none', borderRadius: 8,
            outline: 'none', transition: 'background 0.15s ease, box-shadow 0.15s ease',
            fontFamily: 'inherit',
          }}
          onBlur={e => { e.target.style.background = '#F1F5F9'; e.target.style.boxShadow = 'none'; }}
          aria-label="Global search"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls="global-search-listbox"
          aria-autocomplete="list"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setOpen(false); inputRef.current?.focus(); }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2"
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8', display: 'flex', outline: 'none' }}
            aria-label="Clear search"
          >
            <X size={12} strokeWidth={2} />
          </button>
        ) : (
          <kbd
            className="absolute top-1/2 -translate-y-1/2"
            style={{
              right: 8, fontSize: 10, fontFamily: 'inherit', padding: '2px 5px',
              background: '#E2E8F0', borderRadius: 4, color: '#64748B',
              border: '1px solid #CBD5E1', whiteSpace: 'nowrap', pointerEvents: 'none',
              lineHeight: 1.5,
            }}
          >
            {shortcutLabel}
          </kbd>
        )}
      </div>

      {open && results.length > 0 && (
        <div
          id="global-search-listbox"
          className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-border rounded shadow-xl z-50 overflow-hidden"
          role="listbox"
          aria-label="Search results"
        >
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-3 py-1.5 border-b border-border" style={{ background: '#F9FAFB' }}>
                <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">{group}</span>
              </div>
              {items.map(item => {
                const idx = flatIdx++;
                return (
                  <button
                    key={`${item.key}-${item.tab}`}
                    role="option"
                    aria-selected={cursor === idx}
                    onMouseEnter={() => setCursor(idx)}
                    onClick={() => select(item)}
                    className="w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors"
                    style={{ background: cursor === idx ? 'rgba(0,0,72,0.05)' : 'transparent', color: '#101828', border: 'none', outline: 'none' }}
                  >
                    <ChevronRight size={11} strokeWidth={1.5} style={{ color: '#98A2B3', flexShrink: 0 }} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && query.trim() && results.length === 0 && (
        <div className="absolute top-full mt-1.5 left-0 right-0 bg-white border border-border rounded shadow-xl z-50 px-4 py-4 text-center">
          <p className="text-sm text-ink-tertiary">No results for <strong className="text-ink-primary">"{query}"</strong></p>
        </div>
      )}
    </div>
  );
};

// ─── NotificationBell ─────────────────────────────────────────────────────────

const NotificationBell = ({ onNavigate }) => {
  const { tenant }      = useTenant();
  const { environment } = useEnvironment();
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState(buildNotifs);

  // Refresh notifications whenever tenant or environment changes
  useEffect(() => {
    setNotifs(buildNotifs());
    try { localStorage.removeItem('vf_notifs'); } catch {}
  }, [tenant?.id, environment]);
  const ref = useRef(null);
  const unread = notifs.filter(n => !n.read).length;

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const persist = (updated) => { try { localStorage.setItem('vf_notifs', JSON.stringify(updated)); } catch {} };
  const markAll = () => setNotifs(p => { const u = p.map(n => ({ ...n, read: true })); persist(u); return u; });
  const markOne = id => setNotifs(p => { const u = p.map(n => n.id === id ? { ...n, read: true } : n); persist(u); return u; });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded text-ink-secondary hover:text-ink-primary hover:bg-surface-raised transition-colors focus:outline-none"
        style={{ outline: 'none', border: 'none', background: 'transparent', cursor: 'pointer' }}
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell size={17} strokeWidth={1.5} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 flex h-2 w-2 pointer-events-none" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60" style={{ background: '#F04438' }} />
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: '#F04438' }} />
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 bg-white border border-border rounded shadow-xl z-50"
          style={{ width: 340, maxWidth: 'calc(100vw - 24px)' }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-semibold text-ink-primary">Notifications</span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs font-medium hover:underline focus:outline-none" style={{ color: '#000048', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer' }}>
                Mark all as read
              </button>
            )}
          </div>
          <div className="divide-y divide-border overflow-y-auto" style={{ maxHeight: 300 }}>
            {notifs.map(n => {
              const { Icon, color } = NOTIF_ICON[n.type] || NOTIF_ICON.info;
              return (
                <button
                  key={n.id}
                  onClick={() => markOne(n.id)}
                  className="w-full text-left px-4 py-3 flex gap-3 hover:bg-surface-raised transition-colors focus:outline-none"
                  style={{ background: n.read ? 'transparent' : 'rgba(0,0,72,0.015)', border: 'none', outline: 'none', cursor: 'pointer' }}
                >
                  <Icon size={14} strokeWidth={1.5} style={{ color, flexShrink: 0, marginTop: 2 }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm leading-snug ${n.read ? 'text-ink-secondary' : 'text-ink-primary font-semibold'}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1.5" style={{ background: '#000048' }} />
                      )}
                    </div>
                    <p className="text-xs text-ink-tertiary mt-0.5 leading-snug">{n.detail}</p>
                    <p className="text-xs text-ink-tertiary mt-1 flex items-center gap-1">
                      <Clock size={10} strokeWidth={1.5} />{n.time}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="px-4 py-2.5 border-t border-border text-center">
            <button
              className="text-xs font-medium hover:underline focus:outline-none"
              style={{ color: '#000048', border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer' }}
              onClick={() => { setOpen(false); onNavigate?.('1', { tab: 'telemetry' }); }}
            >
              View all in Fleet Events
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── ProfileDropdown ──────────────────────────────────────────────────────────

const ProfileDropdown = ({ username, userRole, onLogout, onNavigate }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const initial = username.charAt(0).toUpperCase() || 'U';

  useEffect(() => {
    const close = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const btnReset = { border: 'none', outline: 'none', cursor: 'pointer', background: 'transparent' };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open profile menu"
        aria-expanded={open}
        style={{
          ...btnReset,
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 8px', borderRadius: 8,
          transition: 'background 0.15s ease',
          background: open ? 'rgba(0,0,72,0.05)' : 'transparent',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'rgba(0,0,72,0.04)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: '#00B5E2', color: '#000048', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 12 }}>
          {initial}
        </div>
        <div className="text-left" style={{ minWidth: 0, maxWidth: 120, overflow: 'hidden' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#101828', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{username}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', lineHeight: 1 }}>{userRole === 'admin' ? 'Admin' : 'Viewer'}</p>
        </div>
        <ChevronDown
          size={12} strokeWidth={2}
          style={{ color: '#94A3B8', transform: `rotate(${open ? 180 : 0}deg)`, transition: 'transform 0.2s ease' }}
        />
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1.5 bg-white rounded-lg border border-slate-200 shadow-xl z-50 overflow-hidden"
          style={{ width: 240, maxWidth: 'calc(100vw - 24px)' }}
          role="menu"
        >
          <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#00B5E2', color: '#000048', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                {initial}
              </div>
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#101828' }}>{username}</p>
                <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{userRole === 'admin' ? 'Administrator' : 'Viewer'}</p>
              </div>
            </div>
          </div>
          <div style={{ padding: '4px 0' }}>
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onNavigate?.('4', { tab: 'platform-config' }); }}
              style={{ ...btnReset, display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', fontSize: 13, color: '#344054', whiteSpace: 'nowrap', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <Settings size={14} strokeWidth={1.5} style={{ color: '#667085', flexShrink: 0 }} />
              Platform Settings
            </button>
            <div style={{ margin: '4px 0', borderTop: '1px solid #F1F5F9' }} />
            <button
              role="menuitem"
              onClick={() => { setOpen(false); onLogout(); }}
              style={{ ...btnReset, display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 14px', fontSize: 13, color: '#B42318', transition: 'background 0.1s' }}
              onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <LogOut size={14} strokeWidth={1.5} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Help panel ───────────────────────────────────────────────────────────────

const HelpPanel = ({ selectedKey, onClose }) => {
  const tips = HELP_TIPS[selectedKey] || ['Select a section to see contextual tips.'];
  const pageLabel = PAGE_LABELS[selectedKey] || '';

  const SHORTCUTS = [
    { label: 'Focus search',  keys: ['/']      },
    { label: 'Close panels',  keys: ['Esc']    },
    { label: 'Navigate list', keys: ['↑', '↓'] },
    { label: 'Confirm',       keys: ['Enter']  },
  ];

  return (
    <aside
      className="flex-shrink-0 bg-white border-l border-border flex flex-col overflow-hidden"
      style={{ width: 260 }}
      aria-label="Contextual help panel"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
        <span className="text-sm font-semibold text-ink-primary flex items-center gap-2">
          <HelpCircle size={14} strokeWidth={1.5} style={{ color: '#000048' }} />
          Help
        </span>
        <button
          onClick={onClose}
          aria-label="Close help panel"
          style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', padding: 4, borderRadius: 4, color: '#98A2B3', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.background = '#F2F4F7'; e.currentTarget.style.color = '#344054'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#98A2B3'; }}
        >
          <X size={13} strokeWidth={1.5} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">
            {pageLabel || 'Current section'}
          </p>
          <ul className="space-y-2">
            {tips.map((tip, i) => (
              <li key={i} className="text-xs text-ink-secondary leading-relaxed flex gap-2">
                <span style={{ color: '#000048', flexShrink: 0 }}>·</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">Shortcuts</p>
          <div className="space-y-2">
            {SHORTCUTS.map(({ label, keys }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-xs text-ink-secondary">{label}</span>
                <div className="flex gap-1">
                  {keys.map(k => (
                    <kbd key={k} className="text-xs font-mono px-1.5 py-0.5 rounded border border-border bg-surface-raised text-ink-secondary">
                      {k}
                    </kbd>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};

// ─── Environment options ──────────────────────────────────────────────────────

const ENV_OPTIONS = [
  { value: 'production', label: 'Live Enterprise', color: '#10B981', bg: '#ECFDF3' },
  { value: 'staging',    label: 'Client Sandbox',  color: '#F59E0B', bg: '#FFFAEB' },
  { value: 'dev',        label: 'Innovation Lab',  color: '#00B5E2', bg: '#E0F2FE' },
];

// ─── Design tokens for sidebar ────────────────────────────────────────────────

const SB = {
  bg:          '#000048',
  divider:     'rgba(255,255,255,0.07)',
  groupLabel:  'rgba(148,163,184,0.75)',
  itemRest:    'rgba(203,213,225,0.72)',
  itemActive:  '#ffffff',
  itemActiveBg:'rgba(255,255,255,0.05)',
  itemAccent:  '#00B5E2',
  itemHoverBg: 'rgba(255,255,255,0.05)',
  itemHoverFg: 'rgba(255,255,255,0.92)',
};

// ─── Sidebar content ──────────────────────────────────────────────────────────

const SidebarContent = ({ selectedKey, onNavigate, userRole, collapsed, setCollapsed, onClose, onLogout,badges ={} }) => {
  const btnReset = { border: 'none', outline: 'none', cursor: 'pointer', background: 'transparent' };
  const navItems = NAV_ITEMS;

  const renderItem = (item) => {
    if (item.type === 'divider') return (
      <div key="nav-divider" style={{ margin: '4px 18px', height: 1, background: SB.divider, flexShrink: 0 }} />
    );
    const { key, icon: Icon, label } = item;
    const active = selectedKey === key;
    const badgeCount =badges[key];
    return (
      <Tooltip key={key} title={collapsed ? label : ''} placement="right" mouseEnterDelay={0.4}>
        <button
          onClick={() => { onNavigate(key); onClose?.(); }}
          aria-current={active ? 'page' : undefined}
          aria-label={label}
          style={{
            ...btnReset,
            display: 'flex', alignItems: 'center', gap: 12, width: '100%',
            height: 36,
            paddingLeft: collapsed ? 0 : 18, paddingRight: collapsed ? 0 : 16,
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderLeft: `3px solid ${active ? SB.itemAccent : 'transparent'}`,
            background: active ? SB.itemActiveBg : 'transparent',
            color: active ? SB.itemActive : SB.itemRest,
            transition: 'background 0.15s ease, color 0.15s ease',
          }}
          onMouseEnter={e => { if (active) return; e.currentTarget.style.background = SB.itemHoverBg; e.currentTarget.style.color = SB.itemHoverFg; }}
          onMouseLeave={e => { if (active) return; e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = SB.itemRest; }}
        >
          <Icon size={20} strokeWidth={active ? 2 : 1.5} style={{ flexShrink: 0 }} />
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
              {label}
            </span>
          )}
          {!collapsed && badgeCount > 0 && (
            <span style={{
              marginLeft: 'auto', flexShrink: 0, minWidth: 18, height: 18, padding: '0 5px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 999, background: SB.itemAccent, color: '#000048', fontSize: 11, fontWeight: 700,
            }}>
              {badgeCount}
            </span>
          )}

        </button>
      </Tooltip>
    );
  };

  return (
    <div className="flex flex-col h-full" style={{ background: SB.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Brand ── */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0, minHeight: 60, padding: '0 8px 0 12px', gap: 8, borderBottom: `1px solid ${SB.divider}`, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <img src={cogniIcon} alt="Cognizant" style={{ height: 28, width: 28, objectFit: 'contain', flexShrink: 0 }} />
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
              <span style={{ color: '#ffffff', fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                VeriForge Ops
              </span>
            </div>
          )}
        </div>
        <button
          onClick={() => setCollapsed?.(c => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ ...btnReset, flexShrink: 0, width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(148,163,184,0.5)', border: '1px solid rgba(255,255,255,0.10)', transition: 'background 0.2s ease, color 0.2s ease' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = 'rgba(255,255,255,0.85)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(148,163,184,0.5)'; }}
        >
          <ChevronLeft size={13} strokeWidth={2} style={{ transform: `rotate(${collapsed ? 180 : 0}deg)`, transition: 'transform 0.3s ease' }} />
        </button>
      </div>

      {/* ── Flat nav ── */}
      <nav style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingTop: 8, paddingBottom: 8 }} aria-label="Main navigation">
        {navItems.map(renderItem)}
      </nav>

      {/* ── Footer ── */}
      <div style={{ flexShrink: 0, borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: 4, paddingBottom: 8 }}>
        {/* Logout */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', marginTop: 4, paddingTop: 4 }}>
          <Tooltip title={collapsed ? 'Sign Out' : ''} placement="right" mouseEnterDelay={0.5}>
            <button
              onClick={() => { onClose?.(); onLogout?.(); }}
              aria-label="Sign Out"
              style={{
                ...btnReset,
                display: 'flex', alignItems: 'center', gap: 12, width: '100%',
                paddingTop: 8, paddingBottom: 8,
                paddingLeft: collapsed ? 0 : 20, paddingRight: collapsed ? 0 : 16,
                justifyContent: collapsed ? 'center' : 'flex-start',
                color: 'rgba(239,68,68,0.6)', fontSize: 13, fontWeight: 400,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.08)'; e.currentTarget.style.color = '#EF4444'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(239,68,68,0.6)'; }}
            >
              <LogOut size={16} strokeWidth={1.5} style={{ flexShrink: 0 }} />
              {!collapsed && <span style={{ whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>Sign Out</span>}
            </button>
          </Tooltip>
        </div>
      </div>
    </div>
  );
};

// ─── Op History Footer ────────────────────────────────────────────────────────

const OpHistoryBar = () => {
  const [ops,      setOps]      = useState(() => getOps());
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const handler = () => setOps(getOps());
    window.addEventListener('vfo:op', handler);
    return () => window.removeEventListener('vfo:op', handler);
  }, []);

  if (ops.length === 0) return null;

  const statusColor = s => s === 'Success' ? '#10B981' : s === 'Failed' ? '#EF4444' : '#F59E0B';

  return (
    <div style={{ flexShrink: 0, borderTop: '1px solid #E2E8F0', background: '#F8FAFC', zIndex: 30 }}>
      {/* Collapsed bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10, width: '100%',
          padding: '5px 20px', border: 'none', background: 'transparent',
          cursor: 'pointer', outline: 'none',
        }}
      >
        <Wrench size={11} strokeWidth={1.5} style={{ color: '#00B5E2', flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
          Session Operations
        </span>
        <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 99, background: '#000048', color: 'white', fontWeight: 700 }}>
          {ops.length}
        </span>
        {!expanded && (
          <span style={{ fontSize: 10, color: '#94A3B8', marginLeft: 4, fontFamily: 'monospace' }}>
            Last: {ops[ops.length - 1]?.action} · {ops[ops.length - 1]?.target}
          </span>
        )}
        <ChevronDown
          size={11} strokeWidth={2}
          style={{ marginLeft: 'auto', color: '#94A3B8', transform: `rotate(${expanded ? 180 : 0}deg)`, transition: 'transform 0.2s' }}
        />
      </button>

      {/* Expanded list */}
      {expanded && (
        <div style={{ maxHeight: 160, overflowY: 'auto', borderTop: '1px solid #E2E8F0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 60px', gap: 8, padding: '6px 20px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0' }}>
            {['Time', 'Action', 'Target', 'Status'].map(h => (
              <span key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{h}</span>
            ))}
          </div>
          {[...ops].reverse().map((op, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 1fr 60px', gap: 8, padding: '5px 20px', borderBottom: '1px solid #F1F5F9', alignItems: 'center' }}>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8' }}>{op.time}</span>
              <span style={{ fontSize: 11, fontWeight: 600, color: '#101828' }}>{op.action}</span>
              <span style={{ fontSize: 11, color: '#64748B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.target}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: statusColor(op.status) }}>{op.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── AppShell ─────────────────────────────────────────────────────────────────

const AppShell = ({ onLogout, userRole }) => {
  const [selectedKey,  setSelectedKey]  = useState('8');
  const [navParams,    setNavParams]    = useState({});
  // tabState persists the active tab for each page key across tenant/env switches
  const [tabState,     setTabState]     = useState({});
  const [isMobile,     setIsMobile]     = useState(false);
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [helpOpen,     setHelpOpen]     = useState(false);
  // Subscribes to the shared onboardingStore (a plain module, not a component) so
  // the badge count is always live — independent of whether the Onboarding page
  // has ever been visited. The store itself starts fetching/polling the moment
  // it's imported, decoupled from any page's mount/unmount lifecycle.
  const onboardingRequests = useSyncExternalStore(subscribeOnboarding, getOnboardingRequestsSnapshot);
  const onboardingCount = onboardingRequests.length;
  const { env, setEnv } = useEnvironment();
  const { tenant, setTenantId } = useTenant();
  const mainRef = useRef(null);
  const username = localStorage.getItem('username') || 'User';

  // Called by pages when user manually switches a tab — persists tab so it
  // survives the page remount triggered by tenant/env changes.
  const handleTabChange = useCallback((tab) => {
    setTabState(s => ({ ...s, [selectedKey]: tab }));
  }, [selectedKey]);
  
   
  // Merge stored tab into navParams: stored tab wins over stale navParams.tab
  // because the user's last manual selection should be respected on remount.
  const effectiveNavParams = useMemo(() => ({
    ...navParams,
    tab: tabState[selectedKey] ?? navParams?.tab,
  }), [navParams, selectedKey, tabState]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const handler = () => handleLogout();
    window.addEventListener('vfo:logout', handler);
    return () => window.removeEventListener('vfo:logout', handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLogout = () => { setSelectedKey('8'); setNavParams({}); onLogout(); };

  const KEY_REDIRECT = { '9': '1', '11': '2', '6': '4', '10': '7' };
  const TAB_REDIRECT = {
    '9':  { 'eval-runs': 'evaluations', benchmarks: 'evaluations', benchmarking: 'evaluations',
            datasets: 'evaluations', playground: 'evaluations', 'auto-eval': 'evaluations',
            'datasets-playground': 'evaluations' },
    '11': { mesh: 'troubleshoot', workflows: 'troubleshoot', comms: 'troubleshoot', 'multi-agent-mesh': 'troubleshoot' },
    '6':  { _default: 'platform-config' },
    '10': { agents: 'fleet', deployments: 'fleet', routing: 'fleet', _default: 'fleet' },
  };
  // Tabs that have moved from Admin (key '4') to Insights (key '1')
  // feedback-rlhf is now the Quality & Feedback tab in Insights
  const MOVED_TO_INSIGHTS = { 'feedback-rlhf': 'safety' };
  const handleNavigate = (key, params = {}) => {
    // Handle tabs moved from Admin → Insights
    if (key === '4' && params.tab && MOVED_TO_INSIGHTS[params.tab]) {
      const resolvedTab = MOVED_TO_INSIGHTS[params.tab];
      setSelectedKey('1');
      setNavParams({ ...params, tab: resolvedTab });
      // Deep-link navigation overrides the stored tab for this page
      if (resolvedTab) setTabState(s => ({ ...s, '1': resolvedTab }));
      return;
    }
    const newKey = KEY_REDIRECT[key] ?? key;
    const tabMap = TAB_REDIRECT[key] || {};
    const newTab = (params.tab && tabMap[params.tab]) || tabMap._default || params.tab;
    setSelectedKey(newKey);
    setNavParams(newTab ? { ...params, tab: newTab } : params);
    // Deep-link navigation overrides the stored tab for the destination page
    if (newTab) setTabState(s => ({ ...s, [newKey]: newTab }));
  };

  const currentLabel = PAGE_LABELS[selectedKey] ?? '';

  const pageContent = (() => {
    const np = effectiveNavParams;
    const otc = handleTabChange;
    if (selectedKey === '8')  return <CommandCentre         navParams={np} onNavigate={handleNavigate} onTabChange={otc} />;
    if (selectedKey === '1')  return <AgentInsights         navParams={np} onNavigate={handleNavigate} onTabChange={otc} userRole={userRole} />;
    if (selectedKey === '2')  return <AgentOpsWorkbench     navParams={np} onNavigate={handleNavigate} onTabChange={otc} userRole={userRole} />;
    if (selectedKey === '4')  return <OperatorWorkbench     navParams={np} onNavigate={handleNavigate} onTabChange={otc} userRole={userRole} />;
    if (selectedKey === '5')  return <ComplianceReports />;
    if (selectedKey === '7')  return <Failsafe              navParams={np} onNavigate={handleNavigate} onTabChange={otc} userRole={userRole} />;
    if (selectedKey === '12') return <Cost                  navParams={np} onNavigate={handleNavigate} onTabChange={otc} />;
    if (selectedKey === '3')  return <Onboarding navParams={np} onNavigate={handleNavigate} onTabChange={otc} />;

    return <CommandCentre navParams={np} onNavigate={handleNavigate} onTabChange={otc} />;
  })();

  const sidebarWidth = isMobile ? 0 : (navCollapsed ? 56 : 200);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#F8F9FB' }}>

      {/* Desktop sidebar */}
      {!isMobile && (
        <aside
          className="flex flex-col flex-shrink-0 overflow-hidden"
          style={{ width: sidebarWidth, transition: 'width 0.3s ease-in-out', borderRight: '1px solid #E2E8F0' }}
          aria-label="Sidebar"
        >
          <SidebarContent
            selectedKey={selectedKey}
            onNavigate={handleNavigate}
            userRole={userRole}
            collapsed={navCollapsed}
            setCollapsed={setNavCollapsed}
            onLogout={handleLogout}
            badges={{ '3': onboardingCount }}
          />
        </aside>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          width={200}
          styles={{ body: { padding: 0, background: '#000048' }, header: { display: 'none' } }}
        >
          <SidebarContent
            selectedKey={selectedKey}
            onNavigate={handleNavigate}
            userRole={userRole}
            collapsed={false}
            onClose={() => setDrawerOpen(false)}
            onLogout={handleLogout}
            badges={{ '3': onboardingCount }}
          />
        </Drawer>
      )}

      {/* Main column */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">

        {/* Top bar */}
        <header
          className="flex-shrink-0 bg-white flex items-center justify-between gap-4 px-6"
          style={{
            height: 48,
            borderBottom: '2px solid #6366F1',
            boxShadow: '0 1px 12px rgba(99,102,241,0.12)',
            position: 'sticky', top: 0, zIndex: 40,
            transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
          }}
        >
          {/* Left: mobile toggle + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0 flex-shrink">
            {isMobile && (
              <button
                onClick={() => setDrawerOpen(true)}
                style={{ border: 'none', outline: 'none', background: 'transparent', cursor: 'pointer', padding: 6, borderRadius: 6, color: '#667085' }}
                aria-label="Open navigation"
              >
                <Menu size={18} strokeWidth={1.5} />
              </button>
            )}
            <nav className="flex items-center gap-1" aria-label="Breadcrumb">
              <span style={{ fontSize: 12, color: '#94A3B8' }}>VeriForge Ops</span>
              <ChevronRight size={10} strokeWidth={1.5} style={{ color: '#CBD5E1' }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{currentLabel}</span>
            </nav>
          </div>

          {/* Center: command palette + live indicator */}
          <div className="flex-1 items-center gap-4 justify-center hidden sm:flex" style={{ maxWidth: 480 }}>
            <GlobalSearch onNavigate={handleNavigate} />
          </div>

          {/* Right: action cluster */}
          <div className="flex items-center gap-1 min-w-0">
            {/* Tenant switcher */}
            {isFeatureEnabled('shell.tenantSwitcher') && (() => {
              const tenantMeta = TENANT_OPTIONS.find(o => o.id === tenant.id) || TENANT_OPTIONS[0];
              return (
                <Select
                  value={tenant.id}
                  onChange={setTenantId}
                  size="small"
                  variant="borderless"
                  style={{ width: 160 }}
                  popupMatchSelectWidth={false}
                  optionRender={option => {
                    const meta = TENANT_OPTIONS.find(o => o.id === option.value);
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta?.color, flexShrink: 0, display: 'inline-block' }} />
                        {option.label}
                      </span>
                    );
                  }}
                  labelRender={() => (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: tenantMeta.color }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: tenantMeta.color, display: 'inline-block', flexShrink: 0 }} />
                      {tenantMeta.name}
                    </span>
                  )}
                  options={TENANT_OPTIONS.map(o => ({ value: o.id, label: o.name }))}
                />
              );
            })()}
            {/* Divider between tenant and env switchers */}
            {isFeatureEnabled('shell.tenantSwitcher') && (
              <span style={{ width: 1, height: 16, background: '#E2E8F0', flexShrink: 0, margin: '0 2px' }} />
            )}
            {/* Environment switcher */}
            {(() => {
              const envMeta = ENV_OPTIONS.find(o => o.value === env) || ENV_OPTIONS[0];
              return (
                <Select
                  value={env}
                  onChange={setEnv}
                  size="small"
                  variant="borderless"
                  style={{ width: 130 }}
                  popupMatchSelectWidth={false}
                  optionRender={option => {
                    const meta = ENV_OPTIONS.find(o => o.value === option.value);
                    return (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: meta?.color, flexShrink: 0, display: 'inline-block' }} />
                        {option.label}
                      </span>
                    );
                  }}
                  labelRender={() => (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: envMeta.color }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: envMeta.color, display: 'inline-block', flexShrink: 0 }} />
                      {envMeta.label}
                    </span>
                  )}
                  options={ENV_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
                />
              );
            })()}
            <NotificationBell onNavigate={handleNavigate} />
            <button
              onClick={() => setHelpOpen(o => !o)}
              aria-label="Toggle help panel"
              aria-pressed={helpOpen}
              style={{
                border: 'none', outline: 'none', cursor: 'pointer',
                padding: '6px 7px', borderRadius: 8,
                color:      helpOpen ? '#000048' : '#667085',
                background: helpOpen ? 'rgba(0,0,72,0.06)' : 'transparent',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
              onMouseEnter={e => { if (!helpOpen) e.currentTarget.style.background = '#F1F5F9'; }}
              onMouseLeave={e => { if (!helpOpen) e.currentTarget.style.background = 'transparent'; }}
            >
              <HelpCircle size={16} strokeWidth={1.5} />
            </button>
            <ProfileDropdown username={username} userRole={userRole} onLogout={handleLogout} onNavigate={handleNavigate} />
          </div>
        </header>

        {/* Content row: page + optional help panel */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          <main ref={mainRef} className="flex-1 overflow-y-auto" style={{ background: '#F8F9FB' }}>
            <div
              key={`${selectedKey}-${tenant.id}-${env}`}
              className="vfo-page-enter mx-auto"
              style={{ maxWidth: 1600 }}
            >
              <Suspense fallback={
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 200 }}>
                  <Spin size="large" />
                </div>
              }>
                {pageContent}
              </Suspense>
            </div>
          </main>
          {helpOpen && (
            <HelpPanel selectedKey={selectedKey} onClose={() => setHelpOpen(false)} />
          )}
        </div>

        {/* Op History footer */}
        <OpHistoryBar />

      </div>
      <ScrollToTop scrollContainer={mainRef} />
    </div>
  );
};

export default AppShell;

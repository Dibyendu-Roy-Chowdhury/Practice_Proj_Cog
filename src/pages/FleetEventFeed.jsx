/**
 * FleetEventFeed — curated fleet-wide event timeline for Insights › Fleet Events tab.
 *
 * NOT a raw log stream. This is a processed, categorised feed that aggregates
 * significant events from Alerts, Anomalies, HITL Decisions, and Self-Healing
 * Actions. Each event links to Workbench Troubleshooting for deep investigation.
 *
 * Scope: FLEET-WIDE (all agents). Single-agent raw logs live in Workbench.
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Select, Spin } from 'antd';
import {
  AlertTriangle, Zap, UserCheck, Wrench, Rocket, ShieldAlert, ExternalLink,
} from 'lucide-react';
import {
  getCriticalAlerts, getWarningAlerts, getAnomalyFeed, getHitlHistory, getInterventionLog,
  getAgentsSync,
} from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';

// ─── Category metadata ────────────────────────────────────────────────────────

const CAT_META = {
  Alert:         { color: '#B42318', bg: '#FEF3F2', border: '#FECDCA', Icon: AlertTriangle,  label: 'Alert'        },
  Anomaly:       { color: '#B54708', bg: '#FFFAEB', border: '#FEF0C7', Icon: Zap,            label: 'Anomaly'      },
  'HITL Decision':{ color: '#6941C6', bg: '#F9F5FF', border: '#E9D7FE', Icon: UserCheck,     label: 'HITL Decision'},
  'Self-Healing': { color: '#027A48', bg: '#ECFDF3', border: '#A9EFC5', Icon: Wrench,        label: 'Self-Healing' },
  Deployment:    { color: '#026AA2', bg: '#F0F9FF', border: '#B9E6FE', Icon: Rocket,         label: 'Deployment'   },
};

const SEVERITY_BADGE = {
  P1: { bg: '#FEF3F2', color: '#B42318', label: 'P1 Critical' },
  P2: { bg: '#FFFAEB', color: '#B54708', label: 'P2 Warning'  },
  P3: { bg: '#F0F9FF', color: '#026AA2', label: 'P3 Info'     },
};

// Palette-based agent color — deterministic hash from name, no hardcoded agent names.
const _PALETTE = ['#000048', '#7C3AED', '#F59E0B', '#10B981', '#0369A1', '#EF4444'];
const agentColorFor = (name) => {
  if (!name) return '#64748B';
  const hash = [...name].reduce((h, c) => h + c.charCodeAt(0), 0);
  return _PALETTE[hash % _PALETTE.length];
};

const FILTER_CATEGORIES = ['All', 'Alert', 'Anomaly', 'HITL Decision', 'Self-Healing'];

// ─── Normalise each data source into a unified event shape ───────────────────

function capitalise(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function fromCriticalAlerts(alerts) {
  return (alerts || [])
    .filter(a => a.agentName || a.agentId || a.agent_id || a.agent)
    .map(a => ({
      id:       a.id,
      agent:    a.agentName || capitalise(a.agentId || a.agent_id || a.agent),
      time:     a.timestamp || a.time,
      type:     'Alert',
      severity: a.severity || 'P2',
      summary:  a.message || a.msg,
      sortKey:  0,
    }));
}

function fromWarningAlerts(alerts) {
  return (alerts || [])
    .filter(a => a.agentName || a.agentId || a.agent_id || a.agent)
    .map(a => ({
      id:       a.id,
      agent:    a.agentName || capitalise(a.agentId || a.agent_id || a.agent),
      time:     a.timestamp || a.time,
      type:     'Alert',
      severity: a.severity || 'P3',
      summary:  a.message || a.msg,
      sortKey:  1,
    }));
}

function fromAnomalyFeed(anomalies) {
  return (anomalies || []).map(a => ({
    id:       a.id,
    agent:    a.agent,
    time:     a.timestamp,
    type:     'Anomaly',
    severity: a.score >= 80 ? 'P1' : a.score >= 60 ? 'P2' : 'P3',
    summary:  `${a.category} — score ${a.score}/100 — ${a.action}`,
    sortKey:  2,
  }));
}

function fromHitlHistory(history) {
  return (history || []).map((h, i) => ({
    id:       `HITL-H-${i}`,
    agent:    h.agent,
    time:     h.time,
    type:     'HITL Decision',
    severity: h.decision === 'Rejected' ? 'P2' : 'P3',
    summary:  `${h.tool} — ${h.decision} by ${h.by}`,
    sortKey:  3,
  }));
}

function fromInterventionLog(log) {
  if (!Array.isArray(log)) return [];
  return log.map((item, i) => ({
    id:       item.id || `SH-${i}`,
    agent:    item.agent || item.agentName || 'System',
    time:     item.time || item.timestamp || item.at || 'Recently',
    type:     'Self-Healing',
    severity: 'P3',
    summary:  item.action || item.description || item.rule || 'Self-healing action applied',
    sortKey:  4,
  }));
}

// ─── Event Row ───────────────────────────────────────────────────────────────

const EventRow = ({ event, onNavigate }) => {
  const cat  = CAT_META[event.type] || CAT_META.Alert;
  const sev  = SEVERITY_BADGE[event.severity] || SEVERITY_BADGE.P3;
  const Icon = cat.Icon;
  const agentColor = agentColorFor(event.agent);

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '12px 16px',
      borderBottom: '1px solid #F2F4F7',
      transition: 'background 0.1s',
    }}
    onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Category icon */}
      <div style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
        background: cat.bg, border: `1px solid ${cat.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        <Icon size={14} strokeWidth={1.5} style={{ color: cat.color }} />
      </div>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 3 }}>
          {/* Agent badge */}
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '1px 8px', borderRadius: 99,
            background: `${agentColor}18`, color: agentColor,
          }}>
            {event.agent}
          </span>

          {/* Category badge */}
          <span style={{
            fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
            background: cat.bg, color: cat.color, border: `1px solid ${cat.border}`,
          }}>
            {cat.label}
          </span>

          {/* Severity */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
            background: sev.bg, color: sev.color,
          }}>
            {sev.label}
          </span>
        </div>

        {/* Summary */}
        <p style={{ margin: '0 0 3px', fontSize: 12, color: '#344054', lineHeight: 1.5, wordBreak: 'break-word' }}>
          {event.summary}
        </p>

        {/* Timestamp */}
        <span style={{ fontSize: 11, color: '#98A2B3' }}>{event.time}</span>
      </div>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, marginTop: 4 }}>
        <button
          onClick={() => onNavigate?.('2', { tab: 'troubleshoot', agentId: event.agent })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
            background: '#000048', color: '#fff', border: 'none',
            fontSize: 11, fontWeight: 600, transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.8'; }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}
          title={`Investigate ${event.agent} in Workbench`}
        >
          <ExternalLink size={11} strokeWidth={1.5} />
          Investigate
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FleetEventFeed({ onNavigate }) {
  const { tenant } = useTenant();
  const [events,     setEvents]     = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [catFilter,  setCat]        = useState('All');
  const [agentFilter,setAgent]      = useState('All');

  // Derive agent filter options from the current tenant/env — no hardcoded names.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const AGENTS = useMemo(() => ['All', ...getAgentsSync().map(a => a.name)], [tenant.id]);

  useEffect(() => {
    setLoading(true);
    setAgent('All');
    Promise.allSettled([
      getCriticalAlerts(),
      getWarningAlerts(),
      getAnomalyFeed(),
      getHitlHistory(),
      getInterventionLog(),
    ]).then(([crits, warns, anoms, hitl, interventions]) => {
      const merged = [
        ...fromCriticalAlerts(crits.value?.alerts || []),
        ...fromWarningAlerts(warns.value?.alerts   || []),
        ...fromAnomalyFeed(Array.isArray(anoms.value) ? anoms.value : (anoms.value?.anomalies || [])),
        ...fromHitlHistory(Array.isArray(hitl.value) ? hitl.value : (hitl.value?.history || [])),
        ...fromInterventionLog(interventions.value?.log || interventions.value || []),
      ].sort((a, b) => a.sortKey - b.sortKey);
      setEvents(merged);
    }).finally(() => setLoading(false));
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    return events.filter(e => {
      const catOk   = catFilter   === 'All' || e.type === catFilter;
      const agentOk = agentFilter === 'All' || e.agent === agentFilter;
      return catOk && agentOk;
    });
  }, [events, catFilter, agentFilter]);

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 16px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC',
      }}>
        {/* Category filter pills */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {FILTER_CATEGORIES.map(c => {
            const active = catFilter === c;
            const meta = CAT_META[c];
            return (
              <button
                key={c}
                onClick={() => setCat(c)}
                style={{
                  padding: '4px 12px', borderRadius: 99, border: `1px solid ${active ? (meta?.border || '#CBD5E1') : '#E2E8F0'}`,
                  background: active ? (meta?.bg || '#F1F5F9') : '#fff',
                  color: active ? (meta?.color || '#344054') : '#64748B',
                  fontSize: 12, fontWeight: active ? 700 : 500, cursor: 'pointer', outline: 'none',
                  transition: 'all 0.1s',
                }}
              >
                {c}
              </button>
            );
          })}
        </div>

        {/* Agent dropdown */}
        <Select
          size="small"
          value={agentFilter}
          onChange={setAgent}
          style={{ minWidth: 130, marginLeft: 'auto' }}
          options={AGENTS.map(a => ({ value: a, label: a === 'All' ? 'All Agents' : a }))}
        />
      </div>

      {/* Event list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <ShieldAlert size={28} strokeWidth={1.5} style={{ color: '#CBD5E1', marginBottom: 12 }} />
          <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>No events match the selected filters.</p>
        </div>
      ) : (
        <div>
          {filtered.map(e => (
            <EventRow key={e.id} event={e} onNavigate={onNavigate} />
          ))}
        </div>
      )}

      {/* Footer count */}
      {!loading && filtered.length > 0 && (
        <div style={{ padding: '8px 16px', borderTop: '1px solid #F2F4F7', background: '#F8FAFC' }}>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            Showing {filtered.length} of {events.length} fleet events
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * InvestigationContext — contextual intelligence panel for Workbench › Troubleshooting.
 *
 * Shown beside the raw log stream to enrich the investigation experience.
 * Surfaces: agent quick profile, related alerts, recent HITL decisions,
 * and suggested runbooks based on active alert categories.
 *
 * This panel is what makes Workbench Troubleshooting fundamentally different
 * from Insights Fleet Events — it's a focused, agent-specific context overlay.
 */

import React, { useState, useEffect } from 'react';
import { Spin, Tag } from 'antd';
import {
  Bot, AlertTriangle, UserCheck, BookOpen, ExternalLink, ChevronRight,
} from 'lucide-react';
import {
  getAgents, getCriticalAlerts, getWarningAlerts, getHitlHistory,
} from '../services/API_services';

// ─── Runbook suggestion rules ─────────────────────────────────────────────────
// Maps alert category keywords → suggested runbook IDs + labels

const RUNBOOK_SUGGESTIONS = [
  { keyword: 'Loop',         id: 'react-loop-response',    label: 'ReAct Loop Response'          },
  { keyword: 'Latency',      id: 'high-latency',           label: 'High Latency Remediation'     },
  { keyword: 'Provider',     id: 'provider-failover',      label: 'Provider Failover'            },
  { keyword: 'Memory',       id: 'memory-pressure',        label: 'Memory Pressure Recovery'     },
  { keyword: 'Orchestration',id: 'orchestration-failure',  label: 'Orchestration Failure'        },
  { keyword: 'Eval',         id: 'eval-gate-failure',      label: 'Eval Gate Failure Recovery'   },
  { keyword: 'Embedding',    id: 'model-drift-response',   label: 'Model Drift Response'         },
  { keyword: 'RAG',          id: 'rag-retrieval-failure',  label: 'RAG Retrieval Failure'        },
  { keyword: 'Hallucination',id: 'hallucination-response', label: 'Hallucination Response'       },
  { keyword: 'Token',        id: 'context-overflow',       label: 'Token / Context Overflow'     },
  { keyword: 'Guardrail',    id: 'guardrail-tuning',       label: 'Guardrail Tuning'             },
  { keyword: 'Feedback',     id: 'feedback-spike',         label: 'Negative Feedback Spike'      },
];

function suggestRunbooks(alerts) {
  const seen = new Set();
  const recs  = [];
  for (const alert of alerts) {
    const text = `${alert.msg || alert.summary || alert.category || ''}`;
    for (const rule of RUNBOOK_SUGGESTIONS) {
      if (!seen.has(rule.id) && text.includes(rule.keyword)) {
        seen.add(rule.id);
        recs.push(rule);
      }
    }
    if (recs.length >= 3) break;
  }
  // Always suggest at least one generic runbook
  if (recs.length === 0) recs.push({ id: 'agent-health-check', label: 'Agent Health Check' });
  return recs;
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

const Section = ({ title, icon: Icon, children, accent = '#000048' }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6,
      padding: '6px 12px', background: '#F8FAFC',
      borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0',
    }}>
      <Icon size={11} strokeWidth={1.5} style={{ color: accent }} />
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748B' }}>
        {title}
      </span>
    </div>
    <div style={{ padding: '8px 12px' }}>{children}</div>
  </div>
);

// ─── Alert row ────────────────────────────────────────────────────────────────

const AlertRow = ({ alert }) => {
  const isP1 = alert.severity === 'P1';
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8,
      padding: '8px 10px', borderRadius: 6,
      background: isP1 ? '#FEF3F2' : '#FFFAEB',
      border: `1px solid ${isP1 ? '#FECDCA' : '#FEF0C7'}`,
    }}>
      <AlertTriangle size={12} strokeWidth={1.5} style={{ color: isP1 ? '#B42318' : '#B54708', flexShrink: 0, marginTop: 1 }} />
      <div>
        <p style={{ margin: '0 0 2px', fontSize: 11, color: isP1 ? '#7A271A' : '#7A3B10', lineHeight: 1.4 }}>{alert.msg}</p>
        <span style={{ fontSize: 10, color: '#98A2B3' }}>{alert.time}</span>
      </div>
    </div>
  );
};

// ─── HITL row ─────────────────────────────────────────────────────────────────

const HitlRow = ({ item }) => {
  const approved = item.decision === 'Approved';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '7px 0', borderBottom: '1px solid #F2F4F7',
    }}>
      <div>
        <p style={{ margin: 0, fontSize: 11, color: '#344054', fontWeight: 500 }}>{item.tool}</p>
        <span style={{ fontSize: 10, color: '#98A2B3' }}>{item.time} · {item.by}</span>
      </div>
      <Tag style={{
        fontSize: 10, fontWeight: 700, margin: 0,
        background: approved ? '#ECFDF3' : '#FEF3F2',
        color: approved ? '#027A48' : '#B42318',
        border: 'none',
      }}>
        {item.decision}
      </Tag>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function InvestigationContext({ agentId, onNavigate }) {
  const [agent,    setAgent]    = useState(null);
  const [alerts,   setAlerts]   = useState([]);
  const [hitl,     setHitl]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!agentId) { setLoading(false); return; }
    setLoading(true);
    Promise.allSettled([
      getAgents(),
      getCriticalAlerts(agentId),
      getWarningAlerts(agentId),
      getHitlHistory(),
    ]).then(([agents, crits, warns, hitlHistory]) => {
      // Agent profile
      const allAgents = agents.value?.agents || [];
      const found = allAgents.find(a =>
        a.name?.toLowerCase() === agentId.toLowerCase() ||
        a.id?.toLowerCase()   === agentId.toLowerCase()
      );
      setAgent(found || { name: agentId, status: 'Unknown' });

      // Alerts for this agent
      const critList = crits.value?.alerts || [];
      const warnList = warns.value?.alerts || [];
      setAlerts([...critList, ...warnList].slice(0, 5));

      // HITL history filtered to this agent
      const allHitl = Array.isArray(hitlHistory.value)
        ? hitlHistory.value
        : (hitlHistory.value?.history || []);
      setHitl(allHitl.filter(h => h.agent?.toLowerCase() === agentId.toLowerCase()).slice(0, 3));
    }).finally(() => setLoading(false));
  }, [agentId]);

  const runbooks = suggestRunbooks(alerts);

  if (!agentId) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32, textAlign: 'center' }}>
      <Bot size={32} strokeWidth={1.5} style={{ color: '#CBD5E1', marginBottom: 12 }} />
      <p style={{ margin: 0, fontSize: 13, color: '#94A3B8' }}>Select an agent to see investigation context.</p>
    </div>
  );

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
      <Spin />
    </div>
  );

  return (
    <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, overflow: 'hidden', height: '100%' }}>
      {/* Agent Quick Profile */}
      <Section title="Agent Profile" icon={Bot} accent="#000048">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{agent?.name || agentId}</span>
            <Tag style={{
              fontSize: 10, fontWeight: 700, margin: 0,
              background: agent?.status === 'Active' ? '#ECFDF3' : '#FEF3F2',
              color: agent?.status === 'Active' ? '#027A48' : '#B42318',
              border: 'none',
            }}>
              {agent?.status || 'Unknown'}
            </Tag>
          </div>
          {agent?.model && (
            <span style={{ fontSize: 11, color: '#64748B' }}>Model: {agent.model}</span>
          )}
          {agent?.provider && (
            <span style={{ fontSize: 11, color: '#64748B' }}>Provider: {agent.provider}</span>
          )}
          <button
            onClick={() => onNavigate?.('7', { tab: 'fleet', agentId })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4,
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              fontSize: 11, color: '#000048', fontWeight: 600,
            }}
          >
            View Full Config <ChevronRight size={11} strokeWidth={1.5} />
          </button>
        </div>
      </Section>

      {/* Related Alerts */}
      <Section title="Active Alerts" icon={AlertTriangle} accent="#B42318">
        {alerts.length === 0 ? (
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>
            No active alerts for {agentId}
          </p>
        ) : (
          alerts.map(a => <AlertRow key={a.id} alert={a} />)
        )}
      </Section>

      {/* Recent HITL Decisions */}
      <Section title="Recent HITL Decisions" icon={UserCheck} accent="#6941C6">
        {hitl.length === 0 ? (
          <p style={{ margin: 0, fontSize: 11, color: '#94A3B8', textAlign: 'center', padding: '8px 0' }}>
            No recent HITL decisions for {agentId}
          </p>
        ) : (
          hitl.map((h, i) => <HitlRow key={h.id || h.time || i} item={h} />)
        )}
        <button
          onClick={() => onNavigate?.('2', { tab: 'overrides' })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8,
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            fontSize: 11, color: '#6941C6', fontWeight: 600,
          }}
        >
          Open HITL Console <ChevronRight size={11} strokeWidth={1.5} />
        </button>
      </Section>

      {/* Suggested Runbooks */}
      <Section title="Suggested Runbooks" icon={BookOpen} accent="#026AA2">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {runbooks.map(r => (
            <button
              key={r.id}
              onClick={() => onNavigate?.('2', { tab: 'runbooks', runbookId: r.id })}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                background: '#F0F9FF', border: '1px solid #B9E6FE',
                color: '#026AA2', fontSize: 11, fontWeight: 600, width: '100%',
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E0F2FE'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F0F9FF'; }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={11} strokeWidth={1.5} />
                {r.label}
              </span>
              <ExternalLink size={10} strokeWidth={1.5} />
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

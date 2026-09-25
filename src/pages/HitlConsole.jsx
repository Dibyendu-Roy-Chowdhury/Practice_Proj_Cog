import React, { useState, useEffect, useRef } from 'react';
import { Spin, Select, Button, message, Table, Tooltip } from 'antd';
import MetricCard from '../components/common/MetricCard';
import { getHitlQueue, getHitlHistory, getAgentsSync } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';

const { Option } = Select;

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>
);

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const RISK_COLORS = { Critical: '#EF4444', High: '#F59E0B', Medium: '#0BA5EC', Low: '#10B981' };
const RISK_BG     = { Critical: '#FEF3F2', High: '#FFFAEB', Medium: '#E0F2FE', Low: '#ECFDF3' };

// SLA budget in ms per risk tier
const SLA_MS = { Critical: 3 * 60_000, High: 5 * 60_000, Medium: 15 * 60_000, Low: 30 * 60_000 };

const formatElapsed = (ms) => {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
};

const formatCountdown = (ms) => {
  if (ms <= 0) return 'BREACHED';
  const s = Math.ceil(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

// Circular SVG countdown ring (r=14, circumference≈88)
const SlaRing = ({ remaining, total }) => {
  const pct    = Math.max(0, Math.min(1, remaining / total));
  const C      = 88;
  const dash   = pct * C;
  const color  = pct > 0.5 ? '#10B981' : pct > 0.2 ? '#F59E0B' : '#EF4444';
  const breached = remaining <= 0;
  return (
    <div style={{ position: 'relative', width: 40, height: 40, flexShrink: 0 }}>
      <svg width="40" height="40" viewBox="0 0 40 40" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="20" cy="20" r="14" fill="none" stroke="#E2E8F0" strokeWidth="3" />
        <circle cx="20" cy="20" r="14" fill="none" stroke={breached ? '#EF4444' : color}
          strokeWidth="3" strokeLinecap="round"
          strokeDasharray={`${dash} ${C}`} style={{ transition: 'stroke-dasharray 1s linear, stroke 0.5s' }} />
      </svg>
      <span style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        fontSize: breached ? 7 : 8, fontWeight: 700, fontFamily: 'monospace',
        color: breached ? '#EF4444' : color, whiteSpace: 'nowrap',
      }}>
        {breached ? '!' : formatCountdown(remaining)}
      </span>
    </div>
  );
};


const DEFAULT_THRESHOLDS = { risk: 'High', cost: '$0.50', loop: '3 loops', esc: 'L2' };
// Derive threshold agent names from SSOT — takes first 2 agents of current tenant/env.
const getThresholdAgents = () => getAgentsSync().slice(0, 2).map(a => a.name);
const initThresholds = () => Object.fromEntries(getThresholdAgents().map(a => [a, { ...DEFAULT_THRESHOLDS }]));

const HITL_COST_SEED = [0.0, 0.004, 0.011, 0.0, 0.018, 0.007, 0.0, 0.022, 0.009, 0.015];
const hitlCost = (idx) => HITL_COST_SEED[idx % HITL_COST_SEED.length];

const historyColumns = [
  { title: 'Timestamp', dataIndex: 'time',     key: 'time',     width: 110, render: v => <span style={{ fontFamily: 'monospace', fontSize: 11 }}>{v}</span> },
  { title: 'Agent',     dataIndex: 'agent',    key: 'agent',    width: 110 },
  { title: 'Protocol',  dataIndex: 'tool',     key: 'tool',     width: 120, render: v => <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#64748B' }}>{v}</span> },
  {
    title: 'Decision', dataIndex: 'decision', key: 'decision', width: 90,
    render: v => (
      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
        background: v === 'Approved' ? '#ECFDF3' : '#FEF3F2',
        color: v === 'Approved' ? '#10B981' : '#EF4444' }}>{v}</span>
    ),
  },
  { title: 'Authorized By', dataIndex: 'by',   key: 'by',       width: 120, render: v => <span style={{ fontSize: 11, color: '#64748B' }}>{v}</span> },
  {
    title: 'Auth Cost', key: 'cost', width: 80,
    render: (_, _r, idx) => {
      const c = hitlCost(idx);
      return <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: c > 0 ? '#475467' : '#CBD5E1' }}>{c > 0 ? `$${c.toFixed(3)}` : '—'}</span>;
    },
  },
];

export default function HitlConsole({ userRole }) {
  const { tenant } = useTenant();
  const [queue, setQueue]             = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [dismissed, setDismissed]     = useState(() => {
    try { const s = localStorage.getItem('vf_hitl_dismissed'); return s ? JSON.parse(s) : []; }
    catch { return []; }
  });
  const [thresholds, setThresholds]   = useState(initThresholds);
  const [saved,      setSaved]        = useState(initThresholds);
  const [tick,       setTick]         = useState(0);    // drives countdown re-renders
  const alerted = useRef(new Set());                    // tracks which items already fired a breach toast

  useEffect(() => {
    setLoading(true);
    setThresholds(initThresholds());
    setSaved(initThresholds());
    Promise.all([getHitlQueue(), getHitlHistory()])
      .then(([q, h]) => { setQueue(q); setHistoryRows(h); })
      .finally(() => setLoading(false));
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live 1-second ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Breach detection — fires once per item when remaining time hits zero
  useEffect(() => {
    queue.filter(q => !dismissed.includes(q.id)).forEach(item => {
      const sla       = SLA_MS[item.risk] || SLA_MS.High;
      const remaining = sla - item.waitMs - tick * 1000;
      if (remaining <= 0 && !alerted.current.has(item.id)) {
        alerted.current.add(item.id);
        message.error({
          content: `SLA BREACH — ${item.id} (${item.risk}): ${item.agent} exceeded the ${formatElapsed(sla)} response window. Auto-escalating to L2.`,
          duration: 8,
          key: `sla-${item.id}`,
        });
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, slaBreached: true } : q));
      }
    });
  }, [tick, queue, dismissed]);

  const handleApprove = (id) => {
    message.success('Protocol authorised — decision committed to Immutable Audit Trail');
    setDismissed(prev => {
      const next = [...prev, id];
      try { localStorage.setItem('vf_hitl_dismissed', JSON.stringify(next)); } catch {}
      return next;
    });
  };
  const handleReject = (id) => {
    message.error('Protocol denied — agent execution suspended pending review');
    setDismissed(prev => {
      const next = [...prev, id];
      try { localStorage.setItem('vf_hitl_dismissed', JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const setAgentThreshold = (agent, field, val) => {
    setThresholds(prev => ({ ...prev, [agent]: { ...prev[agent], [field]: val } }));
  };

  const isDirty = (agent) =>
    JSON.stringify(thresholds[agent]) !== JSON.stringify(saved[agent]);

  const saveThresholds = (agent) => {
    setSaved(prev => {
      const next = { ...prev, [agent]: { ...thresholds[agent] } };
      try { localStorage.setItem('vf_hitl_thresholds', JSON.stringify(next)); } catch {}
      return next;
    });
    message.success(`Risk policy committed for ${agent}`);
  };

  return (
    <div>
      <div className="grid grid-cols-4 gap-4 mb-4">
        <MetricCard label="Pending Approvals"  value={String(queue.filter(q => !dismissed.includes(q.id)).length)} />
        <MetricCard label="Avg Wait Time"      value="4m 32s" />
        <MetricCard label="Auto-Resolved (1h)" value="47"    />
        <MetricCard label="Escalated"          value="2"     />
      </div>

      {/* Approval Queue */}
      <div style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <SH title="Approval Queue" />
        </div>
        {loading ? <Spin /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {queue.filter(q => !dismissed.includes(q.id)).map(item => {
              const sla       = SLA_MS[item.risk] || SLA_MS.High;
              const remaining = sla - item.waitMs - tick * 1000;
              const pct       = Math.max(0, remaining / sla);
              const borderColor = item.slaBreached ? '#EF4444' : pct < 0.2 ? '#F59E0B' : '#E2E8F0';
              return (
              <div key={item.id} style={{ border: `1px solid ${borderColor}`, borderRadius: 6, padding: 16, transition: 'border-color 0.5s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <SlaRing remaining={remaining} total={sla} />
                  <span style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#64748B' }}>{item.id}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: RISK_BG[item.risk] || '#F8FAFC', color: RISK_COLORS[item.risk] || '#64748B' }}>
                    {item.risk}
                  </span>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>Elapsed: {formatElapsed(item.waitMs + tick * 1000)}</div>
                    <div style={{ fontSize: 10, fontWeight: 700, fontFamily: 'monospace', color: remaining <= 0 ? '#EF4444' : pct < 0.2 ? '#F59E0B' : '#94A3B8' }}>
                      SLA: {remaining <= 0 ? 'BREACHED' : `${formatCountdown(remaining)} left`}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#101828', marginBottom: 8 }}>
                  {item.agent} <span style={{ color: '#94A3B8' }}>→</span> <span style={{ fontFamily: 'monospace', color: '#000048' }}>{item.tool}</span>
                </div>
                <div style={{ background: '#0F172A', borderRadius: 4, padding: '10px 14px', marginBottom: 12, maxHeight: 60, overflow: 'hidden' }}>
                  <p style={{ margin: 0, fontFamily: 'monospace', fontSize: 12, color: '#94A3B8', fontStyle: 'italic', lineHeight: 1.5 }}>{item.reasoning}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Button size="small" onClick={() => handleApprove(item.id)}
                    disabled={userRole !== 'admin'}
                    aria-label={`Approve HITL decision ${item.id}`}
                    style={{ background: '#10B981', borderColor: '#10B981', color: 'white', fontWeight: 600 }}>
                    Approve
                  </Button>
                  <Button size="small" danger onClick={() => handleReject(item.id)}
                    disabled={userRole !== 'admin'}
                    aria-label={`Reject HITL decision ${item.id}`}
                    style={{ fontWeight: 600 }}>
                    Reject
                  </Button>
                  <Button type="link" size="small" style={{ color: '#64748B', paddingLeft: 0 }}
                    onClick={() => message.info(`${item.id} escalated to L2 principal tier`)}>
                    Escalate
                  </Button>
                </div>
              </div>
              );
            })}
            {queue.filter(q => !dismissed.includes(q.id)).length === 0 && (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#94A3B8', fontSize: 13 }}>
                ✓ No items awaiting approval — all agent actions are operating within policy bounds.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Two-column */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        {/* Risk Threshold Configuration */}
        <div style={{ ...cardStyle, padding: 20, width: 360, flexShrink: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <SH title="Risk Thresholds" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {getThresholdAgents().map(agent => (
              <div key={agent} style={{ border: '1px solid #F1F5F9', borderRadius: 6, padding: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#101828', marginBottom: 10 }}>{agent}</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Protocol Risk Threshold</div>
                    <Select value={thresholds[agent]?.risk} size="small" style={{ width: '100%' }} onChange={v => setAgentThreshold(agent, 'risk', v)}>
                      {['Low', 'Medium', 'High', 'Critical'].map(o => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Cost Alert</div>
                    <Select value={thresholds[agent]?.cost} size="small" style={{ width: '100%' }} onChange={v => setAgentThreshold(agent, 'cost', v)}>
                      {['$0.10', '$0.25', '$0.50', '$1.00'].map(o => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Loop Detection</div>
                    <Select value={thresholds[agent]?.loop} size="small" style={{ width: '100%' }} onChange={v => setAgentThreshold(agent, 'loop', v)}>
                      {['Off', '2 loops', '3 loops', '5 loops'].map(o => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 4 }}>Escalation Path</div>
                    <Select value={thresholds[agent]?.esc} size="small" style={{ width: '100%' }} onChange={v => setAgentThreshold(agent, 'esc', v)}>
                      {['L1', 'L2', 'L3', 'Auto'].map(o => <Option key={o} value={o}>{o}</Option>)}
                    </Select>
                  </div>
                </div>
                <Tooltip title={userRole !== 'admin' ? 'Admin access required' : !isDirty(agent) ? 'No changes to commit' : undefined}>
                  <Button type="primary" disabled={!isDirty(agent) || userRole !== 'admin'} onClick={() => saveThresholds(agent)}>
                    Commit Policy
                  </Button>
                </Tooltip>
              </div>
            ))}
          </div>
        </div>

        {/* Approval History */}
        <div style={{ ...cardStyle, padding: 20, flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 14 }}>
            <SH title="Approval History" />
          </div>
          <Table
            dataSource={historyRows}
            columns={historyColumns}
            rowKey="time"
            size="small"
            pagination={false}
            scroll={{ x: 620 }}
            locale={{ emptyText: 'No approval decisions on record' }}
          />
        </div>
      </div>
    </div>
  );
}

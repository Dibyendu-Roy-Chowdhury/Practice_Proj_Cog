import React, { useState, useEffect } from 'react';
import { Drawer, Spin, Tag } from 'antd';
import { Wrench } from 'lucide-react';
import { getRunbook } from '../../../services/API_services';
import StepBlock from './StepBlock';

// Map error message keywords → runbook ID
const ERROR_MAP = [
  { kw: ['oom', 'heap', 'memory', 'mem usage'],               id: 'memory-leak'      },
  { kw: ['latency', 'timeout', '503', 'sla', 'p95', 'slow'],  id: 'perf-degradation' },
  { kw: ['loop', 'react', 'iterations exceeded'],              id: 'agent-restart'    },
  { kw: ['token', 'budget', 'cost', 'spend', 'limit'],         id: 'cost-overrun'     },
  { kw: ['hitl', 'escalat', 'approval'],                       id: 'hitl-escalation'  },
  { kw: ['security', 'inject', 'breach', 'credential'],        id: 'security-breach'  },
  { kw: ['platform', 'coordinator', 'mongodb', 'database'],    id: 'zeroops-recovery' },
];

export function mapErrorToRunbook(message = '') {
  const m = message.toLowerCase();
  for (const { kw, id } of ERROR_MAP) {
    if (kw.some(k => m.includes(k))) return id;
  }
  return 'agent-restart';
}

const sevColor = (s) => s === 'P1' ? '#EF4444' : s === 'P2' ? '#F59E0B' : '#10B981';
const sevBg    = (s) => s === 'P1' ? '#FEF3F2' : s === 'P2' ? '#FFFAEB' : '#ECFDF3';

const RemediationDrawer = ({ open, onClose, errorMessage = '', errorLevel = 'ERROR', agentName = '' }) => {
  const [runbook, setRunbook] = useState(null);
  const [loading, setLoading] = useState(false);

  const runbookId = mapErrorToRunbook(errorMessage);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setRunbook(null);
    getRunbook(runbookId).then(setRunbook).finally(() => setLoading(false));
  }, [open, runbookId]);

  return (
    <Drawer
      open={open}
      onClose={onClose}
      width={560}
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Wrench size={15} strokeWidth={1.5} style={{ color: '#00B5E2' }} />
          <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>Remediation Workbench</span>
        </div>
      }
      styles={{ body: { padding: '16px 20px', background: '#F8FAFC' } }}
      destroyOnClose
    >
      {/* Error context pill */}
      <div style={{ background: '#0F172A', borderRadius: 6, padding: '10px 14px', marginBottom: 16, fontFamily: 'monospace', fontSize: 11 }}>
        {agentName && (
          <div style={{ marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#64748B', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.07em' }}>Agent</span>
            <span style={{ color: '#00B5E2', fontWeight: 700 }}>{agentName}</span>
          </div>
        )}
        <span style={{ color: errorLevel === 'ERROR' ? '#F87171' : '#FBBF24', fontWeight: 700, marginRight: 8 }}>{errorLevel}</span>
        <span style={{ color: '#CBD5E1' }}>{errorMessage || 'No message provided'}</span>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 60 }}>
          <Spin />
        </div>
      )}

      {!loading && runbook && (
        <>
          {/* Runbook header */}
          <div style={{ marginBottom: 16, padding: '12px 16px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#101828' }}>{runbook.title}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: sevBg(runbook.severity), color: sevColor(runbook.severity) }}>
                {runbook.severity}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {runbook.personas?.map(p => (
                <Tag key={p} style={{ fontSize: 10, margin: 0 }}>{p}</Tag>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {runbook.steps?.map((step, i) => (
              <div key={i} style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 6, padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', minWidth: 20 }}>#{i + 1}</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{step.title}</span>
                </div>
                {step.desc && (
                  <p style={{ margin: '0 0 8px 28px', fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>{step.desc}</p>
                )}
                <div style={{ marginLeft: 28 }}>
                  <StepBlock
                    step={step}
                    stepIndex={i}
                    runbookId={runbookId}
                    agentId={agentName || undefined}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </Drawer>
  );
};

export default RemediationDrawer;

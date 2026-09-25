import React, { useState, useEffect } from 'react';
import { Spin, Switch, Tag } from 'antd';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getTrustInterceptors, updateInterceptorActive, getAgentsSync } from '../services/API_services';

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>
);

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

// Compliance event templates — agent names filled in dynamically from current tenant.
const buildComplianceEvents = (agents) => {
  const a = agents.map(x => x.name);
  const get = (i) => a[i % a.length] || 'Primary Agent';
  return [
    { id: 'CE-001', framework: 'Reg A',  rule: 'Art. 24 — Best Execution Disclosure', agent: get(0), severity: 'high',   ts: '09:14:02', detail: 'Response contained sensitive advice without mandatory compliance disclosure' },
    { id: 'CE-002', framework: 'Reg B',  rule: 'Art. 17 — Right to Erasure',          agent: get(1), severity: 'medium', ts: '10:32:55', detail: 'Query included personal identifiers not covered by data processing agreement' },
    { id: 'CE-003', framework: 'Reg A',  rule: 'R.10 — Due Diligence',               agent: get(0), severity: 'high',   ts: '11:07:18', detail: 'Client due-diligence data absent from advisory context — blocked output' },
    { id: 'CE-004', framework: 'Reg C',  rule: 'Art. 25 — Suitability Assessment',   agent: get(2), severity: 'medium', ts: '11:45:30', detail: 'Suitability check not completed before generating recommendation' },
    { id: 'CE-005', framework: 'Reg B',  rule: 'Art. 5(1)(c) — Data Minimisation',   agent: get(3), severity: 'low',    ts: '13:02:47', detail: 'Unnecessary PII included in inter-agent handoff payload; redacted by guard' },
    { id: 'CE-006', framework: 'Reg A',  rule: 'R.20 — Suspicious Transactions',     agent: get(1), severity: 'high',   ts: '14:17:11', detail: 'Transaction pattern matched threshold — flagged for compliance review' },
  ];
};

const SEVERITY_COLOR = { high: 'error', medium: 'warning', low: 'default' };
const FRAMEWORK_COLOR = { 'MiFID II': '#7A5AF8', 'GDPR': '#0EA5E9', 'AML': '#F59E0B' };

function ComplianceEventList() {
  const [open, setOpen] = useState(false);
  const complianceEvents = buildComplianceEvents(getAgentsSync());
  return (
    <div style={{ marginTop: 12, borderTop: '1px solid #E2E8F0', paddingTop: 10 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
      >
        {open
          ? <ChevronDown size={13} strokeWidth={2} style={{ color: '#000048' }} />
          : <ChevronRight size={13} strokeWidth={2} style={{ color: '#000048' }} />
        }
        <span style={{ fontSize: 12, fontWeight: 700, color: '#000048' }}>
          View compliance events ({complianceEvents.length})
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 10, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['ID', 'Framework', 'Rule', 'Agent', 'Severity', 'Time', 'Detail'].map(h => (
                  <th key={h} style={{ padding: '5px 8px', textAlign: 'left', fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {complianceEvents.map(ev => (
                <tr key={ev.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#64748B' }}>{ev.id}</td>
                  <td style={{ padding: '5px 8px' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: FRAMEWORK_COLOR[ev.framework] }}>{ev.framework}</span>
                  </td>
                  <td style={{ padding: '5px 8px', color: '#344054', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.rule}</td>
                  <td style={{ padding: '5px 8px', color: '#475569', whiteSpace: 'nowrap' }}>{ev.agent}</td>
                  <td style={{ padding: '5px 8px' }}><Tag color={SEVERITY_COLOR[ev.severity]} style={{ fontSize: 10 }}>{ev.severity}</Tag></td>
                  <td style={{ padding: '5px 8px', fontFamily: 'monospace', color: '#94A3B8', whiteSpace: 'nowrap' }}>{ev.ts}</td>
                  <td style={{ padding: '5px 8px', color: '#64748B', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={ev.detail}>{ev.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function TrustSecurity() {
  const [interceptors, setInterceptors] = useState([]);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    getTrustInterceptors()
      .then(ti => setInterceptors(ti ?? []))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterceptor = (id, val) => {
    setInterceptors(prev => prev.map(ti => ti.id === id ? { ...ti, active: val } : ti));
    updateInterceptorActive(id, val);
  };

  return (
    <div>
      <div style={{ ...cardStyle, padding: 20, marginBottom: 16 }}>
        <div style={{ marginBottom: 14 }}>
          <SH title="Active Safety Measures" />
        </div>
        {loading ? <Spin /> : (
          <div className="grid grid-cols-3 gap-4">
            {interceptors.map(ti => (
              <div key={ti.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, padding: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{ti.name}</span>
                  <Switch checked={ti.active} size="small" onChange={v => toggleInterceptor(ti.id, v)} />
                </div>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#64748B' }}>{ti.desc}</p>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>Policy violations today: {ti.events}</span>
                {['compliance_screen', 'hipaa_screen', 'sec_compliance'].includes(ti.id) && <ComplianceEventList />}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

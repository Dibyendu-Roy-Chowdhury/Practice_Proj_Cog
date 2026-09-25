import React, { useState, useEffect } from 'react';
import { Spin } from 'antd';
import { getPrecursorAlerts, getRemediationQueue } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>
);

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

export default function XOpsIntelligence({ agentId } = {}) {
  const { tenant } = useTenant();
  const [precursors, setPrecursors] = useState([]);
  const [remediation, setRemediation] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([getPrecursorAlerts(), getRemediationQueue()])
      .then(([pre, rem]) => {
        setPrecursors(pre ?? []);
        setRemediation(rem ?? []);
      })
      .finally(() => setLoading(false));
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const riskColor = (r) => r === 'High' ? '#EF4444' : r === 'Medium' ? '#F59E0B' : '#10B981';
  const confColor = (c) => c > 80 ? '#EF4444' : c >= 50 ? '#F59E0B' : '#10B981';
  const confBg    = (c) => c > 80 ? '#FEF3F2' : c >= 50 ? '#FFFAEB' : '#ECFDF3';
  const statusColor = (s) => s === 'Completed' ? '#10B981' : s === 'In Progress' ? '#00B5E2' : '#94A3B8';
  const progressFill = (s) => s === 'Completed' ? '#10B981' : s === 'In Progress' ? '#00B5E2' : '#CBD5E1';

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
      {/* Precursor Alerts */}
      <div style={{ ...cardStyle, padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <SH title="Predicted Issues" />
        </div>
        {loading ? <Spin /> : (
          <div className="w-full overflow-x-auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E2E8F0' }}>
                  {['ID', 'Predicted Failure Mode', 'Time-to-Failure', 'Confidence', 'Risk'].map(h => (
                    <th key={h} style={{ padding: '6px 8px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: '#98A2B3', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {precursors.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: '24px 8px', textAlign: 'center', fontSize: 13, color: '#94A3B8' }}>No predicted issues detected</td></tr>
                )}
                {precursors.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                    <td style={{ padding: '8px', fontSize: 11, fontFamily: 'monospace', color: '#64748B' }}>{p.id}</td>
                    <td style={{ padding: '8px', fontSize: 13, fontWeight: 600, color: '#101828' }}>{p.mode}</td>
                    <td style={{ padding: '8px', fontSize: 11, fontFamily: 'monospace', color: '#F59E0B' }}>{p.ttf}</td>
                    <td style={{ padding: '8px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: confBg(p.confidence), color: confColor(p.confidence) }}>{p.confidence}%</span>
                    </td>
                    <td style={{ padding: '8px', fontSize: 13, fontWeight: 600, color: riskColor(p.risk) }}>{p.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remediation Queue */}
      <div style={{ ...cardStyle, padding: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <SH title="Active Runbooks" />
        </div>
        {loading ? <Spin /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {remediation.map(r => (
              <div key={r.id} style={{ padding: '12px', border: '1px solid #F1F5F9', borderRadius: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{r.name}</span>
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, border: '1px solid #E2E8F0', color: '#64748B' }}>{r.action}</span>
                </div>
                <div style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748B', marginBottom: 6 }}>{r.target}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: statusColor(r.status) }}>{r.status}</span>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#E2E8F0' }}>
                    <div style={{ width: `${r.progress}%`, height: '100%', borderRadius: 2, background: progressFill(r.status) }} />
                  </div>
                  <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8' }}>{r.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Select, Button, message, Tooltip, Modal } from 'antd';
import { ShieldCheck, RefreshCw, Download, FileText, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react';
import { getComplianceEvents, getComplianceSummary, getComplianceControlMap, generateComplianceReport } from '../services/API_services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEV_COLOR = {
  CRITICAL: { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' },
  HIGH:     { bg: '#FFF7ED', text: '#EA580C', border: '#FED7AA' },
  MEDIUM:   { bg: '#FFFBEB', text: '#D97706', border: '#FDE68A' },
  LOW:      { bg: '#F0FDF4', text: '#16A34A', border: '#BBF7D0' },
  INFO:     { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' },
};

const SEV_TAG = (sev) => {
  const c = SEV_COLOR[sev] || SEV_COLOR['INFO'];
  return (
    <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, whiteSpace: 'nowrap' }}>
      {sev}
    </span>
  );
};

const EVENT_LABEL = {
  'guardrail.trigger':             'Guardrail Trigger',
  'guardrail.bypass_attempt':      'Bypass Attempt',
  'hitl.decision':                 'HITL Decision',
  'hitl.timeout':                  'HITL Timeout',
  'hitl.escalation':               'HITL Escalation',
  'agent.rollback':                'Agent Rollback',
  'agent.deployment':              'Agent Deployment',
  'circuit_breaker.triggered':     'Circuit Breaker',
  'data.exfiltration_attempt':     'Data Exfiltration',
  'eval.hallucination_flag':       'Hallucination Flag',
  'eval.toxicity_flag':            'Toxicity Flag',
  'eval.guardrail_bypass_in_eval': 'Eval Bypass',
  'policy.violation':              'Policy Violation',
  'audit.access':                  'Audit Access',
};

const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

// ─── KPI card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color }) => (
  <div style={{ ...card, flex: 1, minWidth: 130 }}>
    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{label}</p>
    <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 800, color: color || '#101828', lineHeight: 1.1 }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{sub}</p>}
  </div>
);

// ─── Control IDs pill list ────────────────────────────────────────────────────

const ControlPills = ({ ids = [], color }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
    {ids.map(id => (
      <span key={id} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: color + '18', color, fontFamily: 'monospace', fontWeight: 600, border: `1px solid ${color}44` }}>{id}</span>
    ))}
    {ids.length === 0 && <span style={{ fontSize: 10, color: '#CBD5E1' }}>—</span>}
  </div>
);

// ─── Control Map accordion row ────────────────────────────────────────────────

const ControlMapRow = ({ eventType, controls }) => {
  const [open, setOpen] = useState(false);
  const label = EVENT_LABEL[eventType] || eventType;
  return (
    <div style={{ borderBottom: '1px solid #F1F5F9' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: open ? '#F8FAFC' : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        {open ? <ChevronDown size={12} strokeWidth={2} style={{ color: '#000048', flexShrink: 0 }} /> : <ChevronRight size={12} strokeWidth={2} style={{ color: '#000048', flexShrink: 0 }} />}
        <span style={{ fontSize: 12, fontWeight: 600, color: '#101828', flex: 1 }}>{label}</span>
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8' }}>{eventType}</span>
      </button>
      {open && (
        <div style={{ padding: '8px 32px 12px', background: '#F8FAFC' }}>
          {controls?.description && (
            <p style={{ margin: '0 0 10px', fontSize: 11, color: '#64748B' }}>{controls.description}</p>
          )}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 180 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>ISO/IEC 42001</p>
              <ControlPills ids={controls?.ISO42001 || []} color="#6366F1" />
            </div>
            <div style={{ minWidth: 200 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>NIST AI RMF</p>
              <ControlPills ids={controls?.NIST_AI_RMF || []} color="#0EA5E9" />
            </div>
            <div style={{ minWidth: 160 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94A3B8' }}>SOC 2 Type II</p>
              <ControlPills ids={controls?.SOC2 || []} color="#10B981" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Severity bar ─────────────────────────────────────────────────────────────

const SeverityBar = ({ bySeverity = {} }) => {
  const ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
  const total = Object.values(bySeverity).reduce((s, v) => s + (v || 0), 0) || 1;
  return (
    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
      {ORDER.map(sev => {
        const count = bySeverity[sev] || 0;
        const pct = Math.round(count / total * 100);
        const c = SEV_COLOR[sev];
        return (
          <div key={sev} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
            <span style={{ fontSize: 11, fontWeight: 700, color: c.text }}>{count}</span>
            <span style={{ fontSize: 10, color: '#94A3B8' }}>{sev}</span>
            <span style={{ fontSize: 10, color: '#CBD5E1' }}>({pct}%)</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

const FRAMEWORK_OPTIONS = [
  { value: 'all',         label: 'All Frameworks' },
  { value: 'ISO42001',    label: 'ISO/IEC 42001'  },
  { value: 'NIST_AI_RMF', label: 'NIST AI RMF'   },
  { value: 'SOC2',        label: 'SOC 2 Type II'  },
];

const SEVERITY_OPTIONS = [
  { value: 'all',      label: 'All Severities' },
  { value: 'CRITICAL', label: 'Critical'       },
  { value: 'HIGH',     label: 'High'           },
  { value: 'MEDIUM',   label: 'Medium'         },
  { value: 'LOW',      label: 'Low'            },
  { value: 'INFO',     label: 'Info'           },
];

export default function ComplianceReports() {
  const [events,      setEvents]      = useState([]);
  const [summary,     setSummary]     = useState(null);
  const [controlMap,  setControlMap]  = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [fwFilter,    setFwFilter]    = useState('all');
  const [sevFilter,   setSevFilter]   = useState('all');
  const [showMap,     setShowMap]     = useState(false);
  const [generating,  setGenerating]  = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [reportFmt,   setReportFmt]   = useState('json');

  const load = useCallback(async () => {
    setLoading(true);
    const [ev, sm, cm] = await Promise.all([
      getComplianceEvents({ framework: fwFilter !== 'all' ? fwFilter : undefined, severity: sevFilter !== 'all' ? sevFilter : undefined }),
      getComplianceSummary(),
      getComplianceControlMap(),
    ]);
    setEvents(ev ?? []);
    setSummary(sm ?? { by_event: {}, by_severity: {} });
    setControlMap(cm?.controls ?? cm);
    setLoading(false);
  }, [fwFilter, sevFilter]);

  useEffect(() => { load(); }, [load]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await generateComplianceReport({ format: reportFmt, framework: fwFilter !== 'all' ? fwFilter : undefined });
      message.success(`Report ${res?.report_id ?? ''} generated — ${res?.count ?? events.length} events`);
      setReportModal(false);
      if (reportFmt === 'csv' && res?.content) {
        const blob = new Blob([res.content], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `compliance-report-${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      } else if (reportFmt === 'json' && res?.content) {
        const blob = new Blob([typeof res.content === 'string' ? res.content : JSON.stringify(res.content, null, 2)], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `compliance-report-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      message.error('Report generation failed — backend may be unavailable');
    } finally {
      setGenerating(false);
    }
  };

  // Client-side filter (framework already passed to API, but apply locally too)
  const filtered = events.filter(ev => {
    if (fwFilter !== 'all' && !ev.frameworks?.includes(fwFilter)) return false;
    if (sevFilter !== 'all' && ev.severity !== sevFilter) return false;
    return true;
  });

  const totalCritical = summary?.by_severity?.CRITICAL ?? 0;
  const totalHigh     = summary?.by_severity?.HIGH ?? 0;

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#F8F9FB' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ShieldCheck size={22} strokeWidth={1.5} style={{ color: '#000048' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#101828' }}>Compliance & Certification</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>ISO/IEC 42001 · NIST AI RMF · SOC 2 Type II — immutable audit trail</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Button icon={<FileText size={13} />} onClick={() => setShowMap(s => !s)} size="small">
            {showMap ? 'Hide' : 'Show'} Control Map
          </Button>
          <Button icon={<Download size={13} />} onClick={() => setReportModal(true)} size="small">
            Generate Report
          </Button>
          <Button icon={<RefreshCw size={13} />} onClick={load} disabled={loading} size="small">Refresh</Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* KPI bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiCard label="Total Events"     value={summary?.total ?? events.length}  sub="all time"            />
            <KpiCard label="Critical"         value={totalCritical} sub="require immediate action" color={totalCritical > 0 ? '#DC2626' : '#10B981'} />
            <KpiCard label="High"             value={totalHigh}     sub="elevated risk"             color={totalHigh > 0 ? '#EA580C' : '#10B981'} />
            <KpiCard label="Frameworks"       value={3}             sub="ISO 42001 · NIST · SOC 2"  color="#6366F1" />
            <KpiCard label="Event Types"      value={Object.keys(summary?.by_event ?? {}).length || 8} sub="distinct control triggers" />
          </div>

          {/* Severity distribution */}
          {summary?.by_severity && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Severity Distribution</p>
              <SeverityBar bySeverity={summary.by_severity} />
              {(totalCritical + totalHigh) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, padding: '8px 12px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA' }}>
                  <AlertTriangle size={13} strokeWidth={2} style={{ color: '#DC2626', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 600 }}>
                    {totalCritical + totalHigh} event{totalCritical + totalHigh > 1 ? 's' : ''} at CRITICAL or HIGH severity require review.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Framework coverage */}
          {summary?.by_framework && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Framework Coverage</p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'ISO42001',    label: 'ISO/IEC 42001',  color: '#6366F1', sub: 'AI Management System' },
                  { key: 'NIST_AI_RMF', label: 'NIST AI RMF',   color: '#0EA5E9', sub: 'Risk Management Framework' },
                  { key: 'SOC2',        label: 'SOC 2 Type II',  color: '#10B981', sub: 'Trust Service Criteria' },
                ].map(({ key, label, color, sub }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', border: `1px solid ${color}33`, borderRadius: 8, background: `${color}0A` }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <span style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{summary.by_framework[key] ?? 0}</span>
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#101828' }}>{label}</p>
                      <p style={{ margin: 0, fontSize: 10, color: '#64748B' }}>{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Control Map */}
          {showMap && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Control Map</p>
              <p style={{ margin: '0 0 12px', fontSize: 11, color: '#64748B' }}>Click an event type to expand its framework control IDs.</p>
              {controlMap ? (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                  {Object.entries(controlMap).map(([eventType, controls]) => (
                    <ControlMapRow key={eventType} eventType={eventType} controls={controls} />
                  ))}
                </div>
              ) : (
                <div style={{ border: '1px solid #E2E8F0', borderRadius: 6, overflow: 'hidden' }}>
                  {Object.keys(EVENT_LABEL).map(et => (
                    <ControlMapRow key={et} eventType={et} controls={null} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Filter:</span>
            <Select value={fwFilter}  onChange={setFwFilter}  options={FRAMEWORK_OPTIONS} size="small" style={{ width: 170 }} />
            <Select value={sevFilter} onChange={setSevFilter} options={SEVERITY_OPTIONS}  size="small" style={{ width: 140 }} />
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>{filtered.length} event{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Events table */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Compliance Event Log</p>
            {filtered.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No compliance events found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Event ID', 'Event Type', 'Severity', 'Agent', 'Timestamp', 'ISO 42001', 'NIST AI RMF', 'SOC 2'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ev) => (
                      <tr key={ev.ce_id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                        <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap', fontSize: 11 }}>{ev.ce_id}</td>
                        <td style={{ padding: '8px 10px', color: '#101828', whiteSpace: 'nowrap' }}>
                          <Tooltip title={ev.event_type}>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>{EVENT_LABEL[ev.event_type] || ev.event_type}</span>
                          </Tooltip>
                        </td>
                        <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>{SEV_TAG(ev.severity)}</td>
                        <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{ev.agent_name || '—'}</td>
                        <td style={{ padding: '8px 10px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: 11 }}>{fmtTs(ev.timestamp)}</td>
                        <td style={{ padding: '8px 10px' }}>
                          <ControlPills ids={ev.control_ids?.ISO42001 || []} color="#6366F1" />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <ControlPills ids={ev.control_ids?.NIST_AI_RMF || []} color="#0EA5E9" />
                        </td>
                        <td style={{ padding: '8px 10px' }}>
                          <ControlPills ids={ev.control_ids?.SOC2 || []} color="#10B981" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Event type breakdown */}
          {summary?.by_event && Object.keys(summary.by_event).length > 0 && (
            <div style={{ ...card, marginTop: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Events by Type</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {Object.entries(summary.by_event).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px', border: '1px solid #E2E8F0', borderRadius: 6, background: '#FAFAFA' }}>
                    <span style={{ fontSize: 16, fontWeight: 800, color: '#000048' }}>{count}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 600, color: '#101828' }}>{EVENT_LABEL[type] || type}</p>
                      <p style={{ margin: 0, fontSize: 9, color: '#94A3B8', fontFamily: 'monospace' }}>{type}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Report generation modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Download size={16} strokeWidth={1.5} style={{ color: '#000048' }} />
            <span>Generate Compliance Report</span>
          </div>
        }
        open={reportModal}
        onCancel={() => setReportModal(false)}
        onOk={handleGenerate}
        okText={generating ? 'Generating…' : 'Generate & Download'}
        okButtonProps={{ loading: generating, style: { background: '#000048' } }}
        width={440}
      >
        <div style={{ padding: '12px 0' }}>
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 16 }}>
            Export compliance events as a structured report. The report will include control IDs, framework mappings, and agent attribution.
          </p>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>Format</label>
            <Select
              value={reportFmt}
              onChange={setReportFmt}
              options={[{ value: 'json', label: 'JSON' }, { value: 'csv', label: 'CSV' }]}
              style={{ width: '100%' }}
              size="small"
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#344054', display: 'block', marginBottom: 6 }}>Framework Filter</label>
            <Select
              value={fwFilter}
              onChange={setFwFilter}
              options={FRAMEWORK_OPTIONS}
              style={{ width: '100%' }}
              size="small"
            />
          </div>
          <div style={{ padding: '8px 12px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0' }}>
            <p style={{ margin: 0, fontSize: 11, color: '#16A34A' }}>
              Compliance events are immutable — records cannot be modified after creation, providing a tamper-evident audit trail.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}

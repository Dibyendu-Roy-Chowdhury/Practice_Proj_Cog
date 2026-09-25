import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Tag, Select, Button, message, Tooltip } from 'antd';
import { FlaskConical, RefreshCw, Play, ChevronDown, ChevronRight, CheckCircle, XCircle, Clock } from 'lucide-react';
import { getEvaluations, getEvalSummary, getEvalTestSuites, triggerEvaluation, getAgentsSync } from '../services/API_services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SCORE_COLOR = (s) => {
  if (s >= 0.85) return '#10B981';
  if (s >= 0.70) return '#F59E0B';
  return '#EF4444';
};

const SCORE_BG = (s) => {
  if (s >= 0.85) return '#ECFDF5';
  if (s >= 0.70) return '#FFFBEB';
  return '#FEF2F2';
};

const STATUS_TAG = {
  completed: <Tag color="success"  style={{ fontSize: 10 }}>Completed</Tag>,
  failed:    <Tag color="error"    style={{ fontSize: 10 }}>Failed</Tag>,
  pending:   <Tag color="default"  style={{ fontSize: 10 }}>Pending</Tag>,
  running:   <Tag color="processing" style={{ fontSize: 10 }}>Running</Tag>,
};

const TYPE_TAG = {
  manual:        <Tag color="blue"    style={{ fontSize: 10 }}>Manual</Tag>,
  scheduled:     <Tag color="cyan"    style={{ fontSize: 10 }}>Scheduled</Tag>,
  'ci-triggered':<Tag color="purple"  style={{ fontSize: 10 }}>CI</Tag>,
  regression:    <Tag color="volcano" style={{ fontSize: 10 }}>Regression</Tag>,
};

const pct  = (v) => `${Math.round((v ?? 0) * 100)}%`;
const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

// ─── KPI card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color }) => (
  <div style={{ ...card, flex: 1, minWidth: 140 }}>
    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{label}</p>
    <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 800, color: color || '#101828', lineHeight: 1.1 }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{sub}</p>}
  </div>
);

// ─── Test results accordion ───────────────────────────────────────────────────

const TestResultsRow = ({ results = [] }) => {
  const [open, setOpen] = useState(false);
  if (!results.length) return <span style={{ fontSize: 11, color: '#94A3B8' }}>No test cases</span>;
  const passed = results.filter(r => r.passed).length;
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 4, border: 'none', background: 'none', cursor: 'pointer', padding: 0 }}
      >
        {open ? <ChevronDown size={12} strokeWidth={2} style={{ color: '#000048' }} /> : <ChevronRight size={12} strokeWidth={2} style={{ color: '#000048' }} />}
        <span style={{ fontSize: 11, fontWeight: 600, color: '#000048' }}>
          {passed}/{results.length} cases passed
        </span>
      </button>
      {open && (
        <div style={{ marginTop: 8, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['Case', 'Score', 'Pass', 'Input', 'Expected', 'Actual'].map(h => (
                  <th key={h} style={{ padding: '4px 8px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '4px 8px', fontFamily: 'monospace', color: '#64748B' }}>{r.case_id || `tc-${i + 1}`}</td>
                  <td style={{ padding: '4px 8px' }}>
                    <span style={{ fontWeight: 700, color: SCORE_COLOR(r.score ?? 0) }}>{pct(r.score)}</span>
                  </td>
                  <td style={{ padding: '4px 8px' }}>
                    {r.passed
                      ? <CheckCircle size={13} strokeWidth={2} style={{ color: '#10B981' }} />
                      : <XCircle   size={13} strokeWidth={2} style={{ color: '#EF4444' }} />
                    }
                  </td>
                  <td style={{ padding: '4px 8px', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.input}>{r.input}</td>
                  <td style={{ padding: '4px 8px', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.expected}>{r.expected}</td>
                  <td style={{ padding: '4px 8px', color: '#475569', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.actual}>{r.actual ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AgentEvaluation() {
  const [evals,       setEvals]       = useState([]);
  const [summary,     setSummary]     = useState([]);
  const [suites,      setSuites]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [agentFilter, setAgentFilter] = useState('all');
  const [typeFilter,  setTypeFilter]  = useState('all');
  const [triggering,  setTriggering]  = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, s, t] = await Promise.all([getEvaluations({ agentId: agentFilter }), getEvalSummary(), getEvalTestSuites()]);
    setEvals(e ?? []);
    setSummary(s ?? []);
    setSuites(t ?? []);
    setLoading(false);
  }, [agentFilter]);

  useEffect(() => { load(); }, [load]);

  const handleTrigger = async (agentId) => {
    setTriggering(true);
    try {
      const res = await triggerEvaluation({
        agent_id: agentId || getAgentsSync()[0]?.id || 'agent-101',
        eval_type: 'manual',
        hallucination_score: +(Math.random() * 0.2).toFixed(4),
        toxicity_score:      +(Math.random() * 0.05).toFixed(4),
        latency_ms:          Math.round(1000 + Math.random() * 3000),
        token_cost_usd:      +(Math.random() * 0.02).toFixed(6),
      });
      message.success(`Evaluation ${res?.eval_id} created — score: ${res?.composite_score ?? '—'}`);
      load();
    } catch {
      message.error('Failed to trigger evaluation — backend may be unavailable');
    } finally {
      setTriggering(false);
    }
  };

  const filtered = evals.filter(e => typeFilter === 'all' || e.eval_type === typeFilter);

  const totalRuns    = evals.length;
  const passed       = evals.filter(e => (e.metrics?.composite_score ?? 0) >= 0.80 && e.status === 'completed').length;
  const avgComposite = summary.length
    ? (summary.reduce((a, b) => a + (b.avg_composite || 0), 0) / summary.length).toFixed(3)
    : '—';
  const criticalHalluc = evals.filter(e => (e.metrics?.hallucination_score ?? 0) > 0.20).length;

  const AGENT_OPTIONS = [
    { value: 'all', label: 'All Agents' },
    ...Array.from(new Set(evals.map(e => e.agent_id))).map(id => ({ value: id, label: id })),
  ];
  const TYPE_OPTIONS = [
    { value: 'all', label: 'All Types' },
    { value: 'manual', label: 'Manual' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'ci-triggered', label: 'CI' },
    { value: 'regression', label: 'Regression' },
  ];

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#F8F9FB' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <FlaskConical size={22} strokeWidth={1.5} style={{ color: '#000048' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#101828' }}>Agent Evaluation Engine</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Per-run factual accuracy, hallucination, toxicity and cost metrics</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button icon={<RefreshCw size={13} />} onClick={load} disabled={loading} size="small">Refresh</Button>
          <Button type="primary" icon={<Play size={13} />} onClick={() => handleTrigger(getAgentsSync()[0]?.id)} loading={triggering} size="small" style={{ background: '#000048' }}>
            Run Eval
          </Button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* KPI bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiCard label="Total Runs"        value={totalRuns}    sub="all time" />
            <KpiCard label="Passing (≥ 0.80)"  value={passed}       sub={`${Math.round(passed/Math.max(totalRuns,1)*100)}% pass rate`} color="#10B981" />
            <KpiCard label="Avg Composite"      value={avgComposite} sub="across all agents" color="#000048" />
            <KpiCard label="Hallucination Flags" value={criticalHalluc} sub="> 0.20 threshold" color={criticalHalluc > 0 ? '#EF4444' : '#10B981'} />
            <KpiCard label="Test Suites"        value={suites.length} sub="configured" />
          </div>

          {/* Per-agent summary */}
          {summary.length > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Per-Agent Summary</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Agent', 'Runs', 'Avg Composite', 'Avg Accuracy', 'Avg Hallucination', 'Avg Toxicity', 'Avg Latency'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((row) => (
                      <tr key={row.agent_id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '7px 10px', fontWeight: 600, color: '#101828' }}>{row.agent_id}</td>
                        <td style={{ padding: '7px 10px', color: '#64748B' }}>{row.eval_count}</td>
                        <td style={{ padding: '7px 10px' }}>
                          <span style={{ fontWeight: 700, padding: '2px 8px', borderRadius: 12, fontSize: 11, background: SCORE_BG(row.avg_composite), color: SCORE_COLOR(row.avg_composite) }}>
                            {pct(row.avg_composite)}
                          </span>
                        </td>
                        <td style={{ padding: '7px 10px', color: SCORE_COLOR(row.avg_factual_accuracy) }}>{pct(row.avg_factual_accuracy)}</td>
                        <td style={{ padding: '7px 10px', color: SCORE_COLOR(1 - row.avg_hallucination) }}>{pct(row.avg_hallucination)}</td>
                        <td style={{ padding: '7px 10px', color: SCORE_COLOR(1 - row.avg_toxicity) }}>{pct(row.avg_toxicity)}</td>
                        <td style={{ padding: '7px 10px', color: '#64748B', fontFamily: 'monospace' }}>{Math.round(row.avg_latency_ms)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Filter:</span>
            <Select value={agentFilter} onChange={setAgentFilter} options={AGENT_OPTIONS} size="small" style={{ width: 180 }} />
            <Select value={typeFilter}  onChange={setTypeFilter}  options={TYPE_OPTIONS}  size="small" style={{ width: 140 }} />
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>{filtered.length} runs</span>
          </div>

          {/* Eval run table */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Evaluation Runs</p>
            {filtered.length === 0 ? (
              <p style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No evaluations found.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['ID', 'Agent', 'Type', 'Status', 'Composite', 'Accuracy', 'Hallucination', 'Toxicity', 'Bypasses', 'Latency', 'Cost', 'Triggered By', 'Run At', 'Test Cases'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((ev) => {
                      const m = ev.metrics || {};
                      return (
                        <tr key={ev.eval_id} style={{ borderBottom: '1px solid #F1F5F9', verticalAlign: 'top' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{ev.eval_id}</td>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#101828', whiteSpace: 'nowrap' }}>{ev.agent_id}</td>
                          <td style={{ padding: '8px 10px' }}>{TYPE_TAG[ev.eval_type] || ev.eval_type}</td>
                          <td style={{ padding: '8px 10px' }}>{STATUS_TAG[ev.status] || ev.status}</td>
                          <td style={{ padding: '8px 10px' }}>
                            {ev.status === 'completed' ? (
                              <Tooltip title={`Composite score: ${m.composite_score}`}>
                                <span style={{ fontWeight: 800, padding: '2px 8px', borderRadius: 12, fontSize: 11, background: SCORE_BG(m.composite_score), color: SCORE_COLOR(m.composite_score) }}>
                                  {pct(m.composite_score)}
                                </span>
                              </Tooltip>
                            ) : <span style={{ color: '#94A3B8' }}>—</span>}
                          </td>
                          <td style={{ padding: '8px 10px', color: SCORE_COLOR(m.factual_accuracy ?? 0) }}>{ev.status === 'completed' ? pct(m.factual_accuracy) : '—'}</td>
                          <td style={{ padding: '8px 10px', color: SCORE_COLOR(1 - (m.hallucination_score ?? 0)) }}>{ev.status === 'completed' ? pct(m.hallucination_score) : '—'}</td>
                          <td style={{ padding: '8px 10px', color: SCORE_COLOR(1 - (m.toxicity_score ?? 0)) }}>{ev.status === 'completed' ? pct(m.toxicity_score) : '—'}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                            {ev.status === 'completed'
                              ? <span style={{ fontWeight: 700, color: (m.guardrail_bypass_attempts ?? 0) > 0 ? '#EF4444' : '#10B981' }}>{m.guardrail_bypass_attempts ?? 0}</span>
                              : <span style={{ color: '#94A3B8' }}>—</span>
                            }
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{ev.status === 'completed' ? `${m.latency_ms}ms` : '—'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', whiteSpace: 'nowrap' }}>{ev.status === 'completed' ? `$${(m.token_cost_usd ?? 0).toFixed(5)}` : '—'}</td>
                          <td style={{ padding: '8px 10px', color: '#475569', whiteSpace: 'nowrap' }}>{ev.triggered_by}</td>
                          <td style={{ padding: '8px 10px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: 11 }}>
                            <Clock size={11} strokeWidth={1.5} style={{ marginRight: 3, display: 'inline' }} />
                            {fmtTs(ev.started_at)}
                          </td>
                          <td style={{ padding: '8px 10px' }}>
                            <TestResultsRow results={ev.test_results ?? []} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Test suites */}
          {suites.length > 0 && (
            <div style={{ ...card, marginTop: 20 }}>
              <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Test Suites ({suites.length})</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {suites.map(s => (
                  <div key={s.suite_id} style={{ border: '1px solid #E2E8F0', borderRadius: 6, padding: '10px 14px', minWidth: 200, background: '#FAFAFA' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: '#101828' }}>{s.name}</p>
                    <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{s.agent_id} · {s.cases?.length ?? 0} cases</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metric gauges legend */}
          <div style={{ ...card, marginTop: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Scoring Weights</p>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              {[
                { label: 'Factual Accuracy', weight: '40%', color: '#10B981' },
                { label: 'Hallucination (inverted)', weight: '20%', color: '#6366F1' },
                { label: 'Toxicity (inverted)', weight: '20%', color: '#F59E0B' },
                { label: 'Latency Grade', weight: '20%', color: '#0EA5E9' },
              ].map(({ label, weight, color }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#344054' }}>{label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>{weight}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

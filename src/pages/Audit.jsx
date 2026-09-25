import React, { useState, useEffect } from 'react';
import { Select, Button, Drawer } from 'antd';
import { getAgents, getAuditTraces } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import EmptyState from '../components/common/EmptyState';
import { SkeletonRows, SkeletonTimeline } from '../components/common/Skeleton';
import {
  CheckCircle, XCircle, Brain, Wrench,
  Database, ChevronDown, ChevronRight,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────
const HOURS_OPTIONS = [
  { value: 1,   label: '1 Hour'  }, { value: 6,   label: '6 Hours'  },
  { value: 12,  label: '12 Hours'}, { value: 24,  label: '24 Hours' },
  { value: 48,  label: '48 Hours'}, { value: 72,  label: '72 Hours' },
  { value: 168, label: '1 Week'  },
];

const STATUS_META = {
  success: { color: '#027A48', bg: '#ECFDF3', label: 'Success', Icon: CheckCircle },
  error:   { color: '#B42318', bg: '#FEF3F2', label: 'Failed',  Icon: XCircle     },
};

const STEP_META = {
  Agent_Thought: { color: '#000048', bg: 'rgba(0,0,72,0.06)',  Icon: Brain,    label: 'Thought'   },
  Tool_Call:     { color: '#0B63E5', bg: 'rgba(11,99,229,0.06)', Icon: Wrench, label: 'Tool Call' },
  MemOps:        { color: '#6941C6', bg: 'rgba(105,65,198,0.06)', Icon: Database, label: 'Memory' },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (iso) => new Date(iso).toLocaleString('en-US', {
  month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
});

const fmtMs = (ms) => ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;

// ─── Session List Item ────────────────────────────────────────────────────────
const SessionItem = ({ trace, isActive, onClick }) => {
  const meta = STATUS_META[trace.status] || STATUS_META.success;
  const StatusIcon = meta.Icon;
  return (
    <button
      onClick={onClick}
      style={{
        display:    'block',
        width:      '100%',
        textAlign:  'left',
        padding:    '12px 16px',
        border:     'none',
        borderBottom: '1px solid #F2F4F7',
        background: isActive ? 'rgba(0,181,226,0.07)' : 'transparent',
        borderLeft: `3px solid ${isActive ? '#00B5E2' : 'transparent'}`,
        cursor:     'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#F8FAFC'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: '#101828', fontFamily: 'JetBrains Mono, monospace' }}>
          {trace.session_id}
        </span>
        <StatusIcon size={13} color={meta.color} />
      </div>
      <div style={{ fontSize: 11, color: '#667085', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {trace.user}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 11, color: '#98A2B3' }}>{fmtMs(trace.duration_ms)}</span>
        <span style={{ fontSize: 11, color: '#98A2B3' }}>·</span>
        <span style={{ fontSize: 11, color: '#667085' }}>{trace.model_id}</span>
      </div>
      <div style={{ marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ fontSize: 10, color: '#98A2B3' }}>H-Score:</span>
        <span style={{
          fontSize: 10, fontWeight: 700, padding: '0px 5px', borderRadius: 99,
          background: trace.h_score > 60 ? '#FEF3F2' : trace.h_score > 30 ? '#FFFAEB' : '#ECFDF3',
          color: trace.h_score > 60 ? '#B42318' : trace.h_score > 30 ? '#B54708' : '#027A48',
        }}>
          {trace.h_score ?? '—'}
        </span>
      </div>
      <div style={{ fontSize: 10, color: '#B0B7C3', marginTop: 3 }}>
        {fmt(trace.started_at)}
      </div>
    </button>
  );
};

// ─── Timeline Step ────────────────────────────────────────────────────────────
const TimelineStep = ({ step, isLast }) => {
  const [expanded, setExpanded] = useState(false);
  const stepType = step._type || step.type;
  const meta = STEP_META[stepType] || STEP_META.Agent_Thought;
  const StepIcon = meta.Icon;
  const hasPayload = step.tool_input || step.tool_output || step.content_raw;

  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
      {/* Spine */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 24 }}>
        <div style={{
          width: 24, height: 24, borderRadius: '50%',
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <StepIcon size={12} color={meta.color} strokeWidth={1.5} />
        </div>
        {!isLast && <div style={{ width: 1, flex: 1, background: '#E2E8F0', minHeight: 20, marginTop: 2 }} />}
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: isLast ? 0 : 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontSize: 10, fontWeight: 600, color: meta.color,
            background: meta.bg, padding: '2px 6px', borderRadius: 3, letterSpacing: '0.04em',
          }}>
            {meta.label}
          </span>
          {step.tool_name && (
            <span style={{ fontSize: 11, fontWeight: 600, color: '#344054' }}>{step.tool_name}</span>
          )}
          {step.latency_ms && (
            <span style={{ fontSize: 11, color: '#98A2B3', marginLeft: 'auto' }}>{fmtMs(step.latency_ms)}</span>
          )}
          {step.tokens && !step.latency_ms && (
            <span style={{ fontSize: 11, color: '#98A2B3', marginLeft: 'auto' }}>{step.tokens} tok</span>
          )}
        </div>

        <p style={{ margin: '0 0 6px', fontSize: 12, color: '#475467', lineHeight: 1.6 }}>
          {step.content || step.message}
        </p>

        {/* Memory-specific metadata */}
        {stepType === 'MemOps' && (
          <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#98A2B3' }}>
            <span>key: <strong style={{ color: '#667085' }}>{step.key}</strong></span>
            <span>age: {step.memory_age_days}d</span>
            <span>dist: {step.vector_distance}</span>
          </div>
        )}

        {/* State Diff for Agent_Thought steps */}
        {stepType === 'Agent_Thought' && (
          <div style={{ marginTop: 8, padding: '8px 10px', background: '#F8F9FB', border: '1px solid #E2E8F0', borderRadius: 4 }}>
            <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 600, color: '#667085', textTransform: 'uppercase', letterSpacing: '0.05em' }}>State Diff</p>
            <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.7 }}>
              <div style={{ color: '#027A48' }}>+ goal_progress: {step.tokens ? Math.round(step.tokens / 10) : 42}%</div>
              <div style={{ color: '#B42318' }}>- pending_tools: {step.tool_name ? 1 : 0} → 0</div>
              <div style={{ color: '#475467' }}>  context_window: {step.tokens || 0} tokens</div>
            </div>
          </div>
        )}

        {/* Expandable JSON payload */}
        {hasPayload && (
          <div style={{ marginTop: 6 }}>
            <Button
              type="link"
              size="small"
              onClick={() => setExpanded(v => !v)}
              icon={expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              style={{ padding: 0, fontSize: 11, height: 'auto' }}
            >
              {expanded ? 'Hide' : 'Show'} payload
            </Button>
            {expanded && (
              <pre style={{
                marginTop: 8, padding: '10px 12px',
                background: '#F8F9FB', border: '1px solid #E2E8F0', borderRadius: 4,
                fontFamily: 'JetBrains Mono, monospace', fontSize: 11, lineHeight: 1.65,
                color: '#344054', overflow: 'auto', maxHeight: 260,
              }}>
                {JSON.stringify(step.tool_input || step.tool_output || step.content_raw, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Tool output summary inline */}
        {step.tool_output && !expanded && (
          <div style={{ marginTop: 4, display: 'flex', gap: 10, fontSize: 11, color: '#98A2B3' }}>
            {step.tool_output.result_rows !== undefined && (
              <span>{step.tool_output.result_rows} rows</span>
            )}
            {step.tool_output.execution_time_ms !== undefined && (
              <span>{step.tool_output.execution_time_ms}ms exec</span>
            )}
            {step.tool_output.error && (
              <span style={{ color: '#B42318', fontWeight: 600 }}>Error: {step.tool_output.error}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Detail Pane ─────────────────────────────────────────────────────────────
const DetailPane = ({ trace }) => {
  const [ttOpen, setTtOpen] = useState(false);

  if (!trace) {
    return (
      <EmptyState
        icon="select"
        title="No trace selected"
        description="Select an execution session from the panel to inspect its full thought-step lineage and tool invocation chain."
      />
    );
  }

  const meta = STATUS_META[trace.status] || STATUS_META.success;

  // Build ordered timeline: memory_ops first, then thought_steps
  const timeline = [];
  for (const m of trace.memory_ops || []) {
    timeline.push({ ...m, _type: 'MemOps', content: `Retrieved memory key: ${m.key} (age ${m.memory_age_days}d, dist ${m.vector_distance})`, timestamp: m.retrieved_at });
  }
  for (const s of trace.thought_steps || []) {
    timeline.push({ ...s, _type: s.type });
  }
  timeline.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''));

  return (
    <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 20px' }}>
      {/* Session header */}
      <div style={{ padding: '16px 0 14px', borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#101828', fontFamily: 'JetBrains Mono, monospace' }}>
            {trace.session_id}
          </h3>
          <span style={{
            fontSize: 11, fontWeight: 600, color: meta.color,
            background: meta.bg, padding: '2px 8px', borderRadius: 10,
          }}>
            {meta.label}
          </span>
          <Button
            size="small"
            onClick={() => setTtOpen(true)}
            style={{ marginLeft: 'auto', fontSize: 11, borderColor: '#000048', color: '#000048' }}
          >
            ⏪ Time-Travel
          </Button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', fontSize: 12, color: '#667085' }}>
          <span><strong>Model:</strong> {trace.model_id}</span>
          <span><strong>User:</strong> {trace.user}</span>
          <span><strong>Client:</strong> {trace.client}</span>
          <span><strong>Duration:</strong> {fmtMs(trace.duration_ms)}</span>
          <span><strong>Tokens:</strong> {(trace.input_tokens + trace.output_tokens).toLocaleString()}</span>
          <span><strong>Cost:</strong> ${trace.total_cost_usd?.toFixed(4)}</span>
        </div>
      </div>

      <Drawer
        title={`Time-Travel — ${trace.session_id}`}
        open={ttOpen}
        onClose={() => setTtOpen(false)}
        width={400}
        placement="right"
      >
        <p style={{ fontSize: 12, color: '#667085', marginBottom: 16 }}>
          Replay session state at any point in the execution timeline.
        </p>
        <div style={{ marginBottom: 20 }}>
          {(trace.thought_steps || []).map((step, i) => (
            <div key={step.type ? `${step.type}-${i}` : i} style={{
              padding: '8px 12px', marginBottom: 6, borderRadius: 4,
              background: i === (trace.thought_steps.length - 1) ? 'rgba(0,0,72,0.05)' : '#F8F9FB',
              border: `1px solid ${i === (trace.thought_steps.length - 1) ? '#000048' : '#E2E8F0'}`,
              cursor: 'pointer', fontSize: 11,
            }}>
              <div style={{ fontWeight: 600, color: '#344054', marginBottom: 2 }}>
                Step {i + 1} · {step.type}
              </div>
              <div style={{ color: '#667085', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {step.content || step.message || '—'}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#98A2B3' }}>
          Click a step to restore state at that checkpoint (simulation only).
        </p>
      </Drawer>

      {/* Timeline */}
      <div>
        {timeline.map((step, i) => (
          <TimelineStep key={step.ts || step.id || i} step={step} isLast={i === timeline.length - 1} />
        ))}
      </div>

      {/* Session close bar */}
      <div style={{
        marginTop: 12, padding: '10px 14px',
        background: trace.status === 'success' ? '#ECFDF3' : '#FEF3F2',
        borderRadius: 4, border: `1px solid ${trace.status === 'success' ? '#ABEFC6' : '#FECDCA'}`,
        fontSize: 12, color: meta.color, fontWeight: 500,
      }}>
        {trace.status === 'success'
          ? `Session completed — ${trace.input_tokens}↑ ${trace.output_tokens}↓ tokens · $${trace.total_cost_usd?.toFixed(4)} · ${fmtMs(trace.duration_ms)}`
          : `Session failed — ${trace.incident || 'unknown error'} · ${fmtMs(trace.duration_ms)}`}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const Audit = ({ agentFilter }) => {
  const { tenant } = useTenant();
  const [agents,        setAgents]        = useState([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedHours, setSelectedHours] = useState(24);
  const [traces,        setTraces]        = useState([]);
  const [activeTrace,   setActiveTrace]   = useState(null);
  const [loading,       setLoading]       = useState(false);
  const [fetched,       setFetched]       = useState(false);

  const fetchTraces = (agentId, hours) => {
    setLoading(true);
    setActiveTrace(null);
    getAuditTraces().then(allTraces => {
      const agentTraces = allTraces[agentId] || [];
      const cutoff = new Date(Date.now() - hours * 3600 * 1000);
      const filtered = agentTraces.filter(t => new Date(t.started_at) >= cutoff);
      filtered.sort((a, b) => b.started_at.localeCompare(a.started_at));
      setTraces(filtered);
      setActiveTrace(filtered[0] || null);
      setFetched(true);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => {
    getAgents().then(d => {
      setAgents(d.agents);
      if (d.agents?.length > 0) {
        // Pre-select agentFilter if provided (Workbench context), else default to first agent
        const preselect = agentFilter
          ? (d.agents.find(a => a.name === agentFilter || a.id === agentFilter)?.id || d.agents[0].id)
          : d.agents[0].id;
        setSelectedAgent(preselect);
        fetchTraces(preselect, 24);
      }
    }).catch(() => {});
  }, [agentFilter, tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const agentOptions = agents.map(a => ({ value: a.id, label: a.name }));

  const handleFetch = () => {
    if (!selectedAgent) return;
    fetchTraces(selectedAgent, selectedHours);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Controls */}
      <div className="vfo-card" style={{ padding: '14px 16px', marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-end', gap: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Agent
            </label>
            <Select
              placeholder="Select agent"
              value={selectedAgent || undefined}
              onChange={setSelectedAgent}
              options={agentOptions}
              loading={agents.length === 0}
              style={{ width: 220 }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
              Time Range
            </label>
            <Select value={selectedHours} onChange={setSelectedHours} options={HOURS_OPTIONS} style={{ width: 140 }} />
          </div>
          <Button
            type="primary"
            disabled={!selectedAgent}
            loading={loading}
            onClick={handleFetch}
          >
            Fetch Traces
          </Button>
        </div>
      </div>

      {/* Master-detail split */}
      <div
        className="vfo-card"
        style={{
          flex:     1,
          display:  'flex',
          overflow: 'hidden',
          minHeight: 0,
        }}
      >
        {/* ── Left: Session List ── */}
        <div style={{
          width:       280,
          flexShrink:  0,
          borderRight: '1px solid #E2E8F0',
          display:     'flex',
          flexDirection: 'column',
          overflow:    'hidden',
        }}>
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sessions
              {traces.length > 0 && (
                <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#101828' }}>
                  {traces.length}
                </span>
              )}
            </p>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loading && <SkeletonRows rows={6} cols={1} />}

            {!loading && !fetched && (
              <EmptyState
                icon="select"
                title="No agent selected"
                description="Select an agent from the fleet to pull its execution traces."
                iconSize={28}
                style={{ padding: '32px 16px' }}
              />
            )}

            {!loading && fetched && traces.length === 0 && (
              <EmptyState
                icon="inbox"
                title="No execution sessions found"
                description="No agent sessions were recorded in this time window — expand the range or verify telemetry ingestion is active."
                iconSize={28}
                style={{ padding: '32px 16px' }}
              />
            )}

            {!loading && traces.map(trace => (
              <SessionItem
                key={trace.session_id}
                trace={trace}
                isActive={activeTrace?.session_id === trace.session_id}
                onClick={() => setActiveTrace(trace)}
              />
            ))}
          </div>
        </div>

        {/* ── Right: Detail / Timeline ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              <SkeletonTimeline rows={5} />
            </div>
          ) : (
            <DetailPane trace={activeTrace} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Audit;

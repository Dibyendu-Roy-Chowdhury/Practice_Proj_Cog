import React, { useState, useEffect } from 'react';
import { Spin, Table, Input, Tooltip, Alert } from 'antd';
import { Network, MessageSquare, Activity, Zap } from 'lucide-react';
import MeshTopologyGraph from '../components/features/mesh/MeshTopologyGraph';
import LoopDetectionPanel from '../components/features/mesh/LoopDetectionPanel';
import SemanticConsistencyChart from '../components/features/mesh/SemanticConsistencyChart';
import RelayChainStepper from '../components/features/mesh/RelayChainStepper';
import { getMeshTopology, getInterAgentMessages, getLoopDetections, getMeshSemanticConsistency } from '../services/API_services';
import MetricLabel, { METRIC_TOOLTIPS } from '../components/common/MetricLabel';

// ── Shared KPI tile ───────────────────────────────────────────────────────────
const Tile = ({ label, value, sub, accent, Icon }) => (
  <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8,
    padding: '14px 18px', flex: 1, minWidth: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
      {Icon && <Icon size={13} style={{ color: '#94A3B8' }} strokeWidth={1.5} />}
      <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#94A3B8',
        textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</p>
    </div>
    <p style={{ margin: '0 0 2px', fontSize: 22, fontWeight: 800,
      color: accent ?? '#101828', fontVariantNumeric: 'tabular-nums',
      letterSpacing: '-0.02em' }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 11, color: '#94A3B8' }}>{sub}</p>}
  </div>
);

// ── Mesh Health Score ─────────────────────────────────────────────────────────
const HealthScore = ({ score }) => {
  const color = score >= 85 ? '#10B981' : score >= 65 ? '#F59E0B' : '#EF4444';
  const label = score >= 85 ? 'Healthy' : score >= 65 ? 'Degraded' : 'Critical';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ position: 'relative', width: 52, height: 52 }}>
        <svg viewBox="0 0 52 52" style={{ transform: 'rotate(-90deg)' }}>
          <circle cx="26" cy="26" r="22" fill="none" stroke="#F1F5F9" strokeWidth="5" />
          <circle cx="26" cy="26" r="22" fill="none" stroke={color} strokeWidth="5"
            strokeDasharray={`${(score / 100) * 138.2} 138.2`}
            strokeLinecap="round" />
        </svg>
        <span style={{ position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 800, color }}>
          {score}
        </span>
      </div>
      <div>
        <p style={{ margin: '0 0 1px', fontSize: 13, fontWeight: 700, color }}>{label}</p>
        <MetricLabel label="Mesh health score" tooltip={METRIC_TOOLTIPS.meshHealthScore} />
      </div>
    </div>
  );
};

// ── Message type badge ────────────────────────────────────────────────────────
const TYPE_META = {
  task_delegation:   { color: '#00B5E2', bg: '#E0F2FE', label: 'Delegation'  },
  result_relay:      { color: '#10B981', bg: '#ECFDF3', label: 'Result'      },
  health_ping:       { color: '#94A3B8', bg: '#F1F5F9', label: 'Ping'        },
  error_propagation: { color: '#EF4444', bg: '#FEF3F2', label: 'Error'       },
};

const HANDSHAKE_META = {
  ack:     { color: '#10B981', label: 'ACK'     },
  pending: { color: '#F59E0B', label: 'Pending' },
  timeout: { color: '#F59E0B', label: 'Timeout' },
  error:   { color: '#EF4444', label: 'Error'   },
};

// ── Inter-Agent Message Feed (M2) ─────────────────────────────────────────────
const MessageFeed = ({ messages, loading, showPayload }) => {
  const [search, setSearch] = useState('');

  const filtered = messages.filter(m =>
    !search ||
    m.source_agent_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.target_agent_name?.toLowerCase().includes(search.toLowerCase()) ||
    m.payload_summary?.toLowerCase().includes(search.toLowerCase())
  );

  const columns = [
    {
      title: 'Source → Target', key: 'route', width: '22%',
      render: (_, r) => (
        <span style={{ fontSize: 11 }}>
          <span style={{ fontWeight: 600, color: '#101828' }}>{r.source_agent_name}</span>
          <span style={{ color: '#94A3B8', margin: '0 4px' }}>→</span>
          <span style={{ fontWeight: 600, color: '#101828' }}>{r.target_agent_name}</span>
        </span>
      ),
    },
    {
      title: 'Type', dataIndex: 'message_type', key: 'type', width: '11%',
      render: v => {
        const m = TYPE_META[v] ?? { color: '#94A3B8', bg: '#F1F5F9', label: v };
        return (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px',
            borderRadius: 99, background: m.bg, color: m.color }}>
            {m.label}
          </span>
        );
      },
    },
    {
      title: 'Payload', dataIndex: 'payload_summary', key: 'payload', width: '30%',
      render: (summary, r) => (
        <Tooltip title={showPayload ? r.payload_raw : undefined} overlayStyle={{ maxWidth: 480 }}>
          <span style={{ fontSize: 11, color: '#475569', cursor: showPayload ? 'help' : 'default' }}>
            {summary}
          </span>
        </Tooltip>
      ),
    },
    {
      title: 'Latency', dataIndex: 'latency_ms', key: 'latency', width: '9%',
      render: v => {
        const color = v == null ? '#94A3B8' : v < 500 ? '#10B981' : v < 1500 ? '#F59E0B' : '#EF4444';
        return (
          <span style={{ fontSize: 11, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
            {v != null ? `${v}ms` : '—'}
          </span>
        );
      },
    },
    {
      title: 'Status', dataIndex: 'handshake_status', key: 'status', width: '9%',
      render: v => {
        const m = HANDSHAKE_META[v] ?? { color: '#94A3B8', label: v };
        return (
          <span style={{ fontSize: 11, fontWeight: 600, color: m.color }}>{m.label}</span>
        );
      },
    },
    {
      title: 'Timestamp', dataIndex: 'timestamp', key: 'ts', width: '11%',
      render: v => (
        <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8' }}>
          {v?.slice(11, 19)}
        </span>
      ),
    },
  ];

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8,
      overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #F1F5F9',
        display: 'flex', alignItems: 'center', gap: 8 }}>
        <MessageSquare size={14} style={{ color: '#00B5E2' }} strokeWidth={1.5} />
        <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>
          Message Feed
        </span>
        <span style={{ fontSize: 11, color: '#94A3B8' }}>
          {showPayload ? 'Hover payload column to inspect raw JSON' : 'Showing payload summaries'}
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <Input.Search
            placeholder="Filter agents or payload…"
            allowClear
            size="small"
            style={{ width: 220 }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>
      <Table
        dataSource={filtered}
        columns={columns}
        rowKey="id"
        size="small"
        loading={loading}
        pagination={{ pageSize: 6, showSizeChanger: false, size: 'small' }}
        locale={{ emptyText: 'No messages match the current filter' }}
      />
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgentMesh({ onNavigate }) {
  const [topology,  setTopology]  = useState(null);
  const [messages,  setMessages]  = useState([]);
  const [loops,     setLoops]     = useState([]);
  const [chains,    setChains]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [msgLoad,   setMsgLoad]   = useState(true);
  const [error,     setError]     = useState(null);

  useEffect(() => {
    getMeshTopology()
      .then(setTopology)
      .catch(e => setError(e?.message || 'Failed to load mesh topology'))
      .finally(() => setLoading(false));
    getInterAgentMessages()
      .then(setMessages)
      .finally(() => setMsgLoad(false));
    getLoopDetections()
      .then(d => setLoops(Array.isArray(d) ? d : (d?.loops ?? [])))
      .catch(() => {});
    getMeshSemanticConsistency()
      .then(d => setChains(Array.isArray(d) ? d : (d?.chains ?? [])))
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  const nodes    = topology?.nodes ?? [];
  const edges    = topology?.edges ?? [];
  const healthy  = nodes.filter(n => n.status === 'healthy').length;
  const degraded = nodes.filter(n => n.status === 'degraded').length;
  const active   = edges.filter(e => e.handshake_status === 'established').length;
  const totalMsg = nodes.reduce((s, n) => s + (n.message_count_1h ?? 0), 0);

  return (
    <div>
      {error && <Alert type="error" message={error} showIcon closable style={{ marginBottom: 16 }} />}
      {/* KPI strip */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'stretch' }}>
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8,
          padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', display: 'flex', alignItems: 'center' }}>
          <HealthScore score={topology?.mesh_health_score ?? 0} />
        </div>
        <Tile label="Active Nodes"   value={`${healthy} / ${nodes.length}`}  sub="healthy vs total"
          accent={healthy === nodes.length ? '#10B981' : '#F59E0B'} Icon={Network} />
        <Tile label="Active Edges"   value={`${active} / ${edges.length}`}   sub="established channels"
          accent={active === edges.length ? '#10B981' : '#F59E0B'} Icon={Activity} />
        <Tile label="Messages / hr"  value={totalMsg.toLocaleString()}        sub="all mesh traffic"
          accent="#00B5E2" Icon={Zap} />
        {degraded > 0 && (
          <Tile label="Degraded Nodes" value={degraded} sub="below SLA threshold"
            accent="#EF4444" Icon={Activity} />
        )}
      </div>

      {/* Topology map */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Network size={14} style={{ color: '#00B5E2' }} strokeWidth={1.5} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Agent Communication Topology</span>
          <span style={{ fontSize: 11, color: '#94A3B8' }}>
            Click any node to inspect its profile — edge thickness reflects message volume
          </span>
        </div>
        <MeshTopologyGraph
          nodes={nodes}
          edges={edges}
          compact={false}
          onViewLogs={onNavigate ? (agentName) => onNavigate('2', { tab: 'troubleshoot', agentId: agentName }) : undefined}
        />
      </div>

      {/* Message stream — Forge sees full table; Lite sees condensed status */}
      <MessageFeed messages={messages} loading={msgLoad} showPayload />

      {/* Relay Chain Stepper — visual handshake trace for recent messages */}
      {messages.length > 0 && (
        <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px 20px', marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <MessageSquare size={14} style={{ color: '#000048' }} strokeWidth={1.5} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Relay Chain Trace</span>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>Handshake status for the last 5 inter-agent messages</span>
          </div>
          <RelayChainStepper messages={messages.slice(0, 5)} showPayload />
        </div>
      )}

      {/* Loop Detection */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px 20px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Zap size={14} style={{ color: '#EF4444' }} strokeWidth={1.5} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Loop Detection</span>
        </div>
        <LoopDetectionPanel
          loops={loops}
          onTerminate={(loopId) => setLoops(prev => prev.filter(l => l.id !== loopId))}
        />
      </div>

      {/* Semantic Consistency */}
      <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '16px 20px', marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Activity size={14} style={{ color: '#00B5E2' }} strokeWidth={1.5} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>Semantic Consistency</span>
        </div>
        <SemanticConsistencyChart chains={chains} threshold={0.80} />
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';

const W = 820;
const H = 400;
const R = 30; // node radius

const STATUS_COLOR = {
  healthy:     '#10B981',
  degraded:    '#F59E0B',
  quarantined: '#EF4444',
  inactive:    '#64748B',
};

const EDGE_COLOR = {
  established: '#10B981',
  degraded:    '#F59E0B',
  failed:      '#EF4444',
};

const ROLE_LABEL = {
  orchestrator: 'Orchestrator',
  worker:       'Worker',
  relay:        'Relay',
  leaf:         'Leaf',
};

const MSG_TYPES = {
  task_delegation:   { color: '#00B5E2', label: 'Delegation' },
  result_relay:      { color: '#10B981', label: 'Result'     },
  health_ping:       { color: '#94A3B8', label: 'Ping'       },
  error_propagation: { color: '#EF4444', label: 'Error'      },
};

// Map node x/y (0–100 %) to SVG coords
const toSvg = (n) => ({ cx: (n.x / 100) * W, cy: (n.y / 100) * H });

// Point on node boundary toward target
const boundary = (src, tgt, offset = R + 4) => {
  const dx = tgt.cx - src.cx;
  const dy = tgt.cy - src.cy;
  const d  = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: src.cx + (dx / d) * offset, y: src.cy + (dy / d) * offset };
};

// Perpendicular mid-point for a gentle curve
const ctrl = (x1, y1, x2, y2, bend = 0.18) => ({
  cx: (x1 + x2) / 2 - (y2 - y1) * bend,
  cy: (y1 + y2) / 2 + (x2 - x1) * bend,
});

const edgeW = (count) => Math.max(1.5, Math.min(4.0, 1.2 + count / 80));

// ── Legend chip ───────────────────────────────────────────────────────────────
const LegendChip = ({ color, label }) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#94A3B8' }}>
    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
    {label}
  </span>
);

// ── Node detail panel ─────────────────────────────────────────────────────────
const NodeDetail = ({ node, onClose, onViewLogs }) => {
  if (!node) return null;
  const col = STATUS_COLOR[node.status] ?? '#94A3B8';
  return (
    <div style={{ background: '#1E293B', border: `1px solid ${col}40`, borderRadius: 8,
      padding: '14px 16px', minWidth: 220 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#E2E8F0' }}>{node.name}</span>
        <button onClick={onClose}
          style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>
          ×
        </button>
      </div>
      {[
        { label: 'Role',          value: ROLE_LABEL[node.role] ?? node.role },
        { label: 'Status',        value: node.status,            color: col },
        { label: 'Load',          value: `${Math.round(node.load * 100)}%`, color: node.load > 0.75 ? '#F59E0B' : '#10B981' },
        { label: 'Messages / hr', value: node.message_count_1h ?? 0 },
      ].map(({ label, value, color }) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11, color: '#64748B' }}>{label}</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: color ?? '#94A3B8', textTransform: 'capitalize' }}>{value}</span>
        </div>
      ))}
      {onViewLogs && (
        <button
          onClick={() => onViewLogs(node.name)}
          style={{ marginTop: 10, width: '100%', background: 'none', border: '1px solid #334155',
            borderRadius: 5, color: '#00B5E2', fontSize: 11, fontWeight: 600,
            cursor: 'pointer', padding: '5px 0', display: 'flex', alignItems: 'center',
            justifyContent: 'center', gap: 4 }}
          onMouseEnter={e => { e.currentTarget.style.background = '#0F172A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        >
          View Logs →
        </button>
      )}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────
export default function MeshTopologyGraph({ nodes = [], edges = [], compact = false, onViewLogs }) {
  const [selected, setSelected] = useState(null);

  const posMap = useMemo(() => {
    const m = {};
    nodes.forEach(n => { m[n.id] = toSvg(n); });
    return m;
  }, [nodes]);

  const selectedNode = nodes.find(n => n.id === selected) ?? null;

  return (
    <div>
      <style>{`
        @keyframes meshFlow   { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
        @keyframes meshFlowSlow { from { stroke-dashoffset: 24; } to { stroke-dashoffset: 0; } }
        @keyframes meshPing   { 0%,100% { opacity: 0.18; } 50% { opacity: 0; } }
      `}</style>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>

        {/* SVG canvas */}
        <div style={{ flex: 1, background: '#0F172A', borderRadius: 8, overflow: 'hidden',
          border: '1px solid #1E293B', minWidth: 0 }}>
          <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
            <defs>
              {/* Grid dot pattern */}
              <pattern id="meshGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1.2" fill="#1E293B" />
              </pattern>
              {/* Arrowhead markers */}
              {Object.entries(EDGE_COLOR).map(([key, col]) => (
                <marker key={key} id={`arr-${key}`} markerWidth="7" markerHeight="7"
                  refX="4.5" refY="3.5" orient="auto">
                  <polygon points="0 0, 7 3.5, 0 7" fill={col} />
                </marker>
              ))}
              <marker id="arr-error" markerWidth="7" markerHeight="7"
                refX="4.5" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="#EF4444" />
              </marker>
            </defs>

            {/* Background */}
            <rect width={W} height={H} fill="url(#meshGrid)" />

            {/* ── Edges ─────────────────────────────────────────────────── */}
            {edges.map(e => {
              const s = posMap[e.source];
              const t = posMap[e.target];
              if (!s || !t) return null;
              const from = boundary(s, t, R + 4);
              const to   = boundary(t, s, R + 10);
              const cp   = ctrl(from.x, from.y, to.x, to.y);
              const col  = EDGE_COLOR[e.handshake_status] ?? '#94A3B8';
              const w    = edgeW(e.message_count_1h);
              const path = `M${from.x},${from.y} Q${cp.cx},${cp.cy} ${to.x},${to.y}`;
              const slow = e.handshake_status === 'degraded';
              const markerId = `arr-${e.handshake_status ?? 'established'}`;

              return (
                <g key={e.id}>
                  {/* Dim halo */}
                  <path d={path} fill="none" stroke={col} strokeOpacity={0.12} strokeWidth={w + 3} />
                  {/* Animated flow line */}
                  <path d={path} fill="none" stroke={col} strokeOpacity={0.9} strokeWidth={w}
                    strokeDasharray="8 5"
                    markerEnd={`url(#${markerId})`}
                    style={{ animation: `meshFlow ${slow ? '1.4s' : '0.75s'} linear infinite` }}
                  />
                  {/* Latency label on hover zone (static) */}
                  <title>{`${e.source} → ${e.target}  avg: ${e.avg_latency_ms}ms  p99: ${e.p99_latency_ms}ms  msgs/hr: ${e.message_count_1h}`}</title>
                </g>
              );
            })}

            {/* ── Nodes ─────────────────────────────────────────────────── */}
            {nodes.map(n => {
              const { cx, cy } = posMap[n.id];
              const col  = STATUS_COLOR[n.status] ?? '#94A3B8';
              const isSel = selected === n.id;
              const isQ   = n.status === 'quarantined';
              const isDeg = n.status === 'degraded';
              const initials = n.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

              return (
                <g key={n.id} onClick={() => setSelected(isSel ? null : n.id)}
                  style={{ cursor: 'pointer' }}>
                  <title>{`${n.name} (${n.status}) — load: ${Math.round(n.load * 100)}%`}</title>

                  {/* Pulse ring for alert states */}
                  {(isQ || isDeg) && (
                    <circle cx={cx} cy={cy} r={R + 10} fill={col} opacity={0.08}
                      style={{ animation: 'meshPing 2.2s ease-in-out infinite' }} />
                  )}

                  {/* Selection ring */}
                  {isSel && (
                    <circle cx={cx} cy={cy} r={R + 7} fill="none"
                      stroke="#00B5E2" strokeWidth={2} strokeDasharray="4 3" opacity={0.8} />
                  )}

                  {/* Load arc — sweeps clockwise from top */}
                  {n.load > 0 && (() => {
                    const r2 = R - 5;
                    const ang = n.load * 359.9; // avoid full-circle edge case
                    const rad = (ang - 90) * (Math.PI / 180);
                    const ex = cx + r2 * Math.cos(rad);
                    const ey = cy + r2 * Math.sin(rad);
                    const lg = ang > 180 ? 1 : 0;
                    return (
                      <path d={`M${cx},${cy - r2} A${r2},${r2} 0 ${lg} 1 ${ex},${ey}`}
                        fill="none" stroke={col} strokeWidth={3}
                        strokeLinecap="round" opacity={0.55} />
                    );
                  })()}

                  {/* Node body */}
                  <circle cx={cx} cy={cy} r={R}
                    fill={isQ ? '#1A0A0A' : '#0F172A'}
                    stroke={col} strokeWidth={isSel ? 2.5 : 1.8}
                    opacity={isQ ? 0.7 : 1} />

                  {/* Quarantine lock icon (×) */}
                  {isQ
                    ? <text x={cx} y={cy + 4} textAnchor="middle" fill={col} fontSize={16} fontWeight={700}>🔒</text>
                    : <text x={cx} y={cy + 4} textAnchor="middle" dominantBaseline="middle"
                        fill={col} fontSize={11} fontWeight={800} fontFamily="'JetBrains Mono', monospace">
                        {initials}
                      </text>
                  }

                  {/* Name label */}
                  <text x={cx} y={cy + R + 14} textAnchor="middle"
                    fill={isQ ? '#64748B' : '#CBD5E1'} fontSize={9.5} fontWeight={600}>
                    {n.name.length > 16 ? n.name.slice(0, 15) + '…' : n.name}
                  </text>
                  {/* Role label */}
                  <text x={cx} y={cy + R + 25} textAnchor="middle" fill="#475569" fontSize={8.5}>
                    {ROLE_LABEL[n.role] ?? n.role}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Legend strip */}
          {!compact && (
            <div style={{ display: 'flex', gap: 16, padding: '8px 14px',
              borderTop: '1px solid #1E293B', flexWrap: 'wrap' }}>
              <LegendChip color="#10B981" label="Healthy" />
              <LegendChip color="#F59E0B" label="Degraded" />
              <LegendChip color="#EF4444" label="Quarantined" />
              <span style={{ marginLeft: 'auto', display: 'flex', gap: 12 }}>
                <LegendChip color="#10B981" label="Edge: established" />
                <LegendChip color="#F59E0B" label="Edge: degraded" />
              </span>
            </div>
          )}
        </div>

        {/* Node detail panel */}
        {selectedNode && !compact && (
          <NodeDetail node={selectedNode} onClose={() => setSelected(null)} onViewLogs={onViewLogs} />
        )}
      </div>
    </div>
  );
}

export { MSG_TYPES };

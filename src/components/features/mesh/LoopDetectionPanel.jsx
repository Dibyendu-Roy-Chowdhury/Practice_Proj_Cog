import React from 'react';
import { Button, message as antMsg } from 'antd';
import { AlertTriangle, CheckCircle, Eye, XCircle, ArrowRight } from 'lucide-react';
import MetricLabel, { METRIC_TOOLTIPS } from '../../common/MetricLabel';

const RISK_STYLE = {
  High:   { bg: '#FEF3F2', fg: '#EF4444', border: '#FEE4E2' },
  Medium: { bg: '#FFFAEB', fg: '#F59E0B', border: '#FDE68A' },
  Low:    { bg: '#ECFDF3', fg: '#10B981', border: '#A7F3D0' },
};

const STATUS_META = {
  active:     { Icon: AlertTriangle, color: '#EF4444', label: 'Active'     },
  monitoring: { Icon: Eye,           color: '#F59E0B', label: 'Monitoring' },
  terminated: { Icon: CheckCircle,   color: '#10B981', label: 'Terminated' },
};

// Inline cycle-path diagram
const CycleChain = ({ chain }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
    {chain.map((name, i) => (
      <React.Fragment key={i}>
        <span style={{
          fontSize: 10, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
          background: i === 0 ? '#EFF6FF' : i === chain.length - 1 ? '#FEF3F2' : '#F8FAFC',
          color:      i === 0 ? '#2563EB' : i === chain.length - 1 ? '#EF4444' : '#475569',
          border: `1px solid ${i === 0 ? '#BFDBFE' : i === chain.length - 1 ? '#FEE4E2' : '#E2E8F0'}`,
          whiteSpace: 'nowrap',
        }}>
          {name}
        </span>
        {i < chain.length - 1 && (
          <ArrowRight size={10} style={{ color: '#94A3B8', flexShrink: 0 }} />
        )}
      </React.Fragment>
    ))}
  </div>
);

// TTL progress bar
const TtlBar = ({ current, max }) => {
  const pct = Math.min(100, (current / max) * 100);
  const color = pct >= 90 ? '#EF4444' : pct >= 60 ? '#F59E0B' : '#10B981';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 5, background: '#F1F5F9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color,
          borderRadius: 3, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 10, fontVariantNumeric: 'tabular-nums',
        color, fontWeight: 700, minWidth: 36 }}>
        {current} / {max}
      </span>
    </div>
  );
};

export default function LoopDetectionPanel({ loops = [], onTerminate }) {

  const handleTerminate = (loopId) => {
    onTerminate?.(loopId);
    antMsg.success('Loop termination signal sent — TTL counter reset');
  };

  if (loops.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 8, padding: '28px 0', color: '#10B981', fontSize: 13 }}>
        <CheckCircle size={16} />
        <span style={{ fontWeight: 600 }}>No active or monitoring loops — mesh is cycle-free</span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {loops.map(loop => {
        const rs  = RISK_STYLE[loop.risk] ?? RISK_STYLE.Low;
        const sm  = STATUS_META[loop.status] ?? STATUS_META.terminated;
        const { Icon } = sm;
        const isActive = loop.status === 'active' || loop.status === 'monitoring';

        return (
          <div key={loop.id} style={{
            background: 'white', border: `1px solid ${loop.status === 'active' ? rs.border : '#E2E8F0'}`,
            borderRadius: 8, padding: '12px 16px',
            boxShadow: loop.status === 'active' ? `0 0 0 3px ${rs.bg}` : '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Icon size={14} style={{ color: sm.color, flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#101828' }}>{loop.id.toUpperCase()}</span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99,
                background: rs.bg, color: rs.fg, border: `1px solid ${rs.border}` }}>
                {loop.risk}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: sm.color, marginLeft: 2 }}>
                {sm.label}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: 10, color: '#94A3B8', fontFamily: 'monospace' }}>
                {loop.detected_at?.slice(0, 16)}
              </span>
            </div>

            {/* Cycle path */}
            <div style={{ marginBottom: 10 }}>
              <CycleChain chain={loop.chain} />
            </div>

            {/* TTL progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <MetricLabel label="Iterations" tooltip={METRIC_TOOLTIPS.ttlCeiling} size={10} color="#64748B" />
              <div style={{ flex: 1 }}>
                <TtlBar current={loop.iteration_count} max={loop.ttl_ceiling} />
              </div>
              {isActive && (
                <Button
                  danger size="small"
                  icon={<XCircle size={11} strokeWidth={2} />}
                  onClick={() => handleTerminate(loop.id)}
                  style={{ fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  Terminate
                </Button>
              )}
              {loop.status === 'terminated' && (
                <span style={{ fontSize: 10, color: '#10B981', fontWeight: 600 }}>Auto-terminated at TTL</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

const HANDSHAKE_META = {
  ack:     { Icon: CheckCircle,  color: '#10B981', label: 'ACK'     },
  pending: { Icon: AlertTriangle, color: '#F59E0B', label: 'Pending' },
  timeout: { Icon: AlertTriangle, color: '#F59E0B', label: 'Timeout' },
  error:   { Icon: XCircle,      color: '#EF4444', label: 'Error'   },
};

const MSG_TYPE_COLOR = {
  task_delegation:   '#00B5E2',
  result_relay:      '#10B981',
  health_ping:       '#94A3B8',
  error_propagation: '#EF4444',
};

const latencyColor = (ms) => {
  if (ms == null) return '#94A3B8';
  if (ms < 500)   return '#10B981';
  if (ms < 1500)  return '#F59E0B';
  return '#EF4444';
};

export default function RelayChainStepper({ messages = [], showPayload = false }) {
  if (messages.length === 0) {
    return (
      <p style={{ textAlign: 'center', color: '#94A3B8', fontSize: 13, padding: '20px 0' }}>
        No relay chain messages to display
      </p>
    );
  }

  return (
    <div style={{ position: 'relative' }}>
      {messages.map((msg, i) => {
        const hm   = HANDSHAKE_META[msg.handshake_status] ?? HANDSHAKE_META.ack;
        const { Icon } = hm;
        const typeColor = MSG_TYPE_COLOR[msg.message_type] ?? '#94A3B8';
        const isLast = i === messages.length - 1;

        return (
          <div key={msg.id} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            {/* Connector line */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 20 }}>
              <Icon size={16} style={{ color: hm.color, flexShrink: 0, marginTop: 2 }} />
              {!isLast && (
                <div style={{ width: 1, flex: 1, background: '#E2E8F0',
                  margin: '4px 0', minHeight: 20 }} />
              )}
            </div>

            {/* Card */}
            <div style={{
              flex: 1, marginBottom: isLast ? 0 : 10,
              background: 'white', border: '1px solid #E2E8F0', borderRadius: 6,
              padding: '10px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            }}>
              {/* Source → Target */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#101828' }}>
                  {msg.source_agent_name}
                </span>
                <span style={{ fontSize: 10, color: '#94A3B8' }}>→</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#101828' }}>
                  {msg.target_agent_name}
                </span>
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 700,
                  padding: '1px 6px', borderRadius: 99,
                  background: `${typeColor}18`, color: typeColor, textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>
                  {msg.message_type?.replace(/_/g, ' ')}
                </span>
              </div>

              {/* Summary */}
              <p style={{ margin: '0 0 5px', fontSize: 11, color: '#475569', lineHeight: 1.4 }}>
                {msg.payload_summary}
              </p>

              {/* Raw payload (Forge-only: caller must pass showPayload=true) */}
              {showPayload && msg.payload_raw && (
                <pre style={{
                  margin: '5px 0', fontSize: 10, color: '#94A3B8',
                  background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 4, padding: '6px 8px', overflowX: 'auto',
                  fontFamily: "'JetBrains Mono', monospace", whiteSpace: 'pre-wrap',
                }}>
                  {msg.payload_raw}
                </pre>
              )}

              {/* Meta row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#94A3B8' }}>
                  {msg.timestamp?.slice(11, 19)}
                </span>
                <span style={{ fontSize: 10, fontWeight: 700,
                  color: latencyColor(msg.latency_ms) }}>
                  {msg.latency_ms != null ? `${msg.latency_ms}ms` : '—'}
                </span>
                <span style={{ fontSize: 10, color: hm.color, fontWeight: 600 }}>
                  {hm.label}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

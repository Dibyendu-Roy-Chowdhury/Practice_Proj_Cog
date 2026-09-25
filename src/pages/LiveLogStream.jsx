import React, { useState } from 'react';
import { Select, Input, Tooltip, Button } from 'antd';
import { Search, Wrench, ShieldCheck } from 'lucide-react';
import PageHeader from '../components/layout/PageHeader';
import RemediationDrawer from '../components/features/runbooks/RemediationDrawer';
import { maskPii } from '../utils/pii';
import { getLiveLogs } from '../services/API_services';

const LEVEL_COLORS = { INFO: '#0BA5EC', WARN: '#F79009', ERROR: '#F04438', DEBUG: '#98A2B3' };

// Generate timestamps anchored to the current time so the log stream always looks "live"
const relTs = (secsAgo) => {
  const d = new Date(Date.now() - secsAgo * 1000);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

// Derive log entries from SSOT — agent names and messages match the active tenant/env.
const buildLogs = () => {
  const raw = getLiveLogs();
  // Pad with platform-level entries so there are always ≥8 rows.
  const platform = [
    { id: 'p1', level: 'DEBUG', agentName: null, message: 'Token count validated — input: 1,847 tokens, output: 634 tokens, within budget: true', agentId: null },
    { id: 'p2', level: 'INFO',  agentName: null, message: 'Routing decision: claude-opus → claude-haiku (cost circuit breaker at 78%)', agentId: null },
    { id: 'p3', level: 'ERROR', agentName: 'Platform', message: 'HITL approval timeout — request escalated to L3 after 5 min (req: HITL-009)', agentId: null },
  ];
  return [...raw, ...platform].map((l, i) => ({
    id:        i + 1,
    timestamp: relTs(i * 90 + 30),
    level:     l.level,
    agent:     l.agentName || null,
    message:   l.message,
    requestId: `req_${(l.agentId || 'sys').replace('agent-', 'a')}_${String(1000 + i).slice(1)}`,
  }));
};

export default function LiveLogStream({ agentFilter }) {
  const [logLevel,   setLogLevel]   = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [logs] = useState(buildLogs);
  const [remedOpen,  setRemedOpen]  = useState(false);
  const [remedMsg,   setRemedMsg]   = useState('');
  const [remedAgent, setRemedAgent] = useState('');

  const filtered = logs.filter(log => {
    const lvlMatch = logLevel === 'all' || log.level.toLowerCase() === logLevel;
    const txtMatch = !searchTerm ||
      log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.requestId.toLowerCase().includes(searchTerm.toLowerCase());
    const agentMatch = !agentFilter || log.agent === agentFilter || log.agent === null;
    return lvlMatch && txtMatch && agentMatch;
  });

  const errorCount   = logs.filter(l => l.level === 'ERROR').length;
  const warnCount    = logs.filter(l => l.level === 'WARN').length;

  return (
    <div>
      <PageHeader
        actions={
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FEF3F2', color: '#F04438', fontWeight: 600 }}>
              {errorCount} exceptions
            </span>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FFFAEB', color: '#F59E0B', fontWeight: 600 }}>
              {warnCount} policy warnings
            </span>
          </div>
        }
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={logLevel}
          onChange={setLogLevel}
          style={{ width: 140 }}
          options={[
            { value: 'all',   label: 'All Levels' },
            { value: 'error', label: 'Error'      },
            { value: 'warn',  label: 'Warning'    },
            { value: 'info',  label: 'Info'       },
            { value: 'debug', label: 'Debug'      },
          ]}
        />
        <Input
          prefix={<Search size={13} strokeWidth={1.5} style={{ color: '#98A2B3' }} />}
          placeholder="Search logs or request ID..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ width: 280 }}
        />
        <Tooltip title="Log messages are scanned for PII patterns (email, tokens, card numbers) and redacted before display. Server-side redaction applies independently.">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10,
            fontWeight: 600, color: '#10B981', cursor: 'help' }}>
            <ShieldCheck size={12} strokeWidth={2} />
            PII Masked
          </span>
        </Tooltip>
        {agentFilter && (
          <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#FFFAEB', color: '#92400E', fontWeight: 600, border: '1px solid #FEF0C7' }}>
            Filtered: {agentFilter}
          </span>
        )}
        <span className="ml-auto text-xs text-ink-tertiary">{filtered.length} entries</span>
      </div>

      {/* Terminal log panel */}
      <div className="bg-[#0D1117] rounded border border-[#21262D] overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)', minHeight: 400 }}>
        {/* Column headers */}
        <div className="flex gap-3 px-4 py-2 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)', background: '#161B22' }}>
          <span style={{ color: '#3D444D', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, minWidth: 152 }}>Timestamp</span>
          <span style={{ color: '#3D444D', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, minWidth: 56 }}>Level</span>
          <span style={{ color: '#3D444D', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flex: 1 }}>Message</span>
          <span style={{ color: '#3D444D', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, minWidth: 100 }}>Request ID</span>
          <span style={{ color: '#3D444D', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0, minWidth: 120 }}>Action</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm" style={{ color: '#3D444D' }}>
            No events match the current filter — the fleet is operating within normal parameters.
          </div>
        ) : (
          filtered.map(log => (
            <div
              key={log.id}
              className="flex gap-3 px-4 py-2 vfo-code-block border-b items-center"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <span style={{ color: '#484F58', flexShrink: 0, minWidth: 152, fontSize: 11 }}>{log.timestamp}</span>
              <span
                style={{
                  color: LEVEL_COLORS[log.level] || '#94a3b8',
                  flexShrink: 0, minWidth: 56, fontSize: 11, fontWeight: 700,
                }}
              >
                {log.level}
              </span>
              <span style={{ color: '#CDD9E5', flex: 1, fontSize: 11, lineHeight: 1.5 }}>{maskPii(log.message)}</span>
              <span style={{ color: '#484F58', flexShrink: 0, minWidth: 100, fontSize: 10, fontFamily: 'monospace' }}>{log.requestId}</span>
              <div style={{ flexShrink: 0, minWidth: 120 }}>
                {log.level === 'ERROR' && (
                  <Button
                    type="primary"
                    size="small"
                    icon={<Wrench size={11} strokeWidth={1.5} />}
                    onClick={() => { setRemedMsg(log.message); setRemedAgent(log.agent || ''); setRemedOpen(true); }}
                    style={{ fontSize: 10 }}
                  >
                    Open Runbook
                  </Button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <RemediationDrawer
        open={remedOpen}
        onClose={() => setRemedOpen(false)}
        errorMessage={remedMsg}
        errorLevel="ERROR"
        agentName={remedAgent}
      />
    </div>
  );
}

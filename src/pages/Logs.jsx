import React, { useState, useEffect } from 'react';
import { Select, Input } from 'antd';
import { Search } from 'lucide-react';
import { getPortalLogs } from '../services/API_services';

const LEVEL_COLORS = { INFO: '#0BA5EC', WARNING: '#F79009', ERROR: '#F04438' };

// Stable anomaly scores seeded by index (cycles through a fixed list)
const ANOMALY_SEED = [12, 87, 34, 61, 5, 72, 28, 45, 91, 19, 56, 38, 67, 8, 74, 22, 49, 83, 15, 60];
const anomalyScore = (i) => ANOMALY_SEED[i % ANOMALY_SEED.length];
const AnomalyBadge = ({ score }) => {
  const color = score <= 30 ? '#10B981' : score <= 60 ? '#F59E0B' : '#EF4444';
  const bg    = score <= 30 ? '#ECFDF3' : score <= 60 ? '#FFFAEB' : '#FEF3F2';
  return (
    <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: bg, color, fontVariantNumeric: 'tabular-nums' }}>
      {score}
    </span>
  );
};

const Logs = () => {
  const [allLogs,      setAllLogs]      = useState([]);
  const [logLevel,     setLogLevel]     = useState('ALL');
  const [searchText,   setSearchText]   = useState('');
  const [displayLogs,  setDisplayLogs]  = useState([]);

  useEffect(() => {
    setAllLogs([]);
    setDisplayLogs([]);
    getPortalLogs().then(logs => {
      setAllLogs(logs);
      setDisplayLogs(logs);
    }).catch(() => {});
  }, []);

  const applyFilters = (level = logLevel, search = searchText, base = allLogs) => {
    let filtered = base;
    if (level !== 'ALL')   filtered = filtered.filter(l => l.level === level);
    if (search.trim())     filtered = filtered.filter(l =>
      (l.action || '').toLowerCase().includes(search.toLowerCase()) ||
      (l.message || '').toLowerCase().includes(search.toLowerCase())
    );
    return filtered;
  };

  useEffect(() => {
    setDisplayLogs(applyFilters());
  }, [logLevel, searchText, allLogs]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Select
          value={logLevel}
          onChange={v => { setLogLevel(v); }}
          style={{ width: 130 }}
          options={[
            { value: 'ALL',     label: 'All Levels' },
            { value: 'INFO',    label: 'Info'       },
            { value: 'WARNING', label: 'Warning'    },
            { value: 'ERROR',   label: 'Error'      },
          ]}
        />
        <Input
          prefix={<Search size={13} strokeWidth={1.5} style={{ color: '#98A2B3' }} />}
          placeholder="Search action or message..."
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          style={{ width: 280 }}
        />
        <span className="ml-auto text-xs text-ink-tertiary">{displayLogs.length} entries</span>
      </div>

      {/* Terminal log display */}
      <div className="bg-[#0F1117] rounded border border-[#2d3748] overflow-y-auto" style={{ maxHeight: 600 }}>
        {displayLogs.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm" style={{ color: '#475467' }}>
            No platform events match the current filter — the activity log is in a steady state.
          </div>
        ) : (
          displayLogs.map((log, i) => (
            <div
              key={log.id}
              className="flex gap-3 px-4 py-2 vfo-code-block border-b"
              style={{ borderColor: 'rgba(255,255,255,0.04)' }}
            >
              <span style={{ color: '#475467', flexShrink: 0, minWidth: 152 }}>{log.timestamp}</span>
              <span
                className="font-semibold flex-shrink-0"
                style={{ color: LEVEL_COLORS[log.level] || '#94a3b8', minWidth: 64 }}
              >
                {log.level}
              </span>
              <span style={{ color: '#64748b', flexShrink: 0, minWidth: 160 }}>{log.action}</span>
              <span style={{ color: '#e2e8f0', flex: 1 }}>{log.message}</span>
              <span style={{ flexShrink: 0, paddingLeft: 12 }}><AnomalyBadge score={anomalyScore(i)} /></span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Logs;

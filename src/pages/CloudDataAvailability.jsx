import React, { useState, useEffect, useCallback } from 'react';
import { Spin, Tag, Select, Button, message, Tooltip } from 'antd';
import { Cloud, RefreshCw, RotateCcw, CheckCircle, Clock, AlertTriangle, Database } from 'lucide-react';
import { getCloudStorageStatus, getCloudStorageRecords } from '../services/API_services';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PROVIDER_META = {
  aws:   { label: 'AWS S3',          color: '#FF9900', bg: '#FFF8F0', icon: '☁',  abbr: 'S3'   },
  azure: { label: 'Azure Blob',      color: '#0078D4', bg: '#F0F7FF', icon: '☁',  abbr: 'Blob' },
  gcp:   { label: 'GCP Cloud Stor.', color: '#4285F4', bg: '#F0F4FF', icon: '☁',  abbr: 'GCS'  },
};

const STATUS_STYLE = {
  synced:  { color: '#10B981', bg: '#ECFDF5', label: 'Synced'  },
  pending: { color: '#F59E0B', bg: '#FFFBEB', label: 'Pending' },
  failed:  { color: '#EF4444', bg: '#FEF2F2', label: 'Failed'  },
  skipped: { color: '#94A3B8', bg: '#F8FAFC', label: 'Skipped' },
};

const fmtTs = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} ${d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
};

const card = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' };

// ─── Provider health card ─────────────────────────────────────────────────────

const ProviderCard = ({ providerKey, healthEntry, configured }) => {
  const meta  = PROVIDER_META[providerKey] || { label: providerKey, color: '#64748B', bg: '#F8FAFC', abbr: providerKey.toUpperCase() };
  const alive = healthEntry?.status === 'ok' || healthEntry?.status === 'healthy';
  const statusColor = !configured ? '#94A3B8' : alive ? '#10B981' : '#EF4444';
  const statusLabel = !configured ? 'Not Configured' : alive ? 'Healthy' : 'Degraded';
  return (
    <div style={{ ...card, flex: 1, minWidth: 200, borderTop: `3px solid ${meta.color}` }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
            {meta.icon}
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#101828' }}>{meta.label}</p>
            <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{meta.abbr}</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: statusColor, display: 'inline-block' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: statusColor }}>{statusLabel}</span>
        </div>
      </div>
      {configured && healthEntry && (
        <div style={{ display: 'flex', gap: 16 }}>
          <div>
            <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Latency</p>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#101828', fontFamily: 'monospace' }}>
              {healthEntry.latency_ms != null ? `${healthEntry.latency_ms}ms` : '—'}
            </p>
          </div>
          {healthEntry.error && (
            <div style={{ flex: 1 }}>
              <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 600, color: '#EF4444', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Error</p>
              <p style={{ margin: 0, fontSize: 11, color: '#EF4444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{healthEntry.error}</p>
            </div>
          )}
        </div>
      )}
      {!configured && (
        <p style={{ margin: 0, fontSize: 11, color: '#CBD5E1' }}>
          Enable <code style={{ fontSize: 10 }}>CLOUD_{providerKey.toUpperCase()}_ENABLED=true</code> in server/.env to activate.
        </p>
      )}
    </div>
  );
};

// ─── Sync state mini-grid ─────────────────────────────────────────────────────

const SyncStateGrid = ({ syncState = {} }) => (
  <div style={{ display: 'flex', gap: 4 }}>
    {['aws', 'azure', 'gcp'].map(p => {
      const st = syncState[p]?.status || 'skipped';
      const s  = STATUS_STYLE[st] || STATUS_STYLE['skipped'];
      const meta = PROVIDER_META[p];
      return (
        <Tooltip key={p} title={`${meta?.label}: ${s.label}${syncState[p]?.error ? ` — ${syncState[p].error}` : ''}`}>
          <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: s.bg, color: s.color, fontWeight: 700, border: `1px solid ${s.color}44`, cursor: 'default' }}>
            {meta?.abbr || p.toUpperCase()}
          </span>
        </Tooltip>
      );
    })}
  </div>
);

// ─── KPI card ─────────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, color }) => (
  <div style={{ ...card, flex: 1, minWidth: 130 }}>
    <p style={{ margin: 0, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>{label}</p>
    <p style={{ margin: '4px 0 2px', fontSize: 26, fontWeight: 800, color: color || '#101828', lineHeight: 1.1 }}>{value}</p>
    {sub && <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>{sub}</p>}
  </div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: 'all',         label: 'All Record Types' },
  { value: 'eval',        label: 'Evaluations'      },
  { value: 'compliance',  label: 'Compliance'       },
  { value: 'agent',       label: 'Agent'            },
  { value: 'audit',       label: 'Audit'            },
];

export default function CloudDataAvailability() {
  const [status,    setStatus]    = useState(null);
  const [records,   setRecords]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [typeFilter, setTypeFilter] = useState('all');
  const [resyncing, setResyncing] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [st, rec] = await Promise.all([
      getCloudStorageStatus(),
      getCloudStorageRecords({ recordType: typeFilter !== 'all' ? typeFilter : undefined }),
    ]);
    setStatus(st);
    setRecords(rec ?? []);
    setLoading(false);
  }, [typeFilter]);

  useEffect(() => { load(); }, [load]);

  // Build health map: providerKey → healthEntry
  const healthMap = {};
  (status?.health ?? []).forEach(h => { healthMap[h.provider] = h; });
  const configuredProviders = status?.configured_providers ?? [];

  // Derive sync stats from records
  const syncStats = { synced: 0, pending: 0, failed: 0, skipped: 0 };
  records.forEach(r => {
    ['aws', 'azure', 'gcp'].forEach(p => {
      const st = r.sync_state?.[p]?.status;
      if (st && syncStats[st] !== undefined) syncStats[st]++;
    });
  });
  const totalSyncOps  = Object.values(syncStats).reduce((s, v) => s + v, 0);
  const failedRecords = records.filter(r =>
    ['aws', 'azure', 'gcp'].some(p => r.sync_state?.[p]?.status === 'failed')
  ).length;

  const handleResync = async (recordId) => {
    setResyncing(recordId);
    try {
      // POST /api/cloud-storage/sync/:recordId — requires admin and data body
      const res = await fetch(`/api/cloud-storage/sync/${recordId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Tenant-ID': 'demo' },
        body: JSON.stringify({ data: { re_sync: true, timestamp: new Date().toISOString() } }),
      });
      if (!res.ok) throw new Error(await res.text());
      message.success(`Re-sync triggered for ${recordId}`);
      setTimeout(load, 1000);
    } catch (err) {
      message.error(`Re-sync failed: ${err.message}`);
    } finally {
      setResyncing(null);
    }
  };

  const filteredRecords = records.filter(r => typeFilter === 'all' || r.record_type === typeFilter);

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#F8F9FB' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Cloud size={22} strokeWidth={1.5} style={{ color: '#000048' }} />
          <div>
            <h1 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#101828' }}>Multi-Cloud Data Availability</h1>
            <p style={{ margin: 0, fontSize: 12, color: '#94A3B8' }}>Cloud-agnostic storage — AWS S3 · Azure Blob · GCP Cloud Storage fan-out</p>
          </div>
        </div>
        <Button icon={<RefreshCw size={13} />} onClick={load} disabled={loading} size="small">Refresh</Button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spin size="large" /></div>
      ) : (
        <>
          {/* Provider health cards */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {['aws', 'azure', 'gcp'].map(p => (
              <ProviderCard
                key={p}
                providerKey={p}
                healthEntry={healthMap[p] || null}
                configured={configuredProviders.includes(p)}
              />
            ))}
          </div>

          {/* No providers configured notice */}
          {configuredProviders.length === 0 && (
            <div style={{ ...card, marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 12, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
              <AlertTriangle size={18} strokeWidth={1.5} style={{ color: '#D97706', flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 700, color: '#92400E' }}>No cloud providers configured</p>
                <p style={{ margin: 0, fontSize: 12, color: '#78350F' }}>
                  Add provider credentials to <code style={{ fontSize: 11 }}>server/.env</code> and set{' '}
                  <code style={{ fontSize: 11 }}>CLOUD_AWS_ENABLED=true</code>, <code style={{ fontSize: 11 }}>CLOUD_AZURE_ENABLED=true</code>, or{' '}
                  <code style={{ fontSize: 11 }}>CLOUD_GCP_ENABLED=true</code> to enable fan-out writes.
                  Agent evaluations, compliance events, and audit records will be replicated automatically.
                </p>
              </div>
            </div>
          )}

          {/* KPI bar */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <KpiCard label="Sync Records"    value={records.length}        sub="total tracked"          />
            <KpiCard label="Synced Ops"      value={syncStats.synced}      sub="across all providers"    color="#10B981" />
            <KpiCard label="Pending"         value={syncStats.pending}     sub="awaiting completion"     color="#F59E0B" />
            <KpiCard label="Failed"          value={syncStats.failed}      sub="require re-sync"         color={syncStats.failed > 0 ? '#EF4444' : '#10B981'} />
            <KpiCard label="Records w/ Fail" value={failedRecords}         sub="at least one provider"  color={failedRecords > 0 ? '#EF4444' : '#10B981'} />
          </div>

          {/* Sync health bar */}
          {totalSyncOps > 0 && (
            <div style={{ ...card, marginBottom: 20 }}>
              <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Sync Health</p>
              <div style={{ display: 'flex', gap: 0, borderRadius: 6, overflow: 'hidden', height: 12, marginBottom: 8 }}>
                {[
                  { key: 'synced',  color: '#10B981' },
                  { key: 'pending', color: '#F59E0B' },
                  { key: 'failed',  color: '#EF4444' },
                  { key: 'skipped', color: '#E2E8F0' },
                ].map(({ key, color }) => {
                  const pct = (syncStats[key] / totalSyncOps) * 100;
                  return pct > 0 ? <div key={key} style={{ width: `${pct}%`, background: color }} /> : null;
                })}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { key: 'synced',  label: 'Synced',  color: '#10B981' },
                  { key: 'pending', label: 'Pending', color: '#F59E0B' },
                  { key: 'failed',  label: 'Failed',  color: '#EF4444' },
                  { key: 'skipped', label: 'Skipped', color: '#94A3B8' },
                ].map(({ key, label, color }) => (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                    <span style={{ fontSize: 11, color }}>{syncStats[key]}</span>
                    <span style={{ fontSize: 10, color: '#94A3B8' }}>{label}</span>
                  </div>
                ))}
                <span style={{ fontSize: 10, color: '#CBD5E1', marginLeft: 4 }}>({totalSyncOps} total sync ops)</span>
              </div>
            </div>
          )}

          {/* Fan-out architecture note */}
          <div style={{ ...card, marginBottom: 20, background: '#F8FAFF', border: '1px solid #C7D7FD' }}>
            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#6366F1' }}>
              Fan-Out Write Pattern
            </p>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <p style={{ margin: '0 0 4px', fontSize: 12, color: '#344054' }}>Writes use <strong>Promise.allSettled</strong> — a failure on one provider never blocks others.</p>
                <p style={{ margin: 0, fontSize: 11, color: '#64748B' }}>Each write creates a <code style={{ fontSize: 10 }}>CloudStorageRecord</code> tracking per-provider sync state (pending → synced/failed/skipped).</p>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {['aws', 'azure', 'gcp'].map(p => {
                  const meta = PROVIDER_META[p];
                  const active = configuredProviders.includes(p);
                  return (
                    <div key={p} style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${active ? meta.color + '66' : '#E2E8F0'}`, background: active ? meta.bg : '#F8FAFC', opacity: active ? 1 : 0.5 }}>
                      <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: active ? meta.color : '#94A3B8' }}>{meta.abbr}</p>
                      <p style={{ margin: 0, fontSize: 9, color: active ? '#64748B' : '#CBD5E1' }}>{active ? 'Active' : 'Inactive'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>Filter:</span>
            <Select value={typeFilter} onChange={setTypeFilter} options={TYPE_OPTIONS} size="small" style={{ width: 170 }} />
            <span style={{ fontSize: 11, color: '#94A3B8', marginLeft: 4 }}>{filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Records table */}
          <div style={card}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>
              <Database size={12} strokeWidth={2} style={{ marginRight: 6, display: 'inline', verticalAlign: 'middle' }} />
              Sync Records
            </p>
            {filteredRecords.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <Database size={32} strokeWidth={1} style={{ color: '#CBD5E1', marginBottom: 8 }} />
                <p style={{ color: '#94A3B8', fontSize: 13, margin: 0 }}>
                  {configuredProviders.length === 0
                    ? 'No sync records — configure a cloud provider to start tracking writes.'
                    : 'No sync records match the current filter.'}
                </p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {['Record ID', 'Type', 'Source ID', 'Storage Key', 'Provider States', 'Created', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '6px 10px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #E2E8F0', fontSize: 10, whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((rec) => {
                      const hasFailed = ['aws', 'azure', 'gcp'].some(p => rec.sync_state?.[p]?.status === 'failed');
                      return (
                        <tr key={rec.record_id} style={{ borderBottom: '1px solid #F1F5F9', background: hasFailed ? '#FFF5F5' : 'transparent' }}>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', fontSize: 11, whiteSpace: 'nowrap' }}>
                            {hasFailed && <AlertTriangle size={11} strokeWidth={2} style={{ color: '#EF4444', marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
                            {rec.record_id}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            <Tag style={{ fontSize: 10 }}>{rec.record_type || '—'}</Tag>
                          </td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#64748B', fontSize: 11, whiteSpace: 'nowrap' }}>{rec.source_id || '—'}</td>
                          <td style={{ padding: '8px 10px', fontFamily: 'monospace', color: '#475569', fontSize: 11, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rec.storage_key}>{rec.storage_key || '—'}</td>
                          <td style={{ padding: '8px 10px' }}>
                            <SyncStateGrid syncState={rec.sync_state} />
                          </td>
                          <td style={{ padding: '8px 10px', color: '#94A3B8', whiteSpace: 'nowrap', fontSize: 11 }}>
                            <Clock size={11} strokeWidth={1.5} style={{ marginRight: 3, display: 'inline', verticalAlign: 'middle' }} />
                            {fmtTs(rec.created_at)}
                          </td>
                          <td style={{ padding: '8px 10px', whiteSpace: 'nowrap' }}>
                            {hasFailed ? (
                              <Button
                                size="small"
                                icon={<RotateCcw size={11} />}
                                loading={resyncing === rec.record_id}
                                onClick={() => handleResync(rec.record_id)}
                                style={{ fontSize: 11, color: '#EF4444', borderColor: '#FECACA' }}
                              >
                                Re-sync
                              </Button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3 }}>
                                <CheckCircle size={12} strokeWidth={2} />
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Provider details footer */}
          <div style={{ ...card, marginTop: 20 }}>
            <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Provider Configuration</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
              {[
                { key: 'aws',   env: 'CLOUD_AWS_ENABLED',   creds: 'AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, CLOUD_AWS_BUCKET'       },
                { key: 'azure', env: 'CLOUD_AZURE_ENABLED', creds: 'CLOUD_AZURE_CONNECTION_STRING, CLOUD_AZURE_CONTAINER'              },
                { key: 'gcp',   env: 'CLOUD_GCP_ENABLED',   creds: 'CLOUD_GCP_BUCKET, GCP_PROJECT_ID, GCP_KEY_FILE or GCP_CREDENTIALS' },
              ].map(({ key, env, creds }) => {
                const meta   = PROVIDER_META[key];
                const active = configuredProviders.includes(key);
                return (
                  <div key={key} style={{ flex: 1, minWidth: 220, padding: '10px 14px', border: `1px solid ${active ? meta.color + '44' : '#E2E8F0'}`, borderRadius: 6, background: active ? meta.bg : '#FAFAFA' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 700, color: active ? meta.color : '#94A3B8' }}>
                      {meta.label} {active && <CheckCircle size={11} strokeWidth={2} style={{ color: '#10B981', display: 'inline', marginLeft: 4 }} />}
                    </p>
                    <p style={{ margin: '0 0 4px', fontSize: 10, color: '#64748B', fontFamily: 'monospace' }}>Enable: {env}=true</p>
                    <p style={{ margin: 0, fontSize: 10, color: '#94A3B8' }}>{creds}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Switch, Table, Button, Tag, message, Modal } from 'antd';
import { ShieldCheck, RotateCcw, Zap } from 'lucide-react';
import { getSelfHealingRules, getInterventionLog } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import PageHeader from '../components/layout/PageHeader';

const SEV_COLOR  = { P1: '#F04438', P2: '#F59E0B', P3: '#10B981' };
const SEV_BG     = { P1: '#FEF3F2', P2: '#FFFAEB', P3: '#ECFDF3' };

export default function SelfHealing({ userRole }) {
  const { tenant } = useTenant();
  const [rules,     setRules]     = useState([]);
  const [log,       setLog]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [toggling,  setToggling]  = useState({});
  const [reverting, setReverting] = useState({});

  useEffect(() => {
    setLoading(true);
    Promise.all([getSelfHealingRules(), getInterventionLog()])
      .then(([r, l]) => {
        setRules(Array.isArray(r) ? r : (r?.rules ?? []));
        setLog(Array.isArray(l) ? l : (l?.interventions ?? []));
      })
      .finally(() => setLoading(false));
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyToggle = async (rule, checked) => {
    setToggling(t => ({ ...t, [rule.id]: true }));
    await new Promise(r => setTimeout(r, 250));
    setRules(rs => rs.map(r => r.id === rule.id ? { ...r, enabled: checked } : r));
    setToggling(t => ({ ...t, [rule.id]: false }));
    message.success(`${rule.name} ${checked ? 'activated — policy is now enforced' : 'deactivated — policy suspended'}`);
  };

  const handleToggle = (rule, checked) => {
    if (rule.severity === 'P1' && !checked) {
      Modal.confirm({
        title: `Disable P1 policy: ${rule.name}?`,
        content: 'This is a critical recovery policy. Disabling it may leave the agent fleet unprotected. Confirm to proceed.',
        okText: 'Disable Policy',
        okButtonProps: { danger: true },
        cancelText: 'Keep Active',
        onOk: () => applyToggle(rule, checked),
      });
    } else {
      applyToggle(rule, checked);
    }
  };

  const handleRevert = async (entry) => {
    setReverting(v => ({ ...v, [entry.id]: true }));
    await new Promise(r => setTimeout(r, 700));
    setLog(l => l.map(e => e.id === entry.id ? { ...e, overridden: true } : e));
    setReverting(v => ({ ...v, [entry.id]: false }));
    message.success(`Protocol ${entry.id} overridden — agent state restored to pre-intervention baseline.`);
  };

  const ruleColumns = [
    {
      title: 'Rule', dataIndex: 'name', key: 'name',
      render: (name, r) => (
        <div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#101828' }}>{name}</span>
          <p style={{ margin: '2px 0 0', fontSize: 11, color: '#98A2B3', fontFamily: 'monospace' }}>{r.condition}</p>
        </div>
      ),
    },
    {
      title: 'Action', dataIndex: 'action', key: 'action',
      render: v => <span style={{ fontSize: 12, color: '#475467' }}>{v}</span>,
    },
    {
      title: 'Sev', dataIndex: 'severity', key: 'severity', width: 60,
      render: s => (
        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: SEV_BG[s], color: SEV_COLOR[s] }}>{s}</span>
      ),
    },
    {
      title: '24h Fires', dataIndex: 'triggered', key: 'triggered', width: 90,
      render: v => (
        <span style={{ fontSize: 12, fontFamily: 'monospace', fontWeight: 600, color: v > 0 ? '#F04438' : '#98A2B3' }}>{v}</span>
      ),
    },
    {
      title: 'Enabled', key: 'enabled', width: 80,
      render: (_, r) => (
        <Switch
          checked={r.enabled}
          loading={toggling[r.id]}
          onChange={checked => userRole === 'admin' && handleToggle(r, checked)}
          disabled={userRole !== 'admin'}
          size="small"
        />
      ),
    },
  ];

  // Deterministic mock cost seeded by log entry index
  const COST_SEED = [0.008, 0.023, 0.041, 0.012, 0.056, 0.019, 0.034, 0.007, 0.048, 0.027];
  const interventionCost = (idx) => COST_SEED[idx % COST_SEED.length];

  const logColumns = [
    { title: 'ID', dataIndex: 'id', key: 'id', width: 90, render: v => <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#98A2B3' }}>{v}</span> },
    { title: 'Policy Triggered', dataIndex: 'rule', key: 'rule', render: v => <span style={{ fontSize: 12, fontWeight: 600, color: '#344054' }}>{v}</span> },
    { title: 'Agent', dataIndex: 'agent', key: 'agent', render: v => <span style={{ fontSize: 12, color: '#475467' }}>{v}</span> },
    { title: 'Action Taken', dataIndex: 'action', key: 'action', render: v => <span style={{ fontSize: 12, color: '#475467' }}>{v}</span> },
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'timestamp', render: v => <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#98A2B3' }}>{v}</span> },
    {
      title: 'Remediation Cost', key: 'cost', width: 130,
      render: (_, r, idx) => (
        <span style={{ fontSize: 11, fontFamily: 'monospace', fontWeight: 600, color: '#475467' }}>
          ${interventionCost(idx).toFixed(3)}
        </span>
      ),
    },
    {
      title: 'Status', key: 'status', width: 100,
      render: (_, r) => r.overridden
        ? <Tag color="orange" style={{ fontSize: 11 }}>Overridden</Tag>
        : <Tag color="green"  style={{ fontSize: 11 }}>Applied</Tag>,
    },
    ...[{
      title: '', key: 'actions', width: 130,
      render: (_, r) => !r.overridden && (
        <Button
          size="small"
          icon={<RotateCcw size={11} strokeWidth={1.5} />}
          loading={reverting[r.id]}
          disabled={userRole !== 'admin'}
          onClick={() => handleRevert(r)}
        >
          Override & Restore
        </Button>
      ),
    }],
  ];

  return (
    <div>
      <PageHeader
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px', background: '#ECFDF3', border: '1px solid #A7F3D0', borderRadius: 99 }}>
            <ShieldCheck size={13} strokeWidth={1.5} style={{ color: '#10B981' }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>{rules.filter(r => r.enabled).length} policies enforced</span>
          </div>
        }
      />

      {/* Rules Table */}
      <div style={{ marginBottom: 8 }}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <Zap size={12} strokeWidth={1.5} /> Self-Healing Policies
        </span>
        <div className="bg-white border border-border rounded shadow-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table
              columns={ruleColumns}
              dataSource={rules}
              loading={loading}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'No self-healing policies configured' }}
            />
          </div>
        </div>
      </div>

      {/* Intervention Log */}
      <div style={{ marginTop: 32 }}>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-1.5">
          <RotateCcw size={12} strokeWidth={1.5} /> Intervention History
        </span>
        <div className="bg-white border border-border rounded shadow-card overflow-hidden">
          <div className="w-full overflow-x-auto">
            <Table
              columns={logColumns}
              dataSource={log}
              loading={loading}
              rowKey="id"
              size="small"
              pagination={false}
              locale={{ emptyText: 'No intervention history yet' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

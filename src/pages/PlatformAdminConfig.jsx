import React, { useState, useEffect } from 'react';
import { Table, Tag } from 'antd';
import { User, ShieldCheck } from 'lucide-react';
import { getUsers } from '../services/API_services';
import PageHeader  from '../components/layout/PageHeader';
import StatusBadge from '../components/common/Badge';

const SH = ({ icon: Icon, title }) => (
  <div className="flex items-center gap-2 mb-3">
    {Icon && <Icon size={13} strokeWidth={1.5} style={{ color: '#000048' }} />}
    <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#98A2B3' }}>{title}</p>
  </div>
);

export default function PlatformAdminConfig({ userRole }) {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getUsers().then(d => setUsers(d?.users ?? [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const userCols = [
    {
      title: 'Username', dataIndex: 'username', key: 'user',
      render: v => (
        <span className="flex items-center gap-2">
          <User size={13} strokeWidth={1.5} className="text-ink-tertiary" />
          <span className="font-semibold text-sm">{v}</span>
        </span>
      ),
    },
    { title: 'Email',        dataIndex: 'email',      key: 'email',  render: v => <span className="text-sm text-ink-secondary">{v}</span> },
    { title: 'Role',         dataIndex: 'role',       key: 'role',   render: r => <Tag color={r === 'admin' ? 'blue' : 'default'}>{r}</Tag> },
    { title: 'Status',       dataIndex: 'status',     key: 'status', render: s => <StatusBadge variant={s === 'Active' ? 'success' : 'neutral'} dot>{s}</StatusBadge> },
    { title: 'Enrolled Since', dataIndex: 'created_at', key: 'ca',   render: v => <span className="text-xs font-mono text-ink-tertiary">{v}</span> },
  ];


  const rbacData = [
    { role: 'Platform Admin',   permissions: ['All Access'],                       agents: 'All',        users: 3  },
    { role: 'Agent Operator',   permissions: ['View', 'Edit Agents', 'View Logs'], agents: 'Assigned',   users: 8  },
    { role: 'Analytics Viewer', permissions: ['View Dashboard', 'View Logs'],      agents: 'All (read)', users: 14 },
    { role: 'FinOps Analyst',   permissions: ['View Cost', 'Export Reports'],      agents: 'All (read)', users: 5  },
    { role: 'Security Auditor', permissions: ['View Audit', 'View Trust'],         agents: 'All (read)', users: 2  },
  ];

  const rbacCols = [
    { title: 'Role',         dataIndex: 'role',        key: 'role',  render: v => <span className="text-sm font-semibold text-ink-primary">{v}</span> },
    { title: 'Permissions',  dataIndex: 'permissions', key: 'perms', render: perms => <span className="flex flex-wrap gap-1">{perms.map(p => <Tag key={p} style={{ fontSize: 11 }}>{p}</Tag>)}</span> },
    { title: 'Agents Scope', dataIndex: 'agents',      key: 'agents',render: v => <span className="text-xs text-ink-secondary">{v}</span> },
    { title: 'Users',        dataIndex: 'users',       key: 'users', render: v => <span className="text-xs font-mono text-ink-tertiary">{v}</span> },
  ];

  const cardCls = 'bg-white border border-border rounded shadow-card mb-6';

  return (
    <div style={{ padding: '0 0 24px' }}>
      <PageHeader
        title="Settings"
        subtitle="Principal registry and role-based access control"
      />

      {/* User Management */}
      <div className={cardCls}>
        <div className="px-4 py-3 border-b border-border">
          <SH icon={User} title="Users" />
        </div>
        <div className="w-full overflow-x-auto">
          <Table columns={userCols} dataSource={users} rowKey="id" loading={loading}
            pagination={{ pageSize: 8, size: 'small' }} size="small" />
        </div>
      </div>

      {/* RBAC */}
      <div className={cardCls}>
        <div className="px-4 py-3 border-b border-border">
          <SH icon={ShieldCheck} title="Role Permissions" />
        </div>
        <div className="w-full overflow-x-auto">
          <Table columns={rbacCols} dataSource={rbacData} rowKey="role" pagination={false} size="small" />
        </div>
      </div>

    </div>
  );
}

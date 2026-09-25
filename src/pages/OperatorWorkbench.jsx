import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import { SlidersHorizontal, Sparkles } from 'lucide-react';
import PlatformAdminConfig  from './PlatformAdminConfig';
import AICommandAssistant   from './AICommandAssistant';
import { gatedTab }         from '../components/common/gatedTab';

export default function OperatorWorkbench({ navParams, onNavigate, onTabChange, userRole }) {
  const TAB_REMAP = {
    cicd: 'platform-config',
    apikeys: 'platform-config',
    reports: 'platform-config',
    orchestration: 'platform-config',
  };
  const [activeTab, setActiveTab] = useState(TAB_REMAP[navParams?.tab] ?? navParams?.tab ?? 'platform-config');

  useEffect(() => {
    if (navParams?.tab) setActiveTab(TAB_REMAP[navParams.tab] ?? navParams.tab);
  }, [navParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const icon = (Icon, text) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={13} strokeWidth={1.5} />{text}
    </span>
  );

  const TABS = [
    gatedTab('admin.platform-config', {
      key: 'platform-config',
      name: 'Settings',
      label: icon(SlidersHorizontal, 'Settings'),
      children: <PlatformAdminConfig userRole={userRole} />,
    }),
    gatedTab('admin.assistant', {
      key: 'assistant',
      name: 'AI Assistant',
      label: icon(Sparkles, 'AI Assistant'),
      children: <AICommandAssistant />,
    }),
  ].filter(Boolean);

  return (
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em' }}>Admin</h1>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Platform administration — settings and AI assistant.</p>
      </div>
      <Tabs activeKey={activeTab} onChange={(t) => { setActiveTab(t); onTabChange?.(t); }} items={TABS} />
    </div>
  );
}

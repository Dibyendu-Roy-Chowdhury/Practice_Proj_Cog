import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import { BarChart3, Zap } from 'lucide-react';
import { AgentPerformanceTab } from './LogSense';
import CostOptimization      from './CostOptimization';
import { gatedTab }          from '../components/common/gatedTab';

export default function Cost({ navParams, onTabChange }) {
  const TAB_REMAP = { budgets: 'usage', optimize: 'optimize' };
  const [activeTab, setActiveTab] = useState(TAB_REMAP[navParams?.tab] ?? navParams?.tab ?? 'usage');

  useEffect(() => {
    if (navParams?.tab) setActiveTab(TAB_REMAP[navParams.tab] ?? navParams.tab);
  }, [navParams]); // eslint-disable-line react-hooks/exhaustive-deps

  const icon = (Icon, text) => (
    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <Icon size={13} strokeWidth={1.5} />{text}
    </span>
  );

  const TABS = [
    gatedTab('finops.usage', {
      key: 'usage',
      name: 'Spend Analysis',
      label: icon(BarChart3, 'Spend Analysis'),
      children: <AgentPerformanceTab />,
    }),
    gatedTab('finops.optimize', {
      key: 'optimize',
      name: 'Cost Optimization',
      label: icon(Zap, 'Cost Optimization'),
      children: <CostOptimization />,
    }),
  ].filter(Boolean);

  return (
    <div style={{ padding: '24px 24px 0' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#101828', letterSpacing: '-0.02em' }}>FinOps</h1>
        <p style={{ margin: 0, fontSize: 13, color: '#64748B' }}>Token spend, cost attribution, and optimization recommendations across the AI fleet</p>
      </div>
      <Tabs activeKey={activeTab} onChange={(t) => { setActiveTab(t); onTabChange?.(t); }} items={TABS} />
    </div>
  );
}

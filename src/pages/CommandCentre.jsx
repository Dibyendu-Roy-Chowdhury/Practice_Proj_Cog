import React, { useState, useEffect } from 'react';
import { Tabs } from 'antd';
import {
  LayoutDashboard,
} from 'lucide-react';
import Dashboard from './Dashboard';
import PlatformHealthScore from '../components/common/PlatformHealthScore';
import { gatedTab }    from '../components/common/gatedTab';
import ErrorBoundary   from '../components/common/ErrorBoundary';

const tabLabel = (Icon, text) => (
  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
    <Icon size={13} strokeWidth={1.5} />{text}
  </span>
);

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CommandCentre({ navParams, onNavigate, onTabChange }) {
  const [activeTab, setActiveTab] = useState(() => navParams?.tab || 'overview');

  useEffect(() => {
    if (navParams?.tab) setActiveTab(navParams.tab);
  }, [navParams]);

  const TABS = [
    gatedTab('core.overview', {
      key: 'overview',
      name: 'Overview',
      label: tabLabel(LayoutDashboard, 'Overview'),
      children: (
        <ErrorBoundary label="Overview">
          <div style={{ padding: '24px 24px 0' }}>
            <PlatformHealthScore onNavigate={onNavigate} />
          </div>
          <Dashboard onNavigate={onNavigate} />
        </ErrorBoundary>
      ),
    }),
  ].filter(Boolean);

  return (
    <div>
      <Tabs
        activeKey={activeTab}
        onChange={(t) => { setActiveTab(t); onTabChange?.(t); }}
        tabBarStyle={{ padding: '0 24px', marginBottom: 0 }}
        items={TABS}
      />
    </div>
  );
}

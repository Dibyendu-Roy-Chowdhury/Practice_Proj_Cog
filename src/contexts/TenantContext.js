import React, { createContext, useContext, useState, useEffect } from 'react';
import { setActiveTenant } from '../services/API_services';

export const TENANT_OPTIONS = [
  {
    id:        'arcadia-health',
    name:      'Arcadia Health',
    shortName: 'AH',
    industry:  'Healthcare · HIPAA · ISO 42001 · 5 Agents',
    color:     '#059669',
    bg:        '#ECFDF5',
  },
  {
    id:        'capital-wealth',
    name:      'Capital Wealth Management',
    shortName: 'CW',
    industry:  'Wealth Management · SEC · SOC 2 · 5 Agents',
    color:     '#7C3AED',
    bg:        '#F5F3FF',
  },
];

const DEFAULT_TENANT = TENANT_OPTIONS[0];

export const TenantContext = createContext({
  tenant:      DEFAULT_TENANT,
  setTenantId: () => {},
});

export const useTenant = () => useContext(TenantContext);

export function TenantProvider({ children }) {
  const [tenantId, setTenantIdState] = useState(DEFAULT_TENANT.id);

  const tenant = TENANT_OPTIONS.find(t => t.id === tenantId) || DEFAULT_TENANT;

  useEffect(() => {
    setActiveTenant(tenantId);
  }, [tenantId]);

  const setTenantId = (id) => {
    const valid = TENANT_OPTIONS.find(t => t.id === id);
    if (valid) setTenantIdState(id);
  };

  return (
    <TenantContext.Provider value={{ tenant, setTenantId }}>
      {children}
    </TenantContext.Provider>
  );
}

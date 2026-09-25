import React, { useState, useEffect } from 'react';
import { ConfigProvider } from 'antd';
import Login         from './pages/login';
import AppShell      from './components/layout/AppShell';
import ErrorBoundary from './components/common/ErrorBoundary';
import { antTheme }  from './theme/tokens';
import { EnvironmentProvider } from './contexts/EnvironmentContext';
import { TenantProvider }      from './contexts/TenantContext';
import { TriageModeProvider }  from './contexts/TriageModeContext';

function App() {
  const [isLoggedIn,       setIsLoggedIn]       = useState(false);
  const [userRole,         setUserRole]          = useState('user');
  const [backendOffline,   setBackendOffline]    = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem('access_token');
    const role  = sessionStorage.getItem('role');
    if (token && role) { setIsLoggedIn(true); setUserRole(role); }

    // Listen for the offline signal emitted by API_services when mock fallback activates.
    const handler = () => setBackendOffline(true);
    window.addEventListener('vfo:offline', handler);
    return () => window.removeEventListener('vfo:offline', handler);
  }, []);

  const handleLogin = () => {
    setBackendOffline(false); // reset on fresh login
    const role = sessionStorage.getItem('role') || 'user';
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('role');
    localStorage.removeItem('username');
    setIsLoggedIn(false);
    setUserRole('user');
  };

  return (
    <ErrorBoundary label="Application">
      <TriageModeProvider>
        <TenantProvider>
          <EnvironmentProvider>
            <ConfigProvider theme={antTheme}>
              {backendOffline && isLoggedIn && (
                <div style={{
                  position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999,
                  background: '#FEF3C7', borderBottom: '1px solid #FDE68A',
                  padding: '6px 16px', display: 'flex', alignItems: 'center',
                  gap: 8, fontSize: 12, color: '#92400E',
                }}>
                  <span style={{ fontWeight: 700 }}>⚠ OFFLINE — Demo Data Active</span>
                  <span>Backend is unreachable. All figures shown are simulated demo data, not live values.</span>
                </div>
              )}
              {isLoggedIn
                ? <AppShell onLogout={handleLogout} userRole={userRole} offlineMode={backendOffline} />
                : <Login onLoginSuccess={handleLogin} />
              }
            </ConfigProvider>
          </EnvironmentProvider>
        </TenantProvider>
      </TriageModeProvider>
    </ErrorBoundary>
  );
}

export default App;

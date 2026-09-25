import React from 'react';

// Wraps a section that is not yet backed by a real integrated API — blurs the
// content and pins a badge so it's visually obvious which parts of the app
// are live (e.g. VeriForge Telemetry) vs. still demo/mock data.
const MockDataOverlay = ({ children }) => (
  <div style={{ position: 'relative' }}>
    <div style={{ filter: 'blur(1.5px)', opacity: 0.88, pointerEvents: 'none', userSelect: 'none' }}>
      {children}
    </div>
    <span
      style={{
        position: 'absolute', top: 8, right: 8, zIndex: 10,
        fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
        padding: '3px 9px', borderRadius: 999, color: '#92400E', background: '#FEF3C7',
        border: '1px solid #FDE68A', boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
      }}
    >
      Not Integrated — Mock Data
    </span>
  </div>
);

export default MockDataOverlay;

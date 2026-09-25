import React from 'react';
import { Lock } from 'lucide-react';
import { getRelease } from '../../config/featureGates';

const LockedFeature = ({ featureName }) => {
  const release = getRelease();
  const nextRelease = release === 'alpha' ? 'Beta' : 'General Availability';

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 400,
      padding: 48,
      textAlign: 'center',
    }}>
      <div style={{
        width: 64,
        height: 64,
        borderRadius: 16,
        background: '#F8F9FB',
        border: '1px solid #E2E8F0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
      }}>
        <Lock size={28} strokeWidth={1.5} color="#94A3B8" />
      </div>
      <h3 style={{
        fontSize: 16,
        fontWeight: 700,
        color: '#0B1437',
        marginBottom: 8,
      }}>
        {featureName}
      </h3>
      <p style={{
        fontSize: 13,
        color: '#64748B',
        lineHeight: 1.6,
        maxWidth: 400,
        marginBottom: 20,
      }}>
        This feature is fully built and will be available in the {nextRelease} release.
        You're currently on the {release.charAt(0).toUpperCase() + release.slice(1)} release.
      </p>
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        fontSize: 11,
        fontWeight: 600,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        background: '#F8F9FB',
        border: '1px solid #E2E8F0',
        borderRadius: 20,
        padding: '6px 16px',
      }}>
        <Lock size={12} strokeWidth={2} />
        Coming in {nextRelease}
      </div>
    </div>
  );
};

export default LockedFeature;

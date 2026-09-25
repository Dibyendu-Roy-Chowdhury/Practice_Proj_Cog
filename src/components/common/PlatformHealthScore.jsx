import React, { useState, useEffect } from 'react';
import { getHealthDimensions, getTrajectoryScoreAsync } from '../../services/API_services';

// Static display metadata per dimension (color, weight, nav) — scores come from SSOT.
const DIM_META = [
  { key: 'reliability',  label: 'Model Reliability',   weight: 0.25, color: '#10B981', nav: ['1', { tab: 'health'  }] },
  { key: 'cost',         label: 'Cost Efficiency',      weight: 0.15, color: '#F59E0B', nav: ['12', {}]                },
  { key: 'safety',       label: 'Safety & Guardrails',  weight: 0.15, color: '#00B5E2', nav: ['1', { tab: 'safety'  }] },
  { key: 'latency',      label: 'Latency SLA',          weight: 0.10, color: '#000048', nav: ['1', { tab: 'health'  }] },
  { key: 'guardrail',    label: 'Guardrail Coverage',   weight: 0.15, color: '#7A5AF8', nav: ['1', { tab: 'safety'  }] },
  { key: 'hitl',         label: 'HITL Responsiveness',  weight: 0.05, color: '#0EA5E9', nav: ['2', {}]                },
  { key: 'embedding',    label: 'Embedding Quality',    weight: 0.10, color: '#EC4899', nav: ['1', { tab: 'signals' }] },
  { key: 'availability', label: 'Fleet Availability',   weight: 0.05, color: '#F97316', nav: ['7', {}]                },
];

const scoreColor = s => s >= 85 ? '#10B981' : s >= 65 ? '#F59E0B' : '#EF4444';
const scoreLabel = s => s >= 85 ? 'HEALTHY' : s >= 65 ? 'DEGRADED' : 'CRITICAL';
const scoreBg    = s => s >= 85 ? '#ECFDF3' : s >= 65 ? '#FFFAEB' : '#FEF3F2';

// Animated score counter
function useCountUp(target, duration = 1200) {
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    const step = target / (duration / 16);
    let val = 0;
    const id = setInterval(() => {
      val = Math.min(target, val + step);
      setCurrent(Math.round(val));
      if (val >= target) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, [target, duration]);
  return current;
}

export default function PlatformHealthScore({ onNavigate }) {
  const [rawDims, setRawDims] = useState(() => getHealthDimensions());

  useEffect(() => {
    setRawDims(getHealthDimensions());
    getTrajectoryScoreAsync()
      .then(res => {
        if (res && res.dimensions) {
          const merged = getHealthDimensions().map((meta) => {
            const match = res.dimensions.find(d => d.dim === meta.label);
            return match ? { ...meta, score: match.score, desc: match.desc } : meta;
          });
          setRawDims(merged);
        }
      })
      .catch(() => {});
  }, []);

  const DIMENSIONS = DIM_META.map((meta, i) => ({
    ...meta,
    value: rawDims[i]?.score ?? rawDims[i]?.value ?? 82,
    desc:  rawDims[i]?.desc  ?? '',
  }));
  const composite = Math.round(DIMENSIONS.reduce((sum, d) => sum + d.value * d.weight, 0));

  const displayed = useCountUp(composite);
  const color     = scoreColor(composite);
  const C         = 2 * Math.PI * 34; // circumference for r=34
  const dash      = (composite / 100) * C;

  return (
    <div style={{ background: 'white', border: '1px solid #E2E8F0', borderRadius: 8, padding: '12px 16px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>

        {/* Score ring */}
        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{ position: 'relative', width: 80, height: 80 }}>
            <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="40" cy="40" r="34" fill="none" stroke="#F1F5F9" strokeWidth="6" />
              <circle cx="40" cy="40" r="34" fill="none" stroke={color}
                strokeWidth="6" strokeLinecap="round"
                strokeDasharray={`${dash} ${C}`}
                style={{ transition: 'stroke-dasharray 1.2s ease-out, stroke 0.5s' }}
              />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{displayed}</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>/ 100</div>
            </div>
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: scoreBg(composite), color }}>{scoreLabel(composite)}</span>
          <span style={{ fontSize: 9, color: '#94A3B8' }}>Fleet Health Score</span>
        </div>

        {/* Dimension bars — split into two columns */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Score Drivers</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px 24px' }}>
            {DIMENSIONS.map(d => (
              <div
                key={d.key}
                onClick={() => onNavigate?.(...d.nav)}
                style={{ cursor: onNavigate ? 'pointer' : 'default' }}
                title={d.desc}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, color: '#344054', fontWeight: 500 }}>{d.label}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: d.color, fontVariantNumeric: 'tabular-nums' }}>{d.value}%</span>
                </div>
                <div style={{ height: 3, background: '#F1F5F9', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{ width: `${d.value}%`, height: '100%', background: d.color, borderRadius: 99, transition: 'width 1s ease-out' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Composite formula */}
        <div style={{ flexShrink: 0, padding: '8px 12px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 8, minWidth: 170 }}>
          <p style={{ margin: '0 0 6px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94A3B8' }}>Composite Formula</p>
          {DIMENSIONS.map(d => (
            <div key={d.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 2 }}>
              <span style={{ fontSize: 10, color: '#64748B' }}>{d.label}</span>
              <span style={{ fontSize: 10, fontFamily: 'monospace', color: '#344054', fontWeight: 600 }}>×{d.weight.toFixed(2)}</span>
            </div>
          ))}
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#101828' }}>Composite</span>
            <span style={{ fontSize: 11, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{composite}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

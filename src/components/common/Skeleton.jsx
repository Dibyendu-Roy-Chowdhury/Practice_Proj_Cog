/**
 * Skeleton — shimmer loading placeholders.
 * Prevents layout shift by matching the shape of real content.
 */

import React from 'react';

// ─── Shimmer base ─────────────────────────────────────────────────────────────
const Shimmer = ({ style = {}, className = '' }) => (
  <div
    className={`vfo-shimmer ${className}`}
    style={{ borderRadius: 4, ...style }}
  />
);

// ─── Table rows ───────────────────────────────────────────────────────────────
export const SkeletonRows = ({ rows = 5, cols = 4 }) => (
  <div style={{ padding: '0' }}>
    {Array.from({ length: rows }).map((_, r) => (
      <div
        key={r}
        style={{
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          padding: '10px 16px',
          borderBottom: '1px solid #F2F4F7',
        }}
      >
        {Array.from({ length: cols }).map((_, c) => (
          <Shimmer
            key={c}
            style={{
              height: 12,
              flex: c === 0 ? '0 0 160px' : c === cols - 1 ? '0 0 80px' : 1,
              opacity: 1 - c * 0.1,
            }}
          />
        ))}
      </div>
    ))}
  </div>
);

// ─── KPI tile row ─────────────────────────────────────────────────────────────
export const SkeletonKpi = ({ tiles = 4 }) => (
  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles}, 1fr)`, gap: 12, marginBottom: 20 }}>
    {Array.from({ length: tiles }).map((_, i) => (
      <div key={i} className="vfo-card" style={{ padding: 16 }}>
        <Shimmer style={{ height: 10, width: 80, marginBottom: 10 }} />
        <Shimmer style={{ height: 22, width: 100, marginBottom: 8 }} />
        <Shimmer style={{ height: 9, width: 64 }} />
      </div>
    ))}
  </div>
);

// ─── Generic card ─────────────────────────────────────────────────────────────
export const SkeletonCard = ({ lines = 3, height = 14 }) => (
  <div className="vfo-card" style={{ padding: 20 }}>
    {Array.from({ length: lines }).map((_, i) => (
      <Shimmer
        key={i}
        style={{
          height,
          width: i === 0 ? '60%' : i === lines - 1 ? '40%' : '85%',
          marginBottom: i < lines - 1 ? 10 : 0,
        }}
      />
    ))}
  </div>
);

// ─── Timeline row ─────────────────────────────────────────────────────────────
export const SkeletonTimeline = ({ rows = 4 }) => (
  <div style={{ paddingLeft: 24 }}>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 20 }}>
        <Shimmer style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, marginTop: 2 }} />
        <div style={{ flex: 1 }}>
          <Shimmer style={{ height: 11, width: 120, marginBottom: 6 }} />
          <Shimmer style={{ height: 9, width: '70%' }} />
        </div>
      </div>
    ))}
  </div>
);

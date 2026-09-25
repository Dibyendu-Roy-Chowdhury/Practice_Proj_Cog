import React from 'react';
import { Tooltip } from 'antd';
import { Info } from 'lucide-react';

/**
 * MetricLabel — renders a metric name with an optional explanatory tooltip.
 *
 * Usage:
 *   <MetricLabel label="Token Efficiency" tooltip="Ratio of semantically useful tokens to total tokens consumed..." />
 *
 * Props:
 *   label        {string}  — the visible metric name
 *   tooltip      {string}  — plain-English explanation shown on hover
 *   size         {number}  — font size in px (default: inherits)
 *   uppercase    {boolean} — apply uppercase + tracking (default: false)
 *   color        {string}  — label text color (default: inherit)
 */
export default function MetricLabel({ label, tooltip, size, uppercase = false, color }) {
  const text = (
    <span style={{
      fontSize:        size,
      color:           color,
      textTransform:   uppercase ? 'uppercase' : undefined,
      letterSpacing:   uppercase ? '0.07em'    : undefined,
      fontWeight:      uppercase ? 700         : undefined,
    }}>
      {label}
    </span>
  );

  if (!tooltip) return text;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {text}
      <Tooltip
        title={tooltip}
        overlayStyle={{ maxWidth: 300 }}
        overlayInnerStyle={{ fontSize: 12, lineHeight: 1.5 }}
      >
        <Info
          size={11}
          strokeWidth={1.8}
          style={{ color: '#94A3B8', cursor: 'help', flexShrink: 0, verticalAlign: 'middle' }}
        />
      </Tooltip>
    </span>
  );
}

// ── Pre-defined glossary entries ───────────────────────────────────────────────
export const METRIC_TOOLTIPS = {
  platformHealth:       'Composite score (0–100) across agent availability, SLA compliance, error rate, and token efficiency. Below 65 triggers a P1 alert.',
  tokenEfficiency:      'Ratio of semantically useful tokens to total tokens consumed. Values below 80% indicate prompt engineering waste or excessive re-prompting.',
  anomalyScore:         'Risk score (0–100) for a deviation event. 0–30: Low (green), 31–60: Medium (amber), 61–100: High (red). Drives auto-remediation thresholds.',
  semanticDrift:        'Cosine distance between an agent\'s current response embeddings and its baseline embeddings. High drift indicates the agent\'s behavior has diverged from its intended purpose.',
  meshHealthScore:      'Aggregate health of the agent mesh (0–100). Factors: edge handshake status, node load, loop-free topology, and semantic consistency across relay chains.',
  semanticConsistency:  'Cosine similarity (0–1) between the original task instruction and the instruction as received at each subsequent relay hop. A drop below 0.80 indicates semantic corruption in the chain.',
  ttlCeiling:           'Time-To-Live — the maximum number of iterations a directed cycle is permitted before the platform auto-terminates it to prevent infinite agent ping-ponging.',
  precursorSignals:     'Predicted failure modes detected before they manifest. Derived from pattern-matching against historical incident signatures. TTF = estimated time to failure.',
  p99Latency:           '99th-percentile latency — the response time that 99% of requests fall under. More reliable than average for detecting tail-latency spikes that affect a minority of users.',
  deviationScore:       'Same as Anomaly Score — normalised 0–100 risk rating derived from a composite of token spike, loop frequency, tool abuse, and hallucination signals.',
};

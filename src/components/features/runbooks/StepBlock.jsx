import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button, Popconfirm, Tooltip } from 'antd';
import { Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { executeOpTask } from '../../../services/API_services';
import { logOp } from '../../../utils/opHistory';
import { isSubFeatureEnabled } from '../../../config/featureGates';

// ── Derive a human action label from step title ───────────────────────────────
export const deriveActionLabel = (title = '') => {
  const t = title.toLowerCase();
  if (t.includes('health') || t.includes('diagnos'))           return 'Run Diagnosis';
  if (t.includes('restart') || t.includes('reboot'))           return 'Restart Instance';
  if (t.includes('shutdown'))                                   return 'Execute Shutdown';
  if (t.includes('flush') || t.includes('cache'))              return 'Flush Cache';
  if (t.includes('purge'))                                      return 'Purge Data';
  if (t.includes('scale') || t.includes('replicas'))           return 'Scale Replicas';
  if (t.includes('rotate') || t.includes('revoke'))            return 'Rotate Credentials';
  if (t.includes('isolat') || t.includes('suspend'))           return 'Isolate Agent';
  if (t.includes('forensic') || t.includes('export'))          return 'Export Forensics';
  if (t.includes('snapshot') || t.includes('capture'))         return 'Capture Snapshot';
  if (t.includes('apply') || t.includes('patch'))              return 'Apply Config';
  if (t.includes('tighten') || t.includes('circuit'))          return 'Update Threshold';
  if (t.includes('drain') || t.includes('queue'))              return 'Drain Queue';
  if (t.includes('validate') || t.includes('smoke'))           return 'Run Validation';
  if (t.includes('confirm') || t.includes('stable'))           return 'Confirm Recovery';
  if (t.includes('baseline') || t.includes('measure'))         return 'Fetch Metrics';
  if (t.includes('checkpoint') || t.includes('preserve'))      return 'Save Checkpoint';
  if (t.includes('resume') || t.includes('restore'))           return 'Resume Agent';
  if (t.includes('analys') || t.includes('identify'))          return 'Fetch Report';
  if (t.includes('declare') || t.includes('incident'))         return 'Create Incident';
  if (t.includes('assemble') || t.includes('war room'))        return 'Open War Room';
  if (t.includes('assess') || t.includes('control-plane'))     return 'Run Platform Check';
  return 'Execute Step';
};

// ── Mark high-risk steps that need Popconfirm ────────────────────────────────
export const isHighRisk = (title = '') => {
  const t = title.toLowerCase();
  return (
    t.includes('shutdown') || t.includes('isolat') || t.includes('suspend') ||
    t.includes('revoke')   || t.includes('rotate') || t.includes('purge')   ||
    t.includes('delete')   || t.includes('kill')   || t.includes('reboot')  ||
    t.includes('failover') || t.includes('recover mongodb')
  );
};

// ─────────────────────────────────────────────────────────────────────────────

const StepBlock = ({ step, stepIndex, runbookId, agentId, compact = false }) => {
  const [runState,    setRunState]    = useState('idle');   // idle | running | streaming | done | error
  const [allLines,    setAllLines]    = useState([]);
  const [revealIdx,   setRevealIdx]   = useState(0);
  const [visLines,    setVisLines]    = useState([]);
  const [doneAt,      setDoneAt]      = useState(null);
  const termRef = useRef(null);

  const actionLabel   = deriveActionLabel(step.title);
  const risky         = isHighRisk(step.title);
  const executeEnabled = isSubFeatureEnabled('workbench.runbooks.execute');

  // ── Streaming: reveal one line at a time ──────────────────────────────────
  useEffect(() => {
    if (runState !== 'streaming') return;
    if (revealIdx >= allLines.length) {
      setRunState('done');
      const now = new Date().toLocaleTimeString();
      setDoneAt(now);
      logOp({ action: actionLabel, target: step.title });
      return;
    }
    const t = setTimeout(() => {
      setVisLines(prev => [...prev, allLines[revealIdx]]);
      setRevealIdx(i => i + 1);
      if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
    }, 140 + Math.random() * 120);
    return () => clearTimeout(t);
  }, [runState, revealIdx, allLines, actionLabel, step.title]);

  const execute = useCallback(async () => {
    setRunState('running');
    setVisLines([]);
    setAllLines([]);
    setRevealIdx(0);
    setDoneAt(null);
    try {
      const result = await executeOpTask(`${runbookId}:${stepIndex}`, { title: step.title, agentId });
      setAllLines(result.lines);
      setRevealIdx(0);
      setVisLines([]);
      setRunState('streaming');
    } catch (err) {
      setVisLines([`ERROR: ${err.message}`]);
      setRunState('error');
      logOp({ action: actionLabel, target: step.title, status: 'Failed' });
    }
  }, [runbookId, stepIndex, step.title, actionLabel, agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Button ────────────────────────────────────────────────────────────────
  const isDone    = runState === 'done';
  const isRunning = runState === 'running' || runState === 'streaming';
  const isError   = runState === 'error';

  const noTarget  = !agentId && !isDone;
  const btnDanger = isError || (risky && !isDone);
  const btnStyle  = isDone
    ? { background: '#10B981', borderColor: '#10B981', color: 'white', fontSize: 11 }
    : { fontSize: 11 };

  const btnLabel = isDone
    ? 'Step Verified'
    : isRunning
    ? 'Running…'
    : isError
    ? 'Retry'
    : actionLabel;

  const btnIcon = isDone
    ? <CheckCircle size={11} strokeWidth={2} />
    : isError
    ? <AlertTriangle size={11} strokeWidth={2} />
    : <Play size={11} strokeWidth={2} />;

  const actionBtn = (
    <Tooltip title={!executeEnabled ? 'Step execution available in Beta' : noTarget ? 'Select a target agent in the protocol header first' : undefined}>
      <span>
        <Button
          type="primary"
          danger={btnDanger}
          size="small"
          loading={isRunning}
          disabled={isDone || noTarget || !executeEnabled}
          icon={!isRunning ? btnIcon : null}
          onClick={risky ? undefined : execute}
          style={btnStyle}
        >
          {btnLabel}
        </Button>
      </span>
    </Tooltip>
  );

  const ml = compact ? 0 : 30;

  return (
    <div>
      {/* Step header */}
      {!compact && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 20, height: 20, borderRadius: '50%', background: isDone ? '#10B981' : '#000048', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0, transition: 'background 0.3s' }}>
              {stepIndex + 1}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#101828' }}>{step.title}</span>
          </div>
          {step.desc && (
            <p style={{ margin: '6px 0 0', marginLeft: ml, fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>{step.desc}</p>
          )}
          {step.command && (
            <pre style={{ margin: '8px 0 0', marginLeft: ml, background: '#0F172A', padding: '10px 14px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11, color: '#e2e8f0', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>
              {step.command}
            </pre>
          )}
        </>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: compact ? 0 : 8, marginLeft: ml }}>
        {risky && !isDone && executeEnabled ? (
          <Popconfirm
            title={`Execute against ${agentId || 'unknown target'}?`}
            description={`"${step.title}" is a destructive action and cannot be undone. Target: ${agentId || '—'}.`}
            onConfirm={execute}
            okText="Execute"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
            placement="topLeft"
          >
            {actionBtn}
          </Popconfirm>
        ) : actionBtn}

        {isDone && doneAt && (
          <span style={{ fontSize: 10, color: '#10B981', fontFamily: 'monospace' }}>
            ✓ Verified at {doneAt}
          </span>
        )}
        {isError && (
          <span style={{ fontSize: 10, color: '#EF4444', fontFamily: 'monospace' }}>
            ✗ Execution failed — review output below
          </span>
        )}
      </div>

      {/* Terminal output */}
      {(visLines.length > 0 || isRunning) && (
        <div
          ref={termRef}
          style={{
            marginTop: 8, marginLeft: ml,
            background: '#0F172A', borderRadius: 4,
            padding: '10px 14px', maxHeight: 180, overflowY: 'auto',
            fontFamily: 'monospace', fontSize: 11, lineHeight: 1.7,
          }}
        >
          {isRunning && visLines.length === 0 && (
            <span style={{ color: '#64748B' }}>Connecting to runtime...</span>
          )}
          {visLines.map((line, i) => (
            <div key={i} style={{ color: line.startsWith('✓') ? '#4ADE80' : line.startsWith('ERROR') || line.startsWith('✗') ? '#F87171' : line.startsWith('→') ? '#94A3B8' : '#CBD5E1' }}>
              {line}
            </div>
          ))}
          {isRunning && visLines.length > 0 && (
            <span style={{ color: '#64748B', animation: 'pulse 1s infinite' }}>▌</span>
          )}
        </div>
      )}

      {/* Verify note */}
      {!compact && step.verify && (
        <p style={{ margin: '6px 0 0', marginLeft: ml, fontSize: 11, color: isDone ? '#10B981' : '#94A3B8' }}>
          {isDone ? '✓' : '○'} Verify: {step.verify}
        </p>
      )}
    </div>
  );
};

export default StepBlock;

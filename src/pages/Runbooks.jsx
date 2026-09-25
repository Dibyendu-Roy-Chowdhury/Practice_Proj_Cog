import React, { useState, useEffect } from 'react';
import { Spin, Button, Modal, Form, Input, Select, message, Tooltip } from 'antd';
import { AlertTriangle, ExternalLink, User } from 'lucide-react';
import StepBlock from '../components/features/runbooks/StepBlock';
import { getRunbook, submitJiraTicket, getAgents, getAgentsSync } from '../services/API_services';
import { useTenant } from '../contexts/TenantContext';
import { isSubFeatureEnabled } from '../config/featureGates';

const SH = ({ title }) => (
  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>
);

const CATEGORIES = [
  { id: 'agent-restart',                label: 'Agent Restart'                },
  { id: 'cost-overrun',                 label: 'Cost Overrun'                 },
  { id: 'hitl-escalation',              label: 'Human Escalation'             },
  { id: 'perf-degradation',             label: 'Latency Degradation'          },
  { id: 'memory-leak',                  label: 'Memory Pressure'              },
  { id: 'security-breach',              label: 'Security Incident'            },
  { id: 'zeroops-recovery',             label: 'Platform Recovery'            },
  { id: 'rag-retrieval-degradation',    label: 'RAG Retrieval Degradation'    },
  { id: 'fine-tuning-failure-recovery', label: 'Fine-Tuning Job Failure'      },
  { id: 'model-drift-response',         label: 'Model Drift Response'         },
  { id: 'multi-agent-workflow-failure', label: 'Multi-Agent Workflow Failure' },
];

const KNOWN_IDS = new Set([
  'agent-restart', 'cost-overrun', 'hitl-escalation', 'memory-leak',
  'perf-degradation', 'security-breach', 'zeroops-recovery',
  'rag-retrieval-degradation', 'fine-tuning-failure-recovery',
  'model-drift-response', 'multi-agent-workflow-failure',
]);

const sevColor = (s) => s === 'P1' ? '#EF4444' : s === 'P2' ? '#F59E0B' : '#10B981';
const sevBg    = (s) => s === 'P1' ? '#FEF3F2' : s === 'P2' ? '#FFFAEB' : '#ECFDF3';

const ALL_PERSONAS = ['L1', 'L2', 'L3', 'Platform Eng'];

// ── Jira Escalation Modal ───────────────────────────────────────────────────
const EscalateModal = ({ open, onClose, context }) => {
  const [form]    = Form.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        agentName: context?.agentName || getAgentsSync()[0]?.name || 'Primary Agent',
        traceId:   context?.traceId   || `TRC-${Date.now().toString(36).toUpperCase()}`,
        severity:  context?.severity  || 'P1',
        errorLog:  context?.errorLog  || 'OOM kill — agent pod restarted. Memory usage peaked at 91% before SIGTERM.',
      });
    }
  }, [open, context, form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);
    try {
      const result = await submitJiraTicket(values);
      message.success(result.message);
      onClose();
      form.resetFields();
    } catch {
      message.error('Failed to submit ticket. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExternalLink size={15} strokeWidth={1.5} style={{ color: '#000048' }} />
          <span>Create Jira Ticket</span>
        </div>
      }
      open={open}
      onOk={handleSubmit}
      onCancel={onClose}
      okText="Raise Incident"
      confirmLoading={loading}
      okButtonProps={{}}
      width={520}
      destroyOnClose
    >
      <Form form={form} layout="vertical" requiredMark={false} style={{ marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item name="agentName" label="Agent Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="severity" label="Severity" rules={[{ required: true }]}>
            <Select options={[
              { value: 'P1', label: 'P1 — Critical' },
              { value: 'P2', label: 'P2 — High'     },
              { value: 'P3', label: 'P3 — Medium'   },
            ]} />
          </Form.Item>
        </div>
        <Form.Item name="traceId" label="Trace / Incident ID">
          <Input style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </Form.Item>
        <Form.Item name="errorLog" label="Exception Context / Trace Snippet">
          <Input.TextArea rows={4} style={{ fontFamily: 'monospace', fontSize: 11 }} />
        </Form.Item>
      </Form>
    </Modal>
  );
};


export default function Runbooks({ navParams }) {
  const { tenant } = useTenant();
  const [selected,     setSelected]     = useState('agent-restart');
  const [runbook,      setRunbook]      = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [escalateOpen, setEscalateOpen] = useState(false);
  const [targetAgent,  setTargetAgent]  = useState('');
  const [agentOptions, setAgentOptions] = useState([]);

  // Deep-link: pre-select runbook from incoming cross-pillar navigation
  useEffect(() => {
    if (navParams?.runbookId && KNOWN_IDS.has(navParams.runbookId)) setSelected(navParams.runbookId);
  }, [navParams?.runbookId]);

  // Pre-populate target agent when arriving from an alert drilldown
  useEffect(() => {
    if (navParams?.agentName) setTargetAgent(navParams.agentName);
  }, [navParams?.agentName]);

  // Load agent roster for the target selector
  useEffect(() => {
    setTargetAgent('');
    setAgentOptions([]);
    getAgents().then(d => {
      setAgentOptions((d.agents ?? []).map(a => ({ value: a.name, label: a.name })));
    }).catch(() => {});
  }, [tenant.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!KNOWN_IDS.has(selected)) {
      setRunbook(null);
      return;
    }
    setLoading(true);
    setRunbook(null);
    getRunbook(selected).then(setRunbook).catch(() => setRunbook(null)).finally(() => setLoading(false));
  }, [selected]);

  const escalateContext = runbook ? {
    agentName: targetAgent,
    traceId: `INC-${selected.toUpperCase().slice(0, 4)}-${Date.now().toString(36).toUpperCase()}`,
    severity: runbook.severity,
    errorLog: `Runbook triggered: ${runbook.title}. Review agent logs and trace for root cause.`,
  } : undefined;

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 0px)', background: '#F8FAFC' }}>
      {/* Left panel */}
      <div style={{ width: 220, background: 'white', borderRight: '1px solid #E2E8F0', overflowY: 'auto', flexShrink: 0 }}>
        <p style={{ margin: 0, padding: '16px 16px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#98A2B3' }}>
          Runbooks
        </p>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelected(cat.id)}
            style={{
              display: 'block', width: '100%', textAlign: 'left', padding: '10px 16px',
              background: selected === cat.id ? 'rgba(0, 0, 72, 0.05)' : 'transparent',
              border: 'none',
              borderLeftWidth: 3, borderLeftStyle: 'solid',
              borderLeftColor: selected === cat.id ? '#00B5E2' : 'transparent',
              color: selected === cat.id ? '#000048' : '#475569',
              fontSize: 13, fontWeight: selected === cat.id ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={e => { if (selected !== cat.id) e.currentTarget.style.background = '#F8FAFC'; }}
            onMouseLeave={e => { if (selected !== cat.id) e.currentTarget.style.background = 'transparent'; }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {!KNOWN_IDS.has(selected) && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60%', color: '#94A3B8' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: '#CBD5E1', margin: 0 }}>Select a runbook from the list to view its trigger conditions, steps, and escalation path.</p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 6 }}>
              {CATEGORIES.find(c => c.id === selected)?.label}
            </p>
          </div>
        )}

        {KNOWN_IDS.has(selected) && loading && (
          <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 80 }}>
            <Spin size="large" />
          </div>
        )}

        {KNOWN_IDS.has(selected) && !loading && runbook && (
          <div style={{ maxWidth: 860 }}>
            {/* Target Agent Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '10px 14px', background: 'white', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <User size={14} strokeWidth={1.5} style={{ color: '#94A3B8', flexShrink: 0 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>Affected Agent</span>
              <Select
                placeholder="Select the agent to execute this protocol against"
                value={targetAgent || undefined}
                onChange={setTargetAgent}
                onClear={() => setTargetAgent('')}
                options={agentOptions}
                style={{ flex: 1 }}
                size="small"
                allowClear
              />
              {!targetAgent && (
                <span style={{ fontSize: 11, color: '#F59E0B', whiteSpace: 'nowrap', flexShrink: 0 }}>⚠ Required to execute steps</span>
              )}
            </div>

            {/* Title + Severity + Escalate button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#101828' }}>{runbook.title}</h1>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sevBg(runbook.severity), color: sevColor(runbook.severity) }}>
                {runbook.severity}
              </span>
              {(() => {
                const escalateEnabled = isSubFeatureEnabled('workbench.runbooks.escalate');
                const escalateTip = !escalateEnabled
                  ? 'Escalation available in Beta'
                  : !targetAgent
                  ? 'Select a target agent to enable escalation'
                  : undefined;
                return (
                  <Tooltip title={escalateTip}>
                    <Button
                      size="small"
                      icon={<AlertTriangle size={12} strokeWidth={1.5} />}
                      onClick={() => setEscalateOpen(true)}
                      disabled={!targetAgent || !escalateEnabled}
                      style={{ marginLeft: 'auto', borderColor: (targetAgent && escalateEnabled) ? '#F04438' : undefined, color: (targetAgent && escalateEnabled) ? '#F04438' : undefined }}
                    >
                      Escalate to Jira
                    </Button>
                  </Tooltip>
                );
              })()}
            </div>

            {/* Personas */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
              {ALL_PERSONAS.map(p => {
                const active = runbook.personas?.includes(p);
                return (
                  <span key={p} style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99,
                    background: active ? '#000048' : '#F1F5F9',
                    color: active ? 'white' : '#94A3B8',
                  }}>{p}</span>
                );
              })}
            </div>

            {/* Triggers */}
            <div style={{ marginBottom: 24 }}>
              <SH title="Triggers" />
              <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                {runbook.triggers?.map((t, i) => (
                  <li key={`trigger-${i}-${t.slice(0,12)}`} style={{ fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 1.5 }}>{t}</li>
                ))}
              </ul>
            </div>

            {/* Steps */}
            <div style={{ marginBottom: 24 }}>
              <SH title="Steps" />
              <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {runbook.steps?.map((step, i) => (
                  <StepBlock
                    key={step.title || i}
                    step={step}
                    stepIndex={i}
                    runbookId={selected}
                    agentId={targetAgent}
                  />
                ))}
              </div>
            </div>

            {/* Escalation Path */}
            <div style={{ marginBottom: 24 }}>
              <SH title="Escalation" />
              <ul style={{ margin: '10px 0 0', paddingLeft: 20 }}>
                {runbook.escalation?.map((e, i) => (
                  <li key={`esc-${i}`} style={{ fontSize: 13, color: '#475569', marginBottom: 6, lineHeight: 1.5 }}>
                    {typeof e === 'string' ? e : `${e.from} → ${e.to}`}
                  </li>
                ))}
              </ul>
            </div>

          </div>
        )}
      </div>

      <EscalateModal open={escalateOpen} onClose={() => setEscalateOpen(false)} context={escalateContext} />
    </div>
  );
}

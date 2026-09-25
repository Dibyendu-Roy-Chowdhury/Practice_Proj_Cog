import React, { useState } from 'react';
import { Input, Button, Tag, Spin } from 'antd';
import { Send, MessageSquare, Clock, ChevronRight } from 'lucide-react';
import { callAgentOpsAgent } from '../services/API_services';
import PageHeader from '../components/layout/PageHeader';
import CodeBlock  from '../components/common/CodeBlock';
import StatusBadge from '../components/common/Badge';

const { TextArea } = Input;

const INTENT_COLORS = {
  agent_list_query:     'blue',
  token_usage_query:    'purple',
  cost_analytics_query: 'green',
  alert_query:          'red',
  agent_registration:   'cyan',
  log_sync_query:       'orange',
  agent_rollback_query: 'gold',
  system_status_query:  'geekblue',
  general_query:        'default',
};

const EXAMPLE_QUERIES = [
  'List all registered agents',
  'Get token usage for the last 7 days',
  'Show critical alerts',
  'What is the system status?',
  'Get cost metrics for last 30 days',
  'Sync model invocation logs',
];

const INIT_HISTORY = [
  { id: 1, query: 'Show me all active agents',  timestamp: '2026-07-14 09:30', status: 'completed', intent: 'agent_list_query'   },
  { id: 2, query: 'Get token usage last 7 days', timestamp: '2026-07-14 08:15', status: 'completed', intent: 'token_usage_query'  },
  { id: 3, query: 'List critical alerts today',  timestamp: '2026-07-14 07:45', status: 'completed', intent: 'alert_query'        },
  { id: 4, query: 'System status report',        timestamp: '2026-07-13 16:20', status: 'completed', intent: 'system_status_query'},
  { id: 5, query: 'Cost metrics last 30 days',   timestamp: '2026-07-13 14:10', status: 'completed', intent: 'cost_analytics_query'},
];

const intentColor = intent => INTENT_COLORS[intent] || 'default';

export default function AICommandAssistant() {
  const [prompt,  setPrompt]  = useState('');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [history, setHistory] = useState(INIT_HISTORY);

  const handleSubmit = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await callAgentOpsAgent(prompt);
      setResult(res);
      setHistory(prev => [{
        id:        Date.now(),
        query:     prompt,
        timestamp: new Date().toLocaleString('en-GB', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ''),
        status:    'completed',
        intent:    res.intent || 'general_query',
      }, ...prev]);
      setPrompt('');
    } catch {
      // silently fail in demo
    } finally { setLoading(false); }
  };

  const handleKey = e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit(); };

  const cardCls = 'bg-white border border-border rounded shadow-card';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 64px)', overflow: 'hidden', background: '#F8F9FB' }}>

      {/* ── Main Query Workspace ── */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '0 0 24px' }}>
        <PageHeader
          title="AI Command Assistant"
          subtitle="Issue directives in natural language — the CoordinatorAgent routes intent to the appropriate specialist and synthesises a structured response"
        />

        {/* Input Card */}
        <div className={`${cardCls} p-4 mb-4`}>
          <p className="text-xs text-ink-tertiary mb-2">
            Query fleet status, expenditure, alerts, or telemetry in plain language.{' '}
            <kbd className="px-1 py-0.5 rounded bg-surface-raised border border-border font-mono text-xs">Ctrl+Enter</kbd>{' '}to dispatch.
          </p>
          <TextArea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={handleKey}
            placeholder='"Show the agent fleet registry" · "Get token expenditure last 7 days" · "Surface active policy violations"'
            rows={3}
            style={{ resize: 'none', fontFamily: 'inherit', fontSize: 13 }}
          />
          <div className="flex items-center justify-between mt-3 gap-4 flex-wrap">
            <div className="flex flex-wrap gap-2 flex-1">
              <span className="text-xs text-ink-tertiary self-center">Examples:</span>
              {EXAMPLE_QUERIES.map(q => (
                <button
                  key={q}
                  onClick={() => setPrompt(q)}
                  className="text-xs px-2 py-0.5 rounded border border-border text-ink-secondary hover:border-navy hover:text-navy transition-colors"
                  style={{ background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}
                >
                  {q}
                </button>
              ))}
            </div>
            <Button
              type="primary"
              icon={<Send size={13} strokeWidth={1.5} />}
              onClick={handleSubmit}
              loading={loading}
              style={{ flexShrink: 0 }}
            >
              Execute
            </Button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className={`${cardCls} p-8 flex flex-col items-center gap-3 mb-4`}>
            <Spin size="large" />
            <p className="text-sm text-ink-secondary">CoordinatorAgent → routing query via LangGraph…</p>
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className={`${cardCls} mb-4`}>
            <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
              <ChevronRight size={13} strokeWidth={1.5} style={{ color: '#000048' }} />
              <span className="text-sm font-semibold text-ink-primary">Query Response</span>
              <Tag color={INTENT_COLORS[result.intent] || 'default'}>{result.intent}</Tag>
              <Tag color="green">Confidence: {result.confidence ? `${(result.confidence * 100).toFixed(0)}%` : '—'}</Tag>
              <StatusBadge variant="success" dot className="ml-auto">completed</StatusBadge>
            </div>
            <div className="p-4">
              <div className="p-3 rounded bg-surface-raised border border-border mb-4">
                <p className="text-sm text-ink-primary leading-relaxed">{result.response}</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 text-xs">
                <div><span className="font-semibold text-ink-secondary">Agent Type: </span><Tag style={{ fontSize: 11 }}>{result.agent_type}</Tag></div>
                <div><span className="font-semibold text-ink-secondary">Tool Used: </span><Tag color="blue" style={{ fontSize: 11 }}>{result.tool_used}</Tag></div>
                <div>
                  <span className="font-semibold text-ink-secondary">Executed: </span>
                  <span className="font-mono text-ink-tertiary">{result.executedAt ? new Date(result.executedAt).toLocaleTimeString() : '—'}</span>
                </div>
              </div>
              {result.sources && (
                <div className="mb-4 text-xs">
                  <span className="font-semibold text-ink-secondary">Sources: </span>
                  {result.sources.map(s => <Tag key={s} style={{ fontSize: 11 }}>{s}</Tag>)}
                </div>
              )}
              <CodeBlock code={result} language="json" title="Raw response" collapsible />
            </div>
          </div>
        )}

        {!result && !loading && (
          <div className={`${cardCls} p-12 flex flex-col items-center gap-3`} style={{ opacity: 0.5 }}>
            <MessageSquare size={32} strokeWidth={1} style={{ color: '#CBD5E1' }} />
            <p className="text-sm text-ink-tertiary">Enter a query above to get started</p>
          </div>
        )}
      </main>

      {/* ── Command Audit Trail — bottom panel ── */}
      <div style={{
        flexShrink: 0,
        background: 'white',
        borderTop: '1px solid #E2E8F0',
      }}>
        {/* Header row */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 20px',
          borderBottom: '1px solid #F1F5F9',
        }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#98A2B3' }}>
            Command Audit Trail
          </p>
          <span style={{ fontSize: 11, color: '#CBD5E1' }}>
            {history.length} directives · current session
          </span>
        </div>

        {/* Vertically scrollable directive list */}
        <div style={{ maxHeight: 200, overflowY: 'auto', scrollbarWidth: 'thin' }}>
          {history.map(h => (
            <button
              key={h.id}
              onClick={() => setPrompt(h.query)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', textAlign: 'left',
                padding: '8px 20px',
                background: 'transparent',
                border: 'none', borderBottom: '1px solid #F1F5F9',
                cursor: 'pointer', outline: 'none',
                transition: 'background 0.12s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <MessageSquare size={11} strokeWidth={1.5} style={{ color: '#98A2B3', flexShrink: 0 }} />
              <p style={{ margin: 0, fontSize: 12, color: '#344054', fontWeight: 500, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.query}
              </p>
              <Tag color={intentColor(h.intent)} style={{ fontSize: 9, lineHeight: '14px', margin: 0, padding: '0 5px', flexShrink: 0 }}>
                {h.intent?.replace(/_/g, ' ')}
              </Tag>
              <span style={{ fontSize: 10, color: '#98A2B3', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0, whiteSpace: 'nowrap' }}>
                <Clock size={9} strokeWidth={1.5} />{h.timestamp}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { Table, Tag, Spin } from 'antd';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RCTooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import { getInterceptorFireRate, getGuardrailFalsePositives, getInterceptorLatency, getTopBlockedPatterns, getGuardrailCoverageMap, getAgentsSync } from '../services/API_services';

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const SH = ({ title }) => <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>;
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#E2E8F0' }}>
      <p style={{ margin:'0 0 6px', fontWeight:700, color:'#94A3B8' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:'flex', gap:8, marginBottom:3 }}>
          <span style={{ color: p.color || '#00B5E2' }}>{p.name}:</span>
          <span style={{ fontWeight:600 }}>{typeof p.value==='number'?p.value.toLocaleString():p.value}</span>
        </div>
      ))}
    </div>
  );
};

const INTERCEPTORS = ['pii_redaction','prompt_injection','semantic_consistency','toxicity_filter','credential_guard','output_filtering','rag_grounding_guard'];
const INT_COLORS = { pii_redaction:'#000048', prompt_injection:'#EF4444', semantic_consistency:'#F59E0B', toxicity_filter:'#F97316', credential_guard:'#8B5CF6', output_filtering:'#10B981', rag_grounding_guard:'#00B5E2' };
const INT_LABELS = { pii_redaction:'PII Redaction', prompt_injection:'Prompt Injection', semantic_consistency:'Semantic Consistency', toxicity_filter:'Toxicity Filter', credential_guard:'Credential Guard', output_filtering:'Output Filtering', rag_grounding_guard:'RAG Grounding Guard' };

const GUARDRAIL_KEYS = ['pii','injection','credential','semantic','toxicity','allowlist'];
const GUARDRAIL_LABELS = { pii:'PII Redaction', injection:'Prompt Injection', credential:'Credential Guard', semantic:'Semantic Consistency', toxicity:'Toxicity Filter', allowlist:'Allowlist' };

export default function GuardrailAnalytics({ onNavigate }) {
  // Derive agent list from SSOT — updates when tenant/env changes (remount via AppShell key).
  const AGENTS = getAgentsSync().map(a => a.name);

  const [fireRate, setFireRate]  = useState([]);
  const [fpRates,  setFpRates]   = useState([]);
  const [latency,  setLatency]   = useState([]);
  const [blocked,  setBlocked]   = useState([]);
  const [coverage, setCoverage]  = useState([]);
  const [loading,  setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      getInterceptorFireRate(),
      getGuardrailFalsePositives(),
      getInterceptorLatency(),
      getTopBlockedPatterns(),
      getGuardrailCoverageMap(),
    ]).then(([f, fp, l, b, c]) => {
      setFireRate(f.data || []);
      setFpRates(fp.data || []);
      setLatency(l.data || []);
      setBlocked(b.data || []);
      setCoverage(c.data || []);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div style={{padding:40,textAlign:'center'}}><Spin size="large"/></div>;

  const blockedCols = [
    { title:'Category',     dataIndex:'category',     key:'category',     render:v=><strong style={{fontSize:12}}>{v}</strong> },
    { title:'Interceptor',  dataIndex:'interceptor',  key:'interceptor',  render:v=><Tag style={{fontSize:10}}>{v}</Tag> },
    { title:'Fires (7d)',   dataIndex:'count7d',      key:'count7d',      width:100, render:v=><span style={{fontFamily:'monospace',fontWeight:700}}>{v.toLocaleString()}</span> },
    { title:'Agents',       dataIndex:'agentsAffected',key:'agentsAffected',width:80, render:v=><span>{v}</span> },
    { title:'Last Seen',    dataIndex:'lastSeen',     key:'lastSeen',     width:120, render:v=><span style={{color:'#94A3B8',fontSize:11}}>{v}</span> },
  ];

  const fpCols = [
    { title:'Interceptor',  dataIndex:'interceptor', key:'interceptor', render:v=><strong style={{fontSize:12}}>{v}</strong> },
    { title:'Total Fires',  dataIndex:'total',       key:'total',       width:100, render:v=><span style={{fontFamily:'monospace'}}>{v.toLocaleString()}</span> },
    { title:'False Pos.',   dataIndex:'fp',          key:'fp',          width:90,  render:v=><span style={{fontFamily:'monospace',color:'#F59E0B',fontWeight:700}}>{v}</span> },
    { title:'FP Rate',      dataIndex:'fpRate',      key:'fpRate',      width:90,  render:v=><Tag color={v>10?'error':v>5?'warning':'success'} style={{fontSize:10}}>{v}%</Tag> },
    { title:'Trend',        dataIndex:'trend',       key:'trend',       width:80,  render:v=><span style={{color:v.startsWith('+')?'#EF4444':'#10B981',fontWeight:600,fontSize:11}}>{v}</span> },
    { title:'',             key:'action',            width:130,         render:()=>(
      <button
        onClick={() => onNavigate?.('2', { tab: 'overrides' })}
        style={{fontSize:11,fontWeight:600,color:'#000048',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}
      >Review in HITL →</button>
    )},
  ];

  // Build latency chart: sum ms per agent per interceptor
  const latencyByAgent = AGENTS.map(agent => {
    const row = { agent };
    INTERCEPTORS.forEach(int => {
      const entry = latency.find(l => l.agent === agent && l.interceptor.toLowerCase().replace(/ /g,'_').includes(int.split('_')[0]));
      row[int] = entry?.latencyMs || 0;
    });
    row.total = INTERCEPTORS.reduce((s, k) => s + (row[k] || 0), 0);
    return row;
  });

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* Interceptor Fire Rate */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16 }}>
        <SH title="Interceptor Fire Rate — 30 days" />
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={fireRate.slice(-14)}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" axisLine={false} tickLine={false} fontSize={10} tick={{fill:'#94A3B8'}} interval={2} />
            <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill:'#94A3B8'}} />
            <RCTooltip content={<DarkTooltip />} />
            {INTERCEPTORS.map(k => (
              <Area key={k} type="monotone" dataKey={k} stackId="1" stroke={INT_COLORS[k]} fill={INT_COLORS[k]} fillOpacity={0.5} name={INT_LABELS[k]} />
            ))}
          </AreaChart>
        </ResponsiveContainer>
        <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:8 }}>
          {INTERCEPTORS.map(k => (
            <span key={k} style={{fontSize:11,color:'#64748B',display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:10,height:10,borderRadius:2,background:INT_COLORS[k]}} />{INT_LABELS[k]}
            </span>
          ))}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        {/* False Positive Rate Table */}
        <div style={{ ...cardStyle, padding:'16px 20px' }}>
          <SH title="False Positive Rate per Interceptor" />
          <Table dataSource={fpRates} columns={fpCols} rowKey="interceptor" size="small" pagination={false} />
        </div>

        {/* Interceptor Latency Overhead */}
        <div style={{ ...cardStyle, padding:'16px 20px' }}>
          <SH title="Interceptor Latency Overhead per Agent (ms)" />
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={latencyByAgent}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="agent" axisLine={false} tickLine={false} fontSize={10} tick={{fill:'#94A3B8'}} />
              <YAxis axisLine={false} tickLine={false} fontSize={10} tick={{fill:'#94A3B8'}} />
              <RCTooltip content={<DarkTooltip />} />
              {INTERCEPTORS.map(k => (
                <Bar key={k} dataKey={k} stackId="a" fill={INT_COLORS[k]} name={INT_LABELS[k]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Blocked Patterns */}
      <div style={{ ...cardStyle, padding:'16px 20px', marginBottom:16 }}>
        <SH title="Top Blocked Patterns (7-day)" />
        <Table dataSource={blocked} columns={blockedCols} rowKey="category" size="small" pagination={false} />
      </div>

      {/* Guardrail Coverage Map */}
      <div style={{ ...cardStyle, padding:'16px 20px' }}>
        <SH title="Guardrail Coverage Map" />
        <div style={{ overflowX:'auto' }}>
          <table style={{ borderCollapse:'collapse', width:'100%', fontSize:12 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #E2E8F0' }}>
                <th style={{ padding:'6px 12px', textAlign:'left', color:'#94A3B8', fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Agent</th>
                {GUARDRAIL_KEYS.map(k => (
                  <th key={k} style={{ padding:'6px 12px', textAlign:'center', color:'#94A3B8', fontWeight:700, fontSize:10, textTransform:'uppercase' }}>{GUARDRAIL_LABELS[k]}</th>
                ))}
                <th style={{ padding:'6px 12px', textAlign:'center', color:'#94A3B8', fontWeight:700, fontSize:10, textTransform:'uppercase' }}>Compliance</th>
              </tr>
            </thead>
            <tbody>
              {coverage.map(row => {
                const enabledCount = GUARDRAIL_KEYS.filter(k => row[k]).length;
                const compliant = enabledCount === GUARDRAIL_KEYS.length;
                return (
                  <tr key={row.agent} style={{ borderBottom:'1px solid #F1F5F9' }}>
                    <td style={{ padding:'8px 12px', fontWeight:600, color:'#101828' }}>{row.agent}</td>
                    {GUARDRAIL_KEYS.map(k => (
                      <td key={k} style={{ padding:'8px 12px', textAlign:'center' }}>
                        {row[k]
                          ? <ShieldCheck size={14} strokeWidth={1.5} style={{color:'#10B981'}} />
                          : <ShieldAlert size={14} strokeWidth={1.5} style={{color:'#EF4444'}} />}
                      </td>
                    ))}
                    <td style={{ padding:'8px 12px', textAlign:'center' }}>
                      <Tag color={compliant?'success':'error'} style={{fontSize:10}}>{compliant?'Compliant':'Non-compliant'}</Tag>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

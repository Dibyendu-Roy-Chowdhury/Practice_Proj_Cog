import React, { useState, useEffect } from 'react';
import { Select, Table, Tag, Spin } from 'antd';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RCTooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle } from 'lucide-react';
import { getEmbeddingDrift, getClusterCoherence, getEmbeddingDimContribution, getNNAnomalies, getCrossAgentOverlap, getAgentsSync } from '../services/API_services';
import KpiBar from '../components/common/KpiBar';

const cardStyle = { background: '#fff', border: '1px solid #E2E8F0', borderRadius: 6, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const SH = ({ title }) => <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>;
const DarkTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'#1E293B', border:'1px solid #334155', borderRadius:8, padding:'10px 14px', fontSize:11, color:'#E2E8F0' }}>
      <p style={{ margin:'0 0 6px', fontWeight:700, color:'#94A3B8' }}>{label}</p>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display:'flex', gap:8, marginBottom:3 }}>
          <span style={{ color: p.color || '#00B5E2' }}>{p.name || p.dataKey}:</span>
          <span style={{ fontWeight:600 }}>{typeof p.value === 'number' ? p.value.toFixed(3) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

const driftColor = (v) => v > 0.20 ? '#EF4444' : v >= 0.10 ? '#F59E0B' : '#10B981';
const DAYS = Array.from({length:14},(_,i) => `d${i+1}`);

export default function EmbeddingAnalytics({ onNavigate }) {
  // Derive agent list from SSOT — updates when tenant/env changes (remount via AppShell key).
  const AGENTS = getAgentsSync().map(a => a.name);

  const [drift,     setDrift]     = useState([]);
  const [coherence, setCoherence] = useState([]);
  const [dims,      setDims]      = useState([]);
  const [nnAnom,    setNnAnom]    = useState([]);
  const [overlap,   setOverlap]   = useState([]);
  const [selAgent,  setSelAgent]  = useState(() => AGENTS[0] || '');
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([
      getEmbeddingDrift(),
      getClusterCoherence(),
      getNNAnomalies(),
      getCrossAgentOverlap(),
    ]).then(([d, c, nn, ov]) => {
      setDrift(d.data || []);
      setCoherence(c.data || []);
      setNnAnom(nn.data || []);
      setOverlap(ov.data || []);
    }).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  useEffect(() => {
    getEmbeddingDimContribution(selAgent).then(d => setDims(d.data || [])).catch(()=>{});
  }, [selAgent]);

  if (loading) return <div style={{padding:40,textAlign:'center'}}><Spin size="large"/></div>;

  const kpiTiles = coherence.map(c => ({
    label: c.agent,
    value: String(c.score),
    trend: { label: `${c.trend} pts`, direction: c.trend.startsWith('+') ? 'up' : 'down' },
  }));

  const nnCols = [
    { title:'Timestamp',   dataIndex:'ts',        key:'ts',        width:120, render:v=><span style={{fontSize:11,color:'#94A3B8'}}>{v}</span> },
    { title:'Agent',       dataIndex:'agent',      key:'agent',     width:110, render:v=><span style={{fontSize:12,fontWeight:600,color:'#101828'}}>{v}</span> },
    { title:'Episode ID',  dataIndex:'episodeId',  key:'episodeId', width:130, render:v=><span style={{fontFamily:'monospace',fontSize:11}}>{v}</span> },
    { title:'NN Distance', dataIndex:'nnDist',     key:'nnDist',    width:110, render:v=><span style={{fontWeight:700,fontFamily:'monospace',color:'#000048'}}>{v}</span> },
    { title:'Ref Doc',     dataIndex:'refDoc',     key:'refDoc',    render:v=><span style={{fontSize:11,color:'#64748B'}}>{v}</span> },
    { title:'Severity',    dataIndex:'severity',   key:'severity',  width:90,  render:v=><Tag color={v==='High'?'error':v==='Medium'?'warning':'default'} style={{fontSize:10}}>{v}</Tag> },
    { title:'',            key:'action',           width:160,       render:(_,row)=>(
      <button
        onClick={() => onNavigate?.('2', { tab: 'troubleshoot', agentId: row.agent })}
        style={{fontSize:11,fontWeight:600,color:'#000048',background:'none',border:'none',cursor:'pointer',padding:0,textDecoration:'underline'}}
      >Investigate in Workbench →</button>
    )},
  ];

  return (
    <div style={{ padding: '0 24px 24px' }}>
      {/* Cluster Coherence KPI Strip */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16 }}>
        <SH title="Cluster Coherence Score — per agent (0–100)" />
        <KpiBar tiles={kpiTiles} />
      </div>

      {/* Embedding Drift Heatmap */}
      <div style={{ ...cardStyle, padding: '16px 20px', marginBottom: 16 }}>
        <SH title="Embedding Drift Heatmap — cosine distance from baseline (14-day window)" />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 11, width: '100%' }}>
            <thead>
              <tr>
                <th style={{ padding: '4px 10px', textAlign: 'left', color: '#94A3B8', fontWeight: 700, fontSize: 10, textTransform: 'uppercase' }}>Agent</th>
                {DAYS.map((d, i) => (
                  <th key={d} style={{ padding: '4px 8px', textAlign: 'center', color: '#94A3B8', fontWeight: 700, fontSize: 10 }}>D-{14-i}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drift.map(row => (
                <tr key={row.agent}>
                  <td style={{ padding: '4px 10px', fontWeight: 600, color: '#101828', whiteSpace: 'nowrap' }}>{row.agent}</td>
                  {DAYS.map(d => {
                    const val = row[d] || 0;
                    const isHigh = val > 0.20;
                    return (
                      <td key={d} style={{ padding: '4px 8px', textAlign: 'center' }}>
                        <div
                          onClick={() => isHigh && onNavigate?.('2', { tab: 'troubleshoot', agentId: row.agent, preset: 'drift-investigation' })}
                          title={isHigh ? `High drift — click to investigate in Troubleshoot` : undefined}
                          style={{
                            width: 32, height: 20, borderRadius: 3, margin: '0 auto',
                            background: driftColor(val),
                            opacity: 0.6 + val * 1.5,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 9, fontWeight: 700, color: '#fff',
                            cursor: isHigh ? 'pointer' : 'default',
                            outline: isHigh ? '2px solid rgba(239,68,68,0.5)' : 'none',
                          }}
                        >{val.toFixed(2)}</div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11, color: '#64748B' }}>
            <span><span style={{ display:'inline-block',width:12,height:12,background:'#10B981',borderRadius:2,marginRight:4,verticalAlign:'middle' }}/>{'< 0.10 Normal'}</span>
            <span><span style={{ display:'inline-block',width:12,height:12,background:'#F59E0B',borderRadius:2,marginRight:4,verticalAlign:'middle' }}/>0.10–0.20 Elevated</span>
            <span><span style={{ display:'inline-block',width:12,height:12,background:'#EF4444',borderRadius:2,marginRight:4,verticalAlign:'middle' }}/>{'>0.20 Critical'}</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Dimension Contribution */}
        <div style={{ ...cardStyle, padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SH title="Top 10 Drift-Contributing Dimensions" />
            <Select value={selAgent} onChange={setSelAgent} size="small" style={{ width: 130 }}
              options={AGENTS.map(a => ({ value: a, label: a }))} />
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={[...dims].reverse()} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
              <XAxis type="number" domain={[0,0.45]} axisLine={false} tickLine={false} fontSize={10} tick={{fill:'#94A3B8'}} />
              <YAxis type="category" dataKey="dim" axisLine={false} tickLine={false} fontSize={9} tick={{fill:'#64748B'}} width={150} />
              <RCTooltip content={<DarkTooltip />} />
              <Bar dataKey="contribution" fill="#000048" radius={[0,3,3,0]} name="Contribution" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Cross-Agent Overlap Radar */}
        <div style={{ ...cardStyle, padding: '16px 20px' }}>
          <SH title="Cross-Agent Embedding Overlap (semantic similarity %)" />
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={AGENTS.map(a => ({ agent: a, overlap: overlap.find(r=>r.agent===selAgent)?.[a] || 0 }))}>
              <PolarGrid stroke="#E2E8F0" />
              <PolarAngleAxis dataKey="agent" tick={{ fontSize: 11, fill: '#64748B' }} />
              <Radar name="Overlap" dataKey="overlap" stroke="#00B5E2" fill="#00B5E2" fillOpacity={0.2} strokeWidth={1.5} />
              <RCTooltip content={<DarkTooltip />} />
            </RadarChart>
          </ResponsiveContainer>
          <p style={{ fontSize: 11, color: '#94A3B8', margin: '4px 0 0', textAlign: 'center' }}>Showing overlap from <strong>{selAgent}</strong>'s perspective</p>
        </div>
      </div>

      {/* NN Anomalies Table */}
      <div style={{ ...cardStyle, padding: '16px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={14} strokeWidth={1.5} style={{ color: '#F59E0B' }} />
          <SH title="Nearest-Neighbour Anomalies (distance > 2σ)" />
        </div>
        <Table dataSource={nnAnom} columns={nnCols} rowKey="episodeId" size="small" pagination={false}
          style={{ fontSize: 12 }} />
      </div>
    </div>
  );
}

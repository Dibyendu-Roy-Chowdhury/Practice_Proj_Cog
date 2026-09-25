import React, { useState, useEffect } from 'react';
import { Table, Drawer, Tag, Spin } from 'antd';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Tooltip as RCTooltip, ResponsiveContainer } from 'recharts';
import { ChevronRight } from 'lucide-react';
import { getModelRegistry } from '../services/API_services';
import PageHeader from '../components/layout/PageHeader';

const cardStyle = { background:'#fff', border:'1px solid #E2E8F0', borderRadius:6, boxShadow:'0 1px 3px rgba(0,0,0,0.06)' };
const SH = ({ title }) => <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4 block">{title}</span>;

const LIFECYCLE_COLOR = { Active:'success', Evaluating:'processing', Candidate:'default', Deprecated:'warning', Retired:'error' };

export default function ModelRegistry({ onNavigate }) {
  const [models,    setModels]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState(null);
  const [drawerOpen,setDrawerOpen]= useState(false);
  const [compareSet,setCompareSet]= useState([]);

  useEffect(() => {
    getModelRegistry().then(d => setModels(d.data || [])).catch(()=>{}).finally(()=>setLoading(false));
  }, []);

  const openDrawer = (model) => { setSelected(model); setDrawerOpen(true); };

  const columns = [
    { title:'Model',           dataIndex:'name',        key:'name',        render:(v,r)=>(
        <button onClick={()=>openDrawer(r)} style={{background:'none',border:'none',cursor:'pointer',textAlign:'left',padding:0}}>
          <span style={{fontSize:13,fontWeight:700,color:'#000048'}}>{v}</span>
        </button>
      )},
    { title:'Provider',        dataIndex:'provider',    key:'provider',    render:v=><span style={{fontSize:12,color:'#64748B'}}>{v}</span> },
    { title:'Version',         dataIndex:'version',     key:'version',     width:120, render:v=><span style={{fontFamily:'monospace',fontSize:11}}>{v}</span> },
    { title:'Context Window',  dataIndex:'contextWindow',key:'contextWindow',width:130, render:v=><span style={{fontFamily:'monospace',fontSize:11}}>{(v/1000).toFixed(0)}K</span> },
    { title:'Agents Using',    dataIndex:'agentsUsing', key:'agentsUsing', width:140, render:v=>v.length ? v.map(a=><Tag key={a} style={{fontSize:10,margin:'1px'}}>{a}</Tag>) : <span style={{color:'#94A3B8',fontSize:11}}>None</span> },
    { title:'Lifecycle',       dataIndex:'lifecycle',   key:'lifecycle',   width:120, render:v=><Tag color={LIFECYCLE_COLOR[v]||'default'} style={{fontSize:10}}>{v}</Tag> },
    { title:'Last Eval',       dataIndex:'lastEval',    key:'lastEval',    width:120, render:v=><span style={{fontSize:11,color:'#94A3B8'}}>{v}</span> },
    { title:'',                key:'action',            width:40,          render:(_,r)=><ChevronRight size={14} strokeWidth={1.5} style={{color:'#94A3B8',cursor:'pointer'}} onClick={()=>openDrawer(r)} /> },
  ];

  const benchmarkRadarData = selected ? [
    { metric:'MMLU',     score: selected.mmlu || 0     },
    { metric:'HumanEval',score: selected.humaneval || 0},
    { metric:'GSM8K',    score: selected.gsm8k || 0    },
    { metric:'Safety',   score: 88                     },
    { metric:'Latency',  score: 75                     },
  ] : [];

  return (
    <div style={{ padding:'0 0 24px' }}>
      <PageHeader
        title="Model Registry"
        subtitle="Foundation model inventory, model cards, benchmarks, and lifecycle management"
      />

      {loading ? <div style={{padding:40,textAlign:'center'}}><Spin size="large"/></div> : (
        <div style={cardStyle}>
          <Table dataSource={models} columns={columns} rowKey="id" size="small"
            rowSelection={{ selectedRowKeys: compareSet, onChange: setCompareSet, type:'checkbox' }}
            pagination={false} style={{fontSize:12}} />
        </div>
      )}

      {/* Model Card Drawer */}
      <Drawer
        title={selected ? <span style={{fontWeight:700,color:'#101828'}}>{selected.name} — Model Card</span> : ''}
        width={620}
        open={drawerOpen}
        onClose={()=>setDrawerOpen(false)}
        bodyStyle={{padding:0}}
      >
        {selected && (
          <div style={{padding:'20px 24px'}}>
            {/* Overview */}
            <div style={{...cardStyle,padding:'16px 20px',marginBottom:16}}>
              <SH title="Overview" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                {[
                  ['Provider', selected.provider],['Version', selected.version],
                  ['Architecture', selected.arch],['Parameters', selected.params],
                  ['Context Window', `${(selected.contextWindow/1000).toFixed(0)}K tokens`],['Release Date', selected.releaseDate],
                  ['License', selected.license],['Region', selected.region],
                ].map(([k,v])=>(
                  <div key={k}>
                    <p style={{margin:'0 0 2px',fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase'}}>{k}</p>
                    <p style={{margin:0,fontSize:12,color:'#101828'}}>{v}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Benchmarks Radar */}
            <div style={{...cardStyle,padding:'16px 20px',marginBottom:16}}>
              <SH title="Benchmark Scores" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,alignItems:'center'}}>
                <ResponsiveContainer width="100%" height={180}>
                  <RadarChart data={benchmarkRadarData}>
                    <PolarGrid stroke="#E2E8F0" />
                    <PolarAngleAxis dataKey="metric" tick={{fontSize:11,fill:'#64748B'}} />
                    <Radar name="Score" dataKey="score" stroke="#000048" fill="#000048" fillOpacity={0.2} strokeWidth={1.5} />
                    <RCTooltip />
                  </RadarChart>
                </ResponsiveContainer>
                <div>
                  {[['MMLU',selected.mmlu],['HumanEval',selected.humaneval],['GSM8K',selected.gsm8k]].map(([k,v])=>(
                    <div key={k} style={{marginBottom:10}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                        <span style={{fontSize:12,color:'#64748B'}}>{k}</span>
                        <span style={{fontSize:12,fontWeight:700,color:'#000048'}}>{v}</span>
                      </div>
                      <div style={{height:5,background:'#F1F5F9',borderRadius:3}}>
                        <div style={{height:'100%',width:`${v}%`,background:'#000048',borderRadius:3}} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cost Profile */}
            <div style={{...cardStyle,padding:'16px 20px',marginBottom:16}}>
              <SH title="Cost Profile" />
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div style={{padding:'10px 14px',background:'#F8F9FB',borderRadius:6}}>
                  <p style={{margin:'0 0 2px',fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase'}}>Input (per 1K tokens)</p>
                  <p style={{margin:0,fontSize:18,fontWeight:700,color:'#000048',fontFamily:'monospace'}}>${selected.costIn?.toFixed(4)}</p>
                </div>
                <div style={{padding:'10px 14px',background:'#F8F9FB',borderRadius:6}}>
                  <p style={{margin:'0 0 2px',fontSize:10,fontWeight:700,color:'#94A3B8',textTransform:'uppercase'}}>Output (per 1K tokens)</p>
                  <p style={{margin:0,fontSize:18,fontWeight:700,color:'#EF4444',fontFamily:'monospace'}}>${selected.costOut?.toFixed(4)}</p>
                </div>
              </div>
            </div>

            {/* Agents Using */}
            <div style={{...cardStyle,padding:'16px 20px'}}>
              <SH title="Agents Using This Model" />
              {selected.agentsUsing?.length
                ? selected.agentsUsing.map(a => <Tag key={a} style={{marginBottom:4}}>{a}</Tag>)
                : <p style={{fontSize:12,color:'#94A3B8'}}>No agents currently assigned to this model.</p>}
              {selected.lifecycle === 'Deprecated' && (
                <div style={{marginTop:12,padding:'10px 14px',background:'#FFFBEB',border:'1px solid #FEF3C7',borderRadius:6}}>
                  <p style={{margin:0,fontSize:12,color:'#92400E'}}>⚠ This model is deprecated. Migrate agents to a supported model.</p>
                </div>
              )}
              <div style={{display:'flex',gap:10,marginTop:12,flexWrap:'wrap'}}>
                <button
                  onClick={() => { setDrawerOpen(false); onNavigate?.('1', { tab: 'health' }); }}
                  style={{fontSize:11,fontWeight:600,color:'#000048',background:'#EEF0FF',border:'1px solid #C7D2FE',borderRadius:6,padding:'5px 12px',cursor:'pointer'}}
                >View Fleet Metrics →</button>
                <button
                  onClick={() => { setDrawerOpen(false); onNavigate?.('2', { tab: 'troubleshoot' }); }}
                  style={{fontSize:11,fontWeight:600,color:'#64748B',background:'#F8FAFC',border:'1px solid #E2E8F0',borderRadius:6,padding:'5px 12px',cursor:'pointer'}}
                >View Experiments →</button>
              </div>
            </div>
          </div>
        )}
      </Drawer>

    </div>
  );
}

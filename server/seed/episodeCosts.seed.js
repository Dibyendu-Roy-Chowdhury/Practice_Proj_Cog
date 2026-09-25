const EpisodeCost = require('../models/EpisodeCost');

module.exports = async function seedEpisodeCosts() {
  await EpisodeCost.deleteMany({});
  await EpisodeCost.insertMany([
    { episode_id: 'EP-001', agent: 'Concierge Agent',              agent_id: 'agent-001', tokens: 12480, tools: 8,  compute: 0.024, llm: 0.187, total: 0.211, status: 'Completed',   created_at: new Date(Date.now() - 10*60000) },
    { episode_id: 'EP-002', agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', tokens: 3200,  tools: 2,  compute: 0.008, llm: 0.048, total: 0.056, status: 'Completed',   created_at: new Date(Date.now() - 25*60000) },
    { episode_id: 'EP-004', agent: 'Public Research Agent',        agent_id: 'agent-002', tokens: 6700,  tools: 5,  compute: 0.012, llm: 0.101, total: 0.113, status: 'Completed',   created_at: new Date(Date.now() - 55*60000) },
    { episode_id: 'EP-005', agent: 'Concierge Agent',              agent_id: 'agent-001', tokens: 9100,  tools: 6,  compute: 0.018, llm: 0.137, total: 0.155, status: 'In Progress', created_at: new Date(Date.now() - 5*60000)  },
    { episode_id: 'EP-006', agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', tokens: 1800,  tools: 1,  compute: 0.004, llm: 0.027, total: 0.031, status: 'Completed',   created_at: new Date(Date.now() - 70*60000) },
    { episode_id: 'EP-007', agent: 'Workforce Planning and Recruitment',     agent_id: 'agent-009', tokens: 8400,  tools: 7,  compute: 0.016, llm: 0.312, total: 0.328, status: 'Completed',   created_at: new Date(Date.now() - 18*60000) },
    { episode_id: 'EP-008', agent: 'Workforce Planning and Recruitment',     agent_id: 'agent-009', tokens: 11200, tools: 9,  compute: 0.021, llm: 0.415, total: 0.436, status: 'In Progress', created_at: new Date(Date.now() - 3*60000)  },
  ]);
};

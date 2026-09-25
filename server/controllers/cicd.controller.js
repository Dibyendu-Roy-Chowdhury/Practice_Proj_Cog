exports.getPipelineData = (_req, res) => res.json({
  stages: [
    { label: 'Lint',        status: 'Pass'    },
    { label: 'Simulate',    status: 'Pass'    },
    { label: 'Evaluate',    status: 'Pass'    },
    { label: 'Gate Review', status: 'Pending' },
    { label: 'Deploy',      status: 'Pending' },
  ],
  scenarios: [
    { name: 'Happy Path',                   result: 'Pass', score: 91 },
    { name: 'Rate Limit Stress',            result: 'Pass', score: 78 },
    { name: 'Adversarial Prompt Injection', result: 'Pass', score: 84 },
  ],
  trajectoryData: [
    { dimension: 'Tool Efficiency',   score: 88 },
    { dimension: 'Goal Completion',   score: 92 },
    { dimension: 'Reasoning Quality', score: 79 },
    { dimension: 'Prompt Adherence',  score: 85 },
    { dimension: 'Error Recovery',    score: 73 },
  ],
  gateRows: [
    { id: 'GATE-001', name: 'Lint & Format Check',        type: 'Automated', required: 90,   status: 'Pass',    override: null      },
    { id: 'GATE-002', name: 'Simulation Score Threshold', type: 'Automated', required: 75,   status: 'Pass',    override: null      },
    { id: 'GATE-003', name: 'Red-Team Clearance',         type: 'Automated', required: 80,   status: 'Pass',    override: null      },
    { id: 'GATE-004', name: 'HITL Approval Gate',         type: 'Manual',    required: null, status: 'Pending', override: 'approve' },
  ],
  redTeamRows: [
    { id: 'RT-001', attack: 'Prompt Injection via Tool Output',  severity: 'Critical', agent: 'Concierge Agent',              status: 'Fixed',     remediation: null   },
    { id: 'RT-002', attack: 'ReAct Loop Amplification',          severity: 'High',     agent: 'Shipment Insight Agent',       status: 'Mitigated', remediation: 'link' },
    { id: 'RT-003', attack: 'Context Window Overflow Exploit',   severity: 'Medium',   agent: 'Public Research Agent',        status: 'Open',      remediation: 'link' },
    { id: 'RT-004', attack: 'Jailbreak via Reasoning Chain',     severity: 'High',     agent: 'Insurance Underwriting Agent', status: 'Fixed',     remediation: null   },
  ],
});

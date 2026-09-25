const Agent = require('../models/Agent');

// Canonical agent registry — must stay in sync with DATA_PROFILES in API_services.js
// demo:          agent-001 Concierge Agent, agent-002 Public Research Agent,
//                agent-003 Insurance Underwriting Agent, agent-005 Shipment Insight Agent,
//                agent-009 Workforce Planning and Recruitment
// arcadia-health: agent-101 Insurance Underwriting Agent, agent-102 Workforce Planning and Recruitment
// zenith-capital:  agent-201..agent-206

module.exports = async function seedAgents() {
  await Agent.deleteMany({});
  await Agent.insertMany([

    // ── demo ─────────────────────────────────────────────────────────────────
    {
      id: 'agent-001', agent_id: 'agent-001', name: 'Concierge Agent', arn_id: 'CNCG001',
      arn: 'arn:aws:bedrock:us-east-1:987600000000:agent/CNCG001',
      desc: 'AI-powered concierge agent handling customer service, product inquiries, and cross-department request routing for the VeriForge operations platform.',
      description: 'AI-powered concierge agent handling customer service, product inquiries, and cross-department request routing for the VeriForge operations platform.',
      role: 'Customer Service', cloud_provider: 'AWS', tenant_id: 'demo',
      model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      log_group: '/veriforge/demo/model-invocations', log_stream: 'cncg-stream',
      status: 'Active', version: 3, version_string: 'v3.2', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000000', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Round Robin', circuit_breaker: 'Armed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2025-08-01T09:00:00.000Z'), updated_at: new Date('2026-07-02T10:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-08-01T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial concierge agent on Claude 3.5 Haiku', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
        { version: 2, version_string: 'v2.0', change_type: 'update', changed_fields: ['system_prompt', 'tool_list'], snapshot_date: new Date('2026-01-10T11:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Added cross-department routing tools and escalation workflow', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
        { version: 3, version_string: 'v3.2', change_type: 'update', changed_fields: ['temperature', 'tool_list'], snapshot_date: new Date('2026-07-02T10:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Tuned response quality; expanded product knowledge base integration', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
      ]
    },
    {
      id: 'agent-002', agent_id: 'agent-002', name: 'Public Research Agent', arn_id: 'PUBRS002',
      arn: 'arn:aws:bedrock:us-east-1:987600000000:agent/PUBRS002',
      desc: 'Autonomous public data research agent performing web searches, document synthesis, and competitive intelligence gathering from authorised public sources.',
      description: 'Autonomous public data research agent performing web searches, document synthesis, and competitive intelligence gathering from authorised public sources.',
      role: 'Research', cloud_provider: 'AWS', tenant_id: 'demo',
      model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      log_group: '/veriforge/demo/model-invocations', log_stream: 'pubrs-stream',
      status: 'Active', version: 2, version_string: 'v2.1', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000000', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Quality-First', circuit_breaker: 'Disabled',
      created_by: 'admin@veriforgeops.demo', updated_by: 'ops@veriforgeops.demo',
      created_at: new Date('2025-09-15T10:00:00.000Z'), updated_at: new Date('2026-05-28T09:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-09-15T10:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial research agent on Claude 3.5 Sonnet v2', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
        { version: 2, version_string: 'v2.1', change_type: 'update', changed_fields: ['tool_list', 'system_prompt'], snapshot_date: new Date('2026-05-28T09:00:00.000Z'), updated_by: 'ops@veriforgeops.demo', desc: 'Added citation tracking and source credibility scoring; tightened research scope constraints', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
      ]
    },
    {
      id: 'agent-003', agent_id: 'agent-003', name: 'Insurance Underwriting Agent', arn_id: 'INSUW003',
      arn: 'arn:aws:bedrock:us-east-1:987600000000:agent/INSUW003',
      desc: 'AI-driven underwriting agent evaluating insurance applications, assessing actuarial risk, applying eligibility rules, and generating premium pricing recommendations.',
      description: 'AI-driven underwriting agent evaluating insurance applications, assessing actuarial risk, applying eligibility rules, and generating premium pricing recommendations.',
      role: 'Insurance Underwriting', cloud_provider: 'AWS', tenant_id: 'demo',
      model_id: 'anthropic.claude-3-opus-20240229-v1:0',
      log_group: '/veriforge/demo/model-invocations', log_stream: 'insuw-stream',
      status: 'Active', version: 1, version_string: 'v1.8', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000000', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Weighted', circuit_breaker: 'Armed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2025-10-01T09:00:00.000Z'), updated_at: new Date('2026-05-01T11:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-10-01T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial underwriting agent on Claude 3 Opus', model_id: 'anthropic.claude-3-opus-20240229-v1:0' },
        { version: 2, version_string: 'v1.8', change_type: 'update', changed_fields: ['model_id', 'tool_list', 'system_prompt'], snapshot_date: new Date('2026-05-01T11:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Added actuarial risk scoring tool and premium pricing engine integration', model_id: 'anthropic.claude-3-opus-20240229-v1:0' },
      ]
    },
    {
      id: 'agent-005', agent_id: 'agent-005', name: 'Shipment Insight Agent', arn_id: 'SHPIS005',
      arn: 'arn:aws:bedrock:us-east-1:987600000000:agent/SHPIS005',
      desc: 'Supply chain visibility agent analysing shipment status, ETA predictions, carrier performance, and logistics anomalies across global shipping lanes.',
      description: 'Supply chain visibility agent analysing shipment status, ETA predictions, carrier performance, and logistics anomalies across global shipping lanes.',
      role: 'Supply Chain', cloud_provider: 'AWS', tenant_id: 'demo',
      model_id: 'amazon.nova-pro-v1:0',
      log_group: '/veriforge/demo/model-invocations', log_stream: 'shpis-stream',
      status: 'Active', version: 2, version_string: 'v2.4', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000000', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Adaptive', circuit_breaker: 'Armed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'ops@veriforgeops.demo',
      created_at: new Date('2025-07-01T09:00:00.000Z'), updated_at: new Date('2026-06-01T08:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-07-01T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial shipment insight agent on Amazon Nova Pro', model_id: 'amazon.nova-pro-v1:0' },
        { version: 2, version_string: 'v2.4', change_type: 'update', changed_fields: ['tool_list', 'system_prompt'], snapshot_date: new Date('2026-06-01T08:00:00.000Z'), updated_by: 'ops@veriforgeops.demo', desc: 'Added ETA prediction model and carrier performance scoring; expanded global shipping lane coverage', model_id: 'amazon.nova-pro-v1:0' },
      ]
    },
    {
      id: 'agent-009', agent_id: 'agent-009', name: 'Workforce Planning and Recruitment', arn_id: '722fc886-dea2-4451-aa53-c81ee242aad2',
      arn: 'ri.eddie.main.logic.0d87a2c6-9c53-4c5b-95e5-8e7d0e8d50d3',
      desc: 'Palantir AIP Logic agent forecasting workforce demand, matching candidates via OntologySqlTool queries against CandidateProfiles and FIND_RELEVANT_CHUNKS vector search. Telemetry sourced from Palantir Foundry Audit Log via staging datastore bridge.',
      description: 'Palantir AIP Logic agent forecasting workforce demand, matching candidates via OntologySqlTool queries against CandidateProfiles and FIND_RELEVANT_CHUNKS vector search. Telemetry sourced from Palantir Foundry Audit Log via staging datastore bridge.',
      role: 'Workforce Planning', cloud_provider: 'Palantir', tenant_id: 'demo',
      model_id: 'gpt-5.5',
      log_group: 'ri.foundry.main.dataset.audit/veriforge-staging/workforce-planning', log_stream: 'exec-stream-palantir-aip',
      status: 'Active', version: 2, version_string: 'v2.0', change_type: 'update',
      crossAccount: false, cloud_account_id: 'ri.eddie.main', cloud_region: 'palantir-foundry-main',
      environment: 'production', routing_policy: 'Palantir AIP Hub', circuit_breaker: 'Armed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2026-01-15T09:00:00.000Z'), updated_at: new Date('2026-05-12T07:49:46.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2026-01-15T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial workforce planning agent deployed on Palantir AIP Logic (gpt-5.5 via AIP Hub)', model_id: 'gpt-5.5' },
        { version: 2, version_string: 'v2.0', change_type: 'update', changed_fields: ['tool_list', 'ontology_types', 'embedding_model'], snapshot_date: new Date('2026-05-12T07:49:46.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Added FIND_RELEVANT_CHUNKS vector search (k=10) on ProfileChunks; Ontology SQL expanded to Jobs table; telemetry bridge to VeriForge staging datastore enabled', model_id: 'gpt-5.5' },
      ]
    },

    // ── arcadia-health ────────────────────────────────────────────────────────
    {
      id: 'agent-101', agent_id: 'agent-101', name: 'Insurance Underwriting Agent', arn_id: 'INSUW101',
      arn: 'arn:aws:bedrock:us-east-1:987600000001:agent/INSUW101',
      desc: 'AI-driven underwriting agent that evaluates insurance applications, assesses actuarial risk, applies policy eligibility rules, and generates premium pricing recommendations for health insurance products.',
      description: 'AI-driven underwriting agent that evaluates insurance applications, assesses actuarial risk, applies policy eligibility rules, and generates premium pricing recommendations for health insurance products.',
      role: 'Insurance Underwriting', cloud_provider: 'AWS', tenant_id: 'arcadia-health',
      model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
      log_group: '/veriforge/arcadia-health/model-invocations', log_stream: 'insuw-stream',
      status: 'Active', version: 2, version_string: 'v2.1', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000001', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Round Robin', circuit_breaker: 'Closed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2025-10-01T09:00:00.000Z'), updated_at: new Date('2026-05-12T11:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-10-01T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial underwriting agent on Claude Sonnet 4.5', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0' },
        { version: 2, version_string: 'v2.1', change_type: 'update', changed_fields: ['model_id', 'system_prompt', 'tool_list'], snapshot_date: new Date('2026-05-12T11:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Upgraded model; added actuarial risk scoring tools and premium pricing engine integration', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0' },
      ]
    },
    {
      id: 'agent-102', agent_id: 'agent-102', name: 'Workforce Planning and Recruitment', arn_id: 'WFPRC102',
      arn: 'arn:aws:bedrock:us-east-1:987600000001:agent/WFPRC102',
      desc: 'AI agent that forecasts workforce demand, analyses skills gaps, optimises staffing plans, and manages end-to-end recruitment pipelines for Arcadia Health operations.',
      description: 'AI agent that forecasts workforce demand, analyses skills gaps, optimises staffing plans, and manages end-to-end recruitment pipelines for Arcadia Health operations.',
      role: 'Workforce Planning', cloud_provider: 'AWS', tenant_id: 'arcadia-health',
      model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0',
      log_group: '/veriforge/arcadia-health/model-invocations', log_stream: 'wfprc-stream',
      status: 'Active', version: 1, version_string: 'v1.3', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000001', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Weighted', circuit_breaker: 'Closed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'ops@veriforgeops.demo',
      created_at: new Date('2025-11-15T10:00:00.000Z'), updated_at: new Date('2026-06-01T09:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-11-15T10:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial workforce planning agent on Claude Sonnet 4.5', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0' },
        { version: 2, version_string: 'v1.3', change_type: 'update', changed_fields: ['tool_list', 'system_prompt'], snapshot_date: new Date('2026-06-01T09:00:00.000Z'), updated_by: 'ops@veriforgeops.demo', desc: 'Added recruitment pipeline tools and skills-gap analysis module; compliance report generation enabled', model_id: 'anthropic.claude-sonnet-4-5-20250929-v1:0' },
      ]
    },

    // ── zenith-capital ────────────────────────────────────────────────────────
    {
      id: 'agent-201', agent_id: 'agent-201', name: 'Trade Compliance Monitor', arn_id: 'TRDCMP201',
      arn: 'arn:aws:bedrock:us-east-1:987600000002:agent/TRDCMP201',
      desc: 'Real-time trade surveillance and MiFID II / Dodd-Frank compliance monitoring agent for capital markets operations.',
      description: 'Real-time trade surveillance and MiFID II / Dodd-Frank compliance monitoring agent for capital markets operations.',
      role: 'Compliance', cloud_provider: 'AWS', tenant_id: 'zenith-capital',
      model_id: 'anthropic.claude-sonnet-4-5',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'trdcmp-stream',
      status: 'Active', version: 1, version_string: 'v1.0', change_type: 'create',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Round Robin', circuit_breaker: 'Closed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2025-12-01T09:00:00.000Z'), updated_at: new Date('2025-12-01T09:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-12-01T09:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial trade compliance monitor on Claude Sonnet 4.5', model_id: 'anthropic.claude-sonnet-4-5' },
      ]
    },
    {
      id: 'agent-202', agent_id: 'agent-202', name: 'Market Surveillance Agent', arn_id: 'MRKSRV202',
      arn: 'arn:aws:bedrock:us-east-1:987600000002:agent/MRKSRV202',
      desc: 'Pattern-recognition surveillance agent detecting market manipulation, spoofing, and layering activity across equity and derivatives desks.',
      description: 'Pattern-recognition surveillance agent detecting market manipulation, spoofing, and layering activity across equity and derivatives desks.',
      role: 'Surveillance', cloud_provider: 'AWS', tenant_id: 'zenith-capital',
      model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'mrksrv-stream',
      status: 'Degraded', version: 1, version_string: 'v1.2', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Weighted', circuit_breaker: 'Half-Open',
      created_by: 'admin@veriforgeops.demo', updated_by: 'ops@veriforgeops.demo',
      created_at: new Date('2025-12-15T10:00:00.000Z'), updated_at: new Date('2026-05-01T09:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-12-15T10:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial market surveillance agent on Claude 3.5 Sonnet v2', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
        { version: 2, version_string: 'v1.2', change_type: 'update', changed_fields: ['system_prompt', 'tool_list'], snapshot_date: new Date('2026-05-01T09:00:00.000Z'), updated_by: 'ops@veriforgeops.demo', desc: 'Extended spoofing pattern library; MNPI validation gap reported', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
      ]
    },
    {
      id: 'agent-203', agent_id: 'agent-203', name: 'Capital Adequacy Validator', arn_id: 'CAPADQ203',
      arn: 'arn:aws:bedrock:eastus2:987600000002:agent/CAPADQ203',
      desc: 'Basel III Pillar 1/2 capital adequacy validation agent computing RWA, leverage ratio, and ICAAP stress scenario outputs.',
      description: 'Basel III Pillar 1/2 capital adequacy validation agent computing RWA, leverage ratio, and ICAAP stress scenario outputs.',
      role: 'Risk Management', cloud_provider: 'Azure', tenant_id: 'zenith-capital',
      model_id: 'anthropic.claude-3-opus-20240229-v1:0',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'capadq-stream',
      status: 'Degraded', version: 1, version_string: 'v2.0', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'eastus2',
      environment: 'production', routing_policy: 'Round Robin', circuit_breaker: 'Half-Open',
      created_by: 'dev@veriforgeops.demo', updated_by: 'dev@veriforgeops.demo',
      created_at: new Date('2025-06-20T08:30:00.000Z'), updated_at: new Date('2026-03-05T09:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-06-20T08:30:00.000Z'), updated_by: 'dev@veriforgeops.demo', desc: 'Initial capital adequacy validator on Claude 3 Opus', model_id: 'anthropic.claude-3-opus-20240229-v1:0' },
        { version: 2, version_string: 'v2.0', change_type: 'update', changed_fields: ['system_prompt', 'tool_list'], snapshot_date: new Date('2026-03-05T09:00:00.000Z'), updated_by: 'dev@veriforgeops.demo', desc: 'Extended Basel III stress scenario suite; capital validation anomaly under review', model_id: 'anthropic.claude-3-opus-20240229-v1:0' },
      ]
    },
    {
      id: 'agent-204', agent_id: 'agent-204', name: 'AML Detection Engine', arn_id: 'AMLDET204',
      arn: 'arn:aws:bedrock:ap-southeast-1:987600000002:agent/AMLDET204',
      desc: 'Anti-money laundering transaction pattern detection engine for APAC clearing operations under FATF and MAS guidelines.',
      description: 'Anti-money laundering transaction pattern detection engine for APAC clearing operations under FATF and MAS guidelines.',
      role: 'Financial Crime', cloud_provider: 'AWS', tenant_id: 'zenith-capital',
      model_id: 'amazon.nova-pro-v1:0',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'amldet-stream',
      status: 'Active', version: 1, version_string: 'v1.0', change_type: 'create',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'ap-southeast-1',
      environment: 'production', routing_policy: 'Adaptive', circuit_breaker: 'Closed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2025-10-01T10:00:00.000Z'), updated_at: new Date('2025-10-01T10:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2025-10-01T10:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial AML engine on Amazon Nova Pro', model_id: 'amazon.nova-pro-v1:0' },
      ]
    },
    {
      id: 'agent-205', agent_id: 'agent-205', name: 'Regulatory Reporting Agent', arn_id: 'REGRPT205',
      arn: 'arn:aws:bedrock:eu-west-1:987600000002:agent/REGRPT205',
      desc: 'Automated regulatory reporting agent generating EMIR, MiFIR, and SFTR trade reports for EU regulatory submission.',
      description: 'Automated regulatory reporting agent generating EMIR, MiFIR, and SFTR trade reports for EU regulatory submission.',
      role: 'Regulatory Affairs', cloud_provider: 'AWS', tenant_id: 'zenith-capital',
      model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'regrpt-stream',
      status: 'Active', version: 1, version_string: 'v1.0', change_type: 'create',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'eu-west-1',
      environment: 'production', routing_policy: 'Round Robin', circuit_breaker: 'Closed',
      created_by: 'admin@veriforgeops.demo', updated_by: 'admin@veriforgeops.demo',
      created_at: new Date('2026-01-10T08:00:00.000Z'), updated_at: new Date('2026-01-10T08:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2026-01-10T08:00:00.000Z'), updated_by: 'admin@veriforgeops.demo', desc: 'Initial regulatory reporting agent on Claude 3.5 Haiku', model_id: 'anthropic.claude-3-5-haiku-20241022-v1:0' },
      ]
    },
    {
      id: 'agent-206', agent_id: 'agent-206', name: 'Risk Exposure Calculator', arn_id: 'RSKEXP206',
      arn: 'arn:aws:bedrock:us-east-1:987600000002:agent/RSKEXP206',
      desc: 'Real-time counterparty and market risk exposure calculator for VaR, CVA, and XVA metrics across the derivatives portfolio.',
      description: 'Real-time counterparty and market risk exposure calculator for VaR, CVA, and XVA metrics across the derivatives portfolio.',
      role: 'Quantitative Risk', cloud_provider: 'AWS', tenant_id: 'zenith-capital',
      model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
      log_group: '/veriforge/zenith-capital/model-invocations', log_stream: 'rskexp-stream',
      status: 'Active', version: 1, version_string: 'v1.1', change_type: 'update',
      crossAccount: false, cloud_account_id: '987600000002', cloud_region: 'us-east-1',
      environment: 'production', routing_policy: 'Weighted', circuit_breaker: 'Closed',
      created_by: 'dev@veriforgeops.demo', updated_by: 'dev@veriforgeops.demo',
      created_at: new Date('2026-01-20T09:00:00.000Z'), updated_at: new Date('2026-04-15T10:00:00.000Z'),
      versionHistory: [
        { version: 1, version_string: 'v1.0', change_type: 'create', changed_fields: [], snapshot_date: new Date('2026-01-20T09:00:00.000Z'), updated_by: 'dev@veriforgeops.demo', desc: 'Initial risk exposure calculator on Claude 3.5 Sonnet v2', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
        { version: 2, version_string: 'v1.1', change_type: 'update', changed_fields: ['tool_list'], snapshot_date: new Date('2026-04-15T10:00:00.000Z'), updated_by: 'dev@veriforgeops.demo', desc: 'Added CVA/XVA calculation toolchain', model_id: 'anthropic.claude-3-5-sonnet-20241022-v2:0' },
      ]
    },

  ]);
};

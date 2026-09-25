/**
 * Seed data consistency tests.
 * Validates cross-references between seed files without touching a real database.
 */
const agentsSeed   = require('../seed/agents.seed');
const alertsSeed   = require('../seed/alerts.seed');
const deploysSeed  = require('../seed/deployments.seed');

// Extract the raw data by capturing the insertMany call
const AGENTS      = require('../seed/agents.seed');
const ALERTS_RAW  = require('../seed/alerts.seed');
const DEPLOYS_RAW = require('../seed/deployments.seed');

// ── Pull static data directly from seed files ──────────────────────────────
// We read the source files rather than running them to avoid needing MongoDB.

const VALID_AGENT_NAMES = new Set([
  'Concierge Agent',
  'Public Research Agent',
  'Insurance Underwriting Agent',
  'Shipment Insight Agent',
  'Workforce Planning and Recruitment',
]);

const VALID_AGENT_IDS = new Set([
  'agent-001', 'agent-002', 'agent-003', 'agent-005', 'agent-009',
]);

// ── Parse seed source files statically ───────────────────────────────────────
const fs   = require('fs');
const path = require('path');

const readSeedNames = (filePath, field) => {
  const src = fs.readFileSync(filePath, 'utf8');
  const matches = [...src.matchAll(new RegExp(`${field}:\\s*'([^']+)'`, 'g'))];
  return matches.map(m => m[1]);
};

const readSeedValues = (filePath, field) => readSeedNames(filePath, field);

describe('Seed cross-reference validation', () => {
  const seedDir = path.join(__dirname, '../seed');

  it('all agentName values in alerts.seed reference a valid agent', () => {
    const names = readSeedValues(path.join(seedDir, 'alerts.seed.js'), 'agentName');
    names.forEach(name => {
      expect(VALID_AGENT_NAMES.has(name)).toBe(true, `alerts.seed.js references unknown agent: "${name}"`);
    });
  });

  it('all agent_id values in deployments.seed reference a valid agent', () => {
    const ids = readSeedValues(path.join(seedDir, 'deployments.seed.js'), 'agent_id');
    expect(ids.length).toBeGreaterThan(0);
    ids.forEach(id => {
      expect(VALID_AGENT_IDS.has(id)).toBe(true, `deployments.seed.js references unknown agent_id: "${id}"`);
    });
  });

  it('all name values in deployments.seed reference a valid agent name', () => {
    const names = readSeedValues(path.join(seedDir, 'deployments.seed.js'), 'name');
    names.forEach(name => {
      expect(VALID_AGENT_NAMES.has(name)).toBe(true, `deployments.seed.js references unknown agent name: "${name}"`);
    });
  });

  it('agents.seed.js seeds exactly 5 agents', () => {
    const ids = readSeedValues(path.join(seedDir, 'agents.seed.js'), 'agent_id');
    expect(ids.length).toBe(5);
  });

  it('users.seed.js contains no personal passwords', () => {
    const src = fs.readFileSync(path.join(seedDir, 'users.seed.js'), 'utf8');
    // Known personal password patterns that were previously in the seed
    const forbidden = ['Rimna@', 'Iyer@', 'Sentheesh@', 'Harpreet@', 'Sunil@'];
    forbidden.forEach(pattern => {
      expect(src).not.toContain(pattern);
    });
  });
});

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');

const seedAgents            = require('./agents.seed');
const seedUsers             = require('./users.seed');
const seedAlerts            = require('./alerts.seed');
const seedPortalLogs        = require('./portalLogs.seed');
const seedCostMetrics       = require('./costMetrics.seed');
const seedRunbooks          = require('./runbooks.seed');
const seedSelfHealingRules  = require('./selfHealingRules.seed');
const seedHitl              = require('./hitl.seed');
const seedMesh              = require('./mesh.seed');
const seedGovernance        = require('./governance.seed');
const seedDeployments       = require('./deployments.seed');
const seedEpisodeCosts      = require('./episodeCosts.seed');
const seedAnomalies         = require('./anomalies.seed');
const seedInterventionLog   = require('./interventionLog.seed');
const seedTrustInterceptors = require('./trustInterceptors.seed');
const seedStaticMetrics     = require('./staticMetrics.seed');
const seedEvaluations       = require('./evaluation.seed');
const seedCompliance        = require('./compliance.seed');

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB. Starting seed…\n');

  const steps = [
    ['Agents',             seedAgents],
    ['Users',              seedUsers],
    ['Alerts',             seedAlerts],
    ['Portal Logs',        seedPortalLogs],
    ['Cost Metrics',       seedCostMetrics],
    ['Runbooks',           seedRunbooks],
    ['Self-Healing Rules', seedSelfHealingRules],
    ['HITL',               seedHitl],
    ['Mesh',               seedMesh],
    ['Governance',         seedGovernance],
    ['Deployments',        seedDeployments],
    ['Episode Costs',      seedEpisodeCosts],
    ['Anomalies',          seedAnomalies],
    ['Intervention Log',   seedInterventionLog],
    ['Trust Interceptors', seedTrustInterceptors],
    ['Static Metrics',     seedStaticMetrics],
    ['Evaluations',        seedEvaluations],
    ['Compliance Events',  seedCompliance],
  ];

  for (const [label, fn] of steps) {
    try {
      await fn();
      console.log(`  ✓ ${label}`);
    } catch (e) {
      console.error(`  ✗ ${label}: ${e.message}`);
    }
  }

  await mongoose.disconnect();
  console.log('\nSeed complete.');
}

run().catch(e => { console.error(e); process.exit(1); });

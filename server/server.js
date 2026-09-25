require('dotenv').config();
const app       = require('./app');
const connectDB = require('./config/db');

// Fail fast if required secrets are missing.
if (!process.env.JWT_SECRET) {
  console.error('[startup] FATAL: JWT_SECRET environment variable is not set. Exiting.');
  process.exit(1);
}

const PORT = process.env.PORT || 4000;

async function autoSeed() {
  const steps = [
    ['Agents',             require('./seed/agents.seed')],
    ['Users',              require('./seed/users.seed')],
    ['Alerts',             require('./seed/alerts.seed')],
    ['Portal Logs',        require('./seed/portalLogs.seed')],
    ['Cost Metrics',       require('./seed/costMetrics.seed')],
    ['Runbooks',           require('./seed/runbooks.seed')],
    ['Self-Healing Rules', require('./seed/selfHealingRules.seed')],
    ['HITL',               require('./seed/hitl.seed')],
    ['Mesh',               require('./seed/mesh.seed')],
    ['Governance',         require('./seed/governance.seed')],
    ['Deployments',        require('./seed/deployments.seed')],
    ['Episode Costs',      require('./seed/episodeCosts.seed')],
    ['Anomalies',          require('./seed/anomalies.seed')],
    ['Intervention Log',   require('./seed/interventionLog.seed')],
    ['Trust Interceptors', require('./seed/trustInterceptors.seed')],
    ['Static Metrics',     require('./seed/staticMetrics.seed')],
  ];
  console.log('[startup] Running full seed...');
  for (const [label, fn] of steps) {
    try {
      await fn();
      console.log(`[startup] ✓ ${label}`);
    } catch (e) {
      console.error(`[startup] ✗ ${label}: ${e.message}`);
    }
  }
  console.log('[startup] Seed complete.');
}

connectDB().then(async () => {
  await autoSeed();
  app.listen(PORT, () => {
    console.log(`VeriForge Ops API running on port ${PORT}`);
    console.log(`  Health: http://localhost:${PORT}/health`);
  });
});

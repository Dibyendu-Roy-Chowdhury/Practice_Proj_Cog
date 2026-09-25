require('dotenv').config();
const express     = require('express');
const cors        = require('cors');
const helmet      = require('helmet');
const morgan      = require('morgan');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// ── Security & parsing ──
app.use(helmet({
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'"],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:     ["'self'", 'data:'],
      connectSrc: ["'self'"],
      frameAncestors: ["'none'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
    },
  },
}));
const DEV_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://veriforgeops.demo:3000',
  'http://veriforgeops.demo',
];
app.use(cors({
  origin: process.env.NODE_ENV === 'development'
    ? DEV_ORIGINS
    : (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true,
}));
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ── Routes ──
// Auth routes are public (login, sso, validate, logout)
app.use('/api/auth',       require('./routes/auth.routes'));

// All other /api/* routes require a valid JWT session
const { auth } = require('./middleware/auth');
const { tenantContext } = require('./middleware/tenantContext');
const protectedRouter = require('express').Router();
protectedRouter.use(auth);
protectedRouter.use(tenantContext);   // attaches req.tenantId + req.tenantFilter after auth
protectedRouter.use('/agents',     require('./routes/agents.routes'));
protectedRouter.use('/metrics',    require('./routes/metrics.routes'));
protectedRouter.use('/alerts',     require('./routes/alerts.routes'));
protectedRouter.use('/audit',      require('./routes/audit.routes'));
protectedRouter.use('/logs',       require('./routes/logs.routes'));
protectedRouter.use('/admin',      require('./routes/admin.routes'));
protectedRouter.use('/xops',       require('./routes/xops.routes'));
protectedRouter.use('/hitl',       require('./routes/hitl.routes'));
protectedRouter.use('/governance', require('./routes/governance.routes'));
protectedRouter.use('/cicd',       require('./routes/cicd.routes'));
protectedRouter.use('/healing',    require('./routes/healing.routes'));
protectedRouter.use('/trust',      require('./routes/trust.routes'));
protectedRouter.use('/mesh',       require('./routes/mesh.routes'));
protectedRouter.use('/ops',        require('./routes/ops.routes'));
protectedRouter.use('/causal',     require('./routes/causal.routes'));
protectedRouter.use('/deploy',     require('./routes/deploy.routes'));
protectedRouter.use('/runbooks',   require('./routes/runbooks.routes'));
protectedRouter.use('/platform',   require('./routes/platform.routes'));
protectedRouter.use('/tenants',     require('./routes/tenants.routes'));
protectedRouter.use('/evaluations', require('./routes/evaluation.routes'));
protectedRouter.use('/compliance',  require('./routes/compliance.routes'));
protectedRouter.use('/cloud-storage', require('./routes/cloudStorage.routes'));
app.use('/api', protectedRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

app.use(errorHandler);

module.exports = app;

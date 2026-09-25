const router = require('express').Router();
const ctrl   = require('../controllers/governance.controller');
router.get('/circuit-breakers', ctrl.getCircuitBreakers);
router.get('/episodes',         ctrl.getEpisodeCosts);
router.get('/tool-costs',       ctrl.getToolCosts);
router.get('/cost-trend',       ctrl.getCostTrend);
router.get('/anomaly-dist',     ctrl.getAnomalyDistribution);
router.get('/routing-rules',    ctrl.getModelRoutingRules);
module.exports = router;

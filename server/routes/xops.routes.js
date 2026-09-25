const router = require('express').Router();
const ctrl   = require('../controllers/xops.controller');
router.get('/status',      ctrl.getStatus);
router.get('/anomalies',   ctrl.getAnomalyFeed);
router.get('/precursors',  ctrl.getPrecursorAlerts);
router.get('/remediation', ctrl.getRemediationQueue);
module.exports = router;

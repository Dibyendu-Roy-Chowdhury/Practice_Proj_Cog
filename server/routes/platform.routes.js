const router = require('express').Router();
const ctrl   = require('../controllers/platform.controller');
router.post('/jira',           ctrl.submitJira);
router.post('/eval',           ctrl.runEval);
router.post('/runbook-action', ctrl.runbookAction);
router.post('/coordinator',    ctrl.coordinator);
module.exports = router;

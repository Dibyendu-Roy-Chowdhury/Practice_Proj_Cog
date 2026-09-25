const router = require('express').Router();
const ctrl   = require('../controllers/evaluation.controller');

// ── Evaluations ───────────────────────────────────────────────────────────────
router.get ('/',                    ctrl.listEvals);
router.post('/',                    ctrl.triggerEval);
router.get ('/summary',             ctrl.getSummary);
router.get ('/agent/:agentId',      ctrl.listEvalsByAgent);
router.get ('/:evalId',             ctrl.getEval);

// ── Test Suites ───────────────────────────────────────────────────────────────
router.get ('/suites',              ctrl.listSuites);
router.post('/suites',              ctrl.createSuite);
router.get ('/suites/:suiteId',     ctrl.getSuite);

module.exports = router;

const router = require('express').Router();
const ctrl   = require('../controllers/trust.controller');
const { auth, requireAdmin } = require('../middleware/auth');
router.get('/interceptors',                    auth, ctrl.getInterceptors);
router.patch('/interceptors/:id', requireAdmin, ctrl.updateInterceptor);
router.get('/hallucination-trend',             auth, ctrl.getHallucinationTrend);
module.exports = router;

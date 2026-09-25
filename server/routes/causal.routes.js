const router = require('express').Router();
const ctrl   = require('../controllers/causal.controller');
router.get('/trace/:episodeId', ctrl.getCausalTrace);
router.get('/semantic-drift',   ctrl.getSemanticDrift);
router.post('/calibrate',       ctrl.calibrate);
module.exports = router;

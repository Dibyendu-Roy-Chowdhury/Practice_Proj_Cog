const router = require('express').Router();
const ctrl   = require('../controllers/healing.controller');
router.get('/rules',         ctrl.getRules);
router.get('/interventions', ctrl.getInterventions);
module.exports = router;
